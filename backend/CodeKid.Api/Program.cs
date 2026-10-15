using CodeKid.Api;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.StaticFiles;
using System.Threading.RateLimiting;

var syncPythonSeed = args.Contains("--sync-python-seed", StringComparer.Ordinal);
var builder = WebApplication.CreateBuilder(args.Where(x => x != "--sync-python-seed").ToArray());
builder.Services.AddDbContext<AppDb>(o =>
{
    var cs = builder.Configuration.GetConnectionString("Default")!;
    if (builder.Configuration["DatabaseProvider"] == "Postgres") o.UseNpgsql(cs); else o.UseSqlite(cs);
});
builder.Services.AddIdentity<AppUser, IdentityRole>(o =>
{
    o.User.RequireUniqueEmail = true; o.Password.RequiredLength = 10; o.Password.RequireNonAlphanumeric = false;
    o.SignIn.RequireConfirmedEmail = true; o.Lockout.MaxFailedAccessAttempts = 5; o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
}).AddEntityFrameworkStores<AppDb>().AddDefaultTokenProviders();
builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name = "CodeKid.Session"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing") ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.ExpireTimeSpan = TimeSpan.FromHours(8); o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.Configure<SecurityStampValidatorOptions>(o => o.ValidationInterval = TimeSpan.Zero);
builder.Services.AddAuthorization();
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "keys"))).SetApplicationName("CodeKid.Academy");
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.Name = "CodeKid.Csrf"; o.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddScoped<LearningService>(); builder.Services.AddScoped<MailService>();
builder.Services.AddHttpClient<RunnerClient>(c => c.Timeout = TimeSpan.FromSeconds(50));
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 180, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    foreach (var (name, count) in new[] { ("auth", 30), ("code", 10) }) o.AddPolicy(name, c => RateLimitPartition.GetFixedWindowLimiter(c.User.Identity?.IsAuthenticated == true ? CurrentUser.Id(c.User) : c.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = count, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.OnRejected = async (c, ct) => { c.HttpContext.Response.Headers.RetryAfter = "60"; await c.HttpContext.Response.WriteAsJsonAsync(new { message = "Bạn thao tác hơi nhanh. Hãy thử lại sau một phút." }, ct); };
});
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 100_000);
var app = builder.Build();
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing") && string.IsNullOrWhiteSpace(builder.Configuration["Mail:Host"]))
    app.Logger.LogWarning("Chưa cấu hình SMTP (Mail:Host): đăng ký, xác minh email và đặt lại mật khẩu sẽ trả 503. Đặt Mail__Host/Mail__Port/Mail__User/Mail__Password/Mail__From trước khi mở cho người dùng thật.");
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    if (context.Request.Path.StartsWithSegments("/api")) context.Response.Headers.CacheControl = "no-store";
    try { await next(); }
    catch (DbUpdateException e) { app.Logger.LogWarning(e, "Không thể lưu thay đổi"); if (!context.Response.HasStarted) { context.Response.StatusCode = 409; await context.Response.WriteAsJsonAsync(new { message = "Dữ liệu bị trùng hoặc đang được sử dụng. Tải lại và thử lại." }); } }
    catch (Exception e) when (e is not OperationCanceledException) { app.Logger.LogError(e, "Lỗi xử lý yêu cầu"); if (!context.Response.HasStarted) { context.Response.StatusCode = 500; await context.Response.WriteAsJsonAsync(new { message = "Không thể xử lý yêu cầu lúc này. Tiến độ đã lưu vẫn được giữ." }); } }
});
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing")) app.UseHsts();
app.UseAuthentication(); app.UseAuthorization(); app.UseRateLimiter();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") && context.Request.Method is not ("GET" or "HEAD" or "OPTIONS"))
    {
        try { await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context); }
        catch (AntiforgeryValidationException) { context.Response.StatusCode = 400; await context.Response.WriteAsJsonAsync(new { message = "Phiên bảo mật đã hết hạn. Tải lại trang rồi thử lại." }); return; }
        if (context.Request.ContentLength > 0)
        {
            context.Request.EnableBuffering();
            try
            {
                using var body = await System.Text.Json.JsonDocument.ParseAsync(context.Request.Body, new System.Text.Json.JsonDocumentOptions { MaxDepth = 24 });
                if (HasInvalidNull(body.RootElement)) { context.Response.StatusCode = 400; await context.Response.WriteAsJsonAsync(new { message = "Các trường bắt buộc không được để null." }); return; }
            }
            catch (System.Text.Json.JsonException) { context.Response.StatusCode = 400; await context.Response.WriteAsJsonAsync(new { message = "Nội dung yêu cầu không hợp lệ." }); return; }
            finally { context.Request.Body.Position = 0; }
        }
    }
    await next();
});
app.MapGet("/api/csrf", (HttpContext c, IAntiforgery antiforgery) => Results.Ok(new { token = antiforgery.GetAndStoreTokens(c).RequestToken }));
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapAuth(); app.MapLearning(); app.MapManage();
var staticContentTypes = new FileExtensionContentTypeProvider();
staticContentTypes.Mappings[".vtt"] = "text/vtt";
app.UseDefaultFiles(); app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = staticContentTypes });
app.MapFallbackToFile("index.html");
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    if (syncPythonSeed && app.Configuration["DatabaseProvider"] == "Postgres")
        throw new InvalidOperationException("Đồng bộ seed chỉ hỗ trợ SQLite. Với PostgreSQL, hãy sao lưu bằng pg_dump và cập nhật nội dung qua trang quản trị.");
    if (app.Configuration["DatabaseProvider"] == "Postgres") await db.Database.MigrateAsync();
    else await db.Database.EnsureCreatedAsync();
    if (syncPythonSeed)
    {
        await Seed.SyncPythonContent(db, app.Environment.ContentRootPath);
        return;
    }
    await Seed.Initialize(scope.ServiceProvider, app.Environment, app.Configuration);
}
app.Run();
static bool HasInvalidNull(System.Text.Json.JsonElement element) => element.ValueKind switch
{
    System.Text.Json.JsonValueKind.Null => true,
    System.Text.Json.JsonValueKind.Object => element.EnumerateObject().Any(p => p.Name != "teacherId" && p.Name != "TeacherId" && HasInvalidNull(p.Value)),
    System.Text.Json.JsonValueKind.Array => element.EnumerateArray().Any(HasInvalidNull),
    _ => false
};
public partial class Program { }
