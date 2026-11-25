'use client'

import {useEffect, useId, useRef, useState, type FormEvent} from 'react'
import FormDialog from '../ui/FormDialog'
import {Button} from '../ui/button'
import {chartCommand, type ChartEvent} from '../../lib/longitudinal'
import {chartLabels, definitions, type EditableKind, type Field} from './longitudinal-fields'
import {useLongitudinal} from './LongitudinalContext'

const errors: Record<string, string> = {
  CHART_UNAVAILABLE:'Não foi possível confirmar. Confira a sessão e tente novamente com os mesmos dados.',
  VERSION_CONFLICT:'Há uma versão mais recente. Feche o editor e abra o registro atualizado.',
  NO_CHANGE:'Nenhuma alteração identificada.',
  DOCUMENT_NOT_FOUND:'O PDF não está disponível para esta paciente. Atualize a lista de documentos.',
  REFERENCE_NOT_FOUND:'O registro associado não está disponível para esta paciente.',
  IDENTITY_CONFLICT:'CPF já associado a outro cadastro sintético.',
  DOSE_CORRECTION_REQUIRED:'Use Retificar e informe o motivo para mudar uma aplicação registrada.',
  DOSE_ALREADY_RECORDED:'Encontramos uma dose coincidente. Confira o histórico antes de registrar outra.',
  REASON_REQUIRED:'Informe o motivo para registrar esta mudança.',
  RESULT_REQUIRED:'Primeiro registre o resultado. Retificações exigem uma versão anterior.',
}
const control = 'min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-pink-600'
type ComponentDraft = {id: number; name: string; value: string; unit: string; reference: string}
const componentLabels = {name:'Componente', value:'Valor informado', unit:'Unidade informada', reference:'Referência do emissor'}

export type ChartEdit = {kind: EditableKind; current?: ChartEvent; initial?: Record<string,string>; correction?: boolean}

