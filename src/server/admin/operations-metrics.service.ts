import { db } from "@/server/db/client";
import { PERMISSIONS } from "@/server/iam/permissions";
import { PRODUCT_ACTIVITY_EVENTS } from "@/server/activity/activity-events";
import { scopedOrganizationPage } from "./operations-scope.service";

/** Only product-usage events are included; no clinical records or patient counts. */
export async function listOperationsMetrics(input: {
  userId: string; page: number; organizationId?: string; start: Date; end: Date;
}) {
  const scope = await scopedOrganizationPage({
    userId: input.userId, permission: PERMISSIONS.ORGANIZATION_ANALYTICS_READ,
    page: input.page, organizationId: input.organizationId,
  });
  const rootIds = scope.organizations.map(o => o.id);
  const children = rootIds.length ? await db.organization.findMany({
    where: { parentId: { in: rootIds }, isActive: true, status: "ACTIVE" },
    select: { id: true, parentId: true },
  }) : [];
  // A PAP root summarizes its entire hierarchy, not just direct municipalities.
  const municipalityIds = scope.organizations.filter(o => o.type === "PAP").map(o => o.id);
  const allUnits = municipalityIds.length ? await db.organization.findMany({
    where: { type: "HEALTH_UNIT", isActive: true, status: "ACTIVE", parent: { parentId: { in: municipalityIds } } },
    select: { id: true },
  }) : [];
  const directIds = new Set(rootIds);
  for (const child of children) directIds.add(child.id);
  for (const child of allUnits) directIds.add(child.id);
  if (!directIds.size) return { ...scope, periodStart: input.start, periodEnd: input.end, rows: [] };
  const where = {
    organizationId: { in: [...directIds] },
    occurredAt: { gte: input.start, lt: input.end },
    // The actor cohort must use the same product-event allowlist as totals.
    eventKey: { in: Object.values(PRODUCT_ACTIVITY_EVENTS) },
  };
  const [usage, actors] = await Promise.all([
    db.productActivityEvent.groupBy({ by: ["organizationId", "eventKey"], where,
      _count: { _all: true } }),
    db.productActivityEvent.groupBy({ by: ["organizationId", "actorUserId"],
      where: { ...where, actorUserId: { not: null } }, _count: { _all: true } }),
  ]);
  const approvedEvents = new Set<string>(Object.values(PRODUCT_ACTIVITY_EVENTS));
  const rows = scope.organizations.map(org => {
    const included = new Set([org.id]);
    if (org.type !== "HEALTH_UNIT") {
      for (const child of children) if (child.parentId === org.id) included.add(child.id);
      if (org.type === "PAP") for (const unit of allUnits) included.add(unit.id);
    }
    const eventCounts: Record<string, number> = {};
    for (const entry of usage) {
      if (entry.organizationId && included.has(entry.organizationId) && approvedEvents.has(entry.eventKey))
        eventCounts[entry.eventKey] = (eventCounts[entry.eventKey] ?? 0) + entry._count._all;
    }
    const active = new Set(actors.filter(a => a.organizationId && included.has(a.organizationId))
      .map(a => a.actorUserId).filter((id): id is string => Boolean(id)));
    return {
      ...org,
      eventCount: Object.values(eventCounts).reduce((sum, n) => sum + n, 0),
      // Suppress small cohorts, including zero, to reduce re-identification risk.
      activeUsers: active.size < 5 ? null : active.size,
      activeUsersSuppressed: active.size < 5,
      dashboardViews: eventCounts[PRODUCT_ACTIVITY_EVENTS.DASHBOARD_VIEWED] ?? 0,
      encountersStarted: eventCounts[PRODUCT_ACTIVITY_EVENTS.ENCOUNTER_STARTED] ?? 0,
      encountersCompleted: eventCounts[PRODUCT_ACTIVITY_EVENTS.ENCOUNTER_COMPLETED] ?? 0,
      eventCounts,
    };
  });
  return { ...scope, periodStart: input.start, periodEnd: input.end, rows };
}
