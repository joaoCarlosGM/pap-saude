import type {LucideIcon} from 'lucide-react'
import type {ReactNode} from 'react'

export const registrationCard = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'
export const registrationField = 'h-11 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-pink-600'

export function RegistrationHeading({icon:Icon,title,children}: {icon:LucideIcon; title:string; children?:ReactNode}) {
  return <header className="mb-6 flex items-center gap-3">
    <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-pink-50 text-[#C41469]"><Icon size={24} aria-hidden/></span>
    <div><h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {children && <p className="mt-1 text-sm text-slate-600">{children}</p>}
    </div>
  </header>
}

export function RegistrationFooter({onBack,onNext,next='Próximo →'}:{onBack:()=>void;onNext:()=>void;next?:string}) {
  return <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-5">
    <button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">← Voltar</button>
    <button type="button" onClick={onNext} className="min-h-11 rounded-xl bg-[#C41469] px-4 text-sm font-medium text-white hover:bg-pink-800">{next}</button>
  </div>
}
