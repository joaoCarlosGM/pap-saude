'use client'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {OriginalDocumentProvider,type PrivateDocument} from '@/features/vitrine-premium/components/protocolos/OriginalDocumentContext'
import {CardServiceProvider,type CardIssue,type CardService} from '@/features/vitrine-premium/components/demo/CardServiceContext'
import type {DemoLedger,SyntheticIdentity} from '@/features/vitrine-premium/lib/pap-id'
import type {ReviewCard} from '@/features/vitrine-premium/lib/review-registry'
export default function PrivateReviewBridge({children}:{children:ReactNode}){
 const [ledgers,setLedgers]=useState<DemoLedger[]>([]),[people,setPeople]=useState<SyntheticIdentity[]>([]),[history,setHistory]=useState<ReviewCard[]>([]),[database,setDatabase]=useState(false),[pending,setPending]=useState(true)
 const tokens=useRef(new Map<string,string>()),panel=useRef<HTMLDetailsElement>(null)
 const [documents,setDocuments]=useState<PrivateDocument[]>([]),[error,setError]=useState(''),[expiresAt,setExpiresAt]=useState(0)
 async function cards(body?:object){const r=await fetch('/homologacao/carteirinhas',{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json','x-pap-local-review':'cards'}:undefined,body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('LOCAL_DB_UNAVAILABLE');return r.json()}
 function snapshot(r:{ledgers:DemoLedger[];people:SyntheticIdentity[];history:ReviewCard[]}){setLedgers(r.ledgers);setPeople(r.people);setHistory(r.history)}
 async function refresh(){const result=await cards();snapshot(result);return result.ledgers as DemoLedger[]}
 useEffect(()=>{let alive=true;void fetch('/homologacao/sessao').then(r=>r.json()).then(async r=>{if(!alive)return;setDocuments(r.documents||[]);setExpiresAt(r.expiresAt||0);if(r.enabled)try{const data=await cards();if(alive){snapshot(data);setDatabase(true)}}catch{if(alive)setDatabase(false)}}).catch(()=>{}).finally(()=>{if(alive)setPending(false)});return()=>{alive=false}},[])
 async function authorize(){try{const response=await fetch('/homologacao/sessao',{method:documents.length?'DELETE':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-pap-local-review':'consent'},body:documents.length?undefined:JSON.stringify({consent:true})});if(!response.ok)throw Error();const data=await response.json();setDocuments(data.documents);setExpiresAt(data.expiresAt||0);setError('');if(data.enabled){try{await refresh();setDatabase(true)}catch{setDatabase(false);setError('Banco privado indisponível ou requer upgrade explícito; nenhuma persistência simulada.')}}else{setDatabase(false);setPeople([]);tokens.current.clear()}if(panel.current)panel.current.open=false}catch{setError('Consulta privada indisponível. Confira os originais e a configuração deste laboratório.')}}
 const service:CardService={ledgers,people,history,refresh,issue:async(patientId,operationId)=>{let token=tokens.current.get(operationId);if(!token){token='PAP-ID-DEMO-1.'+btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');tokens.current.set(operationId,token)}const result=await cards({action:'issue',patientId,operationId,token}) as CardIssue;await refresh();tokens.current.delete(operationId);return result},revoke:async subject=>{await cards({action:'revoke',subject});await refresh()},create:async(input,operationId)=>{const r=await cards({action:'register',input,operationId});await refresh();return r.patient},documents:async patientId=>{const r=await fetch(`/homologacao/pacientes/${encodeURIComponent(patientId)}/documentos`,{cache:'no-store'});if(!r.ok)throw Error('PRIVATE_DOCUMENTS_UNAVAILABLE');return (await r.json()).documents},upload:async(patientId,file,category,operationId,groupId)=>{const r=await fetch(`/homologacao/pacientes/${encodeURIComponent(patientId)}/documentos`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type,'x-pap-local-review':'documents','x-pap-synthetic-document':'confirmed','x-pap-document-name':encodeURIComponent(file.name),'x-pap-document-category':category,'x-pap-operation':operationId,...(groupId?{'x-pap-document-version':groupId}:{})},body:file});if(!r.ok)throw Error('PRIVATE_UPLOAD_REJECTED')},archive:async(patientId,id)=>{const r=await fetch(`/homologacao/pacientes/${encodeURIComponent(patientId)}/documentos/${encodeURIComponent(id)}`,{method:'DELETE',headers:{'x-pap-local-review':'documents'}});if(!r.ok)throw Error('ARCHIVE_DENIED')}}
 useEffect(()=>{
  if(!expiresAt)return
  const expiry=setTimeout(()=>{setDocuments([]);setPeople([]);setDatabase(false);setExpiresAt(0);tokens.current.clear();setError('Consulta expirada. Autorize novamente.');},Math.max(0,expiresAt-Date.now()))
  return()=>clearTimeout(expiry)
 },[expiresAt])
 const settings=<details ref={panel} data-private-review className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm" aria-label="Configurações de homologação">
  <summary className="min-h-11 cursor-pointer font-semibold">Consulta privada • {documents.length?'consulta autorizada':'aguardando autorização'}</summary>
  <p className="text-slate-600">A sessão temporária dá acesso aos originais e, quando disponível, ao cadastro sintético deste laboratório.</p>
  {expiresAt>0&&<p className="text-slate-600">Expira às {new Date(expiresAt).toLocaleTimeString('pt-BR')}.</p>}
  <button type="button" className="min-h-11 text-pink-700 underline" onClick={()=>void authorize()}>{documents.length?'Encerrar consulta privada':'Autorizar consulta local dos PDFs'}</button>
  {error&&<p role="alert">{error}</p>}
 </details>
 return <CardServiceProvider service={database&&documents.length?service:null} pending={pending}>
  <OriginalDocumentProvider documents={documents} settings={settings}>{children}</OriginalDocumentProvider>
 </CardServiceProvider>
}
