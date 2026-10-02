import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  MembershipStatus,
  OrganizationCandidateStatus,
  OrganizationLeadTemperature,
  OrganizationRequestStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  acceptMembershipInvitation,
  approveMembership,
  inviteMember,
  requestMembership,
} from "../../src/server/organizations/membership.service";

import {
  MembershipOrganizationUnavailableError,
} from "../../src/server/organizations/membership.errors";

import {
  convertOrganizationCandidate,
  deriveLeadTemperature,
  requestOrganizationRegistration,
  transitionOrganizationCandidate,
} from "../../src/server/organizations/discovery.service";

import {
  ExistingOrganizationFoundError,
  InvalidCandidateTransitionError,
  OrganizationCandidateUnavailableError,
} from "../../src/server/organizations/discovery.errors";

import {
  createOrganization,
} from "../../src/server/organizations/organization.service";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

let sequence = 0;

async function assertSafeDatabase(): Promise<void> {
  const rows =
    await db.$queryRaw<
      Array<{ database: string }>
    >`SELECT current_database() AS database`;

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  );
}

async function clearFixtures(): Promise<void> {
  await db.organizationRequest.deleteMany();
  await db.organizationCandidate.deleteMany();
  await db.membership.deleteMany();
  await db.organization.deleteMany();

  await db.user.deleteMany({
    where: {
      email: {
        endsWith:
          "@foundation-f04b.local",
      },
    },
  });

  sequence = 0;
}

async function createUser() {
  sequence += 1;

  return db.user.create({
    data: {
      email:
        `user-${sequence}@foundation-f04b.local`,
      displayName:
        `F04B User ${sequence}`,
      isActive:
        true,
    },
  });
}

async function createHierarchy() {
  const pap =
    await createOrganization({
      type:
        OrganizationType.PAP,
      name:
        "PAP Saúde F04B",
      status:
        OrganizationStatus.ACTIVE,
    });

  const municipality =
    await createOrganization({
      type:
        OrganizationType.MUNICIPALITY,
      name:
        "Belém F04B",
      parentId:
        pap.id,
      city:
        "Belém",
      state:
        "PA",
      status:
        OrganizationStatus.ACTIVE,
    });

  const unit =
    await createOrganization({
      type:
        OrganizationType.HEALTH_UNIT,
      name:
        "UBS F04B",
      parentId:
        municipality.id,
      cnes:
        "4567890",
      city:
        "Belém",
      state:
        "PA",
      status:
        OrganizationStatus.ACTIVE,
    });

  return {
    pap,
    municipality,
    unit,
  };
}

async function moveCandidateToValidating(
  candidateId: string,
): Promise<void> {
  await transitionOrganizationCandidate(
    candidateId,
    OrganizationCandidateStatus.QUALIFYING,
  );

  await transitionOrganizationCandidate(
    candidateId,
    OrganizationCandidateStatus.CONTACTED,
  );

  await transitionOrganizationCandidate(
    candidateId,
    OrganizationCandidateStatus.INTERESTED,
  );

  await transitionOrganizationCandidate(
    candidateId,
    OrganizationCandidateStatus.VALIDATING,
  );
}

before(async () => {
  await assertSafeDatabase();
  await clearFixtures();
});

beforeEach(async () => {
  await clearFixtures();
});

after(async () => {
  await clearFixtures();
});

test(
  "professional requests membership in active organization",
  async () => {
    const user =
      await createUser();

    const {
      unit,
    } =
      await createHierarchy();

    const membership =
      await requestMembership(
        user.id,
        unit.id,
      );

    assert.equal(
      membership.status,
      MembershipStatus.REQUESTED,
    );
  },
);

test(
  "repeated membership request is idempotent",
  async () => {
    const user =
      await createUser();

    const {
      unit,
    } =
      await createHierarchy();

    const first =
      await requestMembership(
        user.id,
        unit.id,
      );

    const second =
      await requestMembership(
        user.id,
        unit.id,
      );

    assert.equal(
      first.id,
      second.id,
    );

    assert.equal(
      await db.membership.count(),
      1,
    );
  },
);

