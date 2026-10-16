import { db } from "@/server/db/client";
import { PERMISSIONS } from "@/server/iam/permissions";
import { scopedOrganizationPage } from "./operations-scope.service";

/** Monitoring uses persisted signals only. Missing instrumentation is explicit, never invented. */
export async function listOperationsMonitoring(input: {
  userId: string; page: number; organizationId?: string;
}) {
  const scope = await scopedOrganizationPage({
    userId: input.userId, permission: PERMISSIONS.ORGANIZATION_ANALYTICS_READ,
    page: input.page, organizationId: input.organizationId,
  });
  const ids = scope.organizations.map(o => o.id);
  const municipalities = scope.organizations.filter(o => o.type === "PAP").map(o => o.id);
  const firstChildren = ids.length ? await db.organization.findMany({
    where: { parentId: { in: ids }, isActive: true, status: "ACTIVE" },
    select: { id: true, parentId: true },
  }) : [];
  const papUnits = municipalities.length ? await db.organization.findMany({
    where: { type: "HEALTH_UNIT", parent: { parentId: { in: municipalities } }, status: "ACTIVE", isActive: true },
    select: { id: true },
  }) : [];
  const monitoredIds = [...new Set([...ids, ...firstChildren.map(o => o.id), ...papUnits.map(o => o.id)])];
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const stale = new Date(Date.now() - 60 * 60_000);
  // The organizational scope is resolved before any aggregate query.
  const [integrations, backlog, failedTransmissions, overdueValidations] = await Promise.all([
    db.rNDSIntegration.groupBy({ by: ["status"],
      where: { healthUnitId: { in: monitoredIds } }, _count: { _all: true } }),
    db.interoperabilityTransmission.count({ where: {
      rndsIntegration: { healthUnitId: { in: monitoredIds } },
      status: { in: ["QUEUED", "RETRY_SCHEDULED"] }, requestedAt: { lt: stale },
    } }),
    db.interoperabilityTransmission.count({ where: {
      rndsIntegration: { healthUnitId: { in: monitoredIds } },
      status: "FAILED", lastAttemptAt: { gte: since },
    } }),
    db.rNDSValidationRun.count({ where: {
      rndsIntegration: { healthUnitId: { in: monitoredIds } },
      status: { in: ["PENDING", "RUNNING"] }, createdAt: { lt: stale },
    } }),
  ]);
  return {
    ...scope,
    checkedAt: new Date(),
    database: "REACHABLE",
    integrations: Object.fromEntries(integrations.map(r => [r.status, r._count._all])),
    overdueTransmissionQueue: backlog,
    failedTransmissionsLast24h: failedTransmissions,
    overdueValidations,
    // Signals unavailable in the current stack must never be reported as healthy.
    requestErrorRate: "NOT_INSTRUMENTED",
    externalN8nHealth: "NOT_INSTRUMENTED",
    workerHeartbeat: "NOT_INSTRUMENTED",
  };
}
