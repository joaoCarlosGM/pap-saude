import {execFileSync,spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertDockerEndpoint} from '../../scripts/local/policy.mjs';
import {publicBrowserDiagnostics} from '../premium-unified/browser-diagnostics.mjs';
const groups={unit:['tests/beta1/presentation.test.tsx'],integration:['tests/beta1/lms.test.ts'],browser:[]};
const selected=process.argv[2];if(process.argv.length!==3||!Object.hasOwn(groups,selected))throw Error('Choose an explicit isolated test group');
const dbName='pap_beta1_test';
const dir=mkdtempSync(join(tmpdir(),'pap-beta1-tests-')),owner=randomUUID(),name=`pap-beta1-tests-${owner}`;
const password=randomBytes(24).toString('hex');let cid;
function docker(args,input){return execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
assertDockerEndpoint(process.env.DOCKER_HOST||JSON.parse(docker(['context','inspect']))[0].Endpoints.docker.Host);
const log=(label,args,env)=>{const r=spawnSync(args[0],args.slice(1),{env,encoding:'utf8'});const output=(r.stdout||'')+(r.stderr||'');writeFileSync(join(dir,label+'.log'),output,{mode:0o600});if(r.status!==0){if(label==='browser')console.error('Sanitized browser failure:',JSON.stringify(publicBrowserDiagnostics(output)));throw Error(`${label} FAIL (private log ${dir}/${label}.log)`);}};
try{
 cid=execFileSync('docker',['run','--rm','-d','--name',name,'--label','pap.disposable=beta1-disposable','--label',`pap.owner=${owner}`,'--tmpfs','/var/lib/postgresql/data:rw,size=536870912','-e','POSTGRES_USER=pap_user','-e','POSTGRES_PASSWORD','-e',`POSTGRES_DB=${dbName}`,'-p','127.0.0.1::5432','postgres:16-alpine'],{env:{...process.env,POSTGRES_PASSWORD:password},encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 let ready=false;for(let i=0;i<40;i++){try{if(docker(['exec',cid,'psql','-h','127.0.0.1','-U','pap_user','-d',dbName,'-Atqc','SELECT 1'])==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Owned PostgreSQL not ready');
 const port=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',cid]))['5432/tcp'][0].HostPort;
 const env={...process.env,DATABASE_URL:`postgresql://pap_user:${password}@127.0.0.1:${port}/${dbName}?schema=public`,MFA_SECRET_ENCRYPTION_KEY:randomBytes(32).toString('base64'),MFA_SECRET_ENCRYPTION_KEY_ID:'unified-disposable',AUTH_ALLOWED_ORIGINS:'http://127.0.0.1:3110,http://127.0.0.1:3711',PAP_PUBLIC_URL:'http://127.0.0.1:3110',PAP_EMAIL_PROVIDER:'disabled',PAP_EMAIL_EXTERNAL_ENABLED:'0',RESEND_API_KEY:'',AUTH_TRUSTED_CLIENT_IP_HEADER:''};
 log('migrate',['node_modules/.bin/prisma','migrate','deploy'],env);
 if(selected==='browser'){
   const browserEnv={...env,PAP_FIRST_ACCESS_E2E:'1',PAP_BETA1_ARTIFACTS:dir,PLAYWRIGHT_CHROMIUM_EXECUTABLE:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'',NODE_ENV:'development'};
   log(selected,['node_modules/.bin/playwright','test','--config','tests/beta1/playwright.config.ts',...(process.env.PAP_BETA1_GREP?['--grep',process.env.PAP_BETA1_GREP]:[])],browserEnv);
 }else log(selected,['node_modules/.bin/tsx','--test','--test-concurrency=1',...groups[selected]],env);
 console.log(`PASS ${selected}; private evidence ${dir}`);
}finally{
 if(cid){const info=JSON.parse(docker(['inspect',cid]))[0];if(info.Config.Labels['pap.owner']!==owner||info.Config.Labels['pap.disposable']!=='beta1-disposable')throw Error('Cleanup ownership mismatch');docker(['rm','-f',cid]);}
}
