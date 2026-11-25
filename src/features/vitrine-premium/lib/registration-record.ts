import {civilDate, formatDemoDate} from './demo/validation'
import type {RegistrationData} from '../types/registration'

export const proteinuriaOptions = {
  nao_realizado: 'Não realizado', negativa: 'Negativa', tracos: 'Traços', '1+': '1+', '2+': '2+', '3+': '3+',
}
export const proteinuriaMethods = {fita: 'Fita reagente', outro: 'Outro teste qualitativo'}
export const edemaOptions = {
  nao_avaliado: 'Não avaliado', ausente: 'Ausente', '1+/4+': '1+/4+', '2+/4+': '2+/4+', '3+/4+': '3+/4+', '4+/4+': '4+/4+',
}
export const hasGradedEdema = (value: string) => /^[1-4]\+\/4\+$/.test(value)
export function normalizeEdema<T extends Pick<RegistrationData,'edema'|'edemaLocations'|'edemaOtherLocation'>>(record: T): T {
  if (!hasGradedEdema(record.edema)) return {...record, edemaLocations: undefined, edemaOtherLocation: undefined}
  return record.edemaLocations?.includes('outro') ? record : {...record, edemaOtherLocation: undefined}
}
export const edemaLocations = {
  membros_inferiores: 'Membros inferiores', maos: 'Mãos', face: 'Face', generalizado: 'Generalizado', outro: 'Outro',
}
export const referralOptions = {
  ubs: 'Manter acompanhamento na UBS', compartilhado: 'Acompanhamento compartilhado',
  alto_risco: 'Encaminhamento ao pré-natal de alto risco', urgencia: 'Encaminhamento a serviço de urgência ou maternidade',
  outro: 'Outra conduta',
}
export const outcomeOptions = {
  concluida: 'Consulta concluída', retorno: 'Retorno programado', encaminhada: 'Encaminhamento realizado',
  transferencia: 'Transferência de acompanhamento', outro: 'Outro desfecho',
}

export const demoAuthors = {
  enfermagem: {name: 'Ana Paula Ferreira', category: 'Enfermagem'},
  medicina: {name: 'Carlos Mendes', category: 'Medicina'},
  odontologia: {name: 'Mariana Costa', category: 'Odontologia'},
  social: {name: 'Beatriz Lima', category: 'Serviço Social'},
  nutricao: {name: 'Rafael Alves', category: 'Nutrição'},
  psicologia: {name: 'Lívia Rocha', category: 'Psicologia'},
} as const

export const sessionSoapAuthor = 'enfermagem' as const
export const soapFields = {subjective: 'S — Subjetivo', objective: 'O — Objetivo', assessment: 'A — Avaliação', plan: 'P — Plano'}
export type DemoAuthor = keyof typeof demoAuthors
export type SoapContent = Record<keyof typeof soapFields, string>
export type SoapNote = {id: string; author: DemoAuthor; category?: string; recordedAt: string; content: SoapContent}
export type LabProteinuria = {value: string; unit: string; date: string; method: string}
export type EdemaProvenance = {author: DemoAuthor; recordedAt: string; source: 'Registro da Vitrine'}
export const emptyLab: LabProteinuria = {value: '', unit: '', date: '', method: ''}

export function labelFor(options: Record<string, string>, value?: string) {
  return value && Object.hasOwn(options, value) ? options[value] : value
}

export function createSoapNote(author: DemoAuthor, content: SoapContent): SoapNote {
  if (!Object.hasOwn(demoAuthors, author) || !Object.values(content).some(value => value.trim())) throw Error('Anotação sintética inválida.')
  const trimmed = {...content}
  for (const key of Object.keys(trimmed) as Array<keyof SoapContent>) trimmed[key] = trimmed[key].trim()
  return {id: crypto.randomUUID(), author, category:demoAuthors[author].category, recordedAt: new Date().toISOString(), content: trimmed}
}

export function recordErrors(data: RegistrationData, step: number): string[] {
  if (step === 3 && data.proteinuriaLab) {
    const lab = data.proteinuriaLab
    if (!/^\d+(?:[.,]\d+)?$/.test(lab.value.trim()) || !Number.isFinite(Number(lab.value.replace(',', '.'))) ||
        !lab.unit.trim() || !civilDate(lab.date) || !lab.method.trim()) {
      return ['Informe valor, unidade, data e método da proteinúria laboratorial.']
    }
  }
  if (step === 4 && hasGradedEdema(data.edema) && data.edemaLocations?.includes('outro') && !data.edemaOtherLocation?.trim()) {
    return ['Descreva a outra localização do edema.']
  }
  if (step === 5 && ((data.referralChoice === 'outro' && !data.referralDetails?.trim()) ||
    (data.outcomeChoice === 'outro' && !data.outcomeDetails?.trim()))) {
    return ['Descreva a conduta ou o desfecho selecionado como “Outro”.']
  }
  return []
}

export function registrationDetails(record?: RegistrationData) {
  const lab = record?.proteinuriaLab
  const evidence = record?.edemaProvenance
  const legacyEdema = {leve: 'Leve (registro anterior)', moderado: 'Moderado (registro anterior)', grave: 'Grave (registro anterior)'}
  return {
    proteinuria: labelFor(proteinuriaOptions, record?.proteinuria),
    method: labelFor(proteinuriaMethods, record?.proteinuriaMethod),
    lab: lab && `${lab.value} ${lab.unit} · ${formatDemoDate(lab.date)} · ${lab.method}`,
    edema: labelFor({...edemaOptions, ...legacyEdema}, record?.edema),
    location: record?.edemaLocations?.map(location => location === 'outro'
      ? record.edemaOtherLocation || 'Outro' : labelFor(edemaLocations, location)).join(', '),
    provenance: evidence && `${formatRecordTime(evidence.recordedAt)} · ${demoAuthors[evidence.author].name} · ${evidence.source}`,
    referral: describeSelection(referralOptions, record?.referralChoice, record?.referralDetails, record?.referral),
    outcome: describeSelection(outcomeOptions, record?.outcomeChoice, record?.outcomeDetails, record?.outcome),
  }
}

function describeSelection(options: Record<string, string>, choice?: string, note?: string, legacy?: string) {
  return [labelFor(options, choice), note?.trim(), legacy?.trim()].filter(Boolean).join(' · ')
}

const recordTime = new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza'})
export const formatRecordTime = (value: string) => recordTime.format(new Date(value))