test(
  "requested membership can be approved",
  async () => {
    const user =
      await createUser();

    const {
      unit,
    } =
      await createHierarchy();

    const requested =
      await requestMembership(
        user.id,
        unit.id,
      );

    const approved =
      await approveMembership(
        requested.id,
      );

    assert.equal(
      approved.status,
      MembershipStatus.ACTIVE,
    );
  },
);

test(
  "organization invitation can be accepted",
  async () => {
    const user =
      await createUser();

    const {
      unit,
    } =
      await createHierarchy();

    const invitation =
      await inviteMember(
        user.id,
        unit.id,
      );

    assert.equal(
      invitation.status,
      MembershipStatus.INVITED,
    );

    const accepted =
      await acceptMembershipInvitation(
        invitation.id,
      );

    assert.equal(
      accepted.status,
      MembershipStatus.ACTIVE,
    );
  },
);

test(
  "suspended organization cannot receive new membership request",
  async () => {
    const user =
      await createUser();

    const {
      unit,
    } =
      await createHierarchy();

    await db.organization.update({
      where: {
        id:
          unit.id,
      },
      data: {
        status:
          OrganizationStatus.SUSPENDED,
        isActive:
          false,
      },
    });

    await assert.rejects(
      () =>
        requestMembership(
          user.id,
          unit.id,
        ),
      MembershipOrganizationUnavailableError,
    );
  },
);

test(
  "missing organization creates commercial candidate and request",
  async () => {
    const user =
      await createUser();

    const result =
      await requestOrganizationRegistration({
        requestedByUserId:
          user.id,
        type:
          OrganizationType.HEALTH_UNIT,
        name:
          "Hospital Regional F04B",
        cnes:
          "7654321",
        city:
          "Belém",
        state:
          "PA",
      });

    assert.equal(
      result.isNewCandidate,
      true,
    );

    assert.equal(
      result.requestCount,
      1,
    );

    assert.equal(
      result.candidate.status,
      OrganizationCandidateStatus.NEW,
    );

    assert.equal(
      result.candidate.leadTemperature,
      OrganizationLeadTemperature.COLD,
    );

    assert.equal(
      result.request.status,
      OrganizationRequestStatus.REQUESTED,
    );
  },
);

test(
  "multiple professionals are consolidated into one candidate",
  async () => {
    let candidateId:
      string | null = null;

    for (
      let index = 0;
      index < 5;
      index += 1
    ) {
      const user =
        await createUser();

      const result =
        await requestOrganizationRegistration({
          requestedByUserId:
            user.id,
          type:
            OrganizationType.HEALTH_UNIT,
          name:
            "Hospital São José",
          city:
            "Belém",
          state:
            "PA",
        });

      candidateId ??=
        result.candidate.id;

      assert.equal(
        result.candidate.id,
        candidateId,
      );
    }

    assert.equal(
      await db.organizationCandidate.count(),
      1,
    );

    assert.equal(
      await db.organizationRequest.count(),
      5,
    );

    const candidate =
      await db.organizationCandidate.findUniqueOrThrow({
        where: {
          id:
            candidateId!,
        },
      });

    assert.equal(
      candidate.leadTemperature,
      OrganizationLeadTemperature.WARM,
    );
  },
);

test(
  "same professional does not inflate candidate demand",
  async () => {
    const user =
      await createUser();

    const first =
      await requestOrganizationRegistration({
        requestedByUserId:
          user.id,
        type:
          OrganizationType.HEALTH_UNIT,
        name:
          "Hospital Demanda F04B",
        city:
          "Belém",
        state:
          "PA",
      });

    const second =
      await requestOrganizationRegistration({
        requestedByUserId:
          user.id,
        type:
          OrganizationType.HEALTH_UNIT,
        name:
          "Hospital Demanda F04B",
        city:
          "Belém",
        state:
          "PA",
      });

    assert.equal(
      first.candidate.id,
      second.candidate.id,
    );

    assert.equal(
      second.requestCount,
      1,
    );

    assert.equal(
      await db.organizationRequest.count(),
      1,
    );
  },
);

