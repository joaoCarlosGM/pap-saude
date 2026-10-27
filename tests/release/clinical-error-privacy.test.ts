import assert from "node:assert/strict";
import { test } from "node:test";
import { clinicalErrorResponse } from "../../src/server/http/clinical-api-response";

test("unexpected clinical failures do not copy exception contents to logs or the response", async () => {
  const calls: unknown[][] = [];
  const previous = console.error;
  console.error = (...args: unknown[]) => { calls.push(args); };
  try {
    // Synthetic canaries represent fields often included by ORM exception formatters.
    const error = Object.assign(new Error("SYNTHETIC_PRIVATE_RECORD_CANARY"), {
      query: "SYNTHETIC_QUERY_CANARY", meta: { patient: "SYNTHETIC_PATIENT_CANARY" },
    });
    const response = clinicalErrorResponse(error);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "INTERNAL_ERROR" });
    assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
    assert.deepEqual(calls, [["CLINICAL_API_INTERNAL_ERROR"]]);
  } finally {
    console.error = previous;
  }
});

test("denied clinical access is generic and does not log an exception", async () => {
  const calls: unknown[][] = [];
  const previous = console.error;
  console.error = (...args: unknown[]) => { calls.push(args); };
  try {
    const error = new Error("SYNTHETIC_PRIVATE_RECORD_CANARY");
    error.name = "ClinicalResourceNotFoundError";
    const response = clinicalErrorResponse(error);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "ACCESS_DENIED", message: "Access to this resource is denied.",
    });
    assert.deepEqual(calls, []);
  } finally {
    console.error = previous;
  }
});
