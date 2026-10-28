import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { db } from "../../src/server/db/client";
import { hashPassword } from "../../src/server/auth/password";

test("real Next HTTP response finishes while recovery SQL is locked, for existing/unknown/inactive/throttled identities", async ({ request }) => {
  expect(new URL(process.env.DATABASE_URL!).pathname).toBe("/pap_saude_m04_d_test");
  const email = `${randomUUID()}@synthetic.invalid`;
  const inactive = `${randomUUID()}@synthetic.invalid`;
  const user = await db.user.create({ data: { email, displayName: "Teste temporal descartável",
    passwordCredential: { create: { passwordHash: await hashPassword(randomUUID() + randomUUID()) } } } });
  await db.user.create({ data: { email: inactive, displayName: "Inativo sintético", isActive: false } });
  const post = (identity: string, timeout = 30000) => request.post("http://127.0.0.1:3110/api/auth/password/forgot", {
    headers: { Origin: "http://127.0.0.1:3110" }, data: { email: identity }, timeout,
  });
  // Compile the real route before testing lifecycle ordering (no cold-build timing).
  expect((await post("warmup@synthetic.invalid")).status()).toBe(202);
  const lock = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await lock.connect();
  try {
    await lock.query("BEGIN");
    // Blocks EVERY recovery issuance before identity lookup, not the HTTP parser.
    // Old await-in-handler implementation cannot finish a single response here.
    await lock.query("LOCK TABLE beta_abuse_buckets IN ACCESS EXCLUSIVE MODE");
    for (const identity of [email, `${randomUUID()}@synthetic.invalid`, inactive, email, email, email, email]) {
      const response = await post(identity, 3000);
      expect(response.status()).toBe(202);
      expect(await response.json()).toEqual({ accepted: true });
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["referrer-policy"]).toBe("no-referrer");
    }
    expect(await db.passwordResetToken.count({ where: { userId: user.id } })).toBe(0);
  } finally {
    await lock.query("ROLLBACK"); await lock.end();
  }
  // Real Next after-work completes after unlocking; original 3/identity quota holds.
  await expect.poll(() => db.passwordResetToken.count({ where: { userId: user.id } }), { timeout: 30000 }).toBe(3);
  await db.$disconnect();
});

test("reset fragment is removed from history and never enters request URLs, Referer or browser console", async ({ page }) => {
  let token = randomBytes(32).toString("base64url"); // Not an issued token.
  const original = token;
  const urls: string[] = [], consoleMessages: string[] = [];
  page.on("request", request => { urls.push(request.url(), request.headers().referer || ""); });
  page.on("console", message => { consoleMessages.push(message.text()); });
  let inspected = false;
  await page.route("**/api/auth/password/reset", async route => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.postDataJSON().token === token).toBe(true);
    inspected = true;
    // Observe the transport without changing any credential or contacting the DB.
    await route.fulfill({ status: 400, contentType: "application/json", body: '{"error":"INVALID_REQUEST"}' });
  });
  await page.goto(`http://127.0.0.1:3110/redefinir-senha#token=${token}`);
  await expect(page).toHaveURL("http://127.0.0.1:3110/redefinir-senha");
  await page.getByLabel("Nova senha",{exact:true}).fill("synthetic-not-a-real-password");
  await page.getByLabel("Confirme a nova senha",{exact:true}).fill("synthetic-not-a-real-password");
  await page.getByRole("button", { name: "Confirmar nova senha" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Não foi possível redefinir a senha.");
  expect(inspected).toBe(true);
  inspected = false;
  token = randomBytes(32).toString("base64url");
  await page.getByLabel("Nova senha",{exact:true}).fill("synthetic-not-a-real-password");
  await page.evaluate(next => { window.location.hash = `token=${next}`; }, token);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page).toHaveURL("http://127.0.0.1:3110/redefinir-senha");
  await expect(page.getByLabel("Nova senha",{exact:true})).toHaveValue("");
  await page.getByLabel("Nova senha",{exact:true}).fill("synthetic-not-a-real-password");
  await page.getByLabel("Confirme a nova senha",{exact:true}).fill("synthetic-not-a-real-password");
  await page.getByRole("button", { name: "Confirmar nova senha" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Não foi possível redefinir a senha.");
  expect(inspected).toBe(true);
  expect(urls.some(url => url.includes(token) || url.includes(original))).toBe(false);
  expect(consoleMessages.some(message => message.includes(token) || message.includes(original))).toBe(false);
});
