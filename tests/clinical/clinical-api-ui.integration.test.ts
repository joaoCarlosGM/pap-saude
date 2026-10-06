import { createEncounter } from "../../src/server/encounters/encounter.service";

import assert from "node:assert/strict";

import { after, before, beforeEach, test } from "node:test";

import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import { NextRequest } from "next/server";

import { GET, PATCH, POST } from "../../src/app/api/clinical/[[...path]]/route";

import { createSession } from "../../src/server/auth/session.service";

import { db } from "../../src/server/db/client";

import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";

import { assignSystemRole } from "../../src/server/iam/role-assignment.service";

import { SYSTEM_ROLE_KEYS } from "../../src/server/iam/system-role-catalog";

import { createPatient } from "../../src/server/patients/patient.service";

import { linkPatientToOrganization } from "../../src/server/patients/patient-organization.service";

import { SESSION_COOKIE_NAME } from "../../src/server/security/constants";

const EXPECTED_DATABASE = "pap_saude_f03_clinical_api_ui_test";

const BASE_URL = "http://localhost:3000";

const previousAllowedOrigins = process.env.AUTH_ALLOWED_ORIGINS;

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function assertSafeDatabase(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{
      database: string;
    }>
  >`SELECT current_database() AS database`;

  assert.equal(rows[0]?.database, EXPECTED_DATABASE);
}

async function clearFixtures(): Promise<void> {
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

  await db.session.deleteMany();
  await db.passwordCredential.deleteMany();

  await db.roleAssignment.deleteMany();
  await db.rolePermission.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();

  await db.membership.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();
}

async function createUser(email: string) {
  return db.user.create({
    data: {
      email,
      displayName: email,

      isActive: true,
    },
  });
}

async function createUnit(suffix: string) {
  return db.organization.create({
    data: {
      type: OrganizationType.HEALTH_UNIT,

      status: OrganizationStatus.ACTIVE,

      name: `UBS Clinical API ${suffix}`,

      cnes: `73${suffix.padStart(5, "0")}`,

      isActive: true,
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

      status: MembershipStatus.ACTIVE,
    },
  });

  await assignSystemRole({
    userId,

    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL,

    organizationId,
  });
}

async function authenticatedFixture(suffix: string) {
  const user = await createUser(`clinical-api-${suffix}@example.test`);

  const unit = await createUnit(suffix);

  await makeProfessional(user.id, unit.id);

  const session = await createSession({
    userId: user.id,

    userAgent: "PAP-F03-Clinical-API-Test",
  });

  return {
    user,
    unit,
    token: session.token,
  };
}

