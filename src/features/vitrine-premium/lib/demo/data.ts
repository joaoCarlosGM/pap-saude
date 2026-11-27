import {normalizeEdema, recordErrors, registrationDetails} from '../registration-record'
import { calculateDemoMeows } from "./meows"
import { assessmentPresentation } from "./assessment-presentation"
import { DEFAULT_DEMO_PROFILE, type DemoProfile } from "./profile"
import type { Patient } from '../../types/paciente'
import type { Atendimento } from '../../types/atendimento'
import type { DashboardKpi } from '../../types/dashboard'
import type { RegistrationData } from '../../types/registration'
import { seedPatients } from './fixtures'
import {pregnancyAt, pregnancySnapshot, resolveDating, shiftCivilDay, unitCivilDay} from '../gestational-dating'
import { civilDate, DEMO_DATE, normalizeIdentifier, pregnancyFrom, validDemoIdentifier } from './validation'
export { DEMO_DATE, pregnancyFrom }
export type DemoState = { patients: Patient[]; encounters: Atendimento[]; next: number; profile: DemoProfile }
export const professionals = [{id:'ana-paula',nome:'Enf. Ana Paula Ferreira',cargo:'Enfermeira'}, {id:'carlos',nome:'Dr. Carlos Mendes',cargo:'Médico'}]
export function initialDemo(reference = unitCivilDay()): DemoState {
 const patients = structuredClone(seedPatients).map((patient,index) => {
  const dum = shiftCivilDay(reference,-[215,175,133][index])
  const pregnancy = pregnancySnapshot({dum},reference)!
  return {
   ...patient, pregnancy, scenarioReference:reference, consultations:0,
   idade:Math.floor((+civilDate(reference)!-+civilDate(patient.dataNascimento)!)/31557600000),
   vaccines:patient.vaccines.map((v,i) => {
    const pending = v.status==='PENDENTE' || (index===0 && i===patient.vaccines.length-1)
    return {...v,status:pending?'PENDENTE':v.status,date:shiftCivilDay(reference,pending?7:-42+i*7)}
   }),
   exams:patient.exams.map((exam,i) => ({...exam,date:shiftCivilDay(reference,exam.status === 'PENDENTE' ? 4+i : -35+i*4)})),
   documents:patient.documents,
   timeline:[], previousNotes:[], meowsTrend:[], systolicTrend:[],
  }
 })
 const encounters: Atendimento[] = patients.flatMap((patient,index) => [0,1,2].map(visit => {
  const date = shiftCivilDay(reference,-[63,35,5][visit])
  const registration: RegistrationData = {
   cpf:patient.cpf,nomeCompleto:patient.nome,dataNascimento:patient.dataNascimento,primeiroAtendimento:visit===0&&index!==2,dum:patient.pregnancy.dum,
   paSistolica:String([[118,142,124],[122,145,146],[158,163,162]][index][visit]),paDiastolica:'78',
   frequenciaCardiaca:'84',frequenciaRespiratoria:'16',temperatura:'36,5',saturacaoO2:'98',
   oxygenMode:index===2&&visit===2?'unknown':'air',nivelConsciencia:'alerta',debitoUrinario:'',proteinuria:'',
   alturaUterina:'',bcf:'',movimentacaoFetal:'',edema:'',sangramentoVaginal:'',pesoAtual:'',queixasPrincipais:'Acompanhamento pré-natal',observacoesProfissional:'',
  }
  const assessment = calculateDemoMeows(registration)
  return {
   id:`demo-${patient.id}-${visit+1}`,consultaNumero:visit+(index===2?2:1),dataHora:date+'T12:00:00Z',
   paciente:{id:patient.id,nome:patient.nome,idadeGestacional:pregnancyAt(patient.pregnancy,date).gestationalAge},
   profissional:professionals[(index+visit)%2],score:assessment.score,classificacao:assessment.classification,
   assessment,assessmentSource:'PAP_MEOWS_DEMO' as const,registration,
  }
 }))
 const legacyPatient=patients[2]
 const legacyDay=shiftCivilDay(reference,-91)
 encounters.push({
  id:`demo-${legacyPatient.id}-legacy`,consultaNumero:1,dataHora:legacyDay+'T12:00:00Z',
  paciente:{id:legacyPatient.id,nome:legacyPatient.nome,idadeGestacional:pregnancyAt(legacyPatient.pregnancy,legacyDay).gestationalAge},
  profissional:professionals[0],score:null,classificacao:'NAO_AVALIADO',assessmentSource:'ILLUSTRATIVE_FIXTURE',
 })
 return {patients,encounters,next:1,profile:{...DEFAULT_DEMO_PROFILE}}
}
function encounterSubtitle(encounter: Atendimento) {
 const record = encounter.registration
 if (!record) return 'Fixture ilustrativa, não é avaliação clínica.'
 const {referral, outcome} = registrationDetails(record)
 return [record.observacoesProfissional, referral, outcome].filter(Boolean).join(' · ') || 'Registro da Vitrine.'
}
export function patientViews(state:DemoState, reference = unitCivilDay()):Patient[] {
 return state.patients.map(p=>{
  const encounters=state.encounters.filter(a=>a.paciente.id===p.id).sort((a,b)=>a.dataHora.localeCompare(b.dataHora)||a.id.localeCompare(b.id)),last=encounters.at(-1)
  return {...p,pregnancy:pregnancyAt(p.pregnancy,reference),encounters,consultations:encounters.length,latestScore:last?{value:last.score,classification:last.classificacao,date:last.dataHora}: {value:null,classification:'NAO_AVALIADO' as const,date:reference},meowsTrend:encounters.filter(a=>a.assessmentSource==='PAP_MEOWS_DEMO'&&a.score!==null).map(a=>({label:`C${a.consultaNumero}`,value:a.score!})),systolicTrend:encounters.filter(a=>a.registration?.paSistolica).map(a=>({label:`C${a.consultaNumero}`,value:Number(a.registration!.paSistolica.replace(",","."))})),timeline:[...p.timeline,...p.vaccines.filter(v=>v.status==='APLICADA').map(v=>({id:'vaccine-'+v.id,type:'vacina' as const,title:'Vacina demonstrativa aplicada: '+v.name,date:v.date})),...p.exams.filter(e=>e.status!=='PENDENTE').map(e=>({id:'exam-'+e.id,type:'exame' as const,title:'Exame demonstrativo: '+e.name,date:e.date})),...encounters.map(a=>({id:a.id,type:'consulta' as const,title:`Consulta demonstrativa #${a.consultaNumero}`,date:a.dataHora,professional:a.profissional.nome,subtitle:encounterSubtitle(a)}))],previousNotes:encounters.filter(a=>a.registration?.observacoesProfissional).map(a=>({id:a.id,date:a.dataHora,professional:a.profissional.nome,text:a.registration!.observacoesProfissional}))}
 })
}
export function registrationErrors(d:RegistrationData,step:number,reference = unitCivilDay()):string[] {
 const errors:string[]=recordErrors(d,step)
 if(step===1){if(!validDemoIdentifier(d.cpf))errors.push('Informe um CPF demonstrativo com 11 dígitos não repetidos.');if(d.nomeCompleto.trim().split(/\s+/).length<2)errors.push('Informe nome e sobrenome.');if(!civilDate(d.dataNascimento)||d.dataNascimento>=reference)errors.push('Informe uma data de nascimento válida e anterior à data atual da unidade.')}
 if (step===2 && !resolveDating(d,reference)) {
  if (d.dating?.source==='ultrasound') errors.push('Informe a data do exame, a idade gestacional, o tipo e a evidência.')
  else if (d.dating?.source==='due-date') errors.push('Informe uma DPP plausível, a origem e a evidência documental.')
  else if (!d.dumUnknown) errors.push('Informe DUM válida, não futura, de até 45 semanas, ou marque desconhecida.')
 }
 const bounds:Record<string,[number,number]> = step===3?{paSistolica:[1,350],paDiastolica:[1,250],frequenciaCardiaca:[1,300],frequenciaRespiratoria:[1,100],temperatura:[25,45],saturacaoO2:[0,100]}:step===4?{alturaUterina:[0,60],bcf:[1,300],pesoAtual:[1,500]}:{}
 for(const [key,[min,max]]of Object.entries(bounds)){const raw=d[key as keyof RegistrationData];if(raw!==''&&raw!==undefined&&(typeof raw!=='string'||!/^\d+(?:[.,]\d+)?$/.test(raw)||Number(raw.replace(',','.'))<min||Number(raw.replace(',','.'))>max))errors.push(`Valor inválido em ${key}: apenas limites físicos de entrada (${min}–${max}), sem classificação clínica.`)}
 if(step===3&&d.paSistolica&&d.paDiastolica&&Number(d.paSistolica)<=Number(d.paDiastolica))errors.push('Pressão sistólica deve ser maior que a diastólica.')
 if(step===3){errors.push(...calculateDemoMeows(d).errors.map(e=>`${e.parameter}: ${e.message}`));if(d.oxygenMode==='supplemental'&&d.oxygenFlow?.trim()&&Number(d.oxygenFlow.replace(',','.'))===0)errors.push('Fluxo suplementar deve ser maior que zero.');}
 if(step===4){for(const k of ['pregnancies','deliveries','cesareans','pregnancyLosses'] as const){if(d[k]&&!/^\d{1,2}$/.test(d[k]!))errors.push('Antecedentes devem ser contagens inteiras ou desconhecidos.')}
 if(d.pregnancies!==undefined&&d.pregnancies!==''&&d.deliveries&&d.pregnancyLosses&&Number(d.deliveries)+Number(d.pregnancyLosses)>Number(d.pregnancies))errors.push('Partos e perdas não podem exceder as gestações informadas.');if(d.deliveries&&d.cesareans&&Number(d.cesareans)>Number(d.deliveries))errors.push('Cesáreas não podem exceder os partos informados.');
 if(d.allergyStatus==='sim'&&(!d.allergies?.length||d.allergies.some(a=>!a.agent.trim())))errors.push('Informe o agente da alergia relatada.');if(d.comorbidityStatus==='sim'&&(!d.conditions?.length||d.conditions.some(c=>!c.trim())))errors.push('Informe a condição relatada.');if(d.medications?.some(m=>!m.name.trim()))errors.push('Informe o nome de cada medicação adicionada.')}
 return errors
}
function historyState(value: 'sim'|'nao'|'desconhecido'|undefined, positive: number, previous: string|undefined, label:string) {
 if(positive) return 'relato registrado'
 if(value==='nao')return 'investigado sem relato'
 return previous?.split('; ').find(part=>part.startsWith(label+': '))?.slice(label.length+2) ??
  (value==='desconhecido'?'desconhecido':'não investigado')
}
export function saveDemo(state:DemoState,d:RegistrationData,recorded?:{at:string;agendaIdentity:string;encounterId?:string}):DemoState {
 const timestamp=recorded?.at ?? new Date().toISOString(), reference=unitCivilDay(new Date(timestamp))
 const errors=[1,2,3,4,5].flatMap(step=>registrationErrors(d,step,reference));if(errors.length)throw new Error(errors.join(' '))
 const existing=state.patients.find(p=>normalizeIdentifier(p.cpf)===normalizeIdentifier(d.cpf)),id=existing?.id??`demo-patient-${state.next}`,dating=pregnancySnapshot(d,reference)
 const addedAllergies=d.allergyStatus==='sim'?(d.allergies||[]).map(a=>[a.agent,a.reaction,a.notes].filter(Boolean).join(' — ')):[]
 const addedConditions=d.comorbidityStatus==='sim'?d.conditions||[]:[]
 const allergies=[...new Set([...(existing?.allergies??[]),...addedAllergies])]
 const comorbidities=[...new Set([...(existing?.comorbidities??[]),...addedConditions])]
 const medications=[...(existing?.medications??[])]
 for (const medication of d.medications??[]) {
  const same=medications.some(entry=>['name','dose','frequency','route'].every(key=>
   entry[key as keyof typeof medication]?.trim().toLocaleLowerCase('pt-BR')===medication[key as keyof typeof medication]?.trim().toLocaleLowerCase('pt-BR')))
  if(!same)medications.push({...medication,id:crypto.randomUUID()})
 }
 const allergyHistory=historyState(d.allergyStatus,allergies.length,existing?.historyStatus,'Alergias')
 const conditionHistory=historyState(d.comorbidityStatus,comorbidities.length,existing?.historyStatus,'comorbidades')
 const patient:Patient={
  id,scenarioReference:existing?.scenarioReference,agendaIdentity:existing?.agendaIdentity??recorded?.agendaIdentity,
  initials:existing?.initials??d.nomeCompleto.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join(''),
  nome:existing?.nome??d.nomeCompleto.trim(),cpf:normalizeIdentifier(d.cpf),
  sus:existing?.sus||'Não informado',dataNascimento:existing?.dataNascimento??d.dataNascimento,
  idade:existing?.idade??Math.floor((+civilDate(reference)!-+civilDate(d.dataNascimento)!)/31557600000),
  telefone:existing?.telefone||'Não informado',endereco:existing?.endereco||'Não informado',
  pregnancy:dating??existing?.pregnancy??{dum:'',dpp:'',gestationalAge:'Desconhecida',trimester:'Desconhecido'},
  allergies,comorbidities,historyStatus:`Alergias: ${allergyHistory}; comorbidades: ${conditionHistory}`,
  consultations:0,alerts:0,latestScore:{value:null,classification:'NAO_AVALIADO',date:reference},meowsTrend:[],systolicTrend:[],
  obstetricHistory:{pregnancies:d.pregnancies?Number(d.pregnancies):existing?.obstetricHistory.pregnancies??null,
    deliveries:d.deliveries?Number(d.deliveries):existing?.obstetricHistory.deliveries??null,
    cesareans:d.cesareans?Number(d.cesareans):existing?.obstetricHistory.cesareans??null,
    abortions:d.pregnancyLosses?Number(d.pregnancyLosses):existing?.obstetricHistory.abortions??null},
  timeline:existing?.timeline||[],exams:existing?.exams||[],vaccines:existing?.vaccines||[],
  documents:existing?.documents||[],medications,previousNotes:[],
 }
 const assessment=calculateDemoMeows(d)
 const registration=normalizeEdema(structuredClone(d))
 if(recorded&&registration.edema)registration.edemaProvenance={author:'enfermagem',recordedAt:recorded.at,source:'Registro da Vitrine'}
 const encounter:Atendimento={id:recorded?.encounterId??`demo-record-${state.next}`,consultaNumero:state.encounters.filter(a=>a.paciente.id===id).length+1,dataHora:timestamp,paciente:{id,nome:patient.nome,idadeGestacional:pregnancyAt(patient.pregnancy,reference).gestationalAge},profissional:professionals[0],score:assessment.score,classificacao:assessment.classification,assessment,assessmentSource:'PAP_MEOWS_DEMO',registration}
 return {...state,patients:[...state.patients.filter(p=>p.id!==id),patient],encounters:[...state.encounters,encounter],next:state.next+1}
}
export function dashboardFrom(state:DemoState){
 const reference=unitCivilDay(), patients=patientViews(state,reference),all=state.encounters,month=all.filter(a=>unitCivilDay(new Date(a.dataHora)).startsWith(reference.slice(0,7)))
 const riskDistribution=([{label:'Sem alerta / ilustrativo',type:'low'},{label:'Atenção demonstrativa',type:'attention'},{label:'Alertas demonstrativos',type:'urgent'}] as const).map(r=>({...r,value:patients.filter(p=>assessmentPresentation(p.latestScore.classification).group===r.type).length}))
 const kpis:DashboardKpi[]=[{id:'patients',title:'Pacientes ativas',value:String(patients.length),description:'Pacientes na base sintética',icon:'users',tone:'pink'},{id:'appointments',title:'Atendimentos',value:String(month.length),description:'No mês da demonstração',icon:'clipboard',tone:'blue'},{id:'today',title:'Atendimentos hoje',value:String(all.filter(a=>unitCivilDay(new Date(a.dataHora))===reference).length),description:`Data de referência ${reference}`,icon:'calendar',tone:'cyan'},{id:'urgent',title:'Alertas demonstrativos',value:String(riskDistribution[2].value),description:'Categorias de apresentação; sem equivalência clínica',icon:'triangle',tone:'red'},{id:'attention',title:'Pacientes em atenção',value:String(riskDistribution[1].value),description:'Categorias de apresentação; sem equivalência clínica',icon:'heart',tone:'amber'},{id:'coverage',title:'Cobertura pré-natal',value:'—',description:'Indisponível: sem população-alvo',icon:'activity',tone:'emerald'},{id:'average',title:'Tempo médio',value:'—',description:'Indisponível: sem duração',icon:'clock',tone:'violet'},{id:'return',title:'Taxa de retorno',value:patients.length?`${Math.round(patients.filter(p=>p.consultations>1).length/patients.length*100)}%`:'—',description:'Pacientes com mais de uma consulta / total',icon:'user-check',tone:'emerald'}]
 return {dashboardKpis:kpis,riskDistribution,monthlyAttendances:Array.from({length:6},(_,i)=>{const month=new Date(reference.slice(0,7)+'-01T12:00:00Z');month.setUTCMonth(month.getUTCMonth()-5+i);return {month:new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(month),total:all.filter(visit=>unitCivilDay(new Date(visit.dataHora)).startsWith(month.toISOString().slice(0,7))).length}}),recentAttendances:all.toSorted((a,b)=>b.dataHora.localeCompare(a.dataHora)).slice(0,4).map(a=>({id:a.id,patientId:a.paciente.id,patient:a.paciente.nome,initials:patients.find(p=>p.id===a.paciente.id)!.initials,gestationalAge:a.paciente.idadeGestacional,professional:a.profissional.nome,time:new Date(a.dataHora).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'}),score:a.score,classification:a.classificacao})),upcomingDeliveries:patients.filter(p=>p.pregnancy.dpp>=reference).map(p=>({id:p.id,patient:p.nome,gestationalAge:p.pregnancy.gestationalAge,dpp:p.pregnancy.dpp,remainingDays:Math.round((+civilDate(p.pregnancy.dpp)!-+civilDate(reference)!)/86400000)})).sort((a,b)=>a.dpp.localeCompare(b.dpp))}
}
export type AttendanceFilter={search:string;period:string;risk:string;professional:string}
export function filterEncounters(all:Atendimento[],f:AttendanceFilter){const reference=unitCivilDay(),days:Record<string,number>={today:0,'7d':7,'30d':30,'90d':90};return all.filter(a=>[a.paciente.nome,a.registration?.queixasPrincipais].some(value=>value?.toLocaleLowerCase('pt-BR').includes(f.search.trim().toLocaleLowerCase('pt-BR')))&&(f.risk==='all'||(f.risk==='unknown'?assessmentPresentation(a.classificacao).group==='unassessed':assessmentPresentation(a.classificacao).group===({low:'low',attention:'attention',urgent:'urgent'} as Record<string,string>)[f.risk]))&&(f.professional==='all'||a.profissional.id===f.professional)&&(f.period==='all'||((+civilDate(reference)!-+civilDate(unitCivilDay(new Date(a.dataHora)))!)/86400000>=0&&(+civilDate(reference)!-+civilDate(unitCivilDay(new Date(a.dataHora)))!)/86400000<=days[f.period]))).toSorted((a,b)=>b.dataHora.localeCompare(a.dataHora))}
