import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";

// E2E trên bản production thật: dựng compose (Postgres + runner + SMTP qua Mailpit),
// đăng ký tài khoản 9-12, xác minh email qua SMTP thật, rồi học và nộp bài bằng sandbox thật.
// Chạy: node scripts/e2e-production.mjs   (tuỳ chọn BROWSER_CHANNEL=msedge khi chạy cục bộ)
const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "frontend", "package.json"));
const { chromium } = require("@playwright/test");

const project = "codekid-e2e";
const base = "http://127.0.0.1:8080";
const mailpit = "http://127.0.0.1:8025";
const email = `e2e-${Date.now()}@example.com`;
const password = "CodeKid2026!";
const env = {
  ...process.env,
  DB_PASSWORD: randomBytes(18).toString("hex"),
  RUNNER_SECRET: randomBytes(32).toString("hex"),
  ADMIN_EMAIL: "e2e-admin@codekid.test",
  ADMIN_PASSWORD: "E2e-Admin-2026!",
  ALLOWED_HOSTS: "localhost;127.0.0.1"
};

const compose = ["compose", "-p", project, "-f", "compose.yml", "-f", "compose.e2e.yml"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function sh(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { cwd: root, env, stdio: options.stdio ?? "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`docker ${args.join(" ")} exited with ${code}`))));
  });
}

async function healthy() {
  for (let i = 0; i < 90; i++) {
    const ok = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok, () => false);
    if (ok) return true;
    await wait(1000);
  }
  return false;
}

async function verificationLink(to) {
  for (let i = 0; i < 40; i++) {
    const search = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`).then((r) => r.json()).catch(() => null);
    const id = search?.messages?.[0]?.ID;
    if (id) {
      const msg = await fetch(`${mailpit}/api/v1/message/${id}`).then((r) => r.json());
      const match = `${msg.HTML ?? ""}\n${msg.Text ?? ""}`.match(/https?:\/\/[^\s"'<>]+\/verify[^\s"'<>]*/);
      if (match) return match[0].replace(/&amp;/g, "&");
    }
    await wait(1000);
  }
  throw new Error("Không tìm thấy liên kết xác minh trong Mailpit sau 40 giây");
}

let browser;
let page;
let failed = false;
try {
  const busy = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1500) }).then(() => true, () => false);
  if (busy) throw new Error("Cổng 127.0.0.1:8080 đang bị chiếm; dừng service khác trước khi chạy E2E.");

  console.log("\n=== docker compose up --build --wait");
  await sh([...compose, "up", "-d", "--build", "--wait", "--wait-timeout", "420"]);
  if (!(await healthy())) throw new Error("API không trả /api/health sau 90 giây.");

  console.log("\n=== Trình duyệt: đăng ký → xác minh SMTP → học → nộp bài");
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  const context = await browser.newContext({ baseURL: base });
  page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    // Bỏ qua 401/403 khi trang dò phiên đăng nhập lúc còn ẩn danh.
    if (/Failed to load resource/.test(text) && /(401|403)/.test(text)) return;
    errors.push(text);
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/register");
  await page.getByLabel("Nhóm tuổi").selectOption("9-12");
  await page.getByLabel("Biệt danh", { exact: true }).fill("Bé E2E");
  await page.getByLabel("Email của phụ huynh", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tạo tài khoản miễn phí" }).click();
  await page.getByRole("status").waitFor({ state: "visible", timeout: 20000 });

  await page.goto(await verificationLink(email));
  await page.getByRole("button", { name: "Xác minh email" }).click();
  await page.getByRole("status").waitFor({ state: "visible", timeout: 20000 });
  console.log("   xác minh:", (await page.getByRole("status").innerText()).replace(/\s+/g, " ").trim());

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(/dashboard/, { timeout: 20000 });

  await page.goto("/courses/1");
  await page.getByRole("link", { name: "Bắt đầu", exact: true }).first().click();
  await page.getByLabel("Python", { exact: true }).check();
  await page.getByRole("button", { name: "Kiểm tra & mở thực hành" }).click();
  await page.getByRole("link", { name: "Bắt đầu kéo thả" }).click();

  const source = page.getByRole("button", { name: "Mảnh code print. Kéo thả, hoặc chọn rồi chọn ô trống." });
  const target = page.getByRole("button", { name: "Ô trống 1", exact: true });
  const a = await source.boundingBox(), b = await target.boundingBox();
  assert.ok(a && b, "Không thấy mảnh code print hoặc ô trống 1");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 8, a.y + a.height / 2, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  await page.getByText(/\+10 XP đã được lưu/).waitFor({ state: "visible", timeout: 20000 });

  await page.getByRole("link", { name: "Tiếp theo", exact: true }).click();
  await page.getByRole("textbox", { name: "Ô trống 1" }).fill("print");
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  await page.getByText("Bạn đã chinh phục hoạt động này!").waitFor({ state: "visible", timeout: 20000 });

  await page.getByRole("link", { name: "Tiếp theo", exact: true }).click();
  await page.locator(".monaco-editor").waitFor({ state: "visible", timeout: 20000 });
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type('print("Xin chào CodeKid")');
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByText(/\+80 XP đã được lưu/).waitFor({ state: "visible", timeout: 90000 });

  assert.deepEqual(errors, [], `Lỗi console trên trang: ${errors.join(" | ")}`);
  console.log("\nE2E production: PASS (đăng ký → xác minh SMTP → học bài 1 → nộp bài +80 XP)");
} catch (error) {
  failed = true;
  console.error(`\nE2E production FAIL: ${error?.message ?? error}`);
  if (page) {
    console.error(`   URL hiện tại: ${page.url()}`);
    const alert = await page.locator('[role="alert"], .form-error').first().innerText().catch(() => "");
    if (alert) console.error(`   Lỗi trên trang: ${alert.replace(/\s+/g, " ").trim()}`);
    const body = await page.locator("body").innerText().catch(() => "");
    console.error(`   Nội dung trang: ${body.replace(/\s+/g, " ").slice(0, 300)}`);
    await page.screenshot({ path: path.join(root, "artifacts", "e2e-production-fail.png"), fullPage: true }).catch(() => {});
  }
  await sh([...compose, "logs", "--no-color", "--tail", "40", "api"]).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  console.log("\n=== dọn dẹp");
  await sh([...compose, "down", "-v"]).catch((e) => console.error(e.message));
}
process.exit(failed ? 1 : 0);
