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
  PERMISSIONS,
} from "../../src/server/iam/permissions";

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
  createEncounter,
} from "../../src/server/encounters/encounter.service";

import {
  createVitalSigns,
} from "../../src/server/vital-signs/vital-signs.service";

import {
  listClinicalRevisionHistory,
  recordClinicalRevision,
} from "../../src/server/clinical-revision";

import {
  requireClinicalPatientScope,
  requireClinicalResourceAccess,
  requireClinicalRevisionCreateAccess,
  requireClinicalRevisionReadAccess,
} from "../../src/server/clinical-authorization";

const EXPECTED_DATABASE =
  "pap_saude_f03_clinical_governance_test";

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
  await db.auditEvent.deleteMany();
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
        `UBS Governance ${suffix}`,

      cnes:
        `72${suffix.padStart(5, "0")}`,

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
        `Paciente Governance ${suffix}`,

      birthDate:
        "2000-01-01",
    });

  await linkPatientToOrganization({
    patientId:
      patient.id,

    organizationId:
      unit.id,
  });

  const encounter =
    await createEncounter({
      patientId:
        patient.id,

      organizationId:
        unit.id,
    });

  return {
    unit,
    patient,
    encounter,
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
  "professional has patient clinical scope in own unit",
  async () => {
    const user =
      await createUser(
        "gov-own@example.test",
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

    const decision =
      await requireClinicalPatientScope({
        userId:
          user.id,

        organizationId:
          unit.id,

        patientId:
          patient.id,

        permission:
          PERMISSIONS.PATIENT_READ,
      });

    assert.equal(
      decision.allowed,
      true,
    );
  },
);

test(
  "resource resolver enforces encounter organization scope",
  async () => {
    const user =
      await createUser(
        "gov-cross@example.test",
      );

    const unitA =
      await createUnit(
        "00002",
      );

    await makeProfessional(
      user.id,
      unitA.id,
    );

    const {
      encounter,
    } =
      await createFixture(
        "00003",
      );

    await assert.rejects(
      () =>
        requireClinicalResourceAccess({
          userId:
            user.id,

          organizationId:
            unitA.id,

          permission:
            PERMISSIONS.ENCOUNTER_READ,

          resourceType:
            "ENCOUNTER",

          resourceId:
            encounter.id,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "clinical revision records immutable before and after snapshots",
  async () => {
    const user =
      await createUser(
        "revision@example.test",
      );

    const {
      unit,
      patient,
      encounter,
    } =
      await createFixture(
        "00004",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    await requireClinicalRevisionCreateAccess({
      userId:
        user.id,

      organizationId:
        unit.id,

      resourceType:
        "ENCOUNTER",

      resourceId:
        encounter.id,
    });

    const revision =
      await recordClinicalRevision({
        actorUserId:
          user.id,

        organizationId:
          unit.id,

        patientId:
          patient.id,

        resourceType:
          "ENCOUNTER",

        resourceId:
          encounter.id,

        reason:
          "Correção documental",

        before: {
          chiefComplaint:
            "A",
        },

        after: {
          chiefComplaint:
            "B",
        },
      });

    assert.equal(
      revision.action,
      "CLINICAL_REVISION",
    );

    assert.equal(
      revision.patientId,
      patient.id,
    );

    const history =
      await listClinicalRevisionHistory({
        patientId:
          patient.id,
      });

    assert.equal(
      history.length,
      1,
    );

    assert.equal(
      history[0]?.reason,
      "Correção documental",
    );
  },
);

test(
  "vital signs resolve back to encounter patient and organization",
  async () => {
    const user =
      await createUser(
        "revision-vital@example.test",
      );

    const {
      unit,
      encounter,
    } =
      await createFixture(
        "00005",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const vital =
      await createVitalSigns({
        encounterId:
          encounter.id,

        systolicBp:
          120,

        diastolicBp:
          80,

        heartRate:
          90,

        respiratoryRate:
          15,
      });

    const decision =
      await requireClinicalResourceAccess({
        userId:
          user.id,

        organizationId:
          unit.id,

        permission:
          PERMISSIONS.VITAL_SIGNS_READ,

        resourceType:
          "VITAL_SIGNS",

        resourceId:
          vital.id,
      });

    assert.equal(
      decision.allowed,
      true,
    );
  },
);

test(
  "unlink revokes centralized clinical access",
  async () => {
    const user =
      await createUser(
        "gov-unlink@example.test",
      );

    const {
      unit,
      patient,
    } =
      await createFixture(
        "00006",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

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
        requireClinicalPatientScope({
          userId:
            user.id,

          organizationId:
            unit.id,

          patientId:
            patient.id,

          permission:
            PERMISSIONS.PATIENT_READ,
        }),
      AccessDeniedError,
    );
  },
);

test(
  "professional can read clinical revision history",
  async () => {
    const user =
      await createUser(
        "revision-read@example.test",
      );

    const {
      unit,
      patient,
    } =
      await createFixture(
        "00007",
      );

    await makeProfessional(
      user.id,
      unit.id,
    );

    const result =
      await requireClinicalRevisionReadAccess({
        userId:
          user.id,

        organizationId:
          unit.id,

        patientId:
          patient.id,
      });

    assert.equal(
      result.allowed,
      true,
    );
  },
);

test(
  "PAP admin has no default clinical revision access",
  async () => {
    const user =
      await createUser(
        "revision-pap@example.test",
      );

    const {
      unit,
      patient,
    } =
      await createFixture(
        "00008",
      );

    await assignSystemRole({
      userId:
        user.id,

      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    });

    await assert.rejects(
      () =>
        requireClinicalRevisionReadAccess({
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
