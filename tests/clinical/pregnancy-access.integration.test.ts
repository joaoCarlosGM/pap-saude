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
} from "../../src/server/patients/patient-organization.service";

import {
  createPregnancy,
} from "../../src/server/pregnancies/pregnancy.service";

import {
  requirePregnancyCreateAccess,
  requirePregnancyReadAccess,
  requirePregnancyUpdateAccess,
} from "../../src/server/pregnancies/pregnancy-access.service";

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

async function createUnit(
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
  "professional can create pregnancy for linked patient",
  async () => {
    const user =
      await createUser(
        "pregnancy-create@example.test",
      );

    const unit =
      await createUnit(
        "UBS Gestação A",
        "5000001",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Gestação A",
        birthDate:
          "2000-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
    });

    const decision =
      await requirePregnancyCreateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        patientId:
          patient.id,
      });

    assert.equal(
      decision.allowed,
      true,
    );
  },
);

test(
  "professional cannot create pregnancy for unlinked patient",
  async () => {
    const user =
      await createUser(
        "pregnancy-unlinked@example.test",
      );

    const unit =
      await createUnit(
        "UBS Gestação B",
        "5000002",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Gestação B",
        birthDate:
          "2000-01-01",
      });

    await assert.rejects(
      () =>
        requirePregnancyCreateAccess({
          userId:
            user.id,
          organizationId:
            unit.id,
          patientId:
            patient.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "professional can read pregnancy of linked patient",
  async () => {
    const user =
      await createUser(
        "pregnancy-read@example.test",
      );

    const unit =
      await createUnit(
        "UBS Gestação C",
        "5000003",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Gestação C",
        birthDate:
          "2000-01-01",
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

    const decision =
      await requirePregnancyReadAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        pregnancyId:
          pregnancy.id,
      });

    assert.equal(
      decision.allowed,
      true,
    );
  },
);

test(
  "professional cannot read pregnancy from patient linked to another unit",
  async () => {
    const user =
      await createUser(
        "pregnancy-cross-unit@example.test",
      );

    const unitA =
      await createUnit(
        "UBS Gestação D1",
        "5000004",
      );

    const unitB =
      await createUnit(
        "UBS Gestação D2",
        "5000005",
      );

    await makeProfessional(
      user.id,
      unitA.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Outra Unidade",
        birthDate:
          "2000-01-01",
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
            user.id,
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
  "professional can update pregnancy of linked patient",
  async () => {
    const user =
      await createUser(
        "pregnancy-update@example.test",
      );

    const unit =
      await createUnit(
        "UBS Gestação E",
        "5000006",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Gestação E",
        birthDate:
          "2000-01-01",
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

    const decision =
      await requirePregnancyUpdateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        pregnancyId:
          pregnancy.id,
      });

    assert.equal(
      decision.allowed,
      true,
    );
  },
);

test(
  "PAP admin does not receive pregnancy clinical access",
  async () => {
    const user =
      await createUser(
        "pregnancy-pap-admin@example.test",
      );

    const unit =
      await createUnit(
        "UBS Gestação F",
        "5000007",
      );

    await assignSystemRole({
      userId:
        user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    });

    const patient =
      await createPatient({
        fullName:
          "Paciente Protegida Gestação",
        birthDate:
          "2000-01-01",
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

    await assert.rejects(
      () =>
        requirePregnancyReadAccess({
          userId:
            user.id,
          organizationId:
            unit.id,
          pregnancyId:
            pregnancy.id,
        }),
      AccessDeniedError,
    );
  },
);
