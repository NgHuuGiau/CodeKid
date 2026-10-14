using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;

namespace CodeKid.Api;

public static class CurrentUser
{
    public static string Id(ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.NameIdentifier)!;
}

public class MailService(IConfiguration config, IWebHostEnvironment env, ILogger<MailService> log)
{
    public bool Available => env.IsDevelopment() || env.IsEnvironment("Testing") || !string.IsNullOrWhiteSpace(config["Mail:Host"]);
    public async Task Send(string email, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(config["Mail:Host"]))
        {
            if (!Available) throw new InvalidOperationException("Chưa cấu hình dịch vụ email.");
            var dir = Path.Combine(env.ContentRootPath, "mailbox");
            Directory.CreateDirectory(dir);
            var key = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(email.ToLowerInvariant())));
            await File.WriteAllTextAsync(Path.Combine(dir, key + ".txt"), $"{subject}\n{body}");
            log.LogInformation("Email phát triển đã được lưu trong mailbox; không dùng mailbox khi triển khai.");
            return;
        }
        using var smtp = new SmtpClient(config["Mail:Host"], config.GetValue("Mail:Port", 587))
        {
            EnableSsl = config.GetValue("Mail:Ssl", true),
            Credentials = new NetworkCredential(config["Mail:User"], config["Mail:Password"]),
            Timeout = 10000
        };
        using var message = new MailMessage(config["Mail:From"]!, email, subject, body);
        await smtp.SendMailAsync(message);
    }
}

public class LearningService(AppDb db)
{
    // PostgreSQL also serializes awards across instances; the unique ledger is the final guard.
    static readonly SemaphoreSlim Writes = new(1, 1);
    public async Task<T> Write<T>(Func<Task<T>> action)
    {
        await Writes.WaitAsync();
        try
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(63661001)");
            var result = await action(); await db.SaveChangesAsync(); await tx.CommitAsync(); return result;
        }
        finally { Writes.Release(); }
    }
    public async Task<bool> LessonOpen(string uid, Lesson lesson)
    {
        if (!lesson.Published || !lesson.Chapter.Course.Published || !lesson.Chapter.Course.Language.Available) return false;
        var previous = await db.Lessons.Where(x => x.Published && x.Chapter.CourseId == lesson.Chapter.CourseId &&
            (x.Chapter.Position < lesson.Chapter.Position || x.Chapter.Position == lesson.Chapter.Position && x.Position < lesson.Position))
            .OrderByDescending(x => x.Chapter.Position).ThenByDescending(x => x.Position).Select(x => (int?)x.Id).FirstOrDefaultAsync();
        return previous is null || await db.StudentProgress.AnyAsync(x => x.UserId == uid && x.LessonId == previous && x.Challenge);
    }
    public async Task<StudentProgress> Progress(string uid, int lessonId)
    {
        var p = await db.StudentProgress.FirstOrDefaultAsync(x => x.UserId == uid && x.LessonId == lessonId);
        if (p is not null) return p;
        p = new StudentProgress { UserId = uid, LessonId = lessonId }; db.StudentProgress.Add(p); return p;
    }
    public static bool ModeOpen(StudentProgress? p, string mode) => mode switch { "drag" => p?.Theory == true, "memory" => p?.Drag == true, "challenge" => p?.Memory == true, _ => false };
    public async Task<int> Award(string uid, string source, int amount)
    {
        if (db.XPTransactions.Local.Any(x => x.UserId == uid && x.Source == source) || await db.XPTransactions.AnyAsync(x => x.UserId == uid && x.Source == source)) return 0;
        var profile = await db.StudentProfiles.SingleAsync(x => x.UserId == uid);
        profile.Xp += amount;
        db.XPTransactions.Add(new XPTransaction { UserId = uid, Source = source, Amount = amount });
        var earned = await db.StudentAchievements.Where(x => x.UserId == uid).Select(x => x.AchievementId).ToListAsync();
        earned.AddRange(db.StudentAchievements.Local.Where(x => x.UserId == uid).Select(x => x.AchievementId));
        foreach (var a in await db.Achievements.Where(x => x.RequiredXp <= profile.Xp && !earned.Contains(x.Id)).ToListAsync())
            db.StudentAchievements.Add(new StudentAchievement { UserId = uid, AchievementId = a.Id });
        return amount;
    }
}

public class RunnerClient(HttpClient client, IConfiguration config)
{
    public async Task<RunnerResponse?> Run(string code, List<TestCase> cases, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(config["Runner:Secret"])) return null;
        using var request = new HttpRequestMessage(HttpMethod.Post, config["Runner:Url"]!.TrimEnd('/') + "/run");
        request.Headers.Add("X-Runner-Secret", config["Runner:Secret"]);
        request.Content = JsonContent.Create(new RunnerRequest(code, cases.Select(x => new RunnerCase(x.Input, x.Expected)).ToList()));
        try
        {
            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode) return null;
            var result = await response.Content.ReadFromJsonAsync<RunnerResponse>(ct);
            return result?.Results?.Count == cases.Count && result.Results.All(x => x is not null && x.Output is not null && x.Error is not null && x.Output.Length <= 8192 && x.Error.Length <= 8192) ? result : null;
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException) { return null; }
    }
}
