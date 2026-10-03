import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  calculateEstimatedDueDate,
  calculateEstimatedLastMenstrualDate,
  calculateGestationalAge,
  STANDARD_GESTATION_DAYS,
} from "../../src/server/pregnancies/gestational-dating";

test(
  "standard gestation uses 280 days",
  () => {
    assert.equal(
      STANDARD_GESTATION_DAYS,
      280,
    );
  },
);

test(
  "calculates estimated due date from DUM",
  () => {
    const result =
      calculateEstimatedDueDate(
        "2026-01-01",
      );

    assert.equal(
      result.toISOString()
        .slice(0, 10),
      "2026-10-08",
    );
  },
);

test(
  "calculates estimated DUM from DPP",
  () => {
    const result =
      calculateEstimatedLastMenstrualDate(
        "2026-10-08",
      );

    assert.equal(
      result.toISOString()
        .slice(0, 10),
      "2026-01-01",
    );
  },
);

test(
  "calculates gestational age in weeks and days",
  () => {
    const age =
      calculateGestationalAge(
        "2026-01-01",
        "2026-03-13",
      );

    assert.equal(
      age.totalDays,
      71,
    );

    assert.equal(
      age.weeks,
      10,
    );

    assert.equal(
      age.days,
      1,
    );
  },
);

test(
  "gestational age at DUM is zero",
  () => {
    const age =
      calculateGestationalAge(
        "2026-01-01",
        "2026-01-01",
      );

    assert.deepEqual(
      age,
      {
        totalDays: 0,
        weeks: 0,
        days: 0,
      },
    );
  },
);

test(
  "rejects reference date before DUM",
  () => {
    assert.throws(
      () =>
        calculateGestationalAge(
          "2026-01-10",
          "2026-01-01",
        ),
    );
  },
);
