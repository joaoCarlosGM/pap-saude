"use client"

import {ClosureFields} from "../RecordFields"
import {registrationDetails} from "../../../lib/registration-record"
import AssessmentDetails from "@/features/vitrine-premium/components/demo/AssessmentDetails"
import {assessmentPresentation,DEMO_ASSESSMENT_NOTICE} from "@/features/vitrine-premium/lib/demo/assessment-presentation"
import { RotateCcw, Save } from "lucide-react"
import { calculateMeows } from "@/features/vitrine-premium/lib/meows"
import type { RegistrationData } from "@/features/vitrine-premium/types/registration"

type ResultStepProps = {
  data: RegistrationData
  onRestart: () => void
  onSave: () => void
  saving?: boolean
  onBack: () => void
  onChange: (data: Partial<RegistrationData>)=>void
  saved: boolean
}

export default function ResultStep({
  data,
  onRestart,
  onSave,
  saving,
  onBack,
  onChange,
  saved,
}: ResultStepProps) {
  const result = calculateMeows(data)
  const details = registrationDetails(data)
  const referralData: [string, string | undefined][] = [
    ['Paciente', data.nomeCompleto], ['Data de nascimento', data.dataNascimento], ['DUM', data.dum], ['Pressão sistólica', data.paSistolica], ['Pressão diastólica', data.paDiastolica],
    ['Frequência cardíaca', data.frequenciaCardiaca], ['Frequência respiratória', data.frequenciaRespiratoria],
    ['Temperatura', data.temperatura], ['Saturação de O₂', data.saturacaoO2], ['Nível de consciência', data.nivelConsciencia],
    ['Débito urinário', data.debitoUrinario], ['Proteinúria qualitativa', details.proteinuria],
    ['Modalidade do teste qualitativo', details.method], ['Proteinúria laboratorial', details.lab],
    ['Altura uterina', data.alturaUterina], ['BCF', data.bcf], ['Movimentação fetal', data.movimentacaoFetal],
    ['Edema', details.edema], ['Localização do edema', details.location], ['Sangramento vaginal', data.sangramentoVaginal],
    ['Peso atual', data.pesoAtual], ['Gestações anteriores', data.pregnancies], ['Partos', data.deliveries],
    ['Cesáreas', data.cesareans], ['Perdas gestacionais', data.pregnancyLosses], ['Queixa principal', data.queixasPrincipais],
    ['Alergias', data.allergies?.map(allergy => [allergy.agent, allergy.reaction, allergy.notes].filter(Boolean).join(' · ')).join(', ')],
    ['Comorbidades', data.conditions?.join(', ')],
    ['Medicações', data.medications?.map(medication => [medication.name, medication.dose, medication.frequency, medication.route].filter(Boolean).join(' · ')).join(', ')],
  ]
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

        <ClosureFields data={data} onChange={onChange} saved={saved}/>
      </div>

      <AssessmentDetails result={result}/>
      <section className="mt-5">
        <h3 className="mb-2 font-semibold">Dados registrados</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {referralData.filter(([,value]) => value?.trim()).map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-slate-50 p-3">
            <dt className="font-medium">{label}</dt><dd className="break-words text-slate-600">{value}</dd>
          </div>)}
        </dl>
      </section>
      <button type="button" onClick={onBack} disabled={saved || saving} className="mt-4 min-h-11 rounded-lg border px-4 py-2 text-sm">Voltar para revisar</button>
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
          aria-busy={saving}
          disabled={saved || saving}
          className="flex items-center gap-2 rounded-lg bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          <Save size={16} />
          {saved ? "Registro demonstrativo salvo" : "Salvar Registro"}
        </button>
      </div>
    </div>
  )
}