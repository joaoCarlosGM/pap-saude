import {solveLoginVerification} from "../helpers/browser-login-verification";
import { verifiedSessionToken } from "../helpers/verified-admin-session";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as OTPAuth from "otpauth";
import { mkdir } from "node:fs/promises";
import { fixture } from "./fixtures";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import {
  createHealthUnitAdminInvitation,
  createProfessionalInvitation,
} from "../../src/server/invitations/invitation.service";
import { randomUUID, randomBytes } from "node:crypto";
const origin = "http://127.0.0.1:3110";
test.beforeAll(async () => {
  await bootstrapSystemIam();
});
test.afterEach(async ({}, info) => {
  // Preserve failure status and source location, discard dynamic call logs and
  // values before Playwright creates its error-context attachment.
  for (const error of info.errors) {
    const location =
      error.stack?.match(/browser\.spec\.ts:\d+:\d+/g)?.join(", ") || "";
    error.message = (error.message || "Browser assertion failed")
      .split("\n")[0]
      .replace(/https?:\/\/\S+/g, "[URL]");
    error.stack = location;
  }
});
test.afterAll(async () => {
  await db.$disconnect();
});
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await solveLoginVerification(page);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function a11y(page: Page) {
  const results = await new AxeBuilder({ page })
    .include(".ob, .auth-access")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, impact: v.impact })),
  ).toEqual([]);
}
async function capture(page: Page, name: string) {
  await mkdir("docs/evidence/missao-03", { recursive: true });
  // Never capture a QR, manual key, credential, TOTP or recovery code. Mask the
  // sensitive container and all inputs before producing shareable screenshots.
  await page.screenshot({
    path: `docs/evidence/missao-03/${name}.png`,
    fullPage: true,
    maskColor: "#475569",
    mask: [page.locator("[data-sensitive]"), page.locator("input")],
  });
}
for (const role of ["PAP_ADMIN", "HEALTH_UNIT_ADMIN", "PROFESSIONAL"] as const)
  test(`${role}: browser first access, offline QR, recovery and new MFA login`, async ({
    page,
  }) => {
    const root = await fixture();
    let email = root.user.email,
      password = root.password,
      userId = root.user.id;
    if (role !== "PAP_ADMIN") {
      const inviteEmail = `${randomUUID()}@synthetic.invalid`;
      if (role === "HEALTH_UNIT_ADMIN")
        await db.organizationCandidate.create({
          data: {
            type: "HEALTH_UNIT",
            name: "UBS sintética aprovada",
            normalizedName: "ubs sintetica aprovada",
            dedupeKey: randomUUID(),
            status: "APPROVED",
            contactEmail: inviteEmail,
            consentedAt: new Date(),
            convertedOrganizationId: root.unit.id,
          },
        });
      const invite = await (
        role === "HEALTH_UNIT_ADMIN"
          ? createHealthUnitAdminInvitation
          : createProfessionalInvitation
      )({
        invitedByUserId: root.user.id,
        actorSessionToken: await verifiedSessionToken(root.user.id),
        organizationId: root.unit.id,
        email: inviteEmail,
        displayName: "Pessoa convidada sintética",
      });
      // The development contract exposes a one-time URL only to the inviter. No
      // fixture is persisted; tracing and automatic screenshots are disabled.
      if (!invite.developmentUrl)
        throw new Error("Development invitation required");
      const token = new URL(invite.developmentUrl).searchParams.get("token")!;
      email = invite.invitation.email;
      password = randomBytes(24).toString("base64url");
      await page.goto(`/convite?token=${encodeURIComponent(token)}`);
      await page.getByLabel("Crie sua senha").fill(password);
      await page.getByRole("button", { name: "Ativar meu acesso" }).click();
      await expect(
        page.getByRole("heading", { name: "Acesso ativado" }),
      ).toBeVisible();
      userId = (await db.user.findUniqueOrThrow({ where: { email } })).id;
    }
    const external: string[] = [];
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (
        url.startsWith("http") &&
        !url.startsWith(origin + "/") &&
        url !== origin
      ) {
        external.push(new URL(url).origin);
        await route.abort();
      } else await route.continue();
    });
    await login(page, email, password);
    await expect(
      page.getByRole("heading", { name: "Seu cuidado começa com segurança" }),
    ).toBeVisible();
    await expect(page.getByText(role, { exact: false }).first()).toBeVisible();
    await a11y(page);
    if (role === "PAP_ADMIN") {
      await capture(page, "desktop-boas-vindas");
      await page
        .getByRole("button", { name: "Alternar modo claro e escuro" })
        .click();
      await a11y(page);
      await capture(page, "desktop-escuro");
      await page
        .getByRole("button", { name: "Alternar modo claro e escuro" })
        .click();
      await page.setViewportSize({ width: 320, height: 740 });
      await a11y(page);
      await capture(page, "mobile-320");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await page.getByRole("button", { name: "Começar", exact: true }).click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByLabel("Senha atual", { exact: true }).fill(password);
    let starts = 0;
    page.on("request", (req) => {
      if (
        req.url().endsWith("/api/auth/security") &&
        req.method() === "POST" &&
        req.postDataJSON()?.action === "START_MFA"
      )
        starts++;
    });
    const enrollmentResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/auth/security") &&
        r.request().postDataJSON()?.action === "START_MFA",
    );
    await page
      .getByRole("button", { name: "Gerar QR Code", exact: true })
      .dblclick();
    const enrollment = await (await enrollmentResponse).json();
    await expect(
      page.getByAltText(
        "QR Code privado para cadastrar sua conta PAP Saúde no autenticador",
      ),
    ).toBeVisible();
    expect(starts).toBe(1);
    await a11y(page);
    if (role === "PAP_ADMIN") await capture(page, "qr-mascarado");
    // Reload must not create another key or leak the old URI through GET/storage.
    if (role === "HEALTH_UNIT_ADMIN") {
      await page.reload();
      await expect(
        page.getByText("Cadastro pendente encontrado"),
      ).toBeVisible();
      expect(starts).toBe(1);
      expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(
        "{}",
      );
      await page.getByLabel("Senha atual", { exact: true }).fill(password);
      await page
        .getByLabel(
          "Confirmo que a nova chave substituirá a configuração pendente anterior.",
        )
        .check();
      const renewed = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/auth/security") &&
          r.request().postDataJSON()?.action === "START_MFA",
      );
      await page
        .getByRole("button", { name: "Gerar nova chave", exact: true })
        .click();
      Object.assign(enrollment, await (await renewed).json());
      await expect(
        page.getByAltText(
          "QR Code privado para cadastrar sua conta PAP Saúde no autenticador",
        ),
      ).toBeVisible();
    }
    await page
      .getByRole("button", { name: "Já cadastrei no aplicativo" })
      .click();
    await page.getByLabel("Código de seis dígitos", { exact: true }).fill(
      OTPAuth.URI.parse(enrollment.provisioningUri).generate({
        timestamp: Date.now() - 120000,
      }),
    );
    await page
      .getByRole("button", { name: "Confirmar código", exact: true })
      .click();
    await expect(page.locator(".ob [role=alert]")).toContainText(
      "Código inválido ou expirado",
    );
    await page
      .getByLabel("Código de seis dígitos", { exact: true })
      .fill(OTPAuth.URI.parse(enrollment.provisioningUri).generate());
    await page
      .getByRole("button", { name: "Confirmar código", exact: true })
      .click();
    await expect(
      page.getByText("Guardei os códigos em um local seguro.", { exact: true }),
    ).toBeVisible();
    await a11y(page);
    if (role === "PAP_ADMIN") await capture(page, "recuperacao-mascarada");
    await expect(
      page.getByRole("button", { name: "Ocultar códigos e continuar" }),
    ).toBeDisabled();
    await page.getByLabel("Guardei os códigos em um local seguro.").check();
    await page
      .getByRole("button", { name: "Ocultar códigos e continuar" })
      .click();
    expect(
      await db.session.count({
        where: { userId, mfaVerifiedAt: { not: null } },
      }),
    ).toBe(0);
    await page
      .getByRole("button", { name: "Encerrar sessão e fazer novo login" })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, email, password);
    await page
      .getByLabel("Código do autenticador ou código de recuperação")
      .fill(OTPAuth.URI.parse(enrollment.provisioningUri).generate());
    await page
      .getByRole("button", { name: "Confirmar MFA", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Concluir e acessar minha área" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Concluir e acessar minha área" })
      .click();
    await expect(page).toHaveURL(
      role === "PROFESSIONAL" ? /\/dashboard$/ : /\/admin$/,
    );
    await page.goto("/primeiros-passos");
    await expect(page).toHaveURL(
      role === "PROFESSIONAL" ? /\/dashboard$/ : /\/admin$/,
    );
    await page.goto("/primeiros-passos?ajuda=1");
    await expect(page).toHaveURL(/\/ajuda\/seguranca$/);
    await expect(
      page.getByRole("heading", {
        name: "Ajuda: configurar e usar o autenticador",
      }),
    ).toBeVisible();
    expect(
      await db.mfaFactor.count({ where: { userId, status: "ACTIVE" } }),
    ).toBe(1);
    expect(external).toEqual([]);
  });
