import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import * as OTPAuth from "otpauth";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { authenticateLogin } from "../../src/server/auth/login.service";
import {
  completeMfaLogin,
  completeMfaLoginWithRecoveryCode,
} from "../../src/server/auth/mfa-login.service";
import { POST as security } from "../../src/app/api/auth/security/route";
import { fixture } from "./fixtures";
const origin = "http://127.0.0.1:3110";

test.beforeAll(async () => {
  await bootstrapSystemIam();
});
test.afterAll(async () => {
  await db.$disconnect();
});
test.afterEach(async ({}, info) => {
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
  await page
    .context()
    .addCookies([
      {
        name: "pap_session",
        value: token,
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
}
async function a11y(page: Page) {
  const result = await new AxeBuilder({ page })
    .include(".ob")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({ id: v.id, impact: v.impact })),
  ).toEqual([]);
}
async function capture(page: Page, name: string) {
  await mkdir("docs/evidence/missao-04-a1", { recursive: true });
  await page.screenshot({
    path: `docs/evidence/missao-04-a1/${name}.png`,
    fullPage: true,
    maskColor: "#475569",
    mask: [page.locator("[data-sensitive]"), page.locator("input")],
  });
}
async function enrolled(useRecovery = false) {
  const f = await fixture();
  const setup = await (await f.post("START_MFA")).json();
  const confirmation = await (
    await f.post("CONFIRM_MFA", {
      factorId: setup.factorId,
      code: OTPAuth.URI.parse(setup.provisioningUri).generate(),
    })
  ).json();
  await f.post("ACK_RECOVERY");
  const login = await authenticateLogin({
    email: f.user.email,
    password: f.password,
    origin: "m04-account-test",
  });
  if (login.status !== "MFA_REQUIRED")
    throw new Error("Expected real second-factor challenge");
  const verified = useRecovery
    ? await completeMfaLoginWithRecoveryCode({
        challengeToken: login.challengeToken,
        recoveryCode: confirmation.codes[0],
      })
    : await completeMfaLogin({
        challengeToken: login.challengeToken,
        code: OTPAuth.URI.parse(setup.provisioningUri).generate(),
      });
  const done = await security(
    new NextRequest(origin + "/api/auth/security", {
      method: "POST",
      headers: {
        origin,
        cookie: `pap_session=${verified.sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "COMPLETE_ONBOARDING" }),
    }),
  );
  expect(done.status).toBe(200);
  return {
    ...f,
    setup,
    token: verified.sessionToken,
    verifiedSessionId: verified.session.id,
  };
}
async function securityFingerprint(userId: string, sessionId: string) {
  const [credential, factors, roles, session, progress, recovery] =
    await Promise.all([
      db.passwordCredential.findUniqueOrThrow({ where: { userId } }),
      db.mfaFactor.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      db.roleAssignment.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      db.session.findUniqueOrThrow({
        where: { id: sessionId },
        select: { id: true, mfaVerifiedAt: true, revokedAt: true },
      }),
      db.userOnboardingProgress.findFirst({
        where: { userId, tourKey: "security-first-access" },
      }),
      db.mfaRecoveryCode.findMany({
        where: { userId },
        orderBy: { id: "asc" },
      }),
    ]);
  // Kept only in test memory. Compare booleans, never serialize into diagnostics.
  return JSON.stringify({
    credential,
    factors,
    roles,
    session,
    progress,
    recovery,
  });
}

test("login has local lightweight artwork, form first on mobile, dark and keyboard access", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("http") && !url.startsWith(origin + "/")) {
      external.push(new URL(url).origin);
      await route.abort();
    } else await route.continue();
  });
  await page.addInitScript(() => {
    const measurements = window as unknown as {
      m04Performance: { cls: number; lcp: number };
    };
    measurements.m04Performance = { cls: 0, lcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput)
          measurements.m04Performance.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        measurements.m04Performance.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const measurements: { width: number; cls: number; lcp: number }[] = [];
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Entrar", exact: true }),
    ).toBeEnabled();
    const art = page.getByAltText(
      "Unidade de saúde entre natureza e recursos digitais de cuidado",
    );
    await expect(art).toBeVisible();
    expect(
      await art.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 1000,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const form = await page.locator("form").boundingBox(),
      picture = await art.boundingBox();
    expect(!!form && !!picture && (width > 760 || form.y < picture.y)).toBe(
      true,
    );
    await page.getByLabel("E-mail", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
    await a11y(page);
    await capture(page, `login-${width}`);
    const timing = await page.evaluate(
      () =>
        (window as unknown as { m04Performance: { cls: number; lcp: number } })
          .m04Performance,
    );
    expect(timing.cls <= 0.1).toBe(true);
    measurements.push({ width, ...timing });
  }
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await a11y(page);
  await capture(page, "login-escuro");
  expect(external).toEqual([]);
  await writeFile(
    "docs/evidence/missao-04-a1/performance-laboratorio.json",
    JSON.stringify(
      {
        context:
          "Chromium headless, servidor de desenvolvimento aquecido; não são métricas de campo nem baseline comparativo",
        measurements,
      },
      null,
      2,
    ) + "\n",
  );
  await page.goto("/minha-seguranca");
  await expect(page).toHaveURL(/\/login$/);
});

test("primary session manages own security and explicit help without creating MFA or opening admin", async ({
  page,
}) => {
  const f = await fixture();
  await cookie(page, f.session.token);
  let writes = 0;
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/security") && req.method() === "POST")
      writes++;
  });
  await page.goto("/minha-seguranca");
  await expect(
    page.getByText("MFA ainda não ativado.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Segurança da minha conta",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Gerar QR Code", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Configurar autenticador" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ajuda / Refazer tutorial" }).click();
  await expect(page).toHaveURL(/\/ajuda\/seguranca$/);
  await a11y(page);
  expect(writes).toBe(0);
  expect(await db.mfaFactor.count({ where: { userId: f.user.id } })).toBe(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/primeiros-passos$/);
});

test("completed account stays unchanged across security routes, reload and explicit admin help", async ({
  page,
}) => {
  const f = await enrolled();
  await cookie(page, f.token);
  const before = await securityFingerprint(f.user.id, f.verifiedSessionId);
  let writes = 0;
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/security") && req.method() === "POST")
      writes++;
  });
  for (const path of ["/minha-seguranca", "/admin/minha-seguranca"]) {
    await page.goto(path);
    await expect(
      page.getByText("MFA ativo. Seu autenticador atual foi preservado."),
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Segurança da minha conta",
        exact: true,
      }),
    ).toBeVisible();
  }
  expect(writes).toBe(0);
  expect(
    (await securityFingerprint(f.user.id, f.verifiedSessionId)) === before,
  ).toBe(true);
  expect(
    await db.userOnboardingProgress.count({
      where: { userId: f.user.id, tourKey: "admin-core" },
    }),
  ).toBe(0);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole("button", { name: "Ajuda", exact: true }).click();
  const tour = page.getByRole("dialog");
  await expect(tour).toBeVisible();
  const box = await tour.boundingBox();
  expect(!!box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
  await page.keyboard.press("Escape");
  await expect(tour).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ajuda", exact: true }),
  ).toBeFocused();
  expect(
    (await securityFingerprint(f.user.id, f.verifiedSessionId)) === before,
  ).toBe(true);
  await page.goto("/minha-seguranca");
  await a11y(page);
  await capture(page, "conta-admin-320");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "dark" });
  await a11y(page);
  await capture(page, "conta-admin-escuro");
});

test("recovery management requires explicit strong reauth and preserves MFA, password and onboarding", async ({
  page,
}) => {
  const f = await enrolled(true);
  await cookie(page, f.token);
  const factor = await db.mfaFactor.findFirstOrThrow({
    where: { userId: f.user.id, status: "ACTIVE" },
  });
  const credential = await db.passwordCredential.findUniqueOrThrow({
    where: { userId: f.user.id },
  });
  await page.goto("/minha-seguranca");
  await page
    .getByRole("button", { name: "Gerenciar recuperação", exact: true })
    .click();
  await page.getByLabel("Senha para gerar recuperação").fill("wrong");
  await page
    .getByLabel("Código TOTP para gerar recuperação")
    .fill(OTPAuth.URI.parse(f.setup.provisioningUri).generate());
  await page
    .getByRole("button", {
      name: "Gerar novos códigos de recuperação",
      exact: true,
    })
    .click();
  await expect(page.locator(".ob [role=alert]")).toContainText(
    "Senha atual ou segundo fator incorreto",
  );
  await page.getByLabel("Senha para gerar recuperação").fill(f.password);
  await page
    .getByLabel("Código TOTP para gerar recuperação")
    .fill(OTPAuth.URI.parse(f.setup.provisioningUri).generate());
  await page
    .getByRole("button", {
      name: "Gerar novos códigos de recuperação",
      exact: true,
    })
    .click();
  await expect(page.locator(".ob-codes li")).toHaveCount(10);
  await expect(
    page.getByRole("button", { name: "Ocultar códigos e continuar" }),
  ).toBeDisabled();
  await page.getByLabel("Guardei os códigos em um local seguro.").check();
  await page
    .getByRole("button", { name: "Ocultar códigos e continuar" })
    .click();
  await expect(page.locator(".ob-codes")).toHaveCount(0);
  expect(await db.mfaFactor.count({ where: { userId: f.user.id } })).toBe(1);
  expect(
    (await db.mfaFactor.findUniqueOrThrow({ where: { id: factor.id } }))
      .secretEncrypted === factor.secretEncrypted,
  ).toBe(true);
  expect(
    (
      await db.passwordCredential.findUniqueOrThrow({
        where: { userId: f.user.id },
      })
    ).passwordHash === credential.passwordHash,
  ).toBe(true);
  expect(
    (
      await db.userOnboardingProgress.findFirstOrThrow({
        where: { userId: f.user.id, tourKey: "security-first-access" },
      })
    ).status,
  ).toBe("COMPLETED");
});
