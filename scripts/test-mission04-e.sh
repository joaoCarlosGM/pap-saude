#!/usr/bin/env bash
set -Eeuo pipefail
node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {assertDockerEndpoint} from "./scripts/local/policy.mjs"; const c=JSON.parse(execFileSync("docker",["context","inspect"],{encoding:"utf8"})); assertDockerEndpoint(process.env.DOCKER_HOST || c[0].Endpoints.docker.Host);'
DB_NAME=pap_saude_m04_e_test
ROLE_NAME=pap_m04_e_readonly
[[ "$(docker inspect --format '{{ index .Config.Labels "pap.disposable" }}' pap_saude_db)" == f0410 ]] || { echo 'BLOCKED: disposable PostgreSQL required'; exit 1; }
OWNER="$(docker inspect --format '{{ index .Config.Labels "pap.mission" }}' pap_saude_db)"
[[ "$OWNER" == mission04-c || ( "${GITHUB_ACTIONS:-}" == true && "$OWNER" == ci-f0410 ) ]] || { echo 'BLOCKED: database ownership not proven'; exit 1; }
for QUERY in "SELECT count(*) FROM pg_database WHERE datname='$DB_NAME'" "SELECT count(*) FROM pg_roles WHERE rolname='$ROLE_NAME'"; do
 [[ "$(docker exec pap_saude_db psql -X -U pap_user -d postgres -Atqc "$QUERY")" == 0 ]] || { echo 'BLOCKED: test resource already exists'; exit 1; }
done
CREATED=0; ROLE_CREATED=0
cleanup() {
 if [[ "$CREATED" == 1 ]]; then docker exec pap_saude_db psql -X -U pap_user -d postgres -c "DROP DATABASE ${DB_NAME} WITH (FORCE)" >/dev/null; fi
 if [[ "$ROLE_CREATED" == 1 ]]; then docker exec pap_saude_db psql -X -U pap_user -d postgres -c "DROP ROLE ${ROLE_NAME}" >/dev/null; fi
}
trap cleanup EXIT
docker exec pap_saude_db psql -X -U pap_user -d postgres -c "CREATE DATABASE ${DB_NAME}"
CREATED=1
export DATABASE_URL="postgresql://pap_user:pap_password@127.0.0.1:5432/${DB_NAME}?schema=public"
export NODE_ENV=development AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3110 PAP_PUBLIC_URL=http://127.0.0.1:3110
export PAP_EMAIL_PROVIDER=disabled PAP_LOCAL_DEMO=1 RESEND_API_KEY='' PAP_EMAIL_FROM=''
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export MFA_SECRET_ENCRYPTION_KEY_ID=mission04-e-test
npx prisma generate
npx prisma migrate deploy
npx prisma migrate deploy
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
npx tsx --test tests/mission04-e/*.test.ts
if [[ "${1:-}" == --browser ]]; then
 export PAP_FIRST_ACCESS_E2E=1
 RUNTIME_PASSWORD="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
 printf "CREATE ROLE %s LOGIN PASSWORD '%s';\nGRANT CONNECT ON DATABASE %s TO %s;\n" "$ROLE_NAME" "$RUNTIME_PASSWORD" "$DB_NAME" "$ROLE_NAME" | docker exec -i pap_saude_db psql -X -q -v ON_ERROR_STOP=1 -U pap_user -d postgres >/dev/null
 ROLE_CREATED=1
 docker exec -i pap_saude_db psql -X -q -v ON_ERROR_STOP=1 -U pap_user -d "$DB_NAME" <<'SQL'
GRANT USAGE ON SCHEMA public TO pap_m04_e_readonly;
GRANT SELECT ON users, sessions, roles, role_assignments, role_permissions, permissions, mfa_factors, user_notifications TO pap_m04_e_readonly;
SQL
 export PAP_E_RUNTIME_DATABASE_URL="postgresql://${ROLE_NAME}:${RUNTIME_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public"
 npx playwright test --config tests/mission04-e/playwright.config.ts
 # Existing clinical/admin guards legitimately consult scoped IAM metadata.
 # Exercise their real deny/redirect behavior separately under the owner test URL.
 export PAP_E_RUNTIME_DATABASE_URL="$DATABASE_URL" PAP_E_BOUNDARY=1
 npx playwright test --config tests/mission04-e/playwright.config.ts
fi