test("professional cannot defer MFA or access clinical operations with a primary session", async ({page}) => {
  const f = await fixture("PROFESSIONAL");
  await login(page,f.user.email,f.password);
  await page.getByRole("button",{name:"Começar",exact:true}).click();
  await expect(page.getByRole("button",{name:"Configurar depois e continuar"})).toHaveCount(0);
  expect((await page.request.get("/api/clinical/patients",{headers:{"x-organization-id":f.unit.id}})).status()).toBe(403);
  await page.goto("/dashboard");await expect(page).toHaveURL(/\/primeiros-passos$/);
  await page.goto("/admin");await expect(page).toHaveURL(/\/primeiros-passos$/);
  expect(await db.mfaFactor.count({where:{userId:f.user.id}})).toBe(0);
});

test("keyboard exit and reload preserve progress without starting another enrollment", async ({
  page,
}) => {
  const f = await fixture();
  await login(page, f.user.email, f.password);
  await expect(
    page.getByRole("button", { name: "Começar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Começar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Uma camada a mais de proteção" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Retomar configuração" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retomar configuração" }),
  ).toBeVisible();
  expect(await db.mfaFactor.count({ where: { userId: f.user.id } })).toBe(0);
  await page.getByRole("button", { name: "Retomar configuração" }).click();
  await page.getByRole("link", { name: "Ir ao controle", exact: true }).click();
  await expect(page.getByLabel("Senha atual", { exact: true })).toBeFocused();
});
