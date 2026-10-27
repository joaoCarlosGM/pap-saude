#!/usr/bin/env bash
set -Eeuo pipefail
node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {assertDockerEndpoint} from "./scripts/local/policy.mjs"; const c=JSON.parse(execFileSync("docker",["context","inspect"],{encoding:"utf8"})); assertDockerEndpoint(process.env.DOCKER_HOST || c[0].Endpoints.docker.Host);'
OWNER="p0-registration-$$-$RANDOM"
NAME="pap-p0-registration-$$-$RANDOM"
CID=''
cleanup() {
  local actual label
  actual="$(docker inspect --format '{{.Id}}' "$NAME" 2>/dev/null || true)"
  label="$(docker inspect --format '{{ index .Config.Labels "pap.owner" }}' "$NAME" 2>/dev/null || true)"
  if [[ -n "$actual" && "$label" == "$OWNER" && ( -z "$CID" || "$CID" == "$actual" ) ]]; then docker rm -f "$actual" >/dev/null; fi
}
trap cleanup EXIT
CID="$(docker run --rm -d --name "$NAME" --label pap.disposable=p0-remediation --label "pap.owner=$OWNER" --tmpfs /var/lib/postgresql/data:rw,size=536870912 -e POSTGRES_USER=registration_test -e POSTGRES_PASSWORD=synthetic_disposable_only -e POSTGRES_DB=pap_p0_registration_test -p 127.0.0.1:25443:5432 postgres:16-alpine)"
READY=0
for attempt in $(seq 1 60); do
 if docker exec "$CID" pg_isready -h 127.0.0.1 -U registration_test -d pap_p0_registration_test >/dev/null 2>&1 && [[ "$(docker exec "$CID" psql -X -U registration_test -d pap_p0_registration_test -Atqc 'SELECT 1' 2>/dev/null)" == 1 ]]; then READY=1; break; fi
 sleep 1
done
[[ "$READY" == 1 ]] || { echo 'FAIL owned disposable PostgreSQL not ready' >&2; exit 1; }
export DATABASE_URL='postgresql://registration_test:synthetic_disposable_only@127.0.0.1:25443/pap_p0_registration_test?schema=public'
export NODE_ENV=development NEXT_TELEMETRY_DISABLED=1
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 RESEND_API_KEY=''
export AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3118 PAP_PUBLIC_URL=http://127.0.0.1:3118
export MFA_SECRET_ENCRYPTION_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')" MFA_SECRET_ENCRYPTION_KEY_ID=p0-registration-disposable
node_modules/.bin/prisma generate
# Install the exact known E history first, then rehearse the incremental upgrade.
node --input-type=module <<'JS'
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const out=resolve('.test-audit/p0-registration/baseline-e');mkdirSync(out,{recursive:true});
const files=execFileSync('git',['ls-tree','-r','--name-only','HEAD','--','prisma/migrations'],{encoding:'utf8'}).trim().split('\n');
for(const name of files){const target=join(out,name);mkdirSync(resolve(target,'..'),{recursive:true});writeFileSync(target,execFileSync('git',['show',`HEAD:${name}`]));}
writeFileSync(join(out,'prisma/schema.prisma'),execFileSync('git',['show','HEAD:prisma/schema.prisma']));
writeFileSync(join(out,'prisma.config.ts'),`import { defineConfig } from "prisma/config"; export default defineConfig({schema:${JSON.stringify(join(out,'prisma/schema.prisma'))},migrations:{path:${JSON.stringify(join(out,'prisma/migrations'))}},datasource:{url:process.env.DATABASE_URL!}});\n`);
JS
node_modules/.bin/prisma migrate deploy --config .test-audit/p0-registration/baseline-e/prisma.config.ts
node_modules/.bin/tsx tests/p0-remediation/registration-upgrade-probe.ts
node_modules/.bin/prisma migrate deploy
node_modules/.bin/prisma migrate deploy
node_modules/.bin/prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
node_modules/.bin/tsx --test tests/p0-remediation/clinical-registration.integration.test.ts tests/p0-remediation/clinical-registration-client.test.ts
if [[ "${1:-}" == --browser ]]; then
 export AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3126 PAP_PUBLIC_URL=http://127.0.0.1:3126
 node_modules/.bin/playwright test --config tests/p0-remediation/registration.playwright.config.ts
fi
