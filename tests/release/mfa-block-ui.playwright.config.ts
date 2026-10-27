import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "mfa-block-ui.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: "list",
  outputDir: "../../.test-audit/p0-mfa/browser-output",
  use: {
    baseURL: "http://127.0.0.1:3124",
    trace: "off",
    screenshot: "off",
    video: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
  },
  webServer: {
    cwd: process.cwd(),
    command: "node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3124",
    url: "http://127.0.0.1:3124/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PAP_FIRST_ACCESS_E2E: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      PAP_EMAIL_PROVIDER: "disabled",
      PAP_EMAIL_EXTERNAL_ENABLED: "0",
      RESEND_API_KEY: "",
      AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:3124",
    },
  },
});
