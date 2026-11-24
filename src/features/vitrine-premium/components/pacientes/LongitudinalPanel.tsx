'use client'

import {useState} from 'react'
import {Button} from '../ui/button'
import {formatDemoDate} from '../../lib/demo/validation'
import {formatRecordTime} from '../../lib/registration-record'
import type {ChartData, ChartEvent} from '../../lib/longitudinal'
import LongitudinalEditor, {type ChartEdit} from './LongitudinalEditor'
import {useLongitudinal} from './LongitudinalContext'
import {chartLabels, definitions, type EditableKind} from './longitudinal-fields'
import type {AgendaDraft} from '../agenda/AgendaPanel'

export const chartActions = {
  created:'Criação', updated:'Atualização', corrected:'Retificação',
  status_changed:'Mudança de situação', linked:'Vínculo com PDF', unlinked:'Desvinculação de PDF',
}
export const chartActor = (actor: string) => actor === 'PRIVATE_SESSION' ? 'Operador da sessão privada' : actor

function displayFields(data: ChartData) {
  if (data.kind === 'consulta' || data.kind === 'soap' || data.kind === 'agenda') return []
  return definitions[data.kind].fields.flatMap(field => {
    if (['request','encounter'].includes(field.type ?? '')) return []
    const value = (data as Record<string, unknown>)[field.key]
    if (typeof value !== 'string') return []
    return [[field.label, field.type === 'date' ? formatDemoDate(value) : field.options?.find(([key]) => key === value)?.[1] ?? value]]
  })
}

function Values({data}: {data: ChartData}) {
  const chart = useLongitudinal()!
  const fields = displayFields(data)
  const documentId = 'documentId' in data ? data.documentId : undefined
  const doc = chart.documents.find(item => item.id === documentId)
  const requestId = data.kind === 'resultado' ? data.requestId : undefined
  const request = chart.latest.find(event => event.entityId === requestId)?.data
  return <>
    <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map(([label,value]) => <div key={label} className="min-w-0">
        <dt className="text-xs text-slate-600">{label}</dt>
        <dd className="break-words whitespace-pre-line text-sm text-slate-900">{value}</dd>
      </div>)}
    </dl>
    {data.kind === 'alergia' && data.confirmation !== 'descartada' && data.status !== 'inativa' &&
      chart.latest.some(event => event.data.kind === 'historico' && event.data.allergy === 'ausencia_confirmada') &&
      <p className="text-sm text-amber-800">Há registros divergentes sobre alergias. Confira as fontes e o histórico.</p>}
    {request?.kind === 'pedido' && <p className="text-sm">Solicitação associada · <a className="text-pink-700 underline" href={'#registro-'+requestId}>{request.name}</a></p>}
    {data.kind === 'resultado' && <div className="grid gap-2">
      {data.components.map((value,index) => <dl key={index} className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-4">
        {[['Componente',value.name],['Valor informado',value.value],['Unidade',value.unit],['Referência do emissor',value.reference]].map(([label,text]) =>
          <div key={label} className="min-w-0"><dt className="text-xs text-slate-600">{label}</dt><dd className="break-words">{text ?? 'Não informado'}</dd></div>)}
      </dl>)}
      {data.status === 'pendente' && <p className="text-sm text-slate-600">Resultado pendente de registro.</p>}
    </div>}
    {documentId && <div className="text-sm">
      <span className="break-words">PDF · {doc?.name ?? 'indisponível'} {doc?.archived && '· Arquivado'}</span>
      {doc && !doc.archived && <div className="flex flex-wrap gap-3">
        <a href={doc.url} rel="noreferrer" target="_blank" className="inline-flex min-h-11 items-center text-pink-700 underline">Abrir PDF original</a>
        <a href={doc.downloadUrl} className="inline-flex min-h-11 items-center text-pink-700 underline">Baixar PDF privado</a>
      </div>}
    </div>}
  </>
}

