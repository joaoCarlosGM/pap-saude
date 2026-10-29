// Dedicated throwaway container; never adopts existing databases, volumes or operator labs.
import {execFileSync,spawn} from 'node:child_process'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdirSync,openSync,writeFileSync,mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {assertDockerEndpoint} from '../../scripts/local/policy.mjs'
const args=process.argv.slice(2);if(args.length>1||args.some(a=>!['--preview','--browser-only','--readonly-only','--hydration-only','--regressions-only','--runtime-only','--capture-only','--keyboard-only','--incomplete-only'].includes(a)))throw Error('Unknown or conflicting test mode')
const preview=process.argv.includes('--preview'),dir=process.env.PAP_PREMIUM_EVIDENCE_DIR||mkdtempSync(join(tmpdir(),'pap-premium2-run-'))
mkdirSync(dir,{recursive:true});const summary=[]
const docker=(args,input,childEnv=process.env)=>execFileSync('docker',args,{encoding:'utf8',input,env:childEnv,stdio:['pipe','pipe','pipe']}).trim()
const endpoint=process.env.DOCKER_HOST||JSON.parse(docker(['context','inspect']))[0].Endpoints.docker.Host;assertDockerEndpoint(endpoint)
const owner='premium2-'+randomUUID(),password=randomBytes(24).toString('hex'),name='pap-'+owner
let cid,server
const env={...process.env,NODE_ENV:'development',MFA_SECRET_ENCRYPTION_KEY:randomBytes(32).toString('base64url'),MFA_SECRET_ENCRYPTION_KEY_ID:'premium2-isolated',AUTH_ALLOWED_ORIGINS:'http://127.0.0.1:3110,http://127.0.0.1:3500',PAP_PUBLIC_URL:'http://127.0.0.1:3500',PAP_LOCAL_DEMO:'1',PAP_EMAIL_PROVIDER:'disabled',PAP_EMAIL_EXTERNAL_ENABLED:'0',RESEND_API_KEY:'',RESEND_WEBHOOK_SECRET:'',NEXT_TELEMETRY_DISABLED:'1'}
env.PAP_PREMIUM_EVIDENCE_DIR=dir
for(const key of ['AUTH_TRUSTED_CLIENT_IP_HEADER','PAP_LOCAL_PROFILE','PAP_LOCAL_DEMO_TEST','PAP_LOCAL_MAIL_TEST_DIR','PAP_P0_RUNTIME_CHILD'])delete env[key]
function owns(){return cid&&docker(['inspect','--format','{{index .Config.Labels "pap.owner"}}',cid])===owner&&docker(['inspect','--format','{{index .Config.Labels "pap.disposable"}}',cid])==='premium2-integration'}
function sql(query,db='postgres'){if(!owns())throw Error('Ownership lost');return docker(['exec','-i',cid,'psql','-X','-h','127.0.0.1','-U','pap_user','-d',db,'-v','ON_ERROR_STOP=1','-Atq'],query)}
function run(label,args,extra={}){const file=join(dir,label+'.log');try{execFileSync(args[0],args.slice(1),{env:{...env,...extra},stdio:['ignore',openSync(file,'w'),openSync(file,'a')]});summary.push({label,status:'PASS',log:file});return true}catch(error){summary.push({label,status:'FAIL',exit:error.status,log:file});return false}}
let port
function url(db,user='pap_user',pass=password){return `postgresql://${user}:${pass}@127.0.0.1:${port}/${db}?schema=public`}
function database(db){sql(`CREATE DATABASE ${db};`);const connection=url(db);if(!run('migrate-'+db,['node_modules/.bin/prisma','migrate','deploy'],{DATABASE_URL:connection}))throw Error('Disposable migration failed');return connection}
try{
 cid=docker(['run','--rm','-d','--name',name,'--label','pap.disposable=premium2-integration','--label',`pap.owner=${owner}`,'--tmpfs','/var/lib/postgresql/data:rw,size=536870912','-e','POSTGRES_USER=pap_user','-e','POSTGRES_PASSWORD','-e','POSTGRES_DB=postgres','-p',process.argv.includes('--runtime-only')?'127.0.0.1:25445:5432':'127.0.0.1::5432','postgres:16-alpine'],undefined,{...process.env,POSTGRES_PASSWORD:password})
 // Password is supplied only through the child's environment, never command-line/logs.
}catch(error){throw Error('Disposable Docker start failed; inspect private infrastructure log',{cause:error})}
try{
 port=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',cid]))['5432/tcp'][0].HostPort
 if(!/^\d+$/.test(port)||['5432','15432','15433'].includes(port))throw Error('Unsafe allocated test port')
 let ready=false
 for(let attempt=0;attempt<35;attempt++){try{if(sql('SELECT 1;')==='1'){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000))}
 if(!ready){writeFileSync(join(dir,'postgres-start.log'),docker(['logs','--tail','30',cid]));throw Error('Owned PostgreSQL not ready; no existing resource adopted')}
 env.DATABASE_URL=database('pap_p0_full_tests')
 if(preview){
  env.PAP_PREMIUM_OWNER_CONTAINER=cid;env.PAP_PREMIUM_OWNER_ID=owner;const privateDir=mkdtempSync(join(tmpdir(),'pap-premium2-preview-'));env.PAP_PREMIUM_CREDENTIAL_FILE=join(privateDir,'operator-login.json')
  if(!run('preview-account',['node_modules/.bin/tsx','tests/vitrine-premium/preview-account.ts']))throw Error('Preview fixture failed')
  console.log('Owned disposable preview: http://127.0.0.1:3500; operator-only credentials:',env.PAP_PREMIUM_CREDENTIAL_FILE,'; Ctrl+C removes only this disposable container.')
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3500'],{env,stdio:'inherit'})
  const stop=()=>server?.kill('SIGTERM');process.on('SIGINT',stop);process.on('SIGTERM',stop)
  await new Promise(resolve=>server.on('exit',resolve))
 }else if(process.argv.includes('--runtime-only')){
  const clinical=database('pap_release_clinical_backend_test');const {readFileSync}=await import('node:fs');
  docker(['exec','-i',cid,'psql','-X','-h','127.0.0.1','-U','pap_user','-d','pap_release_clinical_backend_test','-v','ON_ERROR_STOP=1','-v','runtime_role=pap_pzero_runtime','-v','migrator_role=pap_pzero_migrator'],readFileSync('scripts/db/f04-role-separation.sql','utf8'));
  docker(['exec','-i',cid,'psql','-X','-h','127.0.0.1','-U','pap_user','-d','pap_release_clinical_backend_test','-v','ON_ERROR_STOP=1'],readFileSync('tests/p0-remediation/registration-runtime-acl.sql','utf8'));
  run('clinical-registration-runtime',['node_modules/.bin/tsx','--test','tests/p0-remediation/registration-runtime.integration.test.ts'],{DATABASE_URL:clinical});
 }else if(process.argv.includes('--regressions-only')){
  const temp=mkdtempSync(join(tmpdir(),'pap-premium2-regressions-'));
  let auth=(await import('node:fs')).readFileSync('scripts/test-auth-session.sh','utf8');
  auth=auth.replace('DB_CONTAINER="pap_saude_db"',`DB_CONTAINER="${cid}"`).replace('TEST_URL="postgresql://pap_user:pap_password@localhost:5432/pap_saude_f02b_test?schema=public"',`TEST_URL="${url('pap_saude_f02b_test')}"`);
  writeFileSync(join(temp,'auth.sh'),auth,{mode:0o700});
  run('auth-crypto',['node_modules/.bin/tsx','--test','tests/auth/crypto-core.test.ts','tests/auth/mfa-secret-encryption.test.ts']);
  run('auth-full',['bash',join(temp,'auth.sh')]);
  const meows=database('pap_saude_f03_meows_test');
  if(run('legacy-meows-fixture-cleanup',['bash','scripts/testing/allow-audit-test-cleanup.sh',cid,'pap_user','pap_saude_f03_meows_test']))run('clinical-meows-integration',['node_modules/.bin/tsx','--test','--test-concurrency=1','tests/clinical/meows-access.integration.test.ts','tests/clinical/meows-lifecycle.integration.test.ts'],{DATABASE_URL:meows});
  const clinical=database('pap_release_clinical_backend_test');
  const {readFileSync}=await import('node:fs');
  docker(['exec','-i',cid,'psql','-X','-h','127.0.0.1','-U','pap_user','-d','pap_release_clinical_backend_test','-v','ON_ERROR_STOP=1','-v','runtime_role=pap_pzero_runtime','-v','migrator_role=pap_pzero_migrator'],readFileSync('scripts/db/f04-role-separation.sql','utf8'));
  docker(['exec','-i',cid,'psql','-X','-h','127.0.0.1','-U','pap_user','-d','pap_release_clinical_backend_test','-v','ON_ERROR_STOP=1'],readFileSync('tests/p0-remediation/registration-runtime-acl.sql','utf8'));
  run('clinical-finalization-and-privacy',['node_modules/.bin/tsx','--test','--test-concurrency=1','tests/p0-remediation/clinical-finalization-race.integration.test.ts','tests/release/auth-body-budget.test.ts','tests/release/clinical-error-privacy.test.ts','tests/release/p0-meows-operational-state.test.ts'],{DATABASE_URL:clinical});
 }else{
  if(!(process.argv.includes('--browser-only')||process.argv.includes('--hydration-only')||process.argv.includes('--readonly-only')||process.argv.includes('--capture-only')||process.argv.includes('--keyboard-only')||process.argv.includes('--incomplete-only')))run('p0-boundaries-and-operational-meows',['node_modules/.bin/tsx','--test','--test-concurrency=1','tests/p0-full/demo-boundaries.test.ts','tests/clinical/meows-engine.test.ts','tests/clinical/meows-policy.test.ts','tests/release/p0-meows-operational-state.test.ts'])
  const readPassword=randomBytes(24).toString('hex')
  sql(`CREATE ROLE premium_readonly LOGIN PASSWORD '${readPassword}'; GRANT CONNECT ON DATABASE pap_p0_full_tests TO premium_readonly; GRANT USAGE ON SCHEMA public TO premium_readonly; GRANT SELECT ON users,sessions,roles,role_assignments,role_permissions,permissions,mfa_factors,user_notifications TO premium_readonly;`,'pap_p0_full_tests')
  run('browser-readonly',['node_modules/.bin/playwright','test','--config','tests/vitrine-premium/playwright.config.ts','--grep',process.argv.includes('--incomplete-only')?'incomplete snapshot':process.argv.includes('--keyboard-only')?'keyboard/card navigation':process.argv.includes('--capture-only')?'capture-only':process.argv.includes('--hydration-only')?'hydration diagnostic':'read-only runtime'],{PAP_PREMIUM_RUNTIME_URL:url('pap_p0_full_tests','premium_readonly',readPassword)})
  if(!process.argv.includes('--hydration-only')&&!process.argv.includes('--readonly-only')&&!process.argv.includes('--capture-only')&&!process.argv.includes('--keyboard-only')&&!process.argv.includes('--incomplete-only'))run('browser-boundaries',['node_modules/.bin/playwright','test','--config','tests/vitrine-premium/playwright.config.ts','--grep','owner runtime boundaries'],{PAP_PREMIUM_RUNTIME_URL:env.DATABASE_URL})
  if(!(process.argv.includes('--browser-only')||process.argv.includes('--hydration-only')||process.argv.includes('--readonly-only')||process.argv.includes('--capture-only')||process.argv.includes('--keyboard-only')||process.argv.includes('--incomplete-only'))){
  const eUrl=database('pap_saude_m04_e_test')
  run('legacy-commercial-iam',['node_modules/.bin/tsx','--test','--test-concurrency=1','tests/mission04-e/access.test.ts'],{DATABASE_URL:eUrl})
  const bUrl=database('pap_saude_m04_b_test')
  run('delegated-iam-regression',['node_modules/.bin/tsx','--test','--test-concurrency=1','tests/mission04-b/governance.test.ts'],{DATABASE_URL:bUrl})
  }
 }
}finally{
 if(server&&!server.killed)server.kill('SIGTERM')
 if(owns())docker(['rm','-f',cid])
 writeFileSync(join(dir,'integration-summary.json'),JSON.stringify(summary,null,2)+'\n')
}
console.log(summary.map(r=>`${r.status}: ${r.label}`).join('\n'));console.log('Private evidence:',dir)
if(summary.some(r=>r.status==='FAIL'))process.exitCode=1
