export const PRODUCT_ACTIVITY_EVENTS = {
  DASHBOARD_VIEWED: "dashboard.viewed",

  PATIENT_SEARCH_USED: "patient.search.used",

  ENCOUNTER_STARTED: "encounter.started",
  ENCOUNTER_COMPLETED: "encounter.completed",

  FEEDBACK_OPENED: "feedback.opened",

  ORGANIZATION_SWITCHED: "organization.switched",
} as const

export type ProductActivityEventKey =
  (typeof PRODUCT_ACTIVITY_EVENTS)[keyof typeof PRODUCT_ACTIVITY_EVENTS]

export const SAFE_ACTIVITY_METADATA_KEYS = [
  "source",
  "variant",
  "result",
  "count",
  "durationMs",
  "route",
  "component",
  "mode",
  "feature",
  "version",
  "organizationType",
  "deviceClass",
] as const

export type SafeActivityMetadataKey =
  (typeof SAFE_ACTIVITY_METADATA_KEYS)[number]

export type SafeActivityMetadataValue =
  | string
  | number
  | boolean
  | null

export type SafeActivityMetadata =
  Partial<
    Record<
      SafeActivityMetadataKey,
      SafeActivityMetadataValue
    >
  >
