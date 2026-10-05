import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import {
  db,
} from "../../src/server/db/client";

import {
  AccessDeniedError,
} from "../../src/server/iam/authorization.errors";

import {
  bootstrapSystemIam,
} from "../../src/server/iam/bootstrap.service";

import {
  assignSystemRole,
} from "../../src/server/iam/role-assignment.service";

import {
  SYSTEM_ROLE_KEYS,
} from "../../src/server/iam/system-role-catalog";

import {
  createPatient,
} from "../../src/server/patients/patient.service";

import {
  linkPatientToOrganization,
} from "../../src/server/patients/patient-organization.service";

import {
  createEncounter,
} from "../../src/server/encounters/encounter.service";

import {
  requireMeowsEvaluateAccess,
  requireMeowsReadAccess,
} from "../../src/server/meows";

const EXPECTED_DATABASE =
  "pap_saude_f03_meows_test";

async function assertSafeDatabase():
Promise<void> {
  const rows =
    await db.$queryRaw<
      Array<{
        database: string;
      }>
    >`SELECT current_database() AS database`;

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  );
}

async function clearFixtures():
Promise<void> {
  await db.clinicalEvaluation.deleteMany();
  await db.clinicalFlag.deleteMany();
  await db.vitalSigns.deleteMany();
  await db.obstetricData.deleteMany();
  await db.encounter.deleteMany();
  await db.patientOrganization.deleteMany();
  await db.allergy.deleteMany();
  await db.pregnancy.deleteMany();
  await db.patient.deleteMany();

  await db.roleAssignment.deleteMany();
  await db.rolePermission.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();
  await db.membership.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();
}

async function createUser(
  email: string,
) {
  return db.user.create({
    data: {
      email,
      displayName:
        email,
    },
  });
}

async function createUnit(
  suffix: string,
) {
  return db.organization.create({
    data: {
      type:
        OrganizationType.HEALTH_UNIT,

      status:
        OrganizationStatus.ACTIVE,

      name:
        `UBS MEOWS Access ${suffix}`,

      cnes:
        `71${suffix.padStart(5, "0")}`,

      isActive:
        true,
    },
  });
}

async function makeProfessional(
  userId: string,
  organizationId: string,
) {
  await db.membership.create({
    data: {
      userId,
      organizationId,

      status:
        MembershipStatus.ACTIVE,
    },
  });

  await assignSystemRole({
    userId,

    roleKey:
      SYSTEM_ROLE_KEYS.PROFESSIONAL,

    organizationId,
  });
}

async function createFixture(
  suffix: string,
) {
  const unit =
    await createUnit(
      suffix,
    );

  const patient =
    await createPatient({
      fullName:
        `Paciente MEOWS Access ${suffix}`,

      birthDate:
        "2000-01-01",
    });

  await linkPatientToOrganization({
    patientId:
      patient.id,

    organizationId:
      unit.id,
  });

  const encounter =
    await createEncounter({
      patientId:
        patient.id,

      organizationId:
        unit.id,
    });

  return {
    unit,
    patient,
    encounter,
  };
}

before(async () => {
  await assertSafeDatabase();
  await clearFixtures();
});

beforeEach(async () => {
  await clearFixtures();
  await bootstrapSystemIam();
});

after(async () => {
  await clearFixtures();
});

test(
  "professional can read and evaluate MEOWS in own unit",
  async () => {
    const user =
      await createUser(
        "meows-own@example.test",
      );

    const {
      unit,
      encounter,
    } =
      await createFixture(
        "00001",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const read =
      await requireMeowsReadAccess({
        userId:
          user.id,

        organizationId:
          unit.id,

        encounterId:
          encounter.id,
      });

    const evaluate =
      await requireMeowsEvaluateAccess({
        userId:
          user.id,

        organizationId:
          unit.id,

        encounterId:
          encounter.id,
      });

    assert.equal(
      read.allowed,
      true,
    );

    assert.equal(
      evaluate.allowed,
      true,
    );
  },
);

test(
  "cross-unit MEOWS access is denied",
  async () => {
    const user =
      await createUser(
        "meows-cross@example.test",
      );

    const unitA =
      await createUnit(
        "00002",
      );

    await makeProfessional(
      user.id,
      unitA.id,
    );

    const {
      encounter,
    } =
      await createFixture(
        "00003",
      );

    await assert.rejects(
      () =>
        requireMeowsReadAccess({
          userId:
            user.id,

          organizationId:
            unitA.id,

          encounterId:
            encounter.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "patient unlink revokes MEOWS access",
  async () => {
    const user =
      await createUser(
        "meows-unlink@example.test",
      );

    const {
      unit,
      patient,
      encounter,
    } =
      await createFixture(
        "00004",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    await db.patientOrganization.update({
      where: {
        patientId_organizationId: {
          patientId:
            patient.id,

          organizationId:
            unit.id,
        },
      },

      data: {
        unlinkedAt:
          new Date(),
      },
    });

    await assert.rejects(
      () =>
        requireMeowsReadAccess({
          userId:
            user.id,

          organizationId:
            unit.id,

          encounterId:
            encounter.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "PAP admin has no default MEOWS clinical access",
  async () => {
    const user =
      await createUser(
        "meows-pap@example.test",
      );

    const {
      unit,
      encounter,
    } =
      await createFixture(
        "00005",
      );

    await assignSystemRole({
      userId:
        user.id,

      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    });

    await assert.rejects(
      () =>
        requireMeowsReadAccess({
          userId:
            user.id,

          organizationId:
            unit.id,

          encounterId:
            encounter.id,
        }),
      AccessDeniedError,
    );
  },
);