test(
  "lead temperature thresholds are stable",
  () => {
    assert.equal(
      deriveLeadTemperature(1),
      OrganizationLeadTemperature.COLD,
    );

    assert.equal(
      deriveLeadTemperature(4),
      OrganizationLeadTemperature.COLD,
    );

    assert.equal(
      deriveLeadTemperature(5),
      OrganizationLeadTemperature.WARM,
    );

    assert.equal(
      deriveLeadTemperature(14),
      OrganizationLeadTemperature.WARM,
    );

    assert.equal(
      deriveLeadTemperature(15),
      OrganizationLeadTemperature.HOT,
    );
  },
);

test(
  "existing organization is not recreated as candidate",
  async () => {
    const user =
      await createUser();

    const {
      unit,
    } =
      await createHierarchy();

    await assert.rejects(
      () =>
        requestOrganizationRegistration({
          requestedByUserId:
            user.id,
          type:
            OrganizationType.HEALTH_UNIT,
          name:
            "Outro nome",
          cnes:
            unit.cnes,
          city:
            "Belém",
          state:
            "PA",
        }),
      ExistingOrganizationFoundError,
    );

    assert.equal(
      await db.organizationCandidate.count(),
      0,
    );
  },
);

test(
  "commercial candidate follows controlled pipeline",
  async () => {
    const user =
      await createUser();

    const result =
      await requestOrganizationRegistration({
        requestedByUserId:
          user.id,
        type:
          OrganizationType.HEALTH_UNIT,
        name:
          "Hospital Pipeline F04B",
        city:
          "Belém",
        state:
          "PA",
      });

    await moveCandidateToValidating(
      result.candidate.id,
    );

    const candidate =
      await db.organizationCandidate.findUniqueOrThrow({
        where: {
          id:
            result.candidate.id,
        },
      });

    assert.equal(
      candidate.status,
      OrganizationCandidateStatus.VALIDATING,
    );

    await assert.rejects(
      () =>
        transitionOrganizationCandidate(
          candidate.id,
          OrganizationCandidateStatus.NEW,
        ),
      InvalidCandidateTransitionError,
    );
  },
);

test(
  "validated candidate converts into pending organization",
  async () => {
    const {
      municipality,
    } =
      await createHierarchy();

    const user =
      await createUser();

    const result =
      await requestOrganizationRegistration({
        requestedByUserId:
          user.id,
        type:
          OrganizationType.HEALTH_UNIT,
        name:
          "Hospital Conversão F04B",
        cnes:
          "2345678",
        city:
          "Belém",
        state:
          "PA",
      });

    await moveCandidateToValidating(
      result.candidate.id,
    );

    const converted =
      await convertOrganizationCandidate({
        candidateId:
          result.candidate.id,
        parentId:
          municipality.id,
      });

    assert.equal(
      converted.candidate.status,
      OrganizationCandidateStatus.APPROVED,
    );

    assert.equal(
      converted.organization.status,
      OrganizationStatus.PENDING_VERIFICATION,
    );

    assert.equal(
      converted.organization.isActive,
      false,
    );

    assert.equal(
      converted.candidate.convertedOrganizationId,
      converted.organization.id,
    );

    const request =
      await db.organizationRequest.findUniqueOrThrow({
        where: {
          id:
            result.request.id,
        },
      });

    assert.equal(
      request.status,
      OrganizationRequestStatus.RESOLVED,
    );
  },
);

test(
  "candidate cannot be converted twice",
  async () => {
    const {
      municipality,
    } =
      await createHierarchy();

    const user =
      await createUser();

    const result =
      await requestOrganizationRegistration({
        requestedByUserId:
          user.id,
        type:
          OrganizationType.HEALTH_UNIT,
        name:
          "Hospital Único F04B",
        cnes:
          "3456789",
        city:
          "Belém",
        state:
          "PA",
      });

    await moveCandidateToValidating(
      result.candidate.id,
    );

    await convertOrganizationCandidate({
      candidateId:
        result.candidate.id,
      parentId:
        municipality.id,
    });

    await assert.rejects(
      () =>
        convertOrganizationCandidate({
          candidateId:
            result.candidate.id,
          parentId:
            municipality.id,
        }),
      OrganizationCandidateUnavailableError,
    );

    assert.equal(
      await db.organization.count({
        where: {
          cnes:
            "3456789",
        },
      }),
      1,
    );
  },
);
