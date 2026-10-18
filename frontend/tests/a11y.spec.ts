import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("trang chủ kiểm tra a11y (chỉ fail critical)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2aa", "wcag21aa"]).analyze();
    console.log("a11y violations (home):", JSON.stringify(results.violations, null, 2));
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, `Critical a11y: ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
  });
  test("trang đăng nhập kiểm tra a11y (chỉ fail critical)", async ({ page }) => {
    await page.goto("/login");
    const results = await new AxeBuilder({ page }).withTags(["wcag2aa", "wcag21aa"]).analyze();
    console.log("a11y violations (login):", JSON.stringify(results.violations, null, 2));
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, `Critical a11y: ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
  });
  test("trang khóa học kiểm tra a11y (chỉ fail critical)", async ({ page }) => {
    await page.goto("/courses");
    const results = await new AxeBuilder({ page }).withTags(["wcag2aa", "wcag21aa"]).analyze();
    console.log("a11y violations (courses):", JSON.stringify(results.violations, null, 2));
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, `Critical a11y: ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
  });
});