import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { actor } from "../mission04-b/fixtures";
import { fixture } from "../first-access/fixtures";
import { verifiedSessionToken } from "../helpers/verified-admin-session";
const origin = "http://127.0.0.1:3117";
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const kinds: string[] = []; browserErrors.set(page, kinds);
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    kinds.push(/hydrat/i.test(text) ? "HYDRATION" : /failed to load|net::/i.test(text) ? "RESOURCE" : /source.?map/i.test(text) ? "SOURCE_MAP" : "OTHER");
  });
  page.on("pageerror", () => kinds.push("UNHANDLED_PAGE_ERROR"));
});
async function cookie(page: Page, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "pap_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
}
test.beforeAll(async () => {
  expect(new URL(process.env.DATABASE_URL!).pathname).toBe("/pap_saude_release_governance_test");
  await bootstrapSystemIam();
});
test.afterAll(() => db.$disconnect());
test.afterEach(async ({ page }, info) => {
  await mkdir(".test-audit/p0-admin-f/browser-diagnostics", { recursive: true });
  await writeFile(`.test-audit/p0-admin-f/browser-diagnostics/${info.title.replaceAll(/[^a-zA-Z0-9-]/g, "_")}.json`, JSON.stringify({ kinds: browserErrors.get(page) ?? [] }) + "\n");
  for (const error of info.errors) {
    error.message = (error.message || "Browser assertion failed").split("\n")[0].replace(/https?:\/\/\S+/g, "[URL]");
    error.stack = error.stack?.match(/[\w.-]+\.spec\.ts:\d+:\d+/g)?.join(", ") ?? "";
  }
});
test("global Admin cards use real counts with responsive dark/light keyboard and WCAG checks", async ({ page }) => {
  const admin = await actor(); await actor("COMMERCIAL"); await cookie(page, admin.token);
  let external = 0;
  await page.route("**/*", route => {
    if (!route.request().url().startsWith(origin)) { external++; return route.abort(); }
    return route.continue();
  });
  for (const width of [320, 768, 1440]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
    await page.goto("/admin/metricas");
    const cards = page.getByRole("region", { name: "Governança global PAP" });
    // <section aria-label> has the implicit region role.
    await expect(cards).toBeVisible();
    // The cards are fetched by a client effect. Wait for that hydration signal
    // before the test mutates the server-rendered html theme class.
    await page.evaluate(value => document.documentElement.classList.toggle("dark", value), dark);
    await expect(cards.getByText("Convites globais criados", { exact: true })).toBeVisible();
    await expect(cards.getByText("Convite aceito, perfil autorizado e UBS ativada são etapas independentes.", { exact: false })).toBeVisible();
    const response = await page.request.get("/api/admin/beta/metrics");
    expect(response.status()).toBe(200); const data = (await response.json()).governanceSummary;
    const expected=[data.invitationsCreated.value,data.pendingAssignments.value,data.commercialUsers.value,data.unitsAwaitingActivation.value].map(String);
    const metrics=cards.locator('article > p.text-3xl [data-metric-final]');
    await expect(metrics).toHaveCount(expected.length);
    // Reserve/animated text is aria-hidden. Validate the accessible value once,
    // and independently wait for each real visual counter to reach the API value.
    expect(await metrics.locator('.sr-only').allTextContents()).toEqual(expected);
    for(const [index,value]of expected.entries()){
      if(Number(value)>0)await expect(metrics.nth(index)).toHaveAttribute('data-counter-starts',/[1-9]\d*/);
      await expect(metrics.nth(index).locator('span[aria-hidden="true"]:not(.invisible)')).toHaveText(value);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const disclosure = cards.locator("summary").first(); await disclosure.focus(); await page.keyboard.press("Enter");
    await expect(cards.locator("details").first()).toHaveAttribute("open", "");
    const violations = (await new AxeBuilder({ page }).include('section[aria-label="Governança global PAP"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations;
    expect(violations.map(v => ({ id: v.id, impact: v.impact }))).toEqual([]);
    await mkdir(".test-audit/p0-admin-f/screenshots", { recursive: true });
    await cards.screenshot({ path: `.test-audit/p0-admin-f/screenshots/governance-${width}-${dark ? "dark" : "light"}.png` });
  }
  expect(external).toBe(0);
  expect(browserErrors.get(page)).not.toContain("HYDRATION");
  expect(browserErrors.get(page)).not.toContain("UNHANDLED_PAGE_ERROR");
});
test("organization filter hides global counts rather than mixing tenant and global scopes", async ({ page }) => {
  const admin = await actor(); await cookie(page, admin.token); await page.goto("/admin/metricas");
  await expect(page.getByRole("region", { name: "Governança global PAP" })).toBeVisible();
  await page.getByLabel("Município / UBS").selectOption(admin.unit.id);
  await expect(page.getByRole("region", { name: "Governança global PAP" })).toHaveCount(0);
});
test("direct API URL never exposes global counts to Manager, Commercial or UBS Admin", async ({ page }) => {
  for (const role of ["PAP_MANAGER", "COMMERCIAL"] as const) {
    const f = await actor(role); await cookie(page, f.token);
    const response = await page.request.get("/api/admin/beta/metrics");
    expect(response.status()).toBe(403); expect((await response.text()).includes("governanceSummary")).toBe(false);
  }
  const unitAdmin = await fixture("HEALTH_UNIT_ADMIN"); await cookie(page, await verifiedSessionToken(unitAdmin.user.id));
  const response = await page.request.get("/api/admin/beta/metrics"); expect(response.status()).toBe(200);
  expect((await response.json()).governanceSummary).toBeNull();
});

test("revocation followed by refresh removes previously authorized global cards", async ({ page }) => {
  const admin = await actor(); await cookie(page, admin.token); await page.goto("/admin/metricas");
  const cards = page.getByRole("region", { name: "Governança global PAP" });
  await expect(cards).toBeVisible();
  await db.roleAssignment.deleteMany({ where: { userId: admin.user.id } });
  const refresh = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/beta/metrics");
  await page.getByRole("button", { name: "Atualizar indicadores", exact: true }).click();
  expect((await refresh).status()).toBe(403);
  await expect(cards).toHaveCount(0);
});
