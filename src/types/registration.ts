export type RegistrationData = {
  // Identificação
  cpf: string
  nomeCompleto: string
  dataNascimento: string

  // Gestação
  primeiroAtendimento: boolean
  dum: string

  // Sinais vitais
  paSistolica: string
  paDiastolica: string
  frequenciaCardiaca: string
  frequenciaRespiratoria: string
  temperatura: string
  saturacaoO2: string
  nivelConsciencia: string
  debitoUrinario: string
  proteinuria: string

  // Dados obstétricos
  alturaUterina: string
  bcf: string
  movimentacaoFetal: string
  edema: string
  sangramentoVaginal: string
  pesoAtual: string

  // Dados clínicos
  queixasPrincipais: string
  observacoesProfissional: string
}