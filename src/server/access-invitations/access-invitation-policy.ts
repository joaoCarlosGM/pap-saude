import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { requireAdminActor } from "@/server/admin/admin-session.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import { AccessInvitationError } from "./access-invitation.errors";

export const PROPOSED_ROLES = [
  "PAP_MANAGER",
  "COMMERCIAL",
  "PROFESSIONAL",
  "HEALTH_UNIT_ADMIN",
  "MUNICIPAL_ADMIN",
] as const;
export type ProposedRole = (typeof PROPOSED_ROLES)[number];

/** Called again on the transaction client, never a role snapshot from the browser. */
export async function invitationAuthority(
  userId: string,
  tx: Prisma.TransactionClient = db,
) {
  const profile = await getEffectiveAccessProfile(userId, tx);
  const role = profile?.roles.find(
    (r) =>
      r.scope === "GLOBAL" &&
      ["PAP_ADMIN", "PAP_MANAGER"].includes(r.key) &&
      r.permissions.includes("institution.invite"),
  );
  if (!role) throw new AccessDeniedError();
  return {
    full: role.key === "PAP_ADMIN" && role.permissions.includes("role.manage"),
  };
}
export async function invitationActor(
  userId: string,
  token: string,
  tx: Prisma.TransactionClient = db,
) {
  await requireAdminActor(userId, token, tx);
  return invitationAuthority(userId, tx);
}
export function proposal(value: unknown, full: boolean): ProposedRole {
  if (
    typeof value !== "string" ||
    !PROPOSED_ROLES.includes(value as ProposedRole)
  )
    throw new AccessInvitationError("INVALID_PROPOSED_ROLE", 400);
  if (value === "PAP_MANAGER" && !full) throw new AccessDeniedError();
  return value as ProposedRole;
}
