import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: [
    "browser.spec.ts",
    "account-security.spec.ts",
    "login-navigation.spec.ts",
  ],
  workers: 1,
  timeout: 120000,
  expect: { timeout: 30000 },
  reporter: "./safe-reporter.ts",
  outputDir: "../../.test-audit/first-access-browser",
  use: {
    // Derived B/C/E configs also use this trusted-proxy test server. First-access
    // browser-fixtures replaces this default with a distinct client per test.
    extraHTTPHeaders: { "x-pap-test-client-ip": "2001:db8::1" },
    baseURL: "http://127.0.0.1:3110",
    trace: "off",
    video: "off",
    screenshot: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    // Explicit trusted-proxy simulation for this disposable test server only.
    // Production must have its reverse proxy overwrite the configured header.
    env: { AUTH_TRUSTED_CLIENT_IP_HEADER: "x-pap-test-client-ip" },
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
