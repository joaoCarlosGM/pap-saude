import { requireAdminActor } from "@/server/admin/admin-session.service";
import { db } from "@/server/db/client";
import { requireInstitutionalInvitationAccess, requireInstitutionalInvitationTarget } from "@/server/admin/institutional-invitation-policy";
import { writeAdminAudit } from "@/server/audit/admin-audit-writer.service";
import {
  createHealthUnitAdminInvitation,
  createProfessionalInvitation,
} from "@/server/invitations/invitation.service";
import { invalid, uuid, serializable } from "./policy";
export async function listBetaInvitations(
  userId: string,
  organizationId: string,
  page = 1,
) {
  uuid(organizationId);
  if (!Number.isInteger(page) || page < 1 || page > 10000) invalid();
  await requireInstitutionalInvitationAccess(userId, organizationId);
  const where = { organizationId };
  const [rows, total] = await db.$transaction([
    db.userInvitation.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        roleKey: true,
        status: true,
        expiresAt: true,
        deliveryStatus: true,
        deliveryAttemptedAt: true,
        createdAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 20,
      skip: (page - 1) * 20,
    }),
    db.userInvitation.count({ where }),
  ]);
  return { rows, total, page, pageSize: 20 };
}
export async function mutateBetaInvitation(
  userId: string,
  body: Record<string, unknown>,
  actorSessionToken?: string,
) {
  await requireAdminActor(userId, actorSessionToken);
  const organizationId = uuid(body.organizationId);
  await requireInstitutionalInvitationAccess(userId, organizationId);
  if (body.operation === "BOOTSTRAP") {
    const candidate = await db.organizationCandidate.findFirst({
      where: { convertedOrganizationId: organizationId, status: "APPROVED" },
    });
    if (!candidate?.contactEmail || !candidate.contactName) invalid();
    return createHealthUnitAdminInvitation({
      invitedByUserId: userId,
      actorSessionToken,
      organizationId,
      email: candidate.contactEmail,
      displayName: candidate.contactName,
    });
  }
  if (body.operation === "RESEND" || body.operation === "REVOKE") {
    const invitation = await db.userInvitation.findFirst({
      where: { id: uuid(body.id), organizationId },
    });
    if (!invitation || invitation.status === "ACCEPTED") invalid();
    await requireInstitutionalInvitationTarget(userId, invitation.email);
    if (body.operation === "RESEND") {
      const create =
        invitation.roleKey === "HEALTH_UNIT_ADMIN"
          ? createHealthUnitAdminInvitation
          : invitation.roleKey === "PROFESSIONAL"
            ? createProfessionalInvitation
            : null;
      if (!create) invalid();
      return create({
        invitedByUserId: userId,
        actorSessionToken,
        organizationId,
        email: invitation.email,
        displayName: invitation.displayName,
      });
    }
    return serializable(async (tx) => {
      await requireAdminActor(userId, actorSessionToken, tx);
      await requireInstitutionalInvitationAccess(userId, organizationId, tx);
      const current = await tx.userInvitation.findFirst({
        where: { id: invitation.id, organizationId },
      });
      if (!current || current.status === "ACCEPTED") invalid();
      await requireInstitutionalInvitationTarget(userId, current.email, tx);
      await tx.organization.update({
        where: { id: organizationId },
        data: { updatedAt: new Date() },
      });
      const revoked = await tx.userInvitation.updateMany({
        where: { id: invitation.id, status: "PENDING" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      if (revoked.count)
        await writeAdminAudit(
          {
            actorUserId: userId,
            organizationId,
            action: "INVITATION_REVOKED",
            resourceType: "INVITATION",
            resourceId: invitation.id,
            after: { id: invitation.id, status: "REVOKED" },
          },
          tx,
        );
      return { revoked: true };
    });
  }
  if (
    body.operation !== "INVITE" ||
    (body.roleKey && body.roleKey !== "PROFESSIONAL") ||
    typeof body.email !== "string" ||
    typeof body.displayName !== "string"
  )
    invalid();
  return createProfessionalInvitation({
    invitedByUserId: userId,
    actorSessionToken,
    organizationId,
    email: body.email,
    displayName: body.displayName,
  });
}
