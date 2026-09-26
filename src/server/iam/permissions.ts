export const PERMISSIONS = {
  PATIENT_READ: "patient.read",
  PATIENT_CREATE: "patient.create",
  PATIENT_UPDATE_DEMOGRAPHICS: "patient.update_demographics",
  ENCOUNTER_READ: "encounter.read",
  ENCOUNTER_CREATE: "encounter.create",
  ENCOUNTER_UPDATE: "encounter.update",
  ALLERGY_READ: "allergy.read",
  ALLERGY_CREATE: "allergy.create",
  AUDIT_READ: "audit.read",
  USER_INVITE: "user.invite",
  USER_DISABLE: "user.disable",
  USER_SECURITY_MANAGE: "user.security.manage",
  ORGANIZATION_MANAGE: "organization.manage",
  RNDS_INTEGRATION_READ: "rnds.integration.read",
  RNDS_INTEGRATION_REQUEST: "rnds.integration.request",
  RNDS_INTEGRATION_VALIDATE: "rnds.integration.validate",
  RNDS_INTEGRATION_APPROVE: "rnds.integration.approve",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
