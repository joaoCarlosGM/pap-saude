import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  InvalidObstetricDataRecordedAtError,
  InvalidObstetricDataValueError,
} from "../../src/server/obstetric-data/obstetric-data.errors";

import {
  normalizeComplaints,
  normalizeNonNegativeDecimal,
  normalizeObstetricRecordedAt,
  normalizePositiveDecimal,
  normalizePositiveInteger,
} from "../../src/server/obstetric-data/obstetric-data.validation";

test(
  "uterine height accepts zero and two decimals",
  () => {
    assert.equal(
      normalizeNonNegativeDecimal(
        "uterineHeightCm",
        30.25,
        2,
      ),
      30.25,
    );
  },
);

test(
  "uterine height rejects negative value",
  () => {
    assert.throws(
      () =>
        normalizeNonNegativeDecimal(
          "uterineHeightCm",
          -1,
          2,
        ),
      InvalidObstetricDataValueError,
    );
  },
);

test(
  "fetal heart rate must be positive integer",
  () => {
    assert.equal(
      normalizePositiveInteger(
        "fetalHeartRate",
        140,
      ),
      140,
    );

    assert.throws(
      () =>
        normalizePositiveInteger(
          "fetalHeartRate",
          0,
        ),
      InvalidObstetricDataValueError,
    );
  },
);

test(
  "weight must be positive",
  () => {
    assert.equal(
      normalizePositiveDecimal(
        "weightKg",
        62.5,
        2,
      ),
      62.5,
    );

    assert.throws(
      () =>
        normalizePositiveDecimal(
          "weightKg",
          0,
          2,
        ),
      InvalidObstetricDataValueError,
    );
  },
);

test(
  "complaints are trimmed",
  () => {
    assert.equal(
      normalizeComplaints(
        "  cefaleia  ",
      ),
      "cefaleia",
    );
  },
);

test(
  "blank complaints become null",
  () => {
    assert.equal(
      normalizeComplaints(
        "   ",
      ),
      null,
    );
  },
);

test(
  "recordedAt rejects future timestamp",
  () => {
    assert.throws(
      () =>
        normalizeObstetricRecordedAt(
          "2999-01-01T00:00:00.000Z",
        ),
      InvalidObstetricDataRecordedAtError,
    );
  },
);
