import './load.mjs'
import {createRequire} from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const load = createRequire(import.meta.url)
const root='../../src/features/vitrine-premium/lib/'
const {resolveDating,pregnancySnapshot,pregnancyAt,shiftCivilDay,unitCivilDay}=load(root+'gestational-dating.ts')
const {initialDemo,patientViews,saveDemo}=load(root+'demo/data.ts')
const {calculateDemoMeows}=load(root+'demo/meows.ts')
const {scenarioAppointments}=load(root+'scenario-appointments.ts')
const {sourceFlows}=load(root+'protocol-flow.ts')
const {figureCrops,flowLanes}=load(root+'protocol-flow-layout.ts')
const {flowFrames,visibleFlow}=load(root+'protocol-reveal.ts')

test('H39 three dating sources preserve provenance and use civil reference dates',()=>{
 const dum={dum:'2026-07-24'}
 const october=resolveDating(dum,'2026-10-28')
 const november=resolveDating(dum,'2026-11-25')
 assert.deepEqual([october.weeks,october.days,november.weeks,november.days],[13,5,17,5])
 assert.equal(november.dueDate,'2027-04-30')
 const ultrasound={...dum,dumUnknown:true,dating:{source:'ultrasound',date:'2026-10-28',weeks:'13',days:'5',exam:'Ultrassom',evidence:'US-001'}}
 const known={...dum,dating:{source:'due-date',date:'2027-04-30',origin:'Caderneta',evidence:'DPP-001'}}
 for(const data of [ultrasound,known]){
  const current=pregnancySnapshot(data,'2026-11-25')
  assert.equal(current.source,data.dating.source)
  assert.equal(current.gestationalAge,'17s 5d')
  assert.equal(pregnancyAt(current,'2026-12-02').gestationalAge,'18s 5d')
  assert.equal(pregnancyAt(current,'2026-10-28').gestationalAge,'13s 5d')
  assert.equal(resolveDating({...data,dating:{...data.dating,evidence:''}},'2026-11-25'),null)
 }
 assert.equal(resolveDating({dum:'',dumUnknown:true},'2026-11-25'),null)
 assert.equal(resolveDating(ultrasound,'2026-09-01'),null)
 assert.equal(shiftCivilDay('2028-02-28',1),'2028-02-29')
 assert.equal(unitCivilDay(new Date('2026-11-25T02:59:59Z'),'America/Belem'),'2026-11-24')
 assert.equal(unitCivilDay(new Date('2026-11-25T03:00:00Z'),'America/Fortaleza'),'2026-11-25')
})

test('H39 historic records retain the gestational age reported at encounter time',()=>{
 const previous=initialDemo('2026-10-28')
 const patient=previous.patients[0]
 const registration={...previous.encounters[0].registration,dum:'2026-07-24',dating:{source:'dum'}}
 const first=saveDemo(previous,registration,{at:'2026-10-28T13:00:00Z',agendaIdentity:'example'})
 const second=saveDemo(first,{...registration,dating:{source:'due-date',date:'2027-05-04',origin:'Caderneta',evidence:'REF'}},{at:'2026-11-25T13:00:00Z',agendaIdentity:'example'})
 assert.equal(first.encounters.at(-1).paciente.idadeGestacional,'13s 5d')
 assert.equal(second.encounters.at(-2).paciente.idadeGestacional,'13s 5d')
 assert.equal(second.encounters.at(-1).registration.dating.source,'due-date')
 assert.equal(patientViews(second,'2026-11-25').find(item=>item.id===patient.id).pregnancy.dpp,'2027-05-04')
})

test('H38/H41 three isolated scenarios derive score and attendance chronology from recorded readings',()=>{
 const reference='2026-11-27'
 const state=initialDemo(reference)
 const patients=patientViews(state,reference)
 assert.equal(patients.length,3)
 for(const patient of patients){
  assert.equal(patient.scenarioReference,reference)
  assert.ok(patient.exams.length&&patient.vaccines.length&&patient.documents.length)
  assert.ok(patient.encounters.every(visit=>visit.dataHora.slice(0,10)<reference && visit.score===(visit.registration ? calculateDemoMeows(visit.registration).score : null)))
  assert.ok(patient.meowsTrend.length>=2)
  assert.deepEqual(scenarioAppointments(patient).map(item=>item.kind),['consulta','exame','vacinacao'])
  assert.ok(scenarioAppointments(patient).every(item=>item.slot.date>reference))
 }
 assert.equal(patients[0].latestScore.value,0)
 assert.equal(patients[2].latestScore.classification,'INCOMPLETO')
 assert.equal(patients[2].encounters[0].classificacao,'NAO_AVALIADO')
 assert.deepEqual(scenarioAppointments({...patients[0],id:'review-no-public-data'}),[])
})

test('H42 progressive reveal reaches every node, directed edge and bounded original-page crop',()=>{
 for(const [slug,nodes] of Object.entries(sourceFlows)){
  const frames=flowFrames(nodes)
  assert.equal(visibleFlow(frames,0).nodes.size,0)
  assert.equal(visibleFlow(frames,1).nodes.size,1)
  const last=visibleFlow(frames,frames.length)
  assert.equal(last.nodes.size,nodes.length)
  assert.equal(last.edges.size,nodes.reduce((sum,node)=>sum+node.next.length,0))
  assert.deepEqual([...last.nodes].sort(),flowLanes[slug].flat().filter(Boolean).sort())
  for(const node of nodes){
   for(const edge of node.next) assert.ok(last.nodes.has(edge.id))
   const [left,top,right,bottom]=figureCrops[slug][node.id]
   assert.ok(left>=0&&right<=1&&top>=0&&bottom<=1&&left<right&&top<bottom)
  }
 }
})
