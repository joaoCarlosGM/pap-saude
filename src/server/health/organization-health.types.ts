export type OrganizationHealthThresholds = {
  minimumEvents: number
  minimumRatings: number
  maximumAverageSatisfaction: number
  criticalAverageSatisfaction: number
  feedbackBacklogWarning: number
  feedbackBacklogCritical: number
}

export const DEFAULT_ORGANIZATION_HEALTH_THRESHOLDS:
  OrganizationHealthThresholds = {
    minimumEvents: 1,
    minimumRatings: 3,
    maximumAverageSatisfaction: 2.5,
    criticalAverageSatisfaction: 1.5,
    feedbackBacklogWarning: 5,
    feedbackBacklogCritical: 10,
  }
