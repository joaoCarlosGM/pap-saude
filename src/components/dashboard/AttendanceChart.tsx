import {
  TrendingUp,
} from "lucide-react"

import type {
  MonthlyAttendance,
} from "@/types/dashboard"

type Props = {
  data: MonthlyAttendance[]
}

export default function AttendanceChart({
  data,
}: Props) {
  const max =
    Math.max(...data.map((item) => item.total)) || 1

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            Evolução dos atendimentos
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Atendimentos realizados nos últimos 6 meses
          </p>
        </div>

        <div className="flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
          <TrendingUp size={13} />
          +12,1%
        </div>
      </div>

      <div className="mt-7 flex h-64 items-end gap-3 sm:gap-5">
        {data.map((item) => {
          const height =
            Math.max(
              12,
              Math.round((item.total / max) * 100),
            )

          return (
            <div
              key={item.month}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <div className="flex flex-1 items-end justify-center">
                <div
                  className="group relative w-full max-w-12 rounded-t-lg bg-pink-500 transition hover:bg-pink-600"
                  style={{
                    height: `${height}%`,
                  }}
                >
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-slate-500">
                    {item.total}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-slate-400">
                {item.month}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}