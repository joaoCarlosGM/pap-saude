import { randomBytes } from "node:crypto";
import { test as base, expect } from "@playwright/test";

export const TEST_PROXY_HEADER = "x-pap-test-client-ip";

// Documentation-only IPv6 range. One stable client per context/test, including
// page.request and reloads; no counter deletion and no production CAPTCHA bypass.
export function isolatedProxyClientHeaders() {
  const groups = randomBytes(12).toString("hex").match(/.{4}/g)!;
  return { [TEST_PROXY_HEADER]: `2001:db8:${groups.join(":")}` };
}

export const test = base.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => {
    await provide({ ...extraHTTPHeaders, ...isolatedProxyClientHeaders() });
  },
});
export { expect };
