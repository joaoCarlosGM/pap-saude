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
  VitalSignsEncounterNotFoundError,
} from "./vital-signs.errors";

export type VitalSignsAccessInput = {
  userId: string;
  organizationId: string;
  encounterId: string;
};

async function requireContext(
  encounterId: string,
) {
  const encounter =
    await db.encounter.findUnique({
      where: {
        id: encounterId,
      },
      select: {
        id: true,
        patientId: true,
        organizationId: true,
      },
    });

  if (!encounter) {
    throw new VitalSignsEncounterNotFoundError();
  }

  return encounter;
}

async function requireScopedEncounter(
  input: VitalSignsAccessInput,
) {
  const encounter =
    await requireContext(
      input.encounterId,
    );

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

export async function requireVitalSignsCreateAccess(
  input: VitalSignsAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.VITAL_SIGNS_CREATE,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed: true as const,
  };
}

export async function requireVitalSignsReadAccess(
  input: VitalSignsAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.VITAL_SIGNS_READ,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed: true as const,
  };
}

export async function requireVitalSignsUpdateAccess(
  input: VitalSignsAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.VITAL_SIGNS_UPDATE,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed: true as const,
  };
}
