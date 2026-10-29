import './load.mjs'
import {createRequire} from 'node:module'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {initialDemo,saveDemo,patientViews,dashboardFrom,registrationErrors,filterEncounters}=require('../../src/lib/demo/data.ts')
const {assessmentPresentation}=require('../../src/lib/demo/assessment-presentation.ts')
const {calculateDemoMeows}=require('../../src/lib/demo/meows.ts')
const normal=()=>({cpf:'32165498701',nomeCompleto:'Pessoa Sintética',dataNascimento:'1995-03-05',dum:'',dumUnknown:true,paSistolica:'120',paDiastolica:'70',frequenciaCardiaca:'80',frequenciaRespiratoria:'14',temperatura:'37.0',saturacaoO2:'98',nivelConsciencia:'alerta',oxygenMode:'air',oxygenFlow:'',debitoUrinario:'',proteinuria:'',alturaUterina:'',bcf:'',movimentacaoFetal:'',edema:'',sangramentoVaginal:'',pesoAtual:'',queixasPrincipais:'',observacoesProfissional:'Registro sintético',referral:'Manual',outcome:'Manual'})
test('complete snapshot is linked, immutable from input, zero is real, legacy vitals never fabricated',()=>{
 const d=normal(),before=initialDemo(),s=saveDemo(before,d),a=s.encounters.at(-1);d.paSistolica='170'
 assert.equal(a.assessment.score,0);assert.equal(a.assessmentSource,'PAP_MEOWS_DEMO');assert.equal(a.assessment.protocolVersion,'PAP-MEOWS v1.0');assert.equal(a.registration.paSistolica,'120');assert.equal(a.registration.referral,'Manual')
 const p=patientViews(s).find(p=>p.id===a.paciente.id);assert.equal(p.latestScore.value,0);assert.equal(p.encounters[0].id,a.id);assert.deepEqual(p.meowsTrend,[{label:'C1',value:0}]);assert.equal(dashboardFrom(s).recentAttendances[0].id,a.id)
 assert.ok(before.encounters.every(e=>e.assessmentSource==='ILLUSTRATIVE_FIXTURE'&&!e.assessment&&!e.registration));assert.deepEqual(patientViews(before)[0].meowsTrend,[])
})
test('incomplete result remains null and is excluded from lowest presentation category and trend',()=>{
 const s=saveDemo(initialDemo(),{...normal(),frequenciaCardiaca:''});const a=s.encounters.at(-1);assert.equal(a.classificacao,'INCOMPLETO');assert.equal(a.score,null);assert.ok(a.assessment.missing.includes('FC'));assert.equal(assessmentPresentation(a.classificacao).group,'unassessed');assert.equal(dashboardFrom(s).riskDistribution.reduce((n,r)=>n+r.value,0),3);assert.deepEqual(patientViews(s).at(-1).meowsTrend,[])
 assert.ok(filterEncounters(s.encounters,{risk:'unknown',period:'all',search:'',professional:'all'}).some(e=>e.id===a.id))
})
test('one critical component persists independently without automatic referral or treatment',()=>{
 const s=saveDemo(initialDemo(),{...normal(),paSistolica:'160',referral:'',outcome:''}),a=s.encounters.at(-1)
 assert.equal(a.score,3);assert.equal(a.classificacao,'ALERTA_CRITICO');assert.equal(a.assessment.critical,true);assert.equal(a.assessment.parameters.filter(p=>p.points===3).length,1);assert.equal(a.registration.referral,'');assert.equal(a.registration.outcome,'');assert.equal(dashboardFrom(s).riskDistribution[2].value,2)
})
test('oxygen input domain validates positive flow and exact boundary, absence never becomes air',()=>{
 for(const [flow,points]of [['4.9',2],['4.999999999999',2],['5',3],['5.1',3]]){const s=saveDemo(initialDemo(),{...normal(),oxygenMode:'supplemental',oxygenFlow:flow});assert.equal(s.encounters.at(-1).assessment.parameters.find(p=>p.key==='OXIGENIO').points,points)}
 assert.equal(saveDemo(initialDemo(),{...normal(),oxygenMode:'supplemental',oxygenFlow:''}).encounters.at(-1).score,null)
 for(const flow of ['0','0.0','-1','NaN'])assert.throws(()=>saveDemo(initialDemo(),{...normal(),oxygenMode:'supplemental',oxygenFlow:flow}))
})
test('errors remain visible even with incomplete precedence; invalid records are not saved',()=>{
 const d={...normal(),temperatura:'37.45',frequenciaCardiaca:''},result=calculateDemoMeows(d);assert.equal(result.status,'INCOMPLETO');assert.equal(result.score,null);assert.ok(result.errors.some(e=>e.parameter==='TEMPERATURA'));assert.ok(registrationErrors(d,3).some(e=>e.includes('TEMPERATURA')));assert.throws(()=>saveDemo(initialDemo(),d))
})
test('existing patient ID retained, consult numbering consistent, reset independent and summaries explicit',()=>{
 const base=initialDemo(),d={...normal(),cpf:base.patients[0].cpf},s=saveDemo(base,d);assert.equal(s.patients.length,3);assert.equal(s.encounters.at(-1).paciente.id,base.patients[0].id);assert.equal(s.encounters.at(-1).consultaNumero,4);assert.equal(base.encounters.length,9);assert.equal(initialDemo().encounters.length,9)
 for(const key of ['INCOMPLETO','INVALIDO','NAO_AVALIADO'])assert.equal(assessmentPresentation(key).group,'unassessed')
 for(const key of ['BAIXO_RISCO','ATENCAO','URGENCIA'])assert.match(assessmentPresentation(key).label,/ilustrativ/)
})
