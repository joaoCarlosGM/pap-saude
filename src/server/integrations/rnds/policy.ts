import type { InteroperabilityDecision } from "@/server/interoperability/types";

/**
 * Foundation-only policy boundary.
 *
 * RNDS-specific clinical eligibility rules MUST NOT be guessed here.
 * They will be implemented from the official integration specification
 * applicable during homologation.
 */
export function denyUntilRNDSRulesAreConfigured(): InteroperabilityDecision {
  return {
    allowed: false,
    reason: "RNDS transmission policy has not been configured for this unit.",
  };
}
