import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  AllergyStatus,
  ClinicalFlagStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import {
  db,
} from "../../src/server/db/client";

import {
  createPatient,
  disablePatient,
} from "../../src/server/patients/patient.service";

import {
  linkPatientToOrganization,
} from "../../src/server/patients/patient-organization.service";

import {
  AllergyFinalizedError,
  AllergyPatientInactiveError,
} from "../../src/server/allergies/allergy.errors";

import {
  createAllergy,
  endAllergy,
  listActivePatientAllergies,
  listPatientAllergies,
  updateAllergy,
} from "../../src/server/allergies/allergy.service";

import {
  ClinicalFlagAlreadyActiveError,
  ClinicalFlagFinalizedError,
  ClinicalFlagPatientInactiveError,
} from "../../src/server/clinical-flags/clinical-flag.errors";

import {
  createClinicalFlag,
  endClinicalFlag,
  listActivePatientClinicalFlags,
  listPatientClinicalFlags,
  updateClinicalFlag,
} from "../../src/server/clinical-flags/clinical-flag.service";

const EXPECTED_DATABASE =
  "pap_saude_f03_allergies_flags_test";

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
          `UBS Allergy ${suffix}`,
        cnes:
          `68${suffix.padStart(5, "0")}`,
        isActive:
          true,
      },
    });

  const patient =
    await createPatient({
      fullName:
        `Paciente Allergy ${suffix}`,
      birthDate:
        "2000-01-01",
    });

  await linkPatientToOrganization({
    patientId:
      patient.id,
    organizationId:
      unit.id,
  });

  return {
    unit,
    patient,
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
  "creates and updates active allergy",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00001",
      );

    const allergy =
      await createAllergy({
        patientId:
          patient.id,
        substance:
          " Penicilina ",
        reaction:
          " Rash ",
      });

    assert.equal(
      allergy.status,
      AllergyStatus.ACTIVE,
    );

    assert.equal(
      allergy.substance,
      "Penicilina",
    );

    const updated =
      await updateAllergy(
        allergy.id,
        {
          reaction:
            "Urticária",
        },
      );

    assert.equal(
      updated.reaction,
      "Urticária",
    );
  },
);

test(
  "allergy lifecycle preserves historical record",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00002",
      );

    const allergy =
      await createAllergy({
        patientId:
          patient.id,
        substance:
          "Substância teste",
      });

    const ended =
      await endAllergy({
        allergyId:
          allergy.id,
        status:
          AllergyStatus.RESOLVED,
      });

    assert.equal(
      ended.status,
      AllergyStatus.RESOLVED,
    );

    assert.ok(
      ended.endedAt,
    );

    const history =
      await listPatientAllergies(
        patient.id,
      );

    assert.equal(
      history.length,
      1,
    );

    const active =
      await listActivePatientAllergies(
        patient.id,
      );

    assert.equal(
      active.length,
      0,
    );

    await assert.rejects(
      () =>
        updateAllergy(
          allergy.id,
          {
            reaction:
              "Alteração indevida",
          },
        ),
      AllergyFinalizedError,
    );
  },
);

test(
  "inactive patient cannot receive new allergy",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00003",
      );

    await disablePatient(
      patient.id,
    );

    await assert.rejects(
      () =>
        createAllergy({
          patientId:
            patient.id,
          substance:
            "Teste",
        }),
      AllergyPatientInactiveError,
    );
  },
);

test(
  "creates active clinical flag",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00004",
      );

    const flag =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          " observacao_especial ",
        label:
          " Observação especial ",
      });

    assert.equal(
      flag.code,
      "OBSERVACAO_ESPECIAL",
    );

    assert.equal(
      flag.status,
      ClinicalFlagStatus.ACTIVE,
    );

    assert.equal(
      flag.activeSlot,
      1,
    );
  },
);

test(
  "database guard prevents duplicate active clinical flag",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00005",
      );

    const input = {
      patientId:
        patient.id,
      code:
        "FLAG_TESTE",
      label:
        "Flag de teste",
    };

    await createClinicalFlag(
      input,
    );

    await assert.rejects(
      () =>
        createClinicalFlag(
          input,
        ),
      ClinicalFlagAlreadyActiveError,
    );
  },
);

test(
  "clinical flag can be resolved and later recorded again",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00006",
      );

    const flag =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          "FLAG_RECORRENTE",
        label:
          "Flag recorrente",
      });

    const ended =
      await endClinicalFlag({
        flagId:
          flag.id,
        status:
          ClinicalFlagStatus.RESOLVED,
      });

    assert.equal(
      ended.activeSlot,
      null,
    );

    assert.ok(
      ended.endedAt,
    );

    const next =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          "FLAG_RECORRENTE",
        label:
          "Nova ocorrência",
      });

    assert.equal(
      next.status,
      ClinicalFlagStatus.ACTIVE,
    );

    const history =
      await listPatientClinicalFlags(
        patient.id,
      );

    assert.equal(
      history.length,
      2,
    );

    const active =
      await listActivePatientClinicalFlags(
        patient.id,
      );

    assert.equal(
      active.length,
      1,
    );
  },
);

test(
  "resolved clinical flag cannot be edited",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00007",
      );

    const flag =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          "FLAG_IMUTAVEL",
        label:
          "Flag",
      });

    await endClinicalFlag({
      flagId:
        flag.id,
      status:
        ClinicalFlagStatus.RESOLVED,
    });

    await assert.rejects(
      () =>
        updateClinicalFlag(
          flag.id,
          {
            label:
              "Alteração indevida",
          },
        ),
      ClinicalFlagFinalizedError,
    );
  },
);

test(
  "inactive patient cannot receive new clinical flag",
  async () => {
    const {
      patient,
    } =
      await createFixture(
        "00008",
      );

    await disablePatient(
      patient.id,
    );

    await assert.rejects(
      () =>
        createClinicalFlag({
          patientId:
            patient.id,
          code:
            "FLAG_INATIVA",
          label:
            "Flag",
        }),
      ClinicalFlagPatientInactiveError,
    );
  },
);
