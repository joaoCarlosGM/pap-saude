import {
  OrganizationStatus,
  OrganizationType,
  Prisma,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  PatientNotFoundError,
} from "./patient.errors";

import {
  InactivePatientOrganizationLinkError,
  InvalidPatientOrganizationTargetError,
  PatientAlreadyLinkedError,
  PatientMedicalRecordConflictError,
  PatientOrganizationLinkInactiveError,
  PatientOrganizationNotFoundError,
} from "./patient-organization.errors";

import {
  type LinkPatientToOrganizationInput,
  type ListOrganizationPatientsInput,
  type ListPatientOrganizationsInput,
  type RYG7DetfCB4cQUbnEqJRE5cPeRBGtx6jpo,
} from "./patient-organization.types";

const DEFAULT_LIST_LIMIT =
  50;

const MAX_LIST_LIMIT =
  100;

function normalizeMedicalRecordNo(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value.trim();

  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(
    0,
    100,
  );
}

function normalizeListLimit(
  take?: number,
): number {
  if (
    take == null ||
    !Number.isInteger(take) ||
    take < 1
  ) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(
    take,
    MAX_LIST_LIMIT,
  );
}

async function requireLinkablePatient(
  patientId: string,
) {
  const patient =
    await db.patient.findUnique({
      where: {
        id: patientId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (!patient) {
    throw new PatientNotFoundError();
  }

  if (!patient.isActive) {
    throw new InactivePatientOrganizationLinkError();
  }

  return patient;
}

async function requireActiveHealthUnit(
  organizationId: string,
) {
  const organization =
    await db.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        type: true,
        status: true,
        isActive: true,
      },
    });

  if (
    !organization ||
    organization.type !==
      OrganizationType.HEALTH_UNIT ||
    organization.status !==
      OrganizationStatus.ACTIVE ||
    !organization.isActive
  ) {
    throw new InvalidPatientOrganizationTargetError();
  }

  return organization;
}

function mapPatientOrganizationConflict(
  error: unknown,
): never {
  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const diagnostic =
      [
        JSON.stringify(
          error.meta ?? {},
        ),
        error.message,
      ].join(" ");

    if (
      diagnostic.includes(
        "patient_organizations_organizationId_medicalRecordNo_key",
      ) ||
      (
        diagnostic.includes(
          "organizationId",
        ) &&
        diagnostic.includes(
          "medicalRecordNo",
        )
      )
    ) {
      throw new PatientMedicalRecordConflictError();
    }

    if (
      diagnostic.includes(
        "patient_organizations_patientId_organizationId_key",
      ) ||
      (
        diagnostic.includes(
          "patientId",
        ) &&
        diagnostic.includes(
          "organizationId",
        )
      )
    ) {
      throw new PatientAlreadyLinkedError();
    }
  }

  throw error;
}

export async function linkPatientToOrganization(
  input: LinkPatientToOrganizationInput,
) {
  await Promise.all([
    requireLinkablePatient(
      input.patientId,
    ),
    requireActiveHealthUnit(
      input.organizationId,
    ),
  ]);

  const existing =
    await db.patientOrganization.findUnique({
      where: {
        patientId_organizationId: {
          patientId:
            input.patientId,
          organizationId:
            input.organizationId,
        },
      },
    });

  if (existing) {
    if (
      existing.unlinkedAt == null
    ) {
      throw new PatientAlreadyLinkedError();
    }

    throw new PatientOrganizationLinkInactiveError();
  }

  const medicalRecordNo =
    normalizeMedicalRecordNo(
      input.medicalRecordNo,
    );

  try {
    return await db.$transaction(
      async (tx) => {
        if (input.isPrimary) {
          await tx.patientOrganization.updateMany({
            where: {
              patientId:
                input.patientId,
              unlinkedAt: null,
              isPrimary: true,
            },
            data: {
              isPrimary: false,
            },
          });
        }

        return tx.patientOrganization.create({
          data: {
            patientId:
              input.patientId,
            organizationId:
              input.organizationId,
            medicalRecordNo,
            isPrimary:
              input.isPrimary ??
              false,
          },
          include: {
            organization: true,
          },
        });
      },
    );
  } catch (error) {
    return mapPatientOrganizationConflict(
      error,
    );
  }
}

