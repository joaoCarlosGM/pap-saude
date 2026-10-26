import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { validateSession } from "@/server/auth/session.service";
import { InvalidSessionError, ExpiredSessionError, RevokedSessionError, InactiveSessionUserError } from "@/server/auth/session.errors";
import { getSystemRoleDefinition } from "@/server/iam/system-role-catalog";
export class CommercialAccessError extends Error {
    constructor(readonly status: 401 | 403) { super(status === 401 ? "UNAUTHENTICATED" : "ACCESS_DENIED"); }
}
export class CommercialMfaRequiredError extends CommercialAccessError {
    constructor() { super(403); }
}
/** Authentication/IAM metadata only. Never joins memberships or organizations.
 * No implicit preview for administrators: an explicit global COMMERCIAL grant is
 * required. Existing optional MFA stays optional until a factor is active.
 */
export async function requireCommercialSession(token: string | null | undefined) {
    if (!token)
        throw new CommercialAccessError(401);
    try {
        return await db.$transaction(async (tx) => {
            const actor = await validateSession(token, { updateLastSeen: false, client: tx });
            const grants = await tx.roleAssignment.findMany({
                where: { userId: actor.user.id, organizationId: null, role: { system: true, key: { in: ["COMMERCIAL", "PAP_ADMIN", "PAP_MANAGER"] } } },
                select: { role: { select: { key: true, permissions: { select: { permission: { select: { key: true } } } } } } },
            });
            const definition = getSystemRoleDefinition("COMMERCIAL");
            if (!definition?.permissions.includes("commercial.read") || !grants.some(g => g.role.key === "COMMERCIAL" && g.role.permissions.some(p => p.permission.key === "commercial.read")))
                throw new CommercialAccessError(403);
            const factor = await tx.mfaFactor.findFirst({
                where: { userId: actor.user.id, type: "TOTP", status: "ACTIVE" },
                orderBy: { enabledAt: "desc" }, select: { enabledAt: true },
            });
            const administrative = grants.some(g => ["PAP_ADMIN", "PAP_MANAGER"].includes(g.role.key));
            if (factor || administrative) {
                const verified = actor.session.mfaVerifiedAt;
                if (!verified || !factor?.enabledAt || verified < factor.enabledAt ||
                    verified < actor.session.createdAt || verified > new Date())
                    throw new CommercialMfaRequiredError();
            }
            return { userId: actor.user.id, displayName: actor.user.displayName };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    }
    catch (error) {
        if (error instanceof InvalidSessionError || error instanceof ExpiredSessionError ||
            error instanceof RevokedSessionError || error instanceof InactiveSessionUserError)
            throw new CommercialAccessError(401);
        throw error;
    }
}
