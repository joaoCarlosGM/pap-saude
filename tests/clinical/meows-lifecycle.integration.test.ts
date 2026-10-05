import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  MeowsEvaluationStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import {
  db,
} from "../../src/server/db/client";

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
  createVitalSigns,
} from "../../src/server/vital-signs/vital-signs.service";

import {
  MeowsVitalSignsNotFoundError,
  evaluateEncounterMeows,
  listEncounterMeowsEvaluations,
  persistEncounterMeowsEvaluation,
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
  await db.organization.deleteMany();
}

async function createFixture(
  suffix: string,
) {
  const unit =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,

        status:
          OrganizationStatus.ACTIVE,

        name:
          `UBS MEOWS ${suffix}`,

        cnes:
          `70${suffix.padStart(5, "0")}`,

        isActive:
          true,
      },
    });

  const patient =
    await createPatient({
      fullName:
        `Paciente MEOWS ${suffix}`,

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
});

after(async () => {
  await clearFixtures();
});

test(
  "encounter without vital signs cannot be evaluated",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00001",
      );

    await assert.rejects(
      () =>
        evaluateEncounterMeows(
          encounter.id,
        ),
      MeowsVitalSignsNotFoundError,
    );
  },
);

test(
  "draft evaluation is policy unresolved rather than clinically complete",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00002",
      );

    await createVitalSigns({
      encounterId:
        encounter.id,

      systolicBp:
        120,

      diastolicBp:
        80,

      heartRate:
        90,

      respiratoryRate:
        15,

      temperature:
        36.5,

      oxygenSaturation:
        98,
    });

    const {
      result,
    } =
      await evaluateEncounterMeows(
        encounter.id,
      );

    assert.equal(
      result.status,
      MeowsEvaluationStatus
        .POLICY_UNRESOLVED,
    );

    assert.equal(
      result.totalScore,
      null,
    );

    assert.equal(
      result.clinicallyValidated,
      false,
    );
  },
);

test(
  "draft evaluation persistence preserves protocol provenance",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00003",
      );

    await createVitalSigns({
      encounterId:
        encounter.id,

      systolicBp:
        150,

      diastolicBp:
        100,

      heartRate:
        111,

      respiratoryRate:
        25,

      temperature:
        38,

      oxygenSaturation:
        96,
    });

    const evaluation =
      await persistEncounterMeowsEvaluation(
        encounter.id,
        "Avaliação sintética",
      );

    assert.equal(
      evaluation.status,
      MeowsEvaluationStatus
        .POLICY_UNRESOLVED,
    );

    assert.equal(
      evaluation.meowsScore,
      null,
    );

    assert.equal(
      evaluation.alertLevel,
      null,
    );

    assert.equal(
      evaluation.protocolStatus,
      "DRAFT_UNVALIDATED",
    );

    assert.equal(
      evaluation.clinicallyValidated,
      false,
    );

    assert.deepEqual(
      evaluation.unresolvedParameters,
      [
        "oxygenTherapy",
        "consciousness",
      ],
    );

    const history =
      await listEncounterMeowsEvaluations(
        encounter.id,
      );

    assert.equal(
      history.length,
      1,
    );
  },
);

test(
  "missing temperature persists incomplete evaluation",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00004",
      );

    await createVitalSigns({
      encounterId:
        encounter.id,

      systolicBp:
        120,

      diastolicBp:
        80,

      heartRate:
        90,

      respiratoryRate:
        15,

      temperature:
        null,

      oxygenSaturation:
        98,
    });

    const evaluation =
      await persistEncounterMeowsEvaluation(
        encounter.id,
      );

    assert.equal(
      evaluation.status,
      MeowsEvaluationStatus
        .INCOMPLETE,
    );

    assert.deepEqual(
      evaluation.missingParameters,
      [
        "temperature",
      ],
    );
  },
);
