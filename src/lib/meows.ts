import type { RegistrationData } from "@/types/registration"

export type MeowsParameter = {
  parameter: string
  value: string
  points: number
}

export type MeowsResult = {
  score: number
  parameters: MeowsParameter[]
  classification: string
}

export function calculateMeows(
  data: RegistrationData
): MeowsResult {
  const parameters: MeowsParameter[] = []

  /*
   * IMPORTANTE:
   * As faixas abaixo ainda NÃO estão implementadas.
   *
   * Elas deverão ser preenchidas conforme a tabela/protocolo
   * MEOWS que será adotado oficialmente pelo sistema.
   */

  const score = 0

  return {
    score,
    parameters,
    classification: "AVALIAÇÃO",
  }
}