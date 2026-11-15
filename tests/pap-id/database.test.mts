import {test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';import path from 'node:path';import {createHash} from 'node:crypto';
import {readProfile,connect,initialize,issue,revoke,ledgers} from '../../scripts/private-review/card-store';import {resolveDemoCard} from '../../src/features/vitrine-premium/lib/pap-id';
const token=()=> 'PAP-ID-DEMO-1.'+randomBytes(32).toString('base64url');
test('owned isolated PostgreSQL: issue/retry/concurrency/revoke/persistence and no duplicate identities',async()=>{
 if(!process.env.PAP_ID_REVIEW_PROFILE)throw Error('DISPOSABLE_PROFILE_REQUIRED');const p=await readProfile(process.env.PAP_ID_REVIEW_PROFILE),db=connect(p)
 try{await initialize(db,p);const count=await db.query('select count(*) from review_people'),a=token(),op=randomUUID();await Promise.all([issue(db,'maria-gracas',op,a),issue(db,'maria-gracas',op,a)]);const rows=await ledgers(db);let ledger=rows.find(l=>'patientId'in l.patient&&l.patient.patientId==='maria-gracas')!;assert.ok(await resolveDemoCard(ledger,a));assert.equal((await db.query('select count(*) from review_cards where operation_id=$1',[op])).rows[0].count,'1');await assert.rejects(()=>issue(db,'maria-gracas',op,token()));await assert.rejects(()=>issue(db,'unregistered',randomUUID(),token()));
 const b=token(),c=token();await Promise.all([issue(db,'maria-gracas',randomUUID(),b),issue(db,'maria-gracas',randomUUID(),c)]);ledger=(await ledgers(db)).find(l=>l.patient.subject===ledger.patient.subject)!;assert.equal(ledger.cards.filter(c=>!c.revoked).length,1);assert.equal(await resolveDemoCard(ledger,a),null);assert.equal((await db.query('select count(*) from review_people')).rows[0].count,count.rows[0].count)
 const other=connect(p);try{assert.deepEqual(await ledgers(other),await ledgers(db))}finally{await other.end()}
 await revoke(db,ledger.patient.subject);ledger=(await ledgers(db)).find(l=>l.patient.subject===ledger.patient.subject)!;assert.ok(ledger.cards.every(c=>c.revoked));assert.equal(await resolveDemoCard(ledger,b),null);assert.equal(await resolveDemoCard(ledger,c),null)
 const payload=JSON.stringify((await db.query('select * from review_cards')).rows);for(const t of [a,b,c])assert.ok(!payload.includes(t),'raw token never persisted');assert.equal((await db.query('select current_database() as name')).rows[0].name,p.database)
 }finally{await db.end()}
});
test('private card endpoint denies missing session, foreign origin, query traversal and unsupported methods',async()=>{
 const {session}=await import('../../scripts/private-review/documents'),{cardResponse}=await import('../../scripts/private-review/card-api');
 const origin='http://127.0.0.1:49121';process.env.PAP_PRIVATE_REVIEW='1';process.env.PAP_PRIVATE_REVIEW_ORIGIN=origin;process.env.PAP_PRIVATE_REVIEW_ROOT=process.cwd();process.env.PAP_PRIVATE_REVIEW_SECRET=randomBytes(32).toString('hex');process.env.PAP_PRIVATE_REVIEW_EXPIRES=String(Date.now()+60000)
 const headers={host:'127.0.0.1:49121',origin,'x-pap-local-review':'consent'}
 assert.equal((await cardResponse(new Request(origin+'/homologacao/carteirinhas',{headers}))).status,403)
 const granted=await session(new Request(origin+'/homologacao/sessao',{method:'POST',headers,body:JSON.stringify({consent:true})}));assert.equal(granted.status,200);const cookie=granted.headers.get('set-cookie')!.split(';')[0],authenticated={...headers,cookie,'x-pap-local-review':'cards'}
 assert.equal((await cardResponse(new Request(origin+'/homologacao/carteirinhas',{headers:authenticated}))).status,200)
 for(const bad of ([{origin:'https://evil.invalid'},{host:'evil.invalid'},{cookie:'fake'},{'sec-fetch-site':'cross-site'}] as Record<string,string>[]))assert.equal((await cardResponse(new Request(origin+'/homologacao/carteirinhas',{headers:{...authenticated,...bad}}))).status,403)
 assert.equal((await cardResponse(new Request(origin+'/homologacao/carteirinhas?patient=all',{headers:authenticated}))).status,404)
 assert.equal((await cardResponse(new Request(origin+'/homologacao/carteirinhas',{method:'DELETE',headers:authenticated}))).status,405)
 assert.equal((await cardResponse(new Request(origin+'/homologacao/carteirinhas',{method:'POST',headers:{...authenticated,'x-pap-local-review':'wrong'},body:'{}'}))).status,403)
 const ended=await session(new Request(origin+'/homologacao/sessao',{method:'DELETE',headers:{...authenticated,'x-pap-local-review':'consent'}}));assert.equal(ended.status,200);assert.equal((await cardResponse(new Request(origin+'/homologacao/carteirinhas',{headers:authenticated}))).status,403)
});

test('owned stop/status/start retains PostgreSQL history and volume data without rebuilding resources',async()=>{
 const file=process.env.PAP_ID_REVIEW_PROFILE!;let p=await readProfile(file);let db=connect(p);const fingerprint=(data:unknown)=>createHash('sha256').update(JSON.stringify(data)).digest('hex');const before=fingerprint(await ledgers(db));await db.end();
 for(const action of ['stop','status','start','status']){const r=spawnSync(process.execPath,[path.resolve('node_modules/tsx/dist/cli.mjs'),path.resolve('scripts/pap-id/review-lab.mts'),'--action',action,'--profile',file],{encoding:'utf8',env:{...process.env,NODE_ENV:'development'}});assert.equal(r.status,0,'owned '+action+' must succeed')}
 p=await readProfile(file);db=connect(p);try{assert.equal(fingerprint(await ledgers(db)),before)}finally{await db.end()}
});
test('profile guards reject operator ports, tampered ownership and cleanup without exact confirmation',async()=>{
 const {writeFile}=await import('node:fs/promises');const file=process.env.PAP_ID_REVIEW_PROFILE!,p=await readProfile(file),tampered=path.join(path.dirname(file),'tampered-test-profile.json');
 for(const patch of [{port:15436},{port:5432},{database:'pap_saude'},{project:'pap-postgres'},{owner:'0'.repeat(32)}]){await writeFile(tampered,JSON.stringify({...p,...patch}),{mode:0o600});await assert.rejects(()=>readProfile(tampered))}
 const r=spawnSync(process.execPath,[path.resolve('node_modules/tsx/dist/cli.mjs'),path.resolve('scripts/pap-id/review-lab.mts'),'--action','cleanup','--profile',file,'--confirm','not-this-project'],{encoding:'utf8',env:{...process.env,NODE_ENV:'development'}});assert.notEqual(r.status,0);assert.equal((await readProfile(file)).owner,p.owner)
});
