import { requireInstitutionalInvitationAccess, requireInstitutionalInvitationTarget } from "@/server/admin/institutional-invitation-policy"
import { requirePapReviewer } from "@/server/admin-beta/policy"
import {
  createHash,
  randomBytes,
} from "node:crypto"

import {
  InvitationStatus,
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
  PasswordAlgorithm,
} from "@prisma/client"

import {
  db,
} from "@/server/db/client"
import { writeAdminAudit } from "@/server/audit/admin-audit-writer.service"

import {
  hashPassword,
  validatePasswordPolicy,
} from "@/server/auth/password"

import {
  normalizeEmail,
} from "@/server/auth/password-authentication.service"

import {
  INVITATION_TOKEN_BYTES,
  INVITATION_TOKEN_HASH_DOMAIN,
  INVITATION_TTL_SECONDS,
} from "@/server/security/constants"

import {
  sendInvitationEmail, invitationBaseUrl,
} from "@/server/email/email.service"

import {
  InvalidInvitationError,
  InvitationConflictError,
  InvitationPayloadError,
} from "./invitation.errors"

function invitationHash(
  token: string,
) {
  return createHash(
    "sha256",
  )
    .update(
      INVITATION_TOKEN_HASH_DOMAIN,
    )
    .update(
      "\0",
    )
    .update(
      token,
    )
    .digest(
      "hex",
    )
}

function normalizeDisplayName(
  value: string,
) {
  const normalized =
    value
      .trim()
      .replace(
        /\s+/g,
        " ",
      )

  if (
    normalized.length < 2 ||
    normalized.length > 200
  ) {
    throw new InvitationPayloadError()
  }

  return normalized
}

