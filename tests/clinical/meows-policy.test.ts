import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  MEOWS_V1_DRAFT_POLICY,
} from "../../src/server/meows/meows-policy.v1-draft";

test(
  "MEOWS policy remains explicitly unvalidated",
  () => {
    assert.equal(
      MEOWS_V1_DRAFT_POLICY.status,
      "DRAFT_UNVALIDATED",
    );

    assert.equal(
      MEOWS_V1_DRAFT_POLICY.clinicallyValidated,
      false,
    );
  },
);

test(
  "MEOWS formula components are explicit",
  () => {
    assert.deepEqual(
      MEOWS_V1_DRAFT_POLICY.scoreComponents,
      [
        "systolicBp",
        "diastolicBp",
        "heartRate",
        "respiratoryRate",
        "temperature",
        "oxygenTherapy",
        "consciousness",
      ],
    );
  },
);

test(
  "missing data produces incomplete result",
  () => {
    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .missingData
        .outcome,
      "INCOMPLETE",
    );

    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .missingData
        .totalScore,
      null,
    );

    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .missingData
        .reportMissingParameters,
      true,
    );
  },
);

test(
  "invalid data is never converted to zero",
  () => {
    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .invalidData
        .behavior,
      "REJECT",
    );

    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .invalidData
        .convertToZero,
      false,
    );
  },
);

test(
  "SpO2 is collected but excluded from current formula",
  () => {
    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .oxygenSaturation
        .collected,
      true,
    );

    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .oxygenSaturation
        .includedInFormula,
      false,
    );

    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .oxygenSaturation
        .confidence,
      "UNRESOLVED",
    );
  },
);

test(
  "temperature matrix is consensus rule",
  () => {
    const rule =
      MEOWS_V1_DRAFT_POLICY
        .temperature;

    assert.equal(
      rule.confidence,
      "CONSENSUS",
    );

    assert.deepEqual(
      rule.bands,
      [
        {
          max:
            35,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            35.1,
          minInclusive:
            true,
          max:
            37.4,
          maxInclusive:
            true,
          score:
            0,
        },
        {
          min:
            37.5,
          minInclusive:
            true,
          max:
            38.9,
          maxInclusive:
            true,
          score:
            2,
        },
        {
          min:
            39,
          minInclusive:
            true,
          score:
            3,
        },
      ],
    );
  },
);

test(
  "numeric cardiovascular and respiratory rules remain provisional",
  () => {
    for (
      const rule of
      MEOWS_V1_DRAFT_POLICY
        .provisionalNumericRules
    ) {
      assert.equal(
        rule.confidence,
        "PROVISIONAL",
      );
    }
  },
);

test(
  "isolated score three alert condition has consensus",
  () => {
    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .isolatedParameterScoreThree
        .alertCandidate,
      true,
    );

    assert.equal(
      MEOWS_V1_DRAFT_POLICY
        .isolatedParameterScoreThree
        .confidence,
      "CONSENSUS",
    );
  },
);

test(
  "all five unresolved protocol decisions remain explicit",
  () => {
    const keys =
      MEOWS_V1_DRAFT_POLICY
        .unresolvedDecisions
        .map(
          (item) =>
            item.key,
        );

    assert.deepEqual(
      keys,
      [
        "P1_ALERT_THRESHOLD",
        "P2_FINAL_NUMERIC_MATRIX",
        "P3_OXYGEN_RULE",
        "P4_CONSCIOUSNESS_RULE",
        "P5_SPO2_ROLE",
      ],
    );
  },
);

test(
  "global threshold is not silently encoded",
  () => {
    const serialized =
      JSON.stringify(
        MEOWS_V1_DRAFT_POLICY,
      );

    assert.equal(
      serialized.includes(
        '"alertThreshold":',
      ),
      false,
    );
  },
);
