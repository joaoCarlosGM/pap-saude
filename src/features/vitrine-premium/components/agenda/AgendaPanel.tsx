'use client'

import {useId, useRef, useState, type FormEvent} from 'react'
import Link from 'next/link'
import {
  agendaPatient, appointmentActions, appointmentKinds, appointmentStatuses, availableStatuses, changeAppointment,
  createAppointment, describeSlot, journalAppointments, isPending, mutateAppointments, nextAppointments, useAgendaClock, useAppointments, visibleAppointments,
  type Appointment, type AppointmentStatus,
} from '../../lib/demo-agenda'
import {formatRecordTime} from '../../lib/registration-record'
import type {Patient} from '../../types/paciente'
import {useCardService} from '../demo/CardServiceContext'
import {useDemo} from '../demo/DemoProvider'
import Input from '../ui/Input'
import Select from '../ui/Select'
import {Button} from '../ui/button'
import {useLongitudinal} from '../pacientes/LongitudinalContext'
import type {ChartCommand} from '../../lib/longitudinal'

function agendaCommand(item: Appointment, version: number, operationId: string, vaccineId?: string): ChartCommand {
  return {operationId, entityId:item.id, expectedVersion:version, data:{kind:'agenda',
    appointmentKind:item.kind, status:item.status, slot:item.slot, professional:item.professional,
    unit:item.unit, notes:item.reason, vaccineId}}
}

export type AgendaDraft = {date?: string; reason: string; vaccineId: string}
type Target = Appointment['patient']

function SlotInputs({slot}: {slot?: Appointment['slot']}) {
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2">
    <Input name="date" type="date" label="Data" className="min-h-11 min-w-0 max-w-full text-base" required defaultValue={slot?.date}/>
    <Input name="time" type="time" label="Horário (Fortaleza)" className="min-h-11 min-w-0 max-w-full text-base" required defaultValue={slot?.time}/>
  </div>
}

function field(data: FormData, name: string) {return String(data.get(name) ?? '').trim()}
function formSlot(data: FormData) {return {date: field(data, 'date'), time: field(data, 'time')}}

