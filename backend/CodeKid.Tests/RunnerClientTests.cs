using System.Net;
using Microsoft.Extensions.Configuration;

namespace CodeKid.Api.Tests;

public class RunnerClientTests
{
    sealed class StubHandler(HttpStatusCode status, string body)
        : HttpMessageHandler
    {
        public int Calls { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++;
            return Task.FromResult(new HttpResponseMessage(status)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
            });
        }
    }

    static RunnerClient Build(StubHandler handler, Dictionary<string, string?> settings) =>
        new(new HttpClient(handler), new ConfigurationBuilder().AddInMemoryCollection(settings).Build());

    static Dictionary<string, string?> Settings(string? secret) => new()
    {
        ["Runner:Secret"] = secret,
        ["Runner:Url"] = "http://runner:8091"
    };

    static string OkBody() => """{"results":[{"passed":true,"output":"hello\n","error":""}]}""";

    [Fact]
    public async Task Missing_secret_skips_the_runner_and_reports_unavailable()
    {
        var handler = new StubHandler(HttpStatusCode.OK, OkBody());
        var client = Build(handler, Settings(null));
        var result = await client.Run("print(1)", [new TestCase { Input = "", Expected = "hello" }], CancellationToken.None);
        Assert.Null(result);
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task Valid_response_is_returned()
    {
        var handler = new StubHandler(HttpStatusCode.OK, OkBody());
        var client = Build(handler, Settings("s".PadRight(40, 's')));
        var result = await client.Run("print(1)", [new TestCase { Input = "", Expected = "hello" }], CancellationToken.None);
        Assert.NotNull(result);
        Assert.True(result!.Results[0].Passed);
        Assert.Equal("hello\n", result.Results[0].Output);
    }

    [Fact]
    public async Task Result_count_mismatch_is_treated_as_unavailable()
    {
        var handler = new StubHandler(HttpStatusCode.OK, """{"results":[]}""");
        var client = Build(handler, Settings("secret"));
        var result = await client.Run("print(1)", [new TestCase { Input = "", Expected = "hello" }], CancellationToken.None);
        Assert.Null(result);
    }

    [Fact]
    public async Task Runner_error_status_is_treated_as_unavailable()
    {
        var handler = new StubHandler(HttpStatusCode.InternalServerError, "boom");
        var client = Build(handler, Settings("secret"));
        var result = await client.Run("print(1)", [new TestCase { Input = "", Expected = "hello" }], CancellationToken.None);
        Assert.Null(result);
    }

    [Fact]
    public async Task Output_over_the_sandbox_limit_is_rejected()
    {
        var oversized = new string('x', 8193);
        var handler = new StubHandler(HttpStatusCode.OK, $$"""{"results":[{"passed":true,"output":"{{oversized}}","error":""}]}""");
        var client = Build(handler, Settings("secret"));
        var result = await client.Run("print(1)", [new TestCase { Input = "", Expected = "hello" }], CancellationToken.None);
        Assert.Null(result);
    }
}
