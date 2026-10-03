import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  ConsciousnessState,
  OrganizationStatus,
  OrganizationType,
  ProteinuriaResult,
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
  InvalidVitalSignsRecordedAtError,
  VitalSignsAlreadyRecordedError,
  VitalSignsEncounterNotEditableError,
} from "../../src/server/vital-signs/vital-signs.errors";

import {
  createVitalSigns,
  getVitalSignsByEncounter,
  updateVitalSigns,
} from "../../src/server/vital-signs/vital-signs.service";

const EXPECTED_DATABASE =
  "pap_saude_f03_vital_signs_test";

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
  occurredAt?:
    string,
) {
  const unit =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,
        status:
          OrganizationStatus.ACTIVE,
        name:
          `UBS Vital ${suffix}`,
        cnes:
          `64${suffix.padStart(5, "0")}`,
        isActive:
          true,
      },
    });

  const patient =
    await createPatient({
      fullName:
        `Paciente Vital ${suffix}`,
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
  "records vital signs for encounter",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00001",
      );

    const vitals =
      await createVitalSigns({
        encounterId:
          encounter.id,
        systolicBp:
          120,
        diastolicBp:
          80,
        heartRate:
          78,
        respiratoryRate:
          16,
        temperature:
          36.5,
        oxygenSaturation:
          98,
        consciousness:
          ConsciousnessState.ALERT,
        urineOutputMl:
          0,
        proteinuria:
          ProteinuriaResult.NOT_PERFORMED,
      });

    assert.equal(
      vitals.encounterId,
      encounter.id,
    );

    assert.equal(
      vitals.systolicBp,
      120,
    );

    assert.equal(
      vitals.proteinuria,
      ProteinuriaResult.NOT_PERFORMED,
    );
  },
);

test(
  "only one vital signs record exists per encounter",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00002",
      );

    const input = {
      encounterId:
        encounter.id,
      systolicBp:
        120,
      diastolicBp:
        80,
      heartRate:
        80,
      respiratoryRate:
        16,
    };

    await createVitalSigns(
      input,
    );

    await assert.rejects(
      () =>
        createVitalSigns(
          input,
        ),
      VitalSignsAlreadyRecordedError,
    );
  },
);

test(
  "updates vital signs while encounter remains editable",
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
        120,
      diastolicBp:
        80,
      heartRate:
        80,
      respiratoryRate:
        16,
    });

    const updated =
      await updateVitalSigns(
        encounter.id,
        {
          heartRate:
            90,
          oxygenSaturation:
            97,
        },
      );

    assert.equal(
      updated.heartRate,
      90,
    );

    assert.equal(
      updated.oxygenSaturation,
      97,
    );
  },
);

test(
  "completed encounter preserves but locks vital signs",
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
        80,
      respiratoryRate:
        16,
    });

    await startEncounter(
      encounter.id,
    );

    await completeEncounter(
      encounter.id,
    );

    const persisted =
      await getVitalSignsByEncounter(
        encounter.id,
      );

    assert.equal(
      persisted.heartRate,
      80,
    );

    await assert.rejects(
      () =>
        updateVitalSigns(
          encounter.id,
          {
            heartRate:
              99,
          },
        ),
      VitalSignsEncounterNotEditableError,
    );
  },
);

test(
  "cancelled encounter cannot receive vital signs",
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
        createVitalSigns({
          encounterId:
            encounter.id,
          systolicBp:
            120,
          diastolicBp:
            80,
          heartRate:
            80,
          respiratoryRate:
            16,
        }),
      VitalSignsEncounterNotEditableError,
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
        createVitalSigns({
          encounterId:
            encounter.id,
          systolicBp:
            120,
          diastolicBp:
            80,
          heartRate:
            80,
          respiratoryRate:
            16,
          recordedAt:
            "2026-10-03T11:59:59.000Z",
        }),
      InvalidVitalSignsRecordedAtError,
    );
  },
);

test(
  "database rejects structurally invalid oxygen saturation",
  async () => {
    const {
      encounter,
    } =
      await createFixture(
        "00007",
      );

    await assert.rejects(
      () =>
        db.vitalSigns.create({
          data: {
            encounterId:
              encounter.id,
            systolicBp:
              120,
            diastolicBp:
              80,
            heartRate:
              80,
            respiratoryRate:
              16,
            oxygenSaturation:
              101,
          },
        }),
    );
  },
);
