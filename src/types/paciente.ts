export type PatientRisk =
  | "BAIXO_RISCO"
  | "ATENCAO"
  | "URGENCIA"

export type ClinicalScore = {
  value: number
  classification: PatientRisk
  date: string
}

export type ChartPoint = {
  label: string
  value: number
}

export type TimelineEventType =
  | "consulta"
  | "vacina"
  | "exame"
  | "documento"
  | "medicacao"

export type TimelineEvent = {
  id: string
  type: TimelineEventType
  title: string
  subtitle?: string
  professional?: string
  date: string
}

export type PatientExam = {
  id: string
  name: string
  date: string
  status: "NORMAL" | "ALTERADO" | "PENDENTE"
  summary?: string
}

export type PatientVaccine = {
  id: string
  name: string
  date: string
  dose?: string
  status: "APLICADA" | "PENDENTE"
}

export type PatientMedication = {
  id: string
  name: string
  dose: string
  frequency: string
  route: string
}

export type PatientDocument = {
  id: string
  title: string
  description: string
  type: "PDF" | "EXAME" | "RECEITA" | "ENCAMINHAMENTO"
}

export type Patient = {
  id: string
  initials: string
  nome: string
  cpf: string
  sus: string
  dataNascimento: string
  idade: number
  telefone: string
  endereco: string

  pregnancy: {
    gestationalAge: string
    trimester: string
    dum: string
    dpp: string
  }

  allergies: string[]
  comorbidities: string[]

  consultations: number
  alerts: number

  latestScore: ClinicalScore

  meowsTrend: ChartPoint[]
  systolicTrend: ChartPoint[]

  obstetricHistory: {
    pregnancies: number
    deliveries: number
    abortions: number
    cesareans: number
  }

  timeline: TimelineEvent[]

  exams: PatientExam[]
  vaccines: PatientVaccine[]
  medications: PatientMedication[]
  documents: PatientDocument[]

  previousNotes: {
    id: string
    date: string
    professional: string
    text: string
  }[]
}