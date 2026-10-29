export type RegistrationData = {
  dumUnknown?: boolean
  allergyStatus?: "sim" | "nao" | "desconhecido"
  allergies?: { agent: string; reaction: string; notes: string }[]
  medications?: { name: string; dose: string; frequency: string; route: string }[]
  comorbidityStatus?: "sim" | "nao" | "desconhecido"
  conditions?: string[]
  pregnancies?: string
  deliveries?: string
  cesareans?: string
  pregnancyLosses?: string
  referral?: string
  outcome?: string
  // Identificação
  cpf: string
  nomeCompleto: string
  dataNascimento: string

  // Gestação
  primeiroAtendimento: boolean | null
  dum: string

  oxygenMode?: "air" | "supplemental" | "unknown"
  oxygenFlow?: string
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