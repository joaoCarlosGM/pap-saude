/** Admin audit actions are separate from clinical audit and cannot reveal PHI. */
export const ADMIN_AUDIT_ACTIONS = [
  "REQUEST_SUBMITTED", "REQUEST_APPROVED", "REQUEST_REJECTED", "INVITATION_DELIVERY", "BETA_METRICS_READ",
  "ORGANIZATION_CREATED", "ORGANIZATION_UPDATED", "ORGANIZATION_ACTIVATED",
  "ORGANIZATION_SUSPENDED", "ORGANIZATION_ARCHIVED",
  "INVITATION_CREATED", "INVITATION_ACCEPTED", "INVITATION_REVOKED",
  "ROLE_ASSIGNED", "ROLE_REVOKED", "SESSION_REVOKED", "USER_SESSIONS_REVOKED",
  "SESSION_SELF_REVOKED", "SESSIONS_SELF_REVOKED", "MFA_RESET",
  "MFA_ENROLLMENT_STARTED", "MFA_ENROLLMENT_CONFIRMED", "RECOVERY_CODES_REGENERATED",
  "PASSWORD_RESET", "PASSWORD_CHANGED",
] as const;
export const ADMIN_AUDIT_RESOURCES = ["ORGANIZATION_REQUEST", "ORGANIZATION", "INVITATION", "ROLE_ASSIGNMENT", "USER", "USER_SESSION", "MFA_FACTOR"] as const;
const SAFE_FIELDS: Record<string, readonly string[]> = {
  ORGANIZATION_REQUEST: ["id", "status", "convertedOrganizationId"],
  ORGANIZATION: ["id", "type", "status", "name", "code", "city", "state", "parentId", "isActive"],
  INVITATION: ["id", "status", "roleKey", "organizationId", "userId", "expiresAt"],
  ROLE_ASSIGNMENT: ["targetUserId", "roleKey", "organizationId"],
  USER: ["id", "isActive", "status"],
  USER_SESSION: ["userId", "revoked", "reason"],
  MFA_FACTOR: ["status", "type"],
};
export function isAdminAuditAction(value: string): boolean { return (ADMIN_AUDIT_ACTIONS as readonly string[]).includes(value); }
export function isAdminAuditResource(value: string): boolean { return (ADMIN_AUDIT_RESOURCES as readonly string[]).includes(value); }
/** Apply the allowlist when writing AND when reading legacy records. Never return arbitrary Json snapshots. */
export function projectAdminSnapshot(resourceType: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const output: Record<string, string | number | boolean | null> = {};
  for (const field of SAFE_FIELDS[resourceType] ?? []) {
    const data = source[field];
    if (data === null || typeof data === "boolean" || typeof data === "number") output[field] = data;
    else if (typeof data === "string") output[field] = data.slice(0, 200);
  }
  return Object.keys(output).length ? output : null;
}
