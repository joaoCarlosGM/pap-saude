import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { POST as issue } from "../../src/app/api/auth/login/verification/route";
import { resolveTrustedClientOrigin } from "../../src/server/auth/http-auth";
import { UntrustedClientOriginError } from "../../src/server/auth/http-auth.errors";

const webOrigin = "http://127.0.0.1:3110";
const proxyHeader = "x-pap-test-client-ip";
const previousHeader = process.env.AUTH_TRUSTED_CLIENT_IP_HEADER;
const previousOrigins = process.env.AUTH_ALLOWED_ORIGINS;
const previousMode = process.env.NODE_ENV;
function client() {
  return `2001:db8:${randomBytes(12).toString("hex").match(/.{4}/g)!.join(":")}`;
}
function request(clientId?: string, extra: Record<string, string> = {}) {
  return new NextRequest(`${webOrigin}/api/auth/login/verification`, {
    method: "POST",
    headers: {
      origin: webOrigin, "content-type": "application/json",
      ...(clientId ? { [proxyHeader]: clientId } : {}), ...extra,
    },
    body: JSON.stringify({ accessible: true }),
  });
}
function restore(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
before(() => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/pap_saude_onboarding_test");
  process.env.AUTH_ALLOWED_ORIGINS = webOrigin;
  process.env.AUTH_TRUSTED_CLIENT_IP_HEADER = proxyHeader;
});
after(async () => {
  restore("AUTH_TRUSTED_CLIENT_IP_HEADER", previousHeader);
  restore("AUTH_ALLOWED_ORIGINS", previousOrigins);
  restore("NODE_ENV", previousMode);
  await db.$disconnect();
});

test("CAPTCHA 31st issuance is 429; another trusted client on the same HTTP Origin remains independent", async () => {
  const first = client(), second = client();
  for (let i = 0; i < 30; i++) assert.equal((await issue(request(first))).status, 200);
  const denied = await issue(request(first, {
    "x-forwarded-for": client(), "cf-connecting-ip": client(),
    "user-agent": "synthetic-changed-agent", cookie: "untrusted_client=rotated",
  }));
  assert.equal(denied.status, 429);
  assert.deepEqual(await denied.json(), { error: "VERIFICATION_UNAVAILABLE" });
  assert.equal(denied.headers.get("set-cookie"), null);
  assert.equal((await issue(request(second))).status, 200);
});

test("CAPTCHA limit remains atomic under 40 concurrent issuances from one trusted client", async () => {
  const id = client();
  const results = await Promise.all(Array.from({ length: 40 }, () => issue(request(id))));
  assert.equal(results.filter(r => r.status === 200).length, 30);
  assert.equal(results.filter(r => r.status === 429).length, 10);
});

test("CAPTCHA rejects missing or chained configured proxy identifiers instead of trusting spoofed forwarding headers", async () => {
  for (const id of [undefined, "192.0.2.1, 192.0.2.2"]) {
    const req = request(id, { "x-forwarded-for": client(), "cf-connecting-ip": client() });
    assert.throws(() => resolveTrustedClientOrigin(req), UntrustedClientOriginError);
    const response = await issue(req);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "VERIFICATION_UNAVAILABLE" });
  }
});

test("unconfigured forwarding headers cannot choose clients; production requires explicit trusted-proxy configuration", () => {
  try {
    delete process.env.AUTH_TRUSTED_CLIENT_IP_HEADER;
    restore("NODE_ENV", "development");
    for (let i = 0; i < 2; i++) {
      assert.equal(resolveTrustedClientOrigin(request(client(), { "x-forwarded-for": client() })), "local-development");
    }
    restore("NODE_ENV", "production");
    assert.throws(() => resolveTrustedClientOrigin(request(client())), UntrustedClientOriginError);
  } finally {
    process.env.AUTH_TRUSTED_CLIENT_IP_HEADER = proxyHeader;
    restore("NODE_ENV", previousMode);
  }
});
