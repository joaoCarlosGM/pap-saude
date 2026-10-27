import {
  CLINICAL_REVISION_RESOURCE_TYPES,
  type ClinicalRevisionResourceType,
} from "./clinical-revision.types";

import {
  InvalidClinicalRevisionError,
} from "./clinical-revision.errors";

const MAX_REASON_LENGTH =
  1000;

export function normalizeClinicalRevisionReason(
  reason: string,
): string {
  if (typeof reason !== "string") throw new InvalidClinicalRevisionError("reason");
  const normalized =
    reason.trim();

  if (
    normalized.length < 3 ||
    normalized.length >
      MAX_REASON_LENGTH
  ) {
    throw new InvalidClinicalRevisionError(
      "reason",
    );
  }

  return normalized;
}

export function assertClinicalRevisionResourceType(
  value: string,
): asserts value is ClinicalRevisionResourceType {
  if (
    !CLINICAL_REVISION_RESOURCE_TYPES.includes(
      value as ClinicalRevisionResourceType,
    )
  ) {
    throw new InvalidClinicalRevisionError(
      "resourceType",
    );
  }
}

export function assertRevisionActuallyChanges(
  before: unknown,
  after: unknown,
): void {
  if (
    JSON.stringify(before) ===
    JSON.stringify(after)
  ) {
    throw new InvalidClinicalRevisionError(
      "unchangedSnapshot",
    );
  }
}

const PROPOSABLE_FIELDS: Record<ClinicalRevisionResourceType, readonly string[]> = {
  PATIENT: ["fullName", "socialName", "birthDate", "phone", "email", "address", "city", "state"],
  PREGNANCY: ["lastMenstrualDate", "estimatedDueDate", "firstPrenatalAt", "gravida", "parity"],
  ENCOUNTER: ["chiefComplaint"],
  VITAL_SIGNS: ["systolicBp", "diastolicBp", "heartRate", "respiratoryRate", "temperature", "oxygenSaturation", "consciousness", "urineOutputMl", "proteinuria", "recordedAt"],
  OBSTETRIC_DATA: ["uterineHeightCm", "fetalHeartRate", "fetalMovement", "edema", "bleeding", "weightKg", "complaints", "notes", "recordedAt"],
  ALLERGY: ["substance", "reaction", "severity"],
  CLINICAL_FLAG: ["label", "details"],
  // No proposal can claim a validated protocol, score or automatic alert.
  MEOWS_EVALUATION: ["clinicalNotes"],
};

/** These values are a proposal, not validated medical data or an applied change. */
export function normalizeProposedClinicalChange(type: ClinicalRevisionResourceType, value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidClinicalRevisionError("proposedAfter");
  const entries = Object.entries(value);
  if (!entries.length || JSON.stringify(value).length > 16_384) throw new InvalidClinicalRevisionError("proposedAfter");
  for (const [key, item] of entries) {
    if (!PROPOSABLE_FIELDS[type].includes(key) ||
      !(item === null || typeof item === "string" || typeof item === "boolean" || typeof item === "number") ||
      (typeof item === "number" && !Number.isFinite(item))) throw new InvalidClinicalRevisionError("proposedAfter");
  }
  return Object.fromEntries(entries);
}