function AppointmentForm({patients, target, actor, unit, onCreated, draft, persist, privateIds}: {
  patients: Target[]; target?: Target; actor: string; unit: string; onCreated: () => void; draft?: AgendaDraft; persist?: (patientId: string, command: ChartCommand) => Promise<void>; privateIds: ReadonlySet<string>
}) {
  const id = useId()
  const [kind, setKind] = useState<Appointment['kind']>(draft ? 'vacinacao' : 'consulta')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const previous = useRef<{command:ChartCommand; signature:string} | undefined>(undefined)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    const patient = target ?? patients.find(item => item.key === field(data,'patient'))
    if (!patient) {setError('Selecione uma paciente para continuar.'); return}
    setBusy(true)
    setError('')
    try {
      const item = createAppointment({
        patient, kind, slot: kind === 'solicitacao' ? null : formSlot(data),
        professional: field(data, 'professional'), unit: field(data, 'unit'), reason: field(data, 'reason'),
      }, actor)
      if (persist && privateIds.has(patient.id)) {
        const next = agendaCommand(item,0,item.events[0].id,draft?.vaccineId)
        const signature = JSON.stringify(next.data)
        if (previous.current?.signature !== signature) previous.current = {command:next,signature}
        await persist(patient.id,previous.current.command)
      } else {
        await mutateAppointments(current => [...current, item])
      }
      onCreated()
    } catch {
      setError('Não foi possível confirmar o compromisso. Confira os campos, os compromissos existentes e a sessão.')
    } finally {setBusy(false)}
  }

  return <form onSubmit={submit} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-3 sm:p-4">
    {!target && <Select id={id+'-patient'} name="patient" label="Paciente" required className="min-h-11 text-base" defaultValue="">
      <option value="">Selecione</option>
      {patients.map(patient => <option key={patient.key} value={patient.key}>{patient.name}</option>)}
    </Select>}
    <Select id={id+'-kind'} label="Tipo de compromisso" value={kind} disabled={!!draft} className="min-h-11 text-base" onChange={event => setKind(event.target.value as Appointment['kind'])}>
      {Object.entries(appointmentKinds).filter(([value]) => draft || value !== 'vacinacao').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </Select>
    {kind !== 'solicitacao' && <SlotInputs slot={draft?.date ? {date:draft.date,time:''} : undefined}/>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <Input name="professional" label="Profissional ou equipe" className="min-h-11 text-base" required maxLength={120} defaultValue={actor}/>
      <Input name="unit" label="Unidade" className="min-h-11 text-base" required maxLength={160} defaultValue={unit}/>
    </div>
    <Input name="reason" defaultValue={draft?.reason} label="Motivo" className="min-h-11 text-base" required maxLength={250}/>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <Button type="submit" disabled={busy} className="min-h-11 justify-self-start">Salvar compromisso</Button>
  </form>
}

function AppointmentCard({item, actor, onUpdate, showPatient, linkedPatientId, persist, vaccineId}: {
  item: Appointment; actor: string; onUpdate: (message: string) => void; showPatient: boolean; linkedPatientId?: string; persist?: (command: ChartCommand) => Promise<void>; vaccineId?: string
}) {
  const id = useId()
  const [reschedule, setReschedule] = useState(false)
  const [status, setStatus] = useState<AppointmentStatus | ''>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const attempt = useRef<{key:string;command:ChartCommand} | undefined>(undefined)
  const first = item.events[0]
  const statuses = availableStatuses(item)

  async function update(change: Parameters<typeof changeAppointment>[1], message: string) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (persist) {
        const next = changeAppointment(item, change, actor)
        if (next !== item) {
          const key = JSON.stringify([item.events.length,change])
          if (attempt.current?.key !== key) attempt.current = {key,command:agendaCommand(next,item.events.length,next.events.at(-1)!.id,vaccineId)}
          await persist(attempt.current.command)
          attempt.current = undefined
        }
      } else await mutateAppointments(current => {
        if (!current.some(row => row.id === item.id)) throw Error('Compromisso indisponível.')
        return current.map(row => row.id === item.id ? changeAppointment(row, change, actor) : row)
      })
      setReschedule(false)
      setStatus('')
      onUpdate(message)
    } catch {setError('Não foi possível atualizar o compromisso. Confira a situação atual e tente novamente.')}
    finally {setBusy(false)}
  }

  return <article id={'registro-'+item.id} tabIndex={-1} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="break-words font-semibold">{appointmentKinds[item.kind]}</h3>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{appointmentStatuses[item.status]}</span>
    </div>
    {showPatient && (linkedPatientId
      ? <Link className="w-fit break-words text-sm text-pink-700 underline" href={'/vitrine/pacientes/'+linkedPatientId}>{item.patient.name}</Link>
      : <p className="break-words text-sm">{item.patient.name}</p>)}
    <p className="font-medium">{describeSlot(item.slot)}</p>
    <p className="break-words text-sm text-slate-600">{item.professional} · {item.unit}</p>
    <p className="break-words text-sm">{item.reason}</p>
    <p className="break-words text-xs text-slate-600">Agendado por {first.actor} · {formatRecordTime(first.at)}</p>
    {isPending(item) && <Button type="button" variant="outline" aria-expanded={reschedule} className="min-h-11 justify-self-start" onClick={() => setReschedule(value => !value)}>
      {item.slot ? 'Reagendar' : 'Agendar exame'}
    </Button>}
    {reschedule && isPending(item) && <form className="grid gap-2" onSubmit={event => {
      event.preventDefault()
      void update({kind: 'slot', slot: formSlot(new FormData(event.currentTarget))}, item.slot ? 'Compromisso reagendado.' : 'Exame agendado.')
    }}>
      <SlotInputs slot={item.slot}/>
      <Button type="submit" className="min-h-11 justify-self-start" disabled={busy}>Salvar nova data</Button>
    </form>}
    {!!statuses.length && <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 grow">
        <Select id={id} label="Nova situação" className="min-h-11 text-base" value={status} onChange={event => setStatus(event.target.value as AppointmentStatus|'')}>
          <option value="">Selecione</option>
          {statuses.map(value => <option key={value} value={value}>{appointmentStatuses[value]}</option>)}
        </Select>
      </div>
      <Button type="button" variant="outline" className="min-h-11" disabled={!status || busy}
        onClick={() => status && void update({kind: 'status', status}, 'Situação atualizada.')}>Atualizar situação</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <details>
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Histórico do compromisso</summary>
      <ol className="space-y-2 border-l border-slate-200 pl-3 text-sm">
        {item.events.map(entry => <li key={entry.id} className="break-words">
          <time dateTime={entry.at}>{formatRecordTime(entry.at)}</time> · {entry.actor} · {appointmentActions[entry.action]} · {appointmentStatuses[entry.status]} · {describeSlot(entry.slot)}
        </li>)}
      </ol>
    </details>
  </article>
}

