import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "registration.spec.ts", workers: 1,
  timeout: 180_000, expect: { timeout: 30_000 },
  reporter: "../first-access/safe-reporter.ts",
  outputDir: "../../.test-audit/p0-registration/browser",
  use: {
    baseURL: "http://127.0.0.1:3126", trace: "off", video: "off", screenshot: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3126",
    url: "http://127.0.0.1:3126/login", timeout: 180_000,
    cwd: process.cwd(), reuseExistingServer: false, stdout: "ignore", stderr: "pipe",
  },
});
