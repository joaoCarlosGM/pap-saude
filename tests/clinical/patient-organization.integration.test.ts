import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
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
  listOrganizationPatients,
  listPatientOrganizations,
  reactivatePatientOrganizationLink,
  unlinkPatientFromOrganization,
} from "../../src/server/patients/patient-organization.service";

import {
  InactivePatientOrganizationLinkError,
  InvalidPatientOrganizationTargetError,
  PatientAlreadyLinkedError,
  PatientMedicalRecordConflictError,
} from "../../src/server/patients/patient-organization.errors";

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

  await db.roleAssignment.deleteMany();
  await db.membership.deleteMany();

  await db.organization.deleteMany();
}

async function createHealthUnit(
  name: string,
  cnes: string,
) {
  return db.organization.create({
    data: {
      type:
        OrganizationType.HEALTH_UNIT,
      status:
        OrganizationStatus.ACTIVE,
      name,
      cnes,
      isActive: true,
    },
  });
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
  "links global patient to active health unit",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Maria Link",
        birthDate:
          "2000-01-01",
      });

    const unit =
      await createHealthUnit(
        "UBS A",
        "3000001",
      );

    const link =
      await linkPatientToOrganization({
        patientId:
          patient.id,
        organizationId:
          unit.id,
        medicalRecordNo:
          "  000123  ",
        isPrimary:
          true,
      });

    assert.equal(
      link.patientId,
      patient.id,
    );

    assert.equal(
      link.organizationId,
      unit.id,
    );

    assert.equal(
      link.medicalRecordNo,
      "000123",
    );

    assert.equal(
      link.isPrimary,
      true,
    );

    assert.equal(
      link.unlinkedAt,
      null,
    );
  },
);

test(
  "blocks duplicate active patient organization link",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Duplicado",
        birthDate:
          "2000-01-01",
      });

    const unit =
      await createHealthUnit(
        "UBS A",
        "3000002",
      );

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
    });

    await assert.rejects(
      () =>
        linkPatientToOrganization({
          patientId:
            patient.id,
          organizationId:
            unit.id,
        }),
      PatientAlreadyLinkedError,
    );
  },
);

test(
  "unlink preserves relationship history",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Histórico",
        birthDate:
          "2000-01-01",
      });

    const unit =
      await createHealthUnit(
        "UBS A",
        "3000003",
      );

    const link =
      await linkPatientToOrganization({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    const unlinked =
      await unlinkPatientFromOrganization(
        patient.id,
        unit.id,
      );

    assert.equal(
      unlinked.id,
      link.id,
    );

    assert.ok(
      unlinked.unlinkedAt,
    );

    const persisted =
      await db.patientOrganization.findUnique({
        where: {
          id: link.id,
        },
      });

    assert.ok(
      persisted,
    );
  },
);

test(
  "reactivates historical patient organization link",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Reativada",
        birthDate:
          "2000-01-01",
      });

    const unit =
      await createHealthUnit(
        "UBS A",
        "3000004",
      );

    const original =
      await linkPatientToOrganization({
        patientId:
          patient.id,
        organizationId:
          unit.id,
      });

    await unlinkPatientFromOrganization(
      patient.id,
      unit.id,
    );

    const reactivated =
      await reactivatePatientOrganizationLink({
        patientId:
          patient.id,
        organizationId:
          unit.id,
        isPrimary:
          true,
      });

    assert.equal(
      reactivated.id,
      original.id,
    );

    assert.equal(
      reactivated.unlinkedAt,
      null,
    );

    assert.equal(
      reactivated.isPrimary,
      true,
    );
  },
);

test(
  "only one active organization remains primary after primary switch",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Primária",
        birthDate:
          "2000-01-01",
      });

    const unitA =
      await createHealthUnit(
        "UBS A",
        "3000005",
      );

    const unitB =
      await createHealthUnit(
        "UBS B",
        "3000006",
      );

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unitA.id,
      isPrimary:
        true,
    });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unitB.id,
      isPrimary:
        true,
    });

    const links =
      await listPatientOrganizations(
        patient.id,
      );

    assert.equal(
      links.length,
      2,
    );

    assert.equal(
      links.filter(
        (entry) =>
          entry.isPrimary,
      ).length,
      1,
    );

    assert.equal(
      links.find(
        (entry) =>
          entry.isPrimary,
      )?.organizationId,
      unitB.id,
    );
  },
);

test(
  "lists patients linked to health unit",
  async () => {
    const patientA =
      await createPatient({
        fullName:
          "Paciente A",
        birthDate:
          "1995-01-01",
      });

    const patientB =
      await createPatient({
        fullName:
          "Paciente B",
        birthDate:
          "1996-01-01",
      });

    const unit =
      await createHealthUnit(
        "UBS Lista",
        "3000007",
      );

    await linkPatientToOrganization({
      patientId:
        patientA.id,
      organizationId:
        unit.id,
    });

    await linkPatientToOrganization({
      patientId:
        patientB.id,
      organizationId:
        unit.id,
    });

    const patients =
      await listOrganizationPatients(
        unit.id,
      );

    assert.equal(
      patients.length,
      2,
    );
  },
);

test(
  "rejects patient link to municipality",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Município",
        birthDate:
          "2000-01-01",
      });

    const municipality =
      await db.organization.create({
        data: {
          type:
            OrganizationType.MUNICIPALITY,
          status:
            OrganizationStatus.ACTIVE,
          name:
            "Belém",
          isActive:
            true,
        },
      });

    await assert.rejects(
      () =>
        linkPatientToOrganization({
          patientId:
            patient.id,
          organizationId:
            municipality.id,
        }),
      InvalidPatientOrganizationTargetError,
    );
  },
);

test(
  "rejects link for inactive patient",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Inativa",
        birthDate:
          "2000-01-01",
      });

    const unit =
      await createHealthUnit(
        "UBS Inativa Test",
        "3000008",
      );

    await disablePatient(
      patient.id,
    );

    await assert.rejects(
      () =>
        linkPatientToOrganization({
          patientId:
            patient.id,
          organizationId:
            unit.id,
        }),
      InactivePatientOrganizationLinkError,
    );
  },
);

test(
  "medical record number must be unique inside organization",
  async () => {
    const patientA =
      await createPatient({
        fullName:
          "Paciente Prontuário A",
        birthDate:
          "1990-01-01",
      });

    const patientB =
      await createPatient({
        fullName:
          "Paciente Prontuário B",
        birthDate:
          "1991-01-01",
      });

    const unit =
      await createHealthUnit(
        "UBS Prontuário",
        "3000009",
      );

    await linkPatientToOrganization({
      patientId:
        patientA.id,
      organizationId:
        unit.id,
      medicalRecordNo:
        "ABC-001",
    });

    await assert.rejects(
      () =>
        linkPatientToOrganization({
          patientId:
            patientB.id,
          organizationId:
            unit.id,
          medicalRecordNo:
            "ABC-001",
        }),
      PatientMedicalRecordConflictError,
    );
  },
);
