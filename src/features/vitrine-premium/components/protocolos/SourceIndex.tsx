'use client'
import Link from 'next/link'
import {useOriginalDocument} from './OriginalDocumentContext'
import {protocolHref} from '../../lib/protocol-catalog'
import type {SourceHeading} from '../../lib/protocol-originals'
import styles from './protocols.module.css'
export default function SourceIndex({slug,part='overview'}:{slug:string;part?:'overview'|'flow'|'checklist'}){
 const document=useOriginalDocument(slug);if(!document)return null
 const headings:SourceHeading[]=part==='overview'?document.headings:part==='flow'?[document.flow]:[document.checklist]
 return <section className={styles.panel}><h2>Procedência documental • em revisão</h2><p className={styles.muted}>Índice de seções conferidas no PDF, não transcrição de condutas ou checklist assistencial. As marcações desta demonstração continuam sendo somente de leitura.</p><ul>{headings.map(h=><li key={h.section} className={styles.sourceItem}><Link className={styles.textLink} prefetch={false} scroll={false} href={protocolHref(slug,'documento-original',h.digitalPage)}>{h.section}</Link><p className={styles.muted}>Página digital {h.digitalPage} • impressa {h.printedPage} • versão {h.version}</p></li>)}</ul>{document.notes&&<p className={styles.muted}>{document.notes}</p>}</section>
}