async function createInvitation(
  input: {
    invitedByUserId: string
    organizationId: string
    email: string
    displayName: string
    now?: Date
    roleKey: "PROFESSIONAL" | "HEALTH_UNIT_ADMIN"
  },
) {
  await requireInstitutionalInvitationAccess(input.invitedByUserId, input.organizationId)

  if (input.roleKey === "HEALTH_UNIT_ADMIN") {
    await requirePapReviewer(input.invitedByUserId);
    const approved = await db.organizationCandidate.findFirst({ where: { convertedOrganizationId: input.organizationId, status: "APPROVED", consentedAt: { not: null } } });
    if (!approved || approved.contactEmail !== input.email.trim().toLowerCase()) throw new InvitationPayloadError();
  }
  const baseUrl = invitationBaseUrl();
  const organization =
    await db.organization.findUnique({
      where: {
        id:
          input.organizationId,
      },

      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        isActive: true,
      },
    })

  if (
    !organization ||
    organization.type !==
      OrganizationType.HEALTH_UNIT ||
    organization.status !==
      OrganizationStatus.ACTIVE ||
    !organization.isActive
  ) {
    throw new InvitationPayloadError()
  }

  const email =
    normalizeEmail(
      input.email,
    )

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    throw new InvitationPayloadError()
  }

  await requireInstitutionalInvitationTarget(input.invitedByUserId, email)

  const displayName =
    normalizeDisplayName(
      input.displayName,
    )

  const now =
    input.now ??
    new Date()

  const expiresAt =
    new Date(
      now.getTime() +
        INVITATION_TTL_SECONDS *
          1000,
    )

  const token =
    randomBytes(
      INVITATION_TOKEN_BYTES,
    ).toString(
      "base64url",
    )

  const tokenHash =
    invitationHash(
      token,
    )

  const invitation =
    await db.$transaction(
      async (
        tx,
      ) => {
        await requireInstitutionalInvitationAccess(input.invitedByUserId, organization.id, tx);
        await requireInstitutionalInvitationTarget(input.invitedByUserId, email, tx);
        // Serialize invite/accept/revoke and bootstrap per organization.
        await tx.organization.update({where:{id:organization.id},data:{updatedAt:new Date()}});

        const currentOrg = await tx.organization.findUnique({where:{id:organization.id}});
        if (!currentOrg?.isActive || currentOrg.status !== "ACTIVE") throw new InvitationPayloadError();
        if (input.roleKey === "HEALTH_UNIT_ADMIN" && await tx.roleAssignment.findFirst({where:{organizationId:organization.id,role:{key:"HEALTH_UNIT_ADMIN"}}})) throw new InvitationConflictError();
        let user =
          await tx.user.findUnique({
            where: {
              email,
            },

            include: {
              passwordCredential:
                true,
            },
          })

        if (
          user &&
          !user.isActive
        ) {
          throw new InvitationConflictError(
            "USER_INACTIVE",
          )
        }

        if (!user) {
          user =
            await tx.user.create({
              data: {
                email,
                displayName,
                isActive:
                  true,
              },

              include: {
                passwordCredential:
                  true,
              },
            })
        }

        const membership =
          await tx.membership.findUnique({
            where: {
              userId_organizationId: {
                userId:
                  user.id,

                organizationId:
                  organization.id,
              },
            },
          })

        if (
          membership?.status ===
            MembershipStatus.ACTIVE ||
          membership?.status ===
            MembershipStatus.SUSPENDED ||
          membership?.status ===
            MembershipStatus.DISABLED
        ) {
          throw new InvitationConflictError(
            "MEMBERSHIP_ALREADY_EXISTS",
          )
        }

        await tx.userInvitation.updateMany({
          where: {
            email,
            organizationId:
              organization.id,
            roleKey:
              input.roleKey,
            status:
              InvitationStatus.PENDING,
          },

          data: {
            status:
              InvitationStatus.REVOKED,

            revokedAt:
              now,
          },
        })

        if (membership) {
          await tx.membership.update({
            where: {
              id:
                membership.id,
            },

            data: {
              status:
                MembershipStatus.INVITED,
            },
          })
        } else {
          await tx.membership.create({
            data: {
              userId:
                user.id,

              organizationId:
                organization.id,

              status:
                MembershipStatus.INVITED,
            },
          })
        }

        const created = await tx.userInvitation.create({
          data: {
            email,
            displayName,
            userId:
              user.id,
            organizationId:
              organization.id,

            roleKey:
              input.roleKey,

            deliveryStatus: "SENDING",
            tokenHash,

            status:
              InvitationStatus.PENDING,

            expiresAt,

            invitedByUserId:
              input.invitedByUserId,
          },
        })
        await writeAdminAudit({
          actorUserId: input.invitedByUserId,
          organizationId: organization.id,
          action: "INVITATION_CREATED",
          resourceType: "INVITATION",
          resourceId: created.id,
          after: {
            id: created.id, status: created.status, roleKey: created.roleKey,
            organizationId: organization.id, userId: created.userId,
            expiresAt: created.expiresAt.toISOString(),
          },
        }, tx);
        return created;
      },
    )

  const invitationUrl =
    `${baseUrl}/convite?token=${encodeURIComponent(token)}`

  try {
    const delivery =
      await sendInvitationEmail({
        to:
          email,

        displayName,

        organizationName:
          organization.name,

        invitationUrl,
        invitationId: invitation.id,
        roleKey: invitation.roleKey,
        expiresAt: invitation.expiresAt,
      })

    await db.$transaction(async tx => {
      await tx.userInvitation.updateMany({where:{id:invitation.id,deliveryStatus:{in:["SENDING","NOT_ATTEMPTED"]}},data:{deliveryStatus:delivery.status,providerMessageId:delivery.mode === "RESEND" ? delivery.providerMessageId : null,deliveryAttemptedAt:new Date()}});
      await writeAdminAudit({actorUserId:input.invitedByUserId,organizationId:organization.id,action:"INVITATION_DELIVERY",resourceType:"INVITATION",resourceId:invitation.id,reason:delivery.status},tx);
    });
    return {
      invitation: {
        id:
          invitation.id,

        email:
          invitation.email,

        displayName:
          invitation.displayName,

        organizationId:
          invitation.organizationId,

        roleKey:
          invitation.roleKey,

        status:
          invitation.status,

        expiresAt:
          invitation.expiresAt,
      },

      delivery,

      developmentUrl:
        process.env.NODE_ENV !== "production" && delivery.mode ===
        "DEVELOPMENT"
          ? invitationUrl
          : undefined,
    }
  } catch (error) {
    await db.$transaction(async tx => {
      const result = await tx.userInvitation.updateMany({
        where: { id: invitation.id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.REVOKED, revokedAt: new Date(), deliveryStatus: "FAILED", deliveryAttemptedAt: new Date() },
      });
      if (result.count === 1) await writeAdminAudit({
        actorUserId: input.invitedByUserId,
        organizationId: organization.id,
        action: "INVITATION_REVOKED",
        resourceType: "INVITATION",
        resourceId: invitation.id,
        after: { id: invitation.id, status: "REVOKED", organizationId: organization.id },
      }, tx);
    });

    throw error
  }
}

export async function inspectInvitation(
  token: string,
  now = new Date(),
) {
  if (
    typeof token !==
      "string" ||
    token.length < 20 ||
    token.length > 512
  ) {
    throw new InvalidInvitationError()
  }

  const invitation =
    await db.userInvitation.findUnique({
      where: {
        tokenHash:
          invitationHash(
            token,
          ),
      },

      include: {
        user: {
          select: {
            passwordCredential: {
              select: {
                id: true,
              },
            },
          },
        },

        organization: {
          select: {
            name: true,
            type: true,
            status: true,
            isActive: true,
          },
        },
      },
    })

  if (
    !invitation ||
    invitation.status !==
      InvitationStatus.PENDING ||
    invitation.expiresAt <=
      now ||
    !invitation.user ||
    invitation.organization.type !==
      OrganizationType.HEALTH_UNIT ||
    invitation.organization.status !==
      OrganizationStatus.ACTIVE ||
    !invitation.organization.isActive
  ) {
    throw new InvalidInvitationError()
  }

  return {
    email:
      invitation.email,

    displayName:
      invitation.displayName,

    organizationName:
      invitation.organization.name,

    roleKey:
      invitation.roleKey,

    expiresAt:
      invitation.expiresAt,

    requiresPassword:
      invitation.user
        .passwordCredential ===
      null,
  }
}

