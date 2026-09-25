export type DashboardKpiTrend = {
  value: number
  direction: "up" | "down" | "neutral"
  label: string
}

export type DashboardKpi = {
  id: string
  title: string
  value: string
  description: string
  icon:
    | "users"
    | "clipboard"
    | "calendar"
    | "triangle"
    | "heart"
    | "activity"
    | "clock"
    | "user-check"
  trend?: DashboardKpiTrend
  tone:
    | "pink"
    | "blue"
    | "emerald"
    | "amber"
    | "red"
    | "violet"
    | "cyan"
}

export type MonthlyAttendance = {
  month: string
  total: number
}

export type RiskDistributionItem = {
  label: string
  value: number
  type: "low" | "attention" | "urgent"
}

export type DashboardAttendance = {
  id: string
  patient: string
  initials: string
  gestationalAge: string
  professional: string
  time: string
  score: number
  classification:
    | "BAIXO_RISCO"
    | "ATENCAO"
    | "URGENCIA"
}

export type UpcomingDelivery = {
  id: string
  patient: string
  gestationalAge: string
  dpp: string
  remainingDays: number
}