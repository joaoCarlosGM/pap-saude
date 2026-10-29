'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMetric, parseMetric } from '@/lib/demo/motion'
import { useReducedMotion } from './useReducedMotion'
export default function AnimatedMetric({value}:{value:string}) {
  const reduced = useReducedMotion(), parts = useMemo(() => parseMetric(value),[value])
  const [visual,setVisual] = useState({target:value,text:value})
  const element = useRef<HTMLSpanElement>(null), starts = useRef(0)
  useEffect(() => {
    if (reduced || !parts || parts.target === 0) return
    let frame = 0, began = 0
    frame = requestAnimationFrame(time => {
      began = time; starts.current += 1
      element.current?.setAttribute('data-counter-starts', String(starts.current))
      const tick = (now:number) => {
        const progress = Math.min(1,(now-began)/780)
        setVisual({target:value,text:progress===1?value:formatMetric(parts.target*(1-Math.pow(1-progress,3)),parts)})
        if(progress<1) frame=requestAnimationFrame(tick)
      }
      tick(time)
    })
    return () => cancelAnimationFrame(frame)
  },[value,parts,reduced])
  const text = reduced || !parts ? value : visual.target === value ? visual.text : formatMetric(0,parts)
  return <span ref={element} data-metric-final={value} className="inline-grid tabular-nums">
    <span aria-hidden="true" className="invisible col-start-1 row-start-1">{value}</span>
    <span aria-hidden="true" className="col-start-1 row-start-1">{text}</span>
    <span className="sr-only">{value}</span>
  </span>
}
