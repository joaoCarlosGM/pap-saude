'use client'
import Link from 'next/link'
import {useId,useState,type KeyboardEvent} from 'react'
import {AlertCircle,BookOpen,CheckSquare,Clock3,Download,FileLock2,FileText,GitBranch,Minus,Plus,RotateCcw} from 'lucide-react'
import {protocolHref,protocolTabs,reportedDate,type DemoProtocol,type ProtocolTab} from '@/features/vitrine-premium/lib/protocol-catalog'
import Modal from '@/features/vitrine-premium/components/ui/Modal'
import {useOriginalDocument} from './OriginalDocumentContext'
import OriginalPdfViewer from './OriginalPdfViewer'
import SourceIndex from './SourceIndex'
import styles from './protocols.module.css'

export function ReviewNotice(){const privateDocument=useOriginalDocument('sindromes-hipertensivas-gestacao');return <div className={styles.notice}><AlertCircle size={22} aria-hidden="true"/><p><strong>Conteúdo em revisão • demonstração.</strong> {privateDocument?'Bytes dos originais conferidos somente para homologação privada. A publicação pública e a validação clínica permanecem pendentes.':'A distribuição pública dos PDFs não está autorizada. As informações documentais estão disponíveis para revisão, sem homologação clínica.'} Não há orientação clínica homologada, distribuição para UBS ou registro em atendimento.</p></div>}
function DocumentFacts({protocol}:{protocol:DemoProtocol}){return <dl className={styles.facts}><div><dt>Origem informada • não conferida</dt><dd>{protocol.origin}</dd></div><div><dt>Código(s) informado(s) • a confirmar</dt><dd>{protocol.codes.join(' / ')}</dd></div><div><dt>Versão informada</dt><dd>{protocol.version}</dd></div><div><dt>Emissão informada</dt><dd>{reportedDate(protocol.reportedIssuedAt)}</dd></div><div><dt>Próxima revisão informada</dt><dd>{reportedDate(protocol.reportedReviewDue)}</dd></div><div><dt>Estado nesta plataforma</dt><dd>Em revisão • não homologado</dd></div></dl>}
function DocumentState({protocol,initialPage=1}:{protocol:DemoProtocol;initialPage?:number}){const document=useOriginalDocument(protocol.slug);if(document)return <OriginalPdfViewer key={protocol.slug+'-'+initialPage} document={document} initialPage={initialPage}/>;return <section className={styles.panel}><span className={styles.fileIcon}><FileLock2 size={30} aria-hidden="true"/></span><h2>PDF original indisponível</h2><p className={styles.muted}>PDF indisponível neste contexto. A consulta local exige autorização; a distribuição pública e o uso assistencial permanecem pendentes. Nenhum arquivo pode ser aberto sem permissão neste ambiente.</p><div className={styles.metadata}><span>Arquivo informado: {protocol.document.originalFilename}</span><span>{protocol.document.reportedPageCount} páginas digitais informadas • não conferidas</span></div><dl className={styles.facts}><div><dt>SHA-256 esperado • informado, não validado</dt><dd className={styles.hash}>{protocol.document.expectedSha256}</dd></div></dl><p className={styles.muted}>Este hash não comprova a existência ou a validação do arquivo.</p><div className={styles.actions}><button type="button" disabled className={styles.secondary}><FileText size={16} aria-hidden="true"/>Abrir PDF</button><button type="button" disabled className={styles.secondary}><Download size={16} aria-hidden="true"/>Baixar PDF</button></div></section>}
function DocumentFlow({protocol}:{protocol:DemoProtocol}){
 const [zoom,setZoom]=useState(1),[list,setList]=useState(false)
 return <section className={styles.panel}><h2>Roteiro demonstrativo de consulta</h2><p className={styles.muted}>Este esquema representa navegação documental. Não é um fluxograma de conduta clínica. O fluxograma original aguarda conferência e revisão.</p><div className={styles.actions}><button type="button" className={styles.secondary} onClick={()=>setList(!list)} aria-pressed={list}>{list?'Visualização em esquema':'Leitura em lista'}</button>{!list&&<><button type="button" className={styles.secondary} aria-label="Diminuir zoom do esquema" disabled={zoom<=.8} onClick={()=>setZoom(z=>Math.max(.8,Math.round((z-.1)*10)/10))}><Minus size={16} aria-hidden="true"/></button><output aria-label="Zoom do esquema">{Math.round(zoom*100)}%</output><button type="button" className={styles.secondary} aria-label="Aumentar zoom do esquema" disabled={zoom>=1.4} onClick={()=>setZoom(z=>Math.min(1.4,Math.round((z+.1)*10)/10))}><Plus size={16} aria-hidden="true"/></button><button type="button" className={styles.secondary} onClick={()=>setZoom(1)}>Ajustar à tela</button></>}</div>
  {list?<ol className={styles.flowList}>{protocol.flow.map(n=><li key={n.id}><strong>{n.label}</strong><p className={styles.muted}>{n.description}</p></li>)}</ol>:<div className={styles.flowViewport} role="region" aria-label="Esquema documental consultivo, rolável com teclado" tabIndex={0}><ol className={styles.flow} style={{transform:`scale(${zoom})`}}>{protocol.flow.map((n,i)=><li key={n.id}><span className={styles.fileIcon}><FileText size={18} aria-hidden="true"/></span><strong>{i+1}. {n.label}</strong><p>{n.description}</p></li>)}</ol></div>}
  <p className={styles.muted}>{protocol.flowReference}</p><Link className={styles.textLink} href={protocolHref(protocol.slug,'documento-original')} prefetch={false} scroll={false}>Ver situação do documento original</Link>
 </section>
}
function ConsultativeChecklist({protocol,marks,onMark,onClear}:{protocol:DemoProtocol;marks:readonly string[];onMark:(id:string)=>void;onClear:()=>void}){
 const [confirm,setConfirm]=useState(false),total=protocol.checklist.reduce((sum,g)=>sum+g.items.length,0)
 return <section className={styles.panel}><h2>Checklist demonstrativo de consulta</h2><p className={styles.muted}>Checklist clínico em revisão. As marcações abaixo são apenas um roteiro de leitura em memória; não representam ações realizadas, segurança clínica ou registro em prontuário.</p><p role="status" aria-live="polite">{marks.length} de {total} marcações demonstrativas</p><progress className={styles.progress} max={total} value={marks.length} aria-label="Progresso local de leitura, sem significado clínico"/>
  <div className={styles.stack}>{protocol.checklist.map(group=><details className={styles.checkGroup} key={group.id} open><summary>{group.title}</summary><fieldset><legend className="sr-only">{group.title}</legend>{group.items.map(item=><label key={item.id}><input type="checkbox" checked={marks.includes(item.id)} onChange={()=>onMark(item.id)}/><span>{item.label}</span></label>)}</fieldset></details>)}</div>
  <div className={styles.actions}><button type="button" className={styles.secondary} onClick={()=>setConfirm(true)}><RotateCcw size={16} aria-hidden="true"/>Limpar marcações</button><Link className={styles.textLink} href={protocolHref(protocol.slug,'documento-original')} prefetch={false} scroll={false}>Ver documento original</Link></div>
  <Modal open={confirm} onClose={()=>setConfirm(false)} title="Limpar marcações demonstrativas?" maxWidth="sm" footer={<><button type="button" className={styles.secondary} onClick={()=>setConfirm(false)}>Cancelar</button><button type="button" className={styles.button} onClick={()=>{onClear();setConfirm(false)}}>Confirmar limpeza</button></>}><p className={styles.muted}>Somente as marcações de leitura deste protocolo serão apagadas. Nenhum atendimento ou registro clínico é alterado.</p></Modal>
 </section>
}
const icons={'visao-geral':BookOpen,fluxograma:GitBranch,checklist:CheckSquare,'documento-original':FileText}
export default function ProtocolDetail({protocol,tab,marks=[],onMark=()=>{},onClear=()=>{},initialPage=1}:{initialPage?:number;protocol:DemoProtocol;tab:ProtocolTab;marks?:readonly string[];onMark?:(id:string)=>void;onClear?:()=>void}){
 const baseId=useId()
 function tabKeys(event:KeyboardEvent<HTMLElement>){
  if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
  const tabs=Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('[role=tab]')),index=tabs.indexOf(event.target as HTMLAnchorElement)
  if(index<0)return
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length
  tabs[next].focus();tabs[next].click()
 }
 return <>
  <nav className={styles.breadcrumb} aria-label="Navegação estrutural"><Link href="/vitrine/protocolos" prefetch={false}>Protocolos</Link><span aria-hidden="true">/</span><span>{protocol.title}</span></nav>
  <header className={styles.head}><div><p className={styles.eyebrow}>PAP-PROTOCOLS • CONSULTA DEMONSTRATIVA</p><h1>{protocol.title}</h1><p className={styles.muted}>{protocol.summary}</p></div><span className={styles.badge}><Clock3 size={14} aria-hidden="true"/>Em revisão</span></header>
  <div className={styles.metadata}><span>Origem informada: {protocol.origin}</span><span>Versão informada: {protocol.version}</span><span>{protocol.identificationNote?'Identificador a confirmar':protocol.codes.join(' / ')+' • a conferir'}</span></div>
  <ReviewNotice/>
  {protocol.identificationNote&&<p className={styles.notice}><AlertCircle size={19} aria-hidden="true"/>{protocol.identificationNote}</p>}
  <nav className={styles.tabs} role="tablist" aria-label="Seções do protocolo" onKeyDown={tabKeys}>{protocolTabs.map(t=>{const Icon=icons[t.id];return <Link key={t.id} className={styles.tab} id={baseId+'-tab-'+t.id} role="tab" aria-selected={tab===t.id} aria-controls={baseId+'-panel-'+t.id} tabIndex={tab===t.id?0:-1} href={protocolHref(protocol.slug,t.id)} prefetch={false} scroll={false}><Icon size={19} aria-hidden="true"/>{t.label}</Link>})}</nav>
  <div className={styles.detail}>
   <div className={styles.stack}>
    {protocolTabs.filter(t=>t.id!==tab).map(t=><div key={t.id} id={baseId+'-panel-'+t.id} role="tabpanel" aria-labelledby={baseId+'-tab-'+t.id} hidden/>)}
    <div className={styles.stack} id={baseId+'-panel-'+tab} role="tabpanel" aria-labelledby={baseId+'-tab-'+tab} tabIndex={0}>
    {tab==='visao-geral'&&<><SourceIndex slug={protocol.slug}/><section className={styles.panel}><h2>Resumo da referência</h2><p className={styles.muted}>{protocol.summary}</p><p className={styles.muted}>Os tópicos abaixo organizam a futura consulta ao documento. Não oferecem critérios diagnósticos, condutas ou recomendações assistenciais.</p></section><div className={styles.sectionGrid}>{protocol.sections.map(section=><article className={styles.panel} key={section.id}><h3>{section.title}</h3><p className={styles.muted}>{section.description}</p></article>)}</div></>}
    {tab==='fluxograma'&&<><SourceIndex slug={protocol.slug} part="flow"/><DocumentFlow protocol={protocol}/></>}
    {tab==='checklist'&&<><SourceIndex slug={protocol.slug} part="checklist"/><ConsultativeChecklist protocol={protocol} marks={marks} onMark={onMark} onClear={onClear}/></>}
    {tab==='documento-original'&&<DocumentState protocol={protocol} initialPage={initialPage}/>}
    </div>
   </div>
   <aside className={styles.aside} aria-label="Procedência e limites"><section className={styles.panel}><h2>Resumo documental</h2><DocumentFacts protocol={protocol}/></section><section className={styles.panel}><h2>Limites de uso</h2><p className={styles.muted}>Este conteúdo não substitui avaliação profissional. A referência não indica adoção pela UBS. Direitos de uso, aplicabilidade e conteúdo clínico aguardam validação.</p><Link href={protocolHref(protocol.slug,'documento-original')} className={styles.textLink} prefetch={false} scroll={false}>Situação do PDF original</Link></section></aside>
  </div>
 </>
}
