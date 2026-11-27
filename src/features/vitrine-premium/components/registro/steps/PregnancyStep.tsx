'use client'

import {Baby,Calendar,CalendarDays,Clock,Info,Layers} from 'lucide-react'
import {useRef} from 'react'
import Input from '../../ui/Input'
import {RegistrationCardHeading,RegistrationFooter,RegistrationHeading,registrationCard,registrationField} from '../RegistrationLayout'
import {datingLabels,resolveDating,unitCivilDay,type PregnancyDating} from '../../../lib/gestational-dating'
import {formatDemoDate} from '../../../lib/demo/validation'
import type {Patient} from '../../../types/paciente'
import type {RegistrationData} from '../../../types/registration'

const choices = [
  ['dum','Por DUM',CalendarDays], ['ultrasound','Por ultrassom/exame',Layers], ['due-date','DPP conhecida',Calendar],
] as const
const blankUltrasound = {source:'ultrasound',date:'',weeks:'',days:'',exam:'',evidence:''} as const
const blankDueDate = {source:'due-date',date:'',origin:'',evidence:''} as const

type Props = {data:RegistrationData;onChange:(value:Partial<RegistrationData>)=>void;onNext:()=>void;onBack:()=>void;history?:Patient['obstetricHistory']}

export default function PregnancyStep({data,onChange,onNext,onBack,history}:Props) {
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
    {icon:Clock,label:'IG atual',value:pregnancy && `${pregnancy.weeks} semanas e ${pregnancy.days} dias`},
    {icon:CalendarDays,label:'DPP',value:pregnancy && formatDemoDate(pregnancy.dueDate)},
    {icon:Layers,label:'Trimestre',value:pregnancy?.trimester},
  ]
  const historyRows = [
    ['Gestações anteriores',data.pregnancies || history?.pregnancies],['Partos',data.deliveries || history?.deliveries],
    ['Cesáreas',data.cesareans || history?.cesareans],['Perdas gestacionais',data.pregnancyLosses || history?.abortions],
  ] as const
  const knownHistory=historyRows.filter(([,value])=>value!==null&&value!==undefined)
  return <div>
    <div className={registrationCard} data-registration-pregnancy>
    <RegistrationHeading icon={Baby} title="Gestação atual">Registre a fonte usada para datar a gestação.</RegistrationHeading>
    <div className={`${registrationCard} grid items-start gap-4 min-[1100px]:grid-cols-[66fr_34fr]`}>
      <fieldset className="min-w-0">
        <legend className="mb-3 font-semibold text-slate-900">Origem da datação</legend>
        <div className="mb-4 grid gap-1 rounded-xl bg-slate-50 p-1 sm:grid-cols-3 sm:gap-0">
          {choices.map(([mode,label,Icon]) => <button type="button" key={mode} aria-pressed={mode===source} onClick={() => changeSource(mode)}
            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 hover:border-pink-400 aria-pressed:border-pink-500 aria-pressed:bg-pink-50 aria-pressed:text-pink-800"><Icon size={16} className="shrink-0" aria-hidden/>{label}</button>)}
        </div>
        {source==='dum' && <div className="grid gap-2">
          <Input required id="dum" type="date" max={today} disabled={data.dumUnknown} label="Data da Última Menstruação (DUM)" value={data.dum}
            className={registrationField} onChange={event=>onChange({dum:event.target.value})}/>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={!!data.dumUnknown} onChange={event=>onChange({dumUnknown:event.target.checked,dum:event.target.checked?'':data.dum})}/>
            DUM desconhecida
          </label>
        </div>}
        {ultrasound && <div className="grid gap-4 sm:grid-cols-2 min-[1100px]:grid-cols-3">
          <Input required type="date" max={today} label="Data do ultrassom/exame" className={registrationField} value={ultrasound.date} onChange={event=>setDating({...ultrasound,date:event.target.value})}/>
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-slate-700">IG no exame</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Input required type="number" min="0" max="45" aria-label="IG no exame (semanas)" placeholder="Semanas" className={registrationField} value={ultrasound.weeks} onChange={event=>setDating({...ultrasound,weeks:event.target.value})}/>
              <Input required type="number" min="0" max="6" aria-label="IG no exame (dias)" placeholder="Dias" className={registrationField} value={ultrasound.days} onChange={event=>setDating({...ultrasound,days:event.target.value})}/>
            </div>
          </fieldset>
          <Input required label="Tipo de exame" className={registrationField} maxLength={160} value={ultrasound.exam} onChange={event=>setDating({...ultrasound,exam:event.target.value})}/>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-full">Evidência do exame
            <textarea required className={`${registrationField} min-h-16 py-2`} rows={2} maxLength={160} value={ultrasound.evidence} onChange={event=>setDating({...ultrasound,evidence:event.target.value})}/>
          </label>
        </div>}
        {dueDate && <div className="grid gap-4 sm:grid-cols-2 min-[1100px]:grid-cols-3">
          <Input required type="date" label="DPP informada" className={registrationField} value={dueDate.date} onChange={event=>setDating({...dueDate,date:event.target.value})}/>
          <Input required label="Origem da DPP" helperText="Documento ou responsável pela confirmação." className={registrationField} maxLength={160} value={dueDate.origin} onChange={event=>setDating({...dueDate,origin:event.target.value})}/>
          <div className="sm:col-span-full"><Input required label="Justificativa ou documento" className={registrationField} maxLength={160} value={dueDate.evidence} onChange={event=>setDating({...dueDate,evidence:event.target.value})}/></div>
        </div>}
      </fieldset>
      <section aria-label="Resultado da datação" className="min-w-0 border-t border-slate-200 pt-4 min-[1100px]:border-l min-[1100px]:border-t-0 min-[1100px]:pl-4 min-[1100px]:pt-0">
        <dl className="grid gap-2">{results.map(({icon:Icon,label,value}) => <div key={label} className="flex min-h-16 items-center gap-3 rounded-xl bg-pink-50 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#C41469]"><Icon size={18} aria-hidden/></span>
          <div className="min-w-0"><dt className="text-sm text-slate-800">{label}</dt>
            <dd className="break-words text-lg font-semibold leading-tight text-slate-900">{value ?? 'Não informado'}</dd>
          </div>
        </div>)}</dl>
      </section>
    </div>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <section className={registrationCard} data-pregnancy-history>
        <RegistrationCardHeading icon={Baby} title="Histórico obstétrico resumido"/>
        {knownHistory.length ? <dl className="grid grid-cols-2 gap-3 text-sm">{knownHistory.map(([label,value])=><div key={label}>
          <dt className="text-slate-600">{label}</dt><dd className="text-lg font-semibold text-slate-900">{value}</dd>
        </div>)}</dl> : <p className="text-sm text-slate-600">Ainda não informado</p>}
      </section>
      <section className={registrationCard} data-pregnancy-context>
        <RegistrationCardHeading icon={CalendarDays} title="Contexto da gestação"/>
        <fieldset aria-labelledby="first-visit-title">
          <p id="first-visit-title" className="text-sm font-medium">É o primeiro atendimento desta gestação?</p>
          <div className="mt-2 flex gap-2">{([true,false] as const).map(value=><button type="button" key={String(value)} aria-pressed={data.primeiroAtendimento===value}
            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm aria-pressed:border-pink-500 aria-pressed:bg-pink-50 aria-pressed:text-pink-800"
            onClick={()=>onChange({primeiroAtendimento:value})}>{value?'Sim':'Não'}</button>)}</div>
        </fieldset>
      </section>
    </div>
    <p className="mt-4 flex items-center gap-2 rounded-xl bg-pink-50 px-3 py-2.5 text-sm text-slate-700">
      <Info size={18} className="shrink-0 text-[#C41469]" aria-hidden/>
      {pregnancy ? `${datingLabels[pregnancy.source]}${pregnancy.source==='due-date'?' · IG estimada':''} · Referência da unidade em ${formatDemoDate(today)}` : 'Aguardando datação'}
    </p>
    <RegistrationFooter onBack={onBack} onNext={onNext}/>
  </div>
}
