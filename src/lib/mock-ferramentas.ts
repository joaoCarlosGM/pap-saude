import type { ClinicalTool } from "@/types/ferramenta"

export const clinicalTools: ClinicalTool[] = [
  {
    id: "gestational-calculator",
    title: "Calculadora Gestacional",
    description:
      "Calcule a idade gestacional e a data provável do parto a partir da DUM.",
    status: "AVAILABLE",
    icon: "calculator",
  },

  {
    id: "gestational-bmi",
    title: "Calculadora de IMC Gestacional",
    description:
      "Calcule e acompanhe o IMC gestacional ao longo das consultas.",
    status: "COMING_SOON",
    icon: "heart-pulse",
  },

  {
    id: "dose-converter",
    title: "Conversor de Doses",
    description:
      "Converta doses de medicamentos por peso e via de administração.",
    status: "COMING_SOON",
    icon: "pill",
  },

  {
    id: "weight-gain",
    title: "Curva de Ganho de Peso",
    description:
      "Acompanhe o ganho de peso gestacional em relação às curvas recomendadas.",
    status: "COMING_SOON",
    icon: "trending-up",
  },

  {
    id: "vaccination-dates",
    title: "Datas de Vacinação",
    description:
      "Calendário de vacinação recomendado para gestantes.",
    status: "COMING_SOON",
    icon: "calendar-days",
  },
]