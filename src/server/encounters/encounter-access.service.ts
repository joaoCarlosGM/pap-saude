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
  EncounterNotFoundError,
} from "./encounter.errors";

export type EncounterCreateAccessInput = {
  userId: string;
  organizationId: string;
  patientId: string;
};

export type ExistingEncounterAccessInput = {
  userId: string;
  organizationId: string;
  encounterId: string;
};

async function requireLinkedPatient(
  patientId: string,
  organizationId: string,
) {
  const linked =
    await hasActivePatientOrganizationLink(
      patientId,
      organizationId,
    );

  if (!linked) {
    throw new AccessDeniedError();
  }
}

async function requireEncounterContext(
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
    throw new EncounterNotFoundError();
  }

  return encounter;
}

export async function requireEncounterCreateAccess(
  input:
    EncounterCreateAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.ENCOUNTER_CREATE,
    organizationId:
      input.organizationId,
  });

  await requireLinkedPatient(
    input.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
  };
}

export async function requireEncounterReadAccess(
  input:
    ExistingEncounterAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.ENCOUNTER_READ,
    organizationId:
      input.organizationId,
  });

  const encounter =
    await requireEncounterContext(
      input.encounterId,
    );

  if (
    encounter.organizationId !==
    input.organizationId
  ) {
    throw new AccessDeniedError();
  }

  await requireLinkedPatient(
    encounter.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      encounter.patientId,
  };
}

export async function requireEncounterUpdateAccess(
  input:
    ExistingEncounterAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.ENCOUNTER_UPDATE,
    organizationId:
      input.organizationId,
  });

  const encounter =
    await requireEncounterContext(
      input.encounterId,
    );

  if (
    encounter.organizationId !==
    input.organizationId
  ) {
    throw new AccessDeniedError();
  }

  await requireLinkedPatient(
    encounter.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      encounter.patientId,
  };
}
