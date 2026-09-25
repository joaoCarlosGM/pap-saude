import type {
  RiskDistributionItem,
} from "@/types/dashboard"

type Props = {
  data: RiskDistributionItem[]
}

const config = {
  low: {
    bar: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-600",
  },
  attention: {
    bar: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-600",
  },
  urgent: {
    bar: "bg-red-500",
    badge:
      "bg-red-50 text-red-600",
  },
}

export default function RiskDistribution({
  data,
}: Props) {
  const total = data.reduce(
    (sum, item) => sum + item.value,
    0,
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
        Distribuição por classificação
      </h2>

      <p className="mt-1 text-xs text-slate-400">
        Situação atual das pacientes acompanhadas
      </p>

      <div className="mt-6 space-y-5">
        {data.map((item) => {
          const percentage =
            total > 0
              ? Math.round(
                  (item.value / total) * 100,
                )
              : 0

          const colors =
            config[item.type]

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      colors.badge,
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-800">
                    {item.value}
                  </span>

                  <span className="ml-1 text-xs text-slate-400">
                    ({percentage}%)
                  </span>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={[
                    "h-full rounded-full transition-[width] duration-700",
                    colors.bar,
                  ].join(" ")}
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-7 rounded-lg bg-slate-50 p-4">
        <p className="text-xs text-slate-400">
          Total acompanhado
        </p>

        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {total}
        </p>
      </div>
    </section>
  )
}