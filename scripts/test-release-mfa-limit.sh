#!/usr/bin/env bash
set -Eeuo pipefail
# This harness never reuses an existing database, container, port15432 or volume.
ENDPOINT="${DOCKER_HOST:-$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')}"
node --input-type=module - "$ENDPOINT" <<'JS'
import { assertDockerEndpoint } from './scripts/local/policy.mjs';
assertDockerEndpoint(process.argv[2]);
JS
OWNER="p0-mfa-limit-$$-$RANDOM"
CONTAINER="pap-p0-mfa-limit-$$-$RANDOM"
CID=''
cleanup() {
  # A port-bind failure may leave a partially created container. Its unique label
  # proves ownership before removal; never remove a pre-existing name collision.
  local observed label
  observed="$(docker inspect --format '{{.Id}}' "$CONTAINER" 2>/dev/null || true)"
  label="$(docker inspect --format '{{ index .Config.Labels "pap.owner" }}' "$CONTAINER" 2>/dev/null || true)"
  if [[ -n "$observed" && "$label" == "$OWNER" && ( -z "$CID" || "$observed" == "$CID" ) ]]; then
    docker rm -f "$observed" >/dev/null
  fi
}
trap cleanup EXIT
CID="$(docker run --rm -d --name "$CONTAINER" --label pap.disposable=p0-remediation --label "pap.owner=$OWNER" \
  -e POSTGRES_USER=release_mfa -e POSTGRES_PASSWORD=release_synthetic_only \
  -e POSTGRES_DB=pap_release_mfa_20261026 -p 127.0.0.1:25440:5432 postgres:16-alpine)"
READY=0
for attempt in $(seq 1 60); do
  if docker exec "$CID" pg_isready -h 127.0.0.1 -U release_mfa -d pap_release_mfa_20261026 >/dev/null 2>&1 && \
     [[ "$(docker exec "$CID" psql -X -U release_mfa -d pap_release_mfa_20261026 -Atqc 'SELECT 1' 2>/dev/null)" == 1 ]]; then
    READY=1; break
  fi
  sleep 1
done
[[ "$READY" == 1 ]] || { echo 'FAIL disposable MFA PostgreSQL not ready' >&2; exit 1; }
export DATABASE_URL='postgresql://release_mfa:release_synthetic_only@127.0.0.1:25440/pap_release_mfa_20261026?schema=public'
export NODE_ENV=development NEXT_TELEMETRY_DISABLED=1
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 RESEND_API_KEY=''
node_modules/.bin/prisma migrate deploy
node_modules/.bin/tsx --test tests/release/mfa-attempt-limit.integration.test.ts
printf '%s\n' 'PASS isolated P0 MFA attempt limits; only synthetic data and owned disposable PostgreSQL'
