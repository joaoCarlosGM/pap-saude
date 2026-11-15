import {parseArgs} from 'node:util';import {mkdir,mkdtemp,writeFile,readFile,lstat,realpath} from 'node:fs/promises';import {execFileSync,spawn} from 'node:child_process';import path from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';
import {readProfile,connect,initialize,issue,revoke,ledgers,type Profile} from '../private-review/card-store';import {cardImage} from '../private-review/card-image';import {upgradeRegistry,createPerson} from '../private-review/registry-store';
if(process.env.NODE_ENV==='production'||process.env.PAP_ADMIN_BETA_ONLY==='1')throw Error('LOCAL_SYNTHETIC_ONLY')
const {values}=parseArgs({options:{action:{type:'string',default:'status'},profile:{type:'string'},patient:{type:'string'},subject:{type:'string'},confirm:{type:'string'},name:{type:'string'},'birth-date':{type:'string'},document:{type:'string'},synthetic:{type:'boolean'},operation:{type:'string'}}})
const action=values.action!,allowed=['create','start','status','stop','cleanup','issue','revoke','serve','upgrade','register'];if(!allowed.includes(action))throw Error('UNKNOWN_ACTION')
const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
let file:string,p:Profile,dir:string
if(action==='create'){
 if(values.profile)throw Error('CREATE_REQUIRES_NEW_DIRECTORY')
 await mkdir('.local',{recursive:true,mode:0o700});dir=await mkdtemp(path.resolve('.local/pap-id-review-'));const id=randomBytes(6).toString('hex');p={kind:'PAP_ID_REVIEW_PG_V1',project:'pap-id-review-'+id,owner:randomBytes(16).toString('hex'),database:'pap_id_review_'+id,user:'review_owner',password:randomBytes(32).toString('hex'),port:0,cardKey:randomBytes(32).toString('hex')};file=path.join(dir,'profile.json')
 const labels={'pap.id.review.owner':p.owner},compose={name:p.project,services:{db:{image:'postgres:16-alpine',container_name:p.project+'-db',labels,environment:{POSTGRES_DB:p.database,POSTGRES_USER:p.user,POSTGRES_PASSWORD:p.password},ports:[{target:5432,published:'0',host_ip:'127.0.0.1',protocol:'tcp'}],volumes:['data:/var/lib/postgresql/data'],healthcheck:{test:['CMD-SHELL','pg_isready -U review_owner -d '+p.database],interval:'2s',timeout:'3s',retries:30}}},volumes:{data:{name:p.project+'-data',labels}}}
 await writeFile(path.join(dir,'compose.json'),JSON.stringify(compose,null,2),{mode:0o600,flag:'wx'});await writeFile(file,JSON.stringify(p),{mode:0o600,flag:'wx'});docker(['compose','-f',path.join(dir,'compose.json'),'-p',p.project,'up','-d','--wait']);p.port=Number(JSON.parse(docker(['inspect',p.project+'-db']))[0].NetworkSettings.Ports['5432/tcp'][0].HostPort);await writeFile(file,JSON.stringify(p),{mode:0o600});await readProfile(file);const pool=connect(p);try{await initialize(pool,p);await upgradeRegistry(pool,p)}finally{await pool.end()};console.log('PROFILE='+file+'\nPostgreSQL sintético: 127.0.0.1:'+p.port+' / '+p.database)
}else{
 if(!values.profile)throw Error('PROFILE_REQUIRED');file=path.resolve(values.profile);dir=path.dirname(file);if((await lstat(file)).isSymbolicLink()||await realpath(file)!==file||(path.basename(path.dirname(dir))!=='.local'||!/^pap-id-review-[A-Za-z0-9]{6}$/.test(path.basename(dir))))throw Error('OWNED_LOCAL_PROFILE_REQUIRED')
 const raw=JSON.parse(await readFile(file,'utf8')) as Profile
 if(action==='start'){
 // Stopped containers retain port binding metadata and labels. Never reconstruct an absent resource.
 const info=JSON.parse(docker(['inspect',raw.project+'-db']))[0];if(info.Config.Labels?.['pap.id.review.owner']!==raw.owner||!/^pap-id-review-[a-f0-9]{12}$/.test(raw.project))throw Error('OWNERSHIP_FAILED');docker(['start',raw.project+'-db']);raw.port=Number(JSON.parse(docker(['inspect',raw.project+'-db']))[0].NetworkSettings.Ports['5432/tcp'][0].HostPort);await writeFile(file,JSON.stringify(raw),{mode:0o600});
 }
 p=await readProfile(file)
 if(action==='start'){for(let i=0;i<30;i++){try{docker(['exec',p.project+'-db','pg_isready','-U',p.user,'-d',p.database]);break}catch{if(i===29)throw Error('LOCAL_DATABASE_NOT_READY');await new Promise(r=>setTimeout(r,500))}}}
 if(action==='status')console.log(p.project+' / 127.0.0.1:'+p.port+' / '+docker(['inspect','--format','{{.State.Status}}',p.project+'-db']))
 if(action==='stop')docker(['stop',p.project+'-db'])
 if(action==='cleanup'){
 if(values.confirm!==p.project)throw Error('EXPLICIT_PROJECT_CONFIRMATION_REQUIRED');const volume=JSON.parse(docker(['volume','inspect',p.project+'-data']))[0];if(volume.Labels?.['pap.id.review.owner']!==p.owner)throw Error('VOLUME_OWNERSHIP_FAILED');docker(['rm','-f',p.project+'-db']);docker(['volume','rm',p.project+'-data']);console.log('Somente recursos próprios removidos; perfil e artefatos locais preservados.')
 }
 if(action==='upgrade'){if(!p.cardKey){p.cardKey=randomBytes(32).toString('hex');await writeFile(file,JSON.stringify(p),{mode:0o600})}const pool=connect(p);try{await upgradeRegistry(pool,p);console.log('Schema privado v2 aplicado de forma aditiva; histórico preservado.')}finally{await pool.end()}}
 if(action==='register'){const pool=connect(p);try{const row=await createPerson(pool,{name:values.name,birthDate:values['birth-date'],document:values.document,syntheticConsent:values.synthetic===true},values.operation||randomUUID(),'CLI');console.log('Pessoa sintética persistida: '+row.patientId)}finally{await pool.end()}}
 if(action==='issue'||action==='revoke'){
 const pool=connect(p);try{if(action==='issue'){if(!values.patient)throw Error('SYNTHETIC_PATIENT_ID_REQUIRED');const token='PAP-ID-DEMO-1.'+randomBytes(32).toString('base64url');const ledger=await issue(pool,values.patient,randomUUID(),token,p.cardKey);const output=path.join(dir,'carteirinha-'+Date.now()+'.png');await writeFile(output,await cardImage(ledger,token),{mode:0o600,flag:'wx'});await writeFile(path.join(dir,'base-sintetica.json'),JSON.stringify(ledger),{mode:0o600});console.log('Cartão privado: '+output+'\nMesma base isolada da interface; token nunca impresso.')}else{if(!values.subject)throw Error('SUBJECT_REQUIRED');await revoke(pool,values.subject);console.log('Credenciais revogadas na base isolada.')}console.log('Pessoas com histórico de emissão: '+(await ledgers(pool)).length)}finally{await pool.end()}
 }
 if(action==='serve'){
 const server=spawn(process.execPath,['tests/protocols/run-browser.mjs','--integrated','--serve'],{stdio:'inherit',env:{...process.env,PAP_ID_REVIEW_PROFILE:file}});server.on('exit',code=>{process.exitCode=code??1})
 }
}
