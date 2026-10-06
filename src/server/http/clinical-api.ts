import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import type { NextRequest } from "next/server";

import { assertTrustedRequestOrigin } from "../auth/http-auth";

import { db } from "../db/client";

import {
  requireHttpOrganizationPermission,
  requireHttpSession,
} from "./http-auth.guard";

import { readOrganizationIdFromRequest } from "./organization-context";

import { clinicalJson } from "./clinical-api-response";

import { PERMISSIONS } from "../iam/permissions";

import {
  createPatient,
  getPatientById,
  updatePatientDemographics,
} from "../patients/patient.service";

import {
  linkPatientToOrganization,
  listOrganizationPatients,
} from "../patients/patient-organization.service";

import {
  requirePatientCreateAccess,
  requirePatientReadAccess,
  requirePatientUpdateDemographicsAccess,
} from "../patients/patient-access.service";

import {
  completePregnancy,
  createPregnancy,
  interruptPregnancy,
  listPatientPregnancies,
  updatePregnancy,
} from "../pregnancies/pregnancy.service";

import {
  cancelEncounter,
  completeEncounter,
  createEncounter,
  getEncounterById,
  listOrganizationEncounters,
  startEncounter,
  updateEncounter,
} from "../encounters/encounter.service";

import {
  createVitalSigns,
  getVitalSignsByEncounter,
  updateVitalSigns,
} from "../vital-signs/vital-signs.service";

import {
  createObstetricData,
  getObstetricDataByEncounter,
  updateObstetricData,
} from "../obstetric-data/obstetric-data.service";

import {
  createAllergy,
  endAllergy,
  listPatientAllergies,
  updateAllergy,
} from "../allergies/allergy.service";

import {
  createClinicalFlag,
  endClinicalFlag,
  listPatientClinicalFlags,
  updateClinicalFlag,
} from "../clinical-flags/clinical-flag.service";

import {
  listEncounterMeowsEvaluations,
  persistEncounterMeowsEvaluation,
} from "../meows/meows.service";

import {
  listClinicalRevisionHistory,
  recordClinicalRevision,
} from "../clinical-revision";

import {
  requireClinicalPatientScope,
  requireClinicalResourceAccess,
  requireClinicalRevisionCreateAccess,
} from "../clinical-authorization";

class InvalidClinicalHttpRequestError extends Error {
  constructor(message = "Invalid clinical HTTP request.") {
    super(message);

    this.name = "InvalidClinicalHttpRequestError";
  }
}

const MAX_CLINICAL_BODY_BYTES = 64 * 1024;

async function readJson<T>(request: NextRequest): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.startsWith("application/json")) {
    throw new InvalidClinicalHttpRequestError(
      "application/json body required.",
    );
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const numericLength = Number(contentLength);

    if (
      !Number.isFinite(numericLength) ||
      numericLength < 0 ||
      numericLength > MAX_CLINICAL_BODY_BYTES
    ) {
      throw new InvalidClinicalHttpRequestError(
        "Clinical request body is too large.",
      );
    }
  }

  const raw = await request.text();

  const actualBytes = new TextEncoder().encode(raw).byteLength;

  if (actualBytes > MAX_CLINICAL_BODY_BYTES) {
    throw new InvalidClinicalHttpRequestError(
      "Clinical request body is too large.",
    );
  }

  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new InvalidClinicalHttpRequestError("Invalid JSON body.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidClinicalHttpRequestError("JSON object body required.");
  }

  return value as T;
}

function requireOrganizationId(request: NextRequest): string {
  const organizationId = readOrganizationIdFromRequest(request);

  if (!organizationId) {
    throw new InvalidClinicalHttpRequestError("x-organization-id is required.");
  }

  return organizationId;
}

function pathEquals(path: string[], ...segments: string[]) {
  return (
    path.length === segments.length &&
    path.every((value, index) => value === segments[index])
  );
}

function pathPattern(path: string[], pattern: string[]) {
  if (path.length !== pattern.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index];

    const actual = path[index];

    if (!expected || !actual) {
      return null;
    }

    if (expected.startsWith(":")) {
      params[expected.slice(1)] = actual;

      continue;
    }

    if (expected !== actual) {
      return null;
    }
  }

  return params;
}

