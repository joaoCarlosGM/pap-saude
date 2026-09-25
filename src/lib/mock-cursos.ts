import type { Course } from "@/types/curso"

export const mockCursos: Course[] = [
  {
    id: "emergencias-obstetricas",
    title: "Emergências Obstétricas",
    description:
      "Reconhecimento e abordagem inicial das principais emergências obstétricas.",
    category: "URGENCIA",
    durationMinutes: 45,
    lessons: 6,
    progress: 75,
    status: "IN_PROGRESS",
  },

  {
    id: "pre-natal-alto-risco",
    title: "Pré-natal de Alto Risco",
    description:
      "Acompanhamento, identificação de fatores de risco e encaminhamento adequado.",
    category: "PRE_NATAL",
    durationMinutes: 60,
    lessons: 8,
    progress: 30,
    status: "IN_PROGRESS",
  },

  {
    id: "seguranca-paciente",
    title: "Segurança da Paciente",
    description:
      "Práticas essenciais para aumentar a segurança durante o atendimento obstétrico.",
    category: "SEGURANCA",
    durationMinutes: 35,
    lessons: 5,
    progress: 100,
    status: "COMPLETED",
  },

  {
    id: "protocolos-assistenciais",
    title: "Protocolos Assistenciais",
    description:
      "Introdução aos principais protocolos utilizados no acompanhamento da gestante.",
    category: "PROTOCOLOS",
    durationMinutes: 50,
    lessons: 7,
    progress: 0,
    status: "NOT_STARTED",
  },

  {
    id: "hipertensao-gestacional",
    title: "Hipertensão na Gestação",
    description:
      "Identificação de sinais de alerta e princípios do acompanhamento da hipertensão gestacional.",
    category: "URGENCIA",
    durationMinutes: 40,
    lessons: 5,
    progress: 0,
    status: "NOT_STARTED",
  },

  {
    id: "acompanhamento-pre-natal",
    title: "Acompanhamento Pré-natal",
    description:
      "Organização das consultas e acompanhamento longitudinal durante a gestação.",
    category: "PRE_NATAL",
    durationMinutes: 55,
    lessons: 7,
    progress: 0,
    status: "NOT_STARTED",
  },
]