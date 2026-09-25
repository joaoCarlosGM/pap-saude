import {
  CalendarClock,
} from "lucide-react"

import type {
  UpcomingDelivery,
} from "@/types/dashboard"

type Props = {
  data: UpcomingDelivery[]
}

export default function UpcomingDeliveries({
  data,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
          Próximas DPPs
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Datas prováveis mais próximas
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {data.map((delivery) => (
          <div
            key={delivery.id}
            className="flex items-center gap-3 p-4 sm:p-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
              <CalendarClock size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {delivery.patient}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {delivery.gestationalAge}
                {" · DPP "}
                {delivery.dpp}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">
                {delivery.remainingDays}
              </p>

              <p className="text-[10px] text-slate-400">
                dias
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}