#!/usr/bin/env bash
set -Eeuo pipefail
# Dedicated throwaway resources; never adopt an existing database or container.
node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {assertDockerEndpoint} from "./scripts/local/policy.mjs"; const c=JSON.parse(execFileSync("docker",["context","inspect"],{encoding:"utf8"})); assertDockerEndpoint(process.env.DOCKER_HOST || c[0].Endpoints.docker.Host);'
OWNER="p0-clinical-runtime-$$-$RANDOM"
NAME="pap-p0-clinical-runtime-$$-$RANDOM"
CID=''
cleanup() {
  local actual owner
  actual="$(docker inspect --format '{{.Id}}' "$NAME" 2>/dev/null || true)"
  owner="$(docker inspect --format '{{ index .Config.Labels "pap.owner" }}' "$NAME" 2>/dev/null || true)"
  if [[ -n "$actual" && "$owner" == "$OWNER" && ( -z "$CID" || "$CID" == "$actual" ) ]]; then
    docker rm -f "$actual" >/dev/null
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
CID="$(docker run --rm -d --name "$NAME" --label pap.disposable=p0-remediation --label "pap.owner=$OWNER" \
  --tmpfs /var/lib/postgresql/data:rw,size=536870912 \
  -e POSTGRES_USER=p0_integrity -e POSTGRES_PASSWORD=synthetic_disposable_only \
  -e POSTGRES_DB=pap_release_clinical_backend_test -p 127.0.0.1:25445:5432 postgres:16-alpine)"
READY=0
for attempt in $(seq 1 60); do
  if docker exec "$CID" pg_isready -h 127.0.0.1 -U p0_integrity -d pap_release_clinical_backend_test >/dev/null 2>&1 && \
     [[ "$(docker exec "$CID" psql -X -U p0_integrity -d pap_release_clinical_backend_test -Atqc 'SELECT 1' 2>/dev/null)" == 1 ]]; then READY=1; break; fi
  sleep 1
done
[[ "$READY" == 1 ]] || { echo 'FAIL owned disposable PostgreSQL readiness'; exit 1; }
export DATABASE_URL='postgresql://p0_integrity:synthetic_disposable_only@127.0.0.1:25445/pap_release_clinical_backend_test?schema=public'
export NODE_ENV=development NEXT_TELEMETRY_DISABLED=1
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 RESEND_API_KEY=''
# CI generates the schema34 client before this gate. Do not regenerate it needlessly.
node -e 'if (!require("@prisma/client").Prisma.ModelName.ClinicalRegistrationOperation) process.exit(1)'
node_modules/.bin/prisma migrate deploy
node_modules/.bin/prisma migrate deploy
node_modules/.bin/prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
for run in 1 2; do
  docker exec -i "$CID" psql -X -U p0_integrity -d pap_release_clinical_backend_test \
    -v runtime_role=pap_pzero_runtime -v migrator_role=pap_pzero_migrator < scripts/db/f04-role-separation.sql
done
docker exec -i "$CID" psql -X -U p0_integrity -d pap_release_clinical_backend_test < tests/p0-remediation/registration-runtime-acl.sql
node_modules/.bin/tsx --test tests/p0-remediation/clinical-finalization-race.integration.test.ts
node_modules/.bin/tsx --test tests/p0-remediation/registration-runtime.integration.test.ts
node_modules/.bin/tsx --test tests/release/auth-body-budget.test.ts tests/release/clinical-error-privacy.test.ts tests/release/p0-meows-operational-state.test.ts
node_modules/.bin/playwright test --config tests/release/mfa-block-ui.playwright.config.ts
