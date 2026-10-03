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
  requireEncounterCreateAccess,
  requireEncounterReadAccess,
  requireEncounterUpdateAccess,
} from "../../src/server/encounters/encounter-access.service";

const EXPECTED_DATABASE =
  "pap_saude_f03_encounter_test";

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
        `UBS Access ${suffix}`,
      cnes:
        `62${suffix.padStart(5, "0")}`,
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
  "professional can create encounter for linked patient",
  async () => {
    const user =
      await createUser(
        "encounter-create@example.test",
      );

    const unit =
      await createUnit(
        "00001",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Encounter Access",
        birthDate:
          "2000-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
    });

    const decision =
      await requireEncounterCreateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        patientId:
          patient.id,
      });

    assert.equal(
      decision.allowed,
      true,
    );
  },
);

test(
  "professional can read and update own-unit encounter",
  async () => {
    const user =
      await createUser(
        "encounter-read@example.test",
      );

    const unit =
      await createUnit(
        "00002",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Encounter Read",
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

    const read =
      await requireEncounterReadAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        encounterId:
          encounter.id,
      });

    const update =
      await requireEncounterUpdateAccess({
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
      update.allowed,
      true,
    );
  },
);

test(
  "cross-unit encounter access is denied",
  async () => {
    const user =
      await createUser(
        "encounter-cross@example.test",
      );

    const unitA =
      await createUnit(
        "00003",
      );

    const unitB =
      await createUnit(
        "00004",
      );

    await makeProfessional(
      user.id,
      unitA.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Cross Encounter",
        birthDate:
          "2000-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unitB.id,
    });

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unitB.id,
      });

    await assert.rejects(
      () =>
        requireEncounterReadAccess({
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
  "PAP admin has no default clinical encounter access",
  async () => {
    const user =
      await createUser(
        "encounter-pap@example.test",
      );

    const unit =
      await createUnit(
        "00005",
      );

    await assignSystemRole({
      userId:
        user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    });

    const patient =
      await createPatient({
        fullName:
          "Paciente Protegida Encounter",
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

    await assert.rejects(
      () =>
        requireEncounterReadAccess({
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