export function UpcomingAppointments({patient, onOpen}: {patient: Patient; onOpen: () => void}) {
  const items = useAppointments()
  const target = agendaPatient(patient, useCardService()?.people)
  const chart = useLongitudinal()
  const durable = target && chart?.enabled ? journalAppointments(chart.snapshot.events,target) : []
  const now = useAgendaClock()
  const next = nextAppointments([...items.filter(item => item.patient.key === target?.key), ...durable], now).slice(0, 3)
  return <section className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="font-semibold">Próximos compromissos</h2>
    {next.length ? <ul className="space-y-1 text-sm">{next.map(item =>
      <li key={item.id}>{appointmentKinds[item.kind]} · {describeSlot(item.slot)}</li>
    )}</ul> : <p className="text-sm text-slate-600">Nenhum compromisso marcado.</p>}
    <Button variant="outline" type="button" className="min-h-11 justify-self-start" onClick={onOpen}>Abrir agenda da paciente</Button>
  </section>
}

export default function AgendaPanel({patient,draft}: {patient?: Patient; draft?: AgendaDraft}) {
  const {patients, activity, state: {profile}} = useDemo()
  const appointments = useAppointments()
  const chart = useLongitudinal()
  const service = useCardService()
  const authorized = service?.people
  const [creating, setCreating] = useState(!!draft)
  const [message, setMessage] = useState('')
  const selected = patient && agendaPatient(patient, authorized)
  const targets = patients.map(value => agendaPatient(value, authorized)).filter((value): value is Target => !!value)
  const journal = patient ? chart?.snapshot.events ?? [] : activity
  const durable = (patient ? (selected ? [selected] : []) : targets).flatMap(target => journalAppointments(journal,target))
  const privateIds = new Set(authorized?.flatMap(person => 'patientId' in person ? [person.patientId] : []) ?? [])
  async function savePrivate(patientId:string,command:ChartCommand) {
    if (patient && chart?.enabled) await chart.write(command)
    else if (service?.chart) await service.chart.write(patientId,command)
    else throw Error('CHART_UNAVAILABLE')
  }
  const items = [...visibleAppointments(appointments, authorized).filter(item => !patient || item.patient.key === selected?.key), ...durable]
  const actor = profile.name.trim() || 'Profissional da Vitrine'
  const privateAppointment = (item: Appointment) => journal.find(event => event.entityId === item.id && event.data.kind === 'agenda')
  return <section aria-label={patient ? 'Agenda da paciente' : 'Compromissos'} className="grid min-w-0 gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">{chart?.enabled ? 'Novos compromissos desta ficha são salvos no laboratório privado.' : service?.chart ? 'A agenda reúne compromissos privados do laboratório e demonstrações deste navegador.' : 'Compromissos sintéticos salvos neste navegador.'}</p>
      <Button type="button" className="min-h-11" aria-expanded={creating} disabled={!!patient && (!selected || chart?.loading || chart?.error)}
        onClick={() => {setMessage(''); setCreating(value => !value)}}>Novo compromisso</Button>
    </div>
    {creating && (!patient || selected) && <AppointmentForm patients={targets} target={selected} actor={actor} draft={draft} persist={service?.chart ? savePrivate : undefined} privateIds={privateIds} unit={profile.unit.trim() || 'UBS Demonstrativa'}
      onCreated={() => {setCreating(false); setMessage('Compromisso salvo.')}}/>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {items.length ? <div className="grid min-w-0 gap-3 xl:grid-cols-2">{items.toReversed().map(item =>
      <AppointmentCard key={item.id}
          persist={privateAppointment(item) ? command => savePrivate(item.patient.id,command) : undefined}
          vaccineId={(privateAppointment(item)?.data as Extract<ChartCommand['data'],{kind:'agenda'}> | undefined)?.vaccineId} item={item} actor={actor} onUpdate={setMessage} showPatient={!patient}
        linkedPatientId={targets.find(target => target.key === item.patient.key)?.id}/>
    )}</div> : <p className="text-sm text-slate-600">Nenhum compromisso registrado.</p>}
  </section>
}
