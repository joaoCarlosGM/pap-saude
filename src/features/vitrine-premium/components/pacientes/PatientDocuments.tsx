'use client'

import {useState} from 'react'
import {ContactRound,Eye,FileText} from 'lucide-react'
import Modal from '../ui/Modal'
import {Button} from '../ui/button'
import {useCardService} from '../demo/CardServiceContext'
import {formatDemoDate} from '../../lib/demo/validation'
import type {Patient,PatientDocument} from '../../types/paciente'
import PrivatePatientDocuments from './PrivatePatientDocuments'

function PresentationCard({patient}: {patient:Patient}) {
  const [side,setSide]=useState<'front'|'back'|null>(null)
  return <>
    <section aria-label="PAP-Gest" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-pink-50 text-pink-700"><ContactRound size={18} aria-hidden/></span>
        <div><h2 className="text-sm font-semibold">PAP-Gest</h2><p className="text-xs text-slate-600">Carteirinha do cenário</p></div>
      </div>
      <Button variant="outline" className="min-h-11" onClick={()=>setSide('front')}>Visualizar PAP-Gest do cenário</Button>
    </section>
    <Modal open={!!side} onClose={()=>setSide(null)} title="PAP-Gest do cenário">
      <div className="mb-3 flex gap-2">
        {(['front','back'] as const).map(face=><Button type="button" className="min-h-11" variant={face===side?'default':'outline'} key={face}
          aria-pressed={face===side} onClick={()=>setSide(face)}>{face==='front'?'Frente':'Verso'}</Button>)}
      </div>
      <div className="rounded-2xl border border-pink-200 bg-pink-50 p-5" data-presentation-card>
        <p className="mb-3 text-lg font-semibold text-pink-800">PAP-Gest</p>
        {side==='front' ? <dl className="grid gap-2 text-sm">
          <div><dt className="text-slate-600">Gestante</dt><dd className="font-medium">{patient.nome}</dd></div>
          <div><dt className="text-slate-600">Data provável do parto</dt><dd>{formatDemoDate(patient.pregnancy.dpp)}</dd></div>
        </dl> : <p className="text-sm text-slate-700">Modelo de apresentação, sem QR ou credencial de acesso.</p>}
      </div>
    </Modal>
  </>
}

export default function PatientDocuments({patient}:{patient:Patient}) {
  const authorized=useCardService()
  const [selected,setSelected]=useState<PatientDocument|null>(null)
  return <>
    {patient.scenarioReference && !authorized ? <PresentationCard patient={patient}/> : <PrivatePatientDocuments patientId={patient.id}/>}
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {!patient.documents.length&&<p className="text-sm text-slate-500">Nenhum documento demonstrativo registrado.</p>}
      {patient.documents.map(document=><article key={document.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><FileText size={16} aria-hidden/></span>
          <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-700">{document.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{document.description}</p></div>
        </div>
        <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={()=>setSelected(document)}><Eye size={15} aria-hidden/>Visualizar</Button>
      </article>)}
    </div>
    <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected?.title} description="Documento do cenário">
      {selected && <div className="rounded-xl border border-slate-200 bg-white p-4" data-presentation-document>
        <p className="font-medium">{patient.nome}</p>
        <p className="mt-2 text-sm text-slate-700">{selected.description}</p>
        {selected.title==='Caderneta da Gestante' && <dl className="mt-3 grid gap-2 text-sm">
          <div><dt className="font-medium">Idade gestacional</dt><dd>{patient.pregnancy.gestationalAge}</dd></div>
          <div><dt className="font-medium">Data provável do parto</dt><dd>{formatDemoDate(patient.pregnancy.dpp)}</dd></div>
        </dl>}
      </div>}
    </Modal>
  </>
}
