#!/usr/bin/env bash
set -Eeuo pipefail
WEB_IMAGE="${1:-pap-saude:mission}"
MIGRATOR_IMAGE="${2:-pap-saude-migrator:mission}"
NET="pap-f0410-web-net-$$-$RANDOM"
PG="pap-f0410-web-pg-$$-$RANDOM"
WEB="pap-f0410-web-$$-$RANDOM"
cleanup() {
 docker rm -f "$WEB" "$PG" >/dev/null 2>&1 || true
 docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$NET" >/dev/null
docker run --rm -d --name "$PG" --network "$NET" -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=synthetic_only -e POSTGRES_DB=postgres postgres:16-alpine >/dev/null
READY=0
for attempt in $(seq 1 60); do
 if docker exec "$PG" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then READY=1; break; fi
 sleep 1
done
[[ "$READY" == 1 ]] || { echo "FAIL final PostgreSQL TCP server not ready" >&2; exit 1; }
docker exec "$PG" psql -X -U postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE pap_migrator LOGIN PASSWORD 'synthetic_only';"
docker exec "$PG" psql -X -U postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE pap_f0410_web OWNER pap_migrator;'
# Prisma deploy runs as a non-superuser database owner, never the runtime role.
docker run --rm --network "$NET" -e "DATABASE_URL=postgresql://pap_migrator:synthetic_only@$PG:5432/pap_f0410_web" "$MIGRATOR_IMAGE"
docker exec -i "$PG" psql -X -U postgres -d pap_f0410_web -v ON_ERROR_STOP=1 -v runtime_role=pap_runtime -v migrator_role=pap_migrator < scripts/db/f04-role-separation.sql
docker exec "$PG" psql -X -U postgres -d pap_f0410_web -v ON_ERROR_STOP=1 -c "ALTER ROLE pap_runtime LOGIN PASSWORD 'synthetic_runtime_only';"
docker run --rm -d --name "$WEB" --network "$NET" \
 -e "DATABASE_URL=postgresql://pap_runtime:synthetic_runtime_only@$PG:5432/pap_f0410_web" \
 -e AUTH_ALLOWED_ORIGINS=http://synthetic.invalid \
 -e AUTH_TRUSTED_CLIENT_IP_HEADER=x-test-client-ip "$WEB_IMAGE" >/dev/null
test "$(docker exec "$WEB" id -u)" != 0
for attempt in $(seq 1 60); do
 if docker exec "$WEB" node -e 'fetch("http://127.0.0.1:3000/api/health").then(async r=>{if(r.status!==200||(await r.json()).status!=="ok")process.exit(1)}).catch(()=>process.exit(1))' >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$WEB" node <<'JS'
const assert = require('node:assert/strict');
(async()=>{
 let r=await fetch('http://127.0.0.1:3000/api/health');
 assert.equal(r.status,200); assert.deepEqual(await r.json(),{status:'ok'});
 r=await fetch('http://127.0.0.1:3000/login'); assert.equal(r.status,200);
 r=await fetch('http://127.0.0.1:3000/api/auth/login',{method:'POST',headers:{'content-type':'application/json',origin:'http://synthetic.invalid','x-test-client-ip':'synthetic-client'},body:JSON.stringify({email:'nonexistent@example.invalid',password:'synthetic_password_only'})});
 assert.equal(r.status,401);
 console.log('PASS runner non-root, liveness, login render and runtime DB-backed denied authentication');
})().catch(e=>{console.error(e.message);process.exitCode=1});
JS
# A denied login must have reached the database using the runtime role.
COUNT="$(docker exec "$PG" psql -X -U postgres -d pap_f0410_web -Atqc 'SELECT count(*) FROM login_attempts')"
test "$COUNT" -gt 0
echo 'PASS runtime role persisted login attempt without migration credentials'
