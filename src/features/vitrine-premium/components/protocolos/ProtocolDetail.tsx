'use client'
import Link from 'next/link'
import {useId,useState,useRef,type KeyboardEvent} from 'react'
import {Target,Layers3,Users,Stethoscope,ArrowLeft,AlertCircle,BookOpen,CheckSquare,Clock3,FileLock2,FileText,GitBranch,RotateCcw} from 'lucide-react'
import {protocolHref,protocolTabs,reportedDate,type DemoProtocol,type ProtocolTab} from '@/features/vitrine-premium/lib/protocol-catalog'
import Modal from '@/features/vitrine-premium/components/ui/Modal'
import {useOriginalDocument,usePrivateReviewAvailable} from './OriginalDocumentContext'
import OriginalPdfViewer from './OriginalPdfViewer'
import SourceIndex from './SourceIndex'
import {sourcedProtocols,type Citation} from '../../lib/protocol-content'
import {protocolTerms} from '../../lib/protocol-display'
import ProtocolFlow from './ProtocolFlow'
import styles from './protocols.module.css'

function DocumentFacts({protocol}:{protocol:DemoProtocol}){return <dl className={styles.facts}><div><dt>Origem da referência</dt><dd>{protocol.origin}</dd></div><div><dt>Código(s) da fonte • divergências a revisar</dt><dd>{protocol.codes.join(' / ')}</dd></div><div><dt>Versão documental</dt><dd>{protocol.version}</dd></div><div><dt>Emissão informada</dt><dd>{reportedDate(protocol.reportedIssuedAt)}</dd></div><div><dt>Próxima revisão informada</dt><dd>{reportedDate(protocol.reportedReviewDue)}</dd></div><div><dt>Estado nesta plataforma</dt><dd>Em revisão • não homologado</dd></div></dl>}
function DocumentState({protocol,initialPage=1}:{protocol:DemoProtocol;initialPage?:number}){
 const document=useOriginalDocument(protocol.slug)
 const canAuthorize=usePrivateReviewAvailable()
 if(document)return <OriginalPdfViewer key={protocol.slug+'-'+initialPage} document={document} initialPage={initialPage}/>
 return <section className={styles.panel}><span className={styles.fileIcon}><FileLock2 size={30} aria-hidden="true"/></span><h2>PDF original indisponível</h2>{canAuthorize?<><p className={styles.muted}>Autorize a consulta privada nas configurações de homologação.</p><Link href="/vitrine/configuracoes" className={styles.textLink}>Abrir configurações</Link></>:<p className={styles.muted}>Original indisponível neste ambiente.</p>}<p className={styles.muted}>{protocol.document.originalFilename} · {protocol.document.reportedPageCount} páginas</p></section>
}
function SourceCitation({slug,source}:{slug:string;source:Citation}){return <Link className={styles.textLink} href={protocolHref(slug,'documento-original',source.page)} prefetch={false} scroll={false}>{source.section} • digital {source.page} / impressa {source.printed} • v{source.version}</Link>}
function ConsultativeChecklist({protocol,marks,onMark,onClear}:{protocol:DemoProtocol;marks:readonly string[];onMark:(id:string)=>void;onClear:()=>void}){
 const groups=sourcedProtocols[protocol.slug]?.groups||protocol.checklist.map(g=>({...g,kind:'ADAPTADO_PARA_LEITURA',source:{section:'Sem fonte validada',page:1,printed:'a confirmar',version:protocol.version}}))
 const groupContainer=useRef<HTMLDivElement>(null)
 const [confirm,setConfirm]=useState(false),total=groups.reduce((sum,g)=>sum+g.items.length,0)
 return <section className={styles.panel}><h2>Checklist de consulta</h2><p className={styles.muted}>Marque os itens já lidos. O progresso indica consulta, sem registro de condutas.</p><p role="status" aria-live="polite">{marks.length} de {total} itens lidos</p><progress className={styles.progress} max={total} value={marks.length} aria-label="Progresso local de leitura, sem significado clínico"/>
  <div className={styles.actions}><button type="button" className={styles.secondary} onClick={()=>groupContainer.current?.querySelectorAll('details').forEach(el=>{el.open=true})}>Expandir grupos</button><button type="button" className={styles.secondary} onClick={()=>groupContainer.current?.querySelectorAll('details').forEach(el=>{el.open=false})}>Recolher grupos</button></div><div ref={groupContainer} className={styles.checkGrid}>{groups.map(group=><details className={styles.checkGroup} key={group.id} open><summary>{group.title}</summary><p className={styles.muted}>{group.kind==='TRANSCRICAO_PARCIAL'?'Transcrição parcial do original • em revisão':'Adaptação para leitura • exige revisão clínica'}</p><SourceCitation slug={protocol.slug} source={group.source}/><fieldset><legend className="sr-only">{group.title}</legend>{group.items.map(item=><label key={item.id}><input type="checkbox" checked={marks.includes(item.id)} onChange={()=>onMark(item.id)}/><span>{item.label}</span></label>)}</fieldset></details>)}</div>
  <div className={styles.actions}><button type="button" className={styles.secondary} onClick={()=>setConfirm(true)}><RotateCcw size={16} aria-hidden="true"/>Limpar marcações</button><Link className={styles.textLink} href={protocolHref(protocol.slug,'documento-original')} prefetch={false} scroll={false}>Ver documento original</Link></div>
  <Modal open={confirm} onClose={()=>setConfirm(false)} title="Limpar itens lidos?" maxWidth="sm" footer={<><button type="button" className={styles.secondary} onClick={()=>setConfirm(false)}>Cancelar</button><button type="button" className={styles.button} onClick={()=>{onClear();setConfirm(false)}}>Confirmar limpeza</button></>}><p className={styles.muted}>Somente as marcações de leitura deste protocolo serão apagadas. Nenhum atendimento ou registro clínico é alterado.</p></Modal>
 </section>
}
const icons={'visao-geral':BookOpen,fluxograma:GitBranch,checklist:CheckSquare,'documento-original':FileText}
export default function ProtocolDetail({protocol,tab,marks=[],onMark=()=>{},onClear=()=>{},initialPage=1}:{initialPage?:number;protocol:DemoProtocol;tab:ProtocolTab;marks?:readonly string[];onMark?:(id:string)=>void;onClear?:()=>void}){
 const baseId=useId(),document=useOriginalDocument(protocol.slug)
 const [query,setQuery]=useState('')
 const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
 const overview=(sourcedProtocols[protocol.slug]?.overview||protocol.sections.map(section=>({title:section.title,text:section.description,source:null}))).filter(section=>normalize(section.title+' '+section.text+' '+(protocolTerms[protocol.slug]?.[section.title]||[]).join(' ')).includes(normalize(query.trim())))
 function tabKeys(event:KeyboardEvent<HTMLElement>){
  if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
  const tabs=Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('[role=tab]')),index=tabs.indexOf(event.target as HTMLAnchorElement)
  if(index<0)return
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length
  tabs[next].focus();tabs[next].click()
 }
 return <>
  <Link href="/vitrine/protocolos" prefetch={false} className={styles.secondary+' mb-4'}><ArrowLeft size={18} aria-hidden="true"/>Voltar aos protocolos</Link>
  <header className={styles.head}><div><p className={styles.eyebrow}>PAP-PROTOCOLS</p><h1>{protocol.title}</h1><p className={styles.muted}>{protocol.summary}</p></div><span className={styles.badge}><Clock3 size={14} aria-hidden="true"/>Em revisão</span></header>
  <div className={styles.metadata}><span>Origem informada: {protocol.origin}</span><span>Versão documental: {protocol.version}</span><span>{protocol.identificationNote?'Identificador a confirmar':protocol.codes.join(' / ')+' • a conferir'}</span></div>
  <div className={styles.actions}>{document?<><Link className={styles.button} href={protocolHref(protocol.slug,'documento-original')} prefetch={false}>Abrir PDF original</Link><a className={styles.secondary} href={document.downloadUrl}>Baixar PDF original</a></>:<><button className={styles.secondary} disabled>Abrir PDF original</button><button className={styles.secondary} disabled>Baixar PDF original</button></>}</div>
  {protocol.identificationNote&&<p className={styles.notice}><AlertCircle size={19} aria-hidden="true"/>{protocol.identificationNote}</p>}
  <nav className={styles.tabs} role="tablist" aria-label="Seções do protocolo" onKeyDown={tabKeys}>{protocolTabs.map(t=>{const Icon=icons[t.id];return <Link key={t.id} className={styles.tab} id={baseId+'-tab-'+t.id} role="tab" aria-selected={tab===t.id} aria-controls={baseId+'-panel-'+t.id} tabIndex={tab===t.id?0:-1} href={protocolHref(protocol.slug,t.id)} prefetch={false} scroll={false}><Icon size={19} aria-hidden="true"/>{t.label}</Link>})}</nav>
  <div className={styles.detail}>
   <div className={styles.stack}>
    {protocolTabs.filter(t=>t.id!==tab).map(t=><div key={t.id} id={baseId+'-panel-'+t.id} role="tabpanel" aria-labelledby={baseId+'-tab-'+t.id} hidden/>)}
    <div className={styles.stack} id={baseId+'-panel-'+tab} role="tabpanel" aria-labelledby={baseId+'-tab-'+tab} tabIndex={0}>
    {tab==='visao-geral'&&<><label className={styles.field+' '+styles.overviewSearch}>Buscar nesta referência<input type="search" value={query} onChange={event=>setQuery(event.target.value)} /></label>{!overview.length&&<p role="status">Nenhum trecho encontrado.</p>}<div className={styles.sectionGrid}>{overview.map((section,i)=><article className={styles.panel} key={i}><div className={styles.visualTitle}><span>{i===0?<Target size={21} aria-hidden/>:i%3===0?<Users size={21} aria-hidden/>:i%2===0?<Layers3 size={21} aria-hidden/>:<Stethoscope size={21} aria-hidden/>}</span><h3>{section.title}</h3></div><p className={styles.muted}>{section.text}</p>{protocolTerms[protocol.slug]?.[section.title]&&<ul className={styles.terms} aria-label={'Temas documentados em '+section.title}>{protocolTerms[protocol.slug][section.title].map(term=><li key={term}>{term}</li>)}</ul>}{section.source&&<SourceCitation slug={protocol.slug} source={section.source}/>}</article>)}</div><details className={styles.checkGroup}><summary>Pendências documentais e revisão clínica</summary><p className={styles.muted}>{sourcedProtocols[protocol.slug]?.review}</p></details></>}
    {tab==='fluxograma'&&<ProtocolFlow slug={protocol.slug}/>}
    {tab==='checklist'&&<><SourceIndex slug={protocol.slug} part="checklist"/><ConsultativeChecklist protocol={protocol} marks={marks} onMark={onMark} onClear={onClear}/></>}
    {tab==='documento-original'&&<DocumentState protocol={protocol} initialPage={initialPage}/>}
    </div>
   </div>
   <aside className={styles.aside} aria-label="Procedência e limites"><section className={styles.panel}><h2>Resumo documental</h2><DocumentFacts protocol={protocol}/></section><section className={styles.panel}><h2>Consulta rápida</h2><div className={styles.stack}><Link className={styles.textLink} href={protocolHref(protocol.slug,'fluxograma')} prefetch={false}>Abrir fluxograma</Link><Link className={styles.textLink} href={protocolHref(protocol.slug,'checklist')} prefetch={false}>Consultar checklist</Link></div><p className={styles.muted}>Referência institucional em revisão clínica.</p><Link href={protocolHref(protocol.slug,'documento-original')} className={styles.textLink} prefetch={false} scroll={false}>Situação do PDF original</Link></section></aside>
  </div>
 </>
}
