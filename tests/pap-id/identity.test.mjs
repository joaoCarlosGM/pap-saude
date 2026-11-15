import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {randomUUID,randomBytes,createHash} from 'node:crypto';import {readFile,mkdtemp,stat} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),{demoCardHash,resolveDemoCard,addSyntheticIdentity,demoLedgerSchema}=require('../../src/features/vitrine-premium/lib/pap-id.ts'),{initialDemo}=require('../../src/features/vitrine-premium/lib/demo/data.ts');
const patient=()=>({subject:randomUUID(),name:'Gestante Sintética ABCDEF',birthDate:'1998-08-14',document:'98123456780'});
test('opaque QR resolves only correct kind/hash, current validity and nonrevoked card; contains no identity fields',async()=>{
 const token='PAP-ID-DEMO-1.'+randomBytes(32).toString('base64url'),p=patient(),ledger={kind:'PAP_ID_DEMO_V1',revision:1,patient:p,cards:[{hash:await demoCardHash(token),expiresAt:new Date(Date.now()+60000).toISOString(),revoked:false}]};
 assert.equal(await demoCardHash(token),createHash('sha256').update(token).digest('hex'));assert.deepEqual(await resolveDemoCard(ledger,token),p);
 for(const value of ['','https://evil.invalid/?qr='+token,'PAP-ID-REAL.'+token,token+'extra'])assert.equal(await resolveDemoCard(ledger,value),null);
 assert.equal(await resolveDemoCard(null,token),null);assert.equal(await resolveDemoCard({...ledger,cards:[{...ledger.cards[0],revoked:true}]},token),null);assert.equal(await resolveDemoCard(ledger,token,Date.now()+120000),null);
 assert.ok(!token.includes(p.document)&&!token.includes(p.subject)&&!token.includes(p.name));assert.ok(!JSON.stringify(ledger).includes(token));
});
test('strict synthetic schemas reject arbitrary people, raw token storage, extra fields and invalid timestamps',()=>{
 const p=patient(),card={hash:'f'.repeat(64),expiresAt:'2030-01-01T00:00:00.000Z',revoked:false},base={kind:'PAP_ID_DEMO_V1',revision:1,patient:p,cards:[card]};assert.equal(demoLedgerSchema.safeParse(base).success,true);
 for(const patch of [{kind:'PRODUCTION'},{patient:{...p,name:'Pessoa real'}},{patient:{...p,cpf:'123'}},{cards:[{...card,token:'raw'}]},{cards:[{...card,expiresAt:'yesterday'}]},{revision:0}])assert.equal(demoLedgerSchema.safeParse({...base,...patch}).success,false);
});
test('identity registration is repeatable without creating encounters or fake clinical summaries; conflicts are denied',()=>{
 const original=initialDemo(),p=patient(),once=addSyntheticIdentity(original,p),twice=addSyntheticIdentity(once,p);assert.equal(twice,once);assert.equal(once.patients.length,original.patients.length+1);assert.deepEqual(once.encounters,original.encounters);
 const row=once.patients.at(-1);assert.equal(row.latestScore.value,null);assert.equal(row.pregnancy.dpp,'');assert.equal(row.encounters,undefined);assert.equal(row.documents.length,0);assert.throws(()=>addSyntheticIdentity(once,{...p,name:'Gestante Sintética FEDCBA'}));
 assert.equal(initialDemo().patients.length,original.patients.length);
});
test('real CLI issues a decodable PNG with hash-only ledger, revokes/expires/reissues, blocks production and unknown resources',async()=>{
 const cwd=await mkdtemp(path.join(tmpdir(),'pap-id-cli-test-')),cli=path.resolve('scripts/pap-id/demo.mts'),tsx=path.resolve('node_modules/tsx/dist/cli.mjs');
 const invoke=args=>spawnSync(process.execPath,[tsx,cli,...args],{cwd,encoding:'utf8',env:{...process.env,NODE_ENV:'development'}});
 let result=invoke(['--create-patient','--issue-card']);assert.equal(result.status,0,result.stderr);const directory=/PAP-ID DEMONSTRATIVO: (.+)/.exec(result.stdout)[1],file=path.join(directory,'base-sintetica.json'),png=path.join(directory,'carteirinha.png');
 const ledger=demoLedgerSchema.parse(JSON.parse(await readFile(file,'utf8'))),sharp=require('sharp'),jsQR=require('jsqr'),{data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true}),decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);assert.ok(decoded);assert.deepEqual(await resolveDemoCard(ledger,decoded.data),ledger.patient);assert.ok(!result.stdout.includes(decoded.data));assert.ok(!(await readFile(file,'utf8')).includes(decoded.data));assert.equal((await stat(file)).mode&0o777,0o600);
 const digits=ledger.patient.document,check=([...digits.slice(0,9)].reduce((sum,d,i)=>sum+Number(d)*(10-i),0)*10)%11%10;assert.notEqual(Number(digits[9]),check,'synthetic identifier must not be a valid CPF');
 result=invoke(['--directory',directory,'--revoke']);assert.equal(result.status,0);let updated=JSON.parse(await readFile(file,'utf8'));assert.equal(updated.patient.subject,ledger.patient.subject);assert.equal(await resolveDemoCard(updated,decoded.data),null);
 result=invoke(['--directory',directory,'--issue-card']);assert.equal(result.status,0);updated=JSON.parse(await readFile(file,'utf8'));assert.equal(updated.patient.document,ledger.patient.document);assert.equal(await resolveDemoCard(updated,decoded.data),null,'old card never revives');
 assert.equal(invoke(['--directory',directory,'--expire']).status,0);assert.ok(JSON.parse(await readFile(file,'utf8')).cards.every(c=>Date.parse(c.expiresAt)<Date.now()));
 assert.notEqual(invoke(['--directory',cwd,'--revoke']).status,0);assert.notEqual(spawnSync(process.execPath,[tsx,cli,'--create-patient','--issue-card'],{cwd,env:{...process.env,NODE_ENV:'production'},encoding:'utf8'}).status,0);
});
test('multiple ledger merge rejects hash/identity reassociation, downgrade and ambiguous documents',()=>{
 const {mergeDemoLedgers}=require('../../src/features/vitrine-premium/lib/pap-id.ts');const a={kind:'PAP_ID_DEMO_V1',revision:1,patient:patient(),cards:[{hash:'f'.repeat(64),expiresAt:'2030-01-01T00:00:00.000Z',revoked:false}]};let state=mergeDemoLedgers([],a);assert.equal(mergeDemoLedgers(state,a).length,1);const b={...a,patient:{...patient(),subject:randomUUID(),document:'98987654320'}};assert.throws(()=>mergeDemoLedgers(state,b));b.cards=[{...a.cards[0],hash:'e'.repeat(64)}];state=mergeDemoLedgers(state,b);assert.equal(state.length,2);assert.throws(()=>mergeDemoLedgers(state,{...a,revision:2,patient:{...a.patient,name:'Gestante Sintética FEDCBA'}}));const revised={...a,revision:2,cards:a.cards.map(c=>({...c,revoked:true}))};state=mergeDemoLedgers(state,revised);assert.throws(()=>mergeDemoLedgers(state,a));assert.equal(state.length,2);
});
