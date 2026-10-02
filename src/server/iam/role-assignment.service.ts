import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client"

import { db } from "@/server/db/client"

import {
  SYSTEM_ROLE_KEYS,
  type SystemRoleKey,
} from "./system-role-catalog"

import {
  ActiveMembershipRequiredError,
  InactiveOrganizationError,
  InvalidRoleScopeError,
  RoleNotFoundError,
} from "./role-assignment.errors"

const GLOBAL_ROLES = new Set<SystemRoleKey>([
  SYSTEM_ROLE_KEYS.PAP_ADMIN,
  SYSTEM_ROLE_KEYS.COMMERCIAL,
])

function expectedOrganizationType(
  roleKey: SystemRoleKey,
) {
  switch (roleKey) {
    case SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN:
      return OrganizationType.MUNICIPALITY

    case SYSTEM_ROLE_KEYS.HEALTH_UNIT_ADMIN:
    case SYSTEM_ROLE_KEYS.PROFESSIONAL:
      return OrganizationType.HEALTH_UNIT

    default:
      return null
  }
}

export async function assignSystemRole(input: {
  userId: string
  roleKey: SystemRoleKey
  organizationId?: string | null
}) {
  const role = await db.role.findUnique({
    where: {
      key: input.roleKey,
    },
  })

  if (!role) {
    throw new RoleNotFoundError()
  }

  const isGlobal = GLOBAL_ROLES.has(input.roleKey)

  if (isGlobal) {
    if (input.organizationId != null) {
      throw new InvalidRoleScopeError(
        `${input.roleKey} must be assigned globally.`,
      )
    }

    const existing =
      await db.roleAssignment.findFirst({
        where: {
          userId: input.userId,
          roleId: role.id,
          organizationId: null,
        },
      })

    if (existing) {
      return existing
    }

    return db.roleAssignment.create({
      data: {
        userId: input.userId,
        roleId: role.id,
        organizationId: null,
      },
    })
  }

  if (!input.organizationId) {
    throw new InvalidRoleScopeError(
      `${input.roleKey} requires an organization scope.`,
    )
  }

  const organization =
    await db.organization.findUnique({
      where: {
        id: input.organizationId,
      },
    })

  if (!organization) {
    throw new InvalidRoleScopeError(
      "Organization does not exist.",
    )
  }

  if (
    organization.status !==
      OrganizationStatus.ACTIVE ||
    !organization.isActive
  ) {
    throw new InactiveOrganizationError()
  }

  const expectedType =
    expectedOrganizationType(input.roleKey)

  if (
    !expectedType ||
    organization.type !== expectedType
  ) {
    throw new InvalidRoleScopeError(
      `${input.roleKey} cannot be assigned to organization type ${organization.type}.`,
    )
  }

  const membership =
    await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      },
    })

  if (
    !membership ||
    membership.status !== MembershipStatus.ACTIVE
  ) {
    throw new ActiveMembershipRequiredError()
  }

  return db.roleAssignment.upsert({
    where: {
      userId_roleId_organizationId: {
        userId: input.userId,
        roleId: role.id,
        organizationId: input.organizationId,
      },
    },
    create: {
      userId: input.userId,
      roleId: role.id,
      organizationId: input.organizationId,
    },
    update: {},
  })
}

export async function revokeSystemRole(input: {
  userId: string
  roleKey: SystemRoleKey
  organizationId?: string | null
}) {
  const role = await db.role.findUnique({
    where: {
      key: input.roleKey,
    },
  })

  if (!role) {
    throw new RoleNotFoundError()
  }

  return db.roleAssignment.deleteMany({
    where: {
      userId: input.userId,
      roleId: role.id,
      organizationId:
        input.organizationId ?? null,
    },
  })
}
