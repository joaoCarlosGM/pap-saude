#!/usr/bin/env bash
set -Eeuo pipefail
DB_NAME=pap_saude_admin_mfa_test
[[ "$(docker inspect --format '{{ index .Config.Labels "pap.disposable" }}' pap_saude_db)" == f0410 ]] || exit 1
cleanup(){ docker exec pap_saude_db psql -X -U pap_user -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)" >/dev/null; }
trap cleanup EXIT
cleanup
docker exec pap_saude_db psql -X -U pap_user -d postgres -c "CREATE DATABASE ${DB_NAME}"
export DATABASE_URL="postgresql://pap_user:pap_password@127.0.0.1:5432/${DB_NAME}?schema=public"
export AUTH_ALLOWED_ORIGINS=http://localhost:3000
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export MFA_SECRET_ENCRYPTION_KEY_ID=admin-mfa-test
npx prisma migrate deploy
npx tsx --test tests/admin/admin-mfa.integration.test.ts
