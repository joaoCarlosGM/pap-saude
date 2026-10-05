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
