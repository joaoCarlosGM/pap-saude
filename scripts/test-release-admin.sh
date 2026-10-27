#!/usr/bin/env bash
set -Eeuo pipefail
# This harness owns its container/DB. It never adopts pap_saude_db or operator data.
ENDPOINT="${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}"
node --input-type=module -e 'import {assertDockerEndpoint} from "./scripts/local/policy.mjs"; assertDockerEndpoint(process.argv[1]);' "$ENDPOINT"
RUN_NONCE="$(node -e 'process.stdout.write(require("node:crypto").randomUUID().replaceAll("-",""))')"
DB_CONTAINER="pap_p0_admin_f_${RUN_NONCE}"
CONTAINER_ID=''
verify_container() {
  node --input-type=module - "$CONTAINER_ID" "$RUN_NONCE" <<'JS'
import { execFileSync } from "node:child_process";
const [id, run] = process.argv.slice(2);
const item = JSON.parse(execFileSync("docker", ["inspect", id], { encoding: "utf8" }))[0];
const labels = item.Config?.Labels;
const binding = item.HostConfig?.PortBindings?.["5432/tcp"];
if (item.Id !== id || item.Name !== `/pap_p0_admin_f_${run}` ||
    labels?.["pap.disposable"] !== "f0410" || labels?.["pap.mission"] !== "p0-admin-f-20261026" ||
    labels?.["pap.owner"] !== "codex-p0-admin-f" || labels?.["pap.run"] !== run ||
    binding?.length !== 1 || binding[0].HostIp !== "127.0.0.1" || binding[0].HostPort !== "25442" ||
    item.Mounts.some(m => m.Type === "volume" || m.Type === "bind") ||
    !item.HostConfig?.Tmpfs?.["/var/lib/postgresql/data"])
  throw new Error("OWNED_DISPOSABLE_ADMIN_CONTAINER_REQUIRED");
JS
}
cleanup() {
  if [[ -n "$CONTAINER_ID" ]]; then
    verify_container || { echo 'BLOCKED: cleanup ownership verification failed'; return 1; }
    docker rm -f "$CONTAINER_ID" >/dev/null
  fi
}
trap cleanup EXIT
CONTAINER_ID="$(docker create --name "$DB_CONTAINER" \
  --label pap.disposable=f0410 --label pap.mission=p0-admin-f-20261026 \
  --label pap.owner=codex-p0-admin-f --label "pap.run=$RUN_NONCE" \
  --tmpfs /var/lib/postgresql/data:rw,size=512m \
  -e POSTGRES_USER=pap_user -e POSTGRES_PASSWORD=pap_password -e POSTGRES_DB=postgres \
  -p 127.0.0.1:25442:5432 postgres:16-alpine)"
verify_container
docker start "$CONTAINER_ID" >/dev/null
READY=0
for _ in $(seq 1 150); do
  if docker exec "$CONTAINER_ID" pg_isready -h 127.0.0.1 -p 5432 -U pap_user -d postgres >/dev/null 2>&1; then READY=1; break; fi
  sleep 0.2
done
[[ "$READY" == 1 ]] || { echo 'BLOCKED: final PostgreSQL TCP server unavailable'; exit 1; }
verify_container
printf 'Owned disposable admin container: %s; port 127.0.0.1:25442\n' "$CONTAINER_ID"
export NODE_ENV=development
export AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3110,http://127.0.0.1:3117 PAP_PUBLIC_URL=http://127.0.0.1:3110
export PAP_EMAIL_PROVIDER=disabled PAP_LOCAL_DEMO=0 PAP_LOCAL_DEMO_TEST=0
export PAP_EMAIL_EXTERNAL_ENABLED=0 RESEND_API_KEY='' RESEND_WEBHOOK_SECRET='' PAP_EMAIL_FROM=''
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export MFA_SECRET_ENCRYPTION_KEY_ID=p0-admin-f-disposable
for DB_NAME in pap_saude_release_admin_test pap_saude_release_governance_test; do
  [[ "$(docker exec "$CONTAINER_ID" psql -X -U pap_user -d postgres -Atqc "SELECT count(*) FROM pg_database WHERE datname='$DB_NAME'")" == 0 ]] || { echo 'BLOCKED: unexpected pre-existing test database'; exit 1; }
  docker exec "$CONTAINER_ID" psql -X -v ON_ERROR_STOP=1 -U pap_user -d postgres -c "CREATE DATABASE ${DB_NAME}"
  export DATABASE_URL="postgresql://pap_user:pap_password@127.0.0.1:25442/${DB_NAME}?schema=public"
  npx --no-install prisma generate
  npx --no-install prisma migrate deploy
  npx --no-install prisma migrate deploy
  npx --no-install prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
  if [[ "$DB_NAME" == pap_saude_release_admin_test ]]; then
    npx --no-install tsx --test tests/release/admin-invitation-authority.integration.test.ts
  else
    npx --no-install tsx --test tests/release/governance-metrics.integration.test.ts
    if [[ "${1:-}" == --browser ]]; then
      export PAP_FIRST_ACCESS_E2E=1
      npx --no-install playwright test --config tests/release/governance.playwright.config.ts
    fi
  fi
  verify_container
  docker exec "$CONTAINER_ID" psql -X -v ON_ERROR_STOP=1 -U pap_user -d postgres -c "DROP DATABASE ${DB_NAME} WITH (FORCE)" >/dev/null
done
