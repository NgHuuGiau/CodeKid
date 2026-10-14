using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CodeKid.Api;

public static class AuthEndpoints
{
    public static void MapAuth(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").RequireRateLimiting("auth");
        auth.AddEndpointFilter<RequestValidationFilter>();
        auth.MapPost("/register", async (RegisterRequest r, UserManager<AppUser> users, MailService mail, AppDb db, IConfiguration config) =>
        {
            if (!Rules.ValidEmail(r.Email) || !Rules.ValidNickname(r.Nickname) || r.AgeBand is not ("9-12" or "13-16") || r.Password.Length is < 10 or > 128)
                return Results.BadRequest(new { message = "Kiểm tra email, biệt danh (2–24 ký tự), độ tuổi và mật khẩu (10–128 ký tự)." });
            if (r.AgeBand == "9-12" && !r.GuardianConsent) return Results.BadRequest(new { message = "Cần phụ huynh đồng ý và dùng email phụ huynh để xác minh." });
            if (!mail.Available) return Results.Problem("Chưa cấu hình email xác minh. Vui lòng liên hệ quản trị viên.", statusCode: 503);
            var user = new AppUser { UserName = r.Email.Trim().ToLowerInvariant(), Email = r.Email.Trim(), Profile = new StudentProfile { Nickname = r.Nickname.Trim(), AgeBand = r.AgeBand, GuardianConsent = r.GuardianConsent } };
            var created = await users.CreateAsync(user, r.Password);
            if (!created.Succeeded) return Results.BadRequest(new { message = "Không thể đăng ký. Email có thể đã được sử dụng hoặc mật khẩu chưa đủ mạnh (chữ hoa, chữ thường và số)." });
            await users.AddToRoleAsync(user, "Student");
            try { await SendVerify(user, users, mail, config); }
            catch (Exception e) when (e is System.Net.Mail.SmtpException or InvalidOperationException) { return Results.Problem("Tài khoản đã tạo, nhưng email chưa gửi được. Dùng nút gửi lại xác minh.", statusCode: 503); }
            return Results.Ok(new { message = "Đã tạo tài khoản. Mở email để xác minh trước khi đăng nhập.", requiresVerification = true });
        });
        auth.MapPost("/login", async (LoginRequest r, UserManager<AppUser> users, SignInManager<AppUser> signIn, AppDb db) =>
        {
            if (r.Email.Length > 254 || r.Password.Length > 128) return Results.BadRequest(new { message = "Thông tin đăng nhập không hợp lệ." });
            var user = await users.FindByEmailAsync(r.Email.Trim());
            if (user is null) return Results.Json(new { message = "Email hoặc mật khẩu chưa đúng." }, statusCode: 401);
            var result = await signIn.PasswordSignInAsync(user, r.Password, false, true);
            if (!result.Succeeded) return Results.Json(new { message = result.IsLockedOut ? "Tạm khóa đăng nhập. Hãy thử lại sau 5 phút." : "Email hoặc mật khẩu chưa đúng, hoặc email chưa được xác minh." }, statusCode: 401);
            await db.Entry(user).Reference(x => x.Profile).LoadAsync();
            return Results.Ok(await UserDto(user, users));
        });
        auth.MapPost("/logout", async (SignInManager<AppUser> signIn) => { await signIn.SignOutAsync(); return Results.NoContent(); }).RequireAuthorization();
        auth.MapGet("/me", async (System.Security.Claims.ClaimsPrincipal principal, UserManager<AppUser> users, AppDb db) =>
        {
            var user = await db.Users.Include(x => x.Profile).SingleAsync(x => x.Id == CurrentUser.Id(principal));
            return Results.Ok(await UserDto(user, users));
        }).RequireAuthorization().AddEndpointFilter<RequestValidationFilter>();
        auth.MapPost("/verify", async (ResetRequest r, UserManager<AppUser> users) =>
        {
            var user = await users.FindByEmailAsync(r.Email);
            if (user is null || !(await users.ConfirmEmailAsync(user, r.Token)).Succeeded) return Results.BadRequest(new { message = "Liên kết xác minh không hợp lệ hoặc đã hết hạn." });
            return Results.Ok(new { message = "Đã xác minh email. Bạn có thể đăng nhập." });
        });
        auth.MapPost("/resend", async (LoginRequest r, UserManager<AppUser> users, MailService mail, IConfiguration config) =>
        {
            if (!Rules.ValidEmail(r.Email)) return Results.BadRequest(new { message = "Email không hợp lệ." });
            if (!mail.Available) return Results.Problem("Chưa cấu hình email.", statusCode: 503);
            var user = await users.FindByEmailAsync(r.Email);
            if (user is not null && !user.EmailConfirmed) await SendVerify(user, users, mail, config);
            return Results.Ok(new { message = "Nếu tài khoản cần xác minh, email đã được gửi." });
        });
        auth.MapPost("/forgot", async (LoginRequest r, UserManager<AppUser> users, MailService mail, IConfiguration config) =>
        {
            if (!Rules.ValidEmail(r.Email)) return Results.BadRequest(new { message = "Email không hợp lệ." });
            if (!mail.Available) return Results.Problem("Chưa cấu hình email.", statusCode: 503);
            var user = await users.FindByEmailAsync(r.Email);
            if (user is not null && user.EmailConfirmed)
            {
                var token = await users.GeneratePasswordResetTokenAsync(user);
                var url = config["PublicUrl"]!.TrimEnd('/') + "/reset?email=" + Uri.EscapeDataString(r.Email) + "&token=" + Uri.EscapeDataString(token);
                await mail.Send(r.Email, "CodeKid: đặt lại mật khẩu", $"Mở liên kết sau để đặt lại mật khẩu: {url}\nNếu bạn không yêu cầu, bỏ qua email này.");
            }
            return Results.Ok(new { message = "Nếu tài khoản tồn tại và đã xác minh, bạn sẽ nhận email đặt lại mật khẩu." });
        });
        auth.MapPost("/reset", async (ResetRequest r, UserManager<AppUser> users) =>
        {
            if (r.Password.Length is < 10 or > 128) return Results.BadRequest(new { message = "Mật khẩu cần 10–128 ký tự." });
            var user = await users.FindByEmailAsync(r.Email);
            if (user is null || !(await users.ResetPasswordAsync(user, r.Token, r.Password)).Succeeded) return Results.BadRequest(new { message = "Liên kết đã hết hạn hoặc mật khẩu chưa đủ mạnh." });
            return Results.Ok(new { message = "Đã đổi mật khẩu. Hãy đăng nhập lại." });
        });
        app.MapPut("/api/profile", async (ProfileRequest r, System.Security.Claims.ClaimsPrincipal user, AppDb db) =>
        {
            if (!Rules.ValidNickname(r.Nickname) || !Rules.Avatars.Contains(r.Avatar)) return Results.BadRequest(new { message = "Biệt danh hoặc avatar không hợp lệ." });
            var p = await db.StudentProfiles.SingleAsync(x => x.UserId == CurrentUser.Id(user));
            p.Nickname = r.Nickname.Trim(); p.Avatar = r.Avatar; p.LeaderboardOptIn = r.LeaderboardOptIn;
            await db.SaveChangesAsync(); return Results.Ok(new { message = "Đã lưu hồ sơ." });
        }).RequireAuthorization().AddEndpointFilter<RequestValidationFilter>();
        app.MapPost("/api/profile/password", async (PasswordRequest r, System.Security.Claims.ClaimsPrincipal principal, UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            if (r.NewPassword.Length is < 10 or > 128) return Results.BadRequest(new { message = "Mật khẩu cần 10–128 ký tự." });
            var user = await users.GetUserAsync(principal);
            var result = await users.ChangePasswordAsync(user!, r.CurrentPassword, r.NewPassword);
            if (!result.Succeeded) return Results.BadRequest(new { message = "Mật khẩu hiện tại chưa đúng hoặc mật khẩu mới chưa đủ mạnh." });
            await signIn.RefreshSignInAsync(user!); return Results.Ok(new { message = "Đã thay đổi mật khẩu." });
        }).RequireAuthorization().AddEndpointFilter<RequestValidationFilter>();
    }
    static async Task SendVerify(AppUser user, UserManager<AppUser> users, MailService mail, IConfiguration config)
    {
        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        var url = config["PublicUrl"]!.TrimEnd('/') + "/verify?email=" + Uri.EscapeDataString(user.Email!) + "&token=" + Uri.EscapeDataString(token);
        await mail.Send(user.Email!, "CodeKid: xác minh tài khoản", $"Phụ huynh: việc mở liên kết xác nhận bạn đồng ý cho học sinh 9–12 tuổi dùng CodeKid. Học sinh 13–16 tuổi có thể dùng email của mình.\nMở liên kết: {url}\nChúng tôi chỉ lưu biệt danh, nhóm tuổi và kết quả học tập; không công khai email.");
    }
    static async Task<object> UserDto(AppUser user, UserManager<AppUser> users) => new { user.Id, user.Email, user.Profile.Nickname, user.Profile.Avatar, user.Profile.AgeBand, user.Profile.LeaderboardOptIn, user.Profile.Xp, level = user.Profile.Xp / 100 + 1, roles = await users.GetRolesAsync(user) };
}
