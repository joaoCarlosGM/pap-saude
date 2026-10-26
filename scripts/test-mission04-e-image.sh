#!/usr/bin/env bash
set -Eeuo pipefail
IMAGE="${1:?Usage: test-mission04-e-image.sh WEB_IMAGE}"
NAME="pap-m04-e-boundary-$$-$RANDOM"
CREATED=0
cleanup() { if [[ "$CREATED" == 1 ]]; then docker rm -f "$NAME" >/dev/null; fi; }
trap cleanup EXIT
# No network or database is available: missing authentication must be rejected
# before any organizational/clinical query or integration can be attempted.
docker create --name "$NAME" --network none --label pap.disposable=mission04-e \
 -e DATABASE_URL=postgresql://127.0.0.1:1/never_connect \
 -e AUTH_ALLOWED_ORIGINS=http://synthetic.invalid \
 -e PAP_EMAIL_PROVIDER=disabled "$IMAGE" >/dev/null
CREATED=1
docker start "$NAME" >/dev/null
READY=0
for attempt in $(seq 1 60); do
 if docker exec "$NAME" node -e 'fetch("http://127.0.0.1:3000/api/health").then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then READY=1; break; fi
 sleep 1
done
[[ "$READY" == 1 ]] || { echo 'FAIL isolated production web not ready'; exit 1; }
docker exec -i "$NAME" node <<'JS'
const assert = require('node:assert/strict');
(async () => {
 const origin = 'http://127.0.0.1:3000';
 for (const path of ['/comercial', '/vitrine', '/vitrine/pacientes']) {
  const r = await fetch(origin+path, {redirect:'manual'});
  assert.equal(r.status,307); assert.equal(r.headers.get('location'),'/login');
  assert.equal((await r.text()).includes('Paciente Demo Aurora'),false);
 }
 let r = await fetch(origin+'/api/vitrine/pacientes'); assert.equal(r.status,401);
 assert.match(r.headers.get('cache-control'),/no-store/);
 r = await fetch(origin+'/api/vitrine/registro',{method:'POST',headers:{origin:'http://untrusted.invalid','content-type':'application/json'},body:'{}'});
 assert.equal(r.status,403);
 console.log('PASS production standalone: three protected pages, authenticated API and CSRF; no network/DB available');
})().catch(()=>{console.error('FAIL production showcase boundary');process.exitCode=1});
JS
