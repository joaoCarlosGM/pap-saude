import { prepareOrganizationActivationNotices, dispatchOrganizationActivationNotices } from "@/server/email/organization-activation-email.service";
import { requireAdminActor } from "./admin-session.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import {
  requireReauthentication,
  AccountSecurityError,
} from "@/server/auth/account-security.service";
import { serializable } from "@/server/admin-beta/policy";
import {
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client"

import {
  db,
} from "@/server/db/client"
import { writeAdminAudit } from "@/server/audit/admin-audit-writer.service"
import { projectAdminSnapshot } from "@/server/audit/admin-audit-policy"

import {
  PERMISSIONS,
} from "@/server/iam/permissions"

import {
  createOrganization,
  activateOrganization,
  archiveOrganization,
  suspendOrganization,
  updateOrganizationDetails,
} from "@/server/organizations/organization.service"

import {
  AccessDeniedError,
} from "@/server/iam/authorization.errors"

import {
  listAccessibleOrganizationIds,
  requireAdminOrganizationAccess,
} from "./admin-access.service"

export async function listAdminOrganizations(
  userId: string,
) {
  const profile = await getEffectiveAccessProfile(userId)
  if (!profile) throw new AccessDeniedError()
  const access =
    await listAccessibleOrganizationIds(
      userId,
      PERMISSIONS.ORGANIZATION_READ,
      profile,
    )

  if (
    !access.global &&
    access.organizationIds.length ===
      0
  ) {
    throw new AccessDeniedError()
  }

  // Scope and projection must use the same profile: revocation between reads
  // must never turn a global delegated directory into a private-field response.
  // Global directory access delegates institutional metadata, never private configuration.
  const delegatedDirectory = profile.roles.some(r => r.key === "PAP_MANAGER") &&
    !profile.roles.some(r => r.key === "PAP_ADMIN" && r.scope === "GLOBAL")
  const canSeeClinicalCounts = profile?.permissions.includes(PERMISSIONS.ORGANIZATION_ANALYTICS_READ) ?? false
  return db.organization.findMany({
    where:
      access.global
        ? undefined
        : {
            id: {
              in:
                access.organizationIds,
            },
          },

    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      isActive: true,
      parentId: true,
      city: true,
      state: true,
      code: !delegatedDirectory,
      cnes: !delegatedDirectory,
      cnpj: !delegatedDirectory,
      address: !delegatedDirectory,
      createdAt: !delegatedDirectory,
      updatedAt: !delegatedDirectory,
      // settings is deliberately absent for every role: this is a directory DTO.
      parent: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },

      _count: {
        select: {
          children: true,
          memberships: !delegatedDirectory,
          patientLinks: !delegatedDirectory && canSeeClinicalCounts,
          encounters: !delegatedDirectory && canSeeClinicalCounts,
        },
      },
    },

    orderBy: [
      {
        type:
          "asc",
      },
      {
        name:
          "asc",
      },
    ],
  })
}

export async function createAdminOrganization(
  userId: string,
  input: {
    type: OrganizationType
    name: string
    parentId: string
    code?: string | null
    cnes?: string | null
    cnpj?: string | null
    city?: string | null
    state?: string | null
    address?: string | null
  },
  actorSessionToken?: string,
) {
  await requireAdminActor(userId, actorSessionToken)
  if (
    input.type !==
      OrganizationType.MUNICIPALITY &&
    input.type !==
      OrganizationType.HEALTH_UNIT
  ) {
    throw new AccessDeniedError()
  }

  await requireAdminOrganizationAccess(
    userId,
    PERMISSIONS.ORGANIZATION_MANAGE,
    input.parentId,
  )

  return serializable(async tx => {
    await requireAdminActor(userId, actorSessionToken, tx)
    await requireAdminOrganizationAccess(userId, PERMISSIONS.ORGANIZATION_MANAGE, input.parentId, tx)
    const organization = await createOrganization({
    type:
      input.type,

    name:
      input.name,

    parentId:
      input.parentId,

    code:
      input.code,

    cnes:
      input.cnes,

    cnpj:
      input.cnpj,

    city:
      input.city,

    state:
      input.state,

    address:
      input.address,

    status:
      OrganizationStatus.PENDING_VERIFICATION,
    }, tx)
    await writeAdminAudit({
      actorUserId: userId,
      organizationId: organization.id,
      action: "ORGANIZATION_CREATED",
      resourceType: "ORGANIZATION",
      resourceId: organization.id,
      after: organization,
    }, tx);
    return organization;
  });
}

