#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$(docker inspect --format '{{ index .Config.Labels "pap.disposable" }}' pap_saude_db)" == f0410 ]] || exit 1
[[ -n "${PAP_PLAYWRIGHT_MODULE:-}" ]] || { echo 'BLOCKED: set PAP_PLAYWRIGHT_MODULE to installed playwright ESM module'; exit 1; }
export DATABASE_URL='postgresql://pap_user:pap_password@127.0.0.1:5432/pap_saude_beta1_browser_test?schema=public'
export BETA_BROWSER_SESSION_FILE
BETA_BROWSER_SESSION_FILE="$(mktemp /tmp/pap-beta-browser-session.XXXXXX)"
APP_PID=''
cleanup(){
 if [[ -n "$APP_PID" ]]; then kill "$APP_PID" 2>/dev/null || true; wait "$APP_PID" 2>/dev/null || true; fi
 rm -f "$BETA_BROWSER_SESSION_FILE"
 docker exec pap_saude_db psql -X -U pap_user -d postgres -c 'DROP DATABASE IF EXISTS pap_saude_beta1_browser_test WITH (FORCE)' >/dev/null
}
trap cleanup EXIT
docker exec pap_saude_db psql -X -U pap_user -d postgres -c 'DROP DATABASE IF EXISTS pap_saude_beta1_browser_test WITH (FORCE)' >/dev/null
docker exec pap_saude_db psql -X -U pap_user -d postgres -c 'CREATE DATABASE pap_saude_beta1_browser_test' >/dev/null
npx prisma migrate deploy
npx tsx scripts/testing/beta1-browser-seed.ts
AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3100 AUTH_TRUSTED_CLIENT_IP_HEADER=x-test-client-ip \
 node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100 > /tmp/beta-browser-server.log 2>&1 &
APP_PID=$!
for attempt in $(seq 1 30); do
 if curl --silent --fail http://127.0.0.1:3100/solicitar-adesao >/dev/null; then break; fi
 sleep 1
done
node scripts/testing/beta1-browser.mjs
