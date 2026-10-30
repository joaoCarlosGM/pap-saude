import {execFileSync,spawnSync} from 'node:child_process';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {assertDockerEndpoint} from '../../scripts/local/policy.mjs';
const root=process.cwd(),dir=mkdtempSync(join(tmpdir(),'pap-unified-seed-')),owner=randomUUID(),password=randomBytes(24).toString('hex');
let cid;
function docker(args,input){return execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
assertDockerEndpoint(process.env.DOCKER_HOST||JSON.parse(docker(['context','inspect']))[0].Endpoints.docker.Host);
const env={...process.env,NODE_ENV:'development',DATABASE_URL:`postgresql://pap_unified:${password}@127.0.0.1:15436/pap_p0_unified_rc?schema=public`,PAP_LOCAL_PROFILE:'p0-unified-rc',PAP_LOCAL_DEMO:'1',PAP_EMAIL_PROVIDER:'local-demo',PAP_EMAIL_EXTERNAL_ENABLED:'0',PAP_PUBLIC_URL:'http://127.0.0.1:3600',AUTH_ALLOWED_ORIGINS:'http://127.0.0.1:3600',MFA_SECRET_ENCRYPTION_KEY:randomBytes(32).toString('base64url'),MFA_SECRET_ENCRYPTION_KEY_ID:'unified-seed-disposable',RESEND_API_KEY:'',AUTH_TRUSTED_CLIENT_IP_HEADER:'',TSX_TSCONFIG_PATH:resolve('tsconfig.json')};
function run(label,args,cwd=root){const r=spawnSync(process.execPath,args,{cwd,env,encoding:'utf8'});writeFileSync(join(dir,label+'.log'),(r.stdout||'')+(r.stderr||''),{mode:0o600});assert.equal(r.status,0,`${label}: see private ${dir}/${label}.log`);}
try{
 cid=execFileSync('docker',['run','--rm','-d','--name',`pap-unified-seed-${owner}`,'--label','pap.disposable=unified-seed','--label',`pap.owner=${owner}`,'--tmpfs','/var/lib/postgresql/data:rw,size=536870912','-e','POSTGRES_USER=pap_unified','-e','POSTGRES_PASSWORD','-e','POSTGRES_DB=pap_p0_unified_rc','-p','127.0.0.1:15436:5432','postgres:16-alpine'],{env:{...process.env,POSTGRES_PASSWORD:password},encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 let ready=false;for(let i=0;i<40;i++){try{if(docker(['exec',cid,'psql','-h','127.0.0.1','-U','pap_unified','-d','pap_p0_unified_rc','-Atqc','SELECT 1'])==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'Owned PostgreSQL ready');
 const sql=(s,database='pap_p0_unified_rc')=>{assert.ok(['pap_p0_unified_rc','pap_p0_unified_restore'].includes(database));return docker(['exec','-i',cid,'psql','-X','-v','ON_ERROR_STOP=1','-U','pap_unified','-d',database,'-At'],s);};
 sql("COMMENT ON DATABASE pap_p0_unified_rc IS 'pap-local-p0-unified-rc';");
 run('migrate',[resolve('node_modules/prisma/build/index.js'),'migrate','deploy']);
 mkdirSync(join(dir,'.local/pap-p0-unified-rc'),{recursive:true,mode:0o700});
 run('first-seed',['--import',resolve('node_modules/tsx/dist/loader.mjs'),resolve('scripts/local/seed-unified.ts')],dir);
 const fingerprint=(database='pap_p0_unified_rc')=>sql('SELECT md5(string_agg(id || email,\',\' ORDER BY id)) FROM users; SELECT count(*) FROM patients; SELECT count(*) FROM encounters; SELECT count(*) FROM mfa_factors; SELECT count(*) FROM clinical_provenance_events;',database);
 const before=fingerprint(),credentials=readFileSync(join(dir,'.local/pap-p0-unified-rc/seed-accounts.json'));
 assert.equal(sql('SELECT count(*) FROM users;'),'7');assert.equal(sql('SELECT count(*) FROM patients;'),'3');assert.equal(sql('SELECT count(*) FROM mfa_factors;'),'0');
 run('repeat-seed',['--import',resolve('node_modules/tsx/dist/loader.mjs'),resolve('scripts/local/seed-unified.ts')],dir);
 assert.equal(fingerprint(),before);assert.deepEqual(readFileSync(join(dir,'.local/pap-p0-unified-rc/seed-accounts.json')),credentials);
 const backup=execFileSync('docker',['exec',cid,'pg_dump','-U','pap_unified','-d','pap_p0_unified_rc','-Fc'],{stdio:['ignore','pipe','pipe']});
 sql('CREATE DATABASE pap_p0_unified_restore;');
 execFileSync('docker',['exec','-i',cid,'pg_restore','-U','pap_unified','-d','pap_p0_unified_restore','--exit-on-error','--single-transaction'],{input:backup,stdio:['pipe','pipe','pipe']});
 assert.equal(fingerprint('pap_p0_unified_restore'),before);
 const expectedMigrations=readdirSync(resolve(root,'prisma/migrations')).filter(n=>/^\d/.test(n)).length;assert.equal(expectedMigrations,36);assert.equal(sql('SELECT count(*) FROM _prisma_migrations;','pap_p0_unified_restore'),String(expectedMigrations));
 writeFileSync(join(dir,'backup-restore-evidence.json'),JSON.stringify({status:'PASS',dumpSha256:createHash('sha256').update(backup).digest('hex'),migrations:expectedMigrations,users:7,patients:3,encounters:3,mfaFactors:0})+'\n',{mode:0o600});
 console.log(`PASS synthetic backup/restore (new throwaway database only)`);
 console.log(`PASS synthetic seed and idempotent replay; private evidence ${dir}`);
}finally{
 if(cid){const c=JSON.parse(docker(['inspect',cid]))[0];if(c.Config.Labels['pap.owner']!==owner||c.Config.Labels['pap.disposable']!=='unified-seed')throw Error('Ownership changed');docker(['rm','-f',cid]);}
}
