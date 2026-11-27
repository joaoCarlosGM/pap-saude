import type {MeowsResult} from '../types/meows'
import {z} from 'zod'
import {pregnancyFrom} from './demo/validation'
import {unitCivilDay} from './gestational-dating'
import {invalidSyntheticCpf} from './review-registry'
import {demoAuthors} from './registration-record'

const short = z.string().trim().min(1).max(160)
const text = z.string().trim().min(1).max(1500)
const note = text.optional()
const day = z.iso.date()
const hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const id = z.uuid()
const source = z.enum(['relato', 'registro_profissional', 'documento_sintetico'])
const attachment = {documentId: id.optional()}
const component = z.strictObject({name: short, value: short, unit: short.optional(), reference: short.optional()})
const clinicalHistory = z.enum(['nao_investigado', 'desconhecido', 'investigado_sem_relato', 'ausencia_confirmada'])
const author = z.enum(Object.keys(demoAuthors) as [keyof typeof demoAuthors, ...(keyof typeof demoAuthors)[]])
const soapContent = z.strictObject({
  subjective: z.string().trim().max(2000), objective: z.string().trim().max(2000),
  assessment: z.string().trim().max(2000), plan: z.string().trim().max(2000),
}).refine(value => Object.values(value).some(Boolean), 'Preencha ao menos um campo SOAP.')

const registrationField = z.string().max(3000)
const dating = z.discriminatedUnion('source', [
  z.strictObject({source:z.literal('dum')}),
  z.strictObject({source:z.literal('ultrasound'), date:day, weeks:z.string().regex(/^\d{1,2}$/), days:z.string().regex(/^[0-6]$/), exam:short, evidence:short}),
  z.strictObject({source:z.literal('due-date'), date:day, origin:short, evidence:short}),
])
export const chartRegistration = z.strictObject({
  dating: dating.optional(),
  dumUnknown: z.boolean().optional(), primeiroAtendimento: z.boolean().nullable(), dum: z.union([day, z.literal('')]),
  allergyStatus: z.enum(['sim', 'nao', 'desconhecido']).optional(),
  allergies: z.array(z.strictObject({agent: registrationField, reaction: registrationField, notes: registrationField})).max(30).optional(),
  medications: z.array(z.strictObject({name: registrationField, dose: registrationField, frequency: registrationField, route: registrationField})).max(30).optional(),
  comorbidityStatus: z.enum(['sim', 'nao', 'desconhecido']).optional(),
  conditions: z.array(registrationField).max(30).optional(),
  pregnancies: registrationField.optional(), deliveries: registrationField.optional(),
  cesareans: registrationField.optional(), pregnancyLosses: registrationField.optional(),
  referral: registrationField.optional(), outcome: registrationField.optional(),
  referralChoice: registrationField.optional(), referralDetails: registrationField.optional(),
  outcomeChoice: registrationField.optional(), outcomeDetails: registrationField.optional(),
  oxygenMode: z.enum(['air', 'supplemental', 'unknown']).optional(), oxygenFlow: registrationField.optional(),
  paSistolica: registrationField, paDiastolica: registrationField, frequenciaCardiaca: registrationField,
  frequenciaRespiratoria: registrationField, temperatura: registrationField, saturacaoO2: registrationField,
  nivelConsciencia: registrationField, debitoUrinario: registrationField, proteinuria: registrationField,
  proteinuriaMethod: registrationField.optional(),
  proteinuriaLab: z.strictObject({value: short, unit: short, date: day, method: short}).optional(),
  alturaUterina: registrationField, bcf: registrationField, movimentacaoFetal: registrationField, edema: registrationField,
  edemaLocations: z.array(short).max(6).optional(), edemaOtherLocation: registrationField.optional(),
  sangramentoVaginal: registrationField, pesoAtual: registrationField,
  queixasPrincipais: registrationField, observacoesProfissional: registrationField,
  soapNotes: z.array(z.strictObject({id, author, category:short.optional(), recordedAt: z.iso.datetime(), content: soapContent})).max(20).optional(),
})

