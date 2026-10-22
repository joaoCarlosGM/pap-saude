#!/usr/bin/env bash
set -Eeuo pipefail
DB_NAME=pap_saude_m04_b_test
[[ "$(docker inspect --format '{{ index .Config.Labels "pap.disposable" }}' pap_saude_db)" == f0410 ]] || { echo 'BLOCKED: disposable database required'; exit 1; }
cleanup(){ docker exec pap_saude_db psql -X -U pap_user -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)" >/dev/null; }
trap cleanup EXIT
cleanup
docker exec pap_saude_db psql -X -U pap_user -d postgres -c "CREATE DATABASE ${DB_NAME}"
export DATABASE_URL="postgresql://pap_user:pap_password@127.0.0.1:5432/${DB_NAME}?schema=public"
export AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3110 PAP_PUBLIC_URL=http://127.0.0.1:3110
export PAP_EMAIL_PROVIDER=disabled RESEND_API_KEY='' PAP_EMAIL_FROM=''
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export MFA_SECRET_ENCRYPTION_KEY_ID=mission04-b-test
npx prisma migrate deploy
npx prisma migrate deploy
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
npx tsx --test tests/mission04-b/*.test.ts
if [[ "${1:-}" == --browser ]]; then
  export PAP_FIRST_ACCESS_E2E=1
  shift
  npx playwright test --config tests/mission04-b/playwright.config.ts "$@"
fi
