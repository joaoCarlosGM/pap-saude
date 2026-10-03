import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  EdemaGrade,
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
  cancelEncounter,
  completeEncounter,
  createEncounter,
  startEncounter,
} from "../../src/server/encounters/encounter.service";

import {
  InvalidObstetricDataRecordedAtError,
  ObstetricDataAlreadyRecordedError,
  ObstetricDataEncounterNotEditableError,
} from "../../src/server/obstetric-data/obstetric-data.errors";

import {
  createObstetricData,
  getObstetricDataByEncounter,
  updateObstetricData,
} from "../../src/server/obstetric-data/obstetric-data.service";

const EXPECTED_DATABASE =
  "pap_saude_f03_obstetric_data_test";

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
  await db.organization.deleteMany();
}

async function createFixture(
  suffix: string,
  occurredAt?: string,
) {
  const unit =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,
        status:
          OrganizationStatus.ACTIVE,
        name:
          `UBS Obstetric ${suffix}`,
        cnes:
          `66${suffix.padStart(5, "0")}`,
        isActive:
          true,
      },
    });

  const patient =
    await createPatient({
      fullName:
        `Paciente Obstetric ${suffix}`,
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
      ...(occurredAt
        ? {
            occurredAt,
          }
        : {}),
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
  "records obstetric data for encounter",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00001",
      );

    const data =
      await createObstetricData({
        encounterId:
          encounter.id,
        uterineHeightCm:
          30.5,
        fetalHeartRate:
          142,
        fetalMovement:
          true,
        edema:
          EdemaGrade.TWO_PLUS,
        bleeding:
          false,
        weightKg:
          63.25,
        complaints:
          "  cefaleia  ",
        notes:
          " observação ",
      });

    assert.equal(
      data.encounterId,
      encounter.id,
    );

    assert.equal(
      data.fetalHeartRate,
      142,
    );

    assert.equal(
      data.edema,
      EdemaGrade.TWO_PLUS,
    );

    assert.equal(
      data.complaints,
      "cefaleia",
    );
  },
);

test(
  "only one obstetric record exists per encounter",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00002",
      );

    await createObstetricData({
      encounterId:
        encounter.id,
    });

    await assert.rejects(
      () =>
        createObstetricData({
          encounterId:
            encounter.id,
        }),
      ObstetricDataAlreadyRecordedError,
    );
  },
);

test(
  "updates obstetric data while encounter remains editable",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00003",
      );

    await createObstetricData({
      encounterId:
        encounter.id,
      edema:
        EdemaGrade.NONE,
    });

    const updated =
      await updateObstetricData(
        encounter.id,
        {
          fetalHeartRate:
            150,
          edema:
            EdemaGrade.ONE_PLUS,
        },
      );

    assert.equal(
      updated.fetalHeartRate,
      150,
    );

    assert.equal(
      updated.edema,
      EdemaGrade.ONE_PLUS,
    );
  },
);

test(
  "completed encounter preserves but locks obstetric data",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00004",
      );

    await createObstetricData({
      encounterId:
        encounter.id,
      fetalHeartRate:
        140,
    });

    await startEncounter(
      encounter.id,
    );

    await completeEncounter(
      encounter.id,
    );

    const persisted =
      await getObstetricDataByEncounter(
        encounter.id,
      );

    assert.equal(
      persisted.fetalHeartRate,
      140,
    );

    await assert.rejects(
      () =>
        updateObstetricData(
          encounter.id,
          {
            fetalHeartRate:
              150,
          },
        ),
      ObstetricDataEncounterNotEditableError,
    );
  },
);

test(
  "cancelled encounter cannot receive obstetric data",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00005",
      );

    await cancelEncounter({
      encounterId:
        encounter.id,
      reason:
        "Cancelamento de teste",
    });

    await assert.rejects(
      () =>
        createObstetricData({
          encounterId:
            encounter.id,
        }),
      ObstetricDataEncounterNotEditableError,
    );
  },
);

test(
  "recordedAt cannot precede encounter occurrence",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00006",
        "2026-10-03T12:00:00.000Z",
      );

    await assert.rejects(
      () =>
        createObstetricData({
          encounterId:
            encounter.id,
          recordedAt:
            "2026-10-03T11:59:59.000Z",
        }),
      InvalidObstetricDataRecordedAtError,
    );
  },
);

test(
  "database rejects invalid negative uterine height",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00007",
      );

    await assert.rejects(
      () =>
        db.obstetricData.create({
          data: {
            encounterId:
              encounter.id,
            uterineHeightCm:
              -1,
          },
        }),
    );
  },
);
