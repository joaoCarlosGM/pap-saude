'use client'

import {Activity,ClipboardList,Droplet,Gauge,HeartPulse,Lightbulb,Shield, Thermometer,TrendingUp,Wind} from 'lucide-react'
import {ProteinuriaFields} from '../RecordFields'
import {RegistrationCardHeading,RegistrationFooter,RegistrationHeading,registrationCard,registrationField} from '../RegistrationLayout'
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
  const flow=data.oxygenFlow?.trim()
  const pendingOxygen=data.oxygenMode==='supplemental'&&flow&&Number(flow.replace(',','.'))===0
  const result=calculateDemoMeows(pendingOxygen ? {...data,oxygenFlow:''} : data)
  const complete=result.status==='CALCULADO'
  const flagged=complete ? result.parameters.filter(item=>item.points!==null&&item.points>0) : []
  const trend=history?.filter(visit=>visit.assessmentSource==='PAP_MEOWS_DEMO'&&visit.score!==null).toSorted((a,b)=>a.dataHora.localeCompare(b.dataHora)).slice(-5) ?? []
  return <div>
    <RegistrationHeading icon={Activity} title="Sinais vitais da consulta">Campos em branco indicam medidas não aferidas.</RegistrationHeading>
    <div className="grid items-start gap-4 min-[1100px]:grid-cols-[64fr_36fr]">
      <div className="grid min-w-0 gap-4">
        <section className={registrationCard} aria-label="Medidas da consulta">
          <div className="grid grid-cols-1 gap-3 min-[370px]:grid-cols-2 md:grid-cols-3">
            {measures.map(([field,id,label,unit,Icon])=><div key={field} className="grid min-w-0 content-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-pink-50 text-[#C41469]"><Icon size={19} aria-hidden/></span>
                <label htmlFor={id} className="min-w-0 break-words text-sm font-medium leading-tight text-slate-800">{label}</label>
              </div>
              <div className="relative">
                <input id={id} type={field==='temperatura'?'text':'number'} inputMode={field==='temperatura'?'decimal':'numeric'}
                  aria-describedby={id+'-unit'} value={data[field]} onChange={event=>onChange({[field]:event.target.value})} className={`${registrationField} pr-12`}/>
                <span id={id+'-unit'} className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-600">{unit}</span>
              </div>
            </div>)}
          </div>
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2 rounded-xl border border-slate-200 p-3">
              <label htmlFor="oxygen-mode" className="text-sm font-medium">Situação de oxigenação</label>
              <select id="oxygen-mode" className={registrationField} value={data.oxygenMode||'unknown'} onChange={event=>onChange({oxygenMode:event.target.value as RegistrationData['oxygenMode'],oxygenFlow:''})}>
                <option value="unknown">Desconhecido / não aferido</option><option value="air">Ar ambiente</option><option value="supplemental">Oxigênio suplementar</option>
              </select>
              {data.oxygenMode==='supplemental'&&<>
                <label className="mt-1 text-sm" htmlFor="oxygen-flow">Fluxo de O₂ (L/min)</label>
                <input id="oxygen-flow" inputMode="decimal" value={data.oxygenFlow||''} onChange={event=>onChange({oxygenFlow:event.target.value})} className={registrationField}/>
              </>}
            </div>
            <div className="grid min-w-0 gap-2 rounded-xl border border-slate-200 p-3">
              <label htmlFor="debito-urinario" className="text-sm font-medium">Débito Urinário</label>
              <select id="debito-urinario" className={registrationField} value={data.debitoUrinario} onChange={event=>onChange({debitoUrinario:event.target.value})}>
                <option value="">Selecione</option><option value="normal">Normal</option><option value="reduzido">Reduzido</option><option value="ausente">Ausente</option>
              </select>
            </div>
          </div>
        </section>
        <section className={registrationCard} aria-label="Achados rápidos">
          <RegistrationCardHeading icon={ClipboardList} title="Achados rápidos">Registre os achados disponíveis na consulta.</RegistrationCardHeading>
          <div className="grid min-w-0 items-start gap-4 sm:grid-cols-[56fr_44fr]">
            <ProteinuriaFields data={data} onChange={onChange} segmented/>
            <div className="grid min-w-0 gap-2 border-t border-slate-200 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <label htmlFor="nivel-consciencia" className="text-sm font-medium">Nível de Consciência</label>
              <select id="nivel-consciencia" className={registrationField} value={data.nivelConsciencia} onChange={event=>onChange({nivelConsciencia:event.target.value})}>
                <option value="">Selecione</option><option value="alerta">Alerta</option><option value="confusa">Confusa</option><option value="sonolenta">Sonolenta</option><option value="inconsciente">Inconsciente</option>
              </select>
            </div>
          </div>
        </section>
      </div>
      <div className="grid min-w-0 gap-4">
        <section className={registrationCard} aria-label="MEOWS da consulta" data-live-meows={result.status}>
          <RegistrationCardHeading icon={TrendingUp} title="MEOWS em tempo real">Calculado a partir das medidas desta consulta.</RegistrationCardHeading>
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-xl bg-pink-50 p-4" aria-live="polite">
            <p className="min-w-12 text-center text-[3.5rem] font-semibold leading-none text-[#C41469]">{result.score ?? '—'}</p>
            <div className="border-l border-pink-200 pl-4">
              <p className="text-sm font-semibold text-slate-900">{result.status==='INCOMPLETO'?'Aguardando parâmetros':assessmentPresentation(result.classification).label.replace(/ \(demo\)$/,'')}</p>
              {result.missing.length>0&&<p className="mt-2 text-xs text-slate-600">{result.parameters.filter(item=>result.missing.includes(item.key)).map(item=>item.parameter).join(', ')}</p>}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <h4 className="text-sm font-semibold">Evolução do escore na consulta</h4>
            <svg aria-hidden="true" viewBox="0 0 280 52" preserveAspectRatio="none" className="my-2 h-12 w-full text-slate-200">
              <path d="M2 4v46h276M2 12h276M2 25h276M2 38h276" fill="none" stroke="currentColor"/>
            </svg>
            <p className="text-center text-xs text-slate-600">A evolução aparecerá após novas avaliações.</p>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-pink-50 p-3">
            <Lightbulb size={19} className="shrink-0 text-[#C41469]" aria-hidden/>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Interpretação dos parâmetros</p>
              <details><summary className="min-h-11 cursor-pointer content-center text-sm font-medium text-pink-800">Ver detalhes</summary>
                <AssessmentDetails result={result}/>
                {trend.length>0&&<div className="mt-3 border-t border-pink-200 pt-3">
                  <h4 className="text-sm font-semibold">Avaliações anteriores registradas</h4>
                  <ol className="mt-2 grid gap-1 text-xs text-slate-600">{trend.map(visit=><li key={visit.id}>{formatRecordTime(visit.dataHora)} · {visit.score}</li>)}</ol>
                </div>}
              </details>
            </div>
          </div>
        </section>
        <section className={registrationCard} aria-label="Sinais de alerta">
          <RegistrationCardHeading icon={Shield} title="Sinais de alerta"/>
          <div className={`rounded-xl p-3 text-sm ${complete&&result.score===0?'bg-emerald-50 text-emerald-800':flagged.length?'bg-amber-50 text-amber-900':'bg-slate-50 text-slate-700'}`}>
            {flagged.length>0 ? <ul className="grid gap-1">{flagged.map(parameter=><li key={parameter.key}>{parameter.parameter} · {parameter.value}</li>)}</ul> :
              <p>{complete?'Sem parâmetros sinalizados':result.status==='INVALIDO'?'Avaliação inválida':'Avaliação incompleta'}</p>}
          </div>
        </section>
      </div>
    </div>
    <RegistrationFooter onBack={onBack} onNext={onNext}/>
  </div>
}
