export type InteroperabilityDecision =
  | { allowed: true; reason: string }
  | { allowed: false; reason: string };

export type InteroperabilityResource = {
  resourceType: string;
  resourceId: string;
  organizationId: string;
};
