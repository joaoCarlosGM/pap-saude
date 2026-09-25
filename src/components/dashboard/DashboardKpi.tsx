import type { ElementType } from "react"

import {
  Activity,
  CalendarDays,
  ClipboardList,
  Clock3,
  HeartPulse,
  TriangleAlert,
  UserCheck,
  Users,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react"

import type {
  DashboardKpi as DashboardKpiType,
} from "@/types/dashboard"

type Props = {
  kpi: DashboardKpiType
}

const icons: Record<
  DashboardKpiType["icon"],
  ElementType
> = {
  users: Users,
  clipboard: ClipboardList,
  calendar: CalendarDays,
  triangle: TriangleAlert,
  heart: HeartPulse,
  activity: Activity,
  clock: Clock3,
  "user-check": UserCheck,
}

const tones = {
  pink: {
    background: "bg-pink-50",
    icon: "text-pink-500",
  },
  blue: {
    background: "bg-blue-50",
    icon: "text-blue-500",
  },
  emerald: {
    background: "bg-emerald-50",
    icon: "text-emerald-500",
  },
  amber: {
    background: "bg-amber-50",
    icon: "text-amber-500",
  },
  red: {
    background: "bg-red-50",
    icon: "text-red-500",
  },
  violet: {
    background: "bg-violet-50",
    icon: "text-violet-500",
  },
  cyan: {
    background: "bg-cyan-50",
    icon: "text-cyan-500",
  },
}

export default function DashboardKpi({
  kpi,
}: Props) {
  const Icon = icons[kpi.icon]
  const tone = tones[kpi.tone]

  const TrendIcon =
    kpi.trend?.direction === "down"
      ? ArrowDownRight
      : ArrowUpRight

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {kpi.title}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {kpi.value}
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone.background,
            tone.icon,
          ].join(" ")}
        >
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {kpi.description}
      </p>

      {kpi.trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <span
            className={[
              "inline-flex items-center gap-1 text-xs font-semibold",
              kpi.trend.direction === "up"
                ? "text-emerald-600"
                : kpi.trend.direction === "down"
                  ? "text-emerald-600"
                  : "text-slate-500",
            ].join(" ")}
          >
            {kpi.trend.direction !== "neutral" && (
              <TrendIcon size={14} />
            )}

            {kpi.trend.value}%
          </span>

          <span className="text-xs text-slate-400">
            {kpi.trend.label}
          </span>
        </div>
      )}
    </article>
  )
}