using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodeKid.Api;

public record LanguageEdit(string Name, string Slug, string Description, string Color, string Difficulty, bool Available);
public record CourseEdit(int LanguageId, string Title, string Description, string? TeacherId, bool Published);
public record ChapterEdit(int CourseId, string Title, int Position);
public record LessonEdit(int ChapterId, string Title, int Position, bool Published, string Objectives, string Explanation, string Example, string Notes, string Quiz, string[] QuizOptions, int QuizAnswer, string VideoUrl, string VideoTitle);
public record BlankEdit(int Position, string[] Answers, string[] Hints);
public record ExerciseEdit(int LessonId, string Mode, string Prompt, string Template, int Level, int Xp, List<BlankEdit> Blanks, string[] Options);
public record TestEdit(string Input, string Expected, bool IsSample);
public record ChallengeEdit(int LessonId, string Title, string Description, string StarterCode, int Xp, List<TestEdit> Tests);
public record AchievementEdit(string Title, string Description, string Icon, int RequiredXp);

static class ManageRules
{
    internal static bool Text(string s, int max = 200) => !string.IsNullOrWhiteSpace(s) && s.Length <= max;
    internal static IResult Invalid(string message = "Kiểm tra các trường bắt buộc và giá trị nhập.") => Results.BadRequest(new { message });
    internal static async Task<bool> OwnCourse(AppDb db, ClaimsPrincipal user, int courseId) => await db.Courses.AnyAsync(x => x.Id == courseId && (user.IsInRole("Admin") || x.TeacherId == CurrentUser.Id(user)));
    internal static async Task<bool> OwnLesson(AppDb db, ClaimsPrincipal user, int lessonId) => await db.Lessons.AnyAsync(x => x.Id == lessonId && (user.IsInRole("Admin") || x.Chapter.Course.TeacherId == CurrentUser.Id(user)));
    internal static bool ValidVideo(string url) => System.Text.RegularExpressions.Regex.IsMatch(url, @"^/videos/[a-z0-9-]+\.mp4$") || Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme == "https" && u.Host is "www.youtube-nocookie.com" && u.AbsolutePath.StartsWith("/embed/");
}

public static class ManageEndpoints
{
    public static void MapManage(this WebApplication app)
    {
        var staff = app.MapGroup("/api/manage").RequireAuthorization(p => p.RequireRole("Teacher", "Admin"));
        staff.AddEndpointFilter<RequestValidationFilter>();
        staff.AddEndpointFilter(async (context, next) =>
        {
            if (context.HttpContext.Request.Method == "GET") return await next(context);
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDb>();
            await using var tx = await db.Database.BeginTransactionAsync();
            var result = await next(context);
            if (result is not Microsoft.AspNetCore.Http.IStatusCodeHttpResult { StatusCode: >= 400 }) await tx.CommitAsync();
            return result;
        });
        staff.MapGet("/overview", async (ClaimsPrincipal user, AppDb db) =>
        {
            var admin = user.IsInRole("Admin"); var uid = CurrentUser.Id(user);
            var studentIds = db.ClassEnrollments.Where(x => admin || x.Class.TeacherId == uid).Select(x => x.StudentId);
            var attempts = await db.StudentAttempts.Where(x => admin || studentIds.Contains(x.UserId)).GroupBy(x => x.Mode).Select(g => new { mode = g.Key, total = g.Count(), passed = g.Count(a => a.Score >= 80) }).ToListAsync();
            var commonErrors = await db.StudentAttempts.Where(x => (admin || studentIds.Contains(x.UserId)) && x.Score < 80).GroupBy(x => new { x.LessonId, x.Mode }).Select(g => new { g.Key.LessonId, g.Key.Mode, count = g.Count() }).OrderByDescending(x => x.count).Take(10).ToListAsync();
            return Results.Ok(new { users = admin ? await db.Users.CountAsync() : await studentIds.Distinct().CountAsync(), courses = await db.Courses.CountAsync(x => admin || x.TeacherId == uid), classes = await db.Classes.CountAsync(x => admin || x.TeacherId == uid), attempts, commonErrors });
        });
        staff.MapGet("/content", async (ClaimsPrincipal user, AppDb db) =>
        {
            var admin = user.IsInRole("Admin"); var uid = CurrentUser.Id(user);
            return Results.Ok(new
            {
                languages = await db.ProgrammingLanguages.OrderBy(x => x.Id).ToListAsync(),
                courses = await db.Courses.Where(x => admin || x.TeacherId == uid).Select(x => new { x.Id, x.LanguageId, x.Title, x.Description, x.TeacherId, x.Published }).ToListAsync(),
                chapters = await db.Chapters.Where(x => admin || x.Course.TeacherId == uid).Select(x => new { x.Id, x.CourseId, x.Title, x.Position }).ToListAsync(),
                lessons = await db.Lessons.Where(x => admin || x.Chapter.Course.TeacherId == uid).Select(x => new { x.Id, x.ChapterId, x.Title, x.Position, x.Published, x.Content.Objectives, x.Content.Explanation, x.Content.Example, x.Content.Notes, x.Content.Quiz, x.Content.QuizOptions, x.Content.QuizAnswer, videoUrl = x.Video == null ? "" : x.Video.Url, videoTitle = x.Video == null ? "" : x.Video.Title }).ToListAsync(),
                exercises = await db.Exercises.Where(x => admin || x.Lesson.Chapter.Course.TeacherId == uid).Select(x => new { x.Id, x.LessonId, x.Mode, x.Prompt, x.Template, x.Level, x.Xp, blanks = x.Blanks.OrderBy(b => b.Position).Select(b => new { b.Position, b.Hints, answers = b.Answers.Select(a => a.Value) }), options = x.Options.Select(o => o.Value) }).ToListAsync(),
                challenges = await db.CodingChallenges.Where(x => admin || x.Lesson.Chapter.Course.TeacherId == uid).Select(x => new { x.Id, x.LessonId, x.Title, x.Description, x.StarterCode, x.Xp, tests = x.TestCases.OrderBy(t => t.Id).Select(t => new { t.Input, t.Expected, t.IsSample }) }).ToListAsync(),
                achievements = admin ? await db.Achievements.OrderBy(x => x.RequiredXp).ToListAsync() : []
            });
        });
        staff.MapManageContent();
        staff.MapManageUsers();
    }
}
