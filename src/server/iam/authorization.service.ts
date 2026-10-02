import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client"

import { db } from "@/server/db/client"

import {
  type PermissionKey,
} from "./permissions"

import {
  getSystemRoleDefinition,
} from "./system-role-catalog"

import {
  AccessDeniedError,
} from "./authorization.errors"

export type AuthorizationInput = {
  userId: string
  permission: PermissionKey
  organizationId?: string | null
}

export type AuthorizationDecision = {
  allowed: boolean
  reason:
    | "ALLOWED"
    | "USER_INACTIVE"
    | "TARGET_REQUIRED"
    | "TARGET_INACTIVE"
    | "NO_MATCHING_ASSIGNMENT"
}

function allowsTarget(input: {
  scope: "GLOBAL" | "MUNICIPALITY" | "HEALTH_UNIT"
  assignmentOrganizationId: string | null
  targetOrganization: {
    id: string
    type: OrganizationType
    parentId: string | null
  } | null
}) {
  if (input.scope === "GLOBAL") {
    return true
  }

  if (!input.targetOrganization) {
    return false
  }

  if (!input.assignmentOrganizationId) {
    return false
  }

  if (input.scope === "HEALTH_UNIT") {
    return (
      input.targetOrganization.type ===
        OrganizationType.HEALTH_UNIT &&
      input.targetOrganization.id ===
        input.assignmentOrganizationId
    )
  }

  if (input.scope === "MUNICIPALITY") {
    if (
      input.targetOrganization.type ===
      OrganizationType.MUNICIPALITY
    ) {
      return (
        input.targetOrganization.id ===
        input.assignmentOrganizationId
      )
    }

    if (
      input.targetOrganization.type ===
      OrganizationType.HEALTH_UNIT
    ) {
      return (
        input.targetOrganization.parentId ===
        input.assignmentOrganizationId
      )
    }

    return false
  }

  return false
}

export async function authorize(
  input: AuthorizationInput,
): Promise<AuthorizationDecision> {
  const user = await db.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      id: true,
      isActive: true,
    },
  })

  if (!user?.isActive) {
    return {
      allowed: false,
      reason: "USER_INACTIVE",
    }
  }

  const targetOrganization =
    input.organizationId
      ? await db.organization.findUnique({
          where: {
            id: input.organizationId,
          },
          select: {
            id: true,
            type: true,
            status: true,
            parentId: true,
            isActive: true,
          },
        })
      : null

  if (input.organizationId) {
    if (
      !targetOrganization ||
      !targetOrganization.isActive ||
      targetOrganization.status !==
        OrganizationStatus.ACTIVE
    ) {
      return {
        allowed: false,
        reason: "TARGET_INACTIVE",
      }
    }
  }

  const assignments =
    await db.roleAssignment.findMany({
      where: {
        userId: input.userId,
        role: {
          permissions: {
            some: {
              permission: {
                key: input.permission,
              },
            },
          },
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            status: true,
            isActive: true,
          },
        },
      },
    })

  for (const assignment of assignments) {
    const definition =
      getSystemRoleDefinition(
        assignment.role.key,
      )

    // Unknown/custom roles are intentionally fail-closed
    // until their scope model is explicitly defined.
    if (!definition) {
      continue
    }

    const hasPermission =
      assignment.role.permissions.some(
        (entry) =>
          entry.permission.key ===
          input.permission,
      )

    if (!hasPermission) {
      continue
    }

    if (definition.scope !== "GLOBAL") {
      if (
        !assignment.organization ||
        !assignment.organization.isActive ||
        assignment.organization.status !==
          OrganizationStatus.ACTIVE
      ) {
        continue
      }

      const membership =
        await db.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: input.userId,
              organizationId:
                assignment.organization.id,
            },
          },
          select: {
            status: true,
          },
        })

      if (
        membership?.status !==
        MembershipStatus.ACTIVE
      ) {
        continue
      }
    }

    const targetAllowed =
      allowsTarget({
        scope: definition.scope,
        assignmentOrganizationId:
          assignment.organizationId,
        targetOrganization,
      })

    if (!targetAllowed) {
      continue
    }

    return {
      allowed: true,
      reason: "ALLOWED",
    }
  }

  if (!input.organizationId) {
    const hasScopedAssignment =
      assignments.some((assignment) => {
        const definition =
          getSystemRoleDefinition(
            assignment.role.key,
          )

        return (
          definition &&
          definition.scope !== "GLOBAL"
        )
      })

    if (hasScopedAssignment) {
      return {
        allowed: false,
        reason: "TARGET_REQUIRED",
      }
    }
  }

  return {
    allowed: false,
    reason: "NO_MATCHING_ASSIGNMENT",
  }
}

export async function requirePermission(
  input: AuthorizationInput,
) {
  const decision =
    await authorize(input)

  if (!decision.allowed) {
    throw new AccessDeniedError()
  }

  return decision
}
