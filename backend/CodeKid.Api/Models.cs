using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace CodeKid.Api;

public class AppUser : IdentityUser { public StudentProfile Profile { get; set; } = null!; }
public class StudentProfile
{
    [Key] public string UserId { get; set; } = "";
    public AppUser User { get; set; } = null!;
    public string Nickname { get; set; } = "";
    public string Avatar { get; set; } = "robot";
    public string AgeBand { get; set; } = "13-16";
    public bool GuardianConsent { get; set; }
    public bool LeaderboardOptIn { get; set; }
    public int Xp { get; set; }
}
public class ProgrammingLanguage
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Description { get; set; } = "";
    public string Color { get; set; } = "#6366F1";
    public string Difficulty { get; set; } = "Dễ bắt đầu";
    public bool Available { get; set; }
}
public class Course
{
    public int Id { get; set; }
    public int LanguageId { get; set; }
    public ProgrammingLanguage Language { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string? TeacherId { get; set; }
    public AppUser? Teacher { get; set; }
    public bool Published { get; set; }
    public List<Chapter> Chapters { get; set; } = [];
}
public class Chapter
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public string Title { get; set; } = "";
    public int Position { get; set; }
    public List<Lesson> Lessons { get; set; } = [];
}
public class Lesson
{
    public int Id { get; set; }
    public int ChapterId { get; set; }
    public Chapter Chapter { get; set; } = null!;
    public string Title { get; set; } = "";
    public int Position { get; set; }
    public bool Published { get; set; } = true;
    public LessonContent Content { get; set; } = new();
    public Video? Video { get; set; }
    public List<Exercise> Exercises { get; set; } = [];
    public CodingChallenge Challenge { get; set; } = null!;
}
public class LessonContent
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public Lesson Lesson { get; set; } = null!;
    public string Objectives { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string Example { get; set; } = "";
    public string Notes { get; set; } = "";
    public string Quiz { get; set; } = "";
    public string[] QuizOptions { get; set; } = [];
    public int QuizAnswer { get; set; }
}
public class Video
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public Lesson Lesson { get; set; } = null!;
    public string Url { get; set; } = "";
    public string Title { get; set; } = "";
}
public class Exercise
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public Lesson Lesson { get; set; } = null!;
    public string Mode { get; set; } = "drag";
    public string Prompt { get; set; } = "";
    public string Template { get; set; } = "";
    public int Level { get; set; } = 1;
    public int Xp { get; set; } = 10;
    public List<ExerciseBlank> Blanks { get; set; } = [];
    public List<ExerciseOption> Options { get; set; } = [];
}
public class ExerciseBlank
{
    public int Id { get; set; }
    public int ExerciseId { get; set; }
    public int Position { get; set; }
    public string[] Hints { get; set; } = [];
    public List<ExerciseAnswer> Answers { get; set; } = [];
}
public class ExerciseOption { public int Id { get; set; } public int ExerciseId { get; set; } public string Value { get; set; } = ""; }
public class ExerciseAnswer { public int Id { get; set; } public int BlankId { get; set; } public string Value { get; set; } = ""; }
public class CodingChallenge
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public Lesson Lesson { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string StarterCode { get; set; } = "";
    public int Xp { get; set; } = 30;
    public List<TestCase> TestCases { get; set; } = [];
}
public class TestCase { public int Id { get; set; } public int ChallengeId { get; set; } public string Input { get; set; } = ""; public string Expected { get; set; } = ""; public bool IsSample { get; set; } }
public class Submission
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public int ChallengeId { get; set; }
    public string Code { get; set; } = "";
    public bool IsPractice { get; set; }
    public int Score { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<SubmissionResult> Results { get; set; } = [];
}
public class SubmissionResult { public int Id { get; set; } public int SubmissionId { get; set; } public int TestCaseId { get; set; } public bool Passed { get; set; } public string Output { get; set; } = ""; public string Error { get; set; } = ""; }
public class StudentProgress
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public int LessonId { get; set; }
    public bool Theory { get; set; }
    public bool Drag { get; set; }
    public bool Memory { get; set; }
    public bool Challenge { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
public class StudentAttempt { public int Id { get; set; } public string UserId { get; set; } = ""; public int LessonId { get; set; } public string Mode { get; set; } = ""; public int Score { get; set; } public string IncorrectPositions { get; set; } = ""; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; }
public class XPTransaction { public int Id { get; set; } public string UserId { get; set; } = ""; public string Source { get; set; } = ""; public int Amount { get; set; } public DateTime CreatedAt { get; set; } = DateTime.UtcNow; }
public class Achievement { public int Id { get; set; } public string Title { get; set; } = ""; public string Description { get; set; } = ""; public string Icon { get; set; } = "star"; public int RequiredXp { get; set; } }
public class StudentAchievement { public int Id { get; set; } public string UserId { get; set; } = ""; public int AchievementId { get; set; } public Achievement Achievement { get; set; } = null!; public DateTime EarnedAt { get; set; } = DateTime.UtcNow; }
public class ClassRoom { public int Id { get; set; } public string TeacherId { get; set; } = ""; public AppUser Teacher { get; set; } = null!; public string Name { get; set; } = ""; public List<ClassEnrollment> Enrollments { get; set; } = []; }
public class ClassEnrollment { public int Id { get; set; } public int ClassId { get; set; } public ClassRoom Class { get; set; } = null!; public string StudentId { get; set; } = ""; public AppUser Student { get; set; } = null!; }
