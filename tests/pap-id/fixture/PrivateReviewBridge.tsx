'use client'
import type {ChartService} from '@/features/vitrine-premium/components/demo/CardServiceContext'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {OriginalDocumentProvider,type PrivateDocument} from '@/features/vitrine-premium/components/protocolos/OriginalDocumentContext'
import {CardServiceProvider,type CardIssue,type CardService} from '@/features/vitrine-premium/components/demo/CardServiceContext'
import type {DemoLedger,SyntheticIdentity} from '@/features/vitrine-premium/lib/pap-id'
import type {ReviewCard} from '@/features/vitrine-premium/lib/review-registry'
async function documentsFor(patientId: string) {
 const response = await fetch(`/homologacao/pacientes/${encodeURIComponent(patientId)}/documentos`,{cache:'no-store'})
 if (!response.ok) throw Error('PRIVATE_DOCUMENTS_UNAVAILABLE')
 return (await response.json()).documents
}

function checkReviewAuthorization(response: Response) {
 if (response.status === 403) window.dispatchEvent(new Event('pap:review-session-ended'))
}

const chart: ChartService = {
 activity: async () => {
  const response = await fetch('/homologacao/atividade',{cache:'no-store'})
  checkReviewAuthorization(response)
  if (!response.ok) throw Error('CHART_UNAVAILABLE')
  return (await response.json()).events
 },
 read: async id => {
  const response = await fetch(`/homologacao/pacientes/${encodeURIComponent(id)}/prontuario`, {cache:'no-store'})
  checkReviewAuthorization(response)
  if (!response.ok) throw Error('CHART_UNAVAILABLE')
  return response.json()
 },
 write: async (id, command) => {
  const response = await fetch(`/homologacao/pacientes/${encodeURIComponent(id)}/prontuario`, {
   method:'POST', credentials:'same-origin',
   headers:{'Content-Type':'application/json','x-pap-local-review':'chart'}, body:JSON.stringify(command),
  })
  checkReviewAuthorization(response)
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw Error(result.error || 'CHART_UNAVAILABLE')
  if (['consulta','soap','agenda'].includes(command.data.kind)) window.dispatchEvent(new Event('pap:vitrine-chart'))
  return result.event
 },
}

