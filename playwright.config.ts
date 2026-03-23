import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "apps/web/tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "off",
    video: "off"
  },
  webServer: {
    command: "npm run dev",
    cwd: "apps/web",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
