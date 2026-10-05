export const PERMISSIONS = {
  // Organizations
  ORGANIZATION_READ: "organization.read",
  ORGANIZATION_MANAGE: "organization.manage",

  // Memberships
  MEMBERSHIP_READ: "membership.read",
  MEMBERSHIP_MANAGE: "membership.manage",

  // Users
  USER_READ: "user.read",
  USER_INVITE: "user.invite",
  USER_DISABLE: "user.disable",
  USER_SECURITY_MANAGE: "user.security.manage",

  // Roles / IAM
  ROLE_READ: "role.read",
  ROLE_MANAGE: "role.manage",

  // MFA
  MFA_RESET: "mfa.reset",

  // Audit
  AUDIT_READ: "audit.read",

  // Commercial
  COMMERCIAL_READ: "commercial.read",
  COMMERCIAL_MANAGE: "commercial.manage",

  // Analytics
  ORGANIZATION_ANALYTICS_READ: "analytics.organization.read",

  // Feedback
  FEEDBACK_READ: "feedback.read",
  FEEDBACK_MANAGE: "feedback.manage",

  // Patients
  PATIENT_READ: "patient.read",
  PATIENT_CREATE: "patient.create",
  PATIENT_UPDATE_DEMOGRAPHICS: "patient.update_demographics",

  // Pregnancies
  PREGNANCY_READ: "pregnancy.read",
  PREGNANCY_CREATE: "pregnancy.create",
  PREGNANCY_UPDATE: "pregnancy.update",

  // Encounters
  ENCOUNTER_READ: "encounter.read",
  ENCOUNTER_CREATE: "encounter.create",
  ENCOUNTER_UPDATE: "encounter.update",

  // Vital signs
  VITAL_SIGNS_READ: "vital_signs.read",
  VITAL_SIGNS_CREATE: "vital_signs.create",
  VITAL_SIGNS_UPDATE: "vital_signs.update",

  // Obstetric data
  OBSTETRIC_DATA_READ: "obstetric_data.read",
  OBSTETRIC_DATA_CREATE: "obstetric_data.create",
  OBSTETRIC_DATA_UPDATE: "obstetric_data.update",

  // Allergies
  ALLERGY_READ: "allergy.read",
  ALLERGY_CREATE: "allergy.create",
  ALLERGY_UPDATE: "allergy.update",

  // Clinical flags
  CLINICAL_FLAG_READ: "clinical_flag.read",
  CLINICAL_FLAG_CREATE: "clinical_flag.create",
  CLINICAL_FLAG_UPDATE: "clinical_flag.update",

  // MEOWS
  MEOWS_READ: "meows.read",
  MEOWS_EVALUATE: "meows.evaluate",

  // RNDS
  RNDS_INTEGRATION_READ: "rnds.integration.read",
  RNDS_INTEGRATION_REQUEST: "rnds.integration.request",
  RNDS_INTEGRATION_VALIDATE: "rnds.integration.validate",
  RNDS_INTEGRATION_APPROVE: "rnds.integration.approve",
} as const

export type PermissionKey =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSION_KEYS =
  Object.values(PERMISSIONS) as PermissionKey[]
