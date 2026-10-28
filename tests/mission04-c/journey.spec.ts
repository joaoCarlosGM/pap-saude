import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as OTPAuth from "otpauth";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { navigationFingerprint } from "../first-access/login-fixtures";
import { solveLoginVerification } from "../helpers/browser-login-verification";
import {
  actor,
  invite,
  accept,
  signIn,
  decide,
  invitationToken,
  command,
  request,
  origin,
} from "./fixtures";
test.beforeAll(async () => {
  expect(new URL(process.env.DATABASE_URL!).pathname).toBe(
    "/pap_saude_m04_c_test",
  );
  await bootstrapSystemIam();
});
test.afterAll(() => db.$disconnect());
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus)
    await page
      .evaluate(() => {
        document
          .querySelectorAll("[data-sensitive], .ob-private")
          .forEach((el) => {
            el.textContent = "[mascarado]";
          });
        document.querySelectorAll("input,textarea").forEach((el) => {
          (el as HTMLInputElement).value = "";
        });
      })
      .catch(() => {});
  for (const error of info.errors) {
    const location =
      error.stack?.match(/journey\.spec\.ts:\d+:\d+/g)?.join(", ") || "";
    error.message = (error.message || "Browser assertion failed")
      .split("\n")[0]
      .replace(/https?:\/\/\S+/g, "[URL]");
    error.stack = location;
  }
});
async function cookie(context: BrowserContext, token: string) {
  await context.addCookies([
    {
      name: "pap_session",
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await solveLoginVerification(page);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function capture(page: Page, name: string) {
  await mkdir("docs/evidence/missao-04-c", { recursive: true });
  await page.screenshot({
    path: `docs/evidence/missao-04-c/${name}.png`,
    fullPage: true,
    mask: [
      page.locator("input"),
      page.locator("[data-sensitive]"),
      page.locator("textarea"),
    ],
    maskColor: "#475569",
  });
}
async function a11y(page: Page, name: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if (result.violations.length)
    await writeFile(
      `/tmp/m04-c-axe-${name}.json`,
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            failureSummary: n.failureSummary,
          })),
        })),
        null,
        2,
      ),
    );
  expect(result.violations.map((v) => v.id)).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("recipient accepts by fragment, waits after verified MFA without repeating wizard, checks authorization and receives a persistent notification; 320/768/1440 light/dark and keyboard", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const metrics = { lcpMs: 0, cls: 0 };
    Object.assign(window, { papCPerformance: metrics });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) metrics.lcpMs = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const shift = e as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const manager = await actor("PAP_MANAGER"),
    i = await invite(manager);
  let leakedQuery = false,
    external = false;
  page.on("request", (r) => {
    if (new URL(r.url()).searchParams.has("token")) leakedQuery = true;
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith("http") && url.origin !== origin) {
      external = true;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(`/aceitar-convite#token=${encodeURIComponent(i.token)}`);
  await expect(page.getByLabel("Crie sua senha")).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe("");
  await capture(page, "aceite-desktop");
  await page.getByLabel("Crie sua senha").fill(i.password);
  await page.getByLabel("Confirme a nova senha").fill(i.password);
  await page
    .getByRole("button", { name: "Aceitar e aguardar autorização" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Convite aceito", exact: true }),
  ).toBeVisible();
  // Waiting/consent UX uses the existing real enrollment/challenge fixture;
  // the separate Manager journey below exercises enrollment in the browser.
  await cookie(page.context(), await signIn(i.email, i.password));
  await page.goto("/login");
  await expect(page).toHaveURL(/\/aguardando-autorizacao$/);
  await expect(
    page.getByRole("heading", { name: "Aguardando autorização", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Seu acesso ainda não foi liberado.", { exact: true }),
  ).toBeVisible();
  const performanceRows = [];
  for (const width of [1440, 768, 320])
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.reload();
      await expect(
        page.getByRole("heading", {
          name: "Aguardando autorização",
          exact: true,
        }),
      ).toBeVisible();
      const metrics = await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images]
            .filter((img) => img.getClientRects().length > 0)
            .map((img) => img.decode().catch(() => {})),
        );
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        return (
          window as unknown as {
            papCPerformance: { lcpMs: number; cls: number };
          }
        ).papCPerformance;
      });
      expect(metrics.cls).toBeLessThanOrEqual(0.1);
      performanceRows.push({ width, colorScheme, ...metrics });
      await a11y(page, `espera-${width}-${colorScheme}`);
      await capture(page, `espera-${width}-${colorScheme}`);
    }
  await writeFile(
    "docs/evidence/missao-04-c/performance.json",
    JSON.stringify(
      {
        environment:
          "single-run local Next dev; diagnostic, not a production p75 or SLA",
        rows: performanceRows,
      },
      null,
      2,
    ) + "\n",
  );
  await page
    .getByRole("button", { name: "Consultar status", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Sair da conta" }),
  ).toBeFocused();
  await page.getByText("Preciso de ajuda", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("link", { name: "Segurança da minha conta" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Consultar status", exact: true })
    .click();
  await expect(
    page.getByText("Situação atualizada.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Aguardando autorização", exact: true }),
  ).toBeVisible();
  expect((await decide(manager.token, i.id)).status).toBe(200);
  await page
    .getByRole("button", { name: "Consultar status", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu acesso foi liberado", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Marcar como lida" }),
  ).toBeVisible();
  await a11y(page, "autorizado-mobile-dark");
  await capture(page, "autorizado-mobile-dark");
  await page.getByRole("button", { name: "Marcar como lida" }).click();
  await page.reload();
  await expect(page.getByText("Lida", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Continuar para meu acesso", exact: true })
    .click();
  await expect(page).toHaveURL(/\/comercial$/);
  await expect(
    page.getByRole("heading", { name: "Seu perfil comercial está autorizado" }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/comercial$/);
  expect(leakedQuery).toBe(false);
  expect(external).toBe(false);
});

test("Manager issues and reviews own Commercial invitation through queue; never sees Manager approval or UBS activation; revoke reaches recipient", async ({
  page,
  context,
}) => {
  const manager = await actor("PAP_MANAGER"),
    address = `${randomUUID()}@synthetic.invalid`;
  await cookie(context, manager.token);
  await page.goto("/admin/convites-globais");
  await page.getByLabel("Nome da pessoa").fill("Pessoa da fila sintética");
  await page.getByLabel("E-mail do convite").fill(address);
  await expect(
    page.getByRole("option", { name: "Gerente PAP", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Criar convite global" }).click();
  const card = page
    .locator(".access-queue-list > li")
    .filter({ hasText: address });
  await expect(
    card.getByText("Aguardando aceite", { exact: true }),
  ).toBeVisible();
  const row = await db.accessInvitation.findFirstOrThrow({
    where: { email: address },
  });
  const i = {
    id: row.id,
    email: address,
    token: await invitationToken(address, row.id),
    password: `Synthetic-${randomUUID()}`,
  };
  expect((await accept(i)).status).toBe(200);
  await page.getByLabel("Filtrar situação").selectOption("PENDING_ASSIGNMENT");
  await expect(
    card.getByText("Aguardando atribuição", { exact: true }),
  ).toBeVisible();
  await card
    .getByLabel("Motivo da decisão")
    .fill("Autorização comercial sintética");
  await card
    .getByRole("button", { name: "Autorizar perfil", exact: true })
    .click();
  await page.getByLabel("Filtrar situação").selectOption("ACTIVE");
  await expect(
    card.getByText("Perfil autorizado", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Ativar UBS/ })).toHaveCount(0);
  for (const [width, scheme] of [
    [1440, "light"],
    [768, "light"],
    [320, "dark"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await a11y(page, `fila-${width}-${scheme}`);
    await capture(page, `fila-${width}-${scheme}`);
  }
  page.once("dialog", (d) => d.accept("Revogação sintética de homologação"));
  await card
    .getByRole("button", { name: "Revogar perfil", exact: true })
    .click();
  await page.getByLabel("Filtrar situação").selectOption("REVOKED");
  await expect(card.getByText("Revogado", { exact: true })).toBeVisible();
  const token = await signIn(i.email, i.password);
  await context.clearCookies();
  await cookie(context, token);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/aguardando-autorizacao$/);
  await expect(
    page.getByRole("heading", { name: "Seu perfil foi revogado", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Seu perfil de acesso foi revogado", { exact: true }),
  ).toBeVisible();
  await a11y(page, "revogado");
  await capture(page, "revogado-mobile-dark");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("Global appoints Manager and completed MFA identity returns to admin without restarting onboarding or rotating factor/session", async ({
  page,
  context,
}) => {
  const admin = await actor(),
    recipient = await actor();
  await db.roleAssignment.deleteMany({ where: { userId: recipient.user.id } });
  const i = await invite(admin, "PAP_MANAGER", recipient.user.email);
  i.password = recipient.password;
  const before = JSON.parse(await navigationFingerprint(recipient.user.id));
  await cookie(context, recipient.token);
  await page.goto(`/aceitar-convite#token=${encodeURIComponent(i.token)}`);
  await page.getByLabel("Confirme sua senha atual").fill(recipient.password);
  await page
    .getByRole("button", { name: "Aceitar e aguardar autorização" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Convite aceito", exact: true }),
  ).toBeVisible();
  expect((await decide(admin.token, i.id, "PAP_MANAGER")).status).toBe(200);
  await cookie(context, recipient.token);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/admin(?:\/solicitacoes)?$/);
  await page.goto("/primeiros-passos");
  await expect(page).toHaveURL(/\/admin(?:\/solicitacoes)?$/);
  await expect(
    page.getByRole("heading", { name: "Seu cuidado começa com segurança" }),
  ).toHaveCount(0);
  const after = JSON.parse(await navigationFingerprint(recipient.user.id));
  before[6] = [];
  after[6] = [];
  expect(JSON.stringify(before) === JSON.stringify(after)).toBe(true);
});

test("newly approved Manager completes real QR/TOTP and new MFA login before privileged access; reload never reopens completed wizard", async ({
  page,
}) => {
  const admin = await actor(),
    i = await invite(admin, "PAP_MANAGER");
  expect((await accept(i)).status).toBe(200);
  expect((await decide(admin.token, i.id, "PAP_MANAGER")).status).toBe(200);
  await login(page, i.email, i.password);
  await expect(page).toHaveURL(/\/primeiros-passos$/);
  const denied = await page.request.get("/api/admin/access-invitations");
  expect(denied.status()).toBe(403);
  await page.getByRole("button", { name: "Começar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Senha atual", { exact: true }).fill(i.password);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/security") &&
      r.request().postDataJSON()?.action === "START_MFA",
  );
  await page
    .getByRole("button", { name: "Gerar QR Code", exact: true })
    .click();
  const enrollment = await (await response).json();
  await expect(
    page.getByAltText(
      "QR Code privado para cadastrar sua conta PAP Saúde no autenticador",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Já cadastrei no aplicativo" })
    .click();
  await page
    .getByLabel("Código de seis dígitos", { exact: true })
    .fill(OTPAuth.URI.parse(enrollment.provisioningUri).generate());
  await page
    .getByRole("button", { name: "Confirmar código", exact: true })
    .click();
  await page.getByLabel("Guardei os códigos em um local seguro.").check();
  await page
    .getByRole("button", { name: "Ocultar códigos e continuar" })
    .click();
  await page
    .getByRole("button", { name: "Encerrar sessão e fazer novo login" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, i.email, i.password);
  await page
    .getByLabel("Código do autenticador ou código de recuperação")
    .fill(OTPAuth.URI.parse(enrollment.provisioningUri).generate());
  await page
    .getByRole("button", { name: "Confirmar MFA", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Concluir e acessar minha área" })
    .click();
  await expect(page).toHaveURL(/\/admin(?:\/solicitacoes)?$/);
  await page.reload();
  await expect(page).toHaveURL(/\/admin(?:\/solicitacoes)?$/);
  const u = await db.user.findUniqueOrThrow({ where: { email: i.email } });
  expect(
    await db.mfaFactor.count({ where: { userId: u.id, status: "ACTIVE" } }),
  ).toBe(1);
  await page.goto("/primeiros-passos");
  await expect(page).toHaveURL(/\/admin(?:\/solicitacoes)?$/);
});

test("pending, Admin, Manager and Commercial direct clinical HTML/RSC requests expose no clinical fixture or redirect loop", async ({
  page,
  context,
}) => {
  const manager = await actor("PAP_MANAGER"),
    admin = await actor(),
    commercial = await actor("COMMERCIAL");
  const i = await invite(manager);
  await accept(i);
  const pending = await signIn(i.email, i.password);
  const marker = `CLINICAL-CANARY-${randomUUID()}`;
  const patient = await db.patient.create({
    data: { fullName: marker, birthDate: new Date("2000-01-01") },
  });
  await db.patientOrganization.create({
    data: { patientId: patient.id, organizationId: manager.unit.id },
  });
  for (const token of [
    undefined,
    admin.token,
    manager.token,
    commercial.token,
    pending,
  ]) {
    await context.clearCookies();
    if (token) await cookie(context, token);
    for (const path of [
      "/dashboard",
      "/pacientes",
      `/pacientes/${patient.id}`,
      "/registro",
      "/atendimentos",
    ]) {
      const variants: Record<string, string>[] = [
        {},
        { RSC: "1", "Next-Router-Prefetch": "1" },
      ];
      for (const headers of variants) {
        const r = await page.request.get(path, { headers, maxRedirects: 0 });
        expect([307, 308]).toContain(r.status());
        expect((await r.text()).includes(marker)).toBe(false);
      }
    }
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).pathname).not.toBe("/dashboard");
    expect((await page.content()).includes(marker)).toBe(false);
    if (token === pending)
      await expect(page).toHaveURL(/\/aguardando-autorizacao$/);
    if (token === commercial.token)
      await expect(page).toHaveURL(/\/comercial$/);
  }
});

test("expired, reused and revoked invitation links show unavailable UX without account creation or operational access", async ({
  page,
}) => {
  const admin = await actor();
  const expired = await invite(admin);
  await db.accessInvitation.update({
    where: { id: expired.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const revoked = await invite(admin);
  expect(
    (
      await command(
        request("/api/admin/access-invitations", admin.token, {
          operation: "REVOKE",
          id: revoked.id,
          reason: "Revogação de teste",
        }),
      )
    ).status,
  ).toBe(200);
  const used = await invite(admin);
  expect((await accept(used)).status).toBe(200);
  for (const i of [expired, revoked, used]) {
    await page.goto(`/aceitar-convite#token=${encodeURIComponent(i.token)}`);
    await expect(page.locator(".access-error[role=alert]")).toContainText(
      "Este convite é inválido",
    );
    await expect(
      page.getByRole("button", { name: "Aceitar e aguardar autorização" }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => location.hash)).toBe("");
  }
  expect(
    await db.user.count({
      where: { email: { in: [expired.email, revoked.email] } },
    }),
  ).toBe(0);
});

test("resending while the old activation page is open consumes only the new fragment and discards stale password/token state", async ({
  page,
}) => {
  const manager = await actor("PAP_MANAGER"),
    i = await invite(manager);
  await page.goto(`/aceitar-convite#token=${encodeURIComponent(i.token)}`);
  await expect(page.getByLabel("Crie sua senha")).toBeVisible();
  expect(
    (
      await command(
        request("/api/admin/access-invitations", manager.token, {
          operation: "RESEND",
          id: i.id,
        }),
      )
    ).status,
  ).toBe(200);
  const current = await invitationToken(i.email, i.id);
  expect(current === i.token).toBe(false);
  await page.getByLabel("Crie sua senha").fill("Stale-password-value");
  await page.goto(`/aceitar-convite#token=${encodeURIComponent(current)}`);
  await expect(page).toHaveURL(`${origin}/aceitar-convite`);
  await expect(page.getByLabel("Crie sua senha")).toHaveValue("");
  await page.getByLabel("Crie sua senha").fill(i.password);
  await page.getByLabel("Confirme a nova senha").fill(i.password);
  await page
    .getByRole("button", { name: "Aceitar e aguardar autorização" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Convite aceito", exact: true }),
  ).toBeVisible();
  expect(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } }))
      .status,
  ).toBe("PENDING_ASSIGNMENT");
});

test("C-AUDIT-01: Global approval displays the accepted role without a selector and sends only that role", async ({
  page,
  context,
}) => {
  const admin = await actor();
  const i = await invite(admin, "COMMERCIAL");
  expect((await accept(i)).status).toBe(200);
  await cookie(context, admin.token);
  await page.goto("/admin/convites-globais");
  await page.getByLabel("Filtrar situação").selectOption("PENDING_ASSIGNMENT");
  const card = page
    .locator(".access-queue-list > li")
    .filter({ hasText: i.email });
  await expect(card.getByText(/Perfil aceito: Comercial/)).toBeVisible();
  await expect(card.getByRole("combobox")).toHaveCount(0);
  await expect(card.getByText(/novo consentimento explícito/)).toBeVisible();
  await card
    .getByLabel("Motivo da decisão")
    .fill("Confirmar apenas o perfil aceito");
  const outgoing = page.waitForRequest(
    (r) =>
      r.url().endsWith("/api/admin/access-invitations") &&
      r.method() === "POST",
  );
  await card
    .getByRole("button", { name: "Autorizar perfil", exact: true })
    .click();
  expect((await outgoing).postDataJSON().roleKey).toBe("COMMERCIAL");
  await page.getByLabel("Filtrar situação").selectOption("ACTIVE");
  await expect(
    card.getByText("Perfil autorizado", { exact: true }),
  ).toBeVisible();
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  expect(row.proposedRoleKey).toBe("COMMERCIAL");
  await a11y(page, "c-audit-01-consent");
});
