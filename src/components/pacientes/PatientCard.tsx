import Link from "next/link"
import {
  AlertTriangle,
  ChevronRight,
} from "lucide-react"

import type {
  Patient,
  PatientRisk,
} from "@/types/paciente"

type Props = {
  patient: Patient
}

function riskLabel(risk: PatientRisk) {
  if (risk === "URGENCIA") return "URGÊNCIA"
  if (risk === "ATENCAO") return "ATENÇÃO"

  return "BAIXO RISCO"
}

function riskClasses(risk: PatientRisk) {
  if (risk === "URGENCIA") {
    return "bg-red-50 text-red-600 border-red-100"
  }

  if (risk === "ATENCAO") {
    return "bg-amber-50 text-amber-600 border-amber-100"
  }

  return "bg-emerald-50 text-emerald-600 border-emerald-100"
}

export default function PatientCard({
  patient,
}: Props) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-pink-200 hover:shadow-md sm:px-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500 text-xs font-semibold text-white sm:h-12 sm:w-12">
            {patient.initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                {patient.nome}
              </h2>

              <span className="text-xs text-slate-400">
                {patient.latestScore.classification ===
                "URGENCIA"
                  ? "Urgência"
                  : patient.latestScore.classification ===
                      "ATENCAO"
                    ? "Atenção"
                    : "Baixo Risco"}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{patient.idade} anos</span>

              <span>•</span>

              <span>
                IG: {patient.pregnancy.gestationalAge}
              </span>

              <span>•</span>

              <span>
                DPP:{" "}
                {new Intl.DateTimeFormat("pt-BR").format(
                  new Date(patient.pregnancy.dpp),
                )}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-pink-50 px-2 py-1 text-[11px] font-medium text-pink-600">
                {patient.pregnancy.trimester}
              </span>

              {patient.allergies.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500">
                  <AlertTriangle size={11} />
                  Alergia: {patient.allergies.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[90px_160px_auto] xl:items-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">
              {patient.consultations}
            </p>

            <p className="text-[11px] text-slate-400">
              consultas
            </p>
          </div>

          <div className="text-center">
            <span
              className={[
                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                riskClasses(
                  patient.latestScore.classification,
                ),
              ].join(" ")}
            >
              {patient.latestScore.value} -{" "}
              {riskLabel(
                patient.latestScore.classification,
              )}
            </span>

            <p className="mt-1 text-[11px] text-slate-400">
              último score
            </p>
          </div>

          <Link
            href={`/pacientes/${patient.id}`}
            className="col-span-2 inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-pink-50 px-3 text-xs font-medium text-pink-600 transition hover:bg-pink-100 sm:col-span-1"
          >
            Ver prontuário
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  )
}