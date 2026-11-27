'use client'

import {useEffect,useId,useRef,useState,useSyncExternalStore} from 'react'
import Link from 'next/link'
import {ArrowRight,FileText,Maximize,Minus,Pause,Play,Plus,RotateCcw,Split,Stethoscope} from 'lucide-react'
import {sourceFlows,type SourceNode} from '../../lib/protocol-flow'
import {edgeKey,flowFrames,frameDuration,visibleFlow,type FlowPlayback} from '../../lib/protocol-reveal'
import {figureCrops,flowLanes} from '../../lib/protocol-flow-layout'
import {originalDocuments} from '../../lib/protocol-originals'
import {protocolHref} from '../../lib/protocol-catalog'
import {useOriginalDocument,usePrivateReviewAvailable} from './OriginalDocumentContext'
import OriginalPdfViewer from './OriginalPdfViewer'
import styles from './protocols.module.css'

const mapWidth=770,cardWidth=208,cardHeight=94,rowHeight=132
const motionQuery='(prefers-reduced-motion: reduce)'
const reduceMotion=()=>window.matchMedia(motionQuery).matches
const subscribeMotion=(refresh:()=>void)=>{
  const query=window.matchMedia(motionQuery)
  query.addEventListener('change',refresh)
  return ()=>query.removeEventListener('change',refresh)
}
const getServerMotion=()=>false
const notes = new Set(['Nota da figura','Em paralelo','Ação lateral','Critérios','Rodapé da figura','Consultar causa','Voltar às causas','Consultar retirada','Sangramento reaparece','Orientação transversal da figura'])
type Position={x:number;y:number}

function edgeGeometry(from:Position,to:Position,hint:boolean) {
  if (from.y===to.y) {
    const forward=from.x<to.x
    const start=from.x+(forward?cardWidth:0), end=to.x+(forward?0:cardWidth), y=from.y+cardHeight/2
    const bend=hint ? 9 : 0
    return {path:`M ${start} ${y+bend} H ${end}`,x:(start+end)/2,y:y+bend-5}
  }
  const downward=from.y<to.y
  const startX=from.x+cardWidth/2, endX=to.x+cardWidth/2
  const startY=from.y+(downward?cardHeight:0),endY=to.y+(downward?0:cardHeight)
  const middle=downward?startY+20:endY+12
  return {path:`M ${startX} ${startY} V ${middle} H ${endX} V ${endY}`,x:(startX+endX)/2,y:middle-6}
}

export default function ProtocolFlow({slug}: {slug:string}) {
  const original=originalDocuments.find(document=>document.slug===slug)
  if (!original || !sourceFlows[slug]) return null
  return <FlowMap key={slug} slug={slug} original={original} nodes={sourceFlows[slug]}/>
}

