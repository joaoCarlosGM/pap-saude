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
  requirePatientCreateAccess,
  requirePatientReadAccess,
  requirePatientUpdateDemographicsAccess,
} from "../../src/server/patients/patient-access.service";

import {
  linkPatientToOrganization,
  unlinkPatientFromOrganization,
} from "../../src/server/patients/patient-organization.service";

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
      isActive: true,
    },
  });
}

async function activateMembership(
  userId: string,
  organizationId: string,
) {
  return db.membership.create({
    data: {
      userId,
      organizationId,
      status:
        MembershipStatus.ACTIVE,
    },
  });
}

async function makeProfessional(
  userId: string,
  organizationId: string,
) {
  await activateMembership(
    userId,
    organizationId,
  );

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
  "professional can create patient in own health unit",
  async () => {
    const user =
      await createUser(
        "professional-create@example.test",
      );

    const unit =
      await createUnit(
        "UBS A",
        "4000001",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const decision =
      await requirePatientCreateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
      });

    assert.equal(
      decision.allowed,
      true,
    );
  },
);

test(
  "professional can read linked patient in own health unit",
  async () => {
    const user =
      await createUser(
        "professional-read@example.test",
      );

    const unit =
      await createUnit(
        "UBS A",
        "4000002",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Acesso",
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
      await requirePatientReadAccess({
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
  "professional cannot read patient that is not linked to own health unit",
  async () => {
    const user =
      await createUser(
        "professional-unlinked@example.test",
      );

    const unitA =
      await createUnit(
        "UBS A",
        "4000003",
      );

    const unitB =
      await createUnit(
        "UBS B",
        "4000004",
      );

    await makeProfessional(
      user.id,
      unitA.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Outra UBS",
        birthDate:
          "2000-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unitB.id,
    });

    await assert.rejects(
      () =>
        requirePatientReadAccess({
          userId:
            user.id,
          organizationId:
            unitA.id,
          patientId:
            patient.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "unlinked patient immediately loses organization clinical access",
  async () => {
    const user =
      await createUser(
        "professional-unlink@example.test",
      );

    const unit =
      await createUnit(
        "UBS A",
        "4000005",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Desvinculada",
        birthDate:
          "2000-01-01",
      });

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

    await assert.rejects(
      () =>
        requirePatientReadAccess({
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
  "professional can update demographics of linked patient",
  async () => {
    const user =
      await createUser(
        "professional-update@example.test",
      );

    const unit =
      await createUnit(
        "UBS A",
        "4000006",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const patient =
      await createPatient({
        fullName:
          "Paciente Update",
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
      await requirePatientUpdateDemographicsAccess({
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
  "suspended membership revokes patient access",
  async () => {
    const user =
      await createUser(
        "professional-suspended@example.test",
      );

    const unit =
      await createUnit(
        "UBS A",
        "4000007",
      );

    const membership =
      await activateMembership(
        user.id,
        unit.id,
      );

    await assignSystemRole({
      userId:
        user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId:
        unit.id,
    });

    const patient =
      await createPatient({
        fullName:
          "Paciente Suspensa",
        birthDate:
          "2000-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
    });

    await db.membership.update({
      where: {
        id:
          membership.id,
      },
      data: {
        status:
          MembershipStatus.SUSPENDED,
      },
    });

    await assert.rejects(
      () =>
        requirePatientReadAccess({
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
  "PAP admin does not receive clinical patient access",
  async () => {
    const user =
      await createUser(
        "pap-admin-clinical@example.test",
      );

    const unit =
      await createUnit(
        "UBS PAP Test",
        "4000008",
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
          "Paciente Protegida",
        birthDate:
          "2000-01-01",
      });

    await linkPatientToOrganization({
      patientId:
        patient.id,
      organizationId:
        unit.id,
    });

    await assert.rejects(
      () =>
        requirePatientReadAccess({
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
