'use client'

import {useEffect, useId, useRef, useState} from 'react'
import Link from 'next/link'
import {ContactRound, Eye, FileText} from 'lucide-react'
import {usePrivateReviewAvailable} from '../protocolos/OriginalDocumentContext'
import {useDemo} from '../demo/DemoProvider'
import {useCardService} from '../demo/CardServiceContext'
import {Button} from '../ui/button'
import FormDialog from '../ui/FormDialog'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import OriginalPdfViewer from '../protocolos/OriginalPdfViewer'
import PatientCardIssuer from './PatientCardIssuer'
import CardViewer from './CardViewer'
import {documentCategories, documentLabel, type ReviewAttachment, type ReviewCard} from '../../lib/review-registry'
import {formatRecordTime} from '../../lib/registration-record'

const cardRow = 'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

export default function PrivatePatientDocuments({patientId}: {patientId:string}) {
  const {publishNotice} = useDemo()
  const canAuthorize = usePrivateReviewAvailable()
  const service = useCardService()
  const listDocuments = service?.documents
  const [documents,setDocuments] = useState<ReviewAttachment[]>([])
  const [selected,setSelected] = useState<ReviewAttachment|null>(null)
  const [preview,setPreview] = useState<ReviewCard|null>(null)
  const [archive,setArchive] = useState<ReviewAttachment|null>(null)
  const [adding,setAdding] = useState(false)
  const [error,setError] = useState('')
  const [clock,setClock] = useState(Date.now)
  const [archiving,setArchiving] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()),5000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!listDocuments) return
    let alive = true
    void listDocuments(patientId).then(rows => {if (alive) setDocuments(rows)})
      .catch(() => {if (alive) setError('Documentos privados indisponíveis. Confira a sessão.')})
    return () => {alive=false}
  }, [patientId,listDocuments])

  const history = service?.history.filter(card => card.patientId===patientId) ?? []
  const current = history.find(card => !card.revoked && Date.parse(card.expiresAt)>clock && card.url)
  const attachments = service ? documents : []

  return <div className="grid min-w-0 gap-4" data-private-patient-documents>
    <section className={cardRow} aria-label="PAP-Gest">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pink-50 text-pink-700"><ContactRound size={18} aria-hidden/></span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">PAP-Gest</h2>
            <p className="text-xs text-slate-600">{current ? 'Ativa até '+formatRecordTime(current.expiresAt) : 'Carteirinha digital da gestante'}</p>
          </div>
        </div>
        {current && <Button variant="outline" className="min-h-11" onClick={() => setPreview(current)}><Eye size={16} aria-hidden/>Visualizar PAP-Gest</Button>}
      </div>
      {!service ? <p className="mt-3 text-sm text-slate-600">{canAuthorize ? <Link href="/vitrine/configuracoes" className="text-pink-700 underline">Autorizar consulta privada</Link> : 'Disponível no laboratório privado.'}</p> :
        <div className="mt-3 grid gap-2">
          <PatientCardIssuer patientId={patientId} active={!!current}/>
          <details>
            <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Histórico de emissões ({history.length})</summary>
            <ol className="grid gap-2">{history.map(card => <li key={card.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              {card.revoked?'Revogada':Date.parse(card.expiresAt)<=clock?'Expirada':'Ativa'} · Emissão {card.issuedAt?formatRecordTime(card.issuedAt):'não registrada no legado'} · Validade {formatRecordTime(card.expiresAt)}
            </li>)}</ol>
          </details>
          {preview && current?.id===preview.id && <CardViewer key={preview.id} card={current} onClose={() => setPreview(null)}/>}
        </div>}
    </section>
    <section className="grid min-w-0 gap-3" aria-label="Documentos anexados">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Documentos anexados</h2>
        {service && <Button type="button" className="min-h-11" onClick={() => setAdding(true)}>Adicionar documento</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!attachments.length && <p className="text-sm text-slate-600">Nenhum PDF privado anexado a esta paciente.</p>}
      {attachments.map(document => <article key={document.id} id={'registro-'+document.id} tabIndex={-1} className={cardRow}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600"><FileText size={16} aria-hidden/></span>
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold">{document.name}</h3>
            <p className="text-xs text-slate-600">{documentLabel(document.category)} · v{document.version} · {document.pages} página(s) · {document.archived?'Arquivado':'Disponível'}</p>
          </div>
        </div>
        {!document.archived && <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => setSelected(document)}>Visualizar PDF privado</Button>
          <a href={document.downloadUrl} className="inline-flex min-h-11 items-center px-2 text-sm text-pink-700 underline">Baixar PDF privado</a>
          <Button variant="outline" className="min-h-11" onClick={() => {setError('');setArchive(document)}}>Arquivar</Button>
        </div>}
      </article>)}
    </section>
    {adding && service && <AddDocument documents={attachments} onClose={() => setAdding(false)} onSave={async ({file,category,version,operation}) => {
      await service.upload(patientId,file,category,operation,version || undefined)
      setDocuments(await service.documents(patientId))
      publishNotice({id:'attachment-'+operation, category:'Documentos', title:'Documento anexado',
        summary:'Um PDF sintético está disponível em Documentos.',date:new Date().toISOString(),href:'/vitrine/pacientes/'+patientId+'?aba=documentos'})
      setAdding(false)
    }}/>}
    {selected && service && <Modal open onClose={() => setSelected(null)} title="Documento sintético privado" maxWidth="xl">
      <OriginalPdfViewer document={{...selected,filename:selected.name,version:String(selected.version)}}/>
    </Modal>}
    {archive && service && <Modal open onClose={() => {if (!archiving) setArchive(null)}} title="Arquivar documento sintético?" maxWidth="sm">
      <p className="mb-3 text-sm">O histórico será preservado e a abertura do PDF ficará bloqueada.</p>
      {error && <p role="alert" className="mb-2 text-sm text-rose-600">{error}</p>}
      <Button disabled={archiving} onClick={async () => {
        setArchiving(true)
        setError('')
        try {
          await service.archive(patientId,archive.id)
          setDocuments(await service.documents(patientId))
          setArchive(null)
        } catch {setError('Arquivamento sem confirmação.')}
        finally {setArchiving(false)}
      }}>Confirmar arquivamento</Button>
    </Modal>}
  </div>
}

