import './load.mjs'
import {createRequire} from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const load=createRequire(import.meta.url)
const {initialDemo,patientViews,dashboardFrom,pregnancyFrom,filterEncounters}=load('../../src/features/vitrine-premium/lib/demo/data.ts')
test('synthetic patients and encounters share IDs, names, counts and real historical dates',()=>{
 const state=initialDemo(),patients=patientViews(state);assert.equal(new Set(patients.map(p=>p.id)).size,patients.length);assert.equal(new Set(patients.map(p=>p.cpf)).size,patients.length)
 assert.equal(new Set(state.encounters.map(a=>a.id)).size,state.encounters.length)
 for(const p of patients){const visits=state.encounters.filter(a=>a.paciente.id===p.id);assert.equal(p.consultations,visits.length);assert.equal(p.timeline.filter(a=>a.type==='consulta').length,visits.length);for(const a of visits){assert.equal(a.paciente.nome,p.nome);assert.ok(p.timeline.some(t=>t.id===a.id&&t.date===a.dataHora&&t.professional===a.profissional.nome))};assert.equal(p.pregnancy.dpp,pregnancyFrom(p.pregnancy.dum).dueDate)}
})
test('eight KPIs and charts derive from dataset, including an empty dataset',()=>{for(const state of [initialDemo(),{patients:[],encounters:[],next:1}]){const d=dashboardFrom(state);assert.equal(d.dashboardKpis.length,8);assert.equal(Number(d.dashboardKpis[0].value),state.patients.length);assert.equal(d.monthlyAttendances.reduce((n,x)=>n+x.total,0),state.encounters.length);assert.ok(d.upcomingDeliveries.every(x=>x.remainingDays>=0));assert.equal(d.dashboardKpis[5].value,'—');assert.match(d.dashboardKpis[5].description,/Indisponível/)}})
test('filters combine patient, professional, period and classification',()=>{const state=initialDemo();const results=filterEncounters(state.encounters,{search:'Maria',professional:'ana-paula',period:'today',risk:'low'});assert.equal(results.length,1);assert.equal(results[0].paciente.id,'maria-gracas');assert.equal(filterEncounters(state.encounters,{search:'missing',professional:'all',period:'all',risk:'all'}).length,0)})
test('civil dates reject impossible, future, empty and excessively old DUM',()=>{for(const d of ['', '2026-02-30','2027-01-01','2020-01-01'])assert.equal(pregnancyFrom(d),null);assert.equal(pregnancyFrom('2026-02-10').dueDate,'2026-11-17')})

test('pending vaccines never appear as administered in the shared timeline',()=>{const p=patientViews(initialDemo())[0];const pending=p.vaccines.filter(v=>v.status==='PENDENTE');assert.ok(pending.length>0);for(const v of pending)assert.ok(!p.timeline.some(t=>t.id==='vaccine-'+v.id));for(const v of p.vaccines.filter(v=>v.status==='APLICADA'))assert.ok(p.timeline.some(t=>t.id==='vaccine-'+v.id&&t.date===v.date))})
