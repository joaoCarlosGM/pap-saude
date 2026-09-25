export type ClinicalToolStatus =
  | "AVAILABLE"
  | "COMING_SOON"

export type ClinicalToolIcon =
  | "calculator"
  | "heart-pulse"
  | "pill"
  | "trending-up"
  | "calendar-days"

export type ClinicalTool = {
  id: string
  title: string
  description: string
  status: ClinicalToolStatus
  icon: ClinicalToolIcon
}