import Link from "next/link";
export type PatientPresentation={id:string;name:string;description:string;detail?:string;active?:boolean;href?:string};
/** Provider-independent surface: only authorized data supplied by the caller. */
export default function PatientCollection({items,onOpen}:{items:PatientPresentation[];onOpen?:(id:string)=>void}){
 return <div className="grid gap-4 lg:grid-cols-2">{items.map(p=>{
  const content=<div className="flex min-w-0 items-start gap-4"><span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pink-100 font-semibold text-pink-800">{p.name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('')}</span><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold text-slate-900">{p.name}</h2><p className="mt-2 text-sm text-slate-600">{p.description}</p>{p.detail&&<p className="mt-1 break-words text-sm text-slate-600">{p.detail}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3">{p.active!==undefined&&<span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{p.active?'Ativa':'Inativa'}</span>}<span className="rounded-lg bg-pink-50 px-3 py-2 text-sm font-semibold text-pink-800">Ver prontuário →</span></div></div></div>;
  const css="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-pink-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-pink-700";
  return p.href?<Link key={p.id} href={p.href} className={css}>{content}</Link>:<button key={p.id} type="button" className={css} onClick={()=>onOpen?.(p.id)} aria-label={`Ver ficha de ${p.name.replace('Paciente Demo ','')}`}>{content}</button>;
 })}</div>;
}
