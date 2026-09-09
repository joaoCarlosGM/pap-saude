"use client"

import { useState } from "react"
import { Eye, Sparkles } from "lucide-react"

import type { Atendimento } from "@/types/atendimento"
import AtendimentoDetailsModal from "./AtendimentoDetailsModal"

type AtendimentoTableProps = {
  atendimentos: Atendimento[]
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
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

export default function AtendimentoTable({
  atendimentos,
}: AtendimentoTableProps) {
  const [selectedAtendimento, setSelectedAtendimento] =
    useState<Atendimento | null>(null)

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Registros
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {atendimentos.length} registros encontrados
            </p>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Data/Hora
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Paciente
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Profissional
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Score
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Classificação
                </th>

                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {atendimentos.map((atendimento) => (
                <tr
                  key={atendimento.id}
                  className="transition hover:bg-slate-50"
                >
                  {/* Data / Hora */}
                  <td className="px-6 py-4 align-top">
                    <p className="text-sm font-medium text-slate-900">
                      {formatDateTime(atendimento.dataHora)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Consulta #{atendimento.consultaNumero}
                    </p>
                  </td>

                  {/* Paciente */}
                  <td className="px-6 py-4 align-top">
                    <p className="text-sm font-medium text-slate-900">
                      {atendimento.paciente.nome}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {atendimento.paciente.idadeGestacional}
                    </p>
                  </td>

                  {/* Profissional */}
                  <td className="px-6 py-4 align-top">
                    <p className="text-sm font-medium text-slate-900">
                      {atendimento.profissional.nome}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {atendimento.profissional.cargo}
                    </p>
                  </td>

                  {/* Score */}
                  <td className="px-6 py-4 align-top">
                    <span className="text-sm font-semibold text-slate-900">
                      {atendimento.score}
                    </span>
                  </td>

                  {/* Classificação */}
                  <td className="px-6 py-4 align-top">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        getClassificationClasses(
                          atendimento.classificacao,
                        ),
                      ].join(" ")}
                    >
                      {getClassificationLabel(
                        atendimento.classificacao,
                      )}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      {/* Ver detalhes */}
                      <button
                        type="button"
                        title="Ver detalhes"
                        onClick={() =>
                          setSelectedAtendimento(atendimento)
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
                      >
                        <Eye size={17} />
                      </button>

                      {/* Resumo IA */}
                      <button
                        type="button"
                        title="Resumo IA"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
                      >
                        <Sparkles size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalhes */}
      <AtendimentoDetailsModal
        atendimento={selectedAtendimento}
        open={!!selectedAtendimento}
        onClose={() => setSelectedAtendimento(null)}
      />
    </div>
  )
}