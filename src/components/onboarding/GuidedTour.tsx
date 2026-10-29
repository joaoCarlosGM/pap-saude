'use client'
import { useEffect, useRef, useState, useId, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { placeTour } from '@/lib/onboarding/tour'
import type { TourStep, TourRect } from '@/types/tour'
import styles from './guided-tour.module.css'

const subscribeClient=()=>()=>{}
const clientSnapshot=()=>true
const serverSnapshot=()=>false
type Layout = { id:string; rect:TourRect|null; viewport:{width:number;height:number} }
type Props = {
  steps:readonly TourStep[]; index:number; onIndexChange:(next:number)=>void; onClose:()=>void
  menuOpen?:boolean; onMenuToggle?:()=>void
}
// Pure presentation: host-supplied steps must already be authorized. Never fetches clinical APIs.
export default function GuidedTour({steps,index,onIndexChange,onClose,menuOpen=false,onMenuToggle}:Props) {
  const client=useSyncExternalStore(subscribeClient,clientSnapshot,serverSnapshot)
  const step=steps[index], pathname=usePathname(), titleId=useId()
  const panel=useRef<HTMLDivElement>(null)
  const [layout,setLayout]=useState<Layout|null>(null)
  useEffect(()=>{
    if(!client||!step||pathname!==step.path)return
    let frame=0,attempts=0,primary:HTMLElement|null=null
    const highlighted:HTMLElement[]=[]
    function visible(el:HTMLElement|null){return !!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'}
    const measure=()=>{
      const viewport={width:innerWidth,height:innerHeight},mobile=viewport.width<768
      const selector=mobile&&menuOpen?`[data-tour-nav="${step.navSelectors?.[0]||step.path}"]`:step.selector
      let target=document.querySelector<HTMLElement>(selector)
      if(!visible(target)){
        if(attempts++<120){frame=requestAnimationFrame(measure);return}
        setLayout({id:step.id,rect:null,viewport});return
      }
      if(target!.getBoundingClientRect().height>viewport.height-210)target=target!.querySelector<HTMLElement>('h1,h2,input,button')||target
      if(target!==primary){
        if(primary){primary.classList.remove(styles.target);primary.removeAttribute('data-guided-target')}
        // A smaller real heading/control is a safe anchor when the card is taller than the viewport.
        primary=target;primary!.classList.add(styles.target);primary!.setAttribute('data-guided-target','true')
        primary!.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'})
      }
      const r=primary!.getBoundingClientRect()
      const rect={top:Math.max(8,r.top),left:Math.max(8,r.left),width:Math.min(r.width,viewport.width-16),height:Math.min(r.height,viewport.height-16)}
      setLayout(current=>current?.id===step.id&&JSON.stringify(current.rect)===JSON.stringify(rect)&&current.viewport.width===viewport.width&&current.viewport.height===viewport.height?current:{id:step.id,rect,viewport})
    }
    for(const path of step.navSelectors||[]){const el=document.querySelector<HTMLElement>(`[data-tour-nav="${path}"]`);if(el){el.classList.add(styles.target);highlighted.push(el)}}
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)}
    schedule();window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true)
    const observer=new ResizeObserver(schedule);if(document.querySelector('main'))observer.observe(document.querySelector('main')!)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);observer.disconnect();for(const el of highlighted)el.classList.remove(styles.target);if(primary){primary.classList.remove(styles.target);primary.removeAttribute('data-guided-target')}}
  },[client,step,pathname,menuOpen])
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;panel.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus({preventScroll:true});return()=>{if(previous?.isConnected)previous.focus({preventScroll:true})}},[client,index])
  if(!client||!step)return null
  const geometry=layout?.id===step.id&&pathname===step.path?layout:null
  const viewport=geometry?.viewport||{width:320,height:600}
  const position=geometry?.rect?placeTour(geometry.rect,viewport):{left:12,top:12,width:Math.min(360,viewport.width-24),maxHeight:viewport.height-24}
  return createPortal(<div className={styles.layer}>
    {geometry?.rect&&<div aria-hidden="true" data-tour-spotlight className={styles.spotlight} style={geometry.rect}/>}
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.panel} style={position} data-tour-step={step.id} data-tour-ready={!!geometry?.rect}
      onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}if(e.key==='Tab'){const buttons=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')||[]).filter(el=>el.getClientRects().length>0);if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0]?.focus()}}}}>
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-pink-600">Etapa {index+1} de {steps.length}</p><button type="button" onClick={onClose} aria-label="Fechar tutorial" className="rounded p-1 text-slate-500 focus-visible:outline-2"><X size={16}/></button></div>
      <h2 id={titleId} className="mt-2 text-base font-semibold text-slate-900">{step.title}</h2>
      <p className="mt-2 text-sm leading-5 text-slate-600">{step.description}</p>
      {pathname!==step.path&&<Button size="sm" variant="outline" onClick={()=>onIndexChange(index)}>Retomar esta etapa</Button>}
      {!geometry?.rect&&<p role="status" className="mt-2 text-xs text-slate-500">Localizando o recurso nesta página. Você pode pular ou fechar a qualquer momento.</p>}
      {onMenuToggle&&<button type="button" className="mt-2 rounded px-2 py-1 text-xs text-pink-600 underline md:hidden" onClick={onMenuToggle}>{menuOpen?'Ver conteúdo':'Ver no menu'}</button>}
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={index===0} onClick={()=>onIndexChange(index-1)}>Anterior</Button>{index===steps.length-1?<Button size="sm" onClick={onClose}>Concluir</Button>:<Button size="sm" onClick={()=>onIndexChange(index+1)}>Próximo</Button>}<Button size="sm" variant="ghost" onClick={onClose}>Pular</Button></div>
    </div>
  </div>,document.body)
}
