import { requireAdminActor } from "@/server/admin/admin-session.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { writeAdminAudit } from "@/server/audit/admin-audit-writer.service";
import { createOrganization } from "@/server/organizations/organization.service";
import {
  text,
  email,
  invalid,
  uuid,
  requirePapReviewer,
  serializable,
} from "./policy";

export async function submitPublicRequest(body: Record<string, unknown>) {
  const allowed = [
    "name",
    "city",
    "state",
    "address",
    "cnes",
    "cnpj",
    "contactName",
    "contactEmail",
    "contactPhone",
    "consent",
  ];
  if (
    Object.keys(body).some((k) => !allowed.includes(k)) ||
    body.consent !== true
  )
    invalid();
  const name = text(body.name, 200),
    city = text(body.city, 120),
    state = text(body.state, 2).toUpperCase();
  if (
    !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(
      state,
    )
  )
    invalid();
  const address = text(body.address, 500),
    contactName = text(body.contactName, 200),
    contactEmail = email(body.contactEmail);
  const contactPhone = text(body.contactPhone, 20, 10);
  if (!/^[+\d ()-]{10,20}$/.test(contactPhone)) invalid();
  const cnes = body.cnes ? text(body.cnes, 7, 7) : null,
    cnpj = body.cnpj ? text(body.cnpj, 14, 14) : null;
  if ((cnes && !/^\d{7}$/.test(cnes)) || (cnpj && !/^\d{14}$/.test(cnpj)))
    invalid();
  const normalizedName = name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const identity = cnes
    ? `cnes:${cnes}`
    : cnpj
      ? `cnpj:${cnpj}`
      : `${normalizedName}|${city.toLowerCase()}|${state}`;
  const dedupeKey = createHash("sha256")
    .update(`beta:${identity}`)
    .digest("hex");
  await serializable(async (tx) => {
    // Serialize public dedupe, without revealing whether a request/organization exists.

    const existing = await tx.organization.findFirst({
      where: {
        OR: [
          ...(cnes ? [{ cnes }] : []),
          ...(cnpj ? [{ cnpj }] : []),
          {
            name: { equals: name, mode: "insensitive" },
            city: { equals: city, mode: "insensitive" },
            state,
          },
        ],
      },
    });
    const duplicate = await tx.organizationCandidate.findFirst({
      where: {
        OR: [
          { dedupeKey },
          ...(cnes ? [{ cnes }] : []),
          ...(cnpj ? [{ cnpj }] : []),
          {
            normalizedName,
            city: { equals: city, mode: "insensitive" },
            state,
          },
        ],
      },
    });
    if (existing || duplicate) return;
    const candidate = await tx.organizationCandidate.create({
      data: {
        type: "HEALTH_UNIT",
        name,
        normalizedName,
        dedupeKey,
        city,
        state,
        address,
        cnes,
        cnpj,
        contactName,
        contactEmail,
        contactPhone,
        consentedAt: new Date(),
      },
    });
    await tx.organizationRequest.create({
      data: { candidateId: candidate.id },
    });
    await writeAdminAudit(
      {
        action: "REQUEST_SUBMITTED",
        resourceType: "ORGANIZATION_REQUEST",
        resourceId: candidate.id,
        after: { id: candidate.id, status: "NEW" },
      },
      tx,
    );
  });
  return { received: true }; // Uniform for new, duplicate, approved and rejected submissions.
}
export async function listBetaRequests(
  userId: string,
  page: number,
  status?: string,
  query?: string,
  focusId?: string,
) {
  await requirePapReviewer(userId);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    (status &&
      ![
        "NEW",
        "CHANGES_REQUESTED",
        "READY_FOR_ACTIVATION",
        "APPROVED",
        "REJECTED",
      ].includes(status))
  )
    invalid();
  const where: Prisma.OrganizationCandidateWhereInput = {
    ...(focusId ? {id:uuid(focusId)} : {}),
    consentedAt: { not: null },
    status: status as Prisma.EnumOrganizationCandidateStatusFilter["equals"],
    ...(query
      ? { name: { contains: text(query, 100, 1), mode: "insensitive" } }
      : {}),
  };
  const [rows, total] = await db.$transaction([
    db.organizationCandidate.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 20,
      skip: (page - 1) * 20,
    }),
    db.organizationCandidate.count({ where }),
  ]);
  const profile = await getEffectiveAccessProfile(userId);
  return {
    rows,
    total,
    page,
    pageSize: 20,
    canActivate:
      profile?.roles.some(
        (r) =>
          r.key === "PAP_ADMIN" &&
          r.scope === "GLOBAL" &&
          r.permissions.includes("organization.activate"),
      ) ?? false,
  };
}
export async function reviewBetaRequest(
  userId: string,
  body: Record<string, unknown>,
  actorSessionToken?: string,
) {
  await requireAdminActor(userId, actorSessionToken);
  await requirePapReviewer(userId);
  const id = uuid(body.id),
    reason = text(body.reason, 500, 5);
  if (!["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(String(body.decision)))
    invalid();
  return serializable(async (tx) => {
    await requireAdminActor(userId, actorSessionToken, tx);
    await requirePapReviewer(userId, tx);
    const claim = await tx.organizationCandidate.updateMany({
      where: { id, status: { in: ["NEW", "CHANGES_REQUESTED"] } },
      data: { updatedAt: new Date() },
    });
    void claim;
    const candidate = await tx.organizationCandidate.findUnique({
      where: { id },
    });
    if (!candidate?.consentedAt) invalid();
    if (!["NEW", "CHANGES_REQUESTED"].includes(candidate.status)) {
      if (
        candidate.status ===
          (body.decision === "APPROVE" ? "READY_FOR_ACTIVATION" : "REJECTED") &&
        (!body.municipalityId ||
          (candidate.convertedOrganizationId &&
            (
              await tx.organization.findUnique({
                where: { id: candidate.convertedOrganizationId },
              })
            )?.parentId === body.municipalityId))
      )
        return {
          organizationId: candidate.convertedOrganizationId,
          status: candidate.status,
        };
      throw new Error("BETA_TRANSITION_CONFLICT");
    }
    let organizationId: string | null = null;
    if (body.decision === "APPROVE") {
      const parent = await tx.organization.findUnique({
        where: { id: uuid(body.municipalityId) },
        include: { parent: true },
      });
      if (
        !parent ||
        parent.type !== "MUNICIPALITY" ||
        parent.status !== "ACTIVE" ||
        !parent.isActive ||
        parent.parent?.type !== "PAP" ||
        parent.parent.status !== "ACTIVE" ||
        !parent.parent.isActive ||
        parent.city?.toLocaleLowerCase("pt-BR") !==
          candidate.city?.toLocaleLowerCase("pt-BR") ||
        parent.state !== candidate.state
      )
        invalid();
      const organization = await createOrganization(
        {
          type: "HEALTH_UNIT",
          status: "PENDING_VERIFICATION",
          name: candidate.name,
          parentId: parent.id,
          cnes: candidate.cnes,
          cnpj: candidate.cnpj,
          city: candidate.city,
          state: candidate.state,
          address: candidate.address,
        },
        tx,
      );
      organizationId = organization.id;
      await writeAdminAudit(
        {
          actorUserId: userId,
          organizationId,
          action: "ORGANIZATION_CREATED",
          resourceType: "ORGANIZATION",
          resourceId: organizationId,
          after: organization,
        },
        tx,
      );
    }
    const after = await tx.organizationCandidate.update({
      where: { id },
      data: {
        status:
          body.decision === "APPROVE"
            ? "READY_FOR_ACTIVATION"
            : body.decision === "REQUEST_CHANGES"
              ? "CHANGES_REQUESTED"
              : "REJECTED",
        convertedOrganizationId: organizationId,
        reviewReason: reason,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      },
    });
    if (body.decision === "REJECT")
      await tx.organizationRequest.updateMany({
        where: { candidateId: id, status: "REQUESTED" },
        data: { status: "RESOLVED" },
      });
    await writeAdminAudit(
      {
        actorUserId: userId,
        organizationId,
        action:
          body.decision === "APPROVE"
            ? "REQUEST_FORWARDED"
            : body.decision === "REQUEST_CHANGES"
              ? "REQUEST_CHANGES"
              : "REQUEST_REJECTED",
        resourceType: "ORGANIZATION_REQUEST",
        resourceId: id,
        before: candidate,
        after,
      },
      tx,
    );
    return { organizationId, status: after.status };
  });
}
