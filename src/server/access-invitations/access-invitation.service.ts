import { createHash, randomBytes } from "node:crypto";
import {
  AccessInvitationStatus,
  type AccessInvitation,
  type Prisma,
} from "@prisma/client";
import { db } from "@/server/db/client";
import {
  email,
  text,
  uuid,
  invalid,
  serializable,
} from "@/server/admin-beta/policy";
import { requireAdminActor } from "@/server/admin/admin-session.service";
import {
  createAdminRoleAssignmentInTransaction,
  revokeAdminRoleAssignmentInTransaction,
  requireRoleMutation,
} from "@/server/admin/admin-roles.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { createAccessNotification } from "@/server/notifications/notification.service";
import {
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from "@/server/auth/password";
import { validateSession } from "@/server/auth/session.service";
import {
  invitationBaseUrl,
  sendPlatformEmail,
  requireTransactionalMail,
} from "@/server/email/email.service";
import { transactionalTemplate } from "@/server/email/templates";
import { writeAdminAudit } from "@/server/audit/admin-audit-writer.service";
import { AccessInvitationError } from "./access-invitation.errors";
import {
  invitationActor,
  invitationAuthority,
  proposal,
} from "./access-invitation-policy";

export type InvitationActor = { userId: string; sessionToken: string };
const ttl = 48 * 60 * 60 * 1000;
const publicFields = {
  id: true,
  email: true,
  displayName: true,
  proposedRoleKey: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  decidedAt: true,
  decisionReason: true,
  deliveryStatus: true,
  createdAt: true,
} as const;
export function hashAccessToken(token: string) {
  return createHash("sha256")
    .update("pap-saude:global-access:v1\0")
    .update(token)
    .digest("hex");
}
function secret(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{43}$/.test(value))
    throw new AccessInvitationError("INVITATION_UNAVAILABLE", 400);
  return value;
}
function unavailable(): never {
  throw new AccessInvitationError("INVITATION_UNAVAILABLE", 400);
}
function conflict(): never {
  throw new AccessInvitationError("INVITATION_STATE_CONFLICT");
}
function ownable(
  invitation: AccessInvitation | null,
  actor: InvitationActor,
  full: boolean,
) {
  if (!invitation || (!full && invitation.invitedByUserId !== actor.userId))
    throw new AccessInvitationError("INVITATION_NOT_FOUND", 404);
  return invitation;
}
function visible(row: Pick<AccessInvitation, keyof typeof publicFields>) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    proposedRoleKey: row.proposedRoleKey,
    status:
      row.status === "PENDING_ACCEPTANCE" && row.expiresAt <= new Date()
        ? "EXPIRED"
        : row.status,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    decidedAt: row.decidedAt,
    decisionReason: row.decisionReason,
    deliveryStatus: row.deliveryStatus,
    createdAt: row.createdAt,
  };
}
async function audit(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  action: string,
  row: AccessInvitation,
) {
  await writeAdminAudit(
    {
      actorUserId,
      action,
      resourceType: "INVITATION",
      resourceId: row.id,
      after: {
        id: row.id,
        status: row.status,
        roleKey: row.proposedRoleKey,
        userId: row.userId,
        expiresAt: row.expiresAt.toISOString(),
      },
    },
    tx,
  );
}
async function eligibleIdentity(
  tx: Prisma.TransactionClient,
  address: string,
  actorId: string,
) {
  const user = await tx.user.findUnique({
    where: { email: address },
    select: { id: true, isActive: true },
  });
  if (
    user &&
    (!user.isActive ||
      user.id === actorId ||
      (await tx.roleAssignment.count({ where: { userId: user.id } })))
  )
    throw new AccessInvitationError("INVITATION_TARGET_UNAVAILABLE");
  return user;
}
async function deliverInvitation(row: AccessInvitation, token: string) {
  const url = new URL("/aceitar-convite", invitationBaseUrl());
  url.hash = `token=${encodeURIComponent(token)}`;
  try {
    const delivery = await sendPlatformEmail({
      to: row.email,
      ...transactionalTemplate({ kind: "INVITATION", displayName: row.displayName,
        roleKey: row.proposedRoleKey, expiresAt: row.expiresAt, url: url.toString() }),
      messageId: `access/${row.id}/${row.tokenVersion}`,
      eventTime: new Date(row.expiresAt.getTime() - ttl).toISOString(),
      reference: { kind: "ACCESS_INVITATION", id: row.id, version: row.tokenVersion },
    });
    await db.accessInvitation.updateMany({
      where: {
        id: row.id,
        tokenVersion: row.tokenVersion,
        status: "PENDING_ACCEPTANCE",
        deliveryStatus: "PENDING",
      },
      data: { deliveryStatus: delivery.status },
    });
    await writeAdminAudit({
      actorUserId: row.invitedByUserId,
      action: "ACCESS_INVITATION_DELIVERY",
      resourceType: "INVITATION",
      resourceId: row.id,
      reason: delivery.status,
    });
    return delivery.status;
  } catch {
    await serializable(async (tx) => {
      const result = await tx.accessInvitation.updateMany({
        where: {
          id: row.id,
          tokenVersion: row.tokenVersion,
          status: "PENDING_ACCEPTANCE",
        },
        data: {
          status: "REVOKED",
          activeSlot: null,
          tokenHash: null,
          revokedAt: new Date(),
          deliveryStatus: "FAILED",
        },
      });
      if (result.count)
        await audit(tx, row.invitedByUserId, "ACCESS_INVITATION_REVOKED", {
          ...row,
          status: "REVOKED",
        });
    });
    throw new AccessInvitationError("EMAIL_DELIVERY_FAILED", 503);
  }
}

