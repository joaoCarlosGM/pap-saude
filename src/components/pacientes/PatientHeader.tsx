import {
  AlertTriangle,
  Bell,
} from "lucide-react"

import type {
  Patient,
  PatientRisk,
} from "@/types/paciente"

type Props = {
  patient: Patient
}

function riskClasses(risk: PatientRisk) {
  if (risk === "URGENCIA") {
    return "bg-red-50 text-red-600"
  }

  if (risk === "ATENCAO") {
    return "bg-amber-50 text-amber-600"
  }

  return "bg-emerald-50 text-emerald-600"
}

export default function PatientHeader({
  patient,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-500 text-sm font-semibold text-white sm:h-14 sm:w-14">
            {patient.initials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
                {patient.nome}
              </h1>

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

            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{patient.idade} anos</span>
              <span>•</span>
              <span>
                IG:{" "}
                {patient.pregnancy.gestationalAge}
              </span>
              <span>•</span>
              <span>
                DPP:{" "}
                {new Intl.DateTimeFormat(
                  "pt-BR",
                ).format(
                  new Date(
                    patient.pregnancy.dpp,
                  ),
                )}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-medium text-pink-600">
                {patient.pregnancy.trimester}
              </span>

              {patient.allergies.map(
                (allergy) => (
                  <span
                    key={allergy}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500"
                  >
                    <AlertTriangle size={11} />
                    Alergia: {allergy}
                  </span>
                ),
              )}

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                CPF {patient.cpf}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="min-w-24 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <p className="text-xl font-semibold text-slate-900">
              {patient.consultations}
            </p>

            <p className="text-[11px] text-slate-400">
              consultas
            </p>
          </div>

          <div className="min-w-24 rounded-lg border border-pink-100 bg-pink-50 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Bell
                size={13}
                className="text-pink-500"
              />

              <p className="text-xl font-semibold text-pink-600">
                {patient.alerts}
              </p>
            </div>

            <p className="text-[11px] text-pink-400">
              alertas
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}