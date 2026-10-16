import { OrganizationStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { listAccessibleOrganizationIds } from "@/server/admin/admin-access.service";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import type { PermissionKey } from "@/server/iam/permissions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class InvalidOperationsQueryError extends Error {
  constructor() { super("INVALID_OPERATIONS_QUERY"); }
}
export function operationsPage(value: string | null): number {
  if (value === null) return 1;
  if (!/^[1-9]\d{0,3}$/.test(value)) throw new InvalidOperationsQueryError();
  return Number(value);
}
export function operationsOrganization(value: string | null): string | undefined {
  if (value === null) return undefined;
  if (!UUID.test(value)) throw new InvalidOperationsQueryError();
  return value;
}
export function readOperationsQuery(url: URL, allowed: readonly string[]) {
  if (url.search.length > 500) throw new InvalidOperationsQueryError();
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1)
      throw new InvalidOperationsQueryError();
  }
  return {
    page: operationsPage(url.searchParams.get("page")),
    organizationId: operationsOrganization(url.searchParams.get("organizationId")),
  };
}

export async function scopedOrganizationPage(input: {
  userId: string;
  permission: PermissionKey;
  page: number;
  organizationId?: string;
}) {
  const scope = await listAccessibleOrganizationIds(input.userId, input.permission);
  if (!scope.global && scope.organizationIds.length === 0) throw new AccessDeniedError();
  if (input.organizationId && !scope.global && !scope.organizationIds.includes(input.organizationId))
    throw new AccessDeniedError();
  const where: Prisma.OrganizationWhereInput = {
    status: OrganizationStatus.ACTIVE,
    isActive: true,
    id: input.organizationId ?? (scope.global ? undefined : { in: scope.organizationIds }),
  };
  const [organizations, total] = await db.$transaction([
    db.organization.findMany({
      where,
      select: { id: true, name: true, type: true, parentId: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (input.page - 1) * 25,
      take: 25,
    }),
    db.organization.count({ where }),
  ]);
  return { organizations, total, page: input.page, pageSize: 25, global: scope.global };
}

export function operationsPeriod(from: string | null, to: string | null) {
  function parse(value: string | null, fallback: Date) {
    if (value === null) return fallback;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InvalidOperationsQueryError();
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      throw new InvalidOperationsQueryError();
    return date;
  }
  const now = new Date();
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const end = parse(to, defaultEnd);
  const start = parse(from, new Date(end.getTime() - 30 * 86_400_000));
  if (start >= end || end.getTime() - start.getTime() > 90 * 86_400_000 || end.getTime() > defaultEnd.getTime())
    throw new InvalidOperationsQueryError();
  return { start, end };
}
