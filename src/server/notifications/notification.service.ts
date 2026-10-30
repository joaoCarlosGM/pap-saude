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
    select: { id: true, invitationId: true, courseEnrollmentId:true, coursePublicationId:true, courseEnrollment:{select:{assignment:{select:{deadlineAt:true}}}}, kind: true, readAt: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 30,
  });
  return rows.map(({invitationId,courseEnrollmentId,coursePublicationId,courseEnrollment,...row}) => {
    if(row.kind.startsWith("COURSE_")){
      const revoked=row.kind==="COURSE_ASSIGNMENT_REVOKED",overdue=row.kind==="COURSE_OVERDUE",approaching=row.kind==="COURSE_DEADLINE_APPROACHING";
      const released=row.kind==="COURSE_RELEASED_TO_UNIT",completed=row.kind==="COURSE_COMPLETED";
      const deadline=courseEnrollment?.assignment.deadlineAt;
      return {...row,title:released?"Curso disponibilizado à unidade":revoked?"Atribuição de curso revogada":overdue?"Curso com prazo em atraso":approaching?"Prazo de curso se aproximando":completed?"Curso concluído":"Novo curso atribuído",message:revoked?"Sua atribuição foi revogada. O histórico permanece preservado; consulte a gestão da unidade.":released?"Uma capacitação foi liberada. A atribuição à equipe depende de decisão autorizada da sua unidade.":completed?"Sua conclusão foi registrada. Certificação não está disponível nesta versão.":deadline?`Conclua até ${new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Fortaleza"}).format(deadline)} (horário de Fortaleza). Consulte a obrigatoriedade no curso.`:"Consulte o conteúdo e a obrigatoriedade da capacitação atribuída.",href:revoked?"/cursos":courseEnrollmentId?`/aprender/${courseEnrollmentId}`:coursePublicationId?"/cursos?tab=available":"/cursos"};
    }
    return ({
    ...row,
    title:
      row.kind === "ACCESS_PENDING_DECISION" ? "Convite aceito aguarda sua análise" : row.kind === "ACCESS_APPROVED"
        ? "Seu acesso foi liberado"
        : "Seu perfil de acesso foi revogado",
    message:
      row.kind === "ACCESS_PENDING_DECISION" ? "Há uma identidade confirmada aguardando uma decisão autorizada. O aceite não concedeu papel nem acesso operacional." : row.kind === "ACCESS_APPROVED"
        ? "A autorização foi registrada. Entre para continuar com seu perfil e a verificação de segurança exigida."
        : "Você pode consultar sua situação e gerenciar a segurança da sua conta.",
    href: row.kind === "ACCESS_PENDING_DECISION" ? `/admin/pendencias?kind=ASSIGN&focus=${invitationId}#pending-${invitationId}` : row.kind === "ACCESS_APPROVED" ? "/login" : "/aguardando-autorizacao",
  });
  });
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
            action: row.kind.startsWith("COURSE_")?"COURSE_NOTIFICATION_READ":"ACCESS_NOTIFICATION_READ",
            resourceType: "USER_NOTIFICATION",
            resourceId: id,
          },
        });
    }
    return true;
  });
  return result;
}
