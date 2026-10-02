import {
  ProductFeedbackCategory,
  ProductFeedbackSource,
  ProductFeedbackStatus,
} from "@prisma/client"

export type SubmitProductFeedbackInput = {
  organizationId: string

  actorUserId?: string | null

  category: ProductFeedbackCategory
  source: ProductFeedbackSource

  satisfactionScore?: number | null
  message?: string | null
}

export type ProductFeedbackListQuery = {
  organizationId: string

  status?: ProductFeedbackStatus
  category?: ProductFeedbackCategory

  from?: Date
  to?: Date

  take?: number
}

export type ProductFeedbackSummary = {
  organizationId: string

  total: number

  open: number
  triaged: number
  inProgress: number
  resolved: number
  dismissed: number

  ratedCount: number
  averageSatisfaction: number | null

  scoreDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }

  categoryDistribution:
    Record<ProductFeedbackCategory, number>
}
