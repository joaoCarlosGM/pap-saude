import {
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  hasActivePatientOrganizationLink,
} from "../patients/patient-organization.service";

import {
  EncounterPatientNotLinkedError,
  InactivePatientEncounterError,
  InvalidEncounterOrganizationError,
} from "./encounter.errors";

export async function requireEncounterOrganizationContext(
  patientId: string,
  organizationId: string,
) {
  const [
    patient,
    organization,
  ] =
    await Promise.all([
      db.patient.findUnique({
        where: {
          id: patientId,
        },
        select: {
          id: true,
          isActive: true,
        },
      }),
      db.organization.findUnique({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
          type: true,
          status: true,
          isActive: true,
        },
      }),
    ]);

  if (
    !patient ||
    !patient.isActive
  ) {
    throw new InactivePatientEncounterError();
  }

  if (
    !organization ||
    organization.type !==
      OrganizationType.HEALTH_UNIT ||
    organization.status !==
      OrganizationStatus.ACTIVE ||
    !organization.isActive
  ) {
    throw new InvalidEncounterOrganizationError();
  }

  const linked =
    await hasActivePatientOrganizationLink(
      patientId,
      organizationId,
    );

  if (!linked) {
    throw new EncounterPatientNotLinkedError();
  }

  return {
    patient,
    organization,
  };
}
