import type { Atendimento } from "@/types/atendimento"

export const mockAtendimentos: Atendimento[] = [
  {
    id: "att-001",
    consultaNumero: 7,
    dataHora: "2026-06-10T09:00:00-03:00",

    paciente: {
      id: "pac-001",
      nome: "Fernanda Costa Oliveira",
      idadeGestacional: "26s 1d",
    },

    profissional: {
      id: "prof-001",
      nome: "Enf. Ana Paula Ferreira",
      cargo: "Enfermeiro",
    },

    score: 6,
    classificacao: "URGENCIA",
  },

  {
    id: "att-002",
    consultaNumero: 12,
    dataHora: "2026-06-10T10:30:00-03:00",

    paciente: {
      id: "pac-002",
      nome: "Mariana Silva Santos",
      idadeGestacional: "18s 4d",
    },

    profissional: {
      id: "prof-002",
      nome: "Dr. Carlos Mendes",
      cargo: "Médico",
    },

    score: 3,
    classificacao: "ATENCAO",
  },

  {
    id: "att-003",
    consultaNumero: 3,
    dataHora: "2026-06-10T11:15:00-03:00",

    paciente: {
      id: "pac-003",
      nome: "Juliana Almeida Costa",
      idadeGestacional: "10s 2d",
    },

    profissional: {
      id: "prof-001",
      nome: "Enf. Ana Paula Ferreira",
      cargo: "Enfermeiro",
    },

    score: 0,
    classificacao: "BAIXO_RISCO",
  },

  {
    id: "att-004",
    consultaNumero: 9,
    dataHora: "2026-06-09T14:20:00-03:00",

    paciente: {
      id: "pac-004",
      nome: "Camila Rodrigues Lima",
      idadeGestacional: "32s 0d",
    },

    profissional: {
      id: "prof-002",
      nome: "Dr. Carlos Mendes",
      cargo: "Médico",
    },

    score: 4,
    classificacao: "ATENCAO",
  },

  {
    id: "att-005",
    consultaNumero: 5,
    dataHora: "2026-06-09T16:45:00-03:00",

    paciente: {
      id: "pac-005",
      nome: "Patrícia Souza Martins",
      idadeGestacional: "22s 3d",
    },

    profissional: {
      id: "prof-001",
      nome: "Enf. Ana Paula Ferreira",
      cargo: "Enfermeiro",
    },

    score: 0,
    classificacao: "BAIXO_RISCO",
  },
]