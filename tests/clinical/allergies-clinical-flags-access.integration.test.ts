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
  AccessDeniedError,
} from "../../src/server/iam/authorization.errors";

import {
  bootstrapSystemIam,
} from "../../src/server/iam/bootstrap.service";

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
  createAllergy,
} from "../../src/server/allergies/allergy.service";

import {
  requireAllergyCreateAccess,
  requireAllergyReadAccess,
  requireAllergyUpdateAccess,
} from "../../src/server/allergies/allergy-access.service";

import {
  createClinicalFlag,
} from "../../src/server/clinical-flags/clinical-flag.service";

import {
  requireClinicalFlagCreateAccess,
  requireClinicalFlagReadAccess,
  requireClinicalFlagUpdateAccess,
} from "../../src/server/clinical-flags/clinical-flag-access.service";

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
  suffix: string,
) {
  return db.organization.create({
    data: {
      type:
        OrganizationType.HEALTH_UNIT,
      status:
        OrganizationStatus.ACTIVE,
      name:
        `UBS Flag Access ${suffix}`,
      cnes:
        `69${suffix.padStart(5, "0")}`,
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

async function createFixture(
  suffix: string,
) {
  const unit =
    await createUnit(
      suffix,
    );

  const patient =
    await createPatient({
      fullName:
        `Paciente Flag Access ${suffix}`,
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
  await bootstrapSystemIam();
});

after(async () => {
  await clearFixtures();
});

test(
  "professional has allergy access for linked patient",
  async () => {
    const user =
      await createUser(
        "allergy-own@example.test",
      );

    const {
      unit,
      patient,
    } =
      await createFixture(
        "00001",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const create =
      await requireAllergyCreateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        patientId:
          patient.id,
      });

    assert.equal(
      create.allowed,
      true,
    );

    const allergy =
      await createAllergy({
        patientId:
          patient.id,
        substance:
          "Teste",
      });

    const read =
      await requireAllergyReadAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        allergyId:
          allergy.id,
      });

    const update =
      await requireAllergyUpdateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        allergyId:
          allergy.id,
      });

    assert.equal(
      read.allowed,
      true,
    );

    assert.equal(
      update.allowed,
      true,
    );
  },
);

test(
  "professional has clinical flag access for linked patient",
  async () => {
    const user =
      await createUser(
        "flag-own@example.test",
      );

    const {
      unit,
      patient,
    } =
      await createFixture(
        "00002",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const create =
      await requireClinicalFlagCreateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        patientId:
          patient.id,
      });

    assert.equal(
      create.allowed,
      true,
    );

    const flag =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          "FLAG_TESTE",
        label:
          "Flag teste",
      });

    const read =
      await requireClinicalFlagReadAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        flagId:
          flag.id,
      });

    const update =
      await requireClinicalFlagUpdateAccess({
        userId:
          user.id,
        organizationId:
          unit.id,
        flagId:
          flag.id,
      });

    assert.equal(
      read.allowed,
      true,
    );

    assert.equal(
      update.allowed,
      true,
    );
  },
);

test(
  "cross-unit allergy and clinical flag access is denied",
  async () => {
    const user =
      await createUser(
        "flag-cross@example.test",
      );

    const unitA =
      await createUnit(
        "00003",
      );

    await makeProfessional(
      user.id,
      unitA.id,
    );

    const {
      patient,
    } =
      await createFixture(
        "00004",
      );

    const allergy =
      await createAllergy({
        patientId:
          patient.id,
        substance:
          "Teste",
      });

    const flag =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          "FLAG_CROSS",
        label:
          "Flag cross",
      });

    await assert.rejects(
      () =>
        requireAllergyReadAccess({
          userId:
            user.id,
          organizationId:
            unitA.id,
          allergyId:
            allergy.id,
        }),
      AccessDeniedError,
    );

    await assert.rejects(
      () =>
        requireClinicalFlagReadAccess({
          userId:
            user.id,
          organizationId:
            unitA.id,
          flagId:
            flag.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "unlink immediately revokes allergy and flag access",
  async () => {
    const user =
      await createUser(
        "flag-unlink@example.test",
      );

    const {
      unit,
      patient,
    } =
      await createFixture(
        "00005",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const allergy =
      await createAllergy({
        patientId:
          patient.id,
        substance:
          "Teste",
      });

    const flag =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          "FLAG_UNLINK",
        label:
          "Flag unlink",
      });

    await db.patientOrganization.update({
      where: {
        patientId_organizationId: {
          patientId:
            patient.id,
          organizationId:
            unit.id,
        },
      },
      data: {
        unlinkedAt:
          new Date(),
      },
    });

    await assert.rejects(
      () =>
        requireAllergyReadAccess({
          userId:
            user.id,
          organizationId:
            unit.id,
          allergyId:
            allergy.id,
        }),
      AccessDeniedError,
    );

    await assert.rejects(
      () =>
        requireClinicalFlagReadAccess({
          userId:
            user.id,
          organizationId:
            unit.id,
          flagId:
            flag.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "PAP admin has no default allergy or flag access",
  async () => {
    const user =
      await createUser(
        "flag-pap@example.test",
      );

    const {
      unit,
      patient,
    } =
      await createFixture(
        "00006",
      );

    await assignSystemRole({
      userId:
        user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    });

    const allergy =
      await createAllergy({
        patientId:
          patient.id,
        substance:
          "Teste",
      });

    const flag =
      await createClinicalFlag({
        patientId:
          patient.id,
        code:
          "FLAG_PAP",
        label:
          "Flag PAP",
      });

    await assert.rejects(
      () =>
        requireAllergyReadAccess({
          userId:
            user.id,
          organizationId:
            unit.id,
          allergyId:
            allergy.id,
        }),
      AccessDeniedError,
    );

    await assert.rejects(
      () =>
        requireClinicalFlagReadAccess({
          userId:
            user.id,
          organizationId:
            unit.id,
          flagId:
            flag.id,
        }),
      AccessDeniedError,
    );
  },
);
