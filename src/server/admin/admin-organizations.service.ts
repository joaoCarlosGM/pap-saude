import {
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client"

import {
  db,
} from "@/server/db/client"

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

  return createOrganization({
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
  })
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

  switch (
    input.operation
  ) {
    case "ACTIVATE":
      return activateOrganization(
        organizationId,
      )

    case "SUSPEND":
      return suspendOrganization(
        organizationId,
      )

    case "ARCHIVE":
      return archiveOrganization(
        organizationId,
      )

    case "UPDATE":
      return updateOrganizationDetails(
        organizationId,
        {
          name:
            input.name,
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
        },
      )
  }
}
