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
  hasActivePatientOrganizationLink,
} from "../patients/patient-organization.service";

import {
  db,
} from "../db/client";

import {
  PregnancyNotFoundError,
} from "./pregnancy.errors";

export type PregnancyPatientAccessInput = {
  userId: string;
  organizationId: string;
  patientId: string;
};

export type ExistingPregnancyAccessInput = {
  userId: string;
  organizationId: string;
  pregnancyId: string;
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

async function requirePregnancyPatient(
  pregnancyId: string,
) {
  const pregnancy =
    await db.pregnancy.findUnique({
      where: {
        id: pregnancyId,
      },
      select: {
        id: true,
        patientId: true,
      },
    });

  if (!pregnancy) {
    throw new PregnancyNotFoundError();
  }

  return pregnancy;
}

export async function requirePregnancyCreateAccess(
  input:
    PregnancyPatientAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.PREGNANCY_CREATE,
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

export async function requirePregnancyReadAccess(
  input:
    ExistingPregnancyAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.PREGNANCY_READ,
    organizationId:
      input.organizationId,
  });

  const pregnancy =
    await requirePregnancyPatient(
      input.pregnancyId,
    );

  await requireLinkedPatient(
    pregnancy.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      pregnancy.patientId,
  };
}

export async function requirePregnancyUpdateAccess(
  input:
    ExistingPregnancyAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.PREGNANCY_UPDATE,
    organizationId:
      input.organizationId,
  });

  const pregnancy =
    await requirePregnancyPatient(
      input.pregnancyId,
    );

  await requireLinkedPatient(
    pregnancy.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      pregnancy.patientId,
  };
}
