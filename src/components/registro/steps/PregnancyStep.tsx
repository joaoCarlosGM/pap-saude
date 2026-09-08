"use client"

import type { RegistrationData } from "@/types/registration"

type PregnancyStepProps = {
  data: RegistrationData
  onChange: (data: Partial<RegistrationData>) => void
  onNext: () => void
  onBack: () => void
}

function calculatePregnancyData(dum: string) {
  if (!dum) {
    return {
      weeks: 0,
      days: 0,
      dueDate: "",
      trimester: "1º Trimestre",
    }
  }

  const dumDate = new Date(`${dum}T00:00:00`)
  const today = new Date()

  const differenceMs = today.getTime() - dumDate.getTime()
  const differenceDays = Math.max(
    0,
    Math.floor(differenceMs / (1000 * 60 * 60 * 24))
  )

  const weeks = Math.floor(differenceDays / 7)
  const days = differenceDays % 7

  const dueDate = new Date(dumDate)
  dueDate.setDate(dueDate.getDate() + 280)

  let trimester = "1º Trimestre"

  if (weeks >= 14 && weeks < 28) {
    trimester = "2º Trimestre"
  } else if (weeks >= 28) {
    trimester = "3º Trimestre"
  }

  return {
    weeks,
    days,
    dueDate: dueDate.toLocaleDateString("pt-BR"),
    trimester,
  }
}

export default function PregnancyStep({
  data,
  onChange,
  onNext,
  onBack,
}: PregnancyStepProps) {
  const pregnancy = calculatePregnancyData(data.dum)

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          Dados da Gestação
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Informe os dados da gestação para cálculo da idade gestacional e
          provável data do parto.
        </p>
      </div>

      <div className="space-y-6">
        {/* Primeiro atendimento */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            É o primeiro atendimento desta gestação?
          </label>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() =>
                onChange({ primeiroAtendimento: true })
              }
              className={[
                "rounded-md px-5 py-2 text-sm font-medium transition",
                data.primeiroAtendimento
                  ? "bg-pink-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white",
              ].join(" ")}
            >
              Sim
            </button>

            <button
              type="button"
              onClick={() =>
                onChange({ primeiroAtendimento: false })
              }
              className={[
                "rounded-md px-5 py-2 text-sm font-medium transition",
                !data.primeiroAtendimento
                  ? "bg-pink-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white",
              ].join(" ")}
            >
              Não
            </button>
          </div>
        </div>

        {/* DUM */}
        <div>
          <label
            htmlFor="dum"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Data da Última Menstruação (DUM)
          </label>

          <input
            id="dum"
            type="date"
            value={data.dum}
            onChange={(event) =>
              onChange({ dum: event.target.value })
            }
            className="h-11 w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          />
        </div>

        {/* Resultados calculados */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Idade gestacional */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Idade Gestacional
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {pregnancy.weeks} semanas e {pregnancy.days} dias
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {pregnancy.trimester}
              </span>
            </div>
          </div>

          {/* DPP */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">
              Data Provável do Parto
            </p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {pregnancy.dueDate || "--/--/----"}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Regra de Naegele (DUM + 280 dias)
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Voltar
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          Próximo →
        </button>
      </div>
    </div>
  )
}