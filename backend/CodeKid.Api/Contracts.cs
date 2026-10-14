using System.ComponentModel.DataAnnotations;

namespace CodeKid.Api;

public record RegisterRequest(string Email, string Password, string Nickname, string AgeBand, bool GuardianConsent);
public record LoginRequest(string Email, string Password);
public record ProfileRequest(string Nickname, string Avatar, bool LeaderboardOptIn);
public record PasswordRequest(string CurrentPassword, string NewPassword);
public record ResetRequest(string Email, string Token, string Password);
public record CheckRequest(Dictionary<int, string> Values, bool Preview = false);
public record CodeRequest(string Code, bool Practice = false);
public record TheoryRequest(int Answer);
public record RunnerCase(string Input, string Expected);
public record RunnerRequest(string Code, List<RunnerCase> Tests);
public record RunnerResult(bool Passed, string Output, string Error);
public record RunnerResponse(List<RunnerResult> Results);
public record RoleRequest(string Role);
public record EnrollmentRequest(string StudentId);
public record ClassRequest(string Name, string? TeacherId);

public class RequestValidationFilter : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var nullable = new System.Reflection.NullabilityInfoContext();
        foreach (var value in context.Arguments.Where(x => x is not null && (x.GetType().Name.EndsWith("Request") || x.GetType().Name.EndsWith("Edit"))))
            foreach (var property in value!.GetType().GetProperties())
                if (nullable.Create(property).ReadState == System.Reflection.NullabilityState.NotNull && property.GetValue(value) is null)
                    return ValueTask.FromResult<object?>(Results.BadRequest(new { message = "Thiếu trường bắt buộc: " + property.Name }));
        return next(context);
    }
}

public static class Rules
{
    public static readonly string[] Avatars = ["robot", "cat", "rocket", "fox", "astronaut", "dragon"];
    public static bool ValidNickname(string value) => value.Length is >= 2 and <= 24 && value.All(c => char.IsLetterOrDigit(c) || c is ' ' or '_' or '-');
    public static bool ValidEmail(string value) => value.Length <= 254 && new EmailAddressAttribute().IsValid(value);
    public static bool Accepted(string value, IEnumerable<string> answers) => answers.Any(a => Normalize(a) == Normalize(value));
    static string Normalize(string value) => value.Trim().Replace("\r\n", "\n");
    public static int Score(int correct, int count) => count == 0 ? 0 : (int)Math.Floor(100d * correct / count);
    public static (int Min, int Max) BlankRange(int level) => level switch { <= 5 => (1, 1), <= 10 => (2, 2), <= 15 => (3, 4), <= 20 => (5, 7), _ => (8, 12) };
}
