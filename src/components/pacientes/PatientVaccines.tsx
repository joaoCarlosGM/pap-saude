import {
  CheckCircle2,
  Syringe,
} from "lucide-react"

import type { Patient } from "@/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientVaccines({
  patient,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {patient.vaccines.map((vaccine) => (
        <article
          key={vaccine.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <Syringe size={16} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">
                {vaccine.name}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {new Intl.DateTimeFormat(
                  "pt-BR",
                ).format(
                  new Date(vaccine.date),
                )}

                {vaccine.dose
                  ? ` • ${vaccine.dose}`
                  : ""}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
            <CheckCircle2 size={12} />
            Aplicada
          </span>
        </article>
      ))}
    </div>
  )
}