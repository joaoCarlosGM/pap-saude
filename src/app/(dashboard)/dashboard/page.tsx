import {
  CalendarDays,
} from "lucide-react"

import AttendanceChart from "@/components/dashboard/AttendanceChart"
import DashboardKpi from "@/components/dashboard/DashboardKpi"
import QuickActions from "@/components/dashboard/QuickActions"
import RecentAttendances from "@/components/dashboard/RecentAttendances"
import RiskDistribution from "@/components/dashboard/RiskDistribution"
import UpcomingDeliveries from "@/components/dashboard/UpcomingDeliveries"

import {
  dashboardKpis,
  monthlyAttendances,
  recentAttendances,
  riskDistribution,
  upcomingDeliveries,
} from "@/lib/mock-dashboard"

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Visão geral dos atendimentos e acompanhamento das pacientes
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
          <CalendarDays
            size={15}
            className="text-pink-500"
          />

          Atualizado hoje
        </div>
      </header>

      <section
        className="
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        {dashboardKpis.map((kpi) => (
          <DashboardKpi
            key={kpi.id}
            kpi={kpi}
          />
        ))}
      </section>

      <div className="mt-6">
        <QuickActions />
      </div>

      <section
        className="
          mt-6
          grid
          grid-cols-1
          gap-4
          xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]
        "
      >
        <AttendanceChart
          data={monthlyAttendances}
        />

        <RiskDistribution
          data={riskDistribution}
        />
      </section>

      <section
        className="
          mt-4
          grid
          grid-cols-1
          gap-4
          xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]
        "
      >
        <RecentAttendances
          data={recentAttendances}
        />

        <UpcomingDeliveries
          data={upcomingDeliveries}
        />
      </section>
    </div>
  )
}