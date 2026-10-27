import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMeowsDraft } from "../../src/server/meows/meows-engine";
import { MEOWS_V1_DRAFT_POLICY } from "../../src/server/meows/meows-policy.v1-draft";
import type { MeowsNumericInputs } from "../../src/server/meows/meows-engine.types";

const complete: MeowsNumericInputs = {
  systolicBp: 120,
  diastolicBp: 80,
  heartRate: 90,
  respiratoryRate: 16,
  temperature: 36.5,
  oxygenSaturation: 98,
  consciousness: "ALERT",
};

test("every existing draft numeric band remains unable to activate a clinical classification", () => {
  let checked = 0;
  for (const rule of MEOWS_V1_DRAFT_POLICY.provisionalNumericRules) {
    for (const band of rule.bands) {
      // Test values come from the existing policy; this test defines no new band.
      const value = band.min === undefined
        ? band.max!
        : band.min + (band.minInclusive === false ? 1 : 0);
      const result = evaluateMeowsDraft({ ...complete, [rule.parameter]: value });
      assert.equal(result.protocolStatus, "DRAFT_UNVALIDATED");
      assert.equal(result.clinicallyValidated, false);
      assert.equal(result.totalScore, null);
      assert.equal(result.alertLevel, null);
      assert.equal(result.status, "POLICY_UNRESOLVED");
      checked++;
    }
  }
  assert.ok(checked > 0);
});

test("recorded oxygen saturation and consciousness never resolve the unapproved decisions", () => {
  for (const consciousness of ["ALERT", "VOICE", "PAIN", "UNRESPONSIVE"] as const) {
    for (const oxygenSaturation of [0, 98, 100]) {
      const result = evaluateMeowsDraft({ ...complete, consciousness, oxygenSaturation });
      assert.deepEqual(result.unresolvedParameters, ["oxygenTherapy", "consciousness"]);
      assert.equal(result.totalScore, null);
      assert.equal(result.alertLevel, null);
      assert.equal(result.clinicallyValidated, false);
    }
  }
});

test("missing measurements cannot be silently classified as normal", () => {
  const result = evaluateMeowsDraft({
    systolicBp: undefined, diastolicBp: undefined, heartRate: undefined,
    respiratoryRate: undefined, temperature: undefined,
  });
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.totalScore, null);
  assert.equal(result.alertLevel, null);
  assert.equal(result.clinicallyValidated, false);
  assert.ok(result.missingParameters.length > 0);
});

test("invalid measurements are rejected rather than converted into reassuring scores", () => {
  for (const value of [NaN, Infinity, -1, 0, 1.5]) {
    assert.throws(() => evaluateMeowsDraft({ ...complete, systolicBp: value }));
  }
  assert.equal(MEOWS_V1_DRAFT_POLICY.status, "DRAFT_UNVALIDATED");
  assert.equal(MEOWS_V1_DRAFT_POLICY.clinicallyValidated, false);
});
