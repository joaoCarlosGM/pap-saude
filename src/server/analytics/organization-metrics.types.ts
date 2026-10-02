export type OrganizationFeatureUsage =
  Record<string, number>

export type OrganizationMetrics = {
  organizationId: string

  periodStart: Date
  periodEnd: Date

  eventCount: number
  activeUsers: number

  dashboardViews: number
  patientSearches: number

  encountersStarted: number
  encountersCompleted: number

  feedbackOpened: number
  organizationSwitches: number

  featureUsage: OrganizationFeatureUsage
}
