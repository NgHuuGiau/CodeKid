import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
const artifacts = path.resolve(import.meta.dirname, "../../artifacts");
async function login(page: Page, email = "student@codekid.local") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("CodeKid2026!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(
    email.startsWith("student") ? /dashboard/ : /manage/,
  );
}
test("landing, mobile layout, dark theme and keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Thế giới Code",
  );
  await expect(
    page.getByRole("heading", { name: "Python", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("12 bài học", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(artifacts, "home-desktop.png"),
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Đến nội dung chính" }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Mở menu" })).toBeVisible();
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Khóa học" })
    .click();
  await expect(page).toHaveURL(/courses$/);
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: path.join(artifacts, "home-mobile.png"),
    fullPage: true,
  });
  const toggle = page.getByRole("button", { name: /Bật chế độ (tối|sáng)/ });
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: path.join(artifacts, "home-dark.png"),
    fullPage: true,
  });
});
test("real pointer drag rejects wrong answer, snaps back and fixes correct token; typing saves XP", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Tiếp tục học" }).click();
  await page.getByLabel("Python", { exact: true }).check();
  await page.getByRole("button", { name: "Kiểm tra & mở thực hành" }).click();
  await page.getByRole("link", { name: "Bắt đầu kéo thả" }).click();
  await expect(
    page.getByRole("heading", { name: "Kéo các mảnh code vào đúng ô trống." }),
  ).toBeVisible();
  async function drag(value: string) {
    const source = page.getByRole("button", {
      name: `Mảnh code ${value}. Kéo thả, hoặc chọn rồi chọn ô trống.`,
    });
    const target = page.getByRole("button", { name: "Ô trống 1", exact: true });
    const a = await source.boundingBox(),
      b = await target.boundingBox();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
    await page.mouse.down();
    await page.mouse.move(a!.x + a!.width / 2 + 8, a!.y + a!.height / 2, {
      steps: 4,
    });
    await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, {
      steps: 15,
    });
    await page.mouse.up();
  }
  await drag("input");
  await expect(page.getByText(/Mảnh code đã quay về ngân hàng/)).toBeVisible();
  await expect(page.locator(".drop-blank")).toHaveClass(/miss/);
  await expect(
    page.getByRole("button", { name: "Ô trống 1", exact: true }),
  ).toBeEnabled();
  await drag("print");
  await expect(
    page.getByRole("button", { name: "Ô trống 1, đã điền print" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  await expect(page.getByText(/\+10 XP đã được lưu/)).toBeVisible();
  await expect(page.locator(".reward-xp")).toContainText("+10 XP");
  await expect(page.locator(".reward-burst i").first()).toBeAttached();
  await page.screenshot({
    path: path.join(artifacts, "drag-success.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Tiếp theo", exact: true }).click();
  await expect(page.getByText("NGÂN HÀNG MẢNH CODE")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Ô trống 1" }).fill("input");
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  await expect(page.getByText("Thêm một chút nữa nhé!")).toBeVisible();
  await page.getByRole("button", { name: "Gợi ý mức 1" }).click();
  await expect(
    page.getByText("print() là lệnh giúp hiện chữ lên màn hình."),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Ô trống 1" }).fill("print");
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  await expect(
    page.getByText("Bạn đã chinh phục hoạt động này!"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tiếp theo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lời chào đầu tiên" }),
  ).toBeVisible();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await expect
    .poll(() =>
      page.locator(".monaco-editor .view-lines").evaluate((el) =>
        Number.parseFloat(getComputedStyle(el).fontSize),
      ),
    )
    .toBeGreaterThanOrEqual(18);
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("print('draft-check')");
  await expect
    .poll(() =>
      page.evaluate((prefix) => {
        const key = Object.keys(localStorage).find((item) =>
          item.startsWith(prefix),
        );
        return key ? localStorage.getItem(key) : null;
      }, "codekid:draft:"),
    )
    .toBe("print('draft-check')");
  await page.reload();
  await expect(page.locator(".monaco-editor .view-lines")).toContainText(
    "draft-check",
  );
  await page.getByRole("button", { name: "Chạy thử", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sandbox chưa sẵn sàng" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(artifacts, "code-workspace.png"),
    fullPage: true,
  });
});
test("accessible alternative, touch-enabled sensors and replay never awards duplicate XP", async ({
  page,
}) => {
  await login(page);
  await page.goto("/courses/1");
  await page
    .getByRole("link", { name: "Bắt đầu", exact: true })
    .first()
    .click();
  await page
    .getByRole("navigation", { name: "Các bước học" })
    .getByRole("link", { name: /Kéo thả/ })
    .click();
  await page
    .getByRole("button", {
      name: "Mảnh code print. Kéo thả, hoặc chọn rồi chọn ô trống.",
    })
    .focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ô trống 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Ô trống 1, đã điền print" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  await expect(
    page.getByText("Đã hoàn thành trước đó, XP giữ nguyên", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".reward-burst")).toHaveCount(0);
  await page.getByRole("button", { name: "Làm lại" }).click();
  await expect(
    page.getByRole("button", { name: "Ô trống 1", exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.locator(".game-card > p:not([role='status'])").evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).fontSize),
    ),
  ).toBeGreaterThanOrEqual(15);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: path.join(artifacts, "practice-mobile.png"),
    fullPage: true,
  });
});
test("lesson videos are actual playable MP4s with captions", async ({
  page,
}) => {
  await login(page);
  await page.goto("/courses/1");
  await page
    .getByRole("link", { name: "Bắt đầu", exact: true })
    .first()
    .click();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await video.evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    await v.play();
  });
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  expect(
    await video.evaluate((el) => (el as HTMLVideoElement).duration),
  ).toBeGreaterThan(29);
  await expect(video.locator("track")).toHaveAttribute("src", /\.vtt$/);
  await page.screenshot({
    path: path.join(artifacts, "lesson-video.png"),
    fullPage: true,
  });
});
test("student profile, persisted theme, badges and saved dashboard history", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  await page.getByLabel("Biệt danh", { exact: true }).fill("Kiki Bàn Phím");
  await page.getByRole("button", { name: "Chọn avatar cat" }).click();
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByText("Đã lưu hồ sơ.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Biệt danh", { exact: true })).toHaveValue(
    "Kiki Bàn Phím",
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Xin chào, Kiki Bàn Phím!" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Làm quen Python", exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(artifacts, "dashboard.png"),
    fullPage: true,
  });
});
test("teacher/admin screens and student route protection", async ({ page }) => {
  await login(page, "teacher@codekid.local");
  await expect(
    page.getByRole("heading", { name: "Cùng học sinh khám phá" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lớp & tiến độ học sinh" }).click();
  await expect(
    page.getByRole("heading", { name: "Lớp Python khám phá" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Người dùng & vai trò" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: path.join(artifacts, "teacher.png"),
    fullPage: true,
  });
  await login(page, "admin@codekid.local");
  await page.getByRole("button", { name: "Người dùng & vai trò" }).click();
  await expect(
    page.getByRole("cell", { name: /student@codekid.local/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bài giảng & video" }).click();
  await page.getByRole("button", { name: "Chỉnh sửa" }).first().click();
  await expect(page.getByLabel("Mục tiêu", { exact: true })).not.toHaveValue(
    "",
  );
  await page.screenshot({
    path: path.join(artifacts, "admin.png"),
    fullPage: true,
  });
  await login(page);
  await page.goto("/manage");
  await expect(
    page.getByText("Khu vực này dành cho giáo viên và quản trị viên."),
  ).toBeVisible();
});
test("API outage is shown with retry; forms validate passwords and consent", async ({
  page,
}) => {
  await page.route("**/api/courses", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "API chưa sẵn sàng" }),
    }),
  );
  await page.goto("/courses");
  await expect(page.getByText("API chưa sẵn sàng")).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  await page.unroute("**/api/courses");
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(
    page.getByRole("heading", { name: "Phiêu lưu cùng Python" }),
  ).toBeVisible();
  await page.goto("/register");
  await page.getByLabel("Nhóm tuổi").selectOption("9-12");
  await expect(
    page.getByLabel("Email của phụ huynh", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByLabel("Biệt danh", { exact: true }).fill("Test Kid");
  await page
    .getByLabel("Email của phụ huynh", { exact: true })
    .fill("parent@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StrongPassword2026");
  await page
    .getByLabel("Nhập lại mật khẩu", { exact: true })
    .fill("AnotherPassword2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tạo tài khoản miễn phí" }).click();
  await expect(page.getByText("Hai mật khẩu chưa khớp.")).toBeVisible();
});

test("touch drag works on a simulated mobile device", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:5199",
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await login(page);
    await page.goto("/lessons/1/practice/drag");
    const source = page.getByRole("button", {
      name: "Mảnh code print. Kéo thả, hoặc chọn rồi chọn ô trống.",
    });
    await source.scrollIntoViewIfNeeded();
    const a = await source.boundingBox();
    const b = await page
      .getByRole("button", { name: "Ô trống 1", exact: true })
      .boundingBox();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    const session = await context.newCDPSession(page);
    const start = { x: a!.x + a!.width / 2, y: a!.y + a!.height / 2 };
    const end = { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, radiusX: 5, radiusY: 5, force: 1 }],
    });
    for (let i = 1; i <= 12; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * i) / 12,
            y: start.y + ((end.y - start.y) * i) / 12,
            radiusX: 5,
            radiusY: 5,
            force: 1,
          },
        ],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(
      page.getByRole("button", { name: "Ô trống 1, đã điền print" }),
    ).toBeDisabled();
  } finally {
    await context.close();
  }
});
