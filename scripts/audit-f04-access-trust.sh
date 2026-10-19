#!/usr/bin/env bash
set -Eeuo pipefail
printf '\n=== F04.5 A-H FULL GATE ===\n'
npm run guard:sql-injection
npx prisma validate
npm run test:f04:access-trust
npm run test:f04:admin-core
npm run test:f04:role-governance
npm run test:f04:role-adversarial
npx tsc --noEmit
npx eslint src/server/auth src/server/admin/admin-security.service.ts src/server/email/password-reset-email.service.ts src/app/api/auth src/app/api/admin/security src/components/admin/MySecurityClient.tsx src/components/admin/SecurityAdminClient.tsx src/components/auth/LoginSecurity.tsx src/components/auth/PasswordRecoveryClient.tsx tests/auth/f04-access-trust.integration.test.ts
npm run build
git diff --check
printf '\nF04.5 A-H AUDIT: PASS\n'
