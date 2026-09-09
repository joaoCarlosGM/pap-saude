"use client"

import { RotateCcw, Save } from "lucide-react"
import { calculateMeows } from "@/lib/meows"
import type { RegistrationData } from "@/types/registration"

type ResultStepProps = {
  data: RegistrationData
  onRestart: () => void
  onSave: () => void
}

export default function ResultStep({
  data,
  onRestart,
  onSave,
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
          Score MEOWS calculado com base nos parâmetros informados.
        </p>
      </div>

      {/* SCORE + CONDUTA */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* SCORE */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white">
              <span className="text-6xl font-bold leading-none text-red-600">
                  {result.score}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                SCORE MEOWS
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-700">
               {result.classification}
              </p>

              <p className="mt-1 text-sm text-slate-700">
                Aguardando regra de pontuação
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
            O resultado clínico será determinado após a aplicação da regra
            MEOWS configurada no sistema.
          </p>
        </div>
      </div>

{/* PARÂMETROS */}
<div className="mt-6">
  <h3 className="text-base font-semibold text-slate-900">
    PARÂMETROS AVALIADOS
  </h3>

  <div className="mt-4 space-y-2">
    {result.parameters.length === 0 ? (
      <div className="rounded-lg bg-slate-100 px-4 py-4">
        <p className="text-sm text-slate-500">
          Nenhum parâmetro pontuado.
        </p>
      </div>
    ) : (
      result.parameters.map((item) => (
        <div
          key={item.parameter}
          className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3"
        >
          <span className="text-sm text-slate-600">
            {item.parameter}: {item.value}
          </span>

          <span className="text-sm font-bold text-red-500">
            +{item.points} pontos
          </span>
        </div>
      ))
    )}
  </div>
</div>

      {/* FOOTER */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
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
          className="flex items-center gap-2 rounded-lg bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          <Save size={16} />
          Salvar Registro
        </button>
      </div>
    </div>
  )
}