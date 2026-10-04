import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  InvalidAllergyValueError,
} from "../../src/server/allergies/allergy.errors";

import {
  normalizeAllergyNotedAt,
  normalizeAllergyReaction,
  normalizeAllergySubstance,
} from "../../src/server/allergies/allergy.validation";

import {
  InvalidClinicalFlagValueError,
} from "../../src/server/clinical-flags/clinical-flag.errors";

import {
  normalizeClinicalFlagCode,
  normalizeClinicalFlagDetails,
  normalizeClinicalFlagLabel,
} from "../../src/server/clinical-flags/clinical-flag.validation";

test(
  "allergy substance is trimmed",
  () => {
    assert.equal(
      normalizeAllergySubstance(
        "  Penicilina  ",
      ),
      "Penicilina",
    );
  },
);

test(
  "blank allergy substance is rejected",
  () => {
    assert.throws(
      () =>
        normalizeAllergySubstance(
          "   ",
        ),
      InvalidAllergyValueError,
    );
  },
);

test(
  "blank allergy reaction becomes null",
  () => {
    assert.equal(
      normalizeAllergyReaction(
        "   ",
      ),
      null,
    );
  },
);

test(
  "future allergy timestamp is rejected",
  () => {
    assert.throws(
      () =>
        normalizeAllergyNotedAt(
          "2999-01-01T00:00:00.000Z",
        ),
      InvalidAllergyValueError,
    );
  },
);

test(
  "clinical flag code is canonicalized",
  () => {
    assert.equal(
      normalizeClinicalFlagCode(
        "  risco_queda  ",
      ),
      "RISCO_QUEDA",
    );
  },
);

test(
  "invalid clinical flag code is rejected",
  () => {
    assert.throws(
      () =>
        normalizeClinicalFlagCode(
          "risco queda!",
        ),
      InvalidClinicalFlagValueError,
    );
  },
);

test(
  "clinical flag label is trimmed",
  () => {
    assert.equal(
      normalizeClinicalFlagLabel(
        "  Observação clínica  ",
      ),
      "Observação clínica",
    );
  },
);

test(
  "blank clinical flag details become null",
  () => {
    assert.equal(
      normalizeClinicalFlagDetails(
        "   ",
      ),
      null,
    );
  },
);
