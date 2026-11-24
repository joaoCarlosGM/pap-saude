'use client'

import {useId, useRef, useState} from 'react'
import {demoAuthors, createSoapNote, formatRecordTime, soapFields, type DemoAuthor, type SoapContent, type SoapNote} from '../../lib/registration-record'
import {textAreaClass} from './RecordFields'
import Select from '../ui/Select'
import {Button} from '../ui/button'

const fields = Object.keys(soapFields) as Array<keyof SoapContent>
const emptyContent: SoapContent = {subjective: '', objective: '', assessment: '', plan: ''}

export function SoapEditor({onAppend, onPendingChange}: {
  onAppend: (note: SoapNote) => void | Promise<void>
  onPendingChange?: (pending: boolean) => void
}) {
  const id = useId()
  const [author, setAuthor] = useState<DemoAuthor | ''>('')
  const [content, setContent] = useState(emptyContent)
  const hasText = Object.values(content).some(value => value.trim())

  const [busy,setBusy] = useState(false)
  const [error,setError] = useState(false)
  const pending = useRef<{signature:string; note:SoapNote} | undefined>(undefined)
  const sending = useRef(false)
  async function append() {
    if (!author || !hasText || sending.current) return
    sending.current = true
    setBusy(true)
    setError(false)
    const signature = JSON.stringify({author,content})
    if (pending.current?.signature !== signature) pending.current = {signature,note:createSoapNote(author,content)}
    try {
      await onAppend(pending.current.note)
      pending.current = undefined
      setContent(emptyContent)
      setAuthor('')
      onPendingChange?.(false)
    } catch {setError(true)}
    finally {sending.current = false;setBusy(false)}
  }

  return <fieldset disabled={busy} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-3 sm:p-4">
    <legend className="px-1 text-sm font-semibold">Nova anotação SOAP</legend>
    <Select id={id} label="Perfil profissional sintético" className="min-h-11 text-base" value={author}
      onChange={event => setAuthor(event.target.value as DemoAuthor | '')}>
      <option value="">Selecione</option>
      {Object.entries(demoAuthors).map(([key, person]) => <option key={key} value={key}>{person.category} · {person.name}</option>)}
    </Select>
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(field => <label key={field} className="grid gap-1 text-sm font-medium">
        {soapFields[field]}
        <textarea rows={2} className={textAreaClass} maxLength={2000} value={content[field]} onChange={event => {
          const next = {...content, [field]: event.target.value}
          setContent(next)
          onPendingChange?.(Object.values(next).some(value => value.trim()))
        }}/>
      </label>)}
    </div>
    {error && <p role="alert" className="text-sm text-rose-700">Não foi possível confirmar a anotação. Confira a sessão e tente novamente.</p>}
    <Button type="button" variant="outline" className="min-h-11 justify-self-start" disabled={!hasText || !author} onClick={() => void append()}>Adicionar anotação</Button>
  </fieldset>
}

export function SoapHistory({notes, legacy}: {notes?: readonly SoapNote[]; legacy?: string}) {
  if (!notes?.length && !legacy?.trim()) return <p className="text-sm text-slate-600">Sem anotações registradas.</p>
  return <ol className="grid gap-3">
    {legacy?.trim() && <li className="rounded-lg bg-slate-50 p-3 text-sm">
      <p className="font-medium">Observações do registro anterior</p>
      <p className="whitespace-pre-wrap break-words">{legacy}</p>
    </li>}
    {notes?.toSorted((a,b) => a.recordedAt.localeCompare(b.recordedAt)).map(note => {
      const author = demoAuthors[note.author]
      return <li key={note.id} className="min-w-0 rounded-lg border border-slate-200 p-3 text-sm">
        <p className="font-semibold">{author.name} · {author.category}</p>
        <time className="text-slate-600" dateTime={note.recordedAt}>{formatRecordTime(note.recordedAt)}</time>
        <dl className="mt-2 space-y-2">
          {fields.filter(field => note.content[field].trim()).map(field => <div key={field}>
            <dt className="font-medium">{soapFields[field]}</dt>
            <dd className="whitespace-pre-wrap break-words">{note.content[field]}</dd>
          </div>)}
        </dl>
      </li>
    })}
  </ol>
}
