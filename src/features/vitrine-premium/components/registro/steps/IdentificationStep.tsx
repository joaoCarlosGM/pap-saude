'use client'
import Link from 'next/link'
import {useEffect,useRef,useState,type MouseEvent} from 'react'
import {FileCheck2,FileQuestion,QrCode,Search,UserRound} from 'lucide-react'
import {useDemo} from '@/features/vitrine-premium/components/demo/DemoProvider'
import {normalizeIdentifier,formatDemoDate} from '@/features/vitrine-premium/lib/demo/validation'
import {resolveDemoCard,type SyntheticIdentity} from '@/features/vitrine-premium/lib/pap-id'
import Input from '@/features/vitrine-premium/components/ui/Input'
import {Button} from '@/features/vitrine-premium/components/ui/button'
import type {RegistrationData} from '@/features/vitrine-premium/types/registration'
import type {Patient} from '@/features/vitrine-premium/types/paciente'
import {useCardService} from '../../demo/CardServiceContext'
import CameraScanner from '../CameraScanner'
import NewSyntheticPatient from '../../pacientes/NewSyntheticPatient'
import styles from './identification.module.css'
const formatCpf=(value:string)=>value.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')
type Props={data:RegistrationData;onChange:(data:Partial<RegistrationData>)=>void;onNew:()=>void;onNext:()=>void;onStart:(patch:Partial<RegistrationData>)=>void}
export default function IdentificationStep({data,onChange,onNew,onNext,onStart}:Props){
 const service=useCardService()
 const demo=useDemo(),[mode,setMode]=useState<'cpf'|'qr'|'manual'>('qr'),[state,setState]=useState<'idle'|'found'|'not-found'|'invalid'|'confirmed'>('idle')
 const [candidate,setCandidate]=useState<Patient|SyntheticIdentity|null>(null),[code,setCode]=useState(''),[document,setDocument]=useState(''),[docType,setDocType]=useState('CPF'),[rgUf,setRgUf]=useState(''),[rgIssuer,setRgIssuer]=useState(''),[attest,setAttest]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[summary,setSummary]=useState(false)
 const queueHeading=useRef<HTMLHeadingElement>(null),heading=useRef<HTMLHeadingElement>(null),png=useRef<HTMLInputElement>(null),inputCode=useRef<HTMLTextAreaElement>(null),[foundLedger,setFoundLedger]=useState(''),[verifiedContext,setVerifiedContext]=useState('')
 const [cameraOpen,setCameraOpen]=useState(false)
 const [rawQueue,setQueue]=useState<Array<{identity:SyntheticIdentity;token:string;privateReview:boolean}>>([]),[entry,setEntry]=useState(false)
 const queue=service?rawQueue:rawQueue.filter(item=>!item.privateReview)
 const [privateCandidate,setPrivateCandidate]=useState(false)
 const attempts=useRef({count:0,until:0}),generation=useRef(0),lastCode=useRef('')
 const ledgerSnapshot=JSON.stringify(demo.identityLedgers),context=JSON.stringify(demo.state.profile),isCard=!!candidate&&'subject' in candidate
 const name=candidate?('name' in candidate?candidate.name:candidate.nome):'',birth=candidate?('birthDate' in candidate?candidate.birthDate:candidate.dataNascimento):'',identifier=candidate?('document' in candidate?candidate.document:normalizeIdentifier(candidate.cpf)):''
 const activePatient=demo.patients.find(p=>normalizeIdentifier(p.cpf)===identifier)
 const stale=isCard&&(privateCandidate?!service:foundLedger!==ledgerSnapshot)
 const authorized=state==='confirmed'&&!stale&&verifiedContext===context&&!!activePatient
 function choose(value:typeof mode){generation.current++;lastCode.current='';setQueue([]);setEntry(false);setCameraOpen(false);setMode(value);setState('idle');setCandidate(null);setDocument('');setCode('');setAttest(false);setMessage('');setSummary(false);setBusy(false)}
 async function resolve(value:string){const ledgers=service?await service.refresh():demo.identityLedgers;for(const ledger of ledgers){const result=await resolveDemoCard(ledger,value);if(result)return result}return null}
 function selectCard(item:{identity:SyntheticIdentity;token:string;privateReview:boolean}){setPrivateCandidate(item.privateReview);lastCode.current=item.token;setCandidate(item.identity);setFoundLedger(ledgerSnapshot);setState('found');setDocument('');setAttest(false);setMessage('')}
 async function readCard(value=code,signal?:AbortSignal):Promise<boolean>{
  if(!/^PAP-ID-DEMO-1\.[A-Za-z0-9_-]{43}$/.test(value.trim())&&signal)return false
  const request=++generation.current;setBusy(true);setMessage('');setCandidate(null);setAttest(false);setState('idle')
  try{const identity=await resolve(value.trim());if(request!==generation.current||signal?.aborted)return false
   if(!identity){if(signal)return false;setState('invalid');setMessage('Não foi possível validar a credencial de teste. Confira a base importada, a validade e a revogação. Nenhuma consulta real foi realizada.');return false}
   setQueue(current=>{const index=current.findIndex(c=>c.identity.subject===identity.subject||c.identity.document===identity.document);const item={identity,token:value.trim(),privateReview:!!service};return index>=0?current.map((previous,i)=>i===index?item:previous):current.length<20?[...current,item]:current});setCode('');setState('idle');setEntry(false);return true
  }catch(error){if(signal)throw error;if(request===generation.current){setState('invalid');setMessage('Não foi possível consultar a base de testes.')}return false}finally{if(request===generation.current)setBusy(false)}
 }
 async function readPng(file?:File){if(!file)return;const request=++generation.current;setBusy(true);setMessage('');let bitmap:ImageBitmap|undefined
  try{if(file.type!=='image/png'||file.size>4000000)throw new Error();const header=new DataView(await file.slice(0,24).arrayBuffer());if(header.byteLength<24||header.getUint32(0)!==0x89504e47||header.getUint32(16)*header.getUint32(20)>4000000)throw new Error();bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>4000000)throw new Error();const canvas=documentGlobal().createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error();ctx.drawImage(bitmap,0,0);const image=ctx.getImageData(0,0,canvas.width,canvas.height),jsQR=(await import('jsqr')).default,qr=jsQR(image.data,image.width,image.height);if(!qr)throw new Error();if(request===generation.current)await readCard(qr.data)
  }catch{if(request===generation.current){setState('invalid');setMessage('PNG de carteirinha inválido ou QR ilegível. Use o arquivo original ou digite o código de teste.')}}finally{bitmap?.close();if(request===generation.current)setBusy(false)}
 }
 // Keeps the document input state separate from the DOM document.
 function documentGlobal(){return window.document}
 function find(){const found=demo.patients.find(p=>normalizeIdentifier(p.cpf)===normalizeIdentifier(data.cpf));setCandidate(found||null);setState(found?'found':'not-found');setDocument('');setAttest(false);setMessage('');setFoundLedger(ledgerSnapshot)}
 async function validate(event:MouseEvent<HTMLButtonElement>){
  const now=event.timeStamp
  setMessage('');if(now<attempts.current.until){setMessage('Limite demonstrativo atingido. Aguarde um minuto para nova conferência.');return}
  const rg=candidate&&'subject' in candidate?candidate.rg:undefined;
  const matches=docType==='CPF'?normalizeIdentifier(document)===identifier:!!rg&&document.trim().toUpperCase()===rg.number&&rgUf.trim().toUpperCase()===rg.uf&&rgIssuer.trim().toUpperCase()===rg.issuer;
  if(!candidate||stale||!attest||!matches){attempts.current.count++;if(attempts.current.count>=5){attempts.current.until=now+60000;attempts.current.count=0}setMessage('Conferência demonstrativa não concluída. Revise o documento, o contexto e a base de testes.');return}
  if(isCard&&!(await resolve(lastCode.current).catch(()=>null))){setMessage('Credencial de teste indisponível. Refaça a leitura com a base atualizada.');setState('invalid');return}
  try{if('subject' in candidate&&!privateCandidate)demo.registerSyntheticIdentity(candidate);setVerifiedContext(context);setState('confirmed');setDocument('');attempts.current.count=0}catch{setMessage('Identificação demonstrativa conflitante. Revise a base local.')}
 }
 // Token is never put in URLs, storage, logs or clinical records. Retained only while this step is mounted.
 function changeCode(value:string){lastCode.current=value.trim();setCode(value)}
 async function begin(){if(!authorized||!activePatient)return;if(isCard&&!(await resolve(lastCode.current).catch(()=>null))){setState('invalid');setMessage('Credencial indisponível. Refaça a identificação.');return}const p=activePatient;onStart({cpf:p.cpf,nomeCompleto:p.nome,dataNascimento:p.dataNascimento,dum:p.pregnancy.dum,dumUnknown:!p.pregnancy.dum,primeiroAtendimento:false,allergyStatus:p.historyStatus?.includes('Alergias: nao')?'nao':p.allergies.length?'sim':'desconhecido',allergies:p.allergies.map(agent=>({agent,reaction:'',notes:''})),medications:p.medications.map(({name,dose,frequency,route})=>({name,dose,frequency,route})),comorbidityStatus:p.comorbidities.length?'sim':'desconhecido',conditions:p.comorbidities})}
 useEffect(()=>{if(state!=='idle'){heading.current?.focus();heading.current?.scrollIntoView({block:'start'})}},[state])
 useEffect(()=>{if(rawQueue.length&&state==='idle'&&!cameraOpen){queueHeading.current?.focus();queueHeading.current?.scrollIntoView({block:'center'})}},[rawQueue,state,cameraOpen])
 useEffect(()=>()=>{generation.current++;lastCode.current=''},[])
 useEffect(()=>{if(!isCard||!demo.identityLedger)return;const deadlines=demo.identityLedgers.filter(l=>l.patient.subject===(isCard?candidate?.subject:undefined)).flatMap(l=>l.cards).filter(c=>!c.revoked).map(c=>Date.parse(c.expiresAt));const remaining=Math.min(...deadlines)-Date.now();const timer=setTimeout(()=>{setState('invalid');setMessage('Validade da credencial encerrada. Refaça a identificação.')},Math.max(0,Math.min(remaining,2147483647)));return()=>clearTimeout(timer)},[isCard,ledgerSnapshot,demo.identityLedger,demo.identityLedgers,candidate])
 return <div onKeyDown={event=>{if(event.key==='Escape'&&state==='found'){choose('qr');queueHeading.current?.focus()}}} data-pap-id-state={authorized?'authorized':state}>
  {cameraOpen&&<CameraScanner onScan={readCard} onDetected={()=>setCameraOpen(false)} onClose={()=>setCameraOpen(false)}/>}
  <header className="mb-6"><h2 ref={heading} tabIndex={-1} className="scroll-mt-16 text-lg font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-pink-600 sm:text-xl">{authorized?'Gestante validada com sucesso':state==='found'?'Validar identidade da gestante':state==='not-found'?'Gestante não encontrada':'Identifique a paciente'}</h2><p className="mt-1 text-sm leading-6 text-slate-600">Use somente carteirinhas e documentos de teste.</p></header>
  {state==='idle'&&<div className={styles.modes} role="group" aria-label="Forma de identificação">{(['cpf','qr','manual'] as const).map((value,i)=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>choose(value)}>{i===0?<UserRound size={18} aria-hidden/>:i===1?<QrCode size={18} aria-hidden/>:<FileCheck2 size={18} aria-hidden/>}{['CPF','QR Code','Cadastro manual'][i]}</button>)}</div>}
  <input ref={png} type="file" aria-label="Carteirinha PNG" className="sr-only" accept="image/png" multiple onChange={async e=>{const files=Array.from(e.target.files||[]).slice(0,20);e.target.value='';for(const file of files)await readPng(file)}}/>
  {mode==='qr'&&state==='idle'&&<details><summary>Base sintética • importar ou atualizar</summary><label className={styles.field}>Base sintética (JSON)<input type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];try{if(!file||file.size>100000)throw new Error();demo.importIdentityLedger(JSON.parse(await file.text()));setState('idle');setCandidate(null);setCode('');lastCode.current='';setMessage('Base sintética importada. Leia a carteirinha.')}catch{setMessage('Base de teste inválida. Nenhum arquivo foi enviado ao servidor.')}e.target.value=''}}/></label></details>}
  {mode==='qr'&&state==='idle'&&queue.length===0&&<div className={styles.panel}><h3>Carteirinha PAP-ID de teste</h3><p>{service?'Leia o QR da carteirinha emitida em Documentos.':'Autorize a consulta privada em Configurações ou importe uma base sintética.'}</p><div className={styles.actions}><Button disabled={(!demo.identityLedger&&!service)||busy} onClick={()=>setCameraOpen(true)}>Escanear carteirinha</Button><Button type="button" disabled={(!demo.identityLedger&&!service)||busy} onClick={()=>png.current?.click()}><QrCode size={18} aria-hidden/>Ler carteirinha PNG</Button><Button type="button" variant="outline" onClick={()=>{setEntry(true);setTimeout(()=>inputCode.current?.focus(),0)}}>Digitar código</Button></div></div>}
  {mode==='qr'&&state==='idle'&&entry&&<><label className={styles.field}>Código de teste<textarea ref={inputCode} autoComplete="off" spellCheck={false} maxLength={100} value={code} onChange={e=>changeCode(e.target.value)}/></label><Button type="button" disabled={busy||!code||(!demo.identityLedger&&!service)} onClick={()=>{lastCode.current=code.trim();void readCard()}}>Identificar carteirinha</Button></>}
  {queue.length>0&&mode==='qr'&&state==='idle'&&<section className={styles.panel} aria-label="Carteirinhas detectadas">
   <h3 ref={queueHeading} tabIndex={-1}>{queue.length===1?'Carteirinha detectada':queue.length+' carteirinhas detectadas'}</h3>
   <ul className={styles.candidates}>{queue.map(item=><li key={item.identity.subject}>
    <article aria-label="Prévia da carteirinha PAP-ID" className="grid min-w-0 flex-1 gap-1 rounded-xl bg-[#C41469] p-4 text-white">
     <span className="text-xs font-semibold">PAP-ID / Carteirinha da Gestante</span>
     <strong className="break-words">{item.identity.name}</strong>
     <span className="text-xs">Aguardando conferência do documento</span>
    </article>
    <div className={styles.actions}><Button aria-label={'Continuar com '+item.identity.name} onClick={()=>selectCard(item)}>Continuar</Button><Button variant="outline" onClick={()=>setQueue(current=>current.filter(c=>c.identity.subject!==item.identity.subject))} aria-label={'Remover '+item.identity.name}>Remover</Button></div>
   </li>)}</ul>
   <Button disabled={busy||queue.length>=20} onClick={()=>setCameraOpen(true)}>Adicionar mais carteirinhas</Button>
   <details><summary>Outras formas de leitura</summary><div className={styles.actions}><Button disabled={busy||queue.length>=20} onClick={()=>png.current?.click()}>Ler mais PNG</Button><Button variant="outline" disabled={busy||queue.length>=20} onClick={()=>{setEntry(true);setTimeout(()=>inputCode.current?.focus(),0)}}>Digitar outro código</Button></div></details>
  </section>}
  {mode==='cpf'&&state==='idle'&&<div className={styles.panel}><label className={styles.field}>CPF sintético<Input id="lookup-cpf" value={data.cpf} onChange={e=>onChange({cpf:formatCpf(e.target.value)})}/></label><Button type="button" onClick={find}><Search size={18} aria-hidden/>Buscar dados</Button><p>Busca somente na base em memória; sem DATASUS.</p></div>}
  {mode==='manual'&&state==='idle'&&<div className={styles.panel}><p>Cadastro de demonstração, sem gravação clínica. Use somente dados fictícios.</p><Input id="cpf" label="CPF sintético" value={data.cpf} onChange={e=>onChange({cpf:formatCpf(e.target.value)})}/><div className={styles.grid}><Input id="patient-name" label="Nome completo *" value={data.nomeCompleto} onChange={e=>onChange({nomeCompleto:e.target.value})}/><Input id="birth-date" label="Data de nascimento *" type="date" value={data.dataNascimento} onChange={e=>onChange({dataNascimento:e.target.value})}/></div></div>}
  {(busy||message)&&<p role={state==='invalid'?'alert':'status'} className={styles.notice}>{busy?'Lendo credencial sintética…':message}</p>}
  {state==='invalid'&&<div className={styles.panel}><h3>Credencial indisponível</h3><p>Um QR inválido não informa se uma pessoa está cadastrada. Reimporte a base e tente novamente.</p><Button variant="outline" onClick={()=>choose('qr')}>Tentar outra carteirinha</Button></div>}
  {state==='not-found'&&<div className={styles.panel}><FileQuestion size={28} aria-hidden/><h3>Nenhum cadastro sintético localizado</h3><NewSyntheticPatient/><p>Nenhuma pesquisa de paciente real foi realizada.</p><div className={styles.actions}><Button onClick={()=>choose('qr')}>Ler QR Code novamente</Button><Button variant="outline" onClick={()=>choose('cpf')}>Digitar outro CPF</Button><Button variant="outline" onClick={()=>choose('manual')}>Cadastrar manualmente</Button></div></div>}
  {candidate&&((state==='found'&&!isCard)||authorized)&&<section className={styles.identity}><UserRound size={28} aria-hidden/><div><h3>{authorized?'Identidade confirmada • demonstração':'Gestante localizada • dados fictícios'}</h3><p>{name}</p><p>Nascimento: {formatDemoDate(birth)}</p><p>Documento: •••••••{identifier.slice(-4)} • Contexto fictício: {demo.state.profile.unit}</p></div></section>}
  {state==='found'&&!stale&&<div className={styles.panel}><h3>Confirmação de identidade demonstrativa</h3><label className={styles.field}>Documento de conferência<select value={docType} onChange={e=>setDocType(e.target.value)}><option>CPF</option><option>RG</option></select></label>{docType==='RG'&&<><p>Use somente o RG fictício emitido na carteirinha de teste. Não há validação de documento real.</p><div className={styles.grid}><Input label="UF do RG de teste" maxLength={2} value={rgUf} onChange={e=>setRgUf(e.target.value)}/><Input label="Emissor do RG de teste" value={rgIssuer} onChange={e=>setRgIssuer(e.target.value)}/></div></>}<Input id="verify-document" label="Documento sintético da carteirinha" autoComplete="off" value={document} onChange={e=>setDocument(docType==='CPF'?formatCpf(e.target.value):e.target.value)}/><label className={styles.check}><input type="checkbox" checked={attest} onChange={e=>setAttest(e.target.checked)}/>Conferi a identidade e o contexto fictícios da {demo.state.profile.unit}.</label><Button onClick={validate} disabled={!attest||!document||busy||stale}>Validar e continuar</Button></div>}
  {state!=='idle'&&<Button variant="outline" onClick={()=>choose('qr')}>Trocar carteirinha</Button>}
  {stale&&<p role="alert" className={styles.notice}>Base atualizada. Refaça a identificação antes de continuar.</p>}
  {state==='confirmed'&&!authorized&&<p role="alert" className={styles.notice}>Contexto demonstrativo alterado. Refaça a identificação.</p>}
  {authorized&&activePatient&&<><button type="button" className={styles.expand} aria-expanded={summary} onClick={()=>setSummary(!summary)}>Resumo sintético expandido</button>{summary&&<dl className={styles.summary}>{[['Idade gestacional',activePatient.pregnancy.gestationalAge],['DPP',activePatient.pregnancy.dpp?formatDemoDate(activePatient.pregnancy.dpp):'Não informada'],['Última queixa',activePatient.encounters?.at(-1)?.registration?.queixasPrincipais||'Não informada'],['Alergias',activePatient.historyStatus?.includes('Alergias: nao')?'Nenhuma declarada':activePatient.allergies.join(', ')||'Desconhecidas'],['Último MEOWS',activePatient.encounters?.at(-1)?.assessmentSource==='PAP_MEOWS_DEMO'?String(activePatient.encounters.at(-1)?.score??'Incompleto'):'Não avaliado • sem avaliação verificável']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}<h3 className="mt-5 font-semibold">Escolha a próxima ação</h3><div className={styles.actions}><div><Link prefetch={false} className={styles.link} href={'/vitrine/pacientes/'+activePatient.id}>Abrir prontuário</Link></div><div><Button onClick={()=>void begin()}>Iniciar atendimento</Button></div></div></>}
  {mode==='manual'&&<footer className={styles.footer}><Button variant="outline" onClick={onNew}>Iniciar novo cadastro sintético</Button>{mode==='manual'&&<Button onClick={onNext} disabled={!data.cpf||!data.nomeCompleto||!data.dataNascimento}>Próximo →</Button>}</footer>}
 </div>
}
