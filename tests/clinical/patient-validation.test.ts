import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  normalizePatientBirthDate,
  normalizePatientCns,
  normalizePatientCpf,
  normalizePatientName,
  normalizePatientState,
} from "../../src/server/patients/patient.validation";

test(
  "normalizes patient full name",
  () => {
    assert.equal(
      normalizePatientName(
        "  Maria   da Silva  ",
      ),
      "Maria da Silva",
    );
  },
);

test(
  "normalizes CPF to digits only",
  () => {
    assert.equal(
      normalizePatientCpf(
        "123.456.789-01",
      ),
      "12345678901",
    );
  },
);

test(
  "rejects CPF with invalid length",
  () => {
    assert.throws(
      () =>
        normalizePatientCpf(
          "123",
        ),
    );
  },
);

test(
  "normalizes CNS to digits only",
  () => {
    assert.equal(
      normalizePatientCns(
        "123 4567 8901 2345",
      ),
      "123456789012345",
    );
  },
);

test(
  "rejects CNS with invalid length",
  () => {
    assert.throws(
      () =>
        normalizePatientCns(
          "123",
        ),
    );
  },
);

test(
  "rejects future birth date",
  () => {
    assert.throws(
      () =>
        normalizePatientBirthDate(
          "2999-01-01",
        ),
    );
  },
);

test(
  "normalizes state to uppercase",
  () => {
    assert.equal(
      normalizePatientState(
        "pa",
      ),
      "PA",
    );
  },
);
