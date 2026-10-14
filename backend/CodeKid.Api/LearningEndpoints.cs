using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodeKid.Api;

public static class LearningEndpoints
{
    public static IQueryable<Lesson> LessonQuery(AppDb db) => db.Lessons.Include(x => x.Chapter).ThenInclude(x => x.Course).ThenInclude(x => x.Language);
    public static void MapLearning(this WebApplication app)
    {
        app.MapGet("/api/languages", async (ClaimsPrincipal user, AppDb db) =>
        {
            var uid = user.Identity?.IsAuthenticated == true ? CurrentUser.Id(user) : null;
            return Results.Ok(await db.ProgrammingLanguages.OrderBy(x => x.Id).Select(x => new { x.Id, x.Name, x.Slug, x.Description, x.Color, x.Difficulty, x.Available,
                lessons = db.Lessons.Count(l => l.Chapter.Course.LanguageId == x.Id && l.Published && l.Chapter.Course.Published),
                completed = db.StudentProgress.Count(p => p.UserId == uid && p.Challenge && db.Lessons.Any(l => l.Id == p.LessonId && l.Chapter.Course.LanguageId == x.Id && l.Published && l.Chapter.Course.Published)) }).ToListAsync());
        });
        app.MapGet("/api/courses", async (AppDb db) => Results.Ok(await db.Courses.Where(x => x.Published && x.Language.Available).Select(x => new { x.Id, x.Title, x.Description, language = x.Language.Name, color = x.Language.Color, lessons = db.Lessons.Count(l => l.Chapter.CourseId == x.Id && l.Published) }).ToListAsync()));
        app.MapGet("/api/courses/{id:int}", async (int id, ClaimsPrincipal user, AppDb db, LearningService service) =>
        {
            var course = await db.Courses.Include(x => x.Language).Include(x => x.Chapters).ThenInclude(x => x.Lessons).FirstOrDefaultAsync(x => x.Id == id && x.Published && x.Language.Available);
            if (course is null) return Results.NotFound();
            var uid = user.Identity?.IsAuthenticated == true ? CurrentUser.Id(user) : null;
            var progress = uid is null ? [] : await db.StudentProgress.Where(x => x.UserId == uid).ToListAsync();
            var lessons = new List<object>();
            foreach (var l in course.Chapters.OrderBy(x => x.Position).SelectMany(x => x.Lessons.Where(l => l.Published).OrderBy(l => l.Position)))
                lessons.Add(new { l.Id, l.Title, l.Position, chapter = l.Chapter.Title, open = uid is not null && await service.LessonOpen(uid, l), progress = progress.Find(x => x.LessonId == l.Id) });
            return Results.Ok(new { course.Id, course.Title, course.Description, language = course.Language.Name, lessons });
        });
        app.MapGet("/api/leaderboard", async (AppDb db) => Results.Ok(await db.StudentProfiles.Where(x => x.LeaderboardOptIn && x.Xp > 0).OrderByDescending(x => x.Xp).ThenBy(x => x.Nickname).Take(20).Select(x => new { x.Nickname, x.Avatar, x.Xp, level = x.Xp / 100 + 1 }).ToListAsync()));
        var student = app.MapGroup("/api").RequireAuthorization();
        student.AddEndpointFilter<RequestValidationFilter>();
        student.MapGet("/dashboard", async (ClaimsPrincipal user, AppDb db) =>
        {
            var uid = CurrentUser.Id(user);
            var progress = await db.StudentProgress.Where(x => x.UserId == uid).ToListAsync();
            var history = await db.StudentAttempts.Where(x => x.UserId == uid).OrderByDescending(x => x.CreatedAt).Take(20).Join(db.Lessons, a => a.LessonId, l => l.Id, (a, l) => new { a.Id, a.Mode, a.Score, a.CreatedAt, lessonId = l.Id, lessonTitle = l.Title }).ToListAsync();
            var badges = await db.Achievements.Select(x => new { x.Id, x.Title, x.Description, x.Icon, x.RequiredXp, earned = db.StudentAchievements.Any(a => a.UserId == uid && a.AchievementId == x.Id) }).ToListAsync();
            var courses = await db.Courses.Where(x => x.Published && x.Language.Available).Select(x => new { x.Id, x.Title, language = x.Language.Name, total = db.Lessons.Count(l => l.Chapter.CourseId == x.Id && l.Published), completed = db.StudentProgress.Count(p => p.UserId == uid && p.Challenge && db.Lessons.Any(l => l.Id == p.LessonId && l.Chapter.CourseId == x.Id && l.Published)) }).ToListAsync();
            var today = DateTime.UtcNow.Date;
            var tasks = new[] {
                new { title = "Luyện tập một hoạt động hôm nay", done = await db.StudentAttempts.AnyAsync(x => x.UserId == uid && x.CreatedAt >= today) },
                new { title = "Hoàn thành bài Python đầu tiên", done = progress.Any(x => x.Challenge) },
                new { title = "Chinh phục chế độ tự gõ", done = progress.Any(x => x.Memory) }
            };
            return Results.Ok(new { progress, history, badges, courses, tasks });
        });
        student.MapGet("/lessons/{id:int}", async (int id, ClaimsPrincipal user, AppDb db, LearningService service) =>
        {
            var l = await LessonQuery(db).Include(x => x.Content).Include(x => x.Video).FirstOrDefaultAsync(x => x.Id == id);
            if (l is null) return Results.NotFound();
            var uid = CurrentUser.Id(user);
            if (!await service.LessonOpen(uid, l)) return Results.Json(new { message = "Hoàn thành bài trước để mở bài học này." }, statusCode: 403);
            var c = l.Content;
            return Results.Ok(new { l.Id, l.Title, l.Position, courseId = l.Chapter.CourseId, content = new { c.Objectives, c.Explanation, c.Example, c.Notes, c.Quiz, c.QuizOptions }, video = l.Video is null ? null : new { l.Video.Url, l.Video.Title }, progress = await db.StudentProgress.FirstOrDefaultAsync(x => x.UserId == uid && x.LessonId == id), exercises = await db.Exercises.Where(x => x.LessonId == id).Select(x => new { x.Id, x.Mode, x.Level }).ToListAsync(), challengeId = await db.CodingChallenges.Where(x => x.LessonId == id).Select(x => x.Id).SingleAsync() });
        });
        student.MapPost("/lessons/{id:int}/theory", async (int id, TheoryRequest r, ClaimsPrincipal user, AppDb db, LearningService service) => await service.Write<IResult>(async () =>
        {
            var l = await LessonQuery(db).Include(x => x.Content).FirstOrDefaultAsync(x => x.Id == id);
            if (l is null) return Results.NotFound();
            var uid = CurrentUser.Id(user);
            if (!await service.LessonOpen(uid, l)) return Results.Forbid();
            var correct = r.Answer == l.Content.QuizAnswer;
            db.StudentAttempts.Add(new StudentAttempt { UserId = uid, LessonId = id, Mode = "theory", Score = correct ? 100 : 0 });
            if (correct) { var p = await service.Progress(uid, id); p.Theory = true; p.UpdatedAt = DateTime.UtcNow; }
            return Results.Ok(new { correct, message = correct ? "Tuyệt vời! Chế độ kéo thả đã mở." : "Đọc lại ghi chú rồi thử thêm lần nữa nhé." });
        }));
        student.MapGet("/exercises/{id:int}", async (int id, ClaimsPrincipal user, AppDb db, LearningService service) =>
        {
            var e = await db.Exercises.Include(x => x.Blanks).Include(x => x.Options).FirstOrDefaultAsync(x => x.Id == id);
            if (e is null) return Results.NotFound();
            var uid = CurrentUser.Id(user); var l = await LessonQuery(db).SingleAsync(x => x.Id == e.LessonId);
            var p = await db.StudentProgress.FirstOrDefaultAsync(x => x.UserId == uid && x.LessonId == l.Id);
            if (!await service.LessonOpen(uid, l) || !LearningService.ModeOpen(p, e.Mode)) return Results.Json(new { message = "Hoàn thành hoạt động trước để mở chế độ này." }, statusCode: 403);
            return Results.Ok(new { e.Id, e.LessonId, e.Mode, e.Prompt, e.Template, e.Level, e.Xp, blanks = e.Blanks.OrderBy(x => x.Position).Select(x => new { x.Position, x.Hints }), options = e.Mode == "drag" ? e.Options.Select(x => new { x.Id, x.Value }) : null, attempts = await db.StudentAttempts.CountAsync(x => x.UserId == uid && x.LessonId == e.LessonId && x.Mode == e.Mode) });
        });
        student.MapPost("/exercises/{id:int}/check", async (int id, CheckRequest r, ClaimsPrincipal user, AppDb db, LearningService service) => await service.Write<IResult>(async () =>
        {
            var e = await db.Exercises.Include(x => x.Blanks).ThenInclude(x => x.Answers).FirstOrDefaultAsync(x => x.Id == id);
            if (e is null) return Results.NotFound();
            if (r.Values.Count > 12 || r.Values.Any(x => x.Value.Length > 200 || !e.Blanks.Any(b => b.Position == x.Key))) return Results.BadRequest(new { message = "Đáp án không hợp lệ." });
            if (r.Preview && e.Mode != "drag") return Results.BadRequest(new { message = "Chế độ tự gõ cần nộp toàn bộ bài để kiểm tra." });
            var uid = CurrentUser.Id(user); var l = await LessonQuery(db).SingleAsync(x => x.Id == e.LessonId);
            var p = await service.Progress(uid, e.LessonId);
            if (!await service.LessonOpen(uid, l) || !LearningService.ModeOpen(p, e.Mode)) return Results.Forbid();
            var correctPositions = e.Blanks.Where(b => r.Values.TryGetValue(b.Position, out var value) && Rules.Accepted(value, b.Answers.Select(a => a.Value))).Select(x => x.Position).ToArray();
            var score = Rules.Score(correctPositions.Length, e.Blanks.Count);
            var xp = 0;
            if (!r.Preview)
            {
                db.StudentAttempts.Add(new StudentAttempt { UserId = uid, LessonId = e.LessonId, Mode = e.Mode, Score = score, IncorrectPositions = string.Join(',', e.Blanks.Select(x => x.Position).Except(correctPositions)) });
                if (score >= 80) { if (e.Mode == "drag") p.Drag = true; else p.Memory = true; p.UpdatedAt = DateTime.UtcNow; xp = await service.Award(uid, $"{e.Mode}:{e.Id}", e.Xp); }
            }
            return Results.Ok(new { score, correctPositions, passed = score >= 80, xp, attempts = await db.StudentAttempts.CountAsync(x => x.UserId == uid && x.LessonId == e.LessonId && x.Mode == e.Mode) + (r.Preview ? 0 : 1) });
        }));
        student.MapGet("/challenges/{id:int}", async (int id, ClaimsPrincipal user, AppDb db, LearningService service) =>
        {
            var c = await db.CodingChallenges.Include(x => x.TestCases).FirstOrDefaultAsync(x => x.Id == id);
            if (c is null) return Results.NotFound();
            var uid = CurrentUser.Id(user); var l = await LessonQuery(db).SingleAsync(x => x.Id == c.LessonId);
            var p = await db.StudentProgress.FirstOrDefaultAsync(x => x.UserId == uid && x.LessonId == l.Id);
            if (!await service.LessonOpen(uid, l) || !LearningService.ModeOpen(p, "challenge")) return Results.Json(new { message = "Hoàn thành chế độ tự gõ để mở thử thách." }, statusCode: 403);
            return Results.Ok(new { c.Id, c.LessonId, c.Title, c.Description, c.StarterCode, c.Xp, tests = c.TestCases.Where(x => x.IsSample).Select(x => new { x.Input, x.Expected }), totalTests = c.TestCases.Count });
        });
        student.MapPost("/challenges/{id:int}/submit", async (int id, CodeRequest r, ClaimsPrincipal user, AppDb db, LearningService service, RunnerClient runner, CancellationToken ct) =>
        {
            if (r.Code.Length is < 1 or > 12000) return Results.BadRequest(new { message = "Chương trình phải có 1–12.000 ký tự." });
            var c = await db.CodingChallenges.Include(x => x.TestCases).FirstOrDefaultAsync(x => x.Id == id);
            if (c is null) return Results.NotFound();
            var uid = CurrentUser.Id(user); var l = await LessonQuery(db).SingleAsync(x => x.Id == c.LessonId);
            var p = await db.StudentProgress.FirstOrDefaultAsync(x => x.UserId == uid && x.LessonId == l.Id);
            if (!await service.LessonOpen(uid, l) || !LearningService.ModeOpen(p, "challenge")) return Results.Forbid();
            var tests = c.TestCases.Where(x => !r.Practice || x.IsSample).OrderBy(x => x.Id).ToList();
            var result = await runner.Run(r.Code, tests, ct);
            if (result is null) return Results.Problem("Sandbox chưa sẵn sàng. Bật Docker và dịch vụ runner, rồi thử lại. Bài chưa được chấm và không mất tiến độ.", statusCode: 503);
            return await service.Write<IResult>(async () =>
            {
                var score = Rules.Score(result.Results.Count(x => x.Passed), tests.Count);
                var submission = new Submission
                {
                    UserId = uid,
                    ChallengeId = id,
                    Code = r.Code,
                    IsPractice = r.Practice,
                    Score = score,
                    Results = result.Results.Select((x, i) => new SubmissionResult { TestCaseId = tests[i].Id, Passed = x.Passed, Output = x.Output, Error = x.Error }).ToList()
                };
                db.Submissions.Add(submission);
                var xp = 0;
                if (!r.Practice)
                {
                    db.StudentAttempts.Add(new StudentAttempt { UserId = uid, LessonId = c.LessonId, Mode = "challenge", Score = score });
                    if (score >= 80) { var progress = await service.Progress(uid, c.LessonId); progress.Challenge = true; progress.UpdatedAt = DateTime.UtcNow; xp = await service.Award(uid, $"challenge:{id}", c.Xp); xp += await service.Award(uid, $"lesson:{c.LessonId}", 50); }
                }
                await db.SaveChangesAsync();
                return Results.Ok(new { submissionId = submission.Id, score, passed = score >= 80, xp, practice = r.Practice, results = result.Results.Select((x, i) => new { x.Passed, output = tests[i].IsSample ? x.Output : "", error = tests[i].IsSample ? x.Error : (x.Passed ? "" : "Test ẩn chưa đạt. Kiểm tra các trường hợp biên."), sample = tests[i].IsSample }) });
            });
        }).RequireRateLimiting("code");
        student.MapGet("/submissions/{id:int}", async (int id, ClaimsPrincipal user, AppDb db) =>
        {
            var s = await db.Submissions.Include(x => x.Results).FirstOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUser.Id(user));
            if (s is null) return Results.NotFound();
            var visible = await db.TestCases.Where(x => x.ChallengeId == s.ChallengeId && x.IsSample).Select(x => x.Id).ToListAsync();
            return Results.Ok(new { s.Id, s.ChallengeId, s.Score, s.IsPractice, s.CreatedAt, s.Code, results = s.Results.Select(x => new { x.Passed, output = visible.Contains(x.TestCaseId) ? x.Output : "", error = visible.Contains(x.TestCaseId) ? x.Error : (x.Passed ? "" : "Test ẩn chưa đạt.") }) });
        });
    }
}
