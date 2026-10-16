#!/usr/bin/env bash
set -Eeuo pipefail
printf '\n=== F04.6 A-H FULL AUDIT ===\n'
npm run guard:sql-injection
npx prisma validate
npm run test:f04:audit-idor
npm run test:f04:admin-core
npm run test:f04:role-governance
npm run test:f04:role-adversarial
npm run test:f04:access-trust
npm run test:f03:clinical-api-ui
npx tsc --noEmit
npx eslint src/server/audit src/server/admin/admin-organizations.service.ts src/server/organizations/organization.service.ts src/server/invitations/invitation.service.ts src/app/api/admin/audit 'src/app/(admin)/admin/auditoria/page.tsx' src/components/admin/AuditAdminClient.tsx tests/admin/f04-audit-idor.integration.test.ts
npm run build
git diff --check
printf '\nF04.6 A-H AUDIT: PASS\n'
