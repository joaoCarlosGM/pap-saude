export type CourseStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"

export type CourseCategory =
  | "URGENCIA"
  | "PRE_NATAL"
  | "SEGURANCA"
  | "PROTOCOLOS"

export type Course = {
  id: string
  title: string
  description: string
  category: CourseCategory
  durationMinutes: number
  lessons: number
  progress: number
  status: CourseStatus
}