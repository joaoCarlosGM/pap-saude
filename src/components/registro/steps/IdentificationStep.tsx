"use client"

import { AlertTriangle, Search } from "lucide-react"

import type { RegistrationData } from "@/types/registration"

type IdentificationStepProps = {
  data: RegistrationData
  onChange: (data: Partial<RegistrationData>) => void
  onNext: () => void
}

export default function IdentificationStep({
  data,
  onChange,
  onNext,
}: IdentificationStepProps) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          Identifique a paciente
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Busque pelo CPF para localizar os dados via DataSUS ou realize um
          cadastro manual.
        </p>
      </div>

      <div className="space-y-6">
        {/* CPF */}
        <div>
          <label
            htmlFor="cpf"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            CPF
          </label>

          <div className="flex gap-3">
            <input
              id="cpf"
              type="text"
              value={data.cpf}
              onChange={(event) =>
                onChange({ cpf: event.target.value })
              }
              placeholder="000.000.000-00"
              className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            />

            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-lg bg-pink-500 px-5 text-sm font-medium text-white transition hover:bg-pink-600"
            >
              <Search size={17} />
              Buscar dados
            </button>
          </div>
        </div>

        {/* Cadastro manual */}
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-5">
          <div className="flex gap-3">
            <div className="mt-0.5 shrink-0">
              <AlertTriangle
                size={20}
                className="text-yellow-600"
              />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                CPF não encontrado no DataSUS
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Realize o cadastro manual para prosseguir com o atendimento.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {/* Nome */}
                <div>
                  <label
                    htmlFor="patient-name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Nome completo{" "}
                    <span className="text-pink-500">*</span>
                  </label>

                  <input
                    id="patient-name"
                    type="text"
                    value={data.nomeCompleto}
                    onChange={(event) =>
                      onChange({
                        nomeCompleto: event.target.value,
                      })
                    }
                    placeholder="Digite o nome completo"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                {/* Data de nascimento */}
                <div>
                  <label
                    htmlFor="birth-date"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Data de nascimento{" "}
                    <span className="text-pink-500">*</span>
                  </label>

                  <input
                    id="birth-date"
                    type="date"
                    value={data.dataNascimento}
                    onChange={(event) =>
                      onChange({
                        dataNascimento: event.target.value,
                      })
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex justify-end border-t border-slate-200 pt-6">
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