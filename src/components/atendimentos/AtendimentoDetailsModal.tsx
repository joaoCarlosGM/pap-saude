"use client"

import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/button"

import type { Atendimento } from "@/types/atendimento"

type AtendimentoDetailsModalProps = {
  atendimento: Atendimento | null
  open: boolean
  onClose: () => void
}

function getClassificationLabel(
  classificacao: Atendimento["classificacao"],
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
  classificacao: Atendimento["classificacao"],
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

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

export default function AtendimentoDetailsModal({
  atendimento,
  open,
  onClose,
}: AtendimentoDetailsModalProps) {
  if (!atendimento) {
    return null
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalhes do Atendimento"
      description={`${atendimento.paciente.nome} • Consulta #${atendimento.consultaNumero}`}
      maxWidth="lg"
      footer={
        <Button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Fechar
        </Button>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Identificação
          </h3>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Paciente
              </p>

              <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                {atendimento.paciente.nome}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Data/Hora
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateTime(atendimento.dataHora)}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Profissional
              </p>

              <p className="mt-1 break-words text-sm font-semibold text-slate-900">
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

          <div className="mt-3 flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs text-slate-400">
                Score
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-700">
                {atendimento.score}
              </p>
            </div>

            <span
              className={[
                "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                getClassificationClasses(
                  atendimento.classificacao,
                ),
              ].join(" ")}
            >
              {getClassificationLabel(
                atendimento.classificacao,
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
    </Modal>
  )
}