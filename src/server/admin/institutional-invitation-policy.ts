import { AccessDeniedError } from "@/server/iam/authorization.errors";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { PERMISSIONS } from "@/server/iam/permissions";
import { requireAdminOrganizationAccess } from "./admin-access.service";
export async function requireInstitutionalInvitationAccess(
  userId: string,
  organizationId: string,
  client: Prisma.TransactionClient = db,
) {
  const profile = await getEffectiveAccessProfile(userId, client);
  if (profile?.permissions.includes(PERMISSIONS.INSTITUTION_INVITE)) {
    return requireAdminOrganizationAccess(
      userId,
      PERMISSIONS.INSTITUTION_INVITE,
      organizationId,
      client,
    );
  }
  await requireAdminOrganizationAccess(
    userId,
    PERMISSIONS.USER_INVITE,
    organizationId,
    client,
  );
  return requireAdminOrganizationAccess(
    userId,
    PERMISSIONS.MEMBERSHIP_MANAGE,
    organizationId,
    client,
  );
}

/** A delegated inviter cannot use institutional enrollment to gain clinical or admin access. */
export async function requireInstitutionalInvitationTarget(
  actorUserId: string,
  normalizedEmail: string,
  client: Prisma.TransactionClient = db,
) {
  const profile = await getEffectiveAccessProfile(actorUserId, client);
  const full = profile?.roles.some(
    (r) =>
      r.key === "PAP_ADMIN" &&
      r.scope === "GLOBAL" &&
      r.permissions.includes(PERMISSIONS.ROLE_MANAGE),
  );
  const delegated = profile?.roles.some(
    (r) => r.key === "PAP_MANAGER" && r.scope === "GLOBAL",
  );
  if (!delegated || full) return;
  if (profile!.user.email.toLowerCase() === normalizedEmail.toLowerCase())
    throw new AccessDeniedError();
  const target = await client.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      roleAssignments: {
        select: { role: { select: { key: true, system: true } } },
      },
    },
  });
  // Existing professionals may receive another legitimate institutional scope.
  // All other assigned roles (including unknown/custom ones) are protected.
  if (
    target?.roleAssignments.some(
      (a) => !a.role.system || a.role.key !== "PROFESSIONAL",
    )
  )
    throw new AccessDeniedError();
}
