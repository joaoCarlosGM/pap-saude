'use client'

import {useId, useState, type FormEvent} from 'react'
import Link from 'next/link'
import {
  agendaPatient, appointmentActions, appointmentKinds, appointmentStatuses, availableStatuses, changeAppointment,
  createAppointment, describeSlot, isPending, mutateAppointments, nextAppointments, useAgendaClock, useAppointments, visibleAppointments,
  type Appointment, type AppointmentStatus,
} from '../../lib/demo-agenda'
import {formatRecordTime} from '../../lib/registration-record'
import type {Patient} from '../../types/paciente'
import {useCardService} from '../demo/CardServiceContext'
import {useDemo} from '../demo/DemoProvider'
import Input from '../ui/Input'
import Select from '../ui/Select'
import {Button} from '../ui/button'

type Target = Appointment['patient']

function SlotInputs({slot}: {slot?: Appointment['slot']}) {
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2">
    <Input name="date" type="date" label="Data" className="min-h-11 min-w-0 max-w-full text-base" required defaultValue={slot?.date}/>
    <Input name="time" type="time" label="Horário (Fortaleza)" className="min-h-11 min-w-0 max-w-full text-base" required defaultValue={slot?.time}/>
  </div>
}

function field(data: FormData, name: string) {return String(data.get(name) ?? '').trim()}
function formSlot(data: FormData) {return {date: field(data, 'date'), time: field(data, 'time')}}

function AppointmentForm({patients, target, actor, unit, onCreated}: {
  patients: Target[]; target?: Target; actor: string; unit: string; onCreated: () => void
}) {
  const id = useId()
  const [kind, setKind] = useState<Appointment['kind']>('consulta')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
      await mutateAppointments(current => [...current, item])
      onCreated()
    } catch {
      setError('O compromisso não foi salvo. Confira os campos e a disponibilidade do armazenamento neste navegador.')
    } finally {setBusy(false)}
  }

  return <form onSubmit={submit} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-3 sm:p-4">
    {!target && <Select id={id+'-patient'} name="patient" label="Paciente" required className="min-h-11 text-base" defaultValue="">
      <option value="">Selecione</option>
      {patients.map(patient => <option key={patient.key} value={patient.key}>{patient.name}</option>)}
    </Select>}
    <Select id={id+'-kind'} label="Tipo de compromisso" value={kind} className="min-h-11 text-base" onChange={event => setKind(event.target.value as Appointment['kind'])}>
      {Object.entries(appointmentKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </Select>
    {kind !== 'solicitacao' && <SlotInputs/>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <Input name="professional" label="Profissional ou equipe" className="min-h-11 text-base" required maxLength={120} defaultValue={actor}/>
      <Input name="unit" label="Unidade" className="min-h-11 text-base" required maxLength={160} defaultValue={unit}/>
    </div>
    <Input name="reason" label="Motivo" className="min-h-11 text-base" required maxLength={250}/>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <Button type="submit" disabled={busy} className="min-h-11 justify-self-start">Salvar compromisso</Button>
  </form>
}

function AppointmentCard({item, actor, onUpdate, showPatient, linkedPatientId}: {
  item: Appointment; actor: string; onUpdate: (message: string) => void; showPatient: boolean; linkedPatientId?: string
}) {
  const id = useId()
  const [reschedule, setReschedule] = useState(false)
  const [status, setStatus] = useState<AppointmentStatus | ''>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const first = item.events[0]
  const statuses = availableStatuses(item)

  async function update(change: Parameters<typeof changeAppointment>[1], message: string) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await mutateAppointments(current => {
        if (!current.some(row => row.id === item.id)) throw Error('Compromisso indisponível.')
        return current.map(row => row.id === item.id ? changeAppointment(row, change, actor) : row)
      })
      setReschedule(false)
      setStatus('')
      onUpdate(message)
    } catch {setError('Não foi possível atualizar o compromisso. Confira a situação atual e tente novamente.')}
    finally {setBusy(false)}
  }

  return <article className="grid min-w-0 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
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
  const now = useAgendaClock()
  const next = nextAppointments(items.filter(item => item.patient.key === target?.key), now).slice(0, 3)
  return <section className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="font-semibold">Próximos compromissos</h2>
    {next.length ? <ul className="space-y-1 text-sm">{next.map(item =>
      <li key={item.id}>{appointmentKinds[item.kind]} · {describeSlot(item.slot)}</li>
    )}</ul> : <p className="text-sm text-slate-600">Nenhum compromisso marcado.</p>}
    <Button variant="outline" type="button" className="min-h-11 justify-self-start" onClick={onOpen}>Abrir agenda da paciente</Button>
  </section>
}

export default function AgendaPanel({patient}: {patient?: Patient}) {
  const {patients, state: {profile}} = useDemo()
  const appointments = useAppointments()
  const authorized = useCardService()?.people
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const selected = patient && agendaPatient(patient, authorized)
  const targets = patients.map(value => agendaPatient(value, authorized)).filter((value): value is Target => !!value)
  const items = visibleAppointments(appointments, authorized).filter(item => !patient || item.patient.key === selected?.key)
  const actor = profile.name.trim() || 'Profissional da Vitrine'
  return <section aria-label={patient ? 'Agenda da paciente' : 'Compromissos'} className="grid min-w-0 gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">Compromissos sintéticos salvos neste navegador.</p>
      <Button type="button" className="min-h-11" aria-expanded={creating} disabled={!!patient && !selected}
        onClick={() => {setMessage(''); setCreating(value => !value)}}>Novo compromisso</Button>
    </div>
    {creating && (!patient || selected) && <AppointmentForm patients={targets} target={selected} actor={actor} unit={profile.unit.trim() || 'UBS Demonstrativa'}
      onCreated={() => {setCreating(false); setMessage('Compromisso salvo.')}}/>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {items.length ? <div className="grid min-w-0 gap-3 xl:grid-cols-2">{items.toReversed().map(item =>
      <AppointmentCard key={item.id} item={item} actor={actor} onUpdate={setMessage} showPatient={!patient}
        linkedPatientId={targets.find(target => target.key === item.patient.key)?.id}/>
    )}</div> : <p className="text-sm text-slate-600">Nenhum compromisso registrado.</p>}
  </section>
}
