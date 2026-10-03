import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  normalizeHistoricalPregnancyDate,
  normalizePregnancyCount,
  normalizePregnancyDate,
} from "../../src/server/pregnancies/pregnancy.validation";

test(
  "accepts valid pregnancy date",
  () => {
    const date =
      normalizePregnancyDate(
        "2026-12-01",
      );

    assert.ok(
      date instanceof Date,
    );
  },
);

test(
  "rejects malformed pregnancy date",
  () => {
    assert.throws(
      () =>
        normalizePregnancyDate(
          "invalid-date",
        ),
    );
  },
);

test(
  "historical pregnancy date rejects future date",
  () => {
    assert.throws(
      () =>
        normalizeHistoricalPregnancyDate(
          "2999-01-01",
        ),
    );
  },
);

test(
  "accepts nonnegative integer pregnancy count",
  () => {
    assert.equal(
      normalizePregnancyCount(
        2,
      ),
      2,
    );
  },
);

test(
  "rejects negative pregnancy count",
  () => {
    assert.throws(
      () =>
        normalizePregnancyCount(
          -1,
        ),
    );
  },
);

test(
  "rejects fractional pregnancy count",
  () => {
    assert.throws(
      () =>
        normalizePregnancyCount(
          1.5,
        ),
    );
  },
);
