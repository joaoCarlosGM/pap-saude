import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { validateSession } from "@/server/auth/session.service";
import { requireOperationalMfa } from "@/server/auth/operational-mfa.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
export class ProfileInputError extends Error {}
export function profileName(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !("displayName" in body) || typeof body.displayName !== "string") throw new ProfileInputError();
  const value = body.displayName.trim();
  if (value.length < 2 || value.length > 120 || /[\u0000-\u001f\u007f]/.test(value)) throw new ProfileInputError();
  return value;
}
export async function ownProfile(token: string, update?: unknown) {
  const name = update === undefined ? undefined : profileName(update);
  return db.$transaction(async tx => {
    const actor = await validateSession(token, { client: tx, updateLastSeen: false });
    await requireOperationalMfa(actor, tx);
    if (name !== undefined) {
      await tx.user.update({ where: { id: actor.user.id }, data: { displayName: name } });
      await tx.auditEvent.create({ data: { action: "OWN_PROFILE_UPDATED", actorUserId: actor.user.id, sessionId: actor.session.id, resourceType: "USER", resourceId: actor.user.id } });
    }
    const profile = await getEffectiveAccessProfile(actor.user.id, tx);
    // Only current identity fields and effective own grants, never credentials/factors.
    return { id: actor.user.id, displayName: name ?? actor.user.displayName, email: actor.user.email, roles: profile?.roles.map(r => ({ name: r.name, organization: r.organization?.name ?? "PAP global" })) ?? [] };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
