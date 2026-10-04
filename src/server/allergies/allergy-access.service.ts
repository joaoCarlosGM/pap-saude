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
  AllergyNotFoundError,
} from "./allergy.errors";

export type PatientAllergyAccessInput = {
  userId: string;
  organizationId: string;
  patientId: string;
};

export type ExistingAllergyAccessInput = {
  userId: string;
  organizationId: string;
  allergyId: string;
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

async function requireAllergyContext(
  allergyId: string,
) {
  const allergy =
    await db.allergy.findUnique({
      where: {
        id: allergyId,
      },
      select: {
        id: true,
        patientId: true,
      },
    });

  if (!allergy) {
    throw new AllergyNotFoundError();
  }

  return allergy;
}

export async function requireAllergyCreateAccess(
  input: PatientAllergyAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.ALLERGY_CREATE,
  });

  await requireLinkedPatient(
    input.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
  };
}

export async function requireAllergyReadAccess(
  input: ExistingAllergyAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.ALLERGY_READ,
  });

  const allergy =
    await requireAllergyContext(
      input.allergyId,
    );

  await requireLinkedPatient(
    allergy.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      allergy.patientId,
  };
}

export async function requireAllergyUpdateAccess(
  input: ExistingAllergyAccessInput,
) {
  await requirePermission({
    userId:
      input.userId,
    organizationId:
      input.organizationId,
    permission:
      PERMISSIONS.ALLERGY_UPDATE,
  });

  const allergy =
    await requireAllergyContext(
      input.allergyId,
    );

  await requireLinkedPatient(
    allergy.patientId,
    input.organizationId,
  );

  return {
    allowed: true as const,
    patientId:
      allergy.patientId,
  };
}
