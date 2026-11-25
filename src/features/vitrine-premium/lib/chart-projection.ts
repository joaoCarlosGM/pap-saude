import {calculateDemoMeows} from './demo/meows'
import {DEMO_DATE, pregnancyFrom} from './demo/validation'
import {professionals} from './demo/data'
import type {ChartData, ChartEvent} from './longitudinal'
import type {Patient} from '../types/paciente'
import type {Atendimento} from '../types/atendimento'
import type {SoapNote} from './registration-record'

function pregnancy(dum: string): Patient['pregnancy'] | undefined {
  const result = pregnancyFrom(dum)
  return result && {dum, dpp:result.dueDate, gestationalAge:`${result.weeks}s ${result.days}d`, trimester:result.trimester} || undefined
}

export function integratedNotes(events: readonly ChartEvent[], encounterId: string, original?: readonly SoapNote[]): SoapNote[] {
  const notes = new Map(original?.map(note => [note.id,note]))
  for (const event of events) {
    const {data} = event
    if (data.kind === 'soap' && data.encounterId === encounterId) {
      notes.set(event.entityId,{id:event.entityId, recordedAt:event.recordedAt, author:data.author, category:data.category, content:data.content})
    }
  }
  return [...notes.values()].toSorted((a,b) => a.recordedAt.localeCompare(b.recordedAt))
}

