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
  ClinicalFlagNotFoundError,
} from "./clinical-flag.errors";

export type PatientClinicalFlagAccessInput = {
  userId: string;
  organizationId: string;
  patientId: string;
};

export type ExistingClinicalFlagAccessInput = {
  userId: string;
  organizationId: string;
  flagId: string;
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

async function requireFlagContext(
  flagId: string,
) {
  const flag =
    await db.clinicalFlag.findUnique({
      where: {
        id: flagId,
      },
      select: {
        id: true,
        patientId: true,
      },
    });

  if (!flag) {
    throw new ClinicalFlagNotFoundError();
  }

  return flag;
}

export async function requireClinicalFlagCreateAccess(
  input:
    PatientClinicalFlagAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.CLINICAL_FLAG_CREATE,
  });

  await requireLinkedPatient(
    input.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
  };
}

export async function requireClinicalFlagReadAccess(
  input:
    ExistingClinicalFlagAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.CLINICAL_FLAG_READ,
  });

  const flag =
    await requireFlagContext(
      input.flagId,
    );

  await requireLinkedPatient(
    flag.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      flag.patientId,
  };
}

export async function requireClinicalFlagUpdateAccess(
  input:
    ExistingClinicalFlagAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.CLINICAL_FLAG_UPDATE,
  });

  const flag =
    await requireFlagContext(
      input.flagId,
    );

  await requireLinkedPatient(
    flag.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      flag.patientId,
  };
}
