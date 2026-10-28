import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

export async function createAccessNotification(
  tx: Prisma.TransactionClient,
  userId: string,
  invitationId: string,
  kind: "ACCESS_APPROVED" | "ACCESS_REVOKED" | "ACCESS_PENDING_DECISION",
  actorUserId = userId,
) {
  const dedupeKey = `access/${invitationId}/${kind}${kind === "ACCESS_PENDING_DECISION" ? `/${userId}` : ""}`;
  const existing = await tx.userNotification.findUnique({
    where: { dedupeKey },
  });
  if (existing) return existing;
  const result = await tx.userNotification.create({
    data: {
      userId,
      invitationId,
      kind,
      dedupeKey,
      emailStatus: kind === "ACCESS_APPROVED" ? "PENDING" : "NOT_REQUESTED",
    },
  });
  await tx.auditEvent.create({
    data: {
      actorUserId,
      action: "ACCESS_NOTIFICATION_CREATED",
      resourceType: "USER_NOTIFICATION",
      resourceId: result.id,
      after: { id: result.id, kind },
    },
  });
  return result;
}

export async function ownNotifications(userId: string) {
  const rows = await db.userNotification.findMany({
    where: { userId },
    select: { id: true, invitationId: true, kind: true, readAt: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 30,
  });
  return rows.map((row) => ({
    ...row,
    title:
      row.kind === "ACCESS_PENDING_DECISION" ? "Convite aceito aguarda sua análise" : row.kind === "ACCESS_APPROVED"
        ? "Seu acesso foi liberado"
        : "Seu perfil de acesso foi revogado",
    message:
      row.kind === "ACCESS_PENDING_DECISION" ? "Há uma identidade confirmada aguardando uma decisão autorizada. O aceite não concedeu papel nem acesso operacional." : row.kind === "ACCESS_APPROVED"
        ? "A autorização foi registrada. Entre para continuar com seu perfil e a verificação de segurança exigida."
        : "Você pode consultar sua situação e gerenciar a segurança da sua conta.",
    href: row.kind === "ACCESS_PENDING_DECISION" ? `/admin/pendencias?kind=ASSIGN&focus=${row.invitationId}#pending-${row.invitationId}` : row.kind === "ACCESS_APPROVED" ? "/login" : "/aguardando-autorizacao",
  }));
}

export async function markOwnNotificationRead(userId: string, id: string) {
  const result = await db.$transaction(async (tx) => {
    const row = await tx.userNotification.findFirst({ where: { id, userId } });
    if (!row) return false;
    if (!row.readAt) {
      const changed = await tx.userNotification.updateMany({
        where: { id, userId, readAt: null },
        data: { readAt: new Date() },
      });
      if (changed.count)
        await tx.auditEvent.create({
          data: {
            actorUserId: userId,
            action: "ACCESS_NOTIFICATION_READ",
            resourceType: "USER_NOTIFICATION",
            resourceId: id,
          },
        });
    }
    return true;
  });
  return result;
}
