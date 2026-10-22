import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: ["browser.spec.ts", "account-security.spec.ts"],
  workers: 1,
  timeout: 120000,
  expect: { timeout: 30000 },
  reporter: "./safe-reporter.ts",
  outputDir: "../../.test-audit/first-access-browser",
  use: {
    baseURL: "http://127.0.0.1:3110",
    trace: "off",
    video: "off",
    screenshot: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3110",
    cwd: process.cwd(),
    url: "http://127.0.0.1:3110/login",
    timeout: 180000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
