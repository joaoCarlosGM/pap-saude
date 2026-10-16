import { AuditOutcome, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { listAccessibleOrganizationIds } from "@/server/admin/admin-access.service";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import { PERMISSIONS } from "@/server/iam/permissions";
import { ADMIN_AUDIT_ACTIONS, ADMIN_AUDIT_RESOURCES, isAdminAuditAction, isAdminAuditResource, projectAdminSnapshot } from "./admin-audit-policy";

export class InvalidAuditFilterError extends Error {
  constructor() { super("INVALID_AUDIT_FILTER"); }
}
type Filters = {
  page?: number; action?: string; actorUserId?: string; organizationId?: string;
  resourceType?: string; resourceId?: string; outcome?: string; from?: string; to?: string;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validate(input: Filters) {
  const page = input.page ?? 1;
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new InvalidAuditFilterError();
  if (input.action && !isAdminAuditAction(input.action)) throw new InvalidAuditFilterError();
  if (input.resourceType && !isAdminAuditResource(input.resourceType)) throw new InvalidAuditFilterError();
  if (input.outcome && !Object.values(AuditOutcome).includes(input.outcome as AuditOutcome)) throw new InvalidAuditFilterError();
  for (const value of [input.actorUserId, input.organizationId]) if (value && !UUID.test(value)) throw new InvalidAuditFilterError();
  if (input.resourceId && !/^[a-z\d_-]{1,128}$/i.test(input.resourceId)) throw new InvalidAuditFilterError();
  const from = input.from ? new Date(input.from) : undefined;
  const to = input.to ? new Date(input.to) : undefined;
  if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime())) || (from && to && from > to)) throw new InvalidAuditFilterError();
  return { page, from, to };
}
/** Fail closed for actors without audit.read; clinical events and fields are never returned. */
export async function listAdminAuditEvents(actorUserId: string, filters: Filters = {}) {
  const { page, from, to } = validate(filters);
  const scope = await listAccessibleOrganizationIds(actorUserId, PERMISSIONS.AUDIT_READ);
  if (!scope.global && !scope.organizationIds.length) throw new AccessDeniedError();
  if (filters.organizationId && !scope.global && !scope.organizationIds.includes(filters.organizationId)) throw new AccessDeniedError();
  const where: Prisma.AuditEventWhereInput = {
    patientId: null,
    action: { in: filters.action ? [filters.action] : [...ADMIN_AUDIT_ACTIONS] },
    resourceType: { in: filters.resourceType ? [filters.resourceType] : [...ADMIN_AUDIT_RESOURCES] },
    organizationId: filters.organizationId ? filters.organizationId : scope.global ? undefined : { in: scope.organizationIds },
    actorUserId: filters.actorUserId,
    resourceId: filters.resourceId,
    outcome: filters.outcome as AuditOutcome | undefined,
    occurredAt: from || to ? { gte: from, lte: to } : undefined,
  };
  const [events, total] = await db.$transaction([
    db.auditEvent.findMany({ where, select: {
      id: true, actorUserId: true, organizationId: true, action: true,
      resourceType: true, resourceId: true, outcome: true, occurredAt: true,
      before: true, after: true, requestId: true, correlationId: true,
    }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25 }),
    db.auditEvent.count({ where }),
  ]);
  return {
    events: events.map(event => ({
      ...event,
      before: projectAdminSnapshot(event.resourceType, event.before),
      after: projectAdminSnapshot(event.resourceType, event.after),
    })), total, page, pageSize: 25,
  };
}
