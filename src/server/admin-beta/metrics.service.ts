import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { listAccessibleOrganizationIds } from "@/server/admin/admin-access.service";
import { PERMISSIONS } from "@/server/iam/permissions";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import { writeAdminAudit } from "@/server/audit/admin-audit-writer.service";
import { uuid } from "./policy";
export function csvCell(value: unknown) {
  const str = String(value ?? "");
  return (
    '"' +
    (/^[\s]*[=+\-@\t\r]/.test(str) ? "'" : "") +
    str.replaceAll('"', '""') +
    '"'
  );
}
/** Aggregates solely from allowlisted product events; never queries clinical tables. */
export async function betaMetrics(
  userId: string,
  start: Date,
  end: Date,
  organizationId?: string,
) {
  const scope = await listAccessibleOrganizationIds(
    userId,
    PERMISSIONS.ORGANIZATION_ANALYTICS_READ,
  );
  if (!scope.global && !scope.organizationIds.length)
    throw new AccessDeniedError();
  if (organizationId) {
    uuid(organizationId);
    if (!scope.global && !scope.organizationIds.includes(organizationId))
      throw new AccessDeniedError();
  }
  const where: Prisma.OrganizationWhereInput = {
    type: "HEALTH_UNIT",
    ...(organizationId
      ? {
          OR: [
            { id: organizationId },
            { parentId: organizationId },
            { parent: { parentId: organizationId } },
          ],
        }
      : {}),
    ...(!scope.global ? { id: { in: scope.organizationIds } } : {}),
  };
  const units = await db.organization.findMany({
    where,
    select: {
      id: true,
      status: true,
      isActive: true,
      sourceCandidate: { select: { status: true } },
    },
  });
  const activeIds = units
    .filter((u) => u.status === "ACTIVE" && u.isActive)
    .map((u) => u.id);
  const [members, invitations] = await Promise.all([
    db.membership.findMany({
      where: {
        organizationId: { in: activeIds },
        status: "ACTIVE",
        user: {
          isActive: true,
          roleAssignments: {
            some: {
              role: { key: "PROFESSIONAL" },
              organizationId: { in: activeIds },
            },
          },
        },
      },
      select: { organizationId: true, userId: true },
    }),
    db.userInvitation.groupBy({
      by: ["roleKey", "status", "deliveryStatus"],
      where: {
        organizationId: { in: units.map((u) => u.id) },
        createdAt: { gte: start, lt: end },
      },
      _count: { _all: true },
    }),
  ]);
  // Correlate role and membership in the SAME unit, not simply any eligible unit.
  const roles = await db.roleAssignment.findMany({
    where: { organizationId: { in: activeIds }, role: { key: "PROFESSIONAL" } },
    select: { organizationId: true, userId: true },
  });
  const pairs = new Set(roles.map((r) => `${r.organizationId}/${r.userId}`));
  const eligible = new Set(
    members
      .filter((m) => pairs.has(`${m.organizationId}/${m.userId}`))
      .map((m) => m.organizationId),
  );
  const staffRoles = await db.roleAssignment.findMany({
    where: {
      organizationId: { in: activeIds },
      role: { key: { in: ["PROFESSIONAL", "HEALTH_UNIT_ADMIN"] } },
      user: { isActive: true },
    },
    select: {
      userId: true,
      organizationId: true,
      role: { select: { key: true } },
      user: {
        select: {
          memberships: {
            where: { status: "ACTIVE", organizationId: { in: activeIds } },
            select: { organizationId: true },
          },
        },
      },
    },
  });
  const staff = (key: string) =>
    new Set(
      staffRoles
        .filter(
          (r) =>
            r.role.key === key &&
            r.user.memberships.some(
              (m) => m.organizationId === r.organizationId,
            ),
        )
        .map((r) => r.userId),
    ).size;
  const ids = [...eligible];
  const events = await db.productActivityEvent.findMany({
    where: {
      organizationId: { in: ids },
      eventKey: "encounter.completed",
      occurredAt: { gte: new Date(start.getTime() - 30 * 86400000), lt: end },
      AND: [
        { metadata: { path: ["source"], equals: "clinical-api" } },
        { metadata: { path: ["version"], equals: "beta1" } },
      ],
    },
    select: { organizationId: true, actorUserId: true, occurredAt: true },
    take: 10001,
  });
  if (events.length > 10000) throw new Error("BETA_QUERY_TOO_LARGE"); // Request a narrower period/scope; never publish truncated totals.
  const rows = events.map((e) => ({
    organizationId: e.organizationId!,
    actorUserId: e.actorUserId,
    day: e.occurredAt.toISOString().slice(0, 10),
  }));
  const inWindow = rows.filter(
    (r) => r.day >= start.toISOString().slice(0, 10),
  );
  const active = new Set(inWindow.map((r) => r.organizationId));
  const suppress = (n: number) => (n < 5 ? null : n);
  function users(days: number) {
    return suppress(
      new Set(
        rows
          .filter(
            (r) =>
              r.day >=
              new Date(end.getTime() - days * 86400000)
                .toISOString()
                .slice(0, 10),
          )
          .map((r) => r.actorUserId)
          .filter(Boolean),
      ).size,
    );
  }
  const previous = new Set(
    rows
      .filter((r) => r.day < start.toISOString().slice(0, 10))
      .map((r) => r.organizationId),
  );
  const retained = [...previous].filter((id) => active.has(id)).length;
  const daily = Array.from(
    { length: Math.ceil((end.getTime() - start.getTime()) / 86400000) },
    (_, i) => {
      const day = new Date(start.getTime() + i * 86400000)
        .toISOString()
        .slice(0, 10);
      const dayRows = inWindow.filter((r) => r.day === day),
        people = new Set(dayRows.map((r) => r.actorUserId).filter(Boolean));
      return { day, activeUsers: suppress(people.size) };
    },
  );
  await writeAdminAudit({
    actorUserId: userId,
    action: "BETA_METRICS_READ",
    resourceType: "ORGANIZATION",
    organizationId: organizationId ?? null,
    reason: "AGGREGATED_ONLY",
  });
  return {
    periodStart: start,
    periodEnd: end,
    timezone: "UTC",
    generatedAt: new Date(),
    source:
      "encounter.completed / clinical-api beta1; somente eventos posteriores à instrumentação",
    approvedUnits: units.filter((u) => u.sourceCandidate?.status === "APPROVED")
      .length,
    staff: {
      responsiblesActive: staff("HEALTH_UNIT_ADMIN"),
      professionalsActive: staff("PROFESSIONAL"),
    },
    activeUnits: activeIds.length,
    adoption: {
      eligibleUnits: eligible.size,
      activeUnits: eligible.size < 5 ? null : suppress(active.size),
      rate:
        eligible.size >= 5 && active.size >= 5
          ? active.size / eligible.size
          : null,
      status: !inWindow.length
        ? "NO_DATA"
        : eligible.size < 5 || active.size < 5
          ? "INSUFFICIENT_SAMPLE"
          : "AVAILABLE",
    },
    dau: users(1),
    wau: users(7),
    mau: users(30),
    daily,
    retention: {
      denominator: suppress(previous.size),
      numerator: previous.size < 5 ? null : suppress(retained),
      rate:
        previous.size >= 5 && retained >= 5 ? retained / previous.size : null,
      status:
        previous.size < 5 || retained < 5 ? "INSUFFICIENT_SAMPLE" : "AVAILABLE",
      definition:
        "UBS ativas nos 30 dias anteriores ao início que voltaram na janela selecionada",
    },
    invitations: invitations.map((r) => ({
      role: r.roleKey,
      status: r.status,
      delivery: r.deliveryStatus,
      count: r._count._all,
    })),
    completedJourneys: "NOT_INSTRUMENTED",
    clinicalOutcomes: "NOT_INSTRUMENTED",
  };
}