export async function acceptInvitation(
  input: {
    token: string
    password?: string
    now?: Date
  },
) {
  const now =
    input.now ??
    new Date()

  const tokenHash =
    invitationHash(
      input.token,
    )

  const existing =
    await db.userInvitation.findUnique({
      where: {
        tokenHash,
      },

      include: {
        user: {
          include: {
            passwordCredential:
              true,
          },
        },

        organization: true,
      },
    })

  if (
    !existing ||
    existing.status !==
      InvitationStatus.PENDING ||
    existing.expiresAt <=
      now ||
    !existing.user ||
    !existing.user.isActive ||
    !["PROFESSIONAL", "HEALTH_UNIT_ADMIN"].includes(existing.roleKey) ||
    existing.organization.type !==
      OrganizationType.HEALTH_UNIT ||
    existing.organization.status !==
      OrganizationStatus.ACTIVE ||
    !existing.organization.isActive
  ) {
    throw new InvalidInvitationError()
  }

  let passwordHash:
    string | null =
    null

  if (
    !existing.user
      .passwordCredential
  ) {
    if (
      typeof input.password !==
      "string"
    ) {
      throw new InvitationPayloadError()
    }

    validatePasswordPolicy(
      input.password,
    )

    passwordHash =
      await hashPassword(
        input.password,
      )
  }

  return db.$transaction(
    async (
      tx,
    ) => {
      // Revalidate authority and target at acceptance: identities/roles can change
      // while a bearer invitation is pending. Never consume a now-invalid grant.
      if (!existing.invitedByUserId) throw new InvalidInvitationError();
      try {
        await requireInstitutionalInvitationAccess(existing.invitedByUserId, existing.organizationId, tx);
        await requireInstitutionalInvitationTarget(existing.invitedByUserId, existing.email, tx);
      } catch { throw new InvalidInvitationError(); }
      await tx.organization.update({where:{id:existing.organizationId},data:{updatedAt:new Date()}});
      const currentUser = await tx.user.findUnique({where:{id:existing.user!.id}});
      const currentOrg = await tx.organization.findUnique({where:{id:existing.organizationId}});
      if (!currentUser?.isActive || !currentOrg?.isActive || currentOrg.status !== "ACTIVE") throw new InvalidInvitationError();
      const consumed =
        await tx.userInvitation.updateMany({
          where: {
            id:
              existing.id,

            status:
              InvitationStatus.PENDING,

            expiresAt: {
              gt:
                now,
            },
          },

          data: {
            status:
              InvitationStatus.ACCEPTED,

            acceptedAt:
              now,
          },
        })

      if (
        consumed.count !==
        1
      ) {
        throw new InvalidInvitationError()
      }

      const membership =
        await tx.membership.updateMany({
          where: {
            userId:
              existing.user!.id,

            organizationId:
              existing.organizationId,

            status:
              MembershipStatus.INVITED,
          },

          data: {
            status:
              MembershipStatus.ACTIVE,
          },
        })

      if (
        membership.count !==
        1
      ) {
        throw new InvitationConflictError()
      }

      if (passwordHash) {
        await tx.passwordCredential.create({
          data: {
            userId:
              existing.user!.id,

            passwordHash,

            algorithm:
              PasswordAlgorithm.ARGON2ID,

            mustChange:
              false,

            changedAt:
              now,
          },
        })
      }

      const role =
        await tx.role.findUnique({
          where: {
            key:
              existing.roleKey,
          },
        })

      if (!role) {
        throw new InvitationConflictError()
      }

      await tx.roleAssignment.upsert({
        where: {
          userId_roleId_organizationId: {
            userId:
              existing.user!.id,

            roleId:
              role.id,

            organizationId:
              existing.organizationId,
          },
        },

        create: {
          userId:
            existing.user!.id,

          roleId:
            role.id,

          organizationId:
            existing.organizationId,
        },

        update: {},
      })

      await writeAdminAudit({
        actorUserId: existing.user!.id,
        organizationId: existing.organizationId,
        action: "INVITATION_ACCEPTED",
        resourceType: "INVITATION",
        resourceId: existing.id,
        after: {
          id: existing.id, status: "ACCEPTED", roleKey: existing.roleKey,
          organizationId: existing.organizationId, userId: existing.user!.id,
        },
      }, tx);
      return {
        userId:
          existing.user!.id,

        organizationId:
          existing.organizationId,

        roleKey:
          existing.roleKey,
      }
    },
  )
}

export function createProfessionalInvitation(input: {invitedByUserId:string;organizationId:string;email:string;displayName:string;now?:Date}) {
  return createInvitation({...input,roleKey:"PROFESSIONAL"});
}
export function createHealthUnitAdminInvitation(input: {invitedByUserId:string;organizationId:string;email:string;displayName:string;now?:Date}) {
  return createInvitation({...input,roleKey:"HEALTH_UNIT_ADMIN"});
}
