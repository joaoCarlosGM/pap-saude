'use client'
import Image from 'next/image'
import {useState} from 'react'
import {useDemo} from '../demo/DemoProvider'
import {useCardService} from '../demo/CardServiceContext'
import Modal from '../ui/Modal'
import {Button} from '../ui/button'
export default function PatientCardIssuer({patientId}:{patientId:string}){
 const service=useCardService(),demo=useDemo(),[open,setOpen]=useState(false),[png,setPng]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[operation,setOperation]=useState('')
 const ledger=service?.ledgers.find(l=>'patientId' in l.patient&&l.patient.patientId===patientId)
 async function issue(){if(!service)return;setBusy(true);setError('');const key=operation||crypto.randomUUID();setOperation(key);try{const result=await service.issue(patientId,key);demo.importIdentityLedger(result.ledger);setPng(result.png);setOperation('')}catch{setError('Emissão não confirmada. Tente novamente com a mesma operação; não haverá novo paciente.')}finally{setBusy(false)}}
 return <div className="px-3 pb-3"><Button variant="outline" disabled={!service} onClick={()=>{setOpen(true);setPng('');setError('')}}>{ledger?'Reemitir carteirinha':'Emitir carteirinha PAP-ID'}</Button>{!service&&<span className="ml-2 text-xs text-slate-500">Exige banco de homologação privado autorizado</span>}<Modal open={open} onClose={()=>setOpen(false)} title="Carteirinha PAP-ID • teste sintético" maxWidth="md"><p className="text-sm text-slate-600">Uma credencial ativa por pessoa. Reemitir revoga a anterior. Nenhum acesso clínico real é concedido.</p>{ledger&&<p className="my-2 text-sm">Validade: {ledger.cards.filter(c=>!c.revoked).map(c=>new Date(c.expiresAt).toLocaleString('pt-BR')).join(', ')||'Revogada'}</p>}{error&&<p role="alert">{error}</p>}{png?<><p role="status">Emissão confirmada no PostgreSQL isolado.</p><Image unoptimized width={480} height={480} src={png} alt="Carteirinha sintética privada; QR opaco" className="my-3 w-full"/><a download="carteirinha-pap-id-teste.png" href={png} className="text-pink-700 underline">Baixar carteirinha PNG</a></>:<Button disabled={busy} onClick={()=>void issue()}>{busy?'Emitindo…':'Confirmar emissão'}</Button>}{ledger&&service&&<Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{await service.revoke(ledger.patient.subject);for(const row of await service.refresh())demo.importIdentityLedger(row);setPng('');setError('Credenciais revogadas.')}catch{setError('Revogação não confirmada.')}finally{setBusy(false)}}}>Revogar carteirinhas</Button>}</Modal></div>
}
