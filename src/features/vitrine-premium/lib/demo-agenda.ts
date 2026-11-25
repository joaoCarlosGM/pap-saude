'use client'

import {useEffect, useMemo, useState, useSyncExternalStore} from 'react'
import {z} from 'zod'
import type {SyntheticIdentity} from './pap-id'
import type {ChartEvent} from './longitudinal'
import type {Patient} from '../types/paciente'

const kinds = ['consulta', 'exame', 'solicitacao', 'retorno', 'vacinacao'] as const
const statuses = ['planejado', 'confirmado', 'realizado', 'nao_compareceu', 'cancelado'] as const
export const appointmentKinds: Record<(typeof kinds)[number], string> = {
  consulta: 'Consulta', exame: 'Exame', solicitacao: 'Solicitação de exame sem data', retorno: 'Retorno', vacinacao: 'Vacinação',
}
export const appointmentStatuses: Record<(typeof statuses)[number], string> = {
  planejado: 'Planejado', confirmado: 'Confirmado', realizado: 'Realizado',
  nao_compareceu: 'Não compareceu', cancelado: 'Cancelado',
}
export const appointmentActions = {criado: 'Registro criado', agendado: 'Exame agendado', reagendado: 'Reagendado', situacao: 'Situação atualizada'}

const slotSchema = z.object({date: z.iso.date(), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)})
const statusSchema = z.enum(statuses)
const eventSchema = z.object({
  id: z.uuid(), at: z.iso.datetime(), actor: z.string().min(1).max(100),
  action: z.enum(['criado', 'agendado', 'reagendado', 'situacao']),
  status: statusSchema, slot: slotSchema.nullable(),
})
const appointmentSchema = z.object({
  id: z.uuid(), patient: z.object({id: z.string().min(1).max(100), key: z.string().min(1).max(150), name: z.string().min(1).max(200)}),
  kind: z.enum(kinds), status: statusSchema, slot: slotSchema.nullable(),
  professional: z.string().trim().min(1).max(120), unit: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(1).max(250), events: z.array(eventSchema).min(1),
})
const storedSchema = z.array(appointmentSchema)
export type Appointment = z.infer<typeof appointmentSchema>
export type AppointmentStatus = Appointment['status']
export type AppointmentSlot = z.infer<typeof slotSchema>
export type AppointmentInput = Pick<Appointment, 'patient' | 'kind' | 'slot' | 'professional' | 'unit' | 'reason'>
type Change = {kind: 'slot'; slot: AppointmentSlot} | {kind: 'status'; status: AppointmentStatus}
const key = 'pap.vitrine.agenda.v1'
const changed = 'pap:vitrine-agenda'

function canSeePatient(id: string, authorized: readonly SyntheticIdentity[]) {
  return !id.startsWith('review-') || authorized.some(person => 'patientId' in person && person.patientId === id)
}

export function agendaPatient(patient: Patient, authorized: readonly SyntheticIdentity[] = []): Appointment['patient'] | undefined {
  if (!canSeePatient(patient.id, authorized)) return undefined
  const subject = patient.id.startsWith('demo-patient-') ? patient.agendaIdentity : patient.id
  if (subject) return {id: patient.id, key: subject, name: patient.nome}
}

export function visibleAppointments(items: readonly Appointment[], authorized: readonly SyntheticIdentity[] = []) {
  return items.filter(item => canSeePatient(item.patient.id, authorized))
}

export const isPending = (item: Pick<Appointment,'status'>) => item.status === 'planejado' || item.status === 'confirmado'
export function availableStatuses(item: Pick<Appointment,'status'|'slot'>): AppointmentStatus[] {
  if (!isPending(item)) return []
  if (!item.slot) return ['cancelado']
  return item.status === 'planejado'
    ? ['confirmado', 'realizado', 'nao_compareceu', 'cancelado']
    : ['realizado', 'nao_compareceu', 'cancelado']
}

export const appointmentTimestamp = (slot: AppointmentSlot) => Date.parse(`${slot.date}T${slot.time}:00-03:00`)
export const describeSlot = (slot: AppointmentSlot | null) => slot
  ? `${slot.date.split('-').reverse().join('/')} às ${slot.time}` : 'Sem data agendada'

