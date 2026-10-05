import {
  AuditOutcome,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  ClinicalRevisionActorNotFoundError,
  ClinicalRevisionPatientNotFoundError,
} from "./clinical-revision.errors";

import {
  type ListClinicalRevisionInput,
  type RecordClinicalRevisionInput,
} from "./clinical-revision.types";

import {
  assertRevisionActuallyChanges,
  normalizeClinicalRevisionReason,
} from "./clinical-revision.validation";

async function requirePatient(
  patientId: string,
) {
  const patient =
    await db.patient.findUnique({
      where: {
        id:
          patientId,
      },

      select: {
        id: true,
      },
    });

  if (!patient) {
    throw new ClinicalRevisionPatientNotFoundError();
  }

  return patient;
}

async function requireActor(
  actorUserId: string,
) {
  const actor =
    await db.user.findUnique({
      where: {
        id:
          actorUserId,
      },

      select: {
        id: true,
        isActive: true,
      },
    });

  if (
    !actor ||
    !actor.isActive
  ) {
    throw new ClinicalRevisionActorNotFoundError();
  }

  return actor;
}

export async function recordClinicalRevision(
  input:
    RecordClinicalRevisionInput,
) {
  await requirePatient(
    input.patientId,
  );

  await requireActor(
    input.actorUserId,
  );

  const reason =
    normalizeClinicalRevisionReason(
      input.reason,
    );

  assertRevisionActuallyChanges(
    input.before,
    input.after,
  );

  return db.auditEvent.create({
    data: {
      actorUserId:
        input.actorUserId,

      organizationId:
        input.organizationId,

      patientId:
        input.patientId,

      action:
        "CLINICAL_REVISION",

      resourceType:
        input.resourceType,

      resourceId:
        input.resourceId,

      outcome:
        AuditOutcome.SUCCESS,

      reason,

      before:
        input.before,

      after:
        input.after,

      requestId:
        input.requestId ??
        null,

      correlationId:
        input.correlationId ??
        null,

      sessionId:
        input.sessionId ??
        null,

      metadata:
        input.metadata,
    },
  });
}

export async function listClinicalRevisionHistory(
  input:
    ListClinicalRevisionInput,
) {
  await requirePatient(
    input.patientId,
  );

  return db.auditEvent.findMany({
    where: {
      patientId:
        input.patientId,

      action:
        "CLINICAL_REVISION",

      ...(input.resourceType
        ? {
            resourceType:
              input.resourceType,
          }
        : {}),

      ...(input.resourceId
        ? {
            resourceId:
              input.resourceId,
          }
        : {}),
    },

    orderBy: {
      occurredAt:
        "desc",
    },
  });
}