export default function PrivateReviewBridge({children}:{children:ReactNode}){
 const [ledgers,setLedgers]=useState<DemoLedger[]>([]),[people,setPeople]=useState<SyntheticIdentity[]>([]),[history,setHistory]=useState<ReviewCard[]>([]),[database,setDatabase]=useState(false),[pending,setPending]=useState(true)
 const [updating,setUpdating]=useState(false)
 const consentOperation=useRef(false)
 const tokens=useRef(new Map<string,string>()),panel=useRef<HTMLDetailsElement>(null)
 const [documents,setDocuments]=useState<PrivateDocument[]>([]),[error,setError]=useState(''),[expiresAt,setExpiresAt]=useState(0)
 async function cards(body?:object){const r=await fetch('/homologacao/carteirinhas',{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json','x-pap-local-review':'cards'}:undefined,body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('LOCAL_DB_UNAVAILABLE');return r.json()}
 function snapshot(r:{ledgers:DemoLedger[];people:SyntheticIdentity[];history:ReviewCard[]}){setLedgers(r.ledgers);setPeople(r.people);setHistory(r.history)}
 async function refresh(){const result=await cards();snapshot(result);return result.ledgers as DemoLedger[]}
 useEffect(()=>{
  let alive=true
  async function restore() {
   try {
    const response=await fetch('/homologacao/sessao',{cache:'no-store'})
    if(!response.ok)throw Error('PRIVATE_SESSION_UNAVAILABLE')
    const session=await response.json()
    if(!alive)return
    setDocuments(session.documents||[])
    setExpiresAt(session.expiresAt||0)
    if(session.enabled) {
     const data=await cards()
     if(alive){snapshot(data);setDatabase(true)}
    }
   } catch {
    if(alive)setError('Consulta privada indisponível. Tente novamente.')
   } finally {
    if(alive)setPending(false)
   }
  }
  void restore()
  return()=>{alive=false}
 },[])
 async function authorize(){
  if(pending||consentOperation.current)return
  consentOperation.current=true
  setUpdating(true)
  try{
   const ending=documents.length>0
   const response=await fetch('/homologacao/sessao',{
    method:ending?'DELETE':'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','x-pap-local-review':'consent'},
    body:ending?undefined:JSON.stringify({consent:true}),
   })
   if(!response.ok)throw Error('PRIVATE_CONSENT_FAILED')
   const data=await response.json()
   setDocuments(data.documents)
   setExpiresAt(data.expiresAt||0)
   setError('')
   if(data.enabled){
    try {await refresh();setDatabase(true)}
    catch {setDatabase(false);setError('Banco privado indisponível neste laboratório.')}
   } else {
    setDatabase(false);setPeople([]);setHistory([]);setLedgers([]);tokens.current.clear()
   }
   if(panel.current)panel.current.open=false
  } catch {setError('Consulta privada indisponível. Confira os originais e a configuração deste laboratório.')}
  finally {consentOperation.current=false;setUpdating(false)}
 }
 const service:CardService={chart,ledgers,people,history,refresh,issue:async(patientId,operationId)=>{let token=tokens.current.get(operationId);if(!token){token='PAP-ID-DEMO-1.'+btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');tokens.current.set(operationId,token)}const result=await cards({action:'issue',patientId,operationId,token}) as CardIssue;await refresh();tokens.current.delete(operationId);return result},revoke:async subject=>{await cards({action:'revoke',subject});await refresh()},create:async(input,operationId)=>{const r=await cards({action:'register',input,operationId});await refresh();return r.patient},documents:documentsFor,upload:async(patientId,file,category,operationId,groupId)=>{const r=await fetch(`/homologacao/pacientes/${encodeURIComponent(patientId)}/documentos`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type,'x-pap-local-review':'documents','x-pap-synthetic-document':'confirmed','x-pap-document-name':encodeURIComponent(file.name),'x-pap-document-category':category,'x-pap-operation':operationId,...(groupId?{'x-pap-document-version':groupId}:{})},body:file});if(!r.ok)throw Error('PRIVATE_UPLOAD_REJECTED')},archive:async(patientId,id)=>{const r=await fetch(`/homologacao/pacientes/${encodeURIComponent(patientId)}/documentos/${encodeURIComponent(id)}`,{method:'DELETE',headers:{'x-pap-local-review':'documents'}});if(!r.ok)throw Error('ARCHIVE_DENIED')}}
 useEffect(()=>{
  if(!expiresAt)return
  const end=()=>{setDocuments([]);setPeople([]);setHistory([]);setLedgers([]);setDatabase(false);setExpiresAt(0);tokens.current.clear();setError('Consulta expirada. Autorize novamente.')}
  const expiry=setTimeout(end,Math.max(0,expiresAt-Date.now()))
  window.addEventListener('pap:review-session-ended',end)
  return()=>{clearTimeout(expiry);window.removeEventListener('pap:review-session-ended',end)}
 },[expiresAt])
 const settings=<details ref={panel} data-private-review className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm" aria-label="Configurações de homologação">
  <summary className="min-h-11 cursor-pointer font-semibold">Consulta privada • {documents.length?'consulta autorizada':'aguardando autorização'}</summary>
  <p className="text-slate-600">A sessão temporária dá acesso aos originais e, quando disponível, ao cadastro sintético deste laboratório.</p>
  {expiresAt>0&&<p className="text-slate-600">Expira às {new Date(expiresAt).toLocaleTimeString('pt-BR')}.</p>}
  <button type="button" disabled={pending||updating} className="min-h-11 text-pink-700 underline" onClick={()=>void authorize()}>{documents.length?'Encerrar consulta privada':'Autorizar consulta local dos PDFs'}</button>
  {(pending||updating)&&<p role="status">Verificando a consulta privada…</p>}
  {error&&<p role="alert">{error}</p>}
 </details>
 return <CardServiceProvider service={database&&documents.length?service:null} pending={pending}>
  <OriginalDocumentProvider documents={documents} settings={settings}>{children}</OriginalDocumentProvider>
 </CardServiceProvider>
}
