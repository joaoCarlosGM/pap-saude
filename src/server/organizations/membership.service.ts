import {
  MembershipStatus,
  OrganizationStatus,
  type Membership,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  MembershipNotFoundError,
  MembershipOrganizationUnavailableError,
  MembershipStateError,
  MembershipUserUnavailableError,
} from "./membership.errors";

async function requireAvailableUser(
  userId: string,
): Promise<void> {
  const user =
    await db.user.findUnique({
      where: {
        id:
          userId,
      },
      select: {
        isActive:
          true,
      },
    });

  if (!user?.isActive) {
    throw new MembershipUserUnavailableError();
  }
}

async function requireAvailableOrganization(
  organizationId: string,
): Promise<void> {
  const organization =
    await db.organization.findUnique({
      where: {
        id:
          organizationId,
      },
      select: {
        status:
          true,
      },
    });

  if (
    !organization ||
    organization.status !==
      OrganizationStatus.ACTIVE
  ) {
    throw new MembershipOrganizationUnavailableError();
  }
}

export async function requestMembership(
  userId: string,
  organizationId: string,
): Promise<Membership> {
  await Promise.all([
    requireAvailableUser(
      userId,
    ),
    requireAvailableOrganization(
      organizationId,
    ),
  ]);

  const existing =
    await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

  if (existing) {
    if (
      existing.status ===
        MembershipStatus.REQUESTED ||
      existing.status ===
        MembershipStatus.INVITED ||
      existing.status ===
        MembershipStatus.ACTIVE
    ) {
      return existing;
    }

    throw new MembershipStateError();
  }

  return db.membership.create({
    data: {
      userId,
      organizationId,
      status:
        MembershipStatus.REQUESTED,
    },
  });
}

export async function inviteMember(
  userId: string,
  organizationId: string,
): Promise<Membership> {
  await Promise.all([
    requireAvailableUser(
      userId,
    ),
    requireAvailableOrganization(
      organizationId,
    ),
  ]);

  const existing =
    await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

  if (existing) {
    if (
      existing.status ===
      MembershipStatus.ACTIVE
    ) {
      return existing;
    }

    throw new MembershipStateError();
  }

  return db.membership.create({
    data: {
      userId,
      organizationId,
      status:
        MembershipStatus.INVITED,
    },
  });
}

async function transitionMembership(
  membershipId: string,
  from: MembershipStatus,
  to: MembershipStatus,
): Promise<Membership> {
  const result =
    await db.membership.updateMany({
      where: {
        id:
          membershipId,
        status:
          from,
      },
      data: {
        status:
          to,
      },
    });

  if (result.count !== 1) {
    const exists =
      await db.membership.findUnique({
        where: {
          id:
            membershipId,
        },
        select: {
          id:
            true,
        },
      });

    if (!exists) {
      throw new MembershipNotFoundError();
    }

    throw new MembershipStateError();
  }

  return db.membership.findUniqueOrThrow({
    where: {
      id:
        membershipId,
    },
  });
}

export async function approveMembership(
  membershipId: string,
): Promise<Membership> {
  return transitionMembership(
    membershipId,
    MembershipStatus.REQUESTED,
    MembershipStatus.ACTIVE,
  );
}

export async function acceptMembershipInvitation(
  membershipId: string,
): Promise<Membership> {
  return transitionMembership(
    membershipId,
    MembershipStatus.INVITED,
    MembershipStatus.ACTIVE,
  );
}

export async function suspendMembership(
  membershipId: string,
): Promise<Membership> {
  return transitionMembership(
    membershipId,
    MembershipStatus.ACTIVE,
    MembershipStatus.SUSPENDED,
  );
}

export async function disableMembership(
  membershipId: string,
): Promise<Membership> {
  const result =
    await db.membership.updateMany({
      where: {
        id:
          membershipId,
        status: {
          not:
            MembershipStatus.DISABLED,
        },
      },
      data: {
        status:
          MembershipStatus.DISABLED,
      },
    });

  if (result.count === 0) {
    const membership =
      await db.membership.findUnique({
        where: {
          id:
            membershipId,
        },
      });

    if (!membership) {
      throw new MembershipNotFoundError();
    }

    return membership;
  }

  return db.membership.findUniqueOrThrow({
    where: {
      id:
        membershipId,
    },
  });
}