function AddDocument({documents,onClose,onSave}: {documents: ReviewAttachment[]; onClose:()=>void;
  onSave:(value:{file:File;category:string;version:string;operation:string})=>Promise<void>}) {
  const id = useId()
  const [file,setFile] = useState<File|null>(null)
  const [category,setCategory] = useState<string>(documentCategories[0])
  const [version,setVersion] = useState('')
  const [consent,setConsent] = useState(false)
  const [dirty,setDirty] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const operation = useRef('')
  const versions = [...new Map(documents.filter(document => !document.archived).toReversed().map(document => [document.groupId,document])).values()]
  return <FormDialog open onClose={onClose} dirty={dirty} busy={busy} title="Adicionar documento" maxWidth="md"
    feedback={error && <p role="alert" className="bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}>
    {requestClose => <form className="grid gap-4" onChange={() => {setDirty(true);operation.current=''}} onSubmit={async event => {
      event.preventDefault()
      if (!file || !consent || busy) return
      setBusy(true)
      setError('')
      operation.current ||= crypto.randomUUID()
      try {await onSave({file,category,version,operation:operation.current})}
      catch {setError('Envio não confirmado. Confira a sessão e use um PDF sintético de até 5 MB e 50 páginas.')}
      finally {setBusy(false)}
    }}>
      <label className="text-sm">PDF sintético (até 5 MB)
        <input className="mt-1 block min-h-11 w-full text-sm" aria-label="PDF sintético da paciente" type="file" accept="application/pdf,.pdf"
          onChange={event => setFile(event.target.files?.[0] ?? null)}/>
      </label>
      <Select id={id+'category'} label="Categoria" value={category} onChange={event => setCategory(event.target.value)} className="min-h-11 text-base">
        {documentCategories.map(category => <option key={category} value={category}>{documentLabel(category)}</option>)}
      </Select>
      <Select id={id+'version'} label="Versão" value={version} onChange={event => setVersion(event.target.value)} className="min-h-11 text-base">
        <option value="">Novo documento</option>
        {versions.map(document => <option key={document.groupId} value={document.groupId}>Nova versão de {document.name}</option>)}
      </Select>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/>Confirmo que o PDF não contém identificação pessoal ou dados clínicos reais.
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" disabled={busy||!file||!consent}>{busy?'Enviando…':'Enviar PDF privado'}</Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={requestClose}>Cancelar</Button>
      </div>
    </form>}
  </FormDialog>
}
