import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {actor,request} from '../mission04-b/fixtures';
import {GET,POST} from '../../src/app/api/vitrine/[section]/route';
import {GET as clinicalGet} from '../../src/app/api/clinical/[[...path]]/route';
import {navigationKey,navigationMode} from '../../src/components/layout/navigation-preference';
const context=(section:string)=>({params:Promise.resolve({section})});
before(async()=>{assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/pap_p0_full_tests');await bootstrapSystemIam();});after(()=>db.$disconnect());
test('demo provider is structurally independent, API only accepts synthetic IDs and Commercial still cannot read a clinical URL',async()=>{
 const f=await actor('COMMERCIAL');const before=await Promise.all([db.patient.count(),db.encounter.count(),db.vitalSigns.count(),db.obstetricData.count()]);const content=await (await GET(request('/api/vitrine/pacientes',f.token),context('pacientes'))).json();assert.equal(content.mode,'DEMO');assert.equal(content.scope,'SYNTHETIC');assert.ok(content.patients.every((p:{id:string})=>p.id.startsWith('demo-patient-')));
 const simulated=await POST(request('/api/vitrine/registro',f.token,{patientId:content.patients[0].id,kind:'PRE_NATAL'}),context('registro'));assert.equal(simulated.status,200);assert.equal((await simulated.json()).persisted,false);assert.equal((await POST(request('/api/vitrine/registro',f.token,{patientId:'real-id-not-accepted',kind:'PRE_NATAL'}),context('registro'))).status,400);assert.equal((await GET(request('/api/vitrine/pacientes?demo=false',f.token),context('pacientes'))).status,400);
 assert.equal((await clinicalGet(request('/api/clinical/patients',f.token,undefined,'GET',{'x-organization-id':f.unit.id}),{params:Promise.resolve({path:['patients']})})).status,403);assert.deepEqual(await Promise.all([db.patient.count(),db.encounter.count(),db.vitalSigns.count(),db.obstetricData.count()]),before);
 const provider=await readFile('src/server/demo/fixtures.ts','utf8');assert.ok(!/server\/db|clinical-api|clinical-dashboard|\.patient\./.test(provider));const registration=await readFile('src/components/demo/DemoRegistrationWizard.tsx','utf8');assert.ok(!/lib\/clinical-api|\/api\/clinical\//.test(registration));for(const step of ['IdentificationStep','PregnancyStep','VitalSignsStep','ObstetricStep'])assert.ok(registration.includes(step));
});
test('visual preferences are scoped by identity and mode; operational routes import no mock catalog',async()=>{
 assert.notEqual(navigationKey('a'),navigationKey('b'));assert.notEqual(navigationKey('a'),navigationKey('a',true));assert.equal(navigationMode('PAP_ADMIN'),'expanded');assert.equal(navigationMode('compact'),'compact');
 for(const route of ['dashboard','configuracoes','chat','protocolos','cursos','ferramentas'])assert.ok(!/mock[-_A-Z]/i.test(await readFile(`src/app/(dashboard)/${route}/page.tsx`,'utf8')));
});
