import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  InvalidVitalSignValueError,
  InvalidVitalSignsRecordedAtError,
} from "../../src/server/vital-signs/vital-signs.errors";

import {
  normalizeOxygenSaturation,
  normalizePositiveInteger,
  normalizeTemperature,
  normalizeUrineOutput,
  normalizeVitalSignsRecordedAt,
} from "../../src/server/vital-signs/vital-signs.validation";

test(
  "accepts positive integer vital value",
  () => {
    assert.equal(
      normalizePositiveInteger(
        "heartRate",
        80,
      ),
      80,
    );
  },
);

test(
  "rejects zero required vital value",
  () => {
    assert.throws(
      () =>
        normalizePositiveInteger(
          "heartRate",
          0,
        ),
      InvalidVitalSignValueError,
    );
  },
);

test(
  "rejects fractional required vital value",
  () => {
    assert.throws(
      () =>
        normalizePositiveInteger(
          "heartRate",
          80.5,
        ),
      InvalidVitalSignValueError,
    );
  },
);

test(
  "accepts oxygen saturation boundaries",
  () => {
    assert.equal(
      normalizeOxygenSaturation(0),
      0,
    );

    assert.equal(
      normalizeOxygenSaturation(100),
      100,
    );
  },
);

test(
  "rejects oxygen saturation above 100",
  () => {
    assert.throws(
      () =>
        normalizeOxygenSaturation(
          101,
        ),
      InvalidVitalSignValueError,
    );
  },
);

test(
  "temperature supports one decimal place",
  () => {
    assert.equal(
      normalizeTemperature(36.5),
      36.5,
    );
  },
);

test(
  "temperature rejects excess precision",
  () => {
    assert.throws(
      () =>
        normalizeTemperature(
          36.55,
        ),
      InvalidVitalSignValueError,
    );
  },
);

test(
  "urine output accepts zero",
  () => {
    assert.equal(
      normalizeUrineOutput(0),
      0,
    );
  },
);

test(
  "urine output rejects negative value",
  () => {
    assert.throws(
      () =>
        normalizeUrineOutput(-1),
      InvalidVitalSignValueError,
    );
  },
);

test(
  "recordedAt rejects future date",
  () => {
    assert.throws(
      () =>
        normalizeVitalSignsRecordedAt(
          "2999-01-01T00:00:00.000Z",
        ),
      InvalidVitalSignsRecordedAtError,
    );
  },
);
