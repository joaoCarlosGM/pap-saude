'use client'

import {Baby, CalendarDays, CalendarClock, Clock} from 'lucide-react'
import {useRef} from 'react'
import Input from '../../ui/Input'
import {RegistrationFooter,RegistrationHeading,registrationCard,registrationField} from '../RegistrationLayout'
import {resolveDating,unitCivilDay,type PregnancyDating} from '../../../lib/gestational-dating'
import {formatDemoDate} from '../../../lib/demo/validation'
import type {RegistrationData} from '../../../types/registration'

const choices = [
  ['dum','Por DUM'], ['ultrasound','Por ultrassom/exame'], ['due-date','DPP conhecida'],
] as const
const blankUltrasound = {source:'ultrasound',date:'',weeks:'',days:'',exam:'',evidence:''} as const
const blankDueDate = {source:'due-date',date:'',origin:'',evidence:''} as const

type Props = {data:RegistrationData;onChange:(value:Partial<RegistrationData>)=>void;onNext:()=>void;onBack:()=>void}

export default function PregnancyStep({data,onChange,onNext,onBack}:Props) {
  const drafts = useRef<Partial<Record<PregnancyDating['source'],PregnancyDating>>>({})
  const source = data.dating?.source ?? (data.dum || data.dumUnknown ? 'dum' : undefined)
  const today = unitCivilDay()
  const pregnancy = resolveDating(data,today)
  const setDating = (dating:PregnancyDating) => {
    drafts.current[dating.source] = dating
    onChange({dating})
  }
  const changeSource = (mode:PregnancyDating['source']) => {
    if (data.dating) drafts.current[data.dating.source] = data.dating
    setDating(drafts.current[mode] ?? (mode==='ultrasound' ? blankUltrasound : mode==='due-date' ? blankDueDate : {source:'dum'}))
  }
  const ultrasound = data.dating?.source==='ultrasound' ? data.dating : null
  const dueDate = data.dating?.source==='due-date' ? data.dating : null
  const results = [
    {icon:Clock,label:'Idade gestacional',value:pregnancy && `${pregnancy.weeks} semanas e ${pregnancy.days} dias`},
    {icon:CalendarDays,label:'Data provável do parto',value:pregnancy && formatDemoDate(pregnancy.dueDate)},
    {icon:CalendarClock,label:'Trimestre',value:pregnancy?.trimester},
  ]
  return <div>
    <RegistrationHeading icon={Baby} title="Gestação atual">Registre a fonte usada para datar a gestação.</RegistrationHeading>
    <div className={`${registrationCard} grid gap-4 lg:grid-cols-[2fr_1fr]`}>
      <fieldset className="min-w-0">
        <legend className="mb-3 font-semibold text-slate-900">Origem da datação</legend>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {choices.map(([mode,label]) => <button type="button" key={mode} aria-pressed={mode===source} onClick={() => changeSource(mode)}
            className="min-h-11 rounded-lg border border-slate-200 px-2 text-sm font-medium text-slate-700 hover:border-pink-400 aria-pressed:border-pink-500 aria-pressed:bg-pink-50 aria-pressed:text-pink-800">{label}</button>)}
        </div>
        {source==='dum' && <div className="grid gap-2">
          <Input required id="dum" type="date" max={today} disabled={data.dumUnknown} label="Data da Última Menstruação (DUM)" value={data.dum}
            className={registrationField} onChange={event=>onChange({dum:event.target.value})}/>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={!!data.dumUnknown} onChange={event=>onChange({dumUnknown:event.target.checked,dum:event.target.checked?'':data.dum})}/>
            DUM desconhecida
          </label>
        </div>}
        {ultrasound && <div className="grid gap-4 sm:grid-cols-2">
          <Input required type="date" max={today} label="Data do ultrassom/exame" className={registrationField} value={ultrasound.date} onChange={event=>setDating({...ultrasound,date:event.target.value})}/>
          <Input required label="Tipo de exame" className={registrationField} maxLength={160} value={ultrasound.exam} onChange={event=>setDating({...ultrasound,exam:event.target.value})}/>
          <Input required type="number" min="0" max="45" label="IG no exame (semanas)" className={registrationField} value={ultrasound.weeks} onChange={event=>setDating({...ultrasound,weeks:event.target.value})}/>
          <Input required type="number" min="0" max="6" label="IG no exame (dias)" className={registrationField} value={ultrasound.days} onChange={event=>setDating({...ultrasound,days:event.target.value})}/>
          <div className="sm:col-span-2"><Input required label="Evidência do exame" className={registrationField} maxLength={160} value={ultrasound.evidence} onChange={event=>setDating({...ultrasound,evidence:event.target.value})}/></div>
        </div>}
        {dueDate && <div className="grid gap-4 sm:grid-cols-2">
          <Input required type="date" label="DPP informada" className={registrationField} value={dueDate.date} onChange={event=>setDating({...dueDate,date:event.target.value})}/>
          <Input required label="Origem da DPP" className={registrationField} maxLength={160} value={dueDate.origin} onChange={event=>setDating({...dueDate,origin:event.target.value})}/>
          <div className="sm:col-span-2"><Input required label="Justificativa ou documento" className={registrationField} maxLength={160} value={dueDate.evidence} onChange={event=>setDating({...dueDate,evidence:event.target.value})}/></div>
        </div>}
      </fieldset>
      <section aria-label="Resultado da datação" className="rounded-xl bg-pink-50 p-4">
        <p className="mb-3 text-xs text-slate-600">Referência da unidade em {formatDemoDate(today)}</p>
        <dl className="space-y-3">{results.map(({icon:Icon,label,value}) => <div key={label} className="flex gap-2">
          <Icon size={18} className="mt-1 shrink-0 text-[#C41469]" aria-hidden/>
          <div><dt className="text-sm text-slate-700">{label}</dt><dd className="font-semibold text-slate-900">{value ?? 'Não informado'}</dd></div>
        </div>)}</dl>
      </section>
    </div>
    <fieldset className={`${registrationCard} mt-4`} aria-labelledby="first-visit-title">
      <p id="first-visit-title" className="font-medium">É o primeiro atendimento desta gestação?</p>
      <div className="mt-2 flex gap-2">{([true,false] as const).map(value=><button type="button" key={String(value)} aria-pressed={data.primeiroAtendimento===value}
        className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm aria-pressed:border-pink-500 aria-pressed:bg-pink-50 aria-pressed:text-pink-800"
        onClick={()=>onChange({primeiroAtendimento:value})}>{value?'Sim':'Não'}</button>)}</div>
    </fieldset>
    <RegistrationFooter onBack={onBack} onNext={onNext}/>
  </div>
}
