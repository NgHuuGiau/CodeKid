using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodeKid.Api;

public static class ManageUsersEndpoints
{
    public static void MapManageUsers(this RouteGroupBuilder staff)
    {
        staff.MapGet("/users", async (AppDb db, UserManager<AppUser> users) =>
        {
            var data = new List<object>();
            foreach (var u in await db.Users.Include(x => x.Profile).OrderBy(x => x.Email).Take(500).ToListAsync()) data.Add(new { u.Id, u.Email, u.Profile.Nickname, u.Profile.Xp, u.EmailConfirmed, locked = u.LockoutEnd > DateTimeOffset.UtcNow, roles = await users.GetRolesAsync(u) });
            return Results.Ok(data);
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapPut("/users/{id}/role", async (string id, RoleRequest r, ClaimsPrincipal principal, UserManager<AppUser> users, SignInManager<AppUser> signIn, AppDb db) =>
        {
            if (r.Role is not ("Student" or "Teacher" or "Admin")) return ManageRules.Invalid();
            if (id == CurrentUser.Id(principal)) return ManageRules.Invalid("Không tự thay đổi vai trò của mình.");
            var user = await users.FindByIdAsync(id); if (user is null) return Results.NotFound();
            var roles = await users.GetRolesAsync(user);
            if (roles.Contains("Admin") && r.Role != "Admin" && (await users.GetUsersInRoleAsync("Admin")).Count <= 1) return ManageRules.Invalid("Cần giữ ít nhất một quản trị viên.");
            if (roles.Contains("Teacher") && r.Role != "Teacher" && (await db.Courses.AnyAsync(x => x.TeacherId == id) || await db.Classes.AnyAsync(x => x.TeacherId == id))) return ManageRules.Invalid("Chuyển khóa học và lớp cho giáo viên khác trước khi đổi vai trò.");
            await users.RemoveFromRolesAsync(user, roles); await users.AddToRoleAsync(user, r.Role); await users.UpdateSecurityStampAsync(user);
            return Results.Ok(new { message = "Đã đổi vai trò. Người dùng cần đăng nhập lại." });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapPut("/users/{id}/lock", async (string id, bool locked, ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            if (id == CurrentUser.Id(principal)) return ManageRules.Invalid("Không tự khóa tài khoản.");
            var user = await users.FindByIdAsync(id); if (user is null) return Results.NotFound();
            if (await users.IsInRoleAsync(user, "Admin") && locked) return ManageRules.Invalid("Không khóa quản trị viên; đổi vai trò trước.");
            await users.SetLockoutEndDateAsync(user, locked ? DateTimeOffset.UtcNow.AddYears(100) : null);
            await users.UpdateSecurityStampAsync(user); return Results.Ok(new { message = "Đã cập nhật trạng thái tài khoản." });
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapGet("/classes", async (ClaimsPrincipal user, AppDb db) => Results.Ok(await db.Classes.Where(x => user.IsInRole("Admin") || x.TeacherId == CurrentUser.Id(user)).Select(x => new { x.Id, x.Name, x.TeacherId, students = x.Enrollments.Select(e => new { id = e.StudentId, e.Student.Profile.Nickname, e.Student.Profile.Xp, completed = db.StudentProgress.Count(p => p.UserId == e.StudentId && p.Challenge), attempts = db.StudentAttempts.Count(a => a.UserId == e.StudentId) }) }).ToListAsync()));
        staff.MapPut("/classes/{id:int}", async (int id, ClassRequest r, ClaimsPrincipal user, AppDb db, UserManager<AppUser> users) =>
        {
            if (!ManageRules.Text(r.Name, 100)) return ManageRules.Invalid();
            var owner = user.IsInRole("Admin") ? r.TeacherId : CurrentUser.Id(user);
            var teacher = owner is null ? null : await users.FindByIdAsync(owner);
            if (teacher is null || !await users.IsInRoleAsync(teacher, "Teacher")) return ManageRules.Invalid("Chọn giáo viên phụ trách.");
            var x = id == 0 ? new ClassRoom() : await db.Classes.FindAsync(id); if (x is null) return Results.NotFound();
            if (id != 0 && !user.IsInRole("Admin") && x.TeacherId != CurrentUser.Id(user)) return Results.Forbid();
            x.Name = r.Name; x.TeacherId = owner!; if (id == 0) db.Add(x); await db.SaveChangesAsync(); return Results.Ok(new { x.Id });
        });
        staff.MapPost("/classes/{id:int}/enroll", async (int id, EnrollmentRequest r, AppDb db, UserManager<AppUser> users) =>
        {
            if (!await db.Classes.AnyAsync(x => x.Id == id)) return Results.NotFound();
            var student = await users.FindByIdAsync(r.StudentId);
            if (student is null || !await users.IsInRoleAsync(student, "Student")) return ManageRules.Invalid("Chọn tài khoản học sinh.");
            if (!await db.ClassEnrollments.AnyAsync(x => x.ClassId == id && x.StudentId == r.StudentId)) { db.Add(new ClassEnrollment { ClassId = id, StudentId = r.StudentId }); await db.SaveChangesAsync(); }
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));
        staff.MapDelete("/classes/{id:int}/students/{studentId}", async (int id, string studentId, AppDb db) =>
        {
            var x = await db.ClassEnrollments.FirstOrDefaultAsync(x => x.ClassId == id && x.StudentId == studentId);
            if (x is null) return Results.NotFound(); db.Remove(x); await db.SaveChangesAsync(); return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));
    }
}
