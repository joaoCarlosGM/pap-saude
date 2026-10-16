import { db } from "@/server/db/client";
import { listAccessibleOrganizationIds } from "@/server/admin/admin-access.service";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import { PERMISSIONS } from "@/server/iam/permissions";
import type { Prisma } from "@prisma/client";

/** Read-only, fail-closed RNDS inventory. Do not return configuration, secrets or transmission payloads. */
export async function listOperationsIntegrations(input: {
  userId: string; page: number; organizationId?: string;
}) {
  const scope = await listAccessibleOrganizationIds(input.userId, PERMISSIONS.RNDS_INTEGRATION_READ);
  if (!scope.global && scope.organizationIds.length === 0) throw new AccessDeniedError();
  if (input.organizationId && !scope.global && !scope.organizationIds.includes(input.organizationId))
    throw new AccessDeniedError();
  const target = input.organizationId ? await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, type: true, isActive: true, status: true },
  }) : null;
  if (input.organizationId && (!target || !target.isActive || target.status !== "ACTIVE"))
    throw new AccessDeniedError();

  const targetWhere: Prisma.OrganizationWhereInput = target?.type === "HEALTH_UNIT"
    ? { id: target.id }
    : target?.type === "MUNICIPALITY"
      ? { parentId: target.id }
      : target?.type === "PAP"
        ? { parent: { parentId: target.id } }
        : {};
  const where: Prisma.OrganizationWhereInput = {
    type: "HEALTH_UNIT", status: "ACTIVE", isActive: true,
    AND: [targetWhere, scope.global ? {} : { id: { in: scope.organizationIds } }],
  };
  const [units, total] = await db.$transaction([
    db.organization.findMany({
      where, select: { id: true, name: true, parentId: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (input.page - 1) * 25, take: 25,
    }),
    db.organization.count({ where }),
  ]);
  const integrations = units.length ? await db.rNDSIntegration.findMany({
    where: { healthUnitId: { in: units.map(o => o.id) } },
    select: {
      healthUnitId: true, environment: true, status: true,
      lastCheckedAt: true, updatedAt: true,
      validationRuns: {
        take: 1, orderBy: { createdAt: "desc" }, select: { status: true, createdAt: true },
      },
    },
  }) : [];
  const byUnit = new Map(integrations.map(item => [item.healthUnitId, item]));
  return {
    page: input.page, pageSize: 25, total,
    n8n: { status: scope.global
      ? (process.env.PAP_N8N_BASE_URL ? "CONFIGURED_UNVERIFIED" : "NOT_CONFIGURED")
      : "NOT_DISCLOSED" },
    units: units.map(unit => {
      const integration = byUnit.get(unit.id);
      return {
        ...unit, environment: integration?.environment ?? null,
        status: integration?.status ?? "NOT_REQUESTED",
        lastCheckedAt: integration?.lastCheckedAt ?? null,
        updatedAt: integration?.updatedAt ?? null,
        lastValidation: integration?.validationRuns[0]?.status ?? null,
      };
    }),
    readOnly: true,
    transmissionEnabledByThisConsole: false,
  };
}
