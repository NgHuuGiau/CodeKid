using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CodeKid.Api;

public record SeedLesson(string Title, string Objectives, string Explanation, string Example, string Notes, string Quiz, string[] QuizOptions, int QuizAnswer, int Level, string Template, string[][] Answers, string[] Options, string[][] Hints, string ChallengeTitle, string ChallengeDescription, List<TestEdit> Tests, string VideoUrl);
public static class Seed
{
    public static async Task SyncPythonContent(AppDb db, string contentRoot)
    {
        if (!db.Database.IsSqlite()) throw new InvalidOperationException("Đồng bộ seed chỉ hỗ trợ SQLite. Với PostgreSQL, hãy sao lưu bằng pg_dump trước khi cập nhật qua trang quản trị.");

        var seed = JsonSerializer.Deserialize<List<SeedLesson>>(
            await File.ReadAllTextAsync(Path.Combine(contentRoot, "seed", "python.json")),
            new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? throw new InvalidDataException("Không đọc được seed Python.");
        var python = await db.ProgrammingLanguages.SingleOrDefaultAsync(x => x.Slug == "python")
            ?? throw new InvalidOperationException("Không tìm thấy ngôn ngữ Python trong database.");
        var courses = await db.Courses.Where(x => x.LanguageId == python.Id).ToListAsync();
        if (courses.Count != 1) throw new InvalidOperationException("Cần đúng một khóa Python để đồng bộ seed.");

        var lessons = await db.Lessons.Where(x => x.Chapter.CourseId == courses[0].Id)
            .Include(x => x.Chapter).Include(x => x.Content).Include(x => x.Video)
            .Include(x => x.Exercises).ThenInclude(x => x.Blanks).ThenInclude(x => x.Answers)
            .Include(x => x.Exercises).ThenInclude(x => x.Options)
            .Include(x => x.Challenge).ThenInclude(x => x.TestCases)
            .AsSplitQuery()
            .ToListAsync();
        if (lessons.Count != seed.Count || seed.Count != 12)
            throw new InvalidOperationException($"Cần đúng 12 bài Python và 12 mục seed; hiện có {lessons.Count} bài, {seed.Count} mục seed. Không có dữ liệu nào được đổi.");

        var updates = seed.Select((content, index) =>
        {
            var chapterPosition = index / 4 + 1;
            var lessonPosition = index % 4 + 1;
            var matches = lessons.Where(x => x.Chapter.Position == chapterPosition && x.Position == lessonPosition).ToList();
            if (matches.Count != 1) throw new InvalidOperationException($"Không xác định duy nhất bài {chapterPosition}.{lessonPosition}; không có dữ liệu nào được đổi.");
            var lesson = matches[0];
            var range = Rules.BlankRange(content.Level);
            if (content.Answers.Length < range.Min || content.Answers.Length > range.Max)
                throw new InvalidDataException($"Bài {index + 1} có số ô trống không phù hợp cấp độ; không có dữ liệu nào được đổi.");
            if (lesson.Content is null || lesson.Video is null || lesson.Challenge is null || lesson.Exercises.Count != 2 ||
                lesson.Exercises.Select(x => x.Mode).Order().SequenceEqual(new[] { "drag", "memory" }) is false)
                throw new InvalidOperationException($"Bài {index + 1} thiếu nội dung, video, thử thách hoặc 2 chế độ luyện tập; không có dữ liệu nào được đổi.");
            if (lesson.Challenge.TestCases.Count != content.Tests.Count)
                throw new InvalidOperationException($"Bài {index + 1} có số test khác seed; giữ nguyên để bảo toàn lịch sử chấm, không có dữ liệu nào được đổi.");
            return (lesson, content);
        }).ToList();

        var backupPath = await BackupSqlite(db, contentRoot);
        await using var transaction = await db.Database.BeginTransactionAsync();
        foreach (var (lesson, content) in updates)
        {
            var video = lesson.Video!;
            var challenge = lesson.Challenge!;
            lesson.Title = content.Title;
            lesson.Content.Objectives = content.Objectives;
            lesson.Content.Explanation = content.Explanation;
            lesson.Content.Example = content.Example;
            lesson.Content.Notes = content.Notes;
            lesson.Content.Quiz = content.Quiz;
            lesson.Content.QuizOptions = content.QuizOptions;
            lesson.Content.QuizAnswer = content.QuizAnswer;
            video.Url = content.VideoUrl;
            video.Title = "Hướng dẫn: " + content.Title;
            challenge.Title = content.ChallengeTitle;
            challenge.Description = content.ChallengeDescription;

            var existingTests = challenge.TestCases.OrderBy(x => x.Id).ToList();
            for (var i = 0; i < existingTests.Count; i++)
            {
                existingTests[i].Input = content.Tests[i].Input;
                existingTests[i].Expected = content.Tests[i].Expected;
                existingTests[i].IsSample = content.Tests[i].IsSample;
            }

            foreach (var exercise in lesson.Exercises)
            {
                exercise.Prompt = exercise.Mode == "drag" ? "Kéo các mảnh code vào đúng ô trống." : "Nhớ lại kiến thức và tự gõ vào từng ô trống.";
                exercise.Template = content.Template;
                exercise.Level = content.Level;
                exercise.Xp = content.Level <= 5 ? 10 : content.Level <= 15 ? 20 : 30;
                db.ExerciseBlanks.RemoveRange(exercise.Blanks);
                db.ExerciseOptions.RemoveRange(exercise.Options);
                exercise.Blanks.Clear();
                exercise.Options.Clear();
                exercise.Blanks.AddRange(content.Answers.Select((answers, position) => new ExerciseBlank
                {
                    Position = position,
                    Hints = content.Hints[position],
                    Answers = answers.Select(value => new ExerciseAnswer { Value = value }).ToList()
                }));
                if (exercise.Mode == "drag") exercise.Options.AddRange(content.Options.Select(value => new ExerciseOption { Value = value }));
            }
        }
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        Console.WriteLine($"Đã đồng bộ {updates.Count} bài Python. Tiến độ, XP, tài khoản và ID bài/test được giữ nguyên. Bản sao SQLite: {backupPath}");
    }

    private static async Task<string> BackupSqlite(AppDb db, string contentRoot)
    {
        var source = (SqliteConnection)db.Database.GetDbConnection();
        var dataSource = new SqliteConnectionStringBuilder(source.ConnectionString).DataSource;
        if (string.IsNullOrWhiteSpace(dataSource) || dataSource == ":memory:")
            throw new InvalidOperationException("Cần file SQLite để tạo bản sao an toàn trước khi đồng bộ.");
        var path = Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "artifacts", "db-backups", $"codekid-{DateTime.UtcNow:yyyyMMdd-HHmmss-fff}.db"));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var backup = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path }.ToString());
            await backup.OpenAsync();
            source.BackupDatabase(backup);
        }
        finally { await db.Database.CloseConnectionAsync(); }
        return path;
    }

    public static async Task Initialize(IServiceProvider services, IWebHostEnvironment env, IConfiguration config)
    {
        var db = services.GetRequiredService<AppDb>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        var users = services.GetRequiredService<UserManager<AppUser>>();
        foreach (var r in new[] { "Student", "Teacher", "Admin" }) if (!await roles.RoleExistsAsync(r)) await roles.CreateAsync(new IdentityRole(r));
        if (!await db.ProgrammingLanguages.AnyAsync())
        {
            var langs = new[] {
                new ProgrammingLanguage { Name = "Python", Slug = "python", Description = "Bắt đầu dễ dàng, sáng tạo không giới hạn.", Color = "#F59E0B", Available = true },
                new ProgrammingLanguage { Name = "C++", Slug = "cpp", Description = "Khám phá thuật toán và thế giới game.", Color = "#38BDF8", Difficulty = "Thử thách hơn" },
                new ProgrammingLanguage { Name = "C#", Slug = "csharp", Description = "Xây dựng ứng dụng và trò chơi của riêng bạn.", Color = "#8B5CF6", Difficulty = "Trung bình" },
                new ProgrammingLanguage { Name = "Java", Slug = "java", Description = "Tư duy hướng đối tượng từng bước.", Color = "#EF4444", Difficulty = "Trung bình" },
                new ProgrammingLanguage { Name = "JavaScript", Slug = "javascript", Description = "Mang tương tác đến cho trang web.", Color = "#EAB308" },
                new ProgrammingLanguage { Name = "HTML", Slug = "html", Description = "Tạo trang web đầu tiên từ những thẻ nhỏ.", Color = "#F97316" },
                new ProgrammingLanguage { Name = "CSS", Slug = "css", Description = "Thêm sắc màu và phong cách cho trang web.", Color = "#3B82F6" },
                new ProgrammingLanguage { Name = "SQL", Slug = "sql", Description = "Khám phá và đặt câu hỏi cho dữ liệu.", Color = "#14B8A6", Difficulty = "Trung bình" }
            };
            db.AddRange(langs);
            var course = new Course { Language = langs[0], Title = "Phiêu lưu cùng Python", Description = "12 bài học, 3 chế độ thực hành. Từ lời chào đầu tiên đến tự viết chương trình của riêng mình.", Published = true };
            var chapters = new[] { "Khởi động hành trình", "Tư duy và điều khiển", "Chinh phục thử thách" }.Select((s, i) => new Chapter { Course = course, Title = s, Position = i + 1 }).ToArray();
            db.AddRange(chapters);
            var json = await File.ReadAllTextAsync(Path.Combine(env.ContentRootPath, "seed", "python.json"));
            var content = JsonSerializer.Deserialize<List<SeedLesson>>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            foreach (var (s, i) in content.Select((s, i) => (s, i)))
            {
                var range = Rules.BlankRange(s.Level);
                if (s.Answers.Length < range.Min || s.Answers.Length > range.Max) throw new InvalidDataException("Seed có số ô không phù hợp cấp độ.");
                var lesson = new Lesson
                {
                    Chapter = chapters[i / 4],
                    Title = s.Title,
                    Position = i % 4 + 1,
                    Content = new LessonContent { Objectives = s.Objectives, Explanation = s.Explanation, Example = s.Example, Notes = s.Notes, Quiz = s.Quiz, QuizOptions = s.QuizOptions, QuizAnswer = s.QuizAnswer },
                    Video = new Video { Url = s.VideoUrl, Title = "Hướng dẫn: " + s.Title },
                    Challenge = new CodingChallenge { Title = s.ChallengeTitle, Description = s.ChallengeDescription, StarterCode = "# Viết chương trình của bạn tại đây\n", TestCases = s.Tests.Select(t => new TestCase { Input = t.Input, Expected = t.Expected, IsSample = t.IsSample }).ToList() }
                };
                foreach (var mode in new[] { "drag", "memory" }) lesson.Exercises.Add(new Exercise
                {
                    Mode = mode,
                    Prompt = mode == "drag" ? "Kéo các mảnh code vào đúng ô trống." : "Nhớ lại kiến thức và tự gõ vào từng ô trống.",
                    Template = s.Template,
                    Level = s.Level,
                    Xp = s.Level <= 5 ? 10 : s.Level <= 15 ? 20 : 30,
                    Blanks = s.Answers.Select((a, pos) => new ExerciseBlank { Position = pos, Hints = s.Hints[pos], Answers = a.Select(v => new ExerciseAnswer { Value = v }).ToList() }).ToList(),
                    Options = mode == "drag" ? s.Options.Select(o => new ExerciseOption { Value = o }).ToList() : []
                });
                db.Add(lesson);
            }
            db.AddRange(new[] {
                new Achievement { Title = "Bước chân đầu tiên", Description = "Nhận 10 XP đầu tiên.", RequiredXp = 10, Icon = "star" },
                new Achievement { Title = "Nhà thám hiểm", Description = "Tích lũy 100 XP.", RequiredXp = 100, Icon = "rocket" },
                new Achievement { Title = "Tư duy lập trình", Description = "Tích lũy 500 XP.", RequiredXp = 500, Icon = "code" },
                new Achievement { Title = "Chinh phục Python", Description = "Tích lũy 1.000 XP.", RequiredXp = 1000, Icon = "trophy" }
            });
            await db.SaveChangesAsync();
        }
        var demo = env.IsDevelopment() || env.IsEnvironment("Testing");
        if (demo)
        {
            foreach (var (email, nick, role) in new[] { ("student@codekid.local", "Nhà thám hiểm", "Student"), ("teacher@codekid.local", "Cô Python", "Teacher"), ("admin@codekid.local", "Quản trị CodeKid", "Admin") })
            {
                if (await users.FindByEmailAsync(email) is not null) continue;
                var u = new AppUser { UserName = email, Email = email, EmailConfirmed = true, Profile = new StudentProfile { Nickname = nick } };
                var result = await users.CreateAsync(u, "CodeKid2026!");
                if (!result.Succeeded) throw new InvalidOperationException("Không tạo được tài khoản seed.");
                await users.AddToRoleAsync(u, role);
            }
            var teacher = await users.FindByEmailAsync("teacher@codekid.local");
            var course = await db.Courses.FirstAsync();
            if (course.TeacherId is null) { course.TeacherId = teacher!.Id; await db.SaveChangesAsync(); }
            if (!await db.Classes.AnyAsync())
            {
                var student = await users.FindByEmailAsync("student@codekid.local");
                db.Add(new ClassRoom { Name = "Lớp Python khám phá", TeacherId = teacher!.Id, Enrollments = [new ClassEnrollment { StudentId = student!.Id }] });
                await db.SaveChangesAsync();
            }
        }
        else if (config["SeedAdmin:Email"] is { Length: > 0 } adminEmail && !await db.UserRoles.AnyAsync(x => x.RoleId == db.Roles.Where(r => r.Name == "Admin").Select(r => r.Id).First()))
        {
            var pass = config["SeedAdmin:Password"] ?? throw new InvalidOperationException("Cần SeedAdmin:Password để khởi tạo admin.");
            var u = new AppUser { UserName = adminEmail, Email = adminEmail, EmailConfirmed = true, Profile = new StudentProfile { Nickname = "Quản trị CodeKid" } };
            var result = await users.CreateAsync(u, pass);
            if (!result.Succeeded) throw new InvalidOperationException("Mật khẩu admin không đủ mạnh hoặc email không hợp lệ.");
            await users.AddToRoleAsync(u, "Admin");
        }
        if (!demo && config["SeedTeacher:Email"] is { Length: > 0 } teacherEmail && await users.FindByEmailAsync(teacherEmail) is null)
        {
            var pass = config["SeedTeacher:Password"] ?? throw new InvalidOperationException("Cần SeedTeacher:Password để khởi tạo giáo viên.");
            var t = new AppUser { UserName = teacherEmail, Email = teacherEmail, EmailConfirmed = true, Profile = new StudentProfile { Nickname = config["SeedTeacher:Nickname"] is { Length: > 0 } nick ? nick : "Cô Python" } };
            var created = await users.CreateAsync(t, pass);
            if (!created.Succeeded) throw new InvalidOperationException("Mật khẩu giáo viên không đủ mạnh hoặc email không hợp lệ.");
            await users.AddToRoleAsync(t, "Teacher");
            var course = await db.Courses.FirstOrDefaultAsync();
            if (course is not null && course.TeacherId is null) { course.TeacherId = t.Id; await db.SaveChangesAsync(); }
        }
    }
}
