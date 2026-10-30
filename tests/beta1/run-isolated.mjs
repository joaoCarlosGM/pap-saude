import {execFileSync,spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,appendFileSync,mkdirSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertDockerEndpoint} from '../../scripts/local/policy.mjs';
import {publicBetaDiagnostics} from './browser-diagnostics.mjs';
const groups={unit:['tests/beta1/presentation.test.tsx','tests/beta1/patients.test.tsx','tests/beta1/navigation.test.tsx','tests/beta1/course-presentation.test.tsx','tests/beta1/demo-courses.test.ts','tests/beta1/browser-diagnostics.test.mjs','tests/beta1/copy-guard.test.mjs','tests/beta1/row-lock-policy.test.mjs'],upgrade:[],build:[],integration:['tests/beta1/lms.test.ts'],browser:[]};
const selected=process.argv[2];if(process.argv.length!==3||!Object.hasOwn(groups,selected))throw Error('Choose an explicit isolated test group');
if(selected==='unit'){const result=spawnSync('node_modules/.bin/tsx',['--test','--test-concurrency=1',...groups.unit],{stdio:'inherit',env:process.env});process.exit(result.status??1);}
const dbName='pap_beta1_test';
const dir=mkdtempSync(join(tmpdir(),'pap-beta1-tests-')),owner=randomUUID(),name=`pap-beta1-tests-${owner}`;
const password=randomBytes(24).toString('hex');let cid;
function docker(args,input){return execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
assertDockerEndpoint(process.env.DOCKER_HOST||JSON.parse(docker(['context','inspect']))[0].Endpoints.docker.Host);
function runtimeAcl(){
 const script=readFileSync('scripts/db/f04-role-separation.sql','utf8');docker(['exec','-i',cid,'psql','-U','pap_user','-d',dbName,'-v','runtime_role=pap_beta_runtime','-v','migrator_role=pap_beta_migrator'],script);
 const sql=`SET ROLE pap_beta_runtime; DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename='courses' OR tablename LIKE 'course_%') LOOP IF NOT (has_table_privilege(current_user,t,'SELECT') AND has_table_privilege(current_user,t,'INSERT') AND has_table_privilege(current_user,t,'UPDATE') AND has_table_privilege(current_user,t,'DELETE')) THEN RAISE EXCEPTION 'LMS_RUNTIME_ACL_MISSING'; END IF; END LOOP; IF has_schema_privilege(current_user,'public','CREATE') OR has_table_privilege(current_user,'_prisma_migrations','SELECT') OR has_table_privilege(current_user,'audit_events','UPDATE,DELETE') OR has_table_privilege(current_user,'clinical_provenance_events','UPDATE,DELETE') OR has_column_privilege(current_user,'clinical_registration_operations','keyHash','UPDATE') THEN RAISE EXCEPTION 'RUNTIME_PRIVILEGE_ESCALATION'; END IF; END $$; RESET ROLE;`;
 docker(['exec','-i',cid,'psql','-U','pap_user','-d',dbName,'-v','ON_ERROR_STOP=1'],sql);writeFileSync(join(dir,'runtime-acl.json'),JSON.stringify({status:'PASS',lmsTables:13,schemaCreate:false,migrationRead:false,auditRewrite:false,clinicalLedgerRewrite:false,operationIdentityRewrite:false})+'\n',{mode:0o600});
}
const log=(label,args,env)=>{
 const r=spawnSync(args[0],args.slice(1),{env,encoding:'utf8'}),output=(r.stdout||'')+(r.stderr||'');writeFileSync(join(dir,label+'.log'),output,{mode:0o600});
 if(r.status!==0){
  const diagnostics=label==='browser'?publicBetaDiagnostics(output):[];
  if(label==='browser')console.error('Sanitized browser failure:',JSON.stringify(diagnostics));
  // Summary exposes only the static substep and allowlisted diagnostics, never raw logs.
  if(process.env.GITHUB_STEP_SUMMARY)try{appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n### Beta1: failed substep ${label}\n\n\`\`\`json\n${JSON.stringify({substep:label,status:'FAIL',diagnostics},null,2)}\n\`\`\`\n`);}catch{console.error('Sanitized CI summary unavailable; private logs retained.');}
  throw Error(`${label} FAIL (private log ${dir}/${label}.log)`);
 }
};
try{
 cid=execFileSync('docker',['run',...(selected==='upgrade'?[]:['--rm']),'-d','--name',name,'--label','pap.disposable=beta1-disposable','--label',`pap.owner=${owner}`,...(selected==='upgrade'?['--tmpfs','/var/lib/postgresql/data:rw,size=16777216','-e','PGDATA=/var/lib/postgresql/beta1-continuity']:['--tmpfs','/var/lib/postgresql/data:rw,size=536870912']),'-e','POSTGRES_USER=pap_user','-e','POSTGRES_PASSWORD','-e',`POSTGRES_DB=${dbName}`,'-p','127.0.0.1::5432','postgres:16-alpine'],{env:{...process.env,POSTGRES_PASSWORD:password},encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 let ready=false;for(let i=0;i<40;i++){try{if(docker(['exec',cid,'psql','-h','127.0.0.1','-U','pap_user','-d',dbName,'-Atqc','SELECT 1'])==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Owned PostgreSQL not ready');
 const port=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',cid]))['5432/tcp'][0].HostPort;
 const env={...process.env,DATABASE_URL:`postgresql://pap_user:${password}@127.0.0.1:${port}/${dbName}?schema=public`,MFA_SECRET_ENCRYPTION_KEY:randomBytes(32).toString('base64'),MFA_SECRET_ENCRYPTION_KEY_ID:'unified-disposable',AUTH_ALLOWED_ORIGINS:'http://127.0.0.1:3110,http://127.0.0.1:3711',PAP_PUBLIC_URL:'http://127.0.0.1:3110',PAP_EMAIL_PROVIDER:'disabled',PAP_EMAIL_EXTERNAL_ENABLED:'0',RESEND_API_KEY:'',AUTH_TRUSTED_CLIENT_IP_HEADER:''};
 if(selected==='upgrade'){
  const baseline=join(dir,'baseline');mkdirSync(join(baseline,'migrations'),{recursive:true});
  writeFileSync(join(baseline,'schema.prisma'),execFileSync('git',['show','c7b1d755:prisma/schema.prisma']));
  const historical=execFileSync('git',['ls-tree','-r','--name-only','c7b1d755','--','prisma/migrations'],{encoding:'utf8'}).trim().split('\n');
  for(const file of historical){const relative=file.slice('prisma/migrations/'.length),target=join(baseline,'migrations',relative);mkdirSync(join(target,'..'),{recursive:true});cpSync(file,target);}
  const config=join(baseline,'prisma.config.ts');writeFileSync(config,`export default {schema:${JSON.stringify(join(baseline,'schema.prisma'))},migrations:{path:${JSON.stringify(join(baseline,'migrations'))}},datasource:{url:process.env.DATABASE_URL}};`);
  const upgradeEnv={...env,PAP_BETA1_CONTINUITY:join(dir,'private-continuity.json')};
  log('baseline35-migrate',['node_modules/.bin/prisma','migrate','deploy','--config',config],upgradeEnv);
  log('baseline35-fixture',['node_modules/.bin/tsx','tests/beta1/upgrade-continuity.ts','before'],upgradeEnv);
  log('upgrade36',['node_modules/.bin/prisma','migrate','deploy'],upgradeEnv);
  log('continuity36',['node_modules/.bin/tsx','tests/beta1/upgrade-continuity.ts','after'],upgradeEnv);
  log('replay36',['node_modules/.bin/prisma','migrate','deploy'],upgradeEnv);
  log('drift36',['node_modules/.bin/prisma','migrate','diff','--from-config-datasource','--to-schema','prisma/schema.prisma','--exit-code'],upgradeEnv);runtimeAcl();
  const dump=execFileSync('docker',['exec',cid,'pg_dump','-U','pap_user','-d',dbName,'--format=custom','--no-owner','--no-privileges'],{maxBuffer:16*1024*1024});writeFileSync(join(dir,'private-upgrade.dump'),dump,{mode:0o600});
  docker(['exec',cid,'createdb','-U','pap_user','pap_beta1_restore_test']);execFileSync('docker',['exec','-i',cid,'pg_restore','-U','pap_user','-d','pap_beta1_restore_test','--exit-on-error','--single-transaction','--no-owner','--no-privileges'],{input:dump,stdio:['pipe','pipe','pipe']});
  const restoreEnv={...upgradeEnv,DATABASE_URL:upgradeEnv.DATABASE_URL.replace('/'+dbName+'?','/pap_beta1_restore_test?')};log('restored-continuity36',['node_modules/.bin/tsx','tests/beta1/upgrade-continuity.ts','after'],restoreEnv);
  const owned=JSON.parse(docker(['inspect',cid]))[0];if(owned.Config.Labels['pap.owner']!==owner)throw Error('Restart ownership mismatch');docker(['restart',cid]);let resumed=false;for(let i=0;i<40;i++){try{if(docker(['exec',cid,'psql','-h','127.0.0.1','-U','pap_user','-d',dbName,'-Atqc','SELECT 1'])==='1'){resumed=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!resumed)throw Error('Owned continuity PG restart failed');
  const resumedPort=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',cid]))['5432/tcp'][0].HostPort;const resumedOriginal=new URL(upgradeEnv.DATABASE_URL);resumedOriginal.port=resumedPort;const resumedRestore=new URL(restoreEnv.DATABASE_URL);resumedRestore.port=resumedPort;writeFileSync(join(dir,'restart-endpoint.json'),JSON.stringify({oldPort:port,newPort:resumedPort,containerUnchanged:true})+'\n',{mode:0o600});log('restart-original-continuity36',['node_modules/.bin/tsx','tests/beta1/upgrade-continuity.ts','after'],{...upgradeEnv,DATABASE_URL:resumedOriginal.toString()});log('restart-restore-continuity36',['node_modules/.bin/tsx','tests/beta1/upgrade-continuity.ts','after'],{...restoreEnv,DATABASE_URL:resumedRestore.toString()});
  log('operator-copy-helper',[process.execPath,'scripts/local/validate-beta1-copy.mjs','--backup',join(dir,'private-upgrade.dump'),'--validate-isolated-copy'],upgradeEnv);
  console.log(`PASS upgrade35->36, replay, restore and owned PG restart; seven synthetic MFA sessions preserved; private evidence ${dir}`);
 }else{
 log('migrate',['node_modules/.bin/prisma','migrate','deploy'],env);
 if(selected==='browser'){
   runtimeAcl();const runtimePassword=randomBytes(24).toString('hex');docker(['exec','-i',cid,'psql','-U','pap_user','-d',dbName,'-v','ON_ERROR_STOP=1'],`ALTER ROLE pap_beta_runtime LOGIN PASSWORD '${runtimePassword}';`);const runtimeUrl=new URL(env.DATABASE_URL);runtimeUrl.username='pap_beta_runtime';runtimeUrl.password=runtimePassword;
   const browserEnv={...env,PAP_BETA1_RUNTIME_DATABASE_URL:runtimeUrl.toString(),PAP_FIRST_ACCESS_E2E:'1',PAP_BETA1_ARTIFACTS:dir,PLAYWRIGHT_CHROMIUM_EXECUTABLE:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'',NODE_ENV:'development'};
   log(selected,['node_modules/.bin/playwright','test','--config','tests/beta1/playwright.config.ts',...(process.env.PAP_BETA1_GREP?['--grep',process.env.PAP_BETA1_GREP]:[])],browserEnv);
 }else if(selected==='build')log('production-build',['npm','run','build'],{...env,NODE_ENV:'production'});else log(selected,['node_modules/.bin/tsx','--test','--test-concurrency=1',...(process.env.PAP_BETA1_NODE_GREP?['--test-name-pattern',process.env.PAP_BETA1_NODE_GREP]:[]),...groups[selected]],env);
 console.log(`PASS ${selected}; private evidence ${dir}`);
 }
}finally{
 if(cid){const info=JSON.parse(docker(['inspect',cid]))[0];if(info.Config.Labels['pap.owner']!==owner||info.Config.Labels['pap.disposable']!=='beta1-disposable')throw Error('Cleanup ownership mismatch');docker(['rm','-f',cid]);}
}
