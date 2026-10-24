import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: ["mail.spec.ts", "recovery.spec.ts"], workers: 1, retries: 0,
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3110",
    cwd: process.cwd(), url: "http://127.0.0.1:3110/login", timeout: 180000,
    reuseExistingServer: false, stdout: "ignore", stderr: "pipe",
  },
  reporter: "list", outputDir: "../../.test-audit/mission04-d/browser",
  use: { browserName: "chromium", headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
});
