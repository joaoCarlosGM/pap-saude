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
 const headers={'content-type':'application/json',origin:'http://synthetic.invalid','x-test-client-ip':'synthetic-client'};
 const credentials={email:'nonexistent@example.invalid',password:'synthetic_password_only'};
 r=await fetch('http://127.0.0.1:3000/api/auth/login',{method:'POST',headers,body:JSON.stringify(credentials)});
 assert.equal(r.status,400);
 assert.deepEqual(await r.json(),{error:'LOGIN_VERIFICATION_REQUIRED'});

 // Exercise the real accessible challenge, with the same trusted client and binding cookie.
 r=await fetch('http://127.0.0.1:3000/api/auth/login/verification',{method:'POST',headers,body:JSON.stringify({accessible:true})});
 assert.equal(r.status,200);
 const challenge=await r.json();
 assert.ok(typeof challenge.id==='string' && /^[\w-]{32}$/.test(challenge.id),'Expected a challenge identifier');
 const question=/^Qual é o produto de (\d{3}) por (\d{3})\? Você pode usar uma calculadora\.$/.exec(challenge.question);
 assert.ok(question,'Expected the real accessible multiplication challenge');
 const binding=r.headers.getSetCookie().find(c=>c.startsWith('pap_login_verification='));
 assert.ok(binding,'Expected a challenge binding cookie');
 assert.ok(/; HttpOnly/i.test(binding),'Expected an HttpOnly binding cookie');
 assert.ok(/; Secure/i.test(binding),'Expected a Secure binding cookie');
 const cookie=binding.split(';',1)[0];
 assert.ok(/^pap_login_verification=[\w-]{43}$/.test(cookie),'Expected a valid binding cookie');
 r=await fetch('http://127.0.0.1:3000/api/auth/login',{method:'POST',headers:{...headers,cookie},body:JSON.stringify({...credentials,verificationId:challenge.id,verificationAnswer:String(Number(question[1])*Number(question[2]))})});
 assert.equal(r.status,401);
 assert.deepEqual(await r.json(),{error:'INVALID_CREDENTIALS'});
 console.log('PASS runner non-root, liveness, login render, CAPTCHA required and verified denied authentication');
})().catch(e=>{console.error(e.message);process.exitCode=1});
JS
# The fresh database must contain exactly the CAPTCHA-verified denied login, no session.
# Read back as the same least-privilege runtime role used exclusively by the web container.
RESULT="$(docker exec -e PGPASSWORD=synthetic_runtime_only "$PG" psql -X -h 127.0.0.1 -U pap_runtime -d pap_f0410_web -v ON_ERROR_STOP=1 -Atqc "SELECT current_user, count(*), count(*) FILTER (WHERE outcome='FAILURE'), (SELECT count(*) FROM sessions) FROM login_attempts")"
test "$RESULT" = 'pap_runtime|1|1|0'
echo 'PASS runtime role persisted exactly one denied login and no session, without migration credentials'
