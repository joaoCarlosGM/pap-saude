"use client"

import { AlertTriangle, Search } from "lucide-react"

import Input from "@/components/ui/Input"
import { Button } from "@/components/ui/button"

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
      <header className="mb-6 sm:mb-8">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
          Identifique a paciente
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Busque pelo CPF para localizar os dados via DataSUS ou
          realize um cadastro manual.
        </p>
      </header>

      <div className="space-y-5 sm:space-y-6">
        <div>
          <label
            htmlFor="cpf"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            CPF
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="cpf"
              type="text"
              value={data.cpf}
              onChange={(event) =>
                onChange({
                  cpf: event.target.value,
                })
              }
              placeholder="000.000.000-00"
              className="h-11"
            />

            <Button
              type="button"
              className="h-11 w-full sm:w-auto"
            >
              <Search size={17} />

              Buscar dados
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                CPF não encontrado no DataSUS
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Realize o cadastro manual para prosseguir com o
                atendimento.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="patient-name"
                  label="Nome completo *"
                  type="text"
                  value={data.nomeCompleto}
                  onChange={(event) =>
                    onChange({
                      nomeCompleto: event.target.value,
                    })
                  }
                  placeholder="Digite o nome completo"
                  className="h-11"
                />

                <Input
                  id="birth-date"
                  label="Data de nascimento *"
                  type="date"
                  value={data.dataNascimento}
                  onChange={(event) =>
                    onChange({
                      dataNascimento: event.target.value,
                    })
                  }
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 flex border-t border-slate-200 pt-5 sm:mt-10 sm:justify-end sm:pt-6">
        <Button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto"
        >
          Próximo →
        </Button>
      </footer>
    </div>
  )
}