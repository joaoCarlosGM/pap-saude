#!/usr/bin/env bash
set -Eeuo pipefail
# Reuse every legacy auth test and its existing, narrow fixture-cleanup helper,
# but run on a newly owned PostgreSQL instance, never the shared pap_saude_db.
ENDPOINT="${DOCKER_HOST:-$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')}"
node --input-type=module - "$ENDPOINT" <<'JS'
import { assertDockerEndpoint } from './scripts/local/policy.mjs';
assertDockerEndpoint(process.argv[2]);
JS
OWNER="p0-auth-$$-$RANDOM"
CONTAINER="pap-p0-auth-$$-$RANDOM"
CID=''
TEMP_DIR="$(mktemp -d /tmp/pap-p0-auth-XXXXXX)"
cleanup() {
  local observed label
  observed="$(docker inspect --format '{{.Id}}' "$CONTAINER" 2>/dev/null || true)"
  label="$(docker inspect --format '{{ index .Config.Labels "pap.owner" }}' "$CONTAINER" 2>/dev/null || true)"
  if [[ -n "$observed" && "$label" == "$OWNER" && ( -z "$CID" || "$CID" == "$observed" ) ]]; then
    docker rm -f "$observed" >/dev/null
  fi
  [[ "$TEMP_DIR" == /tmp/pap-p0-auth-* ]] && rm -rf -- "$TEMP_DIR"
}
trap cleanup EXIT
CID="$(docker run --rm -d --name "$CONTAINER" --label pap.disposable=p0-remediation --label "pap.owner=$OWNER" \
  -e POSTGRES_USER=release_mfa -e POSTGRES_PASSWORD=release_synthetic_only -e POSTGRES_DB=postgres \
  -p 127.0.0.1:25440:5432 postgres:16-alpine)"
READY=0
for attempt in $(seq 1 60); do
  if docker exec "$CID" pg_isready -h 127.0.0.1 -U release_mfa -d postgres >/dev/null 2>&1 && \
     [[ "$(docker exec "$CID" psql -X -U release_mfa -d postgres -Atqc 'SELECT 1' 2>/dev/null)" == 1 ]]; then
    READY=1; break
  fi
  sleep 1
done
[[ "$READY" == 1 ]] || { echo 'FAIL isolated auth PostgreSQL not ready' >&2; exit 1; }
[[ "$(docker inspect --format '{{.Id}}' "$CONTAINER")" == "$CID" ]]
[[ "$(docker inspect --format '{{ index .Config.Labels "pap.owner" }}' "$CID")" == "$OWNER" ]]
[[ "$(docker exec "$CID" psql -X -U release_mfa -d postgres -Atqc "SELECT count(*) FROM pg_database WHERE datname='pap_saude_f02b_test'")" == 0 ]]
node --input-type=module - "$CONTAINER" "$TEMP_DIR/auth.sh" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
let source = readFileSync('scripts/test-auth-session.sh', 'utf8');
const replacements = [
  ['DB_CONTAINER="pap_saude_db"', `DB_CONTAINER="${process.argv[2]}"`],
  ['DB_USER="pap_user"', 'DB_USER="release_mfa"'],
  ['TEST_URL="postgresql://pap_user:pap_password@localhost:5432/pap_saude_f02b_test?schema=public"',
   'TEST_URL="postgresql://release_mfa:release_synthetic_only@127.0.0.1:25440/pap_saude_f02b_test?schema=public"'],
];
for (const [before, after] of replacements) {
  if (source.split(before).length !== 2) throw new Error('LEGACY_HARNESS_CONTRACT_CHANGED');
  source = source.replace(before, after);
}
// All test invocations, exact DB-name assertions and the existing cleanup-helper
// allowlist remain byte-for-byte unchanged. Never widen their accepted DB names.
writeFileSync(process.argv[3], source, { mode: 0o700 });
JS
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 RESEND_API_KEY=''
export NEXT_TELEMETRY_DISABLED=1
npm run test:auth:crypto
npm run test:auth:mfa-crypto
bash "$TEMP_DIR/auth.sh"
printf '%s\n' 'PASS full auth regression in owned isolated PostgreSQL; legacy fixture audit cleanup is not an append-only proof'
