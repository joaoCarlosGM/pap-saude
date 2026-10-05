import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  MeowsEvaluationStatus,
} from "@prisma/client";

import {
  evaluateMeowsDraft,
} from "../../src/server/meows/meows-engine";

import {
  scoreNumericParameter,
  sumMeowsComponentScores,
} from "../../src/server/meows/meows-scoring";

import {
  MEOWS_V1_DRAFT_POLICY,
} from "../../src/server/meows/meows-policy.v1-draft";

test(
  "scores systolic blood pressure draft bands",
  () => {
    const rule =
      MEOWS_V1_DRAFT_POLICY
        .provisionalNumericRules
        .find(
          (item) =>
            item.parameter ===
            "systolicBp",
        );

    assert.ok(rule);

    assert.equal(
      scoreNumericParameter(
        rule,
        79,
      ),
      3,
    );

    assert.equal(
      scoreNumericParameter(
        rule,
        120,
      ),
      0,
    );

    assert.equal(
      scoreNumericParameter(
        rule,
        160,
      ),
      3,
    );
  },
);

test(
  "scores consensus temperature bands",
  () => {
    const rule =
      MEOWS_V1_DRAFT_POLICY
        .temperature;

    assert.equal(
      scoreNumericParameter(
        rule,
        35,
      ),
      2,
    );

    assert.equal(
      scoreNumericParameter(
        rule,
        36.5,
      ),
      0,
    );

    assert.equal(
      scoreNumericParameter(
        rule,
        38,
      ),
      2,
    );

    assert.equal(
      scoreNumericParameter(
        rule,
        39,
      ),
      3,
    );
  },
);

test(
  "pure aggregate sums valid component scores",
  () => {
    assert.equal(
      sumMeowsComponentScores(
        [
          0,
          1,
          2,
          3,
          0,
          2,
          3,
        ],
      ),
      11,
    );
  },
);

test(
  "complete numeric input remains policy unresolved",
  () => {
    const result =
      evaluateMeowsDraft({
        systolicBp:
          120,

        diastolicBp:
          80,

        heartRate:
          90,

        respiratoryRate:
          15,

        temperature:
          36.5,

        oxygenSaturation:
          98,

        consciousness:
          "ALERT",
      });

    assert.equal(
      result.status,
      MeowsEvaluationStatus
        .POLICY_UNRESOLVED,
    );

    assert.equal(
      result.totalScore,
      null,
    );

    assert.equal(
      result.alertLevel,
      null,
    );

    assert.equal(
      result.clinicallyValidated,
      false,
    );

    assert.deepEqual(
      result.unresolvedParameters,
      [
        "oxygenTherapy",
        "consciousness",
      ],
    );
  },
);

test(
  "missing temperature produces incomplete evaluation",
  () => {
    const result =
      evaluateMeowsDraft({
        systolicBp:
          120,

        diastolicBp:
          80,

        heartRate:
          90,

        respiratoryRate:
          15,

        temperature:
          null,

        oxygenSaturation:
          98,

        consciousness:
          "ALERT",
      });

    assert.equal(
      result.status,
      MeowsEvaluationStatus
        .INCOMPLETE,
    );

    assert.deepEqual(
      result.missingParameters,
      [
        "temperature",
      ],
    );

    assert.equal(
      result.totalScore,
      null,
    );
  },
);

test(
  "SpO2 does not create a component score",
  () => {
    const result =
      evaluateMeowsDraft({
        systolicBp:
          120,

        diastolicBp:
          80,

        heartRate:
          90,

        respiratoryRate:
          15,

        temperature:
          36.5,

        oxygenSaturation:
          97,

        consciousness:
          "ALERT",
      });

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result.componentScores,
        "oxygenSaturation",
      ),
      false,
    );
  },
);
