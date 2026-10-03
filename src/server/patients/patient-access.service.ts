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
} from "./patient-organization.service";

export type PatientOrganizationAccessInput = {
  userId: string;
  organizationId: string;
};

export type ExistingPatientAccessInput =
  PatientOrganizationAccessInput & {
    patientId: string;
  };

export async function requirePatientCreateAccess(
  input:
    PatientOrganizationAccessInput,
) {
  return requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.PATIENT_CREATE,
    organizationId:
      input.organizationId,
  });
}

export async function requirePatientOrganizationLinkAccess(
  input:
    PatientOrganizationAccessInput,
) {
  return requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.PATIENT_CREATE,
    organizationId:
      input.organizationId,
  });
}

async function requireActivePatientLink(
  input:
    ExistingPatientAccessInput,
) {
  const linked =
    await hasActivePatientOrganizationLink(
      input.patientId,
      input.organizationId,
    );

  if (!linked) {
    throw new AccessDeniedError();
  }
}

export async function requirePatientReadAccess(
  input:
    ExistingPatientAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.PATIENT_READ,
    organizationId:
      input.organizationId,
  });

  await requireActivePatientLink(
    input,
  );

  return {
    allowed: true as const,
  };
}

export async function requirePatientUpdateDemographicsAccess(
  input:
    ExistingPatientAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    permission:
      PERMISSIONS.PATIENT_UPDATE_DEMOGRAPHICS,
    organizationId:
      input.organizationId,
  });

  await requireActivePatientLink(
    input,
  );

  return {
    allowed: true as const,
  };
}
