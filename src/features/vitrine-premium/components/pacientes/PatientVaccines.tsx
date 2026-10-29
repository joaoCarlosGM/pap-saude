import {formatDemoDate} from "@/features/vitrine-premium/lib/demo/validation"
import {
  CheckCircle2,
  Syringe,
} from "lucide-react"

import type { Patient } from "@/features/vitrine-premium/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientVaccines({
  patient,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {patient.vaccines.length===0 && <p className="text-sm text-slate-500">Nenhuma vacinação demonstrativa registrada.</p>}
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
                {formatDemoDate(vaccine.date.slice(0,10))}

                {vaccine.dose
                  ? ` • ${vaccine.dose}`
                  : ""}
              </p>
            </div>
          </div>

          <span className={vaccine.status === "APLICADA" ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-500" : "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700"}>
            {vaccine.status === "APLICADA" && <CheckCircle2 size={12} />}
            {vaccine.status === "APLICADA" ? "Aplicada" : "Pendente"}
          </span>
        </article>
      ))}
    </div>
  )
}