export function projectChart(patient: Patient, latest: readonly ChartEvent[]): Patient {
  if (!latest.length) return patient
  const contact = latest.find(event => event.data.kind === 'contato')?.data as Extract<ChartData,{kind:'contato'}> | undefined
  const identity = latest.find(event => event.data.kind === 'identidade')?.data as Extract<ChartData,{kind:'identidade'}> | undefined
  const visits = latest.filter(event => event.data.kind === 'consulta').toReversed()
  const encounters = [...(patient.encounters ?? [])].filter(item => !visits.some(event => event.entityId === item.id))
  const name = identity?.name ?? patient.nome
  const birthDate = identity?.birthDate ?? patient.dataNascimento
  const positiveAllergies = new Set(patient.allergies)
  const conditions = new Set(patient.comorbidities)
  const medRows = latest.flatMap(event => event.data.kind === 'medicacao' ? [event.data] : [])
  const medicationKey = (record: {name:string;dose:string;frequency:string;route:string}) =>
    [record.name,record.dose,record.frequency,record.route].map(value => value.trim().toLocaleLowerCase('pt-BR')).join('|')
  const inheritedMedications = new Map(patient.medications.map(item => [medicationKey(item),item]))
  let obstetricHistory = patient.obstetricHistory
  let historyStatus = patient.historyStatus
  let dating = patient.pregnancy
  for (const event of visits) {
    if (event.data.kind !== 'consulta') continue
    const {record} = event.data
    if (!record.dumUnknown && record.dum) dating = pregnancy(record.dum) ?? dating
    if (record.allergyStatus === 'sim') {
      for (const allergy of record.allergies ?? []) positiveAllergies.add([allergy.agent,allergy.reaction,allergy.notes].filter(Boolean).join(' — '))
    }
    if (record.comorbidityStatus === 'sim') for (const condition of record.conditions ?? []) conditions.add(condition)
    for (const medication of record.medications ?? []) {
      const key = medicationKey(medication)
      if (!inheritedMedications.has(key)) inheritedMedications.set(key,{...medication,id:event.entityId+':'+key})
    }
    obstetricHistory = {
      pregnancies:record.pregnancies ? Number(record.pregnancies) : obstetricHistory.pregnancies,
      deliveries:record.deliveries ? Number(record.deliveries) : obstetricHistory.deliveries,
      abortions:record.pregnancyLosses ? Number(record.pregnancyLosses) : obstetricHistory.abortions,
      cesareans:record.cesareans ? Number(record.cesareans) : obstetricHistory.cesareans,
    }
    if (record.allergyStatus === 'nao' || record.comorbidityStatus === 'nao') {
      const values = historyStatus?.split('; ') ?? []
      if (record.allergyStatus === 'nao' && !positiveAllergies.size) values[0]='Alergias: investigado sem relato'
      if (record.comorbidityStatus === 'nao' && !conditions.size) values[1]='comorbidades: investigado sem relato'
      historyStatus=values.filter(Boolean).join('; ')
    }
    const registration = {...record, cpf:patient.cpf, nomeCompleto:name, dataNascimento:birthDate,
      soapNotes:integratedNotes(latest,event.entityId,record.soapNotes)}
    const assessment = event.assessment ?? calculateDemoMeows(registration)
    const visit: Atendimento = {
      id:event.entityId, dataHora:event.recordedAt, consultaNumero:encounters.length+1,
      paciente:{id:patient.id,nome:name,idadeGestacional:dating.gestationalAge},
      profissional:professionals[0], score:assessment.score, classificacao:assessment.classification,
      assessment, assessmentSource:'PAP_MEOWS_DEMO', registration,
    }
    if (record.edema || record.edemaLocations?.length) visit.registration!.edemaProvenance =
      {author:'enfermagem',recordedAt:event.recordedAt,source:'Registro da Vitrine'}
    encounters.push(visit)
  }
  const allergyRows = latest.flatMap(event => event.data.kind === 'alergia' ? [event.data] : [])
  const conditionRows = latest.flatMap(event => event.data.kind === 'comorbidade' ? [event.data] : [])
  const removedNames = (values: Iterable<string>, rows: readonly {name:string}[]) => [...values].filter(value =>
    !rows.some(row => row.name.toLocaleLowerCase('pt-BR') === value.split(' — ')[0].toLocaleLowerCase('pt-BR')))
  const allergies = [...removedNames(positiveAllergies, allergyRows), ...allergyRows.filter(row => row.status !== 'inativa' && row.confirmation !== 'descartada')
    .map(row => [row.name,row.reaction,row.status === 'sob_revisao' ? 'sob revisão' : row.confirmation].filter(Boolean).join(' — '))]
  const comorbidities = [...removedNames(conditions, conditionRows), ...conditionRows.filter(row => row.status !== 'resolvida').map(row => row.name)]
  const address = contact && [contact.street, contact.number, contact.complement, contact.district, [contact.city,contact.state].filter(Boolean).join(' / '),contact.zip].filter(Boolean).join(', ')
  const last = encounters.at(-1)
  return {
    ...patient, nome:name, cpf:identity?.cpf ?? patient.cpf, sus:identity?.cns ?? patient.sus,
    dataNascimento:birthDate, idade:identity?.birthDate ? Math.floor((Date.parse(DEMO_DATE)-Date.parse(birthDate))/31557600000) : patient.idade,
    initials:identity?.name ? name.split(/\s+/).slice(0,2).map(word => word[0]).join('') : patient.initials,
    telefone:contact?.phone ?? patient.telefone, endereco:address || patient.endereco,
    pregnancy:identity?.dum ? pregnancy(identity.dum) ?? dating : dating, allergies:[...new Set(allergies)], comorbidities:[...new Set(comorbidities)],
    medications:[...inheritedMedications.values()].filter(item =>
      !medRows.some(row => row.name.toLocaleLowerCase('pt-BR') === item.name.toLocaleLowerCase('pt-BR'))),
    historyStatus,obstetricHistory,
    encounters, consultations:encounters.length,
    latestScore:last ? {value:last.score,classification:last.classificacao,date:last.dataHora} : patient.latestScore,
    meowsTrend:encounters.filter(item => item.assessmentSource === 'PAP_MEOWS_DEMO' && item.score !== null).map(item => ({label:'C'+item.consultaNumero,value:item.score!})),
    systolicTrend:encounters.flatMap(item => item.registration?.paSistolica ? [{label:'C'+item.consultaNumero,value:Number(item.registration.paSistolica.replace(',','.'))}] : []),
    previousNotes:encounters.flatMap(item => item.registration?.observacoesProfissional ? [{
      id:item.id,date:item.dataHora,professional:item.profissional.nome,text:item.registration.observacoesProfissional,
    }] : []),
  }
}