async function clinicalContext(request: NextRequest) {
  const auth = await requireHttpSession(request);

  const memberships = await db.membership.findMany({
    where: {
      userId: auth.user.id,

      status: MembershipStatus.ACTIVE,

      organization: {
        type: OrganizationType.HEALTH_UNIT,

        status: OrganizationStatus.ACTIVE,

        isActive: true,
      },
    },

    include: {
      organization: {
        select: {
          id: true,
          name: true,
          cnes: true,
          city: true,
          state: true,
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  return clinicalJson({
    user: auth.user,

    organizations: memberships.map((membership) => membership.organization),
  });
}

async function patientsCollection(request: NextRequest, method: string) {
  const organizationId = requireOrganizationId(request);

  if (method === "GET") {
    await requireHttpOrganizationPermission(
      request,
      PERMISSIONS.PATIENT_READ,
      organizationId,
    );

    const url = new URL(request.url);

    const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

    const links = await listOrganizationPatients(organizationId, {
      take: 100,
    });

    const filtered = query
      ? links.filter((link) => {
          const patient = link.patient;

          return [
            patient.fullName,
            patient.socialName ?? "",
            patient.cpf ?? "",
            patient.cns ?? "",
          ].some((value) => value.toLowerCase().includes(query));
        })
      : links;

    return clinicalJson({
      items: filtered.map((link) => ({
        ...link.patient,

        medicalRecordNo: link.medicalRecordNo,

        isPrimary: link.isPrimary,
      })),
    });
  }

  if (method === "POST") {
    const auth = await requireHttpSession(request);

    await requirePatientCreateAccess({
      userId: auth.user.id,

      organizationId,
    });

    const body = await readJson<
      Parameters<typeof createPatient>[0] & {
        medicalRecordNo?: string | null;

        isPrimary?: boolean;
      }
    >(request);

    const patient = await createPatient(body);

    await linkPatientToOrganization({
      patientId: patient.id,

      organizationId,

      medicalRecordNo: body.medicalRecordNo,

      isPrimary: body.isPrimary ?? true,
    });

    return clinicalJson(
      {
        patient,
      },
      201,
    );
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function patientResource(
  request: NextRequest,
  method: string,
  patientId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requirePatientReadAccess({
      userId: auth.user.id,

      organizationId,

      patientId,
    });

    const patient = await getPatientById(patientId);

    return clinicalJson({
      patient,
    });
  }

  if (method === "PATCH") {
    await requirePatientUpdateDemographicsAccess({
      userId: auth.user.id,

      organizationId,

      patientId,
    });

    const body =
      await readJson<Parameters<typeof updatePatientDemographics>[1]>(request);

    const patient = await updatePatientDemographics(patientId, body);

    return clinicalJson({
      patient,
    });
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function patientPregnancies(
  request: NextRequest,
  method: string,
  patientId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireClinicalPatientScope({
      userId: auth.user.id,

      organizationId,

      patientId,

      permission: PERMISSIONS.PREGNANCY_READ,
    });

    const items = await listPatientPregnancies(patientId);

    return clinicalJson({
      items,
    });
  }

  if (method === "POST") {
    await requireClinicalPatientScope({
      userId: auth.user.id,

      organizationId,

      patientId,

      permission: PERMISSIONS.PREGNANCY_CREATE,
    });

    const body =
      await readJson<Omit<Parameters<typeof createPregnancy>[0], "patientId">>(
        request,
      );

    const pregnancy = await createPregnancy({
      ...body,
      patientId,
    });

    return clinicalJson(
      {
        pregnancy,
      },
      201,
    );
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function pregnancyResource(
  request: NextRequest,
  method: string,
  pregnancyId: string,
) {
  if (method !== "PATCH") {
    throw new InvalidClinicalHttpRequestError("Method not supported.");
  }

  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  await requireClinicalResourceAccess({
    userId: auth.user.id,

    organizationId,

    permission: PERMISSIONS.PREGNANCY_UPDATE,

    resourceType: "PREGNANCY",

    resourceId: pregnancyId,
  });

  const body = await readJson<
    Parameters<typeof updatePregnancy>[1] & {
      action?: "complete" | "interrupt";

      endedAt?: string | Date;
    }
  >(request);

  if (body.action === "complete") {
    const pregnancy = await completePregnancy({
      pregnancyId,
      endedAt: body.endedAt,
    });

    return clinicalJson({
      pregnancy,
    });
  }

  if (body.action === "interrupt") {
    const pregnancy = await interruptPregnancy({
      pregnancyId,
      endedAt: body.endedAt,
    });

    return clinicalJson({
      pregnancy,
    });
  }

  const { action: _action, endedAt: _endedAt, ...update } = body;

  void _action;
  void _endedAt;

  const pregnancy = await updatePregnancy(pregnancyId, update);

  return clinicalJson({
    pregnancy,
  });
}

async function encountersCollection(request: NextRequest, method: string) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireHttpOrganizationPermission(
      request,
      PERMISSIONS.ENCOUNTER_READ,
      organizationId,
    );

    const url = new URL(request.url);

    const patientId = url.searchParams.get("patientId") ?? undefined;

    const items = await listOrganizationEncounters(organizationId, {
      patientId,
    });

    return clinicalJson({
      items,
    });
  }

  if (method === "POST") {
    const body =
      await readJson<
        Omit<Parameters<typeof createEncounter>[0], "organizationId">
      >(request);

    await requireClinicalPatientScope({
      userId: auth.user.id,

      organizationId,

      patientId: body.patientId,

      permission: PERMISSIONS.ENCOUNTER_CREATE,
    });

    const encounter = await createEncounter({
      ...body,
      organizationId,
    });

    return clinicalJson(
      {
        encounter,
      },
      201,
    );
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function encounterResource(
  request: NextRequest,
  method: string,
  encounterId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.ENCOUNTER_READ,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const encounter = await getEncounterById(encounterId);

    return clinicalJson({
      encounter,
    });
  }

  if (method === "PATCH") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.ENCOUNTER_UPDATE,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const body = await readJson<
      Parameters<typeof updateEncounter>[1] & {
        action?: "start" | "complete" | "cancel";

        reason?: string;
      }
    >(request);

    if (body.action === "start") {
      const encounter = await startEncounter(encounterId);

      return clinicalJson({
        encounter,
      });
    }

    if (body.action === "complete") {
      const encounter = await completeEncounter(encounterId);

      return clinicalJson({
        encounter,
      });
    }

    if (body.action === "cancel") {
      const encounter = await cancelEncounter({
        encounterId,

        reason: body.reason ?? "",
      });

      return clinicalJson({
        encounter,
      });
    }

    const { action: _action, reason: _reason, ...update } = body;

    void _action;
    void _reason;

    const encounter = await updateEncounter(encounterId, update);

    return clinicalJson({
      encounter,
    });
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function vitalSignsResource(
  request: NextRequest,
  method: string,
  encounterId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.VITAL_SIGNS_READ,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const vitalSigns = await getVitalSignsByEncounter(encounterId);

    return clinicalJson({
      vitalSigns,
    });
  }

  if (method === "POST") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.VITAL_SIGNS_CREATE,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const body =
      await readJson<
        Omit<Parameters<typeof createVitalSigns>[0], "encounterId">
      >(request);

    const vitalSigns = await createVitalSigns({
      ...body,
      encounterId,
    });

    return clinicalJson(
      {
        vitalSigns,
      },
      201,
    );
  }

  if (method === "PATCH") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.VITAL_SIGNS_UPDATE,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const body =
      await readJson<Parameters<typeof updateVitalSigns>[1]>(request);

    const vitalSigns = await updateVitalSigns(encounterId, body);

    return clinicalJson({
      vitalSigns,
    });
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function obstetricResource(
  request: NextRequest,
  method: string,
  encounterId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.OBSTETRIC_DATA_READ,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const obstetricData = await getObstetricDataByEncounter(encounterId);

    return clinicalJson({
      obstetricData,
    });
  }

  if (method === "POST") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.OBSTETRIC_DATA_CREATE,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const body =
      await readJson<
        Omit<Parameters<typeof createObstetricData>[0], "encounterId">
      >(request);

    const obstetricData = await createObstetricData({
      ...body,
      encounterId,
    });

    return clinicalJson(
      {
        obstetricData,
      },
      201,
    );
  }

  if (method === "PATCH") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.OBSTETRIC_DATA_UPDATE,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const body =
      await readJson<Parameters<typeof updateObstetricData>[1]>(request);

    const obstetricData = await updateObstetricData(encounterId, body);

    return clinicalJson({
      obstetricData,
    });
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function patientAllergies(
  request: NextRequest,
  method: string,
  patientId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireClinicalPatientScope({
      userId: auth.user.id,

      organizationId,

      patientId,

      permission: PERMISSIONS.ALLERGY_READ,
    });

    const items = await listPatientAllergies(patientId);

    return clinicalJson({
      items,
    });
  }

  if (method === "POST") {
    await requireClinicalPatientScope({
      userId: auth.user.id,

      organizationId,

      patientId,

      permission: PERMISSIONS.ALLERGY_CREATE,
    });

    const body =
      await readJson<Omit<Parameters<typeof createAllergy>[0], "patientId">>(
        request,
      );

    const allergy = await createAllergy({
      ...body,
      patientId,
    });

    return clinicalJson(
      {
        allergy,
      },
      201,
    );
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function allergyResource(
  request: NextRequest,
  method: string,
  allergyId: string,
) {
  if (method !== "PATCH") {
    throw new InvalidClinicalHttpRequestError("Method not supported.");
  }

  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  await requireClinicalResourceAccess({
    userId: auth.user.id,

    organizationId,

    permission: PERMISSIONS.ALLERGY_UPDATE,

    resourceType: "ALLERGY",

    resourceId: allergyId,
  });

  const body = await readJson<
    Parameters<typeof updateAllergy>[1] & {
      endStatus?: Parameters<typeof endAllergy>[0]["status"];
    }
  >(request);

  if (body.endStatus) {
    const allergy = await endAllergy({
      allergyId,
      status: body.endStatus,
    });

    return clinicalJson({
      allergy,
    });
  }

  const { endStatus: _endStatus, ...update } = body;

  void _endStatus;

  const allergy = await updateAllergy(allergyId, update);

  return clinicalJson({
    allergy,
  });
}

async function patientFlags(
  request: NextRequest,
  method: string,
  patientId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireClinicalPatientScope({
      userId: auth.user.id,

      organizationId,

      patientId,

      permission: PERMISSIONS.CLINICAL_FLAG_READ,
    });

    const items = await listPatientClinicalFlags(patientId);

    return clinicalJson({
      items,
    });
  }

  if (method === "POST") {
    await requireClinicalPatientScope({
      userId: auth.user.id,

      organizationId,

      patientId,

      permission: PERMISSIONS.CLINICAL_FLAG_CREATE,
    });

    const body =
      await readJson<
        Omit<Parameters<typeof createClinicalFlag>[0], "patientId">
      >(request);

    const flag = await createClinicalFlag({
      ...body,
      patientId,
    });

    return clinicalJson(
      {
        flag,
      },
      201,
    );
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function flagResource(
  request: NextRequest,
  method: string,
  flagId: string,
) {
  if (method !== "PATCH") {
    throw new InvalidClinicalHttpRequestError("Method not supported.");
  }

  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  await requireClinicalResourceAccess({
    userId: auth.user.id,

    organizationId,

    permission: PERMISSIONS.CLINICAL_FLAG_UPDATE,

    resourceType: "CLINICAL_FLAG",

    resourceId: flagId,
  });

  const body = await readJson<
    Parameters<typeof updateClinicalFlag>[1] & {
      endStatus?: Parameters<typeof endClinicalFlag>[0]["status"];
    }
  >(request);

  if (body.endStatus) {
    const flag = await endClinicalFlag({
      flagId,
      status: body.endStatus,
    });

    return clinicalJson({
      flag,
    });
  }

  const { endStatus: _endStatus, ...update } = body;

  void _endStatus;

  const flag = await updateClinicalFlag(flagId, update);

  return clinicalJson({
    flag,
  });
}

async function meowsResource(
  request: NextRequest,
  method: string,
  encounterId: string,
) {
  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  if (method === "GET") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.MEOWS_READ,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const items = await listEncounterMeowsEvaluations(encounterId);

    return clinicalJson({
      items,
    });
  }

  if (method === "POST") {
    await requireClinicalResourceAccess({
      userId: auth.user.id,

      organizationId,

      permission: PERMISSIONS.MEOWS_EVALUATE,

      resourceType: "ENCOUNTER",

      resourceId: encounterId,
    });

    const body = await readJson<{
      clinicalNotes?: string | null;
    }>(request);

    const evaluation = await persistEncounterMeowsEvaluation(
      encounterId,
      body.clinicalNotes,
    );

    return clinicalJson(
      {
        evaluation,
      },
      201,
    );
  }

  throw new InvalidClinicalHttpRequestError("Method not supported.");
}

async function patientRevisions(
  request: NextRequest,
  method: string,
  patientId: string,
) {
  if (method !== "GET") {
    throw new InvalidClinicalHttpRequestError("Method not supported.");
  }

  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  await requireClinicalPatientScope({
    userId: auth.user.id,

    organizationId,

    patientId,

    permission: PERMISSIONS.CLINICAL_REVISION_READ,
  });

  const items = await listClinicalRevisionHistory({
    patientId,
  });

  return clinicalJson({
    items,
  });
}

async function revisionsCollection(request: NextRequest, method: string) {
  if (method !== "POST") {
    throw new InvalidClinicalHttpRequestError("Method not supported.");
  }

  const organizationId = requireOrganizationId(request);

  const auth = await requireHttpSession(request);

  const body = await readJson<{
    resourceType: Parameters<
      typeof requireClinicalRevisionCreateAccess
    >[0]["resourceType"];

    resourceId: string;

    reason: string;

    before: Parameters<typeof recordClinicalRevision>[0]["before"];

    after: Parameters<typeof recordClinicalRevision>[0]["after"];

    requestId?: string | null;

    correlationId?: string | null;
  }>(request);

  const access = await requireClinicalRevisionCreateAccess({
    userId: auth.user.id,

    organizationId,

    resourceType: body.resourceType,

    resourceId: body.resourceId,
  });

  const revision = await recordClinicalRevision({
    actorUserId: auth.user.id,

    organizationId,

    patientId: access.patientId,

    resourceType: body.resourceType,

    resourceId: body.resourceId,

    reason: body.reason,

    before: body.before,

    after: body.after,

    requestId: body.requestId,

    correlationId: body.correlationId,

    sessionId: auth.session.id,
  });

  return clinicalJson(
    {
      revision,
    },
    201,
  );
}

export async function handleClinicalApi(
  request: NextRequest,
  method: string,
  path: string[],
) {
  if (method === "POST" || method === "PATCH") {
    assertTrustedRequestOrigin(request);
  }
  if (pathEquals(path, "context")) {
    return clinicalContext(request);
  }

  if (pathEquals(path, "patients")) {
    return patientsCollection(request, method);
  }

  let match = pathPattern(path, ["patients", ":patientId"]);

  if (match?.patientId) {
    return patientResource(request, method, match.patientId);
  }

  match = pathPattern(path, ["patients", ":patientId", "pregnancies"]);

  if (match?.patientId) {
    return patientPregnancies(request, method, match.patientId);
  }

  match = pathPattern(path, ["pregnancies", ":pregnancyId"]);

  if (match?.pregnancyId) {
    return pregnancyResource(request, method, match.pregnancyId);
  }

  if (pathEquals(path, "encounters")) {
    return encountersCollection(request, method);
  }

  match = pathPattern(path, ["encounters", ":encounterId"]);

  if (match?.encounterId) {
    return encounterResource(request, method, match.encounterId);
  }

  match = pathPattern(path, ["encounters", ":encounterId", "vital-signs"]);

  if (match?.encounterId) {
    return vitalSignsResource(request, method, match.encounterId);
  }

  match = pathPattern(path, ["encounters", ":encounterId", "obstetric-data"]);

  if (match?.encounterId) {
    return obstetricResource(request, method, match.encounterId);
  }

  match = pathPattern(path, ["encounters", ":encounterId", "meows"]);

  if (match?.encounterId) {
    return meowsResource(request, method, match.encounterId);
  }

  match = pathPattern(path, ["patients", ":patientId", "allergies"]);

  if (match?.patientId) {
    return patientAllergies(request, method, match.patientId);
  }

  match = pathPattern(path, ["allergies", ":allergyId"]);

  if (match?.allergyId) {
    return allergyResource(request, method, match.allergyId);
  }

  match = pathPattern(path, ["patients", ":patientId", "flags"]);

  if (match?.patientId) {
    return patientFlags(request, method, match.patientId);
  }

  match = pathPattern(path, ["flags", ":flagId"]);

  if (match?.flagId) {
    return flagResource(request, method, match.flagId);
  }

  match = pathPattern(path, ["patients", ":patientId", "revisions"]);

  if (match?.patientId) {
    return patientRevisions(request, method, match.patientId);
  }

  if (pathEquals(path, "revisions")) {
    return revisionsCollection(request, method);
  }

  throw new InvalidClinicalHttpRequestError("Clinical endpoint not found.");
}
