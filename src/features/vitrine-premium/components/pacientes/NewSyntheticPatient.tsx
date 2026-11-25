'use client'

import {useId, useRef, useState} from 'react'
import Link from 'next/link'
import {useDemo} from '../demo/DemoProvider'
import {useCardService, type PatientCreation} from '../demo/CardServiceContext'
import FormDialog from '../ui/FormDialog'
import Input from '../ui/Input'
import {Button} from '../ui/button'
import {reviewPatientInput,invalidSyntheticCpf} from '../../lib/review-registry'

function exampleDocument() {
  let document: string
  do {document='98'+String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000000).padStart(9,'0')}
  while(!invalidSyntheticCpf(document))
  return document
}

export default function NewSyntheticPatient() {
  const {publishNotice} = useDemo()
  const service = useCardService()
  const [open,setOpen] = useState(false)
  const [name,setName] = useState('Gestante Sintética ')
  const [birthDate,setBirth] = useState('1998-08-14')
  const [document,setDocument] = useState('')
  const [consent,setConsent] = useState(false)
  const [dirty,setDirty] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [created,setCreated] = useState<PatientCreation|null>(null)
  const attempt = useRef<{signature:string;id:string} | null>(null)
  const formId = useId()

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!service || busy) return
    const result = reviewPatientInput.safeParse({name,birthDate,document,syntheticConsent:consent})
    if (!result.success) {
      setError('Informe o nome sintético, a data fictícia e um documento de teste iniciado por 98 com verificador inválido.')
      return
    }
    const signature = JSON.stringify(result.data)
    if (attempt.current?.signature !== signature) attempt.current = {signature,id:crypto.randomUUID()}
    setBusy(true)
    setError('')
    try {
      const registration = await service.create(result.data,attempt.current.id)
      setCreated(registration)
      const {patient} = registration
      if ('patientId' in patient) publishNotice({id:'patient-'+patient.patientId, category:'Pacientes', title:'Cadastro concluído',
        summary:'Um cadastro sintético está disponível.',date:new Date().toISOString(),href:'/vitrine/pacientes/'+patient.patientId})
    } catch {setError('Cadastro sem confirmação. Confira os dados ou tente novamente.')}
    finally {setBusy(false)}
  }

  async function recover(patientId: string) {
    if (!service || busy) return
    setBusy(true)
    setError('')
    try {
      await service.issueInitial(patientId)
      setCreated(current => current && {...current,issuance:'issued'})
    } catch {setError('Emissão ainda sem confirmação. Confira a sessão ou consulte o histórico em Documentos.')}
    finally {setBusy(false)}
  }

  function start() {
    setOpen(true)
    setCreated(null)
    setError('')
    setName('Gestante Sintética ')
    setBirth('1998-08-14')
    setDocument(exampleDocument())
    setConsent(false)
    setDirty(false)
    attempt.current=null
  }

  const patient = created?.patient
  return <>
    <Button variant="outline" disabled={!service} onClick={start}>Cadastrar nova gestante</Button>
    <FormDialog open={open} dirty={dirty && !created} busy={busy} onClose={() => setOpen(false)}
      title="Nova gestante sintética" maxWidth="md"
      feedback={error && <p role="alert" className="bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}>
      {patient && 'patientId' in patient ? <div className="grid gap-3">
        <p role="status">Cadastro confirmado no PostgreSQL exclusivo.</p>
        <p>{patient.name}</p>
        {created?.issuance==='issued' ? <p role="status" className="text-emerald-600">PAP-Gest emitida.</p> : <>
          <p className="text-sm text-slate-600">Emissão da PAP-Gest pendente.</p>
          <Button variant="outline" disabled={busy || !service} className="min-h-11 w-fit" onClick={() => void recover(patient.patientId)}>Tentar emitir PAP-Gest</Button>
        </>}
        <Link href={'/vitrine/pacientes/'+patient.patientId+'?aba=documentos'} className="inline-flex min-h-11 items-center text-pink-700 underline">Abrir prontuário e Documentos</Link>
      </div> : <form onChange={() => setDirty(true)} onSubmit={save} className="grid gap-3">
        <p className="text-sm text-slate-600">Use somente dados de teste.</p>
        <Input id={formId+'name'} label="Nome sintético" required value={name} onChange={e=>setName(e.target.value)} maxLength={80}/>
        <Input id={formId+'birth'} label="Nascimento fictício" type="date" required value={birthDate} onChange={e=>setBirth(e.target.value)}/>
        <Input id={formId+'document'} label="Documento fictício98…" required value={document} maxLength={11} onChange={e=>setDocument(e.target.value.replace(/\D/g,''))}/>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Confirmo que são dados inteiramente sintéticos.</label>
        <Button type="submit" className="min-h-11 w-fit" disabled={busy||!service}>{busy?'Salvando…':'Salvar gestante sintética'}</Button>
      </form>}
    </FormDialog>
  </>
}
