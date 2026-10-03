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
  ObstetricDataEncounterNotFoundError,
} from "./obstetric-data.errors";

export type ObstetricDataAccessInput = {
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
    throw new ObstetricDataEncounterNotFoundError();
  }

  return encounter;
}

async function requireScopedEncounter(
  input: ObstetricDataAccessInput,
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

export async function requireObstetricDataCreateAccess(
  input: ObstetricDataAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.OBSTETRIC_DATA_CREATE,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed: true as const,
  };
}

export async function requireObstetricDataReadAccess(
  input: ObstetricDataAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.OBSTETRIC_DATA_READ,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed: true as const,
  };
}

export async function requireObstetricDataUpdateAccess(
  input: ObstetricDataAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.OBSTETRIC_DATA_UPDATE,
  });

  await requireScopedEncounter(
    input,
  );

  return {
    allowed: true as const,
  };
}
