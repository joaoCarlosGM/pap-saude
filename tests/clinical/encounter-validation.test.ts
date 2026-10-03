import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  normalizeCancellationReason,
  normalizeChiefComplaint,
  normalizeEncounterDate,
} from "../../src/server/encounters/encounter.validation";

test(
  "normalizes chief complaint",
  () => {
    assert.equal(
      normalizeChiefComplaint(
        "  cefaleia  ",
      ),
      "cefaleia",
    );
  },
);

test(
  "blank chief complaint becomes null",
  () => {
    assert.equal(
      normalizeChiefComplaint(
        "   ",
      ),
      null,
    );
  },
);

test(
  "rejects future encounter occurrence",
  () => {
    assert.throws(
      () =>
        normalizeEncounterDate(
          "2999-01-01",
        ),
    );
  },
);

test(
  "rejects malformed encounter date",
  () => {
    assert.throws(
      () =>
        normalizeEncounterDate(
          "invalid-date",
        ),
    );
  },
);

test(
  "normalizes cancellation reason",
  () => {
    assert.equal(
      normalizeCancellationReason(
        "  registro duplicado  ",
      ),
      "registro duplicado",
    );
  },
);

test(
  "rejects blank cancellation reason",
  () => {
    assert.throws(
      () =>
        normalizeCancellationReason(
          "   ",
        ),
    );
  },
);
