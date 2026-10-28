import type { RegistrationData } from "./registration"
export type ClassificacaoAtendimento =
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

  registration?: RegistrationData
  score: number | null
  classificacao: ClassificacaoAtendimento
}