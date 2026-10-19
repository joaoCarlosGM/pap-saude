import { AuditOutcome, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { isAdminAuditAction, isAdminAuditResource, projectAdminSnapshot } from "./admin-audit-policy";

type Writer = Pick<Prisma.TransactionClient, "auditEvent">;
export type AdminAuditWriteInput = {
  actorUserId?: string;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome?: AuditOutcome;
  reason?: string;
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  before?: unknown;
  after?: unknown;
};
/** Pass `tx` from the domain mutation to ensure atomicity. No arbitrary metadata allowed. */
export async function writeAdminAudit(input: AdminAuditWriteInput, client: Writer = db) {
  if (!isAdminAuditAction(input.action) || !isAdminAuditResource(input.resourceType)) {
    throw new Error("UNSUPPORTED_ADMIN_AUDIT_EVENT");
  }
  const before = projectAdminSnapshot(input.resourceType, input.before);
  const after = projectAdminSnapshot(input.resourceType, input.after);
  return client.auditEvent.create({ data: {
    actorUserId: input.actorUserId,
    organizationId: input.organizationId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    outcome: input.outcome ?? AuditOutcome.SUCCESS,
    reason: input.reason && /^[A-Z0-9_]{1,64}$/.test(input.reason) ? input.reason : undefined,
    requestId: input.requestId,
    correlationId: input.correlationId,
    sessionId: input.sessionId,
    ...(before ? { before: before as Prisma.InputJsonValue } : {}),
    ...(after ? { after: after as Prisma.InputJsonValue } : {}),
  } });
}
