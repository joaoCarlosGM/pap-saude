import {
  OrganizationStatus,
  OrganizationType,
  Prisma,
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
  const access =
    await listAccessibleOrganizationIds(
      userId,
      PERMISSIONS.ORGANIZATION_READ,
    )

  if (
    !access.global &&
    access.organizationIds.length ===
      0
  ) {
    return []
  }

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

    include: {
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
          memberships: true,
          patientLinks: true,
          encounters: true,
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
) {
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

  return db.$transaction(async tx => {
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
        operation:
          "ACTIVATE"
      }
    | {
        operation:
          "SUSPEND"
      }
    | {
        operation:
          "ARCHIVE"
      }
    | {
        operation:
          "UPDATE"
        name?: string
        code?: string | null
        cnes?: string | null
        cnpj?: string | null
        city?: string | null
        state?: string | null
        address?: string | null
      },
) {
  await requireAdminOrganizationAccess(
    userId,
    PERMISSIONS.ORGANIZATION_MANAGE,
    organizationId,
  )

  return db.$transaction(async tx => {
    const before = await tx.organization.findUnique({ where: { id: organizationId } });
    if (!before) throw new AccessDeniedError();
    let after;
    switch (input.operation) {
      case "ACTIVATE": after = await activateOrganization(organizationId, tx); break;
      case "SUSPEND": after = await suspendOrganization(organizationId, tx); break;
      case "ARCHIVE": after = await archiveOrganization(organizationId, tx); break;
      case "UPDATE":
        after = await updateOrganizationDetails(organizationId, {
          name: input.name, code: input.code, cnes: input.cnes, cnpj: input.cnpj,
          city: input.city, state: input.state, address: input.address,
        }, tx);
        break;
    }
    if (JSON.stringify(projectAdminSnapshot("ORGANIZATION", before)) !==
        JSON.stringify(projectAdminSnapshot("ORGANIZATION", after))) {
      await writeAdminAudit({
        actorUserId: userId, organizationId,
        action: input.operation === "UPDATE" ? "ORGANIZATION_UPDATED" :
          input.operation === "ACTIVATE" ? "ORGANIZATION_ACTIVATED" :
          input.operation === "SUSPEND" ? "ORGANIZATION_SUSPENDED" : "ORGANIZATION_ARCHIVED",
        resourceType: "ORGANIZATION", resourceId: organizationId,
        before, after,
      }, tx);
    }
    return after;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
