using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CodeKid.Api;

public class AppDb(DbContextOptions<AppDb> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<ProgrammingLanguage> ProgrammingLanguages => Set<ProgrammingLanguage>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<LessonContent> LessonContents => Set<LessonContent>();
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<ExerciseBlank> ExerciseBlanks => Set<ExerciseBlank>();
    public DbSet<ExerciseOption> ExerciseOptions => Set<ExerciseOption>();
    public DbSet<ExerciseAnswer> ExerciseAnswers => Set<ExerciseAnswer>();
    public DbSet<CodingChallenge> CodingChallenges => Set<CodingChallenge>();
    public DbSet<TestCase> TestCases => Set<TestCase>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionResult> SubmissionResults => Set<SubmissionResult>();
    public DbSet<StudentProgress> StudentProgress => Set<StudentProgress>();
    public DbSet<StudentAttempt> StudentAttempts => Set<StudentAttempt>();
    public DbSet<XPTransaction> XPTransactions => Set<XPTransaction>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<StudentAchievement> StudentAchievements => Set<StudentAchievement>();
    public DbSet<ClassRoom> Classes => Set<ClassRoom>();
    public DbSet<ClassEnrollment> ClassEnrollments => Set<ClassEnrollment>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.Entity<StudentProfile>().HasOne(x => x.User).WithOne(x => x.Profile).HasForeignKey<StudentProfile>(x => x.UserId);
        b.Entity<ProgrammingLanguage>().HasIndex(x => x.Slug).IsUnique();
        b.Entity<Course>().HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Chapter>().HasIndex(x => new { x.CourseId, x.Position }).IsUnique();
        b.Entity<Lesson>().HasIndex(x => new { x.ChapterId, x.Position }).IsUnique();
        b.Entity<Lesson>().HasOne(x => x.Content).WithOne(x => x.Lesson).HasForeignKey<LessonContent>(x => x.LessonId);
        b.Entity<Lesson>().HasOne(x => x.Video).WithOne(x => x.Lesson).HasForeignKey<Video>(x => x.LessonId);
        b.Entity<Lesson>().HasOne(x => x.Challenge).WithOne(x => x.Lesson).HasForeignKey<CodingChallenge>(x => x.LessonId);
        b.Entity<Exercise>().HasIndex(x => new { x.LessonId, x.Mode }).IsUnique();
        b.Entity<ExerciseBlank>().HasIndex(x => new { x.ExerciseId, x.Position }).IsUnique();
        b.Entity<ExerciseBlank>().HasMany(x => x.Answers).WithOne().HasForeignKey(x => x.BlankId);
        b.Entity<StudentProgress>().HasIndex(x => new { x.UserId, x.LessonId }).IsUnique();
        b.Entity<XPTransaction>().HasIndex(x => new { x.UserId, x.Source }).IsUnique();
        b.Entity<StudentAchievement>().HasIndex(x => new { x.UserId, x.AchievementId }).IsUnique();
        b.Entity<ClassEnrollment>().HasIndex(x => new { x.ClassId, x.StudentId }).IsUnique();
        b.Entity<ClassRoom>().HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<ClassEnrollment>().HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<StudentAttempt>().HasIndex(x => new { x.UserId, x.CreatedAt });
        b.Entity<Submission>().HasIndex(x => new { x.UserId, x.CreatedAt });
        b.Entity<XPTransaction>().ToTable(t => t.HasCheckConstraint("CK_Xp_Positive", "\"Amount\" > 0"));
        b.Entity<StudentProfile>().ToTable(t => t.HasCheckConstraint("CK_Profile_Xp", "\"Xp\" >= 0"));
        foreach (var type in new[] { typeof(StudentProgress), typeof(StudentAttempt), typeof(XPTransaction), typeof(Submission), typeof(StudentAchievement) })
            b.Entity(type).HasOne(typeof(AppUser), null).WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade);
        b.Entity<StudentProgress>().HasOne<Lesson>().WithMany().HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<StudentAttempt>().HasOne<Lesson>().WithMany().HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Submission>().HasOne<CodingChallenge>().WithMany().HasForeignKey(x => x.ChallengeId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<SubmissionResult>().HasOne<TestCase>().WithMany().HasForeignKey(x => x.TestCaseId).OnDelete(DeleteBehavior.Restrict);
    }
}
