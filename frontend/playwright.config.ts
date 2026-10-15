import { defineConfig } from "@playwright/test";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5199",
    browserName: "chromium",
    channel: process.env.BROWSER_CHANNEL ?? "msedge",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "dotnet bin/Debug/net10.0/CodeKid.Api.dll",
      cwd: path.join(root, "backend/CodeKid.Api"),
      url: "http://127.0.0.1:5088/api/health",
      timeout: 60000,
      env: {
        ASPNETCORE_ENVIRONMENT: "Testing",
        Urls: "http://127.0.0.1:5088",
        DatabaseProvider: "Sqlite",
        ConnectionStrings__Default: `Data Source=${path.join(root, "artifacts", `ui-${Date.now()}.db`)}`,
      },
    },
    {
      command: process.platform === "win32"
        ? "npm.cmd run dev -- --port 5199 --strictPort"
        : "npm run dev -- --port 5199 --strictPort",
      url: "http://127.0.0.1:5199",
      timeout: 60000,
      env: { CODEKID_API_URL: "http://127.0.0.1:5088" },
    },
  ],
});