function Entry({event, edit, onSchedule}: {
  event: ChartEvent; edit: (value: ChartEdit) => void; onSchedule?: (value: AgendaDraft) => void
}) {
  const chart = useLongitudinal()!
  const {data,entityId,version,recordedAt} = event
  if (data.kind === 'consulta' || data.kind === 'soap' || data.kind === 'agenda') return null
  const kind = data.kind
  const title = 'name' in data && data.name && kind !== 'identidade' ? data.name : chartLabels[kind]
  const history = chart.snapshot.events.filter(item => item.entityId === entityId)
  const result = kind === 'pedido' && chart.latest.some(item => item.data.kind === 'resultado' && item.data.requestId === entityId && item.data.status !== 'pendente')
  return <article id={'registro-'+entityId} tabIndex={-1} aria-label={title} className="grid min-w-0 scroll-mt-5 gap-2 rounded-lg border border-slate-200 p-3 sm:p-4">
    <h4 className="break-words font-semibold">{title}</h4>
    <Values data={data}/>
    {kind === 'pedido' && (!result ? <p className="text-sm text-slate-600">Sem resultado estruturado registrado.</p> :
      <p className="text-sm text-slate-600">Há resultado vinculado nesta aba.</p>)}
    <p className="text-xs text-slate-600">Versão {version} · {chartActor(event.actor)} · {formatRecordTime(recordedAt)}</p>
    <div className="flex flex-wrap gap-2">
      {!definitions[kind].singleton && <Button className="min-h-11 whitespace-normal" type="button" variant="outline" onClick={() => edit({kind,current:event})}>Atualizar</Button>}
      {!definitions[kind].singleton && <Button className="min-h-11 whitespace-normal" type="button" variant="outline" onClick={() => edit({kind,current:event,correction:true})}>Retificar</Button>}
      {kind === 'pedido' && <Button className="min-h-11 whitespace-normal" type="button" variant="outline" onClick={() => edit({
        kind:'resultado',initial:{name:data.name,requestId:entityId},
      })}>Registrar resultado deste pedido</Button>}
      {kind === 'vacina' && onSchedule && ['agendada','pendente','desconhecida'].includes(data.status) &&
        <Button className="min-h-11 whitespace-normal" type="button" variant="outline" onClick={() => onSchedule({date:data.scheduledDate, reason:'Vacinação · '+data.name+' · '+data.dose, vaccineId:entityId})}>Agendar dose</Button>}
    </div>
    <details>
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Histórico ({history.length})</summary>
      <ol className="grid gap-3">
        {history.map(item => <li key={item.id} className="grid min-w-0 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
          <p>Versão {item.version} · {item.actions.map(action => chartActions[action]).join(' · ')}</p>
          <p>{formatRecordTime(item.recordedAt)} · {chartActor(item.actor)}</p>
          {item.reason && <p className="break-words">Motivo · {item.reason}</p>}
          <Values data={item.data}/>
        </li>)}
      </ol>
    </details>
  </article>
}

const emptyState: Partial<Record<EditableKind,string>> = {
  vacina:'Sem dose registrada no prontuário.', medicacao:'Sem informação de medicação registrada no prontuário.',
  alergia:'Sem informação de alergia registrada no prontuário.', comorbidade:'Sem informação de comorbidade registrada no prontuário.',
}

export default function LongitudinalPanel({kinds, onSchedule}: {
  kinds: readonly EditableKind[]; onSchedule?: (value: AgendaDraft) => void
}) {
  const chart = useLongitudinal()
  const [edit,setEdit] = useState<ChartEdit>()
  const [message,setMessage] = useState('')
  if (!chart?.enabled) return null
  if (chart.loading) return <p role="status" className="mb-4 text-sm">Carregando prontuário sintético…</p>
  if (chart.error) return <div className="mb-4 flex flex-wrap items-center gap-3">
    <p role="alert" className="text-sm text-rose-700">Prontuário privado indisponível.</p>
    <Button className="min-h-11 whitespace-normal" type="button" variant="outline" onClick={chart.reload}>Tentar novamente</Button>
  </div>
  function open(value: ChartEdit) {setEdit(value);setMessage('')}
  return <section className="mb-5 grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Prontuário longitudinal sintético">
    {kinds.map(kind => {
      const definition = definitions[kind]
      const rows = chart.latest.filter(event => event.data.kind === kind)
      return <div key={kind} className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{chartLabels[kind]}</h3>
          <Button className="min-h-11 whitespace-normal" type="button" variant={definition.singleton ? 'outline':'default'} onClick={() => open({kind,current:definition.singleton?rows[0]:undefined})}>{definition.button}</Button>
        </div>
        {rows.length === 0 && emptyState[kind] && <p className="text-sm text-slate-600">{emptyState[kind]}</p>}
        <div className="grid min-w-0 gap-3">{rows.map(event => <Entry key={event.entityId} event={event} edit={open} onSchedule={onSchedule}/>)}</div>
      </div>
    })}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {edit && <LongitudinalEditor edit={edit} onClose={() => setEdit(undefined)} onSaved={() => {
      setEdit(undefined);setMessage('Registro sintético salvo no laboratório privado.')
    }}/>}
  </section>
}
