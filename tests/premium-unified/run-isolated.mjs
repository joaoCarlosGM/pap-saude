import {execFileSync,spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,writeFileSync,cpSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertDockerEndpoint} from '../../scripts/local/policy.mjs';
const groups={
 browser:[],
 auth:[],
 dashboard:['tests/p0-full/operational-data.test.ts'],
 security:['tests/p0-full/security.test.ts','tests/p0-full/pending.test.ts','tests/p0-full/demo-boundaries.test.ts'],
 clinical:['tests/p0-remediation/clinical-finalization-race.integration.test.ts','tests/release/clinical-error-privacy.test.ts','tests/release/p0-meows-operational-state.test.ts'],
 iam:['tests/mission04-b/governance.test.ts'],
};
const selected=process.argv[2];if(process.argv.length!==3||!Object.hasOwn(groups,selected))throw Error('Choose an explicit isolated test group');
const dbName=selected==='clinical'?'pap_release_clinical_backend_test':selected==='iam'?'pap_saude_m04_b_test':'pap_p0_full_tests';
const dir=mkdtempSync(join(tmpdir(),'pap-unified-tests-')),owner=randomUUID(),name=`pap-unified-tests-${owner}`;
const password=randomBytes(24).toString('hex');let cid;
function docker(args,input){return execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
assertDockerEndpoint(process.env.DOCKER_HOST||JSON.parse(docker(['context','inspect']))[0].Endpoints.docker.Host);
const log=(label,args,env)=>{const r=spawnSync(args[0],args.slice(1),{env,encoding:'utf8'});writeFileSync(join(dir,label+'.log'),(r.stdout||'')+(r.stderr||''),{mode:0o600});if(r.status!==0)throw Error(`${label} FAIL (private log ${dir}/${label}.log)`);};
try{
 cid=execFileSync('docker',['run','--rm','-d','--name',name,'--label','pap.disposable=unified-premium','--label',`pap.owner=${owner}`,'--tmpfs','/var/lib/postgresql/data:rw,size=536870912','-e','POSTGRES_USER=pap_user','-e','POSTGRES_PASSWORD','-e',`POSTGRES_DB=${dbName}`,'-p','127.0.0.1::5432','postgres:16-alpine'],{env:{...process.env,POSTGRES_PASSWORD:password},encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 let ready=false;for(let i=0;i<40;i++){try{if(docker(['exec',cid,'psql','-h','127.0.0.1','-U','pap_user','-d',dbName,'-Atqc','SELECT 1'])==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Owned PostgreSQL not ready');
 const port=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',cid]))['5432/tcp'][0].HostPort;
 const env={...process.env,DATABASE_URL:`postgresql://pap_user:${password}@127.0.0.1:${port}/${dbName}?schema=public`,MFA_SECRET_ENCRYPTION_KEY:randomBytes(32).toString('base64'),MFA_SECRET_ENCRYPTION_KEY_ID:'unified-disposable',AUTH_ALLOWED_ORIGINS:'http://127.0.0.1:3110',PAP_PUBLIC_URL:'http://127.0.0.1:3110',PAP_EMAIL_PROVIDER:'disabled',PAP_EMAIL_EXTERNAL_ENABLED:'0',RESEND_API_KEY:'',AUTH_TRUSTED_CLIENT_IP_HEADER:''};
 log('migrate',['node_modules/.bin/prisma','migrate','deploy'],env);
 if(selected==='auth'){
   let script=readFileSync('scripts/test-auth-session.sh','utf8').replace('DB_CONTAINER="pap_saude_db"',`DB_CONTAINER="${cid}"`).replace('TEST_URL="postgresql://pap_user:pap_password@localhost:5432/pap_saude_f02b_test?schema=public"',`TEST_URL="postgresql://pap_user:${password}@127.0.0.1:${port}/pap_saude_f02b_test?schema=public"`);
   const file=join(dir,'auth-owned.sh');writeFileSync(file,script,{mode:0o700});
   log('auth-crypto',['node_modules/.bin/tsx','--test','tests/auth/crypto-core.test.ts','tests/auth/mfa-secret-encryption.test.ts'],env);
   log(selected,['bash',file],env);
 }else if(selected==='browser'){
   cpSync('public','.next/standalone/public',{recursive:true});cpSync('.next/static','.next/standalone/.next/static',{recursive:true});
   const browserEnv={...env,NODE_ENV:'development',PAP_UNIFIED_ARTIFACTS:join(dir,'browser'),PAP_UNIFIED_SCREENSHOTS:process.env.PAP_UNIFIED_SCREENSHOTS||join(dir,'screenshots')};mkdirSync(browserEnv.PAP_UNIFIED_ARTIFACTS,{recursive:true});
   log(selected,['node_modules/.bin/playwright','test','--config','tests/premium-unified/playwright.config.ts',...(process.env.PAP_UNIFIED_TEST_GREP?['--grep',process.env.PAP_UNIFIED_TEST_GREP]:[])],browserEnv);
 }else log(selected,['node_modules/.bin/tsx','--test','--test-concurrency=1',...groups[selected]],env);
 console.log(`PASS ${selected}; private evidence ${dir}`);
}finally{
 if(cid){const info=JSON.parse(docker(['inspect',cid]))[0];if(info.Config.Labels['pap.owner']!==owner||info.Config.Labels['pap.disposable']!=='unified-premium')throw Error('Cleanup ownership mismatch');docker(['rm','-f',cid]);}
}
