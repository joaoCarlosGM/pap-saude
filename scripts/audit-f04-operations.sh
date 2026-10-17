#!/usr/bin/env bash
set -Eeuo pipefail
printf '\n=== F04.7-9: INTEGRATED AUDIT ===\n'
npm run guard:sql-injection
npx prisma validate
npm run test:f04:db-integrity
npm run test:f04:operations
npm run test:f04:audit-idor
npm run test:f04:access-trust
npm run test:f04:role-adversarial
npm run test:f04:role-governance
npm run test:f04:admin-core
npm run test:f03:clinical-api-ui
npx tsc --noEmit
npx eslint \
  src/server/admin/operations-scope.service.ts \
  src/server/admin/operations-metrics.service.ts \
  src/server/admin/operations-monitoring.service.ts \
  src/server/admin/operations-integrations.service.ts \
  src/app/api/admin/operations \
  src/components/admin/OperationsAdminClient.tsx \
  src/components/admin/AdminSidebar.tsx \
  'src/app/(admin)/admin/monitoramento/page.tsx' \
  'src/app/(admin)/admin/metricas/page.tsx' \
  'src/app/(admin)/admin/integracoes/page.tsx' \
  tests/admin/f04-operations.integration.test.ts
npm run lint
npm run build
git diff --check
printf '\nF04.7-9 OPERATIONS AUDIT: PASS\n'