export async function listAccessInvitations(
  actor: InvitationActor,
  page = 1,
  status?: string,
) {
  if (!Number.isInteger(page) || page < 1 || page > 10000) invalid();
  if (
    status &&
    !Object.values(AccessInvitationStatus).includes(
      status as AccessInvitationStatus,
    )
  )
    invalid();
  return serializable(async (tx) => {
    const { full } = await invitationActor(
      actor.userId,
      actor.sessionToken,
      tx,
    );
    const filter: Prisma.AccessInvitationWhereInput =
      status === "EXPIRED"
        ? {
            OR: [
              { status: "EXPIRED" },
              { status: "PENDING_ACCEPTANCE", expiresAt: { lte: new Date() } },
            ],
          }
        : status
          ? {
              status: status as AccessInvitationStatus,
              ...(status === "PENDING_ACCEPTANCE"
                ? { expiresAt: { gt: new Date() } }
                : {}),
            }
          : {};
    const where = {
      AND: [full ? {} : { invitedByUserId: actor.userId }, filter],
    };
    const rows = await tx.accessInvitation.findMany({
      where,
      select: {
        ...publicFields,
        notifications: {
          where: { kind: "ACCESS_APPROVED" },
          select: { emailStatus: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      skip: (page - 1) * 20,
    });
    const total = await tx.accessInvitation.count({ where });
    return {
      rows: rows.map((row) => ({
        ...visible(row),
        releaseEmailStatus: row.notifications[0]?.emailStatus ?? null,
      })),
      total,
      page,
      pageSize: 20,
      full,
    };
  });
}

export async function createAccessInvitation(
  actor: InvitationActor,
  input: { email: unknown; displayName: unknown; proposedRoleKey: unknown },
) {
  await invitationActor(actor.userId, actor.sessionToken);
  requireTransactionalMail();
  const address = email(input.email),
    displayName = text(input.displayName, 200);
  const token = randomBytes(32).toString("base64url");
  const row = await serializable(async (tx) => {
    const { full } = await invitationActor(
      actor.userId,
      actor.sessionToken,
      tx,
    );
    const proposedRoleKey = proposal(input.proposedRoleKey, full);
    await eligibleIdentity(tx, address, actor.userId);
    const current = await tx.accessInvitation.findUnique({
      where: { email_activeSlot: { email: address, activeSlot: 1 } },
    });
    if (current) {
      if (
        current.status !== "PENDING_ACCEPTANCE" ||
        current.expiresAt > new Date()
      )
        throw new AccessInvitationError("INVITATION_ALREADY_EXISTS");
      const expired = await tx.accessInvitation.update({
        where: { id: current.id },
        data: { status: "EXPIRED", activeSlot: null, tokenHash: null },
      });
      await audit(tx, actor.userId, "ACCESS_INVITATION_EXPIRED", expired);
    }
    const created = await tx.accessInvitation.create({
      data: {
        email: address,
        displayName,
        proposedRoleKey,
        invitedByUserId: actor.userId,
        tokenHash: hashAccessToken(token),
        expiresAt: new Date(Date.now() + ttl),
      },
    });
    await audit(tx, actor.userId, "ACCESS_INVITATION_CREATED", created);
    return created;
  });
  const deliveryStatus = await deliverInvitation(row, token);
  return { invitation: visible({ ...row, deliveryStatus }) };
}

export async function resendAccessInvitation(
  actor: InvitationActor,
  id: string,
) {
  await invitationActor(actor.userId, actor.sessionToken);
  requireTransactionalMail();
  uuid(id);
  const token = randomBytes(32).toString("base64url");
  const row = await serializable(async (tx) => {
    const { full } = await invitationActor(
      actor.userId,
      actor.sessionToken,
      tx,
    );
    const current = ownable(
      await tx.accessInvitation.findUnique({ where: { id } }),
      actor,
      full,
    );
    if (
      !["PENDING_ACCEPTANCE", "EXPIRED", "REVOKED"].includes(current.status) ||
      current.acceptedAt
    )
      conflict();
    proposal(current.proposedRoleKey, full);
    await eligibleIdentity(tx, current.email, actor.userId);
    const other = await tx.accessInvitation.findFirst({
      where: { email: current.email, activeSlot: 1, id: { not: id } },
    });
    if (other) conflict();
    const updated = await tx.accessInvitation.update({
      where: { id },
      data: {
        status: "PENDING_ACCEPTANCE",
        activeSlot: 1,
        tokenHash: hashAccessToken(token),
        tokenVersion: { increment: 1 },
        invitedByUserId: actor.userId,
        expiresAt: new Date(Date.now() + ttl),
        revokedAt: null,
        deliveryStatus: "PENDING",
      },
    });
    await audit(tx, actor.userId, "ACCESS_INVITATION_RESENT", updated);
    return updated;
  });
  const deliveryStatus = await deliverInvitation(row, token);
  return { invitation: visible({ ...row, deliveryStatus }) };
}

async function pendingToken(token: string, tx: Prisma.TransactionClient = db) {
  const row = await tx.accessInvitation.findUnique({
    where: { tokenHash: hashAccessToken(secret(token)) },
  });
  if (
    !row ||
    row.status !== "PENDING_ACCEPTANCE" ||
    row.expiresAt <= new Date()
  )
    unavailable();
  const authority = await invitationAuthority(row.invitedByUserId, tx).catch(
    () => unavailable(),
  );
  proposal(row.proposedRoleKey, authority.full);
  await eligibleIdentity(tx, row.email, row.invitedByUserId);
  return row;
}

export async function inspectAccessInvitation(token: string) {
  const row = await pendingToken(token);
  const user = await db.user.findUnique({
    where: { email: row.email },
    select: { passwordCredential: { select: { id: true } } },
  });
  return {
    email: row.email,
    displayName: row.displayName,
    expiresAt: row.expiresAt,
    requiresPassword: !user?.passwordCredential,
  };
}

/** Bearer consent creates/confirms identity only. Never mint a session or grant IAM here. */
export async function acceptAccessInvitation(input: {
  token: string;
  password: string;
  sessionToken?: string;
}) {
  const token = secret(input.token);
  if (
    typeof input.password !== "string" ||
    !input.password ||
    input.password.length > 256
  )
    invalid();
  const row = await pendingToken(token);
  const existing = await db.user.findUnique({
    where: { email: row.email },
    include: { passwordCredential: true },
  });
  const oldHash = existing?.passwordCredential?.passwordHash;
  if (oldHash && !(await verifyPassword(oldHash, input.password)))
    throw new AccessInvitationError("IDENTITY_CONFIRMATION_REQUIRED", 403);
  if (!oldHash) validatePasswordPolicy(input.password);
  const passwordHash = oldHash ? null : await hashPassword(input.password);
  await serializable(async (tx) => {
    const current = await pendingToken(token, tx);
    let user = await tx.user.findUnique({
      where: { email: current.email },
      include: { passwordCredential: true },
    });
    if ((user?.passwordCredential?.passwordHash ?? null) !== (oldHash ?? null))
      conflict();
    if (input.sessionToken) {
      const session = await validateSession(input.sessionToken, {
        updateLastSeen: false,
        client: tx,
      });
      if (session.user.email !== current.email)
        throw new AccessInvitationError("IDENTITY_CONFIRMATION_REQUIRED", 403);
    }
    if (
      user &&
      (await tx.mfaFactor.count({
        where: { userId: user.id, type: "TOTP", status: "ACTIVE" },
      }))
    )
      await requireAdminActor(user.id, input.sessionToken, tx);
    if (!user)
      user = await tx.user.create({
        data: { email: current.email, displayName: current.displayName },
        include: { passwordCredential: true },
      });
    if (!user.isActive) unavailable();
    if (passwordHash)
      await tx.passwordCredential.create({
        data: {
          userId: user.id,
          passwordHash,
          algorithm: "ARGON2ID",
          mustChange: false,
          changedAt: new Date(),
        },
      });
    const accepted = await tx.accessInvitation.update({
      where: { id: current.id },
      data: {
        status: "PENDING_ASSIGNMENT",
        tokenHash: null,
        userId: user.id,
        acceptedAt: new Date(),
      },
    });
    await audit(tx, user.id, "ACCESS_INVITATION_ACCEPTED", accepted);
  });
  return { accepted: true, next: "/login" };
}

export async function approveAccessInvitation(
  actor: InvitationActor,
  id: string,
  input: { roleKey: unknown; organizationId?: unknown; reason: unknown },
) {
  uuid(id);
  const reason = text(input.reason, 400, 3);
  const notificationId = await serializable(async (tx) => {
    const { full } = await invitationActor(
      actor.userId,
      actor.sessionToken,
      tx,
    );
    const row = ownable(
      await tx.accessInvitation.findUnique({ where: { id } }),
      actor,
      full,
    );
    const roleKey = proposal(input.roleKey, full);
    if (
      !full &&
      (roleKey !== "COMMERCIAL" || row.proposedRoleKey !== "COMMERCIAL")
    )
      throw new AccessInvitationError("ROLE_NOT_DELEGATED", 403);
    // Approval confirms the exact role the recipient accepted. Changing the
    // proposal requires a new invitation and explicit consent, even for Admin.
    if (roleKey !== row.proposedRoleKey)
      throw new AccessInvitationError("INVITATION_ROLE_MISMATCH", 409);
    const organizationId =
      input.organizationId == null ? null : uuid(input.organizationId);
    if (!row.userId || !row.acceptedAt || row.userId === actor.userId)
      conflict();
    // Revoked/demoted inviters cannot leave an outstanding authorization path.
    const inviter = await invitationAuthority(row.invitedByUserId, tx);
    proposal(row.proposedRoleKey, inviter.full);
    await requireRoleMutation(
      actor.userId,
      actor.sessionToken,
      row.userId,
      roleKey,
      organizationId,
      tx,
    );
    if (row.status === "ACTIVE") {
      const assignment =
        row.assignmentId &&
        (await tx.roleAssignment.findUnique({
          where: { id: row.assignmentId },
          include: { role: true },
        }));
      if (
        !assignment ||
        assignment.role.key !== roleKey ||
        assignment.organizationId !== organizationId
      )
        conflict();
      return (
        await createAccessNotification(
          tx,
          row.userId,
          row.id,
          "ACCESS_APPROVED",
          actor.userId,
        )
      ).id;
    }
    if (row.status !== "PENDING_ASSIGNMENT") conflict();
    await eligibleIdentity(tx, row.email, actor.userId);
    // No implicit membership or organization activation. Scoped roles require an
    // already legitimate ACTIVE membership; the shared B helper enforces it.
    const updated = await tx.accessInvitation.update({
      where: { id },
      data: {
        status: "ACTIVE",
        decidedAt: new Date(),
        reviewedByUserId: actor.userId,
        decisionReason: reason,
      },
    });
    const assignment = await createAdminRoleAssignmentInTransaction(
      {
        actorUserId: actor.userId,
        actorSessionToken: actor.sessionToken,
        targetUserId: row.userId,
        roleKey,
        organizationId,
      },
      tx,
    );
    await tx.accessInvitation.update({
      where: { id },
      data: { assignmentId: assignment.id },
    });
    const notice = await createAccessNotification(
      tx,
      row.userId,
      row.id,
      "ACCESS_APPROVED",
      actor.userId,
    );
    await audit(tx, actor.userId, "ACCESS_INVITATION_APPROVED", updated);
    return notice.id;
  });
  await dispatchAccessRelease(notificationId);
  return { authorized: true };
}

export async function closeAccessInvitation(
  actor: InvitationActor,
  id: string,
  operation: "REJECT" | "REVOKE",
  reasonValue: unknown,
) {
  uuid(id);
  const reason = text(reasonValue, 400, 3);
  const result = await serializable(async (tx) => {
    const { full } = await invitationActor(
      actor.userId,
      actor.sessionToken,
      tx,
    );
    const row = ownable(
      await tx.accessInvitation.findUnique({ where: { id } }),
      actor,
      full,
    );
    if (row.status === "REVOKED" && operation === "REVOKE")
      return { revoked: true };
    if (row.status === "REJECTED" && operation === "REJECT")
      return { rejected: true };
    if (
      !["PENDING_ACCEPTANCE", "PENDING_ASSIGNMENT", "ACTIVE"].includes(
        row.status,
      )
    )
      conflict();
    if (
      !full &&
      row.proposedRoleKey !== "COMMERCIAL" &&
      (row.status === "ACTIVE" || operation === "REJECT")
    )
      throw new AccessInvitationError("ROLE_NOT_DELEGATED", 403);
    if (operation === "REJECT" && row.status !== "PENDING_ASSIGNMENT")
      conflict();
    if (row.status === "ACTIVE") {
      if (operation !== "REVOKE" || !row.assignmentId) conflict();
      await revokeAdminRoleAssignmentInTransaction(
        {
          actorUserId: actor.userId,
          actorSessionToken: actor.sessionToken,
          assignmentId: row.assignmentId,
        },
        tx,
      );
    }
    const updated = await tx.accessInvitation.update({
      where: { id },
      data: {
        status: operation === "REJECT" ? "REJECTED" : "REVOKED",
        activeSlot: null,
        tokenHash: null,
        revokedAt: operation === "REVOKE" ? new Date() : null,
        decidedAt: new Date(),
        reviewedByUserId: actor.userId,
        decisionReason: reason,
      },
    });
    if (row.status !== "ACTIVE")
      await audit(
        tx,
        actor.userId,
        operation === "REJECT"
          ? "ACCESS_INVITATION_REJECTED"
          : "ACCESS_INVITATION_REVOKED",
        updated,
      );
    return operation === "REJECT" ? { rejected: true } : { revoked: true };
  });
  // Only an accepted identity receives a decision notice. Never disclose private
  // reasons, reviewer identity or tenant details. Explicit replay safely retries.
  const row = await db.accessInvitation.findUnique({ where: { id } });
  if (row?.userId && row.acceptedAt && ["REJECTED", "REVOKED"].includes(row.status)) {
    try {
      requireTransactionalMail();
      await sendPlatformEmail({ to: row.email,
        ...transactionalTemplate({ kind: "ACCESS_CLOSED", rejected: row.status === "REJECTED",
          url: new URL("/aguardando-autorizacao", invitationBaseUrl()).toString() }),
        messageId: `access-closed/${row.id}/${row.status}`,
        eventTime: (row.decidedAt || row.revokedAt || row.createdAt).toISOString(),
      });
    } catch {
      await writeAdminAudit({ actorUserId: actor.userId,
        action: "ACCESS_INVITATION_DECISION_EMAIL_FAILED", resourceType: "INVITATION",
        resourceId: row.id, reason: "MAIL_UNAVAILABLE" });
    }
  }
  return result;
}

/** In-app is transactional. Mail is a deduplicated, retryable provider side effect. */
export async function dispatchAccessRelease(notificationId: string) {
  const notice = await db.userNotification.findUnique({
    where: { id: notificationId },
    include: { user: true, invitation: true },
  });
  if (
    !notice ||
    notice.kind !== "ACCESS_APPROVED" ||
    ["CAPTURED", "ACCEPTED_BY_PROVIDER", "DELIVERED", "BOUNCED", "COMPLAINED", "NOT_REQUESTED"].includes(notice.emailStatus)
  )
    return;
  if (notice.invitation.status !== "ACTIVE" || !notice.invitation.assignmentId)
    return;
  try {
    const url = new URL("/login", invitationBaseUrl()).toString();
    const delivery = await sendPlatformEmail({
      to: notice.user.email,
      ...transactionalTemplate({ kind: "ACCESS_APPROVED", displayName: notice.user.displayName,
        roleKey: notice.invitation.proposedRoleKey, url }),
      messageId: notice.dedupeKey,
      eventTime: notice.createdAt.toISOString(),
      reference: { kind: "ACCESS_NOTIFICATION", id: notice.id },
    });
    await db.userNotification.updateMany({
      where: { id: notice.id, emailStatus: { in: ["PENDING", "FAILED"] } },
      data: { emailStatus: delivery.status },
    });
  } catch {
    await db.userNotification.updateMany({
      where: { id: notice.id, emailStatus: { in: ["PENDING", "FAILED"] } },
      data: { emailStatus: "FAILED" },
    });
  }
}

export async function retryAccessRelease(actor: InvitationActor, id: string) {
  uuid(id);
  const notice = await serializable(async (tx) => {
    const { full } = await invitationActor(
      actor.userId,
      actor.sessionToken,
      tx,
    );
    const row = ownable(
      await tx.accessInvitation.findUnique({ where: { id } }),
      actor,
      full,
    );
    if (
      !row.userId ||
      !row.assignmentId ||
      row.status !== "ACTIVE" ||
      (!full && row.proposedRoleKey !== "COMMERCIAL")
    )
      conflict();
    const assignment = await tx.roleAssignment.findUnique({
      where: { id: row.assignmentId },
      include: { role: true },
    });
    if (!assignment) conflict();
    await requireRoleMutation(
      actor.userId,
      actor.sessionToken,
      row.userId,
      assignment.role.key,
      assignment.organizationId,
      tx,
    );
    return tx.userNotification.findUnique({
      where: { dedupeKey: `access/${row.id}/ACCESS_APPROVED` },
    });
  });
  if (!notice) conflict();
  await dispatchAccessRelease(notice.id);
  return { notificationId: notice.id };
}

export async function ownAccessStatus(userId: string) {
  return serializable(async (tx) => {
    const row = await tx.accessInvitation.findFirst({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        status: true,
        proposedRoleKey: true,
        acceptedAt: true,
        decidedAt: true,
        assignment: {
          select: {
            userId: true,
            role: { select: { key: true, system: true } },
          },
        },
      },
    });
    const profile = await getEffectiveAccessProfile(userId, tx);
    if (!row || !profile) return null;
    const assigned =
      row.assignment &&
      row.assignment.userId === userId &&
      row.assignment.role.system &&
      row.assignment.role.key === row.proposedRoleKey;
    const status =
      row.status === "ACTIVE" && !assigned ? "REVOKED" : row.status;
    // Deliberately omit email of inviter, reviewer, decision reason, tenant IDs,
    // role assignments, delivery/provider details and any internal audit data.
    return {
      user: {
        displayName: profile.user.displayName,
        email: profile.user.email,
      },
      status,
      acceptedAt: row.acceptedAt,
      decidedAt: row.decidedAt,
      canContinue: !!(
        profile.canAccessAdmin ||
        profile.permissions.includes("patient.read") ||
        profile.permissions.includes("commercial.read")
      ),
    };
  });
}
