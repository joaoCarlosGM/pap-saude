import type { RegistrationData } from "./registration"
import type { MeowsClassification, MeowsResult } from "./meows"
export type ClassificacaoAtendimento = MeowsClassification
  | "BAIXO_RISCO"
  | "ATENCAO"
  | "URGENCIA"
  | "NAO_AVALIADO"

export type Atendimento = {
  id: string
  consultaNumero: number
  dataHora: string

  paciente: {
    id: string
    nome: string
    idadeGestacional: string
  }

  profissional: {
    id: string
    nome: string
    cargo: string
  }

  assessmentSource?: "ILLUSTRATIVE_FIXTURE" | "PAP_MEOWS_DEMO"
  assessment?: MeowsResult
  registration?: RegistrationData
  score: number | null
  classificacao: ClassificacaoAtendimento
}