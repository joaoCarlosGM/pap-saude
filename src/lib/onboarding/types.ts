export type GuidedTourStep = {
  id: string
  title: string
  description: string
  target: string
  requiredAny?: string[]
}

export type OnboardingProgress = {
  tourKey: string
  tourVersion: number
  status:
    | "STARTED"
    | "COMPLETED"
    | "SKIPPED"
  currentStep: number
  startedAt: string
  completedAt: string | null
  skippedAt: string | null
}
