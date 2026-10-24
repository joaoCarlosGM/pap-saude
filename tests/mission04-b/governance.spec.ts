import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { fixture } from "../first-access/fixtures";
import { runFirstAccessAction } from "../../src/server/auth/first-access.service";
import { actor, origin, publicBody } from "./fixtures";
test.beforeAll(() => bootstrapSystemIam());
test.afterAll(() => db.$disconnect());
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
  await page.context().clearCookies();
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
async function capture(page: Page, name: string) {
  await mkdir("docs/evidence/missao-04-b", { recursive: true });
  await page.screenshot({
    path: `docs/evidence/missao-04-b/${name}.png`,
    fullPage: true,
    mask: [page.locator("input"), page.locator("[data-sensitive]")],
    maskColor: "#475569",
  });
}

async function assertWcag(page: Page, name: string) {
  const violations = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  if (violations.length)
    await writeFile(
      `/tmp/m04-b-axe-${name}.json`,
      JSON.stringify(
        violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      ),
    );
  // The safe reporter preserves only the first error line. Keep actionable
  // WCAG diagnostics there without DOM HTML, attribute values or account data.
  const diagnostics = violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => ({
      target: n.target.map((selector) => String(selector).replace(/\[[^\]]*\]/g, "[attribute]")),
      contrast: n.failureSummary?.match(/contrast of [\d.]+|#[0-9a-fA-F]{6}|ratio of [\d.]+/g),
    })),
  }));
  expect(violations.map((v) => ({ id: v.id, impact: v.impact })),
    `WCAG ${name}: ${JSON.stringify(diagnostics)}`).toEqual([]);
}

test("Manager desktop/mobile/dark authorized controls, keyboard and WCAG AA", async ({
  page,
}) => {
  const f = await actor("PAP_MANAGER");
  await cookie(page, f.token);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/solicitacoes$/);
  await expect(
    page.getByRole("heading", { name: "Solicitações de adesão" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Segurança", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Perfis e acessos" }),
  ).toHaveCount(1);
  for (const [name, width, dark] of [
    ["manager-desktop", 1440, false],
    ["manager-mobile", 320, false],
    ["manager-dark", 768, true],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      dark,
    );
    await assertWcag(page, name);
    for (const [label, control] of [
      ["help", page.getByRole("button", { name: "Ajuda", exact: true })],
      ["profile", page.getByRole("link", { name: "Minha segurança e perfil" })],
    ] as const) {
      await control.hover();
      await control.focus();
      await assertWcag(page, `${name}-${label}-hover-focus`);
    }
    await capture(page, name);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/organizacoes");
  await expect(
    page.getByRole("heading", { name: "Estrutura disponível" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ativar|Suspender|Excluir/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Nova organização" }),
  ).toHaveCount(0);
  await page.goto("/admin/acessos");
  await expect(
    page.getByRole("heading", { name: "Commercial", exact: true }),
  ).toBeVisible();
  await expect(page.locator("select option[value='PAP_ADMIN']")).toHaveCount(0);
  await expect(page.locator("select option[value='PAP_MANAGER']")).toHaveCount(
    0,
  );
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement !== document.body),
  ).toBe(true);
});

