"use client"

import type { RegistrationData } from "@/types/registration"

type ObstetricStepProps = {
  data: RegistrationData
  onChange: (data: Partial<RegistrationData>) => void
  onNext: () => void
  onBack: () => void
}

export default function ObstetricStep({
  data,
  onChange,
  onNext,
  onBack,
}: ObstetricStepProps) {
  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          Dados Obstétricos e Clínicos
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Informe os dados obstétricos e clínicos relevantes para o
          atendimento.
        </p>
      </div>

      <div className="space-y-6">
        {/* Dados obstétricos */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Altura uterina */}
          <div>
            <label
              htmlFor="altura-uterina"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Altura Uterina
            </label>

            <div className="relative">
              <input
                id="altura-uterina"
                type="number"
                step="0.1"
                value={data.alturaUterina}
                onChange={(event) =>
                  onChange({
                    alturaUterina: event.target.value,
                  })
                }
                placeholder="32"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                cm
              </span>
            </div>
          </div>

          {/* BCF */}
          <div>
            <label
              htmlFor="bcf"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              BCF
            </label>

            <div className="relative">
              <input
                id="bcf"
                type="number"
                value={data.bcf}
                onChange={(event) =>
                  onChange({
                    bcf: event.target.value,
                  })
                }
                placeholder="140"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                bpm
              </span>
            </div>
          </div>

          {/* Movimentação fetal */}
          <div>
            <label
              htmlFor="movimentacao-fetal"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Movimentação Fetal
            </label>

            <select
              id="movimentacao-fetal"
              value={data.movimentacaoFetal}
              onChange={(event) =>
                onChange({
                  movimentacaoFetal: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="presente">Presente</option>
              <option value="reduzida">Reduzida</option>
              <option value="ausente">Ausente</option>
            </select>
          </div>

          {/* Edema */}
          <div>
            <label
              htmlFor="edema"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Edema
            </label>

            <select
              id="edema"
              value={data.edema}
              onChange={(event) =>
                onChange({
                  edema: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="ausente">Ausente</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="grave">Grave</option>
            </select>
          </div>

          {/* Sangramento vaginal */}
          <div>
            <label
              htmlFor="sangramento-vaginal"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Sangramento Vaginal
            </label>

            <select
              id="sangramento-vaginal"
              value={data.sangramentoVaginal}
              onChange={(event) =>
                onChange({
                  sangramentoVaginal: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="ausente">Ausente</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </select>
          </div>

          {/* Peso atual */}
          <div>
            <label
              htmlFor="peso-atual"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Peso Atual
            </label>

            <div className="relative">
              <input
                id="peso-atual"
                type="number"
                step="0.1"
                value={data.pesoAtual}
                onChange={(event) =>
                  onChange({
                    pesoAtual: event.target.value,
                  })
                }
                placeholder="65.5"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div className="border-t border-slate-200 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Dados Clínicos
          </p>
        </div>

        {/* Queixas principais */}
        <div>
          <label
            htmlFor="queixas-principais"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Queixas Principais
          </label>

          <textarea
            id="queixas-principais"
            value={data.queixasPrincipais}
            onChange={(event) =>
              onChange({
                queixasPrincipais: event.target.value,
              })
            }
            placeholder="Descreva as principais queixas da paciente..."
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          />
        </div>

        {/* Observações */}
        <div>
          <label
            htmlFor="observacoes-profissional"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Observações do Profissional
          </label>

          <textarea
            id="observacoes-profissional"
            value={data.observacoesProfissional}
            onChange={(event) =>
              onChange({
                observacoesProfissional: event.target.value,
              })
            }
            placeholder="Adicione observações relevantes sobre o atendimento..."
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          />
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
          Ver Resultado →
        </button>
      </div>
    </div>
  )
}