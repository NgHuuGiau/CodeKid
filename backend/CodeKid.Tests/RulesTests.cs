namespace CodeKid.Api.Tests;

public class RulesTests
{
    [Fact]
    public void Score_returns_zero_without_test_cases() => Assert.Equal(0, Rules.Score(0, 0));

    [Fact]
    public void Score_floors_partial_credit() => Assert.Equal(66, Rules.Score(2, 3));

    [Fact]
    public void Score_full_marks_only_when_all_correct() => Assert.Equal(100, Rules.Score(5, 5));

    [Theory]
    [InlineData("print(1)", new[] { "print(1)" }, true)]
    [InlineData("  print(1)\r\n", new[] { "print(1)\n" }, true)]
    [InlineData("print(2)", new[] { "print(1)", "print(2)" }, true)]
    [InlineData("print(3)", new[] { "print(1)" }, false)]
    public void Accepted_compares_normalized_text(string value, string[] answers, bool expected) =>
        Assert.Equal(expected, Rules.Accepted(value, answers));

    [Theory]
    [InlineData(1, 1, 1)]
    [InlineData(5, 1, 1)]
    [InlineData(6, 2, 2)]
    [InlineData(11, 3, 4)]
    [InlineData(16, 5, 7)]
    [InlineData(21, 8, 12)]
    [InlineData(100, 8, 12)]
    public void BlankRange_matches_level_brackets(int level, int min, int max)
    {
        var range = Rules.BlankRange(level);
        Assert.Equal((min, max), range);
    }

    [Theory]
    [InlineData("bé", true)]
    [InlineData("minh_anh-01", true)]
    [InlineData("a", false)]
    [InlineData("ký tự đặc biệt!", false)]
    public void ValidNickname_enforces_length_and_charset(string value, bool expected) =>
        Assert.Equal(expected, Rules.ValidNickname(value));

    [Theory]
    [InlineData("ba@van.vn", true)]
    [InlineData("thieu-dau@", false)]
    public void ValidEmail_uses_address_rule(string value, bool expected) =>
        Assert.Equal(expected, Rules.ValidEmail(value));

    [Theory]
    [InlineData(null, "drag", false)]
    [InlineData("theory", "drag", true)]
    [InlineData("memory", "drag", false)]
    [InlineData("theory", "memory", false)]
    [InlineData("drag", "memory", true)]
    [InlineData("memory", "challenge", true)]
    [InlineData("drag", "challenge", false)]
    [InlineData(null, "unknown", false)]
    public void ModeOpen_unlocks_only_the_previous_mode(string? completed, string mode, bool expected)
    {
        var p = completed is null ? null : new StudentProgress
        {
            Theory = completed == "theory",
            Drag = completed == "drag",
            Memory = completed == "memory"
        };
        Assert.Equal(expected, LearningService.ModeOpen(p, mode));
    }
}