test("Admin explicitly activates a reviewed pending UBS; Manager never sees activation", async ({
  page,
}) => {
  const admin = await actor(),
    manager = await actor("PAP_MANAGER"),
    body = publicBody();
  await db.organization.update({
    where: { id: admin.unit.parentId! },
    data: { city: body.city, state: body.state },
  });
  await page.goto("/login");
  expect(
    (
      await page.request.post("/api/organization-requests", {
        data: body,
        headers: { origin },
      })
    ).status(),
  ).toBe(202);
  const candidate = await db.organizationCandidate.findFirstOrThrow({
    where: { name: body.name },
  });
  await cookie(page, manager.token);
  await page.goto("/admin/solicitacoes");
  await page.getByLabel("Buscar UBS").fill(body.name);
  await page
    .getByRole("row")
    .filter({ hasText: body.name })
    .getByRole("button", { name: "Detalhes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: body.name, exact: true }),
  ).toBeVisible();
  const available = await page.request.get("/api/admin/organizations");
  expect(available.status()).toBe(200);
  expect(
    (await available.json()).organizations.some(
      (o: { id: string }) => o.id === admin.unit.parentId,
    ),
  ).toBe(true);
  await page
    .getByLabel("Município validado")
    .selectOption(admin.unit.parentId!, { timeout: 15000 });
  await page
    .getByLabel("Motivo da decisão")
    .fill("Análise sintética aprovada para encaminhamento");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Solicitar correções", exact: true })
    .click();
  await expect(page.getByRole("status").last()).toContainText(
    "Correções solicitadas",
  );
  await page.getByLabel("Estado").selectOption("CHANGES_REQUESTED");
  await page
    .getByRole("row")
    .filter({ hasText: body.name })
    .getByRole("button", { name: "Detalhes", exact: true })
    .click();
  await page
    .getByLabel("Município validado")
    .selectOption(admin.unit.parentId!);
  await page
    .getByLabel("Motivo da decisão")
    .fill("Correções institucionais conferidas para encaminhamento");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Encaminhar para ativação" }).click();
  await expect(page.getByRole("status").last()).toContainText(
    "aguarda ativação explícita",
  );
  let reviewed = await db.organizationCandidate.findUniqueOrThrow({
    where: { id: candidate.id },
  });
  expect(reviewed.status).toBe("READY_FOR_ACTIVATION");
  await page.getByLabel("Estado").selectOption("READY_FOR_ACTIVATION");
  await page
    .getByRole("row")
    .filter({ hasText: body.name })
    .getByRole("button", { name: "Detalhes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ativar UBS", exact: true }),
  ).toHaveCount(0);
  const deletion = await page.request.delete(
    `/api/admin/organizations/${reviewed.convertedOrganizationId}`,
    { headers: { origin } },
  );
  expect(deletion.status()).toBe(405);
  expect(
    (
      await db.organization.findUniqueOrThrow({
        where: { id: reviewed.convertedOrganizationId! },
      })
    ).status,
  ).toBe("PENDING_VERIFICATION");
  await cookie(page, admin.token);
  await page.goto("/admin/solicitacoes");
  await page.getByLabel("Estado").selectOption("READY_FOR_ACTIVATION");
  await page.getByLabel("Buscar UBS").fill(body.name);
  await page
    .getByRole("row")
    .filter({ hasText: body.name })
    .getByRole("button", { name: "Detalhes", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Ativar UBS", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText("UBS ativada");
  reviewed = await db.organizationCandidate.findUniqueOrThrow({
    where: { id: candidate.id },
  });
  expect(reviewed.status).toBe("APPROVED");
  expect(
    (
      await db.organization.findUniqueOrThrow({
        where: { id: reviewed.convertedOrganizationId! },
      })
    ).status,
  ).toBe("ACTIVE");
});

test("direct clinical HTML/RSC denied to anonymous/Admin/Manager/Commercial/unassigned without redirect loops", async ({
  page,
}) => {
  const people = [
    undefined,
    await actor(),
    await actor("PAP_MANAGER"),
    await actor("COMMERCIAL"),
    await actor(),
  ];
  await db.roleAssignment.deleteMany({ where: { userId: people[4]!.user.id } });
  const marker = `clinical-secret-${randomUUID()}`;
  const patient = await db.patient.create({
    data: {
      fullName: marker,
      birthDate: new Date("1990-01-01"),
      organizations: { create: { organizationId: people[1]!.unit.id } },
    },
  });
  for (const person of people) {
    await page.context().clearCookies();
    if (person) await cookie(page, person.token);
    let docs = 0;
    const listener = () => docs++;
    page.on("framenavigated", listener);
    for (const path of [
      "/dashboard",
      "/pacientes",
      `/pacientes/${patient.id}`,
      "/registro",
      "/atendimentos",
    ]) {
      const html = await page.request.get(path, { maxRedirects: 0 });
      expect([307, 308]).toContain(html.status());
      expect((await html.text()).includes(marker)).toBe(false);
      const rsc = await page.request.get(path, {
        headers: { RSC: "1", "Next-Router-Prefetch": "1" },
        maxRedirects: 0,
      });
      expect([307, 308]).toContain(rsc.status());
      expect((await rsc.text()).includes(marker)).toBe(false);
    }
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).pathname === "/dashboard").toBe(false);
    expect((await page.content()).includes(marker)).toBe(false);
    expect(docs <= 4).toBe(true);
    page.off("framenavigated", listener);
  }
});

test("Manager institutional directory excludes private values from API, HTML and RSC", async ({ page }) => {
  const manager = await actor("PAP_MANAGER"), foreign = await actor();
  const marker = `private-org-${randomUUID()}`;
  const publicName = `Unidade institucional ${randomUUID()}`;
  await db.organization.update({
    where: { id: foreign.unit.id },
    data: { name: publicName, settings: { private: marker }, address: marker, code: marker, cnes: marker, cnpj: marker },
  });
  await cookie(page, manager.token);
  const api = await page.request.get("/api/admin/organizations");
  expect(api.status()).toBe(200);
  const body = await api.json();
  expect(JSON.stringify(body).includes(marker)).toBe(false);
  const row = body.organizations.find((o: { id: string }) => o.id === foreign.unit.id);
  expect(Object.keys(row).sort()).toEqual([
    "_count", "city", "id", "isActive", "name", "parent", "parentId", "state", "status", "type",
  ].sort());
  expect(Object.keys(row._count)).toEqual(["children"]);
  const variants: Record<string, string>[] = [{}, { RSC: "1", "Next-Router-Prefetch": "1" }];
  for (const headers of variants) {
    const response = await page.request.get("/admin/organizacoes", { headers });
    expect(response.status()).toBe(200);
    expect((await response.text()).includes(marker)).toBe(false);
  }
  await page.goto("/admin/organizacoes");
  await page.getByRole("textbox", { name: "Buscar organização" }).fill(publicName);
  await expect(page.getByText(publicName, { exact: true })).toBeVisible();
  expect((await page.content()).includes(marker)).toBe(false);
});

test("Professional without mandatory MFA can access own clinical pages, foreign record denied by API", async ({
  page,
}) => {
  const f = await fixture("PROFESSIONAL");
  await runFirstAccessAction(
    f.user.id,
    f.session.session.id,
    "DEFER_OPTIONAL_MFA",
  );
  await cookie(page, f.session.token);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  const foreign = await actor();
  const result = await page.request.get("/api/clinical/patients", {
    headers: { "x-organization-id": foreign.unit.id },
  });
  expect(result.status()).toBe(403);
  await page.goto("/pacientes");
  await expect(
    page.getByRole("heading", { name: "Pacientes", exact: true }),
  ).toBeVisible();
});
