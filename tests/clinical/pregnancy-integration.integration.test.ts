import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
  PregnancyStatus,
} from "@prisma/client";

import {
  db,
} from "../../src/server/db/client";

import {
  bootstrapSystemIam,
} from "../../src/server/iam/bootstrap.service";

import {
  AccessDeniedError,
} from "../../src/server/iam/authorization.errors";

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
  unlinkPatientFromOrganization,
} from "../../src/server/patients/patient-organization.service";

import {
  calculateEstimatedDueDate,
  calculateGestationalAge,
} from "../../src/server/pregnancies/gestational-dating";

import {
  requirePregnancyCreateAccess,
  requirePregnancyReadAccess,
  requirePregnancyUpdateAccess,
} from "../../src/server/pregnancies/pregnancy-access.service";

import {
  completePregnancy,
  createPregnancy,
  getActivePregnancyForPatient,
  listPatientPregnancies,
  updatePregnancy,
} from "../../src/server/pregnancies/pregnancy.service";

import {
  PregnancyAlreadyEndedError,
} from "../../src/server/pregnancies/pregnancy.errors";

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

  await db.roleAssignment.deleteMany();
  await db.rolePermission.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();

  await db.membership.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();
}

async function createUser(
  email: string,
) {
  return db.user.create({
    data: {
      email,
      displayName:
        email,
    },
  });
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
      isActive:
        true,
    },
  });
}

async function makeProfessional(
  userId: string,
  organizationId: string,
) {
  await db.membership.create({
    data: {
      userId,
      organizationId,
      status:
        MembershipStatus.ACTIVE,
    },
  });

  await assignSystemRole({
    userId,
    roleKey:
      SYSTEM_ROLE_KEYS.PROFESSIONAL,
    organizationId,
  });
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
  "complete clinical pregnancy flow works end to end",
  async () => {
    const professional =
      await createUser(
        "pregnancy-e2e@example.test",
      );

    const unit =
      await createHealthUnit(
        "UBS Integração Gestação",
        "5100001",
      );

    await makeProfessional(
      professional.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Fluxo Gestacional",
        birthDate:
          "2000-04-15",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
      isPrimary:
        true,
    });

    await requirePregnancyCreateAccess({
      userId:
        professional.id,
      organizationId:
        unit.id,
      patientId:
        patient.id,
    });

    const calculatedDueDate =
      calculateEstimatedDueDate(
        "2026-01-01",
      );

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
        lastMenstrualDate:
          "2026-01-01",
        estimatedDueDate:
          calculatedDueDate,
        gravida:
          1,
        parity:
          0,
      });

    await requirePregnancyReadAccess({
      userId:
        professional.id,
      organizationId:
        unit.id,
      pregnancyId:
        pregnancy.id,
    });

    await requirePregnancyUpdateAccess({
      userId:
        professional.id,
      organizationId:
        unit.id,
      pregnancyId:
        pregnancy.id,
    });

    const updated =
      await updatePregnancy(
        pregnancy.id,
        {
          firstPrenatalAt:
            "2026-02-01",
        },
      );

    assert.ok(
      updated.firstPrenatalAt,
    );

    const age =
      calculateGestationalAge(
        pregnancy.lastMenstrualDate!,
        "2026-03-13",
      );

    assert.equal(
      age.weeks,
      10,
    );

    assert.equal(
      age.days,
      1,
    );

    const completed =
      await completePregnancy({
        pregnancyId:
          pregnancy.id,
        endedAt:
          "2026-09-30",
      });

    assert.equal(
      completed.status,
      PregnancyStatus.COMPLETED,
    );

    assert.equal(
      completed.activeSlot,
      null,
    );

    const active =
      await getActivePregnancyForPatient(
        patient.id,
      );

    assert.equal(
      active,
      null,
    );

    const history =
      await listPatientPregnancies(
        patient.id,
      );

    assert.equal(
      history.length,
      1,
    );

    assert.equal(
      history[0]?.id,
      pregnancy.id,
    );
  },
);

test(
  "completed pregnancy remains historical and next episode can start",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Histórico Gestacional",
        birthDate:
          "1998-05-20",
      });

    const first =
      await createPregnancy({
        patientId:
          patient.id,
        lastMenstrualDate:
          "2025-01-01",
      });

    await completePregnancy({
      pregnancyId:
        first.id,
      endedAt:
        "2025-09-01",
    });

    const second =
      await createPregnancy({
        patientId:
          patient.id,
        lastMenstrualDate:
          "2026-01-15",
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
      second.status,
      PregnancyStatus.ACTIVE,
    );

    const persistedFirst =
      await db.pregnancy.findUnique({
        where: {
          id:
            first.id,
        },
      });

    assert.equal(
      persistedFirst?.status,
      PregnancyStatus.COMPLETED,
    );

    assert.ok(
      persistedFirst?.endedAt,
    );
  },
);

test(
  "unlinking patient immediately revokes pregnancy access",
  async () => {
    const professional =
      await createUser(
        "pregnancy-unlink-e2e@example.test",
      );

    const unit =
      await createHealthUnit(
        "UBS Revogação Gestação",
        "5100002",
      );

    await makeProfessional(
      professional.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Revogação",
        birthDate:
          "1999-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
    });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    await requirePregnancyReadAccess({
      userId:
        professional.id,
      organizationId:
        unit.id,
      pregnancyId:
        pregnancy.id,
    });

    await unlinkPatientFromOrganization(
      patient.id,
      unit.id,
    );

    await assert.rejects(
      () =>
        requirePregnancyReadAccess({
          userId:
            professional.id,
          organizationId:
            unit.id,
          pregnancyId:
            pregnancy.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "cross-unit pregnancy access is denied",
  async () => {
    const professional =
      await createUser(
        "pregnancy-cross-e2e@example.test",
      );

    const unitA =
      await createHealthUnit(
        "UBS Origem",
        "5100003",
      );

    const unitB =
      await createHealthUnit(
        "UBS Destino",
        "5100004",
      );

    await makeProfessional(
      professional.id,
      unitA.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Cross Unit",
        birthDate:
          "1997-03-10",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unitB.id,
    });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
      });

    await assert.rejects(
      () =>
        requirePregnancyReadAccess({
          userId:
            professional.id,
          organizationId:
            unitA.id,
          pregnancyId:
            pregnancy.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "completed pregnancy cannot be modified through lifecycle service",
  async () => {
    const patient =
      await createPatient({
        fullName:
          "Paciente Imutável",
        birthDate:
          "1996-07-10",
      });

    const pregnancy =
      await createPregnancy({
        patientId:
          patient.id,
        lastMenstrualDate:
          "2026-01-01",
      });

    await completePregnancy({
      pregnancyId:
        pregnancy.id,
        endedAt:
          "2026-09-01",
    });

    await assert.rejects(
      () =>
        updatePregnancy(
          pregnancy.id,
          {
            gravida:
              2,
          },
        ),
      PregnancyAlreadyEndedError,
    );
  },
);
