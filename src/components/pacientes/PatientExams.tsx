import {
  CheckCircle2,
  Clock3,
  FlaskConical,
  TriangleAlert,
} from "lucide-react"

import type { Patient } from "@/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientExams({
  patient,
}: Props) {
  return (
    <div className="space-y-3">
      {patient.exams.map((exam) => {
        const altered =
          exam.status === "ALTERADO"

        const pending =
          exam.status === "PENDENTE"

        return (
          <article
            key={exam.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  altered
                    ? "bg-red-50 text-red-500"
                    : pending
                      ? "bg-amber-50 text-amber-500"
                      : "bg-emerald-50 text-emerald-500",
                ].join(" ")}
              >
                {altered ? (
                  <TriangleAlert size={16} />
                ) : pending ? (
                  <Clock3 size={16} />
                ) : (
                  <FlaskConical size={16} />
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">
                  {exam.name}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {new Intl.DateTimeFormat(
                    "pt-BR",
                  ).format(
                    new Date(exam.date),
                  )}
                </p>

                {exam.summary && (
                  <p className="mt-2 text-xs text-slate-500">
                    {exam.summary}
                  </p>
                )}
              </div>
            </div>

            <span
              className={[
                "w-fit rounded-full px-2.5 py-1 text-[11px] font-medium",
                altered
                  ? "bg-red-50 text-red-500"
                  : pending
                    ? "bg-amber-50 text-amber-500"
                    : "bg-emerald-50 text-emerald-500",
              ].join(" ")}
            >
              {exam.status}
            </span>
          </article>
        )
      })}
    </div>
  )
}