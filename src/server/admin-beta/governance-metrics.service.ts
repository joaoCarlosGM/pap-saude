import { Prisma } from "@prisma/client";
import type { GovernanceMetric, GovernanceSummary } from "@/lib/admin/governance-metrics";
import { db } from "@/server/db/client";
import { requireAdminActor } from "@/server/admin/admin-session.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { PERMISSIONS } from "@/server/iam/permissions";
import { InvalidOperationsQueryError } from "@/server/admin/operations-scope.service";

/** Read-only governance counts: never read patients, encounters or clinical events. */
export async function globalGovernanceSummary(
  userId: string,
  actorSessionToken: string | undefined,
  start: Date,
  end: Date,
  organizationId?: string,
): Promise<GovernanceSummary | null> {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
      start >= end || end.getTime() - start.getTime() > 90 * 86_400_000)
    throw new InvalidOperationsQueryError();
  return db.$transaction(async tx => {
    await requireAdminActor(userId, actorSessionToken, tx);
    const profile = await getEffectiveAccessProfile(userId, tx);
    // A global card must not silently ignore an organizational filter or become
    // visible to a delegated role with a persisted permission outside its catalog.
    const readable = [PERMISSIONS.ORGANIZATION_ANALYTICS_READ,
      PERMISSIONS.ORGANIZATION_READ, PERMISSIONS.INSTITUTION_INVITE, PERMISSIONS.ROLE_READ];
    if (organizationId || !profile?.roles.some(role => role.key === "PAP_ADMIN" &&
      role.scope === "GLOBAL" && readable.every(permission => role.permissions.includes(permission))))
      return null;
    const generatedAt = new Date();
    const [invitationsCreated, pendingAssignments, commercialUsers, unitsAwaitingActivation] = await Promise.all([
      tx.accessInvitation.count({ where: { createdAt: { gte: start, lt: end } } }),
      // Accepted invitations remain pending assignment after the acceptance-link
      // expiry. Acceptance is not operational authorization.
      tx.accessInvitation.count({ where: { status: "PENDING_ASSIGNMENT" } }),
      // Count distinct identities rather than RoleAssignment rows: historical
      // nullable-scope duplicates must never inflate the number of people.
      tx.user.count({ where: { isActive: true, roleAssignments: { some: {
        organizationId: null, role: { key: "COMMERCIAL", system: true,
          permissions: { some: { permission: { key: PERMISSIONS.COMMERCIAL_READ } } } },
      } } } }),
      tx.organization.count({ where: {
        type: "HEALTH_UNIT", status: "PENDING_VERIFICATION", isActive: false,
        sourceCandidate: { type: "HEALTH_UNIT", status: "READY_FOR_ACTIVATION", consentedAt: { not: null } },
      } }),
    ]);
    function metric(value: number, window: GovernanceMetric["window"], definition: string, source: string): GovernanceMetric {
      return { value, status: value === 0 ? "NO_DATA" : "AVAILABLE", window, definition, source, denominator: null };
    }
    return {
      scope: "PAP_GLOBAL", timezone: "UTC", periodStart: start.toISOString(),
      periodEnd: end.toISOString(), generatedAt: generatedAt.toISOString(),
      invitationsCreated: metric(invitationsCreated, "SELECTED_PERIOD",
        "Convites globais criados no intervalo UTC [início, fim), em qualquer estado atual; exclui convites institucionais legados.", "AccessInvitation.createdAt"),
      pendingAssignments: metric(pendingAssignments, "CURRENT_SNAPSHOT",
        "Convites globais aceitos que aguardam decisão de atribuição agora; não concedem acesso operacional.", "AccessInvitation.status=PENDING_ASSIGNMENT"),
      commercialUsers: metric(commercialUsers, "CURRENT_SNAPSHOT",
        "Pessoas ativas distintas com concessão COMMERCIAL global canônica e permissão commercial.read; não comprova login, MFA ou uso.", "User + RoleAssignment + RolePermission"),
      unitsAwaitingActivation: metric(unitsAwaitingActivation, "CURRENT_SNAPSHOT",
        "UBS inativas e pendentes vinculadas a solicitações consentidas analisadas, aguardando ativação exclusiva pelo PAP_ADMIN.", "Organization + OrganizationCandidate.status=READY_FOR_ACTIVATION"),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
