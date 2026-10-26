import { defineConfig } from "@playwright/test";
import firstAccess from "../first-access/playwright.config";
export default defineConfig({
    ...firstAccess, testDir: ".", testMatch: process.env.PAP_E_BOUNDARY === "1" ? "boundaries.spec.ts" : "journey.spec.ts",
    reporter: "../first-access/safe-reporter.ts",
    outputDir: "../../.test-audit/mission04-e-browser",
    webServer: {
        ...firstAccess.webServer as object,
        command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3110",
        url: "http://127.0.0.1:3110/login", reuseExistingServer: false, timeout: 180000,
        env: { DATABASE_URL: process.env.PAP_E_RUNTIME_DATABASE_URL! },
    },
});