export function nextAppointments<T extends Appointment>(items: readonly T[], now: number) {
  return items
    .filter(item => isPending(item) && item.slot && appointmentTimestamp(item.slot) >= now)
    .toSorted((a, b) => appointmentTimestamp(a.slot!) - appointmentTimestamp(b.slot!))
}

export function useAgendaClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function event(action: keyof typeof appointmentActions, status: AppointmentStatus, slot: AppointmentSlot | null, actor: string) {
  return {id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, status, slot}
}

export function createAppointment(input: AppointmentInput, actor: string): Appointment {
  if ((input.kind === 'solicitacao') === !!input.slot) throw Error('Preencha data e horário do compromisso.')
  return appointmentSchema.parse({
    ...input, id: crypto.randomUUID(), status: 'planejado', events: [event('criado', 'planejado', input.slot, actor)],
  })
}

export function changeAppointment(item: Appointment, change: Change, actor: string): Appointment {
  if (change.kind === 'status') {
    if (!availableStatuses(item).includes(change.status)) throw Error('A situação do compromisso já foi atualizada.')
    return appointmentSchema.parse({...item, status: change.status, events: [...item.events, event('situacao', change.status, item.slot, actor)]})
  }

  if (!isPending(item)) throw Error('Este compromisso já foi encerrado.')
  const slot = slotSchema.parse(change.slot)
  if (item.slot?.date === slot.date && item.slot.time === slot.time) return item
  const action = item.slot ? 'reagendado' : 'agendado'
  return appointmentSchema.parse({
    ...item, kind: item.kind === 'solicitacao' ? 'exame' : item.kind, slot, status: 'planejado',
    events: [...item.events, event(action, 'planejado', slot, actor)],
  })
}

function subscribe(listener: () => void) {
  window.addEventListener(changed, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(changed, listener)
    window.removeEventListener('storage', listener)
  }
}
function decode(value: string | null) {
  return storedSchema.parse(value ? JSON.parse(value) : [])
}
function snapshot() {
  try {return localStorage.getItem(key)} catch {return null}
}
export function useAppointments() {
  const value = useSyncExternalStore(subscribe, snapshot, () => null)
  return useMemo(() => {
    try {return decode(value)} catch {return []}
  }, [value])
}

async function withAgendaLock<T>(action: () => T): Promise<T> {
  return navigator.locks ? navigator.locks.request(key, action) : action()
}

export function mutateAppointments(update: (items: Appointment[]) => Appointment[]) {
  return withAgendaLock(() => {
    const current = decode(localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify(update(current)))
    window.dispatchEvent(new Event(changed))
  })
}

export function resetAppointments() {
  return withAgendaLock(() => {
    localStorage.removeItem(key)
    window.dispatchEvent(new Event(changed))
  })
}

/** Project the private journal into the existing Agenda H22 view model. */
export function journalAppointments(events: readonly ChartEvent[], patient: Appointment['patient']): Appointment[] {
  const appointments = new Map<string,Appointment>()
  const history = events.filter(event => event.patientId === patient.id && event.data.kind === 'agenda')
    .toSorted((a,b) => a.version-b.version)
  for (const event of history) {
    const data = event.data
    if (data.kind !== 'agenda') continue
    const old = appointments.get(event.entityId)
    const changedSlot = old && (old.slot?.date !== data.slot?.date || old.slot?.time !== data.slot?.time)
    const action = !old ? 'criado' : changedSlot ? (old.slot ? 'reagendado' : 'agendado') : 'situacao'
    appointments.set(event.entityId, {
      id:event.entityId, patient, kind:data.appointmentKind, status:data.status, slot:data.slot,
      professional:data.professional, unit:data.unit, reason:data.notes, events:[...(old?.events ?? []),{
        id:event.id, at:event.recordedAt, actor:'Operador da sessão privada', action, status:data.status, slot:data.slot,
      }],
    })
  }
  return [...appointments.values()]
}
