import {defineConfig} from "@playwright/test";
import {existsSync} from "node:fs";
export default defineConfig({
 testDir:process.cwd()+"/tests/premium-unified",testMatch:"operational.spec.ts",workers:1,fullyParallel:false,timeout:90000,
 reporter:[["list"]],outputDir:process.env.PAP_UNIFIED_ARTIFACTS||"/tmp/pap-unified-browser-output",
 use:{baseURL:"http://127.0.0.1:3610",viewport:{width:1440,height:1000},trace:"off",video:"off",screenshot:"off",extraHTTPHeaders:{"x-pap-unified-client":"192.0.2.36"},launchOptions:{executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined}},
 webServer:{command:"node .next/standalone/server.js",url:"http://127.0.0.1:3610/api/health",reuseExistingServer:false,timeout:30000,cwd:process.cwd(),env:{NODE_ENV:"production",PORT:"3610",HOSTNAME:"127.0.0.1",PAP_FIRST_ACCESS_E2E:"",AUTH_ALLOWED_ORIGINS:"http://127.0.0.1:3610",PAP_PUBLIC_URL:"http://127.0.0.1:3610",AUTH_TRUSTED_CLIENT_IP_HEADER:"x-pap-unified-client",PAP_EMAIL_PROVIDER:"disabled",PAP_EMAIL_EXTERNAL_ENABLED:"0",RESEND_API_KEY:""}},
});
