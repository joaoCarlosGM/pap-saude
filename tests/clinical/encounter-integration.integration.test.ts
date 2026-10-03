import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  EncounterStatus,
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import {
  db,
} from "../../src/server/db/client";

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
  createPregnancy,
} from "../../src/server/pregnancies/pregnancy.service";

import {
  requireEncounterCreateAccess,
  requireEncounterReadAccess,
  requireEncounterUpdateAccess,
} from "../../src/server/encounters/encounter-access.service";

import {
  completeEncounter,
  createEncounter,
  getEncounterById,
  listOrganizationEncounters,
  startEncounter,
  updateEncounter,
} from "../../src/server/encounters/encounter.service";

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
  "complete patient pregnancy encounter flow works end to end",
  async () => {
    const user =
      await db.user.create({
        data: {
          email:
            "encounter-e2e@example.test",
          displayName:
            "Encounter E2E",
        },
      });

    const unit =
      await db.organization.create({
        data: {
          type:
            OrganizationType.HEALTH_UNIT,
          status:
            OrganizationStatus.ACTIVE,
          name:
            "UBS Encounter E2E",
          cnes:
            "6300001",
          isActive:
            true,
        },
      });

    await db.membership.create({
      data: {
        userId:
          user.id,
        organizationId:
          unit.id,
        status:
          MembershipStatus.ACTIVE,
      },
    });

    await assignSystemRole({
      userId:
        user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId:
        unit.id,
    });

    const patient =
      await createPatient({
        fullName:
          "Paciente Fluxo Encounter",
        birthDate:
          "2000-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
      isPrimary:
        true,
    });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
        lastMenstrualDate:
          "2026-01-01",
      });

    await requireEncounterCreateAccess({
      userId:
        user.id,
      organizationId:
        unit.id,
      patientId:
        patient.id,
    });

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        pregnancyId:
          pregnancy.id,
        organizationId:
          unit.id,
        chiefComplaint:
          "Cefaleia",
        occurredAt:
          "2026-03-01T12:00:00.000Z",
      });

    assert.equal(
      encounter.status,
      EncounterStatus.DRAFT,
    );

    assert.equal(
      encounter.pregnancyId,
      pregnancy.id,
    );

    await requireEncounterUpdateAccess({
      userId:
        user.id,
      organizationId:
        unit.id,
      encounterId:
        encounter.id,
    });

    await updateEncounter(
      encounter.id,
      {
        chiefComplaint:
          "Cefaleia e náusea",
      },
    );

    const started =
      await startEncounter(
        encounter.id,
      );

    assert.equal(
      started.status,
      EncounterStatus.IN_PROGRESS,
    );

    await requireEncounterReadAccess({
      userId:
        user.id,
      organizationId:
        unit.id,
      encounterId:
        encounter.id,
    });

    const completed =
      await completeEncounter(
        encounter.id,
      );

    assert.equal(
      completed.status,
      EncounterStatus.COMPLETED,
    );

    const persisted =
      await getEncounterById(
        encounter.id,
      );

    assert.equal(
      persisted.patientId,
      patient.id,
    );

    assert.equal(
      persisted.pregnancyId,
      pregnancy.id,
    );

    assert.equal(
      persisted.organizationId,
      unit.id,
    );

    assert.equal(
      persisted.chiefComplaint,
      "Cefaleia e náusea",
    );

    const unitHistory =
      await listOrganizationEncounters(
        unit.id,
        {
          patientId:
            patient.id,
        },
      );

    assert.equal(
      unitHistory.length,
      1,
    );

    assert.equal(
      unitHistory[0]?.id,
      encounter.id,
    );
  },
);
