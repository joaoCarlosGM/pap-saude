import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  EncounterStatus,
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
  createPregnancy,
  completePregnancy,
} from "../../src/server/pregnancies/pregnancy.service";

import {
  EncounterFinalizedError,
  EncounterPatientNotLinkedError,
  EncounterPregnancyMismatchError,
  EncounterPregnancyNotActiveError,
  InvalidEncounterOrganizationError,
  InvalidEncounterTransitionError,
} from "../../src/server/encounters/encounter.errors";

import {
  cancelEncounter,
  completeEncounter,
  createEncounter,
  getEncounterById,
  listPatientEncounters,
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
  await db.organization.deleteMany();
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
        `UBS Encounter ${suffix}`,
      cnes:
        `61${suffix.padStart(5, "0")}`,
      isActive:
        true,
    },
  });
}

async function createLinkedPatient(
  suffix: string,
) {
  const unit =
    await createUnit(
      suffix,
    );

  const patient =
    await createPatient({
      fullName:
        `Paciente Encounter ${suffix}`,
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
    patient,
    unit,
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
  "creates encounter as draft",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00001",
      );

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unit.id,
        chiefComplaint:
          " Dor abdominal ",
      });

    assert.equal(
      encounter.status,
      EncounterStatus.DRAFT,
    );

    assert.equal(
      encounter.chiefComplaint,
      "Dor abdominal",
    );

    assert.equal(
      encounter.startedAt,
      null,
    );
  },
);

test(
  "patient must be actively linked to encounter unit",
  async () => {
    const unit =
      await createUnit(
        "00002",
      );

    const patient =
      await createPatient({
        fullName:
          "Paciente Sem Vínculo",
        birthDate:
          "2000-01-01",
      });

    await assert.rejects(
      () =>
        createEncounter({
          patientId:
            patient.id,
          organizationId:
            unit.id,
        }),
      EncounterPatientNotLinkedError,
    );
  },
);

test(
  "encounter organization must be active health unit",
  async () => {
    const municipality =
      await db.organization.create({
        data: {
          type:
            OrganizationType.MUNICIPALITY,
          status:
            OrganizationStatus.ACTIVE,
          name:
            "Município Encounter",
          isActive:
            true,
        },
      });

    const patient =
      await createPatient({
        fullName:
          "Paciente Município",
        birthDate:
          "2000-01-01",
      });

    await assert.rejects(
      () =>
        createEncounter({
          patientId:
            patient.id,
          organizationId:
            municipality.id,
        }),
      InvalidEncounterOrganizationError,
    );
  },
);

test(
  "linked pregnancy must belong to encounter patient",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00003",
      );

    const otherPatient =
      await createPatient({
        fullName:
          "Outra Gestante",
        birthDate:
          "1999-01-01",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          otherPatient.id,
      });

    await assert.rejects(
      () =>
        createEncounter({
          patientId:
            patient.id,
          organizationId:
            unit.id,
          pregnancyId:
            pregnancy.id,
        }),
      EncounterPregnancyMismatchError,
    );
  },
);

test(
  "new encounter cannot use completed pregnancy",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00004",
      );

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    await completePregnancy({
      pregnancyId:
        pregnancy.id,
    });

    await assert.rejects(
      () =>
        createEncounter({
          patientId:
            patient.id,
          organizationId:
            unit.id,
          pregnancyId:
            pregnancy.id,
        }),
      EncounterPregnancyNotActiveError,
    );
  },
);

test(
  "draft transitions to in progress then completed",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00005",
      );

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    const started =
      await startEncounter(
        encounter.id,
      );

    assert.equal(
      started.status,
      EncounterStatus.IN_PROGRESS,
    );

    assert.ok(
      started.startedAt,
    );

    const completed =
      await completeEncounter(
        encounter.id,
      );

    assert.equal(
      completed.status,
      EncounterStatus.COMPLETED,
    );

    assert.ok(
      completed.completedAt,
    );
  },
);

test(
  "draft can be cancelled with preserved reason",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00006",
      );

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    const cancelled =
      await cancelEncounter({
        encounterId:
          encounter.id,
        reason:
          " Registro criado em duplicidade ",
      });

    assert.equal(
      cancelled.status,
      EncounterStatus.CANCELLED,
    );

    assert.equal(
      cancelled.cancellationReason,
      "Registro criado em duplicidade",
    );

    assert.ok(
      cancelled.cancelledAt,
    );
  },
);

test(
  "completed encounter cannot be edited",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00007",
      );

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    await startEncounter(
      encounter.id,
    );

    await completeEncounter(
      encounter.id,
    );

    await assert.rejects(
      () =>
        updateEncounter(
          encounter.id,
          {
            chiefComplaint:
              "Alteração indevida",
          },
        ),
      EncounterFinalizedError,
    );
  },
);

test(
  "cannot complete encounter directly from draft",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00008",
      );

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    await assert.rejects(
      () =>
        completeEncounter(
          encounter.id,
        ),
      InvalidEncounterTransitionError,
    );
  },
);

test(
  "in-progress encounter cannot change occurrence or pregnancy",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00009",
      );

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    await startEncounter(
      encounter.id,
    );

    await assert.rejects(
      () =>
        updateEncounter(
          encounter.id,
          {
            occurredAt:
              "2026-01-01",
          },
        ),
      InvalidEncounterTransitionError,
    );
  },
);

test(
  "encounter history is preserved",
  async () => {
    const {
      patient,
      unit,
    } =
      await createLinkedPatient(
        "00010",
      );

    const encounter =
      await createEncounter({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    await startEncounter(
      encounter.id,
    );

    await completeEncounter(
      encounter.id,
    );

    const persisted =
      await getEncounterById(
        encounter.id,
      );

    assert.equal(
      persisted.status,
      EncounterStatus.COMPLETED,
    );

    const history =
      await listPatientEncounters(
        patient.id,
      );

    assert.equal(
      history.length,
      1,
    );

    assert.equal(
      history[0]?.id,
      encounter.id,
    );
  },
);
