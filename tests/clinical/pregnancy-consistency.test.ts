import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  validatePregnancyTimeline,
} from "../../src/server/pregnancies/pregnancy-consistency";

test(
  "accepts coherent pregnancy timeline",
  () => {
    assert.doesNotThrow(
      () =>
        validatePregnancyTimeline({
          lastMenstrualDate:
            new Date(
              "2026-01-01T00:00:00.000Z",
            ),
          firstPrenatalAt:
            new Date(
              "2026-02-01T00:00:00.000Z",
            ),
          estimatedDueDate:
            new Date(
              "2026-10-08T00:00:00.000Z",
            ),
        }),
    );
  },
);

test(
  "rejects DPP before DUM",
  () => {
    assert.throws(
      () =>
        validatePregnancyTimeline({
          lastMenstrualDate:
            new Date(
              "2026-02-01T00:00:00.000Z",
            ),
          estimatedDueDate:
            new Date(
              "2026-01-01T00:00:00.000Z",
            ),
        }),
    );
  },
);

test(
  "rejects first prenatal visit before DUM",
  () => {
    assert.throws(
      () =>
        validatePregnancyTimeline({
          lastMenstrualDate:
            new Date(
              "2026-02-01T00:00:00.000Z",
            ),
          firstPrenatalAt:
            new Date(
              "2026-01-20T00:00:00.000Z",
            ),
        }),
    );
  },
);

test(
  "rejects pregnancy end before DUM",
  () => {
    assert.throws(
      () =>
        validatePregnancyTimeline({
          lastMenstrualDate:
            new Date(
              "2026-02-01T00:00:00.000Z",
            ),
          endedAt:
            new Date(
              "2026-01-20T00:00:00.000Z",
            ),
        }),
    );
  },
);

test(
  "rejects pregnancy end before first prenatal visit",
  () => {
    assert.throws(
      () =>
        validatePregnancyTimeline({
          firstPrenatalAt:
            new Date(
              "2026-03-01T00:00:00.000Z",
            ),
          endedAt:
            new Date(
              "2026-02-01T00:00:00.000Z",
            ),
        }),
    );
  },
);
