'use client'
import Link from 'next/link'
import {ArrowUpRight,Download,FileText,Clock3} from 'lucide-react'
import {protocolHref,type DemoProtocol} from '@/features/vitrine-premium/lib/protocol-catalog'
import {useOriginalDocument} from './OriginalDocumentContext'
import styles from './protocols.module.css'

export default function ProtocolCard({protocol}:{protocol:DemoProtocol}){
 const document=useOriginalDocument(protocol.slug)
 return <article className={styles.card}>
  <div className={styles.cardTop}><span className={styles.fileIcon}><FileText size={24} aria-hidden="true"/></span><span className={styles.badge}><Clock3 size={13} aria-hidden="true"/>Em revisão</span></div>
  <div><p className={styles.eyebrow}>{protocol.category}</p><h2>{protocol.title}</h2></div>
  <p className={styles.muted}>{protocol.summary}</p>
  <dl className={styles.facts}><div><dt>Origem informada</dt><dd>{protocol.origin}</dd></div><div><dt>Código informado • a conferir</dt><dd>{protocol.identificationNote?'Identificador a confirmar':protocol.codes.join(' / ')}</dd></div><div><dt>Versão informada</dt><dd>{protocol.version}</dd></div></dl>
  <div className={styles.actions}><Link className={styles.button} href={protocolHref(protocol.slug)} prefetch={false}>Visualizar<ArrowUpRight size={16} aria-hidden="true"/></Link>{document?<a className={styles.secondary} href={document.downloadUrl}><Download size={15} aria-hidden="true"/>Baixar PDF</a>:<button type="button" disabled className={styles.secondary}><Download size={15} aria-hidden="true"/>Baixar PDF</button>}</div>
 </article>
}
