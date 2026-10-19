#!/usr/bin/env bash
set -Eeuo pipefail
DB_NAME=pap_saude_beta1_test
TEST_URL="postgresql://pap_user:pap_password@127.0.0.1:5432/${DB_NAME}?schema=public"
[[ "$(docker inspect --format '{{ index .Config.Labels "pap.disposable" }}' pap_saude_db)" == "f0410" ]] || { echo 'BLOCKED: PostgreSQL must be explicitly disposable'; exit 1; }
cleanup(){ docker exec pap_saude_db psql -X -U pap_user -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)" >/dev/null; }
trap cleanup EXIT
cleanup
docker exec pap_saude_db psql -X -U pap_user -d postgres -c "CREATE DATABASE ${DB_NAME}"
export DATABASE_URL="$TEST_URL" AUTH_ALLOWED_ORIGINS=http://localhost:3000
export PAP_EMAIL_PROVIDER=resend RESEND_API_KEY=synthetic-test-only PAP_EMAIL_FROM=convites@synthetic.invalid PAP_PUBLIC_URL=http://localhost:3000
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export MFA_SECRET_ENCRYPTION_KEY_ID=beta1-test
npx prisma migrate deploy
npx prisma migrate deploy # idempotent replay through Prisma history
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
node --test tests/security/beta1-schema-upgrade.test.mjs
npx tsx --test tests/admin-beta/*.test.ts
