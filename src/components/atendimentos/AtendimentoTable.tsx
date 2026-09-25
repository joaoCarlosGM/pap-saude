"use client"

import { useState } from "react"
import { Eye, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

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
      <div className="mb-4 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Registros
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {atendimentos.length} registros encontrados
          </p>
        </div>
      </div>

      {/* MOBILE */}
      <div className="space-y-3 md:hidden">
        {atendimentos.map((atendimento) => (
          <article
            key={atendimento.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {atendimento.paciente.nome}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {atendimento.paciente.idadeGestacional}
                </p>
              </div>

              <span
                className={[
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
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

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Data/Hora
                </p>

                <p className="mt-1 text-xs font-medium text-slate-700">
                  {formatDateTime(atendimento.dataHora)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Score
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {atendimento.score}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Profissional
                </p>

                <p className="mt-1 text-xs font-medium text-slate-700">
                  {atendimento.profissional.nome}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Consulta
                </p>

                <p className="mt-1 text-xs font-medium text-slate-700">
                  #{atendimento.consultaNumero}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() =>
                  setSelectedAtendimento(atendimento)
                }
              >
                <Eye size={16} />
                Detalhes
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Resumo IA"
              >
                <Sparkles size={17} />
              </Button>
            </div>
          </article>
        ))}
      </div>

      {/* TABLET / DESKTOP */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:px-6">
                  Data/Hora
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:px-6">
                  Paciente
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:px-6">
                  Profissional
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:px-6">
                  Score
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:px-6">
                  Classificação
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 lg:px-6">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {atendimentos.map((atendimento) => (
                <tr
                  key={atendimento.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-4 py-4 align-top lg:px-6">
                    <p className="text-sm font-medium text-slate-900">
                      {formatDateTime(atendimento.dataHora)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Consulta #{atendimento.consultaNumero}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top lg:px-6">
                    <p className="text-sm font-medium text-slate-900">
                      {atendimento.paciente.nome}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {atendimento.paciente.idadeGestacional}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top lg:px-6">
                    <p className="text-sm font-medium text-slate-900">
                      {atendimento.profissional.nome}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {atendimento.profissional.cargo}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top lg:px-6">
                    <span className="text-sm font-semibold text-slate-900">
                      {atendimento.score}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top lg:px-6">
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

                  <td className="px-4 py-4 align-top lg:px-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Ver detalhes"
                        onClick={() =>
                          setSelectedAtendimento(
                            atendimento,
                          )
                        }
                      >
                        <Eye size={17} />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Resumo IA"
                      >
                        <Sparkles size={17} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AtendimentoDetailsModal
        atendimento={selectedAtendimento}
        open={!!selectedAtendimento}
        onClose={() =>
          setSelectedAtendimento(null)
        }
      />
    </div>
  )
}