function FlowMap({slug,original,nodes}:{slug:string;original:typeof originalDocuments[number];nodes:SourceNode[]}) {
  const region=useRef<HTMLElement>(null)
  const viewport=useRef<HTMLDivElement>(null)
  const drag=useRef<{pointer:number;x:number;y:number;left:number;top:number}|null>(null)
  const id=useId()
  const documentSource=useOriginalDocument(slug)
  const canAuthorize=usePrivateReviewAvailable()
  const reduced=useSyncExternalStore(subscribeMotion,reduceMotion,getServerMotion)
  const [playback,setPlayback]=useState<FlowPlayback>('idle')
  const [frame,setFrame]=useState(0)
  const [zoom,setZoom]=useState(1)
  const [figure,setFigure]=useState(false)
  const [showCrop,setShowCrop]=useState(false)
  const [message,setMessage]=useState('')
  const [path,setPath]=useState<string[]>([])
  const frames=flowFrames(nodes)
  const lanes=flowLanes[slug]
  const source=original.flow
  const mapHeight=lanes.length*rowHeight+20
  const sourceLabel=`${source.section} · digital ${source.digitalPage} / impressa ${source.printedPage} · v${source.version}`
  const positions=new Map(lanes.flatMap((row,y)=>row.flatMap((node,x)=>node ? [[node,{x:21+x*260,y:22+y*rowHeight}] as const] : [])))
  const selected=nodes.find(node=>node.id===path.at(-1))
  const complete=reduced || playback==='complete' || frame>=frames.length
  const visible=visibleFlow(frames,complete?frames.length:frame)
  const active=complete?'complete':playback

  useEffect(()=>{
    if (reduced || figure || complete || (playback!=='idle' && playback!=='playing')) return
    const timer=window.setTimeout(()=>{
      setPlayback('playing')
      setFrame(value=>value+1)
    },frameDuration)
    return ()=>window.clearTimeout(timer)
  },[playback,reduced,figure,frame,complete])

  useEffect(()=>{
    const pane=viewport.current
    if (figure || !pane) return
    const center=()=>{pane.scrollLeft=Math.max(0,(mapWidth-pane.clientWidth)/2)}
    const observer=new ResizeObserver(center)
    observer.observe(pane)
    center()
    return ()=>observer.disconnect()
  },[figure])

  function select(nodeId:string,from?:string) {
    if (!complete) setPlayback('paused')
    setShowCrop(false)
    setPath(current=>from ? (current.at(-1)===from?[...current,nodeId]:[from,nodeId]).slice(-20) : [nodeId])
    const button=document.getElementById(id+nodeId)
    button?.focus({preventScroll:true})
    button?.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced?'instant':'smooth'})
  }
  function restart(play:boolean) {
    setFrame(0);setPlayback(play?'playing':'paused');setPath([]);setShowCrop(false)
    viewport.current?.scrollTo(0,0)
  }
  function adjust() {
    const pane=viewport.current
    setZoom(1)
    pane?.scrollTo({left:pane.scrollWidth>pane.clientWidth ? Math.max(0,(pane.scrollWidth-pane.clientWidth)/2):0,top:0})
  }
  function toggleFigure() {
    setFigure(value=>!value)
    if (!complete) setPlayback('paused')
  }
  const privatePrompt=canAuthorize ? <p>Para abrir a figura, <Link className={styles.textLink} href="/vitrine/configuracoes">autorize a consulta privada</Link>.</p> : <p>Figura original indisponível neste ambiente.</p>
  return <section ref={region} className={styles.panel} aria-label="Fluxograma" onKeyDown={event=>{
    if (event.key==='Escape'&&document.fullscreenElement===region.current) void document.exitFullscreen()
  }}>
    <h2>Fluxograma</h2>
    <div className={styles.flowToolbar}>
      {!figure && <>
        <button className={styles.secondary} type="button" disabled={reduced} onClick={()=>{
          if (complete) restart(true)
          else setPlayback(playback==='playing'?'paused':'playing')
        }}>{playback==='playing'&&!complete?<Pause size={16} aria-hidden/>:<Play size={16} aria-hidden/>}{complete||playback==='idle'?'Reproduzir':playback==='playing'?'Pausar':'Continuar'}</button>
        <button className={styles.secondary} type="button" disabled={reduced} onClick={()=>restart(false)}><RotateCcw size={16} aria-hidden/>Reiniciar</button>
        <button className={styles.secondary} type="button" onClick={()=>{setPlayback('complete');setFrame(frames.length)}} aria-pressed={complete}>Ver completo</button>
      </>}
      <button className={styles.secondary} type="button" aria-pressed={figure} onClick={toggleFigure}><FileText size={16} aria-hidden/>{figure?'Voltar ao mapa':'Figura original'}</button>
      {!figure && <div className={styles.flowZoom}>
        <button className={styles.secondary} type="button" aria-label="Reduzir zoom" disabled={zoom<=.75} onClick={()=>setZoom(value=>value-.25)}><Minus size={16}/></button>
        <output aria-label="Zoom do mapa">{Math.round(zoom*100)}%</output>
        <button className={styles.secondary} type="button" aria-label="Ampliar zoom" disabled={zoom>=2} onClick={()=>setZoom(value=>value+.25)}><Plus size={16}/></button>
        <button className={styles.secondary} type="button" onClick={adjust}>Ajustar</button>
      </div>}
      <button className={styles.secondary} type="button" onClick={async()=>{
        try {
          if(document.fullscreenElement===region.current) await document.exitFullscreen()
          else await region.current?.requestFullscreen()
          setMessage('')
        } catch {setMessage('Tela cheia indisponível neste navegador.')}
      }}><Maximize size={16} aria-hidden/>Tela cheia</button>
      <Link className={styles.textLink} href={protocolHref(slug,'documento-original',source.digitalPage)} prefetch={false} scroll={false}>Abrir fonte</Link>
    </div>
    {message && <p role="status">{message}</p>}
    {figure ? documentSource ? <OriginalPdfViewer document={documentSource} initialPage={source.digitalPage} figureOnly/> : privatePrompt : <>
      <p className={styles.muted} aria-live="polite" data-flow-status={active}>{complete ? (reduced?'Mapa completo · movimento reduzido.':'Mapa completo.') : playback==='paused'?'Construção pausada.':frame===0?'A animação vai começar.':'Construindo o mapa…'}</p>
      <p className={styles.muted}>Linhas tracejadas indicam notas e referências da figura.</p>
      <div ref={viewport} className={styles.mapViewport} role="region" aria-label="Mapa navegável do fluxograma" tabIndex={0}
        data-flow-frame={complete?frames.length:frame} data-flow-total={frames.length}
        onPointerDown={event=>{
          if(event.pointerType!=='mouse'||event.button!==0||(event.target as Element).closest('button'))return
          const element=event.currentTarget
          if(element.scrollWidth<=element.clientWidth&&element.scrollHeight<=element.clientHeight)return
          drag.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,left:element.scrollLeft,top:element.scrollTop}
          element.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event=>{
          const origin=drag.current
          if(origin?.pointer===event.pointerId)event.currentTarget.scrollTo(origin.left+origin.x-event.clientX,origin.top+origin.y-event.clientY)
        }}
        onLostPointerCapture={()=>{drag.current=null}}
        onKeyDown={event=>{
          if(event.target!==event.currentTarget)return
          const steps:Record<string,[number,number]>={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,-80],ArrowDown:[0,80]}
          const movement=steps[event.key]
          if(movement){event.preventDefault();event.currentTarget.scrollBy(...movement)}
        }}>
        <div className={styles.diagramSpace} style={{width:mapWidth*zoom,height:mapHeight*zoom}}>
          <div className={styles.diagram} style={{width:mapWidth,height:mapHeight,transform:`scale(${zoom})`}}>
            <svg className={styles.diagramLines} width={mapWidth} height={mapHeight} role="img" aria-label="Conexões do fluxograma">
              <title>Conexões documentais e notas</title>
              <defs><marker id={id+'arrow'} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>
              {nodes.flatMap(node=>node.next.filter(edge=>visible.edges.has(edgeKey(node.id,edge.id))).map(edge=>{
                const from=positions.get(node.id),to=positions.get(edge.id)
                if(!from||!to)return null
                const hint=notes.has(edge.label??''),position=edgeGeometry(from,to,hint)
                const decision=edge.label==='Sim'||edge.label==='Não'
                const followed=path.some((step,index)=>step===node.id&&path[index+1]===edge.id)
                return <g key={edgeKey(node.id,edge.id)} data-followed={followed} data-flow-edge>
                  <title>{`${node.title} → ${nodes.find(target=>target.id===edge.id)?.title}${edge.label?' · '+edge.label:''}`}</title>
                  <path d={position.path} pathLength="1" markerEnd={`url(#${id}arrow)`} className={styles.diagramEdge} data-note={hint} data-drawing={!complete}/>
                  {decision && <text x={position.x+(from.x===to.x?14:0)} y={position.y} textAnchor="middle">{edge.label}</text>}
                </g>
              }))}
            </svg>
            {nodes.filter(node=>visible.nodes.has(node.id)).map(node=>{
              const at=positions.get(node.id)
              if(!at)return null
              const Icon=node.kind==='decisão'?Split:node.kind==='referência'?FileText:Stethoscope
              return <button id={id+node.id} key={node.id} type="button" className={styles.diagramNode} style={{left:at.x,top:at.y,width:cardWidth,height:cardHeight}}
                onClick={()=>select(node.id)} data-flow-node data-kind={node.kind} data-focused={selected?.id===node.id}
                data-visited={path.includes(node.id)} aria-expanded={selected?.id===node.id} aria-controls={selected?.id===node.id ? id+'-detail' : undefined}>
                <Icon size={16} aria-hidden/>{node.title}
              </button>
            })}
          </div>
        </div>
      </div>
      {selected && <section id={id+'-detail'} className={styles.flowSelection} aria-label="Detalhes do nó">
        <div className={styles.actions}><h3>{selected.title}</h3><button className={styles.secondary} type="button" onClick={()=>{document.getElementById(id+selected.id)?.focus();setPath([])}}>Fechar detalhes</button></div>
        {selected.note && <p className={styles.muted}>{selected.note}</p>}
        <p className={styles.muted}>{source.section} · página {source.digitalPage}</p>
        <div className={styles.actions}>
          {selected.next.filter(edge=>visible.nodes.has(edge.id)).map(edge=><button type="button" key={edge.id} className={styles.secondary} onClick={()=>select(edge.id,selected.id)}>
            <ArrowRight size={16} aria-hidden/>{edge.label?edge.label+' · ':''}{nodes.find(node=>node.id===edge.id)?.title}
          </button>)}
          {figureCrops[slug]?.[selected.id] && <button type="button" className={styles.secondary} aria-expanded={showCrop} onClick={()=>setShowCrop(value=>!value)}>{showCrop?'Fechar recorte':'Ver recorte da figura'}</button>}
        </div>
        {showCrop && (documentSource ? <OriginalPdfViewer key={selected.id} document={documentSource} initialPage={source.digitalPage} figureOnly crop={figureCrops[slug][selected.id]}/> : privatePrompt)}
      </section>}
    </>}
    <Link id={id+'-source'} className={styles.textLink} href={protocolHref(slug,'documento-original',source.digitalPage)} prefetch={false} scroll={false}>{sourceLabel}</Link>
  </section>
}