export const chartData = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('pedido'), name: short, date: day, time: hour.optional(), requester: short, source,
    status: z.enum(['solicitado', 'agendado', 'coletado', 'concluido', 'cancelado']),
    priority: z.enum(['rotina', 'prioritario']).optional(), notes: note, encounterId: id.optional()}),
  z.strictObject({kind: z.literal('resultado'), name: short, requestId: id.optional(), collectedAt: day.optional(),
    date: day.optional(), laboratory: short.optional(), method: short.optional(), components: z.array(component).max(30),
    interpretation: note, source, ...attachment, status: z.enum(['pendente', 'disponivel', 'revisado', 'retificado'])}),
  z.strictObject({kind: z.literal('vacina'), name: short, dose: short,
    status: z.enum(['aplicada', 'agendada', 'pendente', 'desconhecida', 'cancelada']),
    date: day.optional(), time: hour.optional(), scheduledDate: day.optional(), batch: short.optional(), manufacturer: short.optional(),
    unit: short.optional(), route: short.optional(), site: short.optional(),
    source: z.enum(['relato', 'comprovante', 'registro_aplicacao']), notes: note, ...attachment}),
  z.strictObject({kind: z.literal('contato'), phone: z.string().regex(/^\+?[\d ()-]{8,24}$/).refine(value => /^(?:\d{10,11}|55\d{10,11})$/.test(value.replace(/\D/g, '')), 'Informe telefone com DDD.').optional(),
    alternatePhone: z.string().regex(/^\+?[\d ()-]{8,24}$/).refine(value => /^(?:\d{10,11}|55\d{10,11})$/.test(value.replace(/\D/g, '')), 'Informe telefone com DDD.').optional(),
    email: z.email().max(160).optional(), street: short.optional(), number: short.optional(), complement: short.optional(),
    district: short.optional(), city: short.optional(), state: z.enum('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ') as [string, ...string[]]).optional(),
    zip: z.string().regex(/^\d{5}-?\d{3}$/).optional(), source}),
  z.strictObject({kind: z.literal('identidade'), name: short.refine(name => name.split(/\s+/).length > 1).optional(),
    cpf: z.string().refine(invalidSyntheticCpf, 'Use 11 dígitos iniciados por 98 com verificador inválido.').optional(),
    birthDate: day.refine(date => date >= '1900-01-01' && date < unitCivilDay()).optional(),
    cns: z.string().regex(/^DEMO-[A-Z0-9-]{3,25}$/, 'Use um identificador com prefixo DEMO-.').optional(),
    dum: day.refine(date => !!pregnancyFrom(date,unitCivilDay()), 'Informe DUM válida para a data atual da unidade.').optional(), source}),
  z.strictObject({kind: z.literal('medicacao'), name: short, dose: short.optional(), doseUnit: short.optional(), route: short.optional(),
    frequency: short.optional(), start: day.optional(), end: day.optional(), status: z.enum(['em_uso', 'suspensa', 'encerrada', 'desconhecida']),
    source: z.enum(['relato', 'registro_profissional', 'receita_anexada']), notes: note, ...attachment}),
  z.strictObject({kind: z.literal('alergia'), name: short, reaction: note, severity: z.enum(['leve', 'moderada', 'grave', 'desconhecida']).optional(),
    status: z.enum(['ativa','inativa','sob_revisao']),
    confirmation: z.enum(['relatada','confirmada','descartada','desconhecida']), source, start: day.optional(), reviewedAt: day.optional(), notes: note}),
  z.strictObject({kind: z.literal('comorbidade'), name: short, start: day.optional(), end: day.optional(),
    status: z.enum(['ativa', 'resolvida', 'em_investigacao', 'desconhecida']), source, notes: note}),
  z.strictObject({kind: z.literal('historico'), allergy: clinicalHistory.optional(), condition: clinicalHistory.optional(), source}),
  z.strictObject({kind: z.literal('agenda'), appointmentKind: z.enum(['consulta','exame','solicitacao','retorno','vacinacao']),
    status: z.enum(['planejado','confirmado','realizado','nao_compareceu','cancelado']),
    slot: z.strictObject({date: day, time: hour}).nullable(),
    professional: short, unit: short, notes: z.string().trim().min(1).max(250), vaccineId: id.optional()}),
  z.strictObject({kind: z.literal('consulta'), record: chartRegistration}),
  z.strictObject({kind: z.literal('soap'), encounterId: id, author, category:short.optional(), content: soapContent}),
]).superRefine((data, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({code: 'custom', path: [path], message})
  if (data.kind === 'resultado') {
    if (data.status !== 'pendente' && !data.date) issue('date', 'Informe a data do resultado.')
    if (data.status !== 'pendente' && !data.components.length && !data.interpretation) issue('components', 'Registre um resultado estruturado ou a interpretação do emissor.')
    if (data.date && data.collectedAt && data.date < data.collectedAt) issue('date', 'A data do resultado deve ser posterior ou igual à coleta.')
  }
  if (data.kind === 'vacina') {
    if (data.status === 'aplicada' && (!data.date || data.date > new Date().toISOString().slice(0,10))) issue('date', 'Informe uma data de aplicação válida e não futura.')
    if (data.status !== 'aplicada' && data.time) issue('time', 'Use o horário de aplicação somente para dose aplicada.')
    if (data.status !== 'aplicada' && data.date) issue('date', 'Use a data de aplicação somente para dose aplicada.')
    if (data.status !== 'agendada' && data.scheduledDate) issue('scheduledDate', 'Use a data prevista somente para dose agendada.')
    if (data.status === 'agendada' && !data.scheduledDate) issue('scheduledDate', 'Informe a data prevista.')
  }
  if ((data.kind === 'medicacao' || data.kind === 'comorbidade') && data.start && data.end && data.end < data.start) issue('end', 'A data final deve ser posterior ou igual ao início.')
  if (data.kind === 'alergia' && data.confirmation === 'descartada' && data.status === 'ativa') issue('status', 'Selecione uma situação compatível com a informação descartada.')
  if (data.kind === 'alergia' && data.reviewedAt && data.start && data.reviewedAt < data.start) issue('reviewedAt', 'A revisão deve ser posterior ou igual ao início informado.')
  if (data.kind === 'medicacao' && data.source === 'receita_anexada' && !data.documentId) issue('documentId', 'Selecione o PDF de referência.')
  if (data.kind === 'contato' && !Object.keys(data).some(key => key !== 'kind' && key !== 'source')) issue('phone', 'Informe ao menos um dado de contato ou endereço.')
  if (data.kind === 'identidade' && !(data.name || data.cpf || data.birthDate || data.cns || data.dum)) issue('name', 'Informe ao menos um campo para retificar.')
  if (data.kind === 'historico' && !(data.allergy || data.condition)) issue('allergy', 'Informe a situação investigativa.')
})

