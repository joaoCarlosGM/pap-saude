export type ClassificacaoAtendimento =
  | "BAIXO_RISCO"
  | "ATENCAO"
  | "URGENCIA"

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

  score: number
  classificacao: ClassificacaoAtendimento
}