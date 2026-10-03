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
  createPatient,
  disablePatient,
  findPatientByCns,
  findPatientByCpf,
  getPatientById,
  reactivatePatient,
  searchPatients,
  updatePatientDemographics,
} from "../../src/server/patients/patient.service";

import {
  PatientCnsConflictError,
  PatientCpfConflictError,
  PatientNotFoundError,
} from "../../src/server/patients/patient.errors";

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
  "creates normalized patient",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "  Maria   de Souza  ",
        socialName:
          "  Maria Souza  ",
        cpf:
          "123.456.789-01",
        cns:
          "123 4567 8901 2345",
        birthDate:
          "2000-05-10",
        phone:
          "  91999999999  ",
        email:
          "  maria@example.com  ",
        city:
          "  Belém  ",
        state:
          "pa",
      });

    assert.equal(
      patient.fullName,
      "Maria de Souza",
    );

    assert.equal(
      patient.socialName,
      "Maria Souza",
    );

    assert.equal(
      patient.cpf,
      "12345678901",
    );

    assert.equal(
      patient.cns,
      "123456789012345",
    );

    assert.equal(
      patient.state,
      "PA",
    );

    assert.equal(
      patient.isActive,
      true,
    );
  },
);

test(
  "allows patient without CPF and CNS",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente sem documento",
        birthDate:
          "2002-02-02",
      });

    assert.equal(
      patient.cpf,
      null,
    );

    assert.equal(
      patient.cns,
      null,
    );
  },
);

test(
  "rejects duplicate CPF",
  async () => {
    await createPatient({
      fullName:
        "Paciente Um",
      cpf:
        "12345678901",
      birthDate:
        "2000-01-01",
    });

    await assert.rejects(
      () =>
        createPatient({
          fullName:
            "Paciente Dois",
          cpf:
            "123.456.789-01",
          birthDate:
            "2001-01-01",
        }),
      PatientCpfConflictError,
    );
  },
);

test(
  "rejects duplicate CNS",
  async () => {
    await createPatient({
      fullName:
        "Paciente Um",
      cns:
        "123456789012345",
      birthDate:
        "2000-01-01",
    });

    await assert.rejects(
      () =>
        createPatient({
          fullName:
            "Paciente Dois",
          cns:
            "123 4567 8901 2345",
          birthDate:
            "2001-01-01",
        }),
      PatientCnsConflictError,
    );
  },
);

test(
  "finds patient by normalized CPF",
  async () => {
    const created =
      await createPatient({
        fullName:
          "Paciente CPF",
        cpf:
          "11122233344",
        birthDate:
          "1999-03-04",
      });

    const found =
      await findPatientByCpf(
        "111.222.333-44",
      );

    assert.equal(
      found?.id,
      created.id,
    );
  },
);

test(
  "finds patient by normalized CNS",
  async () => {
    const created =
      await createPatient({
        fullName:
          "Paciente CNS",
        cns:
          "111222333444555",
        birthDate:
          "1998-03-04",
      });

    const found =
      await findPatientByCns(
        "111 2223 3344 4555",
      );

    assert.equal(
      found?.id,
      created.id,
    );
  },
);

test(
  "updates demographics without replacing omitted fields",
  async () => {
    const created =
      await createPatient({
        fullName:
          "Maria Original",
        cpf:
          "22233344455",
        birthDate:
          "1997-06-12",
        state:
          "PA",
      });

    const updated =
      await updatePatientDemographics(
        created.id,
        {
          fullName:
            "Maria Atualizada",
          city:
            "Belém",
        },
      );

    assert.equal(
      updated.fullName,
      "Maria Atualizada",
    );

    assert.equal(
      updated.cpf,
      "22233344455",
    );

    assert.equal(
      updated.city,
      "Belém",
    );

    assert.equal(
      updated.state,
      "PA",
    );
  },
);

test(
  "searches patient by name",
  async () => {
    await createPatient({
      fullName:
        "Ana Beatriz Ferreira",
      birthDate:
        "2001-04-20",
    });

    await createPatient({
      fullName:
        "Carla Mendes",
      birthDate:
        "2001-04-20",
    });

    const result =
      await searchPatients({
        query:
          "Beatriz",
      });

    assert.equal(
      result.length,
      1,
    );

    assert.equal(
      result[0]?.fullName,
      "Ana Beatriz Ferreira",
    );
  },
);

test(
  "disables and reactivates patient without deleting history",
  async () => {
    const created =
      await createPatient({
        fullName:
          "Paciente Ativação",
        birthDate:
          "1996-07-08",
      });

    const disabled =
      await disablePatient(
        created.id,
      );

    assert.equal(
      disabled.isActive,
      false,
    );

    const reactivated =
      await reactivatePatient(
        created.id,
      );

    assert.equal(
      reactivated.isActive,
      true,
    );
  },
);

test(
  "throws controlled error for unknown patient",
  async () => {
    await assert.rejects(
      () =>
        getPatientById(
          "00000000-0000-0000-0000-000000000000",
        ),
      PatientNotFoundError,
    );
  },
);
