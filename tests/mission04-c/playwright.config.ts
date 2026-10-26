import { defineConfig } from "@playwright/test";
import firstAccess from "../first-access/playwright.config";
export default defineConfig({
  ...firstAccess,
  testDir: ".",
  testMatch: "*.spec.ts",
  reporter: "../first-access/safe-reporter.ts",
  outputDir: "../../.test-audit/mission04-c-browser",
});
