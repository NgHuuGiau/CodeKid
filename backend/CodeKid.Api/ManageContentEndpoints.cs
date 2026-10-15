using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodeKid.Api;

public static class ManageContentEndpoints
{
    public static void MapManageContent(this RouteGroupBuilder staff)
    {
        staff.MapPut("/languages/{id:int}", async (int id, LanguageEdit r, AppDb db) =>
        {
            if (!ManageRules.Text(r.Name, 40) || !System.Text.RegularExpressions.Regex.IsMatch(r.Slug, "^[a-z][a-z0-9-]{0,39}$") || !ManageRules.Text(r.Description, 600) || !System.Text.RegularExpressions.Regex.IsMatch(r.Color, "^#[0-9a-fA-F]{6}$") || !ManageRules.Text(r.Difficulty, 80)) return ManageRules.Invalid();
            if (await db.ProgrammingLanguages.AnyAsync(x => x.Slug == r.Slug && x.Id != id)) return ManageRules.Invalid("Mã ngôn ngữ đã được dùng.");
            if (r.Available && r.Slug != "python") return ManageRules.Invalid("Chỉ Python có bộ chấm. Ngôn ngữ khác phải giữ Sắp ra mắt.");
            var x = id == 0 ? new ProgrammingLanguage() : await db.ProgrammingLanguages.FindAsync(id);
            if (x is null) return Results.NotFound();
            x.Name = r.Name; x.Slug = r.Slug; x.Description = r.Description; x.Color = r.Color; x.Difficulty = r.Difficulty; x.Available = r.Available;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapPut("/courses/{id:int}", async (int id, CourseEdit r, ClaimsPrincipal user, AppDb db, UserManager<AppUser> users) =>
        {
            if (!ManageRules.Text(r.Title) || !ManageRules.Text(r.Description, 2000) || !await db.ProgrammingLanguages.AnyAsync(x => x.Id == r.LanguageId)) return ManageRules.Invalid();
            if (id != 0 && !await ManageRules.OwnCourse(db, user, id)) return Results.Forbid();
            var teacherId = user.IsInRole("Admin") ? r.TeacherId : CurrentUser.Id(user);
            if (!string.IsNullOrEmpty(teacherId)) { var teacher = await users.FindByIdAsync(teacherId); if (teacher is null || !await users.IsInRoleAsync(teacher, "Teacher")) return ManageRules.Invalid("Người phụ trách phải có vai trò Teacher."); }
            var x = id == 0 ? new Course() : await db.Courses.FindAsync(id);
            if (x is null) return Results.NotFound();
            if (id != 0 && r.LanguageId != x.LanguageId && await db.Chapters.AnyAsync(c => c.CourseId == id)) return ManageRules.Invalid("Không đổi ngôn ngữ của khóa học đã có nội dung.");
            if (r.Published && (id == 0 || !await db.Lessons.AnyAsync(l => l.Chapter.CourseId == id && l.Published))) return ManageRules.Invalid("Tạo ít nhất một bài đầy đủ trước khi xuất bản khóa học.");
            x.LanguageId = r.LanguageId; x.Title = r.Title; x.Description = r.Description; x.TeacherId = string.IsNullOrWhiteSpace(teacherId) ? null : teacherId; x.Published = r.Published;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/chapters/{id:int}", async (int id, ChapterEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            if (!ManageRules.Text(r.Title) || r.Position is < 1 or > 1000) return ManageRules.Invalid();
            if (!await ManageRules.OwnCourse(db, user, r.CourseId)) return Results.Forbid();
            var x = id == 0 ? new Chapter() : await db.Chapters.FindAsync(id);
            if (x is null) return Results.NotFound();
            if (id != 0 && (!await ManageRules.OwnCourse(db, user, x.CourseId) || x.CourseId != r.CourseId)) return Results.Forbid();
            if (await db.Chapters.AnyAsync(c => c.CourseId == r.CourseId && c.Position == r.Position && c.Id != id)) return ManageRules.Invalid("Thứ tự chương bị trùng.");
            x.CourseId = r.CourseId; x.Title = r.Title; x.Position = r.Position;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/lessons/{id:int}", async (int id, LessonEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            var chapter = await db.Chapters.FindAsync(r.ChapterId);
            if (chapter is null || !await ManageRules.OwnCourse(db, user, chapter.CourseId) || id != 0 && !await ManageRules.OwnLesson(db, user, id)) return Results.Forbid();
            if (!ManageRules.Text(r.Title) || r.Position is < 1 or > 1000 || !ManageRules.Text(r.Objectives, 3000) || !ManageRules.Text(r.Explanation, 12000) || !ManageRules.Text(r.Example, 12000) || !ManageRules.Text(r.Notes, 3000) || !ManageRules.Text(r.Quiz, 1000) || r.QuizOptions.Length is < 2 or > 6 || r.QuizOptions.Any(v => !ManageRules.Text(v, 300)) || r.QuizAnswer < 0 || r.QuizAnswer >= r.QuizOptions.Length) return ManageRules.Invalid();
            if (!ManageRules.ValidVideo(r.VideoUrl)) return ManageRules.Invalid("Video phải là file /videos/*.mp4 hoặc URL nhúng YouTube HTTPS.");
            if (await db.Lessons.AnyAsync(l => l.ChapterId == r.ChapterId && l.Position == r.Position && l.Id != id)) return ManageRules.Invalid("Thứ tự bài bị trùng.");
            var x = id == 0 ? new Lesson() : await db.Lessons.Include(x => x.Content).Include(x => x.Video).FirstOrDefaultAsync(x => x.Id == id);
            if (x is null) return Results.NotFound();
            if (id != 0 && x.ChapterId != r.ChapterId) return ManageRules.Invalid("Không chuyển bài giữa các chương để bảo toàn tiến độ.");
            if (r.Published && (id == 0 || await db.Exercises.CountAsync(e => e.LessonId == id) != 2 || !await db.CodingChallenges.AnyAsync(c => c.LessonId == id))) return ManageRules.Invalid("Lưu bản nháp rồi tạo đủ kéo thả, tự gõ và thử thách trước khi xuất bản.");
            x.ChapterId = r.ChapterId; x.Title = r.Title; x.Position = r.Position; x.Published = r.Published;
            x.Content.Objectives = r.Objectives; x.Content.Explanation = r.Explanation; x.Content.Example = r.Example; x.Content.Notes = r.Notes; x.Content.Quiz = r.Quiz; x.Content.QuizOptions = r.QuizOptions; x.Content.QuizAnswer = r.QuizAnswer;
            x.Video ??= new Video(); x.Video.Url = r.VideoUrl; x.Video.Title = r.VideoTitle;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/exercises/{id:int}", async (int id, ExerciseEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            if (!await ManageRules.OwnLesson(db, user, r.LessonId)) return Results.Forbid();
            var range = Rules.BlankRange(r.Level);
            if (r.Mode is not ("drag" or "memory") || !ManageRules.Text(r.Prompt, 2000) || !ManageRules.Text(r.Template, 8000) || r.Level is < 1 or > 100 || r.Xp is < 1 or > 100 || r.Blanks.Count < range.Min || r.Blanks.Count > range.Max || r.Options.Length > 40) return ManageRules.Invalid("Số ô trống phải phù hợp cấp độ: 1, 2, 3–4, 5–7 hoặc 8–12.");
            if (r.Blanks.Select(x => x.Position).Distinct().Count() != r.Blanks.Count || r.Blanks.Any(x => x.Position < 0 || x.Position >= r.Blanks.Count || x.Answers.Length is < 1 or > 12 || x.Answers.Any(a => !ManageRules.Text(a, 200)) || x.Hints.Length is < 1 or > 4 || x.Hints.Any(h => !ManageRules.Text(h, 300)) || !r.Template.Contains("{{" + x.Position + "}}"))) return ManageRules.Invalid("Kiểm tra số thứ tự ô, đáp án, gợi ý và mẫu {{0}}, {{1}}…");
            var slots = System.Text.RegularExpressions.Regex.Matches(r.Template, @"\{\{(\d+)\}\}").Select(m => int.Parse(m.Groups[1].Value)).ToArray();
            if (slots.Length != r.Blanks.Count || slots.Distinct().Count() != slots.Length) return ManageRules.Invalid("Mỗi ô trống cần xuất hiện đúng một lần.");
            if (r.Mode == "drag" && (r.Options.Any(o => !ManageRules.Text(o, 200)) || r.Blanks.Any(b => !r.Options.Any(o => b.Answers.Contains(o))))) return ManageRules.Invalid("Ngân hàng đáp án phải có đáp án đúng cho mỗi ô.");
            if (await db.Exercises.AnyAsync(e => e.LessonId == r.LessonId && e.Mode == r.Mode && e.Id != id)) return ManageRules.Invalid("Bài học đã có chế độ này.");
            var x = id == 0 ? new Exercise() : await db.Exercises.Include(x => x.Blanks).ThenInclude(x => x.Answers).Include(x => x.Options).FirstOrDefaultAsync(x => x.Id == id);
            if (x is null) return Results.NotFound();
            if (id != 0 && (x.LessonId != r.LessonId || x.Mode != r.Mode)) return ManageRules.Invalid("Không đổi bài hoặc chế độ của hoạt động đã tồn tại.");
            if (id != 0) { db.ExerciseBlanks.RemoveRange(x.Blanks); db.ExerciseOptions.RemoveRange(x.Options); await db.SaveChangesAsync(); }
            x.LessonId = r.LessonId; x.Mode = r.Mode; x.Prompt = r.Prompt; x.Template = r.Template; x.Level = r.Level; x.Xp = r.Xp;
            x.Blanks = r.Blanks.Select(b => new ExerciseBlank { Position = b.Position, Hints = b.Hints, Answers = b.Answers.Select(a => new ExerciseAnswer { Value = a }).ToList() }).ToList();
            x.Options = (r.Mode == "drag" ? r.Options : []).Select(o => new ExerciseOption { Value = o }).ToList();
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/challenges/{id:int}", async (int id, ChallengeEdit r, ClaimsPrincipal user, AppDb db) =>
        {
            if (!await ManageRules.OwnLesson(db, user, r.LessonId)) return Results.Forbid();
            if (!ManageRules.Text(r.Title) || !ManageRules.Text(r.Description, 6000) || r.StarterCode.Length > 12000 || r.Xp is < 1 or > 100 || r.Tests.Count is < 2 or > 10 || !r.Tests.Any(t => t.IsSample) || r.Tests.Any(t => t.Input.Length > 4000 || t.Expected.Length > 4000)) return ManageRules.Invalid("Thử thách cần 2–10 test, ít nhất một test mẫu.");
            if (await db.CodingChallenges.AnyAsync(c => c.LessonId == r.LessonId && c.Id != id)) return ManageRules.Invalid("Bài học đã có thử thách.");
            var x = id == 0 ? new CodingChallenge() : await db.CodingChallenges.Include(x => x.TestCases).FirstOrDefaultAsync(x => x.Id == id);
            if (x is null) return Results.NotFound();
            if (id != 0 && x.LessonId != r.LessonId) return ManageRules.Invalid("Không chuyển thử thách giữa các bài.");
            if (id != 0 && await db.Submissions.AnyAsync(s => s.ChallengeId == id)) return ManageRules.Invalid("Thử thách đã có bài nộp. Tạo bài học mới khi cần thay đổi test để bảo toàn lịch sử.");
            if (id != 0) db.TestCases.RemoveRange(x.TestCases);
            x.LessonId = r.LessonId; x.Title = r.Title; x.Description = r.Description; x.StarterCode = r.StarterCode; x.Xp = r.Xp;
            x.TestCases = r.Tests.Select(t => new TestCase { Input = t.Input, Expected = t.Expected, IsSample = t.IsSample }).ToList();
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPut("/achievements/{id:int}", async (int id, AchievementEdit r, AppDb db) =>
        {
            if (!ManageRules.Text(r.Title) || !ManageRules.Text(r.Description, 1000) || r.Icon is not ("star" or "rocket" or "trophy" or "code") || r.RequiredXp is < 1 or > 100000) return ManageRules.Invalid();
            var x = id == 0 ? new Achievement() : await db.Achievements.FindAsync(id); if (x is null) return Results.NotFound();
            x.Title = r.Title; x.Description = r.Description; x.Icon = r.Icon; x.RequiredXp = r.RequiredXp;
            if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
    }
}
