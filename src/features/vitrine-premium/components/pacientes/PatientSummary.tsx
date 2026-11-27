'use client'

import {useId, useMemo, useState} from 'react'
import {CalendarDays, ChevronLeft, ChevronRight, FlaskConical, Stethoscope, Syringe} from 'lucide-react'
import {assessmentFlags, completeAssessments, recordedAssessments} from '../../lib/chart-assessment'
import {assessmentPresentation} from '../../lib/demo/assessment-presentation'
import {datingLabels,pregnancyAt} from '../../lib/gestational-dating'
import {formatDemoDate} from '../../lib/demo/validation'
import {appointmentKinds, appointmentStatuses, describeSlot, isPending, nextAppointments, useAgendaClock} from '../../lib/demo-agenda'
import {formatRecordTime} from '../../lib/registration-record'
import type {Atendimento} from '../../types/atendimento'
import type {Patient} from '../../types/paciente'
import usePatientAppointments, {type PatientAppointment} from '../agenda/usePatientAppointments'
import {Button} from '../ui/button'
import {useLongitudinal} from './LongitudinalContext'

const panel = 'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
const title = 'text-sm font-semibold text-slate-900'
const muted = 'text-sm text-slate-600'
const civil = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'})
const monthLabel = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})
const weekdays = ['D','S','T','Q','Q','S','S']
const category = (kind: PatientAppointment['kind']) => ({
  exame:{Icon:FlaskConical,color:'bg-violet-500'}, solicitacao:{Icon:FlaskConical,color:'bg-violet-500'},
  vacinacao:{Icon:Syringe,color:'bg-emerald-500'}, consulta:{Icon:Stethoscope,color:'bg-pink-500'},
  retorno:{Icon:CalendarDays,color:'bg-pink-500'},
})[kind]

function ScoreTrend({visits}: {visits: Atendimento[]}) {
  const label = useId()
  if (!visits.length) return <p className="my-4 text-sm text-slate-600">Nenhuma avaliação completa registrada.</p>
  const points = visits.map((visit,index) => ({
    visit,x:visits.length === 1 ? 185 : 42 + index * 282 / (visits.length - 1),
    y:96 - visit.assessment!.score! * 3.7,
  }))
  return <svg role="img" aria-labelledby={label} viewBox="0 0 365 125" className="mt-1 w-full max-h-44">
    <title id={label}>{visits.map(visit => formatDemoDate(civil.format(new Date(visit.dataHora)))+' · '+visit.assessment!.score).join('; ')}</title>
    {[0,7,14,21].map(value => <g key={value} className="text-slate-600">
      <text x="28" y={100-value*3.7} textAnchor="end" fill="currentColor" fontSize="10">{value}</text>
      <line x1="34" x2="340" y1={96-value*3.7} y2={96-value*3.7} stroke="currentColor" opacity=".22"/>
    </g>)}
    <polyline points={points.map(point => point.x+','+point.y).join(' ')} fill="none" stroke="#c41469" strokeWidth="2.5" strokeLinejoin="round"/>
    {points.map(({visit,x,y}) => <g key={visit.id} data-meows-recorded-point={visit.assessment!.score} className="text-slate-700">
      <circle cx={x} cy={y} r="4" fill="#c41469"/>
      <text x={x+7} y={y-3} fill="currentColor" fontSize="10">{visit.assessment!.score}</text>
      <text x={x} y="115" textAnchor="middle" fill="currentColor" fontSize="10">{formatDemoDate(civil.format(new Date(visit.dataHora))).slice(0,5)}</text>
    </g>)}
  </svg>
}

