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

public static class ManageEndpoints
{
    static bool Text(string s, int max = 200) => !string.IsNullOrWhiteSpace(s) && s.Length <= max;
    static IResult Invalid(string message = "Kiểm tra các trường bắt buộc và giá trị nhập.") => Results.BadRequest(new { message });
    static async Task<bool> OwnCourse(AppDb db, ClaimsPrincipal user, int courseId) => await db.Courses.AnyAsync(x => x.Id == courseId && (user.IsInRole("Admin") || x.TeacherId == CurrentUser.Id(user)));
    static async Task<bool> OwnLesson(AppDb db, ClaimsPrincipal user, int lessonId) => await db.Lessons.AnyAsync(x => x.Id == lessonId && (user.IsInRole("Admin") || x.Chapter.Course.TeacherId == CurrentUser.Id(user)));
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
        staff.MapPut("/languages/{id:int}", async (int id, LanguageEdit r, AppDb db) =>
        {
            if (!Text(r.Name, 40) || !System.Text.RegularExpressions.Regex.IsMatch(r.Slug, "^[a-z][a-z0-9-]{0,39}$") || !Text(r.Description, 600) || !System.Text.RegularExpressions.Regex.IsMatch(r.Color, "^#[0-9a-fA-F]{6}$") || !Text(r.Difficulty, 80)) return Invalid();
            if (await db.ProgrammingLanguages.AnyAsync(x => x.Slug == r.Slug && x.Id != id)) return Invalid("Mã ngôn ngữ đã được dùng.");
            if (r.Available && r.Slug != "python") return Invalid("Chỉ Python có bộ chấm. Ngôn ngữ khác phải giữ Sắp ra mắt.");
            var x = id == 0 ? new ProgrammingLanguage() : await db.ProgrammingLanguages.FindAsync(id);
            if (x is null) return Results.NotFound();
            x.Name = r.Name; x.Slug = r.Slug; x.Description = r.Description; x.Color = r.Color; x.Difficulty = r.Difficulty; x.Available = r.Available;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapPut("/courses/{id:int}", async (int id, CourseEdit r, ClaimsPrincipal user, AppDb db, UserManager<AppUser> users) =>
        {
            if (!Text(r.Title) || !Text(r.Description, 2000) || !await db.ProgrammingLanguages.AnyAsync(x => x.Id == r.LanguageId)) return Invalid();
            if (id != 0 && !await OwnCourse(db, user, id)) return Results.Forbid();
            var teacherId = user.IsInRole("Admin") ? r.TeacherId : CurrentUser.Id(user);
            if (!string.IsNullOrEmpty(teacherId)) { var teacher = await users.FindByIdAsync(teacherId); if (teacher is null || !await users.IsInRoleAsync(teacher, "Teacher")) return Invalid("Người phụ trách phải có vai trò Teacher."); }
            var x = id == 0 ? new Course() : await db.Courses.FindAsync(id);
            if (x is null) return Results.NotFound();
            if (id != 0 && r.LanguageId != x.LanguageId && await db.Chapters.AnyAsync(c => c.CourseId == id)) return Invalid("Không đổi ngôn ngữ của khóa học đã có nội dung.");
            if (r.Published && (id == 0 || !await db.Lessons.AnyAsync(l => l.Chapter.CourseId == id && l.Published))) return Invalid("Tạo ít nhất một bài đầy đủ trước khi xuất bản khóa học.");
            x.LanguageId = r.LanguageId; x.Title = r.Title; x.Description = r.Description; x.TeacherId = string.IsNullOrWhiteSpace(teacherId) ? null : teacherId; x.Published = r.Published;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/chapters/{id:int}", async (int id, ChapterEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            if (!Text(r.Title) || r.Position is < 1 or > 1000) return Invalid();
            if (!await OwnCourse(db, user, r.CourseId)) return Results.Forbid();
            var x = id == 0 ? new Chapter() : await db.Chapters.FindAsync(id);
            if (x is null) return Results.NotFound();
            if (id != 0 && (!await OwnCourse(db, user, x.CourseId) || x.CourseId != r.CourseId)) return Results.Forbid();
            if (await db.Chapters.AnyAsync(c => c.CourseId == r.CourseId && c.Position == r.Position && c.Id != id)) return Invalid("Thứ tự chương bị trùng.");
            x.CourseId = r.CourseId; x.Title = r.Title; x.Position = r.Position;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/lessons/{id:int}", async (int id, LessonEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            var chapter = await db.Chapters.FindAsync(r.ChapterId);
            if (chapter is null || !await OwnCourse(db, user, chapter.CourseId) || id != 0 && !await OwnLesson(db, user, id)) return Results.Forbid();
            if (!Text(r.Title) || r.Position is < 1 or > 1000 || !Text(r.Objectives, 3000) || !Text(r.Explanation, 12000) || !Text(r.Example, 12000) || !Text(r.Notes, 3000) || !Text(r.Quiz, 1000) || r.QuizOptions.Length is < 2 or > 6 || r.QuizOptions.Any(v => !Text(v, 300)) || r.QuizAnswer < 0 || r.QuizAnswer >= r.QuizOptions.Length) return Invalid();
            if (!ValidVideo(r.VideoUrl)) return Invalid("Video phải là file /videos/*.mp4 hoặc URL nhúng YouTube HTTPS.");
            if (await db.Lessons.AnyAsync(l => l.ChapterId == r.ChapterId && l.Position == r.Position && l.Id != id)) return Invalid("Thứ tự bài bị trùng.");
            var x = id == 0 ? new Lesson() : await db.Lessons.Include(x => x.Content).Include(x => x.Video).FirstOrDefaultAsync(x => x.Id == id);
            if (x is null) return Results.NotFound();
            if (id != 0 && x.ChapterId != r.ChapterId) return Invalid("Không chuyển bài giữa các chương để bảo toàn tiến độ.");
            if (r.Published && (id == 0 || await db.Exercises.CountAsync(e => e.LessonId == id) != 2 || !await db.CodingChallenges.AnyAsync(c => c.LessonId == id))) return Invalid("Lưu bản nháp rồi tạo đủ kéo thả, tự gõ và thử thách trước khi xuất bản.");
            x.ChapterId = r.ChapterId; x.Title = r.Title; x.Position = r.Position; x.Published = r.Published;
            x.Content.Objectives = r.Objectives; x.Content.Explanation = r.Explanation; x.Content.Example = r.Example; x.Content.Notes = r.Notes; x.Content.Quiz = r.Quiz; x.Content.QuizOptions = r.QuizOptions; x.Content.QuizAnswer = r.QuizAnswer;
            x.Video ??= new Video(); x.Video.Url = r.VideoUrl; x.Video.Title = r.VideoTitle;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/exercises/{id:int}", async (int id, ExerciseEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            if (!await OwnLesson(db, user, r.LessonId)) return Results.Forbid();
            var range = Rules.BlankRange(r.Level);
            if (r.Mode is not ("drag" or "memory") || !Text(r.Prompt, 2000) || !Text(r.Template, 8000) || r.Level is < 1 or > 100 || r.Xp is < 1 or > 100 || r.Blanks.Count < range.Min || r.Blanks.Count > range.Max || r.Options.Length > 40) return Invalid("Số ô trống phải phù hợp cấp độ: 1, 2, 3–4, 5–7 hoặc 8–12.");
            if (r.Blanks.Select(x => x.Position).Distinct().Count() != r.Blanks.Count || r.Blanks.Any(x => x.Position < 0 || x.Position >= r.Blanks.Count || x.Answers.Length is < 1 or > 12 || x.Answers.Any(a => !Text(a, 200)) || x.Hints.Length is < 1 or > 4 || x.Hints.Any(h => !Text(h, 300)) || !r.Template.Contains("{{" + x.Position + "}}"))) return Invalid("Kiểm tra số thứ tự ô, đáp án, gợi ý và mẫu {{0}}, {{1}}…");
            var slots = System.Text.RegularExpressions.Regex.Matches(r.Template, @"\{\{(\d+)\}\}").Select(m => int.Parse(m.Groups[1].Value)).ToArray();
            if (slots.Length != r.Blanks.Count || slots.Distinct().Count() != slots.Length) return Invalid("Mỗi ô trống cần xuất hiện đúng một lần.");
            if (r.Mode == "drag" && (r.Options.Any(o => !Text(o, 200)) || r.Blanks.Any(b => !r.Options.Any(o => b.Answers.Contains(o))))) return Invalid("Ngân hàng đáp án phải có đáp án đúng cho mỗi ô.");
            if (await db.Exercises.AnyAsync(e => e.LessonId == r.LessonId && e.Mode == r.Mode && e.Id != id)) return Invalid("Bài học đã có chế độ này.");
            var x = id == 0 ? new Exercise() : await db.Exercises.Include(x => x.Blanks).ThenInclude(x => x.Answers).Include(x => x.Options).FirstOrDefaultAsync(x => x.Id == id);
            if (x is null) return Results.NotFound();
            if (id != 0 && (x.LessonId != r.LessonId || x.Mode != r.Mode)) return Invalid("Không đổi bài hoặc chế độ của hoạt động đã tồn tại.");
            if (id != 0) { db.ExerciseBlanks.RemoveRange(x.Blanks); db.ExerciseOptions.RemoveRange(x.Options); await db.SaveChangesAsync(); }
            x.LessonId = r.LessonId; x.Mode = r.Mode; x.Prompt = r.Prompt; x.Template = r.Template; x.Level = r.Level; x.Xp = r.Xp;
            x.Blanks = r.Blanks.Select(b => new ExerciseBlank { Position = b.Position, Hints = b.Hints, Answers = b.Answers.Select(a => new ExerciseAnswer { Value = a }).ToList() }).ToList();
            x.Options = (r.Mode == "drag" ? r.Options : []).Select(o => new ExerciseOption { Value = o }).ToList();
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/challenges/{id:int}", async (int id, ChallengeEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            if (!await OwnLesson(db, user, r.LessonId)) return Results.Forbid();
            if (!Text(r.Title) || !Text(r.Description, 6000) || r.StarterCode.Length > 12000 || r.Xp is < 1 or > 100 || r.Tests.Count is < 2 or > 10 || !r.Tests.Any(t => t.IsSample) || r.Tests.Any(t => t.Input.Length > 4000 || t.Expected.Length > 4000)) return Invalid("Thử thách cần 2–10 test, ít nhất một test mẫu.");
            if (await db.CodingChallenges.AnyAsync(c => c.LessonId == r.LessonId && c.Id != id)) return Invalid("Bài học đã có thử thách.");
            var x = id == 0 ? new CodingChallenge() : await db.CodingChallenges.Include(x => x.TestCases).FirstOrDefaultAsync(x => x.Id == id);
            if (x is null) return Results.NotFound();
            if (id != 0 && x.LessonId != r.LessonId) return Invalid("Không chuyển thử thách giữa các bài.");
            if (id != 0 && await db.Submissions.AnyAsync(s => s.ChallengeId == id)) return Invalid("Thử thách đã có bài nộp. Tạo bài học mới khi cần thay đổi test để bảo toàn lịch sử.");
            if (id != 0) db.TestCases.RemoveRange(x.TestCases);
            x.LessonId = r.LessonId; x.Title = r.Title; x.Description = r.Description; x.StarterCode = r.StarterCode; x.Xp = r.Xp;
            x.TestCases = r.Tests.Select(t => new TestCase { Input = t.Input, Expected = t.Expected, IsSample = t.IsSample }).ToList();
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/achievements/{id:int}", async (int id, AchievementEdit r, AppDb db) =>
        {
            if (!Text(r.Title) || !Text(r.Description, 1000) || r.Icon is not ("star" or "rocket" or "trophy" or "code") || r.RequiredXp is < 1 or > 100000) return Invalid();
            var x = id == 0 ? new Achievement() : await db.Achievements.FindAsync(id); if (x is null) return Results.NotFound();
            x.Title = r.Title; x.Description = r.Description; x.Icon = r.Icon; x.RequiredXp = r.RequiredXp;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapGet("/users", async (AppDb db, UserManager<AppUser> users) =>
        {
            var data = new List<object>();
            foreach (var u in await db.Users.Include(x => x.Profile).OrderBy(x => x.Email).Take(500).ToListAsync()) data.Add(new { u.Id, u.Email, u.Profile.Nickname, u.Profile.Xp, u.EmailConfirmed, locked = u.LockoutEnd > DateTimeOffset.UtcNow, roles = await users.GetRolesAsync(u) });
            return Results.Ok(data);
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapPut("/users/{id}/role", async (string id, RoleRequest r, ClaimsPrincipal principal, UserManager<AppUser> users, SignInManager<AppUser> signIn, AppDb db) =>
        {
            if (r.Role is not ("Student" or "Teacher" or "Admin")) return Invalid();
            if (id == CurrentUser.Id(principal)) return Invalid("Không tự thay đổi vai trò của mình.");
            var user = await users.FindByIdAsync(id); if (user is null) return Results.NotFound();
            var roles = await users.GetRolesAsync(user);
            if (roles.Contains("Admin") && r.Role != "Admin" && (await users.GetUsersInRoleAsync("Admin")).Count <= 1) return Invalid("Cần giữ ít nhất một quản trị viên.");
            if (roles.Contains("Teacher") && r.Role != "Teacher" && (await db.Courses.AnyAsync(x => x.TeacherId == id) || await db.Classes.AnyAsync(x => x.TeacherId == id))) return Invalid("Chuyển khóa học và lớp cho giáo viên khác trước khi đổi vai trò.");
            await users.RemoveFromRolesAsync(user, roles); await users.AddToRoleAsync(user, r.Role); await users.UpdateSecurityStampAsync(user);
            return Results.Ok(new { message = "Đã đổi vai trò. Người dùng cần đăng nhập lại." });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapPut("/users/{id}/lock", async (string id, bool locked, ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            if (id == CurrentUser.Id(principal)) return Invalid("Không tự khóa tài khoản.");
            var user = await users.FindByIdAsync(id); if (user is null) return Results.NotFound();
            if (await users.IsInRoleAsync(user, "Admin") && locked) return Invalid("Không khóa quản trị viên; đổi vai trò trước.");
            await users.SetLockoutEndDateAsync(user, locked ? DateTimeOffset.UtcNow.AddYears(100) : null);
            await users.UpdateSecurityStampAsync(user); return Results.Ok(new { message = "Đã cập nhật trạng thái tài khoản." });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapGet("/classes", async (ClaimsPrincipal user, AppDb db) => Results.Ok(await db.Classes.Where(x => user.IsInRole("Admin") || x.TeacherId == CurrentUser.Id(user)).Select(x => new { x.Id, x.Name, x.TeacherId, students = x.Enrollments.Select(e => new { id = e.StudentId, e.Student.Profile.Nickname, e.Student.Profile.Xp, completed = db.StudentProgress.Count(p => p.UserId == e.StudentId && p.Challenge), attempts = db.StudentAttempts.Count(a => a.UserId == e.StudentId) }) }).ToListAsync()));
        staff.MapPut("/classes/{id:int}", async (int id, ClassRequest r, ClaimsPrincipal user, AppDb db, UserManager<AppUser> users) =>
        {
            if (!Text(r.Name, 100)) return Invalid();
            var owner = user.IsInRole("Admin") ? r.TeacherId : CurrentUser.Id(user);
            var teacher = owner is null ? null : await users.FindByIdAsync(owner);
            if (teacher is null || !await users.IsInRoleAsync(teacher, "Teacher")) return Invalid("Chọn giáo viên phụ trách.");
            var x = id == 0 ? new ClassRoom() : await db.Classes.FindAsync(id); if (x is null) return Results.NotFound();
            if (id != 0 && !user.IsInRole("Admin") && x.TeacherId != CurrentUser.Id(user)) return Results.Forbid();
            x.Name = r.Name; x.TeacherId = owner!; if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPost("/classes/{id:int}/enroll", async (int id, EnrollmentRequest r, AppDb db, UserManager<AppUser> users) =>
        {
            if (!await db.Classes.AnyAsync(x => x.Id == id)) return Results.NotFound();
            var student = await users.FindByIdAsync(r.StudentId);
            if (student is null || !await users.IsInRoleAsync(student, "Student")) return Invalid("Chọn tài khoản học sinh.");
            if (!await db.ClassEnrollments.AnyAsync(x => x.ClassId == id && x.StudentId == r.StudentId)) { db.Add(new ClassEnrollment { ClassId = id, StudentId = r.StudentId }); await db.SaveChangesAsync(); }
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapDelete("/classes/{id:int}/students/{studentId}", async (int id, string studentId, AppDb db) =>
        {
            var x = await db.ClassEnrollments.FirstOrDefaultAsync(x => x.ClassId == id && x.StudentId == studentId);
            if (x is null) return Results.NotFound(); db.Remove(x); await db.SaveChangesAsync(); return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));
    }
    static bool ValidVideo(string url) => System.Text.RegularExpressions.Regex.IsMatch(url, @"^/videos/[a-z0-9-]+\.mp4$") || Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme == "https" && u.Host is "www.youtube-nocookie.com" && u.AbsolutePath.StartsWith("/embed/");
}
