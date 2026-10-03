import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  db,
} from "../../src/server/db/client";

import {
  findPossiblePatientDuplicates,
  hasPossiblePatientDuplicate,
} from "../../src/server/patients/patient.deduplication";

import {
  createPatient,
} from "../../src/server/patients/patient.service";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

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
  "flags exact normalized name and birth date as possible duplicate",
  async () => {
    const original =
      await createPatient({
        fullName:
          "Maria da Silva",
        birthDate:
          "2000-05-10",
      });

    const candidates =
      await findPossiblePatientDuplicates({
        fullName:
          "  maria   da silva ",
        birthDate:
          "2000-05-10",
      });

    assert.equal(
      candidates.length,
      1,
    );

    assert.equal(
      candidates[0]?.id,
      original.id,
    );
  },
);

test(
  "same name with different birth date is not flagged",
  async () => {
    await createPatient({
      fullName:
        "Maria da Silva",
      birthDate:
        "2000-05-10",
    });

    const duplicate =
      await hasPossiblePatientDuplicate({
        fullName:
          "Maria da Silva",
        birthDate:
          "2001-05-10",
      });

    assert.equal(
      duplicate,
      false,
    );
  },
);

test(
  "possible duplicate does not merge or block records",
  async () => {
    const first =
      await createPatient({
        fullName:
          "Ana Souza",
        birthDate:
          "1999-08-20",
      });

    const second =
      await createPatient({
        fullName:
          "Ana Souza",
        birthDate:
          "1999-08-20",
      });

    assert.notEqual(
      first.id,
      second.id,
    );

    const count =
      await db.patient.count({
        where: {
          fullName:
            "Ana Souza",
        },
      });

    assert.equal(
      count,
      2,
    );
  },
);

test(
  "can exclude current patient during update review",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Carla Mendes",
        birthDate:
          "1998-04-03",
      });

    const candidates =
      await findPossiblePatientDuplicates({
        fullName:
          "Carla Mendes",
        birthDate:
          "1998-04-03",
        excludePatientId:
          patient.id,
      });

    assert.equal(
      candidates.length,
      0,
    );
  },
);
