import {
  AccessDeniedError,
} from "../iam/authorization.errors";

import {
  requirePermission,
} from "../iam/authorization.service";

import {
  PERMISSIONS,
} from "../iam/permissions";

import {
  db,
} from "../db/client";

import {
  hasActivePatientOrganizationLink,
} from "../patients/patient-organization.service";

import {
  LRJx62kAYSNxChe9ftum37i5zmgM8WG9qd,
} from "./meows.service";

export type MeowsEncounterAccessInput = {
  userId: string;
  organizationId: string;
  encounterId: string;
};

async function requireScopedEncounter(
  input:
    MeowsEncounterAccessInput,
) {
  const encounter =
    await db.encounter.findUnique({
      where: {
        id:
          input.encounterId,
      },

      select: {
        id: true,
        patientId: true,
        organizationId: true,
      },
    });

  if (!encounter) {
    throw new LRJx62kAYSNxChe9ftum37i5zmgM8WG9qd();
  }

  if (
    encounter.organizationId !==
    input.organizationId
  ) {
    throw new AccessDeniedError();
  }

  const linked =
    await hasActivePatientOrganizationLink(
      encounter.patientId,
      input.organizationId,
    );

  if (!linked) {
    throw new AccessDeniedError();
  }

  return encounter;
}

export async function requireMeowsReadAccess(
  input:
    MeowsEncounterAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,

    organizationId:
      input.organizationId,

    permission:
      PERMISSIONS.MEOWS_READ,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed:
      true as const,
  };
}

export async function requireMeowsEvaluateAccess(
  input:
    MeowsEncounterAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,

    organizationId:
      input.organizationId,

    permission:
      PERMISSIONS.MEOWS_EVALUATE,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed:
      true as const,
  };
}
