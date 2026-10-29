"use client";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
/** Measures the actual authorized menu. Does not dispatch router actions. */
export default function ActiveIndicator() {
  const ref=useRef<HTMLSpanElement>(null),path=usePathname();
  useLayoutEffect(()=>{
    const el=ref.current, parent=el?.parentElement;if(!el||!parent)return;
    const update=()=>{
      const active=parent.querySelector<HTMLElement>('[aria-current="page"]');
      el.style.opacity=active?'1':'0';
      if(active){el.style.height=`${active.offsetHeight}px`;el.style.transform=`translateY(${active.offsetTop}px)`;}
    };
    update(); const observer=new ResizeObserver(update); observer.observe(parent);
    window.addEventListener('resize',update);
    return()=>{observer.disconnect();window.removeEventListener('resize',update);};
  },[path]);
  return <span ref={ref} aria-hidden="true" className="premium-active-indicator"/>;
}
