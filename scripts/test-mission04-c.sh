#!/usr/bin/env bash
set -Eeuo pipefail
DB_NAME=pap_saude_m04_c_test
[[ "$(docker inspect --format '{{ index .Config.Labels "pap.disposable" }}' pap_saude_db)" == f0410 ]] || { echo 'BLOCKED: disposable PostgreSQL required'; exit 1; }
OWNER="$(docker inspect --format '{{ index .Config.Labels "pap.mission" }}' pap_saude_db)"
[[ "$OWNER" == mission04-c || ( "${GITHUB_ACTIONS:-}" == true && "$OWNER" == ci-f0410 ) ]] || { echo 'BLOCKED: database ownership not proven'; exit 1; }
[[ "$(docker exec pap_saude_db psql -X -U pap_user -d postgres -Atqc "SELECT count(*) FROM pg_database WHERE datname='$DB_NAME'")" == 0 ]] || { echo 'BLOCKED: database already exists'; exit 1; }
MAIL_DIR="$(mktemp -d /tmp/pap-m04-c-mail-XXXXXX)"
CREATED=0
cleanup() {
  if [[ "$CREATED" == 1 ]]; then docker exec pap_saude_db psql -X -U pap_user -d postgres -c "DROP DATABASE ${DB_NAME} WITH (FORCE)" >/dev/null; fi
  [[ "$MAIL_DIR" == /tmp/pap-m04-c-mail-* ]] && rm -rf -- "$MAIL_DIR"
}
trap cleanup EXIT
docker exec pap_saude_db psql -X -U pap_user -d postgres -c "CREATE DATABASE ${DB_NAME}"
CREATED=1
export DATABASE_URL="postgresql://pap_user:pap_password@127.0.0.1:5432/${DB_NAME}?schema=public"
export NODE_ENV=development
export AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3110 PAP_PUBLIC_URL=http://127.0.0.1:3110
export PAP_EMAIL_PROVIDER=local-demo PAP_LOCAL_DEMO=1 PAP_LOCAL_DEMO_TEST=1 PAP_LOCAL_MAIL_TEST_DIR="$MAIL_DIR"
export RESEND_API_KEY='' PAP_EMAIL_FROM=''
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export MFA_SECRET_ENCRYPTION_KEY_ID=mission04-c-test
npx prisma generate
npx prisma migrate deploy
npx prisma migrate deploy
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
npx tsx --test tests/mission04-c/*.test.ts
if [[ "${1:-}" == --browser ]]; then
  export PAP_FIRST_ACCESS_E2E=1
  shift
  npx playwright test --config tests/mission04-c/playwright.config.ts "$@"
fi
