"use client"

import type { RegistrationData } from "@/types/registration"

type VitalSignsStepProps = {
  data: RegistrationData
  onChange: (data: Partial<RegistrationData>) => void
  onNext: () => void
  onBack: () => void
}

export default function VitalSignsStep({
  data,
  onChange,
  onNext,
  onBack,
}: VitalSignsStepProps) {
  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          Sinais Vitais
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Informe os sinais vitais para avaliação e cálculo do score MEOWS.
        </p>
      </div>

      <div className="space-y-6">
        {/* Sinais vitais */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* PA Sistólica */}
          <div>
            <label
              htmlFor="pa-sistolica"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              PA Sistólica <span className="text-pink-500">*</span>
            </label>

            <div className="relative">
              <input
                id="pa-sistolica"
                type="number"
                value={data.paSistolica}
                onChange={(event) =>
                  onChange({
                    paSistolica: event.target.value,
                  })
                }
                placeholder="120"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                mmHg
              </span>
            </div>
          </div>

          {/* PA Diastólica */}
          <div>
            <label
              htmlFor="pa-diastolica"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              PA Diastólica <span className="text-pink-500">*</span>
            </label>

            <div className="relative">
              <input
                id="pa-diastolica"
                type="number"
                value={data.paDiastolica}
                onChange={(event) =>
                  onChange({
                    paDiastolica: event.target.value,
                  })
                }
                placeholder="80"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                mmHg
              </span>
            </div>
          </div>

          {/* Frequência Cardíaca */}
          <div>
            <label
              htmlFor="frequencia-cardiaca"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Frequência Cardíaca <span className="text-pink-500">*</span>
            </label>

            <div className="relative">
              <input
                id="frequencia-cardiaca"
                type="number"
                value={data.frequenciaCardiaca}
                onChange={(event) =>
                  onChange({
                    frequenciaCardiaca: event.target.value,
                  })
                }
                placeholder="80"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                bpm
              </span>
            </div>
          </div>

          {/* Frequência Respiratória */}
          <div>
            <label
              htmlFor="frequencia-respiratoria"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Frequência Respiratória{" "}
              <span className="text-pink-500">*</span>
            </label>

            <div className="relative">
              <input
                id="frequencia-respiratoria"
                type="number"
                value={data.frequenciaRespiratoria}
                onChange={(event) =>
                  onChange({
                    frequenciaRespiratoria: event.target.value,
                  })
                }
                placeholder="18"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                irpm
              </span>
            </div>
          </div>

          {/* Temperatura */}
          <div>
            <label
              htmlFor="temperatura"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Temperatura
            </label>

            <div className="relative">
              <input
                id="temperatura"
                type="number"
                step="0.1"
                value={data.temperatura}
                onChange={(event) =>
                  onChange({
                    temperatura: event.target.value,
                  })
                }
                placeholder="36.5"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                °C
              </span>
            </div>
          </div>

          {/* Saturação O2 */}
          <div>
            <label
              htmlFor="saturacao-o2"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Saturação O₂
            </label>

            <div className="relative">
              <input
                id="saturacao-o2"
                type="number"
                value={data.saturacaoO2}
                onChange={(event) =>
                  onChange({
                    saturacaoO2: event.target.value,
                  })
                }
                placeholder="98"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                %
              </span>
            </div>
          </div>

          {/* Nível de Consciência */}
          <div>
            <label
              htmlFor="nivel-consciencia"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nível de Consciência
            </label>

            <select
              id="nivel-consciencia"
              value={data.nivelConsciencia}
              onChange={(event) =>
                onChange({
                  nivelConsciencia: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="alerta">Alerta</option>
              <option value="confusa">Confusa</option>
              <option value="sonolenta">Sonolenta</option>
              <option value="inconsciente">Inconsciente</option>
            </select>
          </div>

          {/* Débito Urinário */}
          <div>
            <label
              htmlFor="debito-urinario"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Débito Urinário
            </label>

            <select
              id="debito-urinario"
              value={data.debitoUrinario}
              onChange={(event) =>
                onChange({
                  debitoUrinario: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="normal">Normal</option>
              <option value="reduzido">Reduzido</option>
              <option value="ausente">Ausente</option>
            </select>
          </div>

          {/* Proteinúria */}
          <div>
            <label
              htmlFor="proteinuria"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Proteinúria
            </label>

            <select
              id="proteinuria"
              value={data.proteinuria}
              onChange={(event) =>
                onChange({
                  proteinuria: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="negativa">Negativa</option>
              <option value="tracos">Traços</option>
              <option value="1+">1+</option>
              <option value="2+">2+</option>
              <option value="3+">3+</option>
            </select>
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