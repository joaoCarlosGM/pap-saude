'use client'

import {Activity,Droplet,Gauge,HeartPulse,Thermometer,Wind} from 'lucide-react'
import {ProteinuriaFields} from '../RecordFields'
import {RegistrationFooter,RegistrationHeading,registrationCard,registrationField} from '../RegistrationLayout'
import {calculateDemoMeows} from '../../../lib/demo/meows'
import {assessmentPresentation} from '../../../lib/demo/assessment-presentation'
import AssessmentDetails from '../../demo/AssessmentDetails'
import {formatRecordTime} from '../../../lib/registration-record'
import type {Atendimento} from '../../../types/atendimento'
import type {RegistrationData} from '../../../types/registration'

type Props = {data:RegistrationData;onChange:(value:Partial<RegistrationData>)=>void;onNext:()=>void;onBack:()=>void;history?:readonly Atendimento[]}
const measures = [
  ['paSistolica','pa-sistolica','PA Sistólica','mmHg',Gauge],
  ['paDiastolica','pa-diastolica','PA Diastólica','mmHg',Gauge],
  ['frequenciaCardiaca','frequencia-cardiaca','Frequência Cardíaca','bpm',HeartPulse],
  ['frequenciaRespiratoria','frequencia-respiratoria','Frequência Respiratória','irpm',Wind],
  ['temperatura','temperatura','Temperatura','°C',Thermometer],
  ['saturacaoO2','saturacao-o2','Saturação O₂','%',Droplet],
] as const

export default function VitalSignsStep({data,onChange,onNext,onBack,history}:Props) {
  const result = calculateDemoMeows(data)
  const trend = history?.filter(visit=>visit.assessmentSource==='PAP_MEOWS_DEMO'&&visit.score!==null).toSorted((a,b)=>a.dataHora.localeCompare(b.dataHora)).slice(-5) ?? []
  return <div>
    <RegistrationHeading icon={Activity} title="Sinais vitais da consulta">Campos em branco indicam medidas não aferidas.</RegistrationHeading>
    <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="grid min-w-0 gap-4">
        <div className="grid grid-cols-1 gap-3 min-[370px]:grid-cols-2 md:grid-cols-3">
          {measures.map(([field,id,label,unit,Icon])=><div key={field} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3">
            <span className="mb-2 grid size-10 place-items-center rounded-lg bg-pink-50 text-[#C41469]"><Icon size={19} aria-hidden/></span>
            <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-800">{label}</label>
            <div className="relative">
              <input id={id} type={field==='temperatura'?'text':'number'} inputMode={field==='temperatura'?'decimal':'numeric'}
                aria-describedby={id+'-unit'} value={data[field]} onChange={event=>onChange({[field]:event.target.value})} className={`${registrationField} pr-14`}/>
              <span id={id+'-unit'} className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-600">{unit}</span>
            </div>
          </div>)}
        </div>
        <section className={registrationCard} aria-labelledby="complementary-vitals">
          <h3 id="complementary-vitals" className="mb-4 font-semibold">Avaliação complementar</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="oxygen-mode" className="mb-2 block text-sm font-medium">Situação de oxigenação</label>
              <select id="oxygen-mode" className={registrationField} value={data.oxygenMode||'unknown'} onChange={event=>onChange({oxygenMode:event.target.value as RegistrationData['oxygenMode'],oxygenFlow:''})}>
                <option value="unknown">Desconhecido / não aferido</option><option value="air">Ar ambiente</option><option value="supplemental">Oxigênio suplementar</option>
              </select>
              {data.oxygenMode==='supplemental'&&<label className="mt-3 grid gap-2 text-sm" htmlFor="oxygen-flow">Fluxo de O₂ (L/min)
                <input id="oxygen-flow" inputMode="decimal" value={data.oxygenFlow||''} onChange={event=>onChange({oxygenFlow:event.target.value})} className={registrationField}/>
              </label>}
            </div>
            <label className="grid content-start gap-2 text-sm" htmlFor="nivel-consciencia">Nível de Consciência
              <select id="nivel-consciencia" className={registrationField} value={data.nivelConsciencia} onChange={event=>onChange({nivelConsciencia:event.target.value})}>
                <option value="">Selecione</option><option value="alerta">Alerta</option><option value="confusa">Confusa</option><option value="sonolenta">Sonolenta</option><option value="inconsciente">Inconsciente</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm" htmlFor="debito-urinario">Débito Urinário
              <select id="debito-urinario" className={registrationField} value={data.debitoUrinario} onChange={event=>onChange({debitoUrinario:event.target.value})}>
                <option value="">Selecione</option><option value="normal">Normal</option><option value="reduzido">Reduzido</option><option value="ausente">Ausente</option>
              </select>
            </label>
            <ProteinuriaFields data={data} onChange={onChange}/>
          </div>
        </section>
      </div>
      <section className={registrationCard} aria-label="MEOWS da consulta" data-live-meows={result.status}>
        <h3 className="font-semibold text-slate-900">MEOWS</h3>
        <div className="mt-3 rounded-xl bg-pink-50 p-4" aria-live="polite">
          <p className="text-3xl font-semibold text-pink-800">{result.score ?? '—'}</p>
          <p className="text-sm font-medium text-slate-800">{result.status==='INCOMPLETO'?'Aguardando parâmetros':assessmentPresentation(result.classification).label}</p>
          {result.missing.length>0&&<p className="mt-2 text-xs text-slate-600">{result.parameters.filter(item=>result.missing.includes(item.key)).map(item=>item.parameter).join(', ')}</p>}
        </div>
        {trend.length>0 && <div className="my-3 border-t border-slate-200 pt-3"><h4 className="text-sm font-medium">Avaliações registradas</h4>
          {trend.length>1 && <svg viewBox="0 0 190 68" role="img" aria-label="Tendência das avaliações registradas" className="mt-2 w-full">
            <path d="M8 7V60H182" fill="none" stroke="currentColor" className="text-slate-400"/>
            <polyline points={trend.map((visit,index)=>`${10+index*170/(trend.length-1)},${58-visit.score!*48/Math.max(1,...trend.map(item=>item.score!))}`).join(' ')} stroke="#C41469" strokeWidth="3" fill="none"/>
          </svg>}
          <ol className="mt-2 grid gap-1 text-xs text-slate-600">{trend.map(visit=><li key={visit.id}>{formatRecordTime(visit.dataHora)} · {visit.score}</li>)}</ol>
        </div>}
        <details className="mt-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Entender resultado</summary><AssessmentDetails result={result}/></details>
      </section>
    </div>
    <RegistrationFooter onBack={onBack} onNext={onNext}/>
  </div>
}
