#!/usr/bin/env bash
set -Eeuo pipefail
node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {assertDockerEndpoint} from "./scripts/local/policy.mjs"; const c=JSON.parse(execFileSync("docker",["context","inspect"],{encoding:"utf8"})); assertDockerEndpoint(process.env.DOCKER_HOST || c[0].Endpoints.docker.Host);'
OWNER="p0-provenance-$$-$RANDOM"
NAME="pap-p0-provenance-$$-$RANDOM"
CID=''
cleanup() {
  local rc=$? current owner
  current="$(docker inspect --format '{{.Id}}' "$NAME" 2>/dev/null || true)"
  owner="$(docker inspect --format '{{ index .Config.Labels "pap.owner" }}' "$NAME" 2>/dev/null || true)"
  if [[ -n "$current" && "$owner" == "$OWNER" && ( -z "$CID" || "$CID" == "$current" ) ]]; then docker rm -f "$current" >/dev/null; fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
CID="$(docker run --rm -d --name "$NAME" --label pap.disposable=p0-remediation --label "pap.owner=$OWNER" \
  -e POSTGRES_USER=p0_provenance -e POSTGRES_PASSWORD=synthetic_disposable_only \
  -e POSTGRES_DB=pap_p0_provenance_test -p 127.0.0.1:25444:5432 postgres:16-alpine)"
READY=0
for attempt in $(seq 1 60); do
  if docker exec "$CID" pg_isready -h 127.0.0.1 -U p0_provenance -d pap_p0_provenance_test >/dev/null 2>&1 && \
    [[ "$(docker exec "$CID" psql -X -U p0_provenance -d pap_p0_provenance_test -Atqc 'SELECT 1' 2>/dev/null)" == 1 ]]; then READY=1; break; fi
  sleep 1
done
[[ "$READY" == 1 ]] || { echo 'FAIL owned disposable PostgreSQL readiness' >&2; exit 1; }
export DATABASE_URL='postgresql://p0_provenance:synthetic_disposable_only@127.0.0.1:25444/pap_p0_provenance_test?schema=public'
export NODE_ENV=development PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 RESEND_API_KEY='' NEXT_TELEMETRY_DISABLED=1
export AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3110 PAP_PUBLIC_URL=http://127.0.0.1:3110
node_modules/.bin/prisma migrate deploy
node_modules/.bin/prisma migrate deploy
node_modules/.bin/prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
# No cleanup bypass is enabled here; both ledger immutability triggers remain ON.
node_modules/.bin/tsx --test tests/release/p0-provenance.integration.test.ts
