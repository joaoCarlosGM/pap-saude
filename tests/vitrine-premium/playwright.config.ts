import {defineConfig} from '@playwright/test'
export default defineConfig({
 testDir:'.',testMatch:'integrated.spec.ts',workers:1,fullyParallel:false,timeout:180000,
 reporter:process.env.PAP_PREMIUM_BROWSER_DEBUG==='1'?'json':'../first-access/safe-reporter.ts',outputDir:'/tmp/premium-p0-evidence/browser-private',
 use:{viewport:{width:1440,height:960},baseURL:'http://127.0.0.1:3500',headless:true,trace:'off',screenshot:'off',video:'off',launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}},
 webServer:{cwd:process.cwd(),command:'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3500',url:'http://127.0.0.1:3500/login',reuseExistingServer:false,timeout:180000,
 env:{PAP_FIRST_ACCESS_E2E:'1',DATABASE_URL:process.env.PAP_PREMIUM_RUNTIME_URL||process.env.DATABASE_URL!,PAP_EMAIL_PROVIDER:'disabled',PAP_EMAIL_EXTERNAL_ENABLED:'0',PAP_LOCAL_DEMO:'1',RESEND_API_KEY:'',AUTH_ALLOWED_ORIGINS:'http://127.0.0.1:3110,http://127.0.0.1:3500',NEXT_TELEMETRY_DISABLED:'1'}},
})