export const chartCommand = z.strictObject({
  operationId: id, entityId: id, expectedVersion: z.number().int().min(0).max(1000),
  correction: z.boolean().optional(), reason: note, data: chartData,
}).superRefine((command, ctx) => {
  if ((command.correction || command.data.kind === 'identidade') && !command.reason)
    ctx.addIssue({code: 'custom', path: ['reason'], message: 'Informe a justificativa da retificação.'})
})

export type ChartData = z.infer<typeof chartData>
export type ChartKind = ChartData['kind']
export type ChartCommand = z.infer<typeof chartCommand>
export type ChartAction = 'created' | 'updated' | 'corrected' | 'status_changed' | 'linked' | 'unlinked'
export type ChartEvent = {
  assessment?: MeowsResult
  id: string; entityId: string; patientId: string; version: number; data: ChartData; actions: ChartAction[];
  fields: string[]; occurrencePrecision: 'day' | 'time'; occurredAt: string; recordedAt: string; actor: string; source: string; reason?: string
}
export type DocumentEvent = {id: string; entityId: string; action: 'created' | 'status_changed'; recordedAt: string; actor: string}
export type ChartSnapshot = {events: ChartEvent[]; documents: DocumentEvent[]}

export const singletons: readonly ChartKind[] = ['contato', 'identidade', 'historico']
export const patchKinds: readonly ChartKind[] = singletons
export const sortChartEvents = (a: ChartEvent, b: ChartEvent) =>
  b.recordedAt.localeCompare(a.recordedAt) || b.version - a.version || b.id.localeCompare(a.id)

export function latestChartEvents(events: readonly ChartEvent[]) {
  const latest = new Map<string, ChartEvent>()
  for (const event of events) {
    if ((latest.get(event.entityId)?.version ?? 0) < event.version) latest.set(event.entityId, event)
  }
  return [...latest.values()].sort(sortChartEvents)
}

export function sameDose(a: ChartData, b: ChartData) {
  const normalize = (s: string) => s.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')
  return a.kind === 'vacina' && b.kind === 'vacina' && normalize(a.name) === normalize(b.name) &&
    normalize(a.dose) === normalize(b.dose) && a.date === b.date && a.scheduledDate === b.scheduledDate &&
    a.status !== 'cancelada' && b.status !== 'cancelada'
}

export function chartDelta(previous: ChartData | undefined, data: ChartData, correction: boolean) {
  const before: Record<string, unknown> = previous ?? {}
  const after: Record<string, unknown> = data
  const fields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter(key => key !== 'kind' && canonical(before[key]) !== canonical(after[key]))
  const actions: ChartAction[] = []
  if (!previous) actions.push('created')
  if (correction || data.kind === 'identidade' || (previous?.kind === 'resultado' && previous.status !== 'retificado' && data.kind === 'resultado' && data.status === 'retificado'))
    actions.push('corrected')
  if (previous && (fields.includes('status') || fields.includes('confirmation'))) actions.push('status_changed')
  if (fields.includes('documentId')) {
    if (before.documentId) actions.push('unlinked')
    if (after.documentId) actions.push('linked')
  }
  if (!actions.length) actions.push('updated')
  return {fields, actions}
}

function canonical(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
    ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry)
}
