'use client'

import {useId, useRef, useState} from 'react'
import Link from 'next/link'
import {ArrowRight, Maximize, Minus, Plus} from 'lucide-react'
import {sourceFlows} from '../../lib/protocol-flow'
import {originalDocuments} from '../../lib/protocol-originals'
import {protocolHref} from '../../lib/protocol-catalog'
import {useOriginalDocument,usePrivateReviewAvailable} from './OriginalDocumentContext'
import OriginalPdfViewer from './OriginalPdfViewer'
import styles from './protocols.module.css'

export default function ProtocolFlow({slug}: {slug: string}) {
  const region = useRef<HTMLElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const nodes = sourceFlows[slug] ?? []
  const original = originalDocuments.find(document => document.slug === slug)
  const documentSource = useOriginalDocument(slug)
  const canAuthorize = usePrivateReviewAvailable()
  const drag = useRef<{pointer: number; x: number; y: number; left: number; top: number} | null>(null)
  const id = useId()
  const [zoom, setZoom] = useState(1)
  const [figure, setFigure] = useState(false)
  const [message, setMessage] = useState('')
  const [path, setPath] = useState<string[]>([])
  const focused = path.at(-1) ?? nodes[0]?.id
  const selected = nodes.find(node => node.id === focused)
  if (!original) return null
  const source = original.flow
  const sourceLabel = `${source.section} · digital ${source.digitalPage} / impressa ${source.printedPage} · v${source.version}`

  function goTo(from: string, nodeId: string) {
    setPath(current => (current.at(-1) === from ? [...current,nodeId] : [from,nodeId]).slice(-20))
    const target = document.getElementById(id + nodeId)
    target?.focus({preventScroll: true})
    target?.scrollIntoView({block: 'nearest', inline: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})
  }

  return <section ref={region} className={styles.panel} aria-label="Fluxograma">
    <h2>Fluxograma</h2>
    <p className={styles.muted}>Mapa de consulta da figura. Critérios completos e condutas estão no original e aguardam revisão clínica.</p>
    <div className={styles.flowToolbar}>
      <button className={styles.secondary} type="button" aria-pressed={figure} onClick={() => setFigure(value => !value)}>{figure ? 'Voltar ao mapa' : 'Figura original'}</button>
      {!figure && <>
        <button className={styles.secondary} type="button" aria-label="Reduzir zoom" disabled={zoom <= .75} onClick={() => setZoom(value => value - .25)}><Minus size={16}/></button>
        <output aria-label="Zoom do mapa">{Math.round(zoom * 100)}%</output>
        <button className={styles.secondary} type="button" aria-label="Ampliar zoom" disabled={zoom >= 2} onClick={() => setZoom(value => value + .25)}><Plus size={16}/></button>
        <button className={styles.secondary} type="button" onClick={() => {setZoom(1); setPath([]); viewport.current?.scrollTo(0, 0)}}>Ajustar</button>
      </>}
      <button className={styles.secondary} type="button" onClick={async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen()
          else await region.current?.requestFullscreen()
          setMessage('')
        } catch {setMessage('Tela cheia indisponível neste navegador.')}
      }}><Maximize size={16}/>Tela cheia</button>
      <Link className={styles.textLink} href={protocolHref(slug, 'documento-original', source.digitalPage)} prefetch={false} scroll={false}>Abrir fonte</Link>
    </div>
    {message && <p role="status">{message}</p>}
    {figure ? documentSource ?
      <OriginalPdfViewer document={documentSource} initialPage={source.digitalPage} figureOnly/> :
      canAuthorize ? <p>Para abrir a figura, <Link className={styles.textLink} href="/vitrine/configuracoes">autorize a consulta privada</Link>.</p> : <p>Figura original indisponível neste ambiente.</p> :
      <>
        {selected && <div className={styles.flowSelection} aria-live="polite">
          <strong>{selected.title}</strong>
          {selected.note && <p className={styles.muted}>{selected.note}</p>}
        </div>}
        <div ref={viewport} className={styles.mapViewport} role="region" aria-label="Mapa navegável do fluxograma" tabIndex={0}
          onPointerDown={event => {
            if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
            const element = event.currentTarget
            if (element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight) return
            drag.current = {pointer: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop}
            element.setPointerCapture(event.pointerId)
          }}
          onPointerMove={event => {
            const origin = drag.current
            if (origin?.pointer === event.pointerId) event.currentTarget.scrollTo(origin.left + origin.x - event.clientX, origin.top + origin.y - event.clientY)
          }}
          onLostPointerCapture={() => {drag.current = null}}
          onKeyDown={event => {
            if (event.target !== event.currentTarget) return
            const step: Record<string, [number, number]> = {ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80]}
            const movement = step[event.key]
            if (movement) {event.preventDefault(); viewport.current?.scrollBy(...movement)}
          }}>
          <ol className={styles.mapNodes} style={{width: Math.max(1, zoom) * 100 + '%', fontSize: zoom + 'rem'}}>
            {nodes.map(node => <li key={node.id} id={id + node.id} tabIndex={-1} aria-describedby={id+'-source'} data-focused={focused === node.id} data-visited={path.includes(node.id)} data-kind={node.kind}>
              <span className={styles.muted}>{node.kind}</span>
              <strong>{node.title}</strong>
              {!!node.next.length && <div className={styles.mapEdges}>{node.next.map(edge => {
                const title = nodes.find(candidate => candidate.id === edge.id)?.title
                const followed = path.some((id,index) => id === node.id && path[index+1] === edge.id)
                return <button type="button" key={edge.id} className={styles.secondary} data-followed={followed} onClick={() => goTo(node.id,edge.id)}>
                  <ArrowRight size={16} aria-hidden/>{edge.label ? edge.label + ' · ' : ''}{title}
                </button>
              })}</div>}
            </li>)}
          </ol>
        </div>
        <details className={styles.checkGroup}><summary>Leitura em lista</summary>
          <ol className={styles.flowList}>{nodes.map(node => <li key={node.id}>{node.title}
            {node.next.length > 0 && <ul>{node.next.map(edge => <li key={edge.id}>{edge.label ? edge.label + ' → ' : '→ '}{nodes.find(candidate => candidate.id === edge.id)?.title}</li>)}</ul>}
          </li>)}</ol>
        </details>
      </>}
    <Link id={id+'-source'} className={styles.textLink} href={protocolHref(slug, 'documento-original', source.digitalPage)} prefetch={false} scroll={false}>{sourceLabel}</Link>
  </section>
}