function AppointmentItem({event, open,pregnancy}: {event: PatientAppointment; open: (id: string) => void; pregnancy?:Patient['pregnancy']}) {
  const {Icon,color} = category(event.kind)
  const age = event.slot && pregnancy && pregnancyAt(pregnancy,event.slot.date).gestationalAge
  return <li className="min-w-0">
    <button type="button" onClick={() => open(event.id)} className="flex min-h-11 w-full min-w-0 items-start gap-2 rounded-lg px-1 py-2 text-left hover:bg-slate-50 focus-visible:outline-pink-600">
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-white ${color}`}><Icon size={13} aria-hidden/></span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-medium text-slate-900">{appointmentKinds[event.kind]}</span>
        <span className="block break-words text-xs text-slate-600">{describeSlot(event.slot)} · {appointmentStatuses[event.status]}</span>
        <span className="block text-xs text-slate-600">{event.origin}{age && age!=='Desconhecida' ? ' · IG prevista '+age : ''}</span>
      </span>
    </button>
  </li>
}

function Calendar({items, now, open,pregnancy}: {items: PatientAppointment[]; now: string; open: (id:string) => void; pregnancy:Patient['pregnancy']}) {
  const [month,setMonth] = useState(() => now.slice(0,7)+'-01')
  const [selected,setSelected] = useState(now)
  const date = new Date(month+'T12:00:00Z')
  const start = date.getUTCDay()
  const days = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()
  const events = useMemo(() => {
    const map = new Map<string, PatientAppointment[]>()
    for (const item of items) if (item.slot) map.set(item.slot.date,[...(map.get(item.slot.date) ?? []),item])
    return map
  }, [items])

  function shift(delta:number) {
    const next = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+delta,1)).toISOString().slice(0,10)
    setMonth(next)
    setSelected(next)
  }

  return <section className={panel}>
    <h2 className={title}>Calendário assistencial</h2>
    <div className="my-2 flex items-center justify-between gap-2">
      <Button type="button" className="min-h-11" variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => shift(-1)}><ChevronLeft/></Button>
      <p aria-live="polite" className="text-center text-sm font-medium capitalize">{monthLabel.format(date)}</p>
      <Button type="button" className="min-h-11" variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => shift(1)}><ChevronRight/></Button>
    </div>
    <div className="grid grid-cols-7 text-center">
      {weekdays.map((day,index) => <span className="text-xs text-slate-600" key={index}>{day}</span>)}
      {Array.from({length:start},(_,index) => <span key={'empty-'+index}/>)}
      {Array.from({length:days},(_,index) => {
        const day = month.slice(0,8)+String(index+1).padStart(2,'0')
        const scheduled = (events.get(day) ?? []).filter(isPending)
        return <button key={day} type="button" aria-pressed={day===selected} aria-current={day===now?'date':undefined}
          aria-label={formatDemoDate(day)+(scheduled.length ? ', '+scheduled.length+' planejados' : '')}
          className={`grid min-h-11 place-content-center gap-1 rounded-md text-xs hover:bg-pink-50 focus-visible:outline-pink-600 ${day===selected?'bg-pink-50 font-semibold text-pink-700':'text-slate-700'}`}
          onClick={() => setSelected(day)}>
          {index+1}
          <span className="flex justify-center gap-0.5" aria-hidden>{[...new Set(scheduled.map(item=>category(item.kind).color))].map(color=>
            <span key={color} className={`size-1.5 rounded-full ${color}`}/>)}</span>
        </button>
      })}
    </div>
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600" aria-label="Legenda do calendário">
      {(['consulta','exame','vacinacao'] as const).map(kind => <li key={kind} className="flex items-center gap-1">
        <span aria-hidden className={`size-2 rounded-full ${category(kind).color}`}/>{appointmentKinds[kind]}
      </li>)}
    </ul>
    <div className="mt-3 border-t border-slate-200 pt-2">
      <p className="text-xs font-medium">{formatDemoDate(selected)}</p>
      {events.has(selected) ? <ul>{events.get(selected)!.map(event => <AppointmentItem key={event.id} event={event} open={open} pregnancy={pregnancy}/>)}</ul> :
        <p className="mt-1 text-xs text-slate-600">Nenhum compromisso nesta data.</p>}
    </div>
  </section>
}

export default function PatientSummary({patient, onOpenAgenda}: {patient:Patient; onOpenAgenda:(id?:string)=>void}) {
  const items = usePatientAppointments(patient)
  const chart = useLongitudinal()
  const now = useAgendaClock()
  const next = nextAppointments(items,now).slice(0,3)
  const history = recordedAssessments(patient.encounters)
  const measured = completeAssessments(history).slice(-5)
  const latest = history.at(-1)
  const score = measured.at(-1)
  const old = measured.at(-2)
  const delta = score && old ? score.assessment!.score! - old.assessment!.score! : undefined
  const {flags,visit} = assessmentFlags(history)
  const activeMeds = chart?.latest.flatMap(event => event.data.kind === 'medicacao' && event.data.status === 'em_uso' ? [event.data.name] : []) ?? []
  return <div className="grid min-w-0 gap-4" data-assistential-summary>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <section className={panel}>
        <h2 className={title}>Score MEOWS atual</h2>
        {score ? <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="min-w-16 rounded-lg bg-pink-50 px-3 py-2 text-center text-4xl font-semibold text-pink-700" data-current-meows>{score.assessment!.score}</div>
          <div className="grid gap-1">
            <p className="text-sm font-medium">{assessmentPresentation(score.assessment!.classification).label}</p>
            <p className={muted}>{formatRecordTime(score.dataHora)}</p>
            {delta !== undefined && <p className="text-xs text-slate-600">{delta===0 ? 'Sem variação entre os dois últimos scores' : `Variação de ${delta>0?'+':''}${delta} no score`}</p>}
          </div>
        </div> : <p data-current-meows className="mt-4 text-lg font-medium">{latest ? assessmentPresentation(latest.classificacao).label : 'Não avaliado'}</p>}
        {latest && latest.assessment?.status !== 'CALCULADO' && <p className="mt-2 text-xs text-slate-600">Último registro {assessmentPresentation(latest.classificacao).label.toLocaleLowerCase('pt-BR')} · {formatRecordTime(latest.dataHora)}</p>}
        <details className="mt-2 text-xs text-slate-600"><summary className="min-h-11 cursor-pointer content-center">Origem do cálculo</summary><p>PAP-MEOWS v1.0, calculado a partir das medidas da consulta. Uso assistencial não homologado.</p></details>
      </section>
      <section className={panel}>
        <h2 className={title}>Tendência MEOWS</h2>
        <p className="mt-1 text-xs text-slate-600">Até cinco avaliações completas registradas</p>
        <ScoreTrend visits={measured}/>
      </section>
    </div>
    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <Calendar items={items} now={civil.format(new Date(now))} open={onOpenAgenda} pregnancy={patient.pregnancy}/>
      <section className={panel}>
        <h2 className={title}>Próximos compromissos</h2>
        {next.length ? <ul className="mt-2 divide-y divide-slate-100">{next.map(event => <AppointmentItem key={event.id} event={event} open={onOpenAgenda} pregnancy={patient.pregnancy}/>)}</ul>
          : <p className="mt-3 text-sm text-slate-600">Nenhum compromisso futuro registrado.</p>}
        <Button type="button" variant="ghost" onClick={() => onOpenAgenda()} className="mt-2 min-h-11 text-pink-700">Abrir agenda da paciente</Button>
      </section>
      <section className={panel}>
        <h2 className={title}>Resumo assistencial</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          <div><dt className="font-medium">DPP</dt><dd className="text-slate-600">{patient.pregnancy.dpp ? formatDemoDate(patient.pregnancy.dpp)+' · '+(patient.pregnancy.source && patient.pregnancy.source!=='dum' ? datingLabels[patient.pregnancy.source] : 'DUM '+formatDemoDate(patient.pregnancy.dum)) : 'Datação não informada'}</dd></div>
          <div><dt className="font-medium">Última avaliação</dt><dd className="text-slate-600">{latest ? formatRecordTime(latest.dataHora)+' · '+assessmentPresentation(latest.classificacao).label : 'Sem avaliação registrada'}</dd></div>
          <div><dt className="font-medium">Alergias conhecidas</dt><dd className="break-words text-slate-600">{patient.allergies.join(' · ') || 'Sem informação registrada'}</dd></div>
          <div><dt className="font-medium">Medicações em uso</dt><dd className="break-words text-slate-600">{activeMeds.join(' · ') || 'Sem registro longitudinal de uso atual'}</dd></div>
        </dl>
      </section>
    </div>
    {!!flags.length && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-600">
      Parâmetros sinalizados na avaliação demonstrativa de {formatRecordTime(visit!.dataHora)} · {flags.map(item=>item.parameter).join(', ')}.
    </p>}
  </div>
}
