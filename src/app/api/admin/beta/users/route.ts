import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { listAccessibleOrganizationIds } from "@/server/admin/admin-access.service";
import { PERMISSIONS } from "@/server/iam/permissions";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import {
  betaJson,
  betaError,
  requireBetaSession,
} from "@/server/admin-beta/http";
import { invalid, text, uuid } from "@/server/admin-beta/policy";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const session = await requireBetaSession(request),
      p = request.nextUrl.searchParams;
    if (
      request.nextUrl.search.length > 500 ||
      [...p.keys()].some(
        (k) =>
          !["page", "q", "organizationId"].includes(k) ||
          p.getAll(k).length !== 1,
      )
    )
      invalid();
    const page = Number(p.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000) invalid();
    const q = p.get("q") ? text(p.get("q"), 100, 1) : undefined,
      organizationId = p.get("organizationId")
        ? uuid(p.get("organizationId"))
        : undefined;
    const scope = await listAccessibleOrganizationIds(
      session.user.id,
      PERMISSIONS.USER_READ,
    );
    if (
      (!scope.global && !scope.organizationIds.length) ||
      (organizationId &&
        !scope.global &&
        !scope.organizationIds.includes(organizationId))
    )
      throw new AccessDeniedError();
    const ids = organizationId ? [organizationId] : scope.organizationIds;
    const where: Prisma.UserWhereInput = {
      ...(!scope.global || organizationId
        ? { memberships: { some: { organizationId: { in: ids } } } }
        : {}),
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await db.$transaction([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          isActive: true,
          memberships: {
            where: scope.global
              ? undefined
              : { organizationId: { in: scope.organizationIds } },
            select: {
              status: true,
              organization: { select: { id: true, name: true } },
            },
          },
          roleAssignments: {
            where: scope.global
              ? undefined
              : { organizationId: { in: scope.organizationIds } },
            select: {
              role: { select: { key: true, name: true } },
              organization: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
        take: 20,
        skip: (page - 1) * 20,
      }),
      db.user.count({ where }),
    ]);
    return betaJson({ rows, total, page, pageSize: 20 });
  } catch (error) {
    return betaError(error);
  }
}