export async function unlinkPatientFromOrganization(
  patientId: string,
  organizationId: string,
) {
  const existing =
    await db.patientOrganization.findUnique({
      where: {
        patientId_organizationId: {
          patientId,
          organizationId,
        },
      },
    });

  if (!existing) {
    throw new PatientOrganizationNotFoundError();
  }

  if (existing.unlinkedAt) {
    return existing;
  }

  return db.patientOrganization.update({
    where: {
      id: existing.id,
    },
    data: {
      unlinkedAt:
        new Date(),
      isPrimary:
        false,
    },
  });
}

export async function reactivatePatientOrganizationLink(
  input: RYG7DetfCB4cQUbnEqJRE5cPeRBGtx6jpo,
) {
  await Promise.all([
    requireLinkablePatient(
      input.patientId,
    ),
    requireActiveHealthUnit(
      input.organizationId,
    ),
  ]);

  const existing =
    await db.patientOrganization.findUnique({
      where: {
        patientId_organizationId: {
          patientId:
            input.patientId,
          organizationId:
            input.organizationId,
        },
      },
    });

  if (!existing) {
    throw new PatientOrganizationNotFoundError();
  }

  if (
    existing.unlinkedAt == null
  ) {
    throw new PatientAlreadyLinkedError();
  }

  const medicalRecordNo =
    input.medicalRecordNo ===
    undefined
      ? existing.medicalRecordNo
      : normalizeMedicalRecordNo(
          input.medicalRecordNo,
        );

  try {
    return await db.$transaction(
      async (tx) => {
        if (input.isPrimary) {
          await tx.patientOrganization.updateMany({
            where: {
              patientId:
                input.patientId,
              unlinkedAt: null,
              isPrimary: true,
            },
            data: {
              isPrimary: false,
            },
          });
        }

        return tx.patientOrganization.update({
          where: {
            id: existing.id,
          },
          data: {
            unlinkedAt:
              null,
            medicalRecordNo,
            isPrimary:
              input.isPrimary ??
              existing.isPrimary,
          },
          include: {
            organization: true,
          },
        });
      },
    );
  } catch (error) {
    return mapPatientOrganizationConflict(
      error,
    );
  }
}

export async function listPatientOrganizations(
  patientId: string,
  input:
    ListPatientOrganizationsInput = {},
) {
  const patient =
    await db.patient.findUnique({
      where: {
        id: patientId,
      },
      select: {
        id: true,
      },
    });

  if (!patient) {
    throw new PatientNotFoundError();
  }

  return db.patientOrganization.findMany({
    where: {
      patientId,
      ...(!input.includeInactive
        ? {
            unlinkedAt: null,
          }
        : {}),
    },
    include: {
      organization: true,
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        linkedAt: "asc",
      },
    ],
  });
}

export async function listOrganizationPatients(
  organizationId: string,
  input:
    ListOrganizationPatientsInput = {},
) {
  await requireActiveHealthUnit(
    organizationId,
  );

  return db.patientOrganization.findMany({
    where: {
      organizationId,
      ...(!input.includeInactiveLinks
        ? {
            unlinkedAt: null,
          }
        : {}),
    },
    include: {
      patient: true,
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        linkedAt: "desc",
      },
    ],
    take:
      normalizeListLimit(
        input.take,
      ),
  });
}

export async function hasActivePatientOrganizationLink(
  patientId: string,
  organizationId: string,
): Promise<boolean> {
  const link =
    await db.patientOrganization.findUnique({
      where: {
        patientId_organizationId: {
          patientId,
          organizationId,
        },
      },
      select: {
        unlinkedAt: true,
      },
    });

  return Boolean(
    link &&
    link.unlinkedAt == null,
  );
}
