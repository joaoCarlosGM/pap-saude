#!/usr/bin/env bash
# Own disposable resources only. Never adopts pap_saude_db or either operator lab.
set -Eeuo pipefail
PAP_TEST_DOCKER_ENDPOINT="${DOCKER_HOST:-$(docker context inspect --format '{{(index .Endpoints "docker").Host}}')}" node --input-type=module -e 'import {assertDockerEndpoint} from "./scripts/local/policy.mjs"; assertDockerEndpoint(process.env.PAP_TEST_DOCKER_ENDPOINT)'
[[ "${1:-}" == '' || "${1:-}" == '--server' ]] || exit 2
OWNER="p0-full-$RANDOM-$$"
NAME="pap-$OWNER"
CID=""
DB_PASSWORD="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')"
cleanup(){
  if [[ -n "$CID" ]] && [[ "$(docker inspect -f '{{index .Config.Labels "pap.owner"}}' "$CID" 2>/dev/null)" == "$OWNER" ]] && [[ "$(docker inspect -f '{{index .Config.Labels "pap.disposable"}}' "$CID" 2>/dev/null)" == p0-full ]]; then
    docker rm -f "$CID" >/dev/null
  fi
}
trap cleanup EXIT
export POSTGRES_PASSWORD="$DB_PASSWORD"
CID="$(docker run --rm -d --name "$NAME" --label pap.disposable=p0-full --label "pap.owner=$OWNER" --tmpfs /var/lib/postgresql/data:rw,size=536870912 -e POSTGRES_USER=pap_test -e POSTGRES_PASSWORD -e POSTGRES_DB=pap_p0_full_tests -p 127.0.0.1::5432 postgres:16-alpine)"
unset POSTGRES_PASSWORD
[[ "$(docker inspect -f '{{.Id}}' "$CID")" == "$CID" ]]
# Docker allocates a random host port; NetworkSettings holds the concrete binding.
PORT="$(docker inspect -f '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$CID")"
[[ "$PORT" =~ ^[0-9]+$ && "$PORT" != 15432 && "$PORT" != 15433 && "$PORT" != 5432 ]]
[[ "$(docker inspect -f '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostIp}}' "$CID")" == 127.0.0.1 ]]
for attempt in $(seq 1 40); do
  if docker exec "$CID" psql -X -h 127.0.0.1 -U pap_test -d pap_p0_full_tests -Atqc 'SELECT 1' 2>/dev/null | grep -qx 1; then break; fi
  sleep 1
done
export DATABASE_URL="postgresql://pap_test:$DB_PASSWORD@127.0.0.1:$PORT/pap_p0_full_tests?schema=public"
export AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3110 PAP_PUBLIC_URL=http://127.0.0.1:3110
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 RESEND_API_KEY='' RESEND_WEBHOOK_SECRET=''
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')" MFA_SECRET_ENCRYPTION_KEY_ID=p0-full-disposable
unset NODE_ENV AUTH_TRUSTED_CLIENT_IP_HEADER PAP_LOCAL_PROFILE PAP_LOCAL_DEMO PAP_LOCAL_MAIL_TEST_DIR PAP_LOCAL_DEMO_TEST
node_modules/.bin/prisma migrate deploy
for suite in security operational-data pending demo-boundaries reset-http; do
  node_modules/.bin/tsx --test "tests/p0-full/$suite.test.ts"
done
if [[ "${1:-}" != '--server' ]]; then npm run test:p0:full:ui; fi
