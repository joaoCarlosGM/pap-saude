"use client";
import { useEffect,useId,useRef } from "react";
/** Native modal: browser focus trap, Escape, inert background and focus restoration. */
export default function Dialog({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();return()=>{if(d.open)d.close();};},[open]);
  return <dialog ref={ref} aria-labelledby={id} onCancel={event=>{event.preventDefault();onClose();}} onClose={onClose} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-pink-100 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <div className="mb-4 flex items-start justify-between gap-4"><h2 id={id} className="text-xl font-semibold">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar detalhes" className="h-10 rounded-lg border px-3">Fechar</button></div>{children}
  </dialog>;
}
