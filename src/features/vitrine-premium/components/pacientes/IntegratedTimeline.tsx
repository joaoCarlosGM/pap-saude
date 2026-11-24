'use client'

import {useId, useState} from 'react'
import {agendaPatient, appointmentActions, appointmentKinds, useAppointments} from '../../lib/demo-agenda'
import {formatDemoDate} from '../../lib/demo/validation'
import {demoAuthors, formatRecordTime} from '../../lib/registration-record'
import type {Patient} from '../../types/paciente'
import type {ChartEvent} from '../../lib/longitudinal'
import {useCardService} from '../demo/CardServiceContext'
import {useLongitudinal} from './LongitudinalContext'
import {chartLabels} from './longitudinal-fields'
import {chartActions, chartActor} from './LongitudinalPanel'
import {Button} from '../ui/button'

const categories = {
  consulta:'Consulta', exames:'Exame', vacinacao:'Vacina', medicacoes:'Medicação', resumo:'Alergia, condição e cadastro',
  evolucao:'SOAP', documentos:'Documento', agenda:'Agenda',
}
export type TimelineTab = keyof typeof categories
const category: Record<ChartEvent['data']['kind'],TimelineTab> = {
  pedido:'exames', resultado:'exames', vacina:'vacinacao', contato:'resumo', identidade:'resumo', alergia:'resumo',
  historico:'resumo', comorbidade:'resumo', medicacao:'medicacoes', consulta:'consulta', soap:'evolucao', agenda:'agenda',
}
type TimelineEntry = {
  id:string; tab:TimelineTab; entityId:string; occurredAt:string; recordedAt:string; title:string; change?:string;
  author:string; source:string; version?:number; occurrencePrecision?:'day'|'time'
}

function chartEntry(event: ChartEvent): TimelineEntry {
  const {data} = event
  let title = chartLabels[data.kind]
  if ('name' in data && data.name && data.kind !== 'identidade') title += ' · '+data.name
  if (data.kind === 'agenda') title += ' · '+appointmentKinds[data.appointmentKind]
  const author = data.kind === 'soap' ? demoAuthors[data.author].name+' · '+chartActor(event.actor) : chartActor(event.actor)
  return {
    id:event.id, tab:category[data.kind], entityId:data.kind === 'soap' ? data.encounterId : event.entityId,
    occurredAt:event.occurredAt, occurrencePrecision:event.occurrencePrecision, recordedAt:event.recordedAt, title, author,
    change:event.actions.map(action => chartActions[action]).join(' · '),
    source:'Laboratório privado', version:event.version,
  }
}

export default function IntegratedTimeline({patient,onOpen}: {
  patient:Patient; onOpen:(tab:TimelineTab,id:string) => void
}) {
  const filterId = useId()
  const chart = useLongitudinal()
  const target = agendaPatient(patient,useCardService()?.people)
  const appointments = useAppointments()
  const [filter,setFilter] = useState<TimelineTab | ''>('')
  const recorded: TimelineEntry[] = []
  for (const event of chart?.snapshot.events ?? []) {
    recorded.push(chartEntry(event))
    if (event.data.kind === 'consulta') {
      for (const note of event.data.record.soapNotes ?? []) recorded.push({
        id:'soap-'+note.id, tab:'evolucao', entityId:event.entityId, title:'Anotação SOAP',
        author:demoAuthors[note.author].name, source:'Registro da Vitrine · laboratório privado',
        occurredAt:note.recordedAt, recordedAt:event.recordedAt, change:'Criação',
      })
    }
  }
  for (const item of patient.encounters ?? []) {
    if (item.assessmentSource === 'ILLUSTRATIVE_FIXTURE' || recorded.some(event => event.entityId === item.id && event.tab === 'consulta')) continue
    recorded.push({id:item.id, entityId:item.id, tab:'consulta', occurredAt:item.dataHora, recordedAt:item.dataHora,
      title:'Consulta demonstrativa', author:item.profissional.nome, source:'Registro da Vitrine · memória da aba'})
    for (const note of item.registration?.soapNotes ?? []) recorded.push({
      id:'soap-'+note.id, entityId:item.id, tab:'evolucao', title:'Anotação SOAP',
      occurredAt:note.recordedAt, recordedAt:note.recordedAt, author:demoAuthors[note.author].name, source:'Registro da Vitrine · memória da aba',
    })
  }
  for (const doc of chart?.snapshot.documents ?? []) recorded.push({
    id:doc.id, tab:'documentos', entityId:doc.entityId, title:doc.action === 'created' ? 'PDF sintético anexado' : 'PDF sintético arquivado',
    author:chartActor(doc.actor), source:'Documentos privados', occurredAt:doc.recordedAt, recordedAt:doc.recordedAt,
  })
  for (const item of appointments) {
    if (item.patient.key !== target?.key) continue
    for (const event of item.events) recorded.push({
      id:event.id, tab:'agenda', entityId:item.id, title:appointmentActions[event.action], author:event.actor,
      source:'Agenda da Vitrine · navegador', occurredAt:event.at, recordedAt:event.at,
    })
  }
  const rows = [...new Map(recorded.map(item => [item.id,item])).values()]
    .filter(item => !filter || item.tab === filter)
    .sort((a,b) => b.occurredAt.localeCompare(a.occurredAt) || b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id))
  return <section className="mb-5 grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap justify-between gap-3">
      <h2 className="font-semibold">Eventos registrados</h2>
      <div className="grid gap-1 text-sm"><label htmlFor={filterId}>Filtrar eventos</label>
        <select id={filterId} className="min-h-11 max-w-full rounded-lg border px-3 text-base" value={filter} onChange={event => setFilter(event.target.value as TimelineTab | '')}>
          <option value="">Todas as categorias</option>
          {Object.entries(categories).map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
    </div>
    {chart?.loading && <p role="status">Carregando eventos do laboratório…</p>}
    {chart?.error && <p role="alert">Eventos do laboratório indisponíveis.</p>}
    {!chart?.loading && !rows.length && <p className="text-sm text-slate-600">Nenhum evento registrado nesta seleção.</p>}
    <ol className="grid gap-3" aria-label="Eventos do prontuário">
      {rows.map(item => <li key={item.id} className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm">
        <p className="break-words font-semibold">{item.title}</p>
        <p className="break-words text-slate-600">{[item.change,item.version && 'v'+item.version,item.author,item.source].filter(Boolean).join(' · ')}</p>
        <p className="text-slate-600">Ocorrência <time dateTime={item.occurredAt}>{item.occurrencePrecision === 'day' ? formatDemoDate(item.occurredAt.slice(0,10)) : formatRecordTime(item.occurredAt)}</time> · Registro <time dateTime={item.recordedAt}>{formatRecordTime(item.recordedAt)}</time></p>
        <Button className="min-h-11 w-fit" type="button" variant="outline" onClick={() => onOpen(item.tab,item.entityId)}>Abrir registro</Button>
      </li>)}
    </ol>
  </section>
}