export async function mutateAdminOrganization(
  userId: string,
  organizationId: string,
  input:
    | {
        operation: "ACTIVATE";
      }
    | {
        operation: "SUSPEND";
      }
    | {
        operation: "ARCHIVE";
        confirmationName?: string;
        password?: string;
        code?: string;
      }
    | {
        operation: "UPDATE";
        name?: string;
        code?: string | null;
        cnes?: string | null;
        cnpj?: string | null;
        city?: string | null;
        state?: string | null;
        address?: string | null;
      },
  actorSessionToken?: string,
) {
  await requireAdminActor(userId, actorSessionToken);
  await requireAdminOrganizationAccess(
    userId,
    PERMISSIONS.ORGANIZATION_MANAGE,
    organizationId,
  );

  if (input.operation !== "UPDATE") {
    const profile = await getEffectiveAccessProfile(userId);
    const target = await db.organization.findUnique({
      where: { id: organizationId },
    });
    const permission =
      input.operation === "ACTIVATE"
        ? PERMISSIONS.ORGANIZATION_ACTIVATE
        : input.operation === "SUSPEND"
          ? PERMISSIONS.ORGANIZATION_DEACTIVATE
          : PERMISSIONS.ORGANIZATION_DELETE;
    if (
      target?.type === "HEALTH_UNIT" &&
      !profile?.roles.some(
        (r) =>
          r.key === "PAP_ADMIN" &&
          r.scope === "GLOBAL" &&
          r.permissions.includes(permission),
      )
    )
      throw new AccessDeniedError();
    if (input.operation === "ARCHIVE") {
      if (
        !target ||
        input.confirmationName !== target.name ||
        typeof input.password !== "string" ||
        typeof input.code !== "string"
      )
        throw new AccountSecurityError("STRONG_CONFIRMATION_REQUIRED");
      await requireReauthentication(userId, input.password, input.code);
    }
  }
  const result = await serializable(async (tx) => {
    await requireAdminActor(userId, actorSessionToken, tx);
    const { profile, organization } = await requireAdminOrganizationAccess(
      userId,
      PERMISSIONS.ORGANIZATION_MANAGE,
      organizationId,
      tx,
    );
    if (input.operation !== "UPDATE") {
      const permission =
        input.operation === "ACTIVATE"
          ? PERMISSIONS.ORGANIZATION_ACTIVATE
          : input.operation === "SUSPEND"
            ? PERMISSIONS.ORGANIZATION_DEACTIVATE
            : PERMISSIONS.ORGANIZATION_DELETE;
      if (
        organization.type === "HEALTH_UNIT" &&
        !profile.roles.some(
          (r) =>
            r.key === "PAP_ADMIN" &&
            r.scope === "GLOBAL" &&
            r.permissions.includes(permission),
        )
      )
        throw new AccessDeniedError();
      if (
        input.operation === "ARCHIVE" &&
        input.confirmationName !== organization.name
      )
        throw new AccountSecurityError("STRONG_CONFIRMATION_REQUIRED");
    }
    const before = await tx.organization.findUnique({
      where: { id: organizationId },
    });
    if (!before) throw new AccessDeniedError();
    let after;
    switch (input.operation) {
      case "ACTIVATE": {
        const candidate = await tx.organizationCandidate.findFirst({
          where: {
            convertedOrganizationId: organizationId,
            consentedAt: { not: null },
          },
        });
        if (
          candidate &&
          !["READY_FOR_ACTIVATION", "APPROVED"].includes(candidate.status)
        )
          throw new AccessDeniedError();
        after = await activateOrganization(organizationId, tx);
        if (candidate?.status === "READY_FOR_ACTIVATION") {
          const activated = await tx.organizationCandidate.update({
            where: { id: candidate.id },
            data: { status: "APPROVED" },
          });
          await tx.organizationRequest.updateMany({
            where: { candidateId: candidate.id, status: "REQUESTED" },
            data: { status: "RESOLVED" },
          });
          await writeAdminAudit(
            {
              actorUserId: userId,
              organizationId,
              action: "REQUEST_ACTIVATED",
              resourceType: "ORGANIZATION_REQUEST",
              resourceId: candidate.id,
              before: candidate,
              after: activated,
            },
            tx,
          );
        }
        break;
      }
      case "SUSPEND":
        after = await suspendOrganization(organizationId, tx);
        break;
      case "ARCHIVE":
        after = await archiveOrganization(organizationId, tx);
        break;
      case "UPDATE":
        after = await updateOrganizationDetails(
          organizationId,
          {
            name: input.name,
            code: input.code,
            cnes: input.cnes,
            cnpj: input.cnpj,
            city: input.city,
            state: input.state,
            address: input.address,
          },
          tx,
        );
        break;
    }
    if (
      JSON.stringify(projectAdminSnapshot("ORGANIZATION", before)) !==
      JSON.stringify(projectAdminSnapshot("ORGANIZATION", after))
    ) {
      await writeAdminAudit(
        {
          actorUserId: userId,
          organizationId,
          action:
            input.operation === "UPDATE"
              ? "ORGANIZATION_UPDATED"
              : input.operation === "ACTIVATE"
                ? "ORGANIZATION_ACTIVATED"
                : input.operation === "SUSPEND"
                  ? "ORGANIZATION_SUSPENDED"
                  : "ORGANIZATION_ARCHIVED",
          resourceType: "ORGANIZATION",
          resourceId: organizationId,
          before,
          after,
        },
        tx,
      );
    }
    if (input.operation === "ACTIVATE" && after.type === "HEALTH_UNIT" &&
        (before.status !== "ACTIVE" || !before.isActive))
      await prepareOrganizationActivationNotices(tx, after);
    return after;
  });
  if (input.operation === "ACTIVATE") await dispatchOrganizationActivationNotices(organizationId);
  return result;
}
