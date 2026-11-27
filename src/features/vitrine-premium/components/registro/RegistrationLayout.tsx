import {ChevronLeft,ChevronRight} from 'lucide-react'
import type {LucideIcon} from 'lucide-react'
import type {ReactNode} from 'react'

export const registrationCard = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'
export const registrationField = 'h-11 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-pink-600'

export function RegistrationCardHeading({icon:Icon,title,children}: {icon:LucideIcon; title:string; children?:ReactNode}) {
  return <header className="mb-4 flex items-center gap-3">
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pink-50 text-[#C41469]"><Icon size={21} aria-hidden/></span>
    <div className="min-w-0"><h3 className="font-semibold text-slate-900">{title}</h3>
      {children && <p className="mt-1 text-xs text-slate-600">{children}</p>}
    </div>
  </header>
}

export function RegistrationHeading({icon:Icon,title,children}: {icon:LucideIcon; title:string; children?:ReactNode}) {
  return <header className="mb-6 flex items-center gap-4">
    <span className="grid size-[52px] shrink-0 place-items-center rounded-[14px] bg-pink-50 text-[#C41469]"><Icon size={24} aria-hidden/></span>
    <div><h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {children && <p className="mt-1 text-sm text-slate-600">{children}</p>}
    </div>
  </header>
}

export function RegistrationFooter({onBack,onNext,next='Próximo →'}:{onBack:()=>void;onNext:()=>void;next?:string}) {
  return <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-5">
    <button type="button" onClick={onBack} aria-label="← Voltar" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink-300 bg-white px-4 text-sm font-medium text-[#C41469] hover:bg-pink-50"><ChevronLeft size={17} aria-hidden/>Voltar</button>
    <button type="button" onClick={onNext} aria-label={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C41469] px-4 text-sm font-medium text-white hover:bg-pink-800">{next.replace(' →','')}<ChevronRight size={17} aria-hidden/></button>
  </div>
}
