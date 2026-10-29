"use client"

import AssessmentDetails from "@/components/demo/AssessmentDetails"
import {assessmentPresentation,DEMO_ASSESSMENT_NOTICE} from "@/lib/demo/assessment-presentation"
import { RotateCcw, Save } from "lucide-react"
import { calculateMeows } from "@/lib/meows"
import type { RegistrationData } from "@/types/registration"

type ResultStepProps = {
  data: RegistrationData
  onRestart: () => void
  onSave: () => void
  onBack: () => void
  onChange: (data: Partial<RegistrationData>)=>void
  saved: boolean
}

export default function ResultStep({
  data,
  onRestart,
  onSave,
  onBack,
  onChange,
  saved,
}: ResultStepProps) {
    const result = calculateMeows(data)
  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          Resultado do Atendimento
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {DEMO_ASSESSMENT_NOTICE}
        </p>
      </div>

      {/* SCORE + CONDUTA */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* SCORE */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white">
              <span className="text-6xl font-bold leading-none text-red-600">
                  {result.score ?? "—"}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                SCORE MEOWS
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-700">
               {assessmentPresentation(result.classification).label}
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {result.critical?"Presença de parâmetro crítico demonstrativo.":"Sem conduta automática."}
              </p>
            </div>
          </div>
        </div>

        {/* CONDUTA */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Conduta
          </h3>

          <p className="mt-3 text-sm text-slate-600">
            Nenhuma conduta, recomendação terapêutica ou encaminhamento é gerado automaticamente.
          </p>
        </div>
      </div>

<AssessmentDetails result={result}/>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{Object.entries(data).map(([key,value])=><div key={key} className="min-w-0 rounded-lg bg-slate-50 p-3"><dt className="font-medium text-slate-700">{key.replace(/([A-Z])/g,' $1')}</dt><dd className="break-words text-slate-500">{value===null || value==='' || value===undefined ? 'Não informado' : typeof value==='boolean' ? (value?'Sim':'Não') : Array.isArray(value)?(value.length?value.map(v=>typeof v==='string'?v:Object.values(v).filter(Boolean).join(' · ')).join('; '):'Sem registro') : String(value)}</dd></div>)}</dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{(['referral','outcome'] as const).map((key,i)=><label key={key} className="text-sm text-slate-700">{['Encaminhamento demonstrativo','Desfecho demonstrativo'][i]}<textarea className="mt-1 w-full rounded-lg border p-3" disabled={saved} value={data[key]||''} onChange={e=>onChange({[key]:e.target.value})}/></label>)}</div>
      <button type="button" onClick={onBack} disabled={saved} className="mt-4 rounded-lg border px-4 py-2 text-sm">Voltar para revisar</button>
      {/* FOOTER */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <RotateCcw size={16} />
          Novo Registro
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saved}
          className="flex items-center gap-2 rounded-lg bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          <Save size={16} />
          {saved ? "Registro demonstrativo salvo" : "Salvar Registro"}
        </button>
      </div>
    </div>
  )
}