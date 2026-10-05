import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  InvalidClinicalRevisionError,
} from "../../src/server/clinical-revision/clinical-revision.errors";

import {
  assertRevisionActuallyChanges,
  normalizeClinicalRevisionReason,
} from "../../src/server/clinical-revision/clinical-revision.validation";

test(
  "revision reason is trimmed",
  () => {
    assert.equal(
      normalizeClinicalRevisionReason(
        "  Correção documental  ",
      ),
      "Correção documental",
    );
  },
);

test(
  "blank revision reason is rejected",
  () => {
    assert.throws(
      () =>
        normalizeClinicalRevisionReason(
          " ",
        ),
      InvalidClinicalRevisionError,
    );
  },
);

test(
  "revision requires an actual snapshot change",
  () => {
    assert.throws(
      () =>
        assertRevisionActuallyChanges(
          {
            value:
              1,
          },
          {
            value:
              1,
          },
        ),
      InvalidClinicalRevisionError,
    );
  },
);

test(
  "different snapshots are accepted",
  () => {
    assert.doesNotThrow(
      () =>
        assertRevisionActuallyChanges(
          {
            value:
              1,
          },
          {
            value:
              2,
          },
        ),
    );
  },
);
