import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  PregnancyStatus,
} from "@prisma/client";

import {
  db,
} from "../../src/server/db/client";

import {
  createPatient,
  disablePatient,
} from "../../src/server/patients/patient.service";

import {
  ActivePregnancyConflictError,
  InactivePatientPregnancyError,
  PregnancyAlreadyEndedError,
  PregnancyNotFoundError,
} from "../../src/server/pregnancies/pregnancy.errors";

import {
  completePregnancy,
  createPregnancy,
  getActivePregnancyForPatient,
  getPregnancyById,
  interruptPregnancy,
  listPatientPregnancies,
  updatePregnancy,
} from "../../src/server/pregnancies/pregnancy.service";

const EXPECTED_DATABASE =
  "pap_saude_f03_pregnancy_test";

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
  await db.patientOrganization.deleteMany();
  await db.clinicalEvaluation.deleteMany();
  await db.allergy.deleteMany();
  await db.vitalSigns.deleteMany();
  await db.obstetricData.deleteMany();
  await db.encounter.deleteMany();
  await db.pregnancy.deleteMany();
  await db.patient.deleteMany();
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
  "creates active pregnancy episode",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Teste",
        birthDate:
          "2000-01-01",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
        lastMenstrualDate:
          "2026-08-01",
        estimatedDueDate:
          "2027-05-08",
        gravida:
          1,
        parity:
          0,
      });

    assert.equal(
      pregnancy.patientId,
      patient.id,
    );

    assert.equal(
      pregnancy.status,
      PregnancyStatus.ACTIVE,
    );

    assert.equal(
      pregnancy.activeSlot,
      1,
    );

    assert.equal(
      pregnancy.endedAt,
      null,
    );
  },
);

test(
  "allows pregnancy without DUM or DPP",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Sem Data",
        birthDate:
          "1999-01-01",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    assert.equal(
      pregnancy.lastMenstrualDate,
      null,
    );

    assert.equal(
      pregnancy.estimatedDueDate,
      null,
    );
  },
);

test(
  "blocks second active pregnancy for same patient",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Única",
        birthDate:
          "1998-01-01",
      });

    await createPregnancy({
      patientId:
        patient.id,
    });

    await assert.rejects(
      () =>
        createPregnancy({
          patientId:
            patient.id,
        }),
      ActivePregnancyConflictError,
    );
  },
);

test(
  "database unique guard blocks concurrent active episodes",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Corrida",
        birthDate:
          "1997-01-01",
      });

    const results =
      await Promise.allSettled([
        createPregnancy({
          patientId:
            patient.id,
        }),
        createPregnancy({
          patientId:
            patient.id,
        }),
      ]);

    const fulfilled =
      results.filter(
        (result) =>
          result.status ===
          "fulfilled",
      );

    const rejected =
      results.filter(
        (result) =>
          result.status ===
          "rejected",
      );

    assert.equal(
      fulfilled.length,
      1,
    );

    assert.equal(
      rejected.length,
      1,
    );

    assert.ok(
      rejected[0]?.status ===
        "rejected" &&
      rejected[0].reason instanceof
        ActivePregnancyConflictError,
    );
  },
);

test(
  "inactive patient cannot start pregnancy episode",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Inativa",
        birthDate:
          "1996-01-01",
      });

    await disablePatient(
      patient.id,
    );

    await assert.rejects(
      () =>
        createPregnancy({
          patientId:
            patient.id,
        }),
      InactivePatientPregnancyError,
    );
  },
);

test(
  "updates active pregnancy data",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Update",
        birthDate:
          "1995-01-01",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    const updated =
      await updatePregnancy(
        pregnancy.id,
        {
          lastMenstrualDate:
            "2026-07-10",
          gravida:
            2,
          parity:
            1,
        },
      );

    assert.equal(
      updated.gravida,
      2,
    );

    assert.equal(
      updated.parity,
      1,
    );

    assert.ok(
      updated.lastMenstrualDate,
    );
  },
);

test(
  "completes pregnancy and releases active slot",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Completa",
        birthDate:
          "1994-01-01",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    const completed =
      await completePregnancy({
        pregnancyId:
          pregnancy.id,
      });

    assert.equal(
      completed.status,
      PregnancyStatus.COMPLETED,
    );

    assert.equal(
      completed.activeSlot,
      null,
    );

    assert.ok(
      completed.endedAt,
    );

    const nextPregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    assert.equal(
      nextPregnancy.status,
      PregnancyStatus.ACTIVE,
    );
  },
);

test(
  "interrupts pregnancy and preserves episode",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Interrompida",
        birthDate:
          "1993-01-01",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    const interrupted =
      await interruptPregnancy({
        pregnancyId:
          pregnancy.id,
      });

    assert.equal(
      interrupted.status,
      PregnancyStatus.INTERRUPTED,
    );

    const persisted =
      await db.pregnancy.findUnique({
        where: {
          id:
            pregnancy.id,
        },
      });

    assert.ok(
      persisted,
    );
  },
);

test(
  "ended pregnancy cannot be edited",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Encerrada",
        birthDate:
          "1992-01-01",
      });

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
        updatePregnancy(
          pregnancy.id,
          {
            gravida:
              3,
          },
        ),
      PregnancyAlreadyEndedError,
    );
  },
);

test(
  "ended pregnancy cannot be ended twice",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Finalizada",
        birthDate:
          "1991-01-01",
      });

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
        interruptPregnancy({
          pregnancyId:
            pregnancy.id,
        }),
      PregnancyAlreadyEndedError,
    );
  },
);

test(
  "gets active pregnancy for patient",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Atual",
        birthDate:
          "1990-01-01",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    const active =
      await getActivePregnancyForPatient(
        patient.id,
      );

    assert.equal(
      active?.id,
      pregnancy.id,
    );
  },
);

test(
  "lists pregnancy history newest first",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Gestante Histórico",
        birthDate:
          "1989-01-01",
      });

    const first =
      await createPregnancy({
        patientId:
          patient.id,
      });

    await completePregnancy({
      pregnancyId:
        first.id,
      });

    const second =
      await createPregnancy({
        patientId:
          patient.id,
      });

    const history =
      await listPatientPregnancies(
        patient.id,
      );

    assert.equal(
      history.length,
      2,
    );

    assert.equal(
      history[0]?.id,
      second.id,
    );
  },
);

test(
  "throws controlled error for unknown pregnancy",
  async () => {
    await assert.rejects(
      () =>
        getPregnancyById(
          "00000000-0000-0000-0000-000000000000",
        ),
      PregnancyNotFoundError,
    );
  },
);
