import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { fixture } from "./fixtures";
import { verifiedLoginFixture, navigationFingerprint } from "./login-fixtures";
const origin = "http://127.0.0.1:3110";

test.beforeAll(() => bootstrapSystemIam());
test.afterAll(() => db.$disconnect());
test.afterEach(async ({}, info) => {
  // Keep dynamic credentials, challenge cookies and call logs out of artifacts.
  for (const error of info.errors) {
    const location =
      error.stack?.match(/[\w-]+\.spec\.ts:\d+:\d+/g)?.join(", ") || "";
    error.message = (error.message || "Browser assertion failed")
      .split("\n")[0]
      .replace(/https?:\/\/\S+/g, "[URL]");
    error.stack = location;
  }
});
async function cookie(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: "pap_session",
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
function observeNavigation(page: Page) {
  let documents = 0,
    loginCookieWrites = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents++;
  });
  page.on("response", (response) => {
    if (
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/login" &&
      response.headers()["set-cookie"]
    )
      loginCookieWrites++;
  });
  return () => ({ documents, loginCookieWrites });
}

test("GET login redirects verified complete Admin on the server without renewing or changing account state", async ({
  page,
}) => {
  const f = await verifiedLoginFixture();
  await cookie(page, f.verified.sessionToken);
  const before = await navigationFingerprint(f.user.id);
  const counters = observeNavigation(page);
  const response = await page.goto("/login");
  await expect(page).toHaveURL(/\/admin$/);
  expect(response?.request().redirectedFrom()?.url().endsWith("/login")).toBe(
    true,
  );
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toHaveCount(0);
  expect(counters().documents <= 2).toBe(true);
  expect(counters().loginCookieWrites).toBe(0);
  expect(before === (await navigationFingerprint(f.user.id))).toBe(true);
  const current = (await page.context().cookies()).find(
    (c) => c.name === "pap_session",
  );
  expect(current?.value === f.verified.sessionToken).toBe(true);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/admin$/);
  expect(counters().documents <= 4).toBe(true);
});

test("missing, unknown, expired and revoked session cookies show login without redirect loops", async ({
  page,
}) => {
  const f = await fixture();
  const counters = observeNavigation(page);
  for (const kind of ["missing", "unknown", "expired", "revoked"] as const) {
    await page.context().clearCookies();
    if (kind === "unknown")
      await cookie(page, randomBytes(32).toString("base64url"));
    if (kind === "expired" || kind === "revoked") {
      await db.session.update({
        where: { id: f.session.session.id },
        data:
          kind === "expired"
            ? {
                createdAt: new Date(Date.now() - 9 * 3_600_000),
                lastSeenAt: new Date(Date.now() - 9 * 3_600_000),
                expiresAt: new Date(Date.now() - 3_600_000),
              }
            : {
                expiresAt: new Date(Date.now() + 60_000),
                revokedAt: new Date(),
                revocationReason: "LOGOUT",
              },
      });
      await cookie(page, f.session.token);
    }
    const before = await navigationFingerprint(f.user.id);
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Entrar", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(before === (await navigationFingerprint(f.user.id))).toBe(true);
  }
  expect(counters().documents).toBe(4);
  expect(counters().loginCookieWrites).toBe(0);
});

test("primary Admin with completed metadata cannot inherit MFA, and verified incomplete Admin continues setup", async ({
  page,
}) => {
  const complete = await verifiedLoginFixture();
  const incomplete = await verifiedLoginFixture(false);
  for (const token of [
    complete.session.token,
    incomplete.verified.sessionToken,
  ]) {
    await cookie(page, token);
    const counters = observeNavigation(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/primeiros-passos$/);
    await expect(
      page.getByRole("button", { name: "Entrar", exact: true }),
    ).toHaveCount(0);
    expect(counters().documents <= 2).toBe(true);
  }
  await cookie(page, complete.session.token);
  expect((await page.request.get("/api/admin/organizations")).status()).toBe(
    403,
  );
  expect(
    (
      await db.session.findUniqueOrThrow({
        where: { id: complete.session.session.id },
      })
    ).mfaVerifiedAt,
  ).toBeNull();
});

test("pending MFA resumes after reload ahead of an older session and only authenticates after the real second factor", async ({
  page,
}) => {
  const older = await verifiedLoginFixture();
  const target = await verifiedLoginFixture();
  await cookie(page, older.verified.sessionToken);
  const response = await page.request.post("/api/auth/login", {
    headers: { origin },
    data: { email: target.user.email, password: target.password },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).mfaRequired).toBe(true);
  const before = await navigationFingerprint(target.user.id);
  const counters = observeNavigation(page);
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Confirmar MFA", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Confirmar MFA", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(before === (await navigationFingerprint(target.user.id))).toBe(true);
  expect(counters().documents).toBe(2);
  expect(counters().loginCookieWrites).toBe(0);
  // Remove only the old test session cookie; the pending challenge stays intact.
  await page.context().clearCookies({ name: "pap_session" });
  expect((await page.request.get("/api/admin/organizations")).status()).toBe(
    401,
  );
  await page
    .getByLabel("Código do autenticador ou código de recuperação")
    .fill(target.codes[1]);
  await page
    .getByRole("button", { name: "Confirmar MFA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("authorized professional with optional MFA goes to dashboard after deferral", async ({
  page,
}) => {
  const f = await fixture("PROFESSIONAL");
  await f.post("DEFER_OPTIONAL_MFA");
  await cookie(page, f.session.token);
  const before = await navigationFingerprint(f.user.id);
  const counters = observeNavigation(page);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(counters().documents <= 2).toBe(true);
  expect(before === (await navigationFingerprint(f.user.id))).toBe(true);
  expect(
    (
      await db.session.findUniqueOrThrow({
        where: { id: f.session.session.id },
      })
    ).mfaVerifiedAt,
  ).toBeNull();
});

test("account without effective operational role stays restricted with no form or operational links", async ({
  page,
}) => {
  const f = await fixture();
  await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
  await cookie(page, f.session.token);
  const before = await navigationFingerprint(f.user.id);
  const counters = observeNavigation(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Acesso restrito", exact: true }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(
    page.locator('a[href="/admin"], a[href="/dashboard"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".ob")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((v) => v.id),
  ).toEqual([]);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Acesso restrito", exact: true }),
  ).toBeVisible();
  expect(counters().documents).toBe(2);
  expect(counters().loginCookieWrites).toBe(0);
  expect(before === (await navigationFingerprint(f.user.id))).toBe(true);
});
