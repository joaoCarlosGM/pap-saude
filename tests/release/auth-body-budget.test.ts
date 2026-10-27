import assert from "node:assert/strict";
import { test } from "node:test";
import { readLoginPayload, readMfaCodePayload } from "../../src/server/auth/http-auth";
import { InvalidLoginPayloadError } from "../../src/server/auth/http-auth.errors";

function oversizedStream(fields: Record<string, string>, declared?: string) {
  const bytes = new TextEncoder().encode(JSON.stringify({ ...fields, padding: "x".repeat(128 * 1024) }));
  let offset = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) { controller.close(); return; }
      controller.enqueue(bytes.slice(offset, offset + 1024));
      offset += 1024;
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new Request("https://synthetic.invalid/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json", ...(declared ? { "content-length": declared } : {}) },
    body: stream, duplex: "half",
  } as RequestInit);
  return { request, observed: () => ({ read: offset, cancelled }) };
}

for (const declared of [undefined, "1"]) {
  test(`login cancels an oversized stream with ${declared ? "forged" : "missing"} content-length`, async () => {
    const { request, observed } = oversizedStream({ email: "synthetic@example.invalid", password: "Synthetic-Only-Password" }, declared);
    await assert.rejects(readLoginPayload(request), InvalidLoginPayloadError);
    assert.equal(observed().cancelled, true);
    assert.ok(observed().read <= 17 * 1024, "must stop reading after the 16 KiB budget is exceeded");
  });
  test(`MFA cancels an oversized stream with ${declared ? "forged" : "missing"} content-length`, async () => {
    const { request, observed } = oversizedStream({ code: "123456" }, declared);
    await assert.rejects(readMfaCodePayload(request), InvalidLoginPayloadError);
    assert.equal(observed().cancelled, true);
    assert.ok(observed().read <= 5 * 1024, "must stop reading after the 4 KiB budget is exceeded");
  });
}

test("valid bounded login and both MFA formats preserve their contracts", async () => {
  const request = (value: unknown) => new Request("https://synthetic.invalid/", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value),
  });
  assert.deepEqual(await readLoginPayload(request({ email: "synthetic@example.invalid", password: "Synthetic-Only" })), {
    email: "synthetic@example.invalid", password: "Synthetic-Only",
  });
  assert.deepEqual(await readMfaCodePayload(request({ code: " 123456 " })), { code: "123456", recovery: false });
  assert.deepEqual(await readMfaCodePayload(request({ code: "ABCDEF0123456789ABCDE" })), { code: "ABCDEF0123456789ABCDE", recovery: true });
});

test("actual UTF-8 bytes, malformed JSON and absent bodies fail closed", async () => {
  const request = (body?: string) => new Request("https://synthetic.invalid/", {
    method: "POST", headers: { "content-type": "application/json" }, body,
  });
  await assert.rejects(readLoginPayload(request(JSON.stringify({ email: "synthetic@example.invalid", password: "valid", padding: "é".repeat(9000) }))), InvalidLoginPayloadError);
  await assert.rejects(readLoginPayload(request("{")), InvalidLoginPayloadError);
  await assert.rejects(readLoginPayload(request()), InvalidLoginPayloadError);
  await assert.rejects(readMfaCodePayload(request("{")), InvalidLoginPayloadError);
  await assert.rejects(readMfaCodePayload(request()), InvalidLoginPayloadError);
});
