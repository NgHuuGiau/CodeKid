import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Smoke test triển khai thật: PostgreSQL migration + seed, runner production,
// và đường mạng API -> runner. Dọn sạch container/volume của riêng project này.
const project = "codekid-smoke";
const apiUrl = "http://127.0.0.1:8080";
const env = {
  ...process.env,
  DB_PASSWORD: randomBytes(18).toString("hex"),
  RUNNER_SECRET: randomBytes(32).toString("hex"),
  ADMIN_EMAIL: "smoke@codekid.test",
  ADMIN_PASSWORD: "Smoke-Test-2026!",
  ALLOWED_HOSTS: "localhost;127.0.0.1"
};

function sh(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", code => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`))));
  });
}

function shOut(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env });
    let out = "";
    child.stdout.on("data", chunk => (out += chunk));
    child.stderr.on("data", chunk => (out += chunk));
    child.on("error", reject);
    child.on("exit", code => (code === 0 ? resolve(out) : reject(new Error(`${command} ${args.join(" ")} exited with ${code}\n${out}`))));
  });
}

function step(message) {
  console.log(`\n=== ${message}`);
}

async function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const runnerProbe = `
import json, os, urllib.request
job = {"code": "print(input() + str(int(input()) + 1))", "tests": [{"input": "a\\n1", "expected": "a2"}]}
req = urllib.request.Request("http://127.0.0.1:8091/run", data=json.dumps(job).encode(),
                             headers={"X-Runner-Secret": os.environ["RUNNER_SECRET"], "Content-Type": "application/json"})
result = json.load(urllib.request.urlopen(req, timeout=30))
assert result["results"][0]["passed"], result
print("runner /run ok")
`;

let failed = false;
const workDir = mkdtempSync(path.join(tmpdir(), "codekid-smoke-"));
try {
  step("Port 8080 phải trống");
  const busy = await fetch(`${apiUrl}/api/health`, { signal: AbortSignal.timeout(1500) }).then(() => true, () => false);
  await expect(!busy, "Có service khác đang chiếm 127.0.0.1:8080; dừng nó trước khi chạy smoke test.");

  step("docker compose up --build --wait");
  await sh("docker", ["compose", "-p", project, "up", "-d", "--build", "--wait", "--wait-timeout", "420"]);

  step("API health qua Postgres");
  let health = null;
  for (let i = 0; i < 60; i++) {
    health = await fetch(`${apiUrl}/api/health`, { signal: AbortSignal.timeout(2000) }).then(r => (r.ok ? r.json() : null), () => null);
    if (health?.status === "ok") break;
    await new Promise(r => setTimeout(r, 1000));
  }
  await expect(health?.status === "ok", "API không trả /api/health sau 60 giây.");

  step("Seed phải nằm trong PostgreSQL");
  const languages = await fetch(`${apiUrl}/api/languages`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
  const python = languages.find(l => l.slug === "python");
  await expect(python, "Không tìm thấy ngôn ngữ python trong catalog.");
  await expect(python.available && python.lessons >= 1, "Seed PostgreSQL thiếu bài học Python.");

  step("Runner production tự chấm một test thật");
  await new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", `${project}-runner-1`, "python", "-"], { env, stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", code => (code === 0 ? resolve() : reject(new Error(`runner probe exited with ${code}`))));
    child.stdin.end(runnerProbe);
  });

  step("API container phải nối được runner qua mạng nội bộ");
  const tcp = await shOut("docker", ["exec", `${project}-api-1`, "bash", "-c", "exec 3<>/dev/tcp/runner/8091 && printf 'GET /health HTTP/1.0\\r\\n\\r\\n' >&3 && cat <&3"]);
  await expect(tcp.includes('"status": "ok"'), `API không thấy runner healthy: ${tcp}`);

  console.log("\nSmoke test PostgreSQL + runner production: PASS");
} catch (error) {
  failed = true;
  console.error(`\nSmoke test FAIL: ${error.message}`);
  await sh("docker", ["compose", "-p", project, "ps"]).catch(() => {});
} finally {
  step("dọn dẹp");
  await sh("docker", ["compose", "-p", project, "down", "-v"]).catch(error => console.error(error.message));
  rmSync(workDir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