export default function LongitudinalEditor({edit, onClose, onSaved}: {edit: ChartEdit; onClose: () => void; onSaved: () => void}) {
  const fieldPrefix = useId()
  const chart = useLongitudinal()!
  const {kind,current} = edit
  const definition = definitions[kind]
  const initialData = current?.data as Record<string, unknown> | undefined
  const [fields,setFields] = useState<Record<string,string>>(() => ({
    ...Object.fromEntries(Object.entries(initialData ?? {}).flatMap(([key,value]) => key !== 'kind' && typeof value === 'string' ? [[key,value] as const] : [])),
    ...edit.initial,
  }))
  const [components,setComponents] = useState<ComponentDraft[]>(() =>
    current?.data.kind === 'resultado' ? current.data.components.map((item,id) => ({id,unit:'',reference:'',...item})) : [])
  const nextComponent = useRef(components.length)
  const [confirmed,setConfirmed] = useState(false)
  const [reason,setReason] = useState('')
  const [dirty,setDirty] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [fieldError,setFieldError] = useState('')
  const [validationAttempt,setValidationAttempt] = useState(0)
  const problem = useRef<HTMLParagraphElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const pending = useRef(false)
  const ids = useRef({entityId: current?.entityId ?? '', signature:'', operationId:''})
  const correction = !!edit.correction || kind === 'identidade'
  const disposition = !!current && ['medicacao','alergia','comorbidade','resultado'].includes(kind) &&
    'status' in current.data && (current.data.status !== fields.status || (current.data.kind === 'alergia' && current.data.confirmation !== fields.confirmation))
  const requiresReason = correction || (disposition && (kind !== 'resultado' || fields.status === 'retificado'))

  useEffect(() => {
    if (!error || busy) return
    const field = form.current?.elements.namedItem(fieldError)
    if (field instanceof HTMLElement) {
      field.scrollIntoView({block:'nearest'})
      field.focus({preventScroll:true})
    } else problem.current?.focus({preventScroll:true})
  }, [error,fieldError,validationAttempt,busy])

  function change(key: string, value: string) {
    setDirty(true)
    setFields(previous => {
      const result = {...previous,[key]:value}
      if (kind === 'vacina' && key === 'status') {
        if (value !== 'aplicada') {delete result.date;delete result.time}
        if (value !== 'agendada') delete result.scheduledDate
      }
      return result
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    setValidationAttempt(value => value + 1)
    const invalid = event.currentTarget.querySelector<HTMLInputElement>(':invalid:not(fieldset)')
    if (invalid) {
      setFieldError(invalid.name)
      const label = definition.fields.find(field => field.key === invalid.name)?.label
      setError(label ? 'Confira o campo ' + label.toLocaleLowerCase('pt-BR') + '.' : 'Confira o campo destacado.')
      return
    }
    setError('')
    setFieldError('')
    const data = Object.fromEntries(Object.entries(fields).map(([key,value]) => [key,value.trim()]).filter(([,value]) => value))
    const payload = {kind,...data,
      ...(kind === 'resultado' ? {components:components.map(({name,value,unit,reference}) => ({name,value,unit:unit || undefined,reference:reference || undefined}))} : {}),
    }
    if (kind === 'identidade' && data.cpf) payload.cpf = data.cpf.replace(/[.\-\s]/g,'')
    if (kind === 'identidade' && data.cns) payload.cns = data.cns.toUpperCase()
    if (kind === 'contato' && data.state) payload.state = data.state.toUpperCase()
    ids.current.entityId ||= crypto.randomUUID()
    const signature = JSON.stringify({payload,reason,correction})
    if (signature !== ids.current.signature) {
      ids.current.signature = signature
      ids.current.operationId = crypto.randomUUID()
    }
    const parsed = chartCommand.safeParse({operationId:ids.current.operationId,entityId:ids.current.entityId,
      expectedVersion:current?.version ?? 0, data:payload, correction, reason:reason.trim() || undefined})
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const path = issue.path[0] === 'data' ? issue.path.slice(1) : issue.path
      const key = path.join('.')
      setFieldError(key)
      setError(issue.code === 'custom' ? issue.message : 'Confira o campo ' + (definition.fields.find(field => field.key === key)?.label ?? 'indicado') + '.')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      await chart.write(parsed.data)
      onSaved()
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : ''
      if (code === 'VERSION_CONFLICT' || code === 'DOCUMENT_NOT_FOUND') chart.reload()
      setError(errors[code] ?? 'O registro foi recusado. Confira os campos e sua autorização.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function input(field: Field) {
    const {key,label,type,options,required} = field
    let values = options
    if (type === 'request' || type === 'encounter') values = chart.latest.flatMap(event => {
      if (type === 'request' && event.data.kind === 'pedido') return [[event.entityId,event.data.name] as const]
      if (type === 'encounter' && event.data.kind === 'consulta') return [[event.entityId,new Date(event.recordedAt).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'})] as const]
      return []
    })
    if (kind === 'vacina' && ((['date','time'].includes(key) && fields.status !== 'aplicada') || (key === 'scheduledDate' && fields.status !== 'agendada'))) return null
    const shared = {id:fieldPrefix+'-'+key, name:key, value:fields[key] ?? '', className:control,
      required:required || (kind === 'vacina' && (key === 'date' || key === 'scheduledDate')),
      'aria-invalid':fieldError === key || undefined,
      onChange:(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => change(key,event.target.value)}
    return <div key={key} className="grid min-w-0 gap-1 text-sm font-medium">
      <label htmlFor={shared.id}>{label}</label>
      {values ? <select {...shared}><option value="">Selecione</option>{values.map(([value,text]) =>
        <option key={value} value={value} disabled={kind==='resultado' && value==='retificado' && !current}>{text}</option>)}</select>
        : type === 'textarea' ? <textarea {...shared} maxLength={1500} rows={3}/>
        : <input {...shared} type={type ?? 'text'} maxLength={160}/>}
    </div>
  }

  return <FormDialog open dirty={dirty} busy={busy} onClose={onClose} title={current && correction ? 'Retificar ' + chartLabels[kind].toLocaleLowerCase('pt-BR') :
    current && !definition.singleton ? 'Atualizar ' + chartLabels[kind].toLocaleLowerCase('pt-BR') : definition.button} maxWidth="md"
    feedback={error && <p tabIndex={-1} ref={problem} role="alert" className="shrink-0 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</p>}>
    {requestClose => <>{kind === 'identidade' && <p className="mb-4 text-sm text-slate-600">A retificação vale para a ficha longitudinal. A identificação de emissão do PAP-ID continua vinculada ao cadastro de origem.</p>}
    <form ref={form} className="grid min-w-0 gap-4" onSubmit={submit} noValidate>
      <fieldset disabled={busy} className="grid min-w-0 gap-3 sm:grid-cols-2">
        {definition.fields.map(input)}
        {definition.pdf && <div className="grid min-w-0 gap-1 text-sm font-medium sm:col-span-2">
          <label htmlFor={fieldPrefix+'-pdf'}>{definition.pdf}</label>
          <select id={fieldPrefix+'-pdf'} name="documentId" className={control} value={fields.documentId ?? ''} onChange={event => change('documentId',event.target.value)}>
            <option value="">Sem vínculo</option>
            {fields.documentId && !chart.documents.some(doc => doc.id === fields.documentId && !doc.archived) &&
              <option value={fields.documentId}>Vínculo existente (PDF indisponível)</option>}
            {chart.documents.filter(doc => !doc.archived).map(doc => <option key={doc.id} value={doc.id}>{doc.name} · v{doc.version}</option>)}
          </select>
        </div>}
        {kind === 'resultado' && <div className="grid min-w-0 gap-3 sm:col-span-2">
          {components.map((item,index) => <fieldset key={item.id} className="grid min-w-0 gap-2 rounded-lg border p-3 sm:grid-cols-2">
            <legend className="px-1 text-sm">Componente {index+1}</legend>
            {Object.entries(componentLabels).map(([key,label]) => <label key={key} className="grid min-w-0 gap-1 text-sm">
              {label}<input name={`components.${index}.${key}`} className={control} maxLength={160} required={key==='name'||key==='value'} value={item[key as keyof Omit<ComponentDraft,'id'>]}
                onChange={event => {setDirty(true);setComponents(rows => rows.map(row => row.id === item.id ? {...row,[key]:event.target.value} : row))}}/>
            </label>)}
            <Button type="button" variant="outline" className="min-h-11" onClick={() => {setDirty(true);setComponents(rows => rows.filter(row => row.id !== item.id))}}>Remover componente</Button>
          </fieldset>)}
          <Button name="components" type="button" variant="outline" className="min-h-11 w-fit" disabled={components.length >= 30} onClick={() => {
            setDirty(true); const id = nextComponent.current++; setComponents(rows => [...rows,{id,name:'',value:'',unit:'',reference:''}])
          }}>Adicionar componente</Button>
        </div>}
        {kind === 'identidade' && <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="identityConfirmation" required checked={confirmed} onChange={event => {setConfirmed(event.target.checked);setDirty(true)}}/>
          Conferi a paciente e confirmo a retificação sintética.
        </label>}
        {(current || correction) && <label className="grid min-w-0 gap-1 text-sm font-medium sm:col-span-2">
          {requiresReason ? 'Justificativa obrigatória' : 'Motivo da alteração'}
          <textarea name="reason" value={reason} onChange={event => {setDirty(true);setReason(event.target.value)}} className={control} rows={2} maxLength={1500} required={requiresReason}/>
        </label>}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={requestClose}>Cancelar</Button>
      </div>
    </form></>}
  </FormDialog>
}
