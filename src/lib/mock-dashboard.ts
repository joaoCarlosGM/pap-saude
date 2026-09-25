import type {
  DashboardAttendance,
  DashboardKpi,
  MonthlyAttendance,
  RiskDistributionItem,
  UpcomingDelivery,
} from "@/types/dashboard"

export const dashboardKpis: DashboardKpi[] = [
  {
    id: "patients",
    title: "Pacientes ativas",
    value: "128",
    description: "Gestantes em acompanhamento",
    icon: "users",
    tone: "pink",
    trend: {
      value: 8.4,
      direction: "up",
      label: "vs. mês anterior",
    },
  },

  {
    id: "appointments",
    title: "Atendimentos",
    value: "342",
    description: "Realizados neste mês",
    icon: "clipboard",
    tone: "blue",
    trend: {
      value: 12.1,
      direction: "up",
      label: "vs. mês anterior",
    },
  },

  {
    id: "today",
    title: "Atendimentos hoje",
    value: "18",
    description: "Consultas registradas",
    icon: "calendar",
    tone: "cyan",
  },

  {
    id: "urgent",
    title: "Casos urgentes",
    value: "7",
    description: "Necessitam acompanhamento",
    icon: "triangle",
    tone: "red",
    trend: {
      value: 2,
      direction: "down",
      label: "desde ontem",
    },
  },

  {
    id: "attention",
    title: "Pacientes em atenção",
    value: "21",
    description: "Com alerta ativo",
    icon: "heart",
    tone: "amber",
  },

  {
    id: "coverage",
    title: "Cobertura pré-natal",
    value: "96%",
    description: "Acompanhamentos em dia",
    icon: "activity",
    tone: "emerald",
    trend: {
      value: 1.8,
      direction: "up",
      label: "vs. mês anterior",
    },
  },

  {
    id: "average",
    title: "Tempo médio",
    value: "24 min",
    description: "Por atendimento",
    icon: "clock",
    tone: "violet",
    trend: {
      value: 4.2,
      direction: "down",
      label: "tempo médio",
    },
  },

  {
    id: "return",
    title: "Taxa de retorno",
    value: "91%",
    description: "Pacientes com retorno",
    icon: "user-check",
    tone: "emerald",
  },
]

export const monthlyAttendances: MonthlyAttendance[] = [
  { month: "Abr", total: 214 },
  { month: "Mai", total: 238 },
  { month: "Jun", total: 271 },
  { month: "Jul", total: 263 },
  { month: "Ago", total: 301 },
  { month: "Set", total: 342 },
]

export const riskDistribution: RiskDistributionItem[] = [
  {
    label: "Baixo risco",
    value: 100,
    type: "low",
  },
  {
    label: "Atenção",
    value: 21,
    type: "attention",
  },
  {
    label: "Urgência",
    value: 7,
    type: "urgent",
  },
]

export const recentAttendances: DashboardAttendance[] = [
  {
    id: "1",
    patient: "Fernanda Costa Oliveira",
    initials: "FC",
    gestationalAge: "39s 1d",
    professional: "Ana Paula",
    time: "09:00",
    score: 6,
    classification: "URGENCIA",
  },
  {
    id: "2",
    patient: "Mariana Silva Santos",
    initials: "MS",
    gestationalAge: "28s 4d",
    professional: "Carlos",
    time: "10:30",
    score: 3,
    classification: "ATENCAO",
  },
  {
    id: "3",
    patient: "Juliana Almeida Costa",
    initials: "JA",
    gestationalAge: "18s 2d",
    professional: "Ana Paula",
    time: "11:15",
    score: 0,
    classification: "BAIXO_RISCO",
  },
  {
    id: "4",
    patient: "Camila Rodrigues Lima",
    initials: "CR",
    gestationalAge: "32s 0d",
    professional: "Carlos",
    time: "14:20",
    score: 4,
    classification: "ATENCAO",
  },
]

export const upcomingDeliveries: UpcomingDelivery[] = [
  {
    id: "1",
    patient: "Fernanda Costa Oliveira",
    gestationalAge: "39s 1d",
    dpp: "14/09/2026",
    remainingDays: 1,
  },
  {
    id: "2",
    patient: "Maria das Graças Silva",
    gestationalAge: "38s 2d",
    dpp: "21/09/2026",
    remainingDays: 8,
  },
  {
    id: "3",
    patient: "Ana Beatriz Souza",
    gestationalAge: "37s 4d",
    dpp: "27/09/2026",
    remainingDays: 14,
  },
]