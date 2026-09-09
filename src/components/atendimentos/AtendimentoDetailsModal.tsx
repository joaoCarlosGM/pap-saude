"use client"

import { X } from "lucide-react"

import type { Atendimento } from "@/types/atendimento"

type AtendimentoDetailsModalProps = {
  atendimento: Atendimento | null
  open: boolean
  onClose: () => void
}

function getClassificationLabel(
  classificacao: Atendimento["classificacao"]
) {
  switch (classificacao) {
    case "URGENCIA":
      return "Urgência"

    case "ATENCAO":
      return "Atenção"

    case "BAIXO_RISCO":
      return "Baixo Risco"
  }
}

function getClassificationClasses(
  classificacao: Atendimento["classificacao"]
) {
  switch (classificacao) {
    case "URGENCIA":
      return "bg-red-50 text-red-600"

    case "ATENCAO":
      return "bg-amber-50 text-amber-600"

    case "BAIXO_RISCO":
      return "bg-emerald-50 text-emerald-600"
  }
}

export default function AtendimentoDetailsModal({
  atendimento,
  open,
  onClose,
}: AtendimentoDetailsModalProps) {
  if (!open || !atendimento) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Detalhes do Atendimento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {atendimento.paciente.nome} • Consulta #
              {atendimento.consultaNumero}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Identificação
            </h3>

            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Paciente
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {atendimento.paciente.nome}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Data/Hora
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(atendimento.dataHora))}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Profissional
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {atendimento.profissional.nome}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {atendimento.profissional.cargo}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Nº Consulta
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  #{atendimento.consultaNumero}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Avaliação
            </h3>

            <div className="mt-3 flex items-center gap-4 rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-xs text-slate-400">
                  Score MEOWS
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-700">
                  {atendimento.score}
                </p>
              </div>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  getClassificationClasses(
                    atendimento.classificacao
                  ),
                ].join(" ")}
              >
                {getClassificationLabel(
                  atendimento.classificacao
                )}
              </span>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Gestação
            </h3>

            <div className="mt-3 rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Idade Gestacional
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {atendimento.paciente.idadeGestacional}
              </p>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}