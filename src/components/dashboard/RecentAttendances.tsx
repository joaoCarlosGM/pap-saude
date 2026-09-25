import Link from "next/link"

import {
  ArrowRight,
} from "lucide-react"

import type {
  DashboardAttendance,
} from "@/types/dashboard"

type Props = {
  data: DashboardAttendance[]
}

function classificationStyle(
  classification:
    DashboardAttendance["classification"],
) {
  switch (classification) {
    case "URGENCIA":
      return {
        label: "Urgência",
        className:
          "bg-red-50 text-red-600",
      }

    case "ATENCAO":
      return {
        label: "Atenção",
        className:
          "bg-amber-50 text-amber-600",
      }

    default:
      return {
        label: "Baixo risco",
        className:
          "bg-emerald-50 text-emerald-600",
      }
  }
}

export default function RecentAttendances({
  data,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            Atendimentos recentes
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Últimos registros realizados
          </p>
        </div>

        <Link
          href="/atendimentos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700"
        >
          Ver todos
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {data.map((attendance) => {
          const classification =
            classificationStyle(
              attendance.classification,
            )

          return (
            <div
              key={attendance.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-xs font-semibold text-pink-600">
                  {attendance.initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {attendance.patient}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {attendance.gestationalAge}
                    {" · "}
                    {attendance.professional}
                    {" · "}
                    {attendance.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    classification.className,
                  ].join(" ")}
                >
                  {attendance.score} ·{" "}
                  {classification.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}