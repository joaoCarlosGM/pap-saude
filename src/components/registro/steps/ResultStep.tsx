"use client"

import { RotateCcw, Save } from "lucide-react"

type ResultStepProps = {
  onRestart: () => void
  onSave: () => void
}

export default function ResultStep({
  onRestart,
  onSave,
}: ResultStepProps) {
  return (
    <div>
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
                12
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                SCORE MEOWS
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                URGÊNCIA
              </p>

              <p className="mt-1 text-sm text-slate-700">
                Urgência
              </p>
            </div>
          </div>
        </div>

        {/* CONDUTA */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🚨
            </span>

            <h3 className="text-base font-semibold text-slate-900">
              Acionamento imediato necessário
            </h3>
          </div>

          <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-red-500">
            <li className="text-sm text-slate-600">
              Acionar equipe médica responsável.
            </li>

            <li className="text-sm text-slate-600">
              Realizar avaliação clínica imediata.
            </li>

            <li className="text-sm text-slate-600">
              Manter monitorização dos sinais vitais.
            </li>

            <li className="text-sm text-slate-600">
              Considerar encaminhamento para serviço de referência.
            </li>
          </ul>
        </div>
      </div>

      {/* PARÂMETROS */}
      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-900">
          PARÂMETROS QUE PONTUARAM
        </h3>

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
            <span className="text-sm text-slate-600">
              PA Sistólica: 160 mmHg
            </span>

            <span className="text-sm font-bold text-red-500">
              +3 pontos
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
            <span className="text-sm text-slate-600">
              Frequência Cardíaca: 125 bpm
            </span>

            <span className="text-sm font-bold text-red-500">
              +3 pontos
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
            <span className="text-sm text-slate-600">
              Frequência Respiratória: 28 irpm
            </span>

            <span className="text-sm font-bold text-red-500">
              +3 pontos
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
            <span className="text-sm text-slate-600">
              Saturação O₂: 92%
            </span>

            <span className="text-sm font-bold text-red-500">
              +3 pontos
            </span>
          </div>
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