function requestFor(
  method: string,

  path: string[],

  options: {
    token?: string;

    organizationId?: string;

    body?: unknown;

    query?: string;

    origin?: string;
  } = {},
) {
  const pathname = path.length
    ? `/api/clinical/${path.join("/")}`
    : "/api/clinical";

  const headers = new Headers();

  if (method === "POST" || method === "PATCH") {
    headers.set("origin", options.origin ?? BASE_URL);
  }

  if (options.token) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${options.token}`);
  }

  if (options.organizationId) {
    headers.set("x-organization-id", options.organizationId);
  }

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(`${BASE_URL}${pathname}${options.query ?? ""}`, {
    method,
    headers,

    ...(options.body !== undefined
      ? {
          body: JSON.stringify(options.body),
        }
      : {}),
  });
}

function contextFor(path: string[]): RouteContext {
  return {
    params: Promise.resolve({
      path,
    }),
  };
}

async function callGet(
  path: string[],

  options?: Parameters<typeof requestFor>[2],
) {
  return GET(requestFor("GET", path, options), contextFor(path));
}

async function callPost(
  path: string[],

  options?: Parameters<typeof requestFor>[2],
) {
  return POST(requestFor("POST", path, options), contextFor(path));
}

async function callPatch(
  path: string[],

  options?: Parameters<typeof requestFor>[2],
) {
  return PATCH(requestFor("PATCH", path, options), contextFor(path));
}

before(async () => {
  process.env.AUTH_ALLOWED_ORIGINS = BASE_URL;

  await assertSafeDatabase();
  await clearFixtures();
});

beforeEach(async () => {
  await clearFixtures();
  await bootstrapSystemIam();
});

after(async () => {
  await clearFixtures();

  if (previousAllowedOrigins === undefined) {
    delete process.env.AUTH_ALLOWED_ORIGINS;
  } else {
    process.env.AUTH_ALLOWED_ORIGINS = previousAllowedOrigins;
  }
});

test("clinical API rejects unauthenticated requests", async () => {
  const response = await callGet(["context"]);

  assert.equal(response.status, 401);

  const body = await response.json();

  assert.equal(body.error, "HttpAuthenticationRequiredError");
});

test("clinical context exposes only active health-unit memberships", async () => {
  const { unit, token } = await authenticatedFixture("00001");

  const response = await callGet(["context"], {
    token,
  });

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(body.organizations.length, 1);

  assert.equal(body.organizations[0]?.id, unit.id);
});

test("patient collection is organization scoped and cross-unit access is denied", async () => {
  const { unit: unitA, token } = await authenticatedFixture("00002");

  const unitB = await createUnit("00003");

  const patientA = await createPatient({
    fullName: "Paciente Unidade A",

    birthDate: "2000-01-01",
  });

  await linkPatientToOrganization({
    patientId: patientA.id,

    organizationId: unitA.id,
  });

  const patientB = await createPatient({
    fullName: "Paciente Unidade B",

    birthDate: "2001-02-02",
  });

  await linkPatientToOrganization({
    patientId: patientB.id,

    organizationId: unitB.id,
  });

  const ownResponse = await callGet(["patients"], {
    token,

    organizationId: unitA.id,
  });

  assert.equal(ownResponse.status, 200);

  const ownBody = await ownResponse.json();

  assert.equal(ownBody.items.length, 1);

  assert.equal(ownBody.items[0]?.id, patientA.id);

  const crossResponse = await callGet(["patients"], {
    token,

    organizationId: unitB.id,
  });

  assert.equal(crossResponse.status, 403);
});

test("clinical HTTP flow persists patient pregnancy encounter vitals obstetric data and draft MEOWS", async () => {
  const { unit, token } = await authenticatedFixture("00004");

  const patientResponse = await callPost(["patients"], {
    token,

    organizationId: unit.id,

    body: {
      fullName: "Paciente Fluxo HTTP",

      birthDate: "2000-01-01",

      cpf: "12345678901",
    },
  });

  assert.equal(patientResponse.status, 201);

  const patientBody = await patientResponse.json();

  const patientId = patientBody.patient.id as string;

  assert.ok(patientId);

  const link = await db.patientOrganization.findUnique({
    where: {
      patientId_organizationId: {
        patientId,

        organizationId: unit.id,
      },
    },
  });

  assert.ok(link);

  const pregnancyResponse = await callPost(
    ["patients", patientId, "pregnancies"],
    {
      token,

      organizationId: unit.id,

      body: {
        lastMenstrualDate: "2026-01-01",
      },
    },
  );

  assert.equal(pregnancyResponse.status, 201);

  const pregnancyBody = await pregnancyResponse.json();

  const pregnancyId = pregnancyBody.pregnancy.id as string;

  assert.ok(pregnancyId);

  const encounterOccurredAt = new Date(Date.now() - 5_000).toISOString();

  const encounterResponse = await callPost(["encounters"], {
    token,

    organizationId: unit.id,

    body: {
      patientId,

      pregnancyId,

      chiefComplaint: "Consulta de teste",

      occurredAt: encounterOccurredAt,
    },
  });

  assert.equal(encounterResponse.status, 201);

  const encounterBody = await encounterResponse.json();

  const encounterId = encounterBody.encounter.id as string;

  assert.ok(encounterId);

  const startResponse = await callPatch(["encounters", encounterId], {
    token,

    organizationId: unit.id,

    body: {
      action: "start",
    },
  });

  assert.equal(startResponse.status, 200);

  const recordedAt = new Date().toISOString();

  const vitalsResponse = await callPost(
    ["encounters", encounterId, "vital-signs"],
    {
      token,

      organizationId: unit.id,

      body: {
        systolicBp: 120,

        diastolicBp: 80,

        heartRate: 90,

        respiratoryRate: 16,

        temperature: 36.5,

        oxygenSaturation: 98,

        consciousness: "ALERT",

        proteinuria: "NOT_PERFORMED",

        recordedAt,
      },
    },
  );

  assert.equal(vitalsResponse.status, 201);

  const obstetricResponse = await callPost(
    ["encounters", encounterId, "obstetric-data"],
    {
      token,

      organizationId: unit.id,

      body: {
        uterineHeightCm: 30,

        fetalHeartRate: 140,

        fetalMovement: true,

        edema: "NONE",

        bleeding: false,

        weightKg: 65,

        complaints: "Sem queixas adicionais",

        notes: "Registro HTTP de teste",

        recordedAt,
      },
    },
  );

  assert.equal(obstetricResponse.status, 201);

  const meowsResponse = await callPost(["encounters", encounterId, "meows"], {
    token,

    organizationId: unit.id,

    body: {
      clinicalNotes: "Avaliação de teste",
    },
  });

  assert.equal(meowsResponse.status, 201);

  const meowsBody = await meowsResponse.json();

  assert.equal(meowsBody.evaluation.clinicallyValidated, false);

  assert.equal(meowsBody.evaluation.protocolStatus, "DRAFT_UNVALIDATED");

  const completeResponse = await callPatch(["encounters", encounterId], {
    token,

    organizationId: unit.id,

    body: {
      action: "complete",
    },
  });

  assert.equal(completeResponse.status, 200);

  const completedBody = await completeResponse.json();

  assert.equal(completedBody.encounter.status, "COMPLETED");

  assert.equal(
    await db.vitalSigns.count({
      where: {
        encounterId,
      },
    }),
    1,
  );

  assert.equal(
    await db.obstetricData.count({
      where: {
        encounterId,
      },
    }),
    1,
  );

  assert.equal(
    await db.clinicalEvaluation.count({
      where: {
        encounterId,
      },
    }),
    1,
  );
});

test("clinical mutations reject an untrusted Origin", async () => {
  const { unit, token } = await authenticatedFixture("00005");

  const response = await callPost(["patients"], {
    token,

    organizationId: unit.id,

    origin: "https://evil.invalid",

    body: {
      fullName: "Paciente CSRF",

      birthDate: "2000-01-01",
    },
  });

  assert.equal(response.status, 403);

  const body = await response.json();

  assert.equal(body.error, "INVALID_REQUEST_ORIGIN");

  assert.equal(await db.patient.count(), 0);
});

test("protected clinical resource lookup does not reveal cross-unit existence", async () => {
  const { unit: unitA, token } = await authenticatedFixture("00006");

  const unitB = await createUnit("00007");

  const patientB = await createPatient({
    fullName: "Paciente Unidade Protegida",

    birthDate: "2000-01-01",
  });

  await linkPatientToOrganization({
    patientId: patientB.id,

    organizationId: unitB.id,
  });

  const encounterB = await createEncounter({
    patientId: patientB.id,

    organizationId: unitB.id,
  });

  const crossUnit = await callGet(["encounters", encounterB.id], {
    token,

    organizationId: unitA.id,
  });

  const nonexistent = await callGet(
    ["encounters", "00000000-0000-4000-8000-ffffffffffff"],
    {
      token,

      organizationId: unitA.id,
    },
  );

  assert.equal(crossUnit.status, 403);

  assert.equal(nonexistent.status, 403);

  const crossBody = await crossUnit.json();

  const nonexistentBody = await nonexistent.json();

  assert.deepEqual(crossBody, nonexistentBody);

  assert.equal(crossBody.error, "ACCESS_DENIED");
});

test("SQL-injection-shaped patient search input does not broaden organization results", async () => {
  const { unit, token } = await authenticatedFixture("00008");

  const patient = await createPatient({
    fullName: "Paciente SQL Guard",

    birthDate: "2000-01-01",
  });

  await linkPatientToOrganization({
    patientId: patient.id,

    organizationId: unit.id,
  });

  const injection = "' OR 1=1 --";

  const response = await callGet(["patients"], {
    token,

    organizationId: unit.id,

    query: `?q=${encodeURIComponent(injection)}`,
  });

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.deepEqual(body.items, []);

  assert.equal(await db.patient.count(), 1);
});
