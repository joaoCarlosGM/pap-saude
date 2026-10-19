import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(
  process.env.PAP_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:3100";
const fixture = JSON.parse(
  readFileSync(process.env.BETA_BROWSER_SESSION_FILE, "utf8"),
);
const output = "docs/admin/evidence";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
    extraHTTPHeaders: { "x-test-client-ip": "synthetic-browser-local" },
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin + "/solicitar-adesao");
  for (const [name, value] of Object.entries({
    name: "UBS Demonstração Sintética",
    city: "Cidade Teste",
    state: "SP",
    address: "Rua de Homologação 10",
    cnes: "7654399",
    cnpj: "12345678000350",
    contactName: "Responsável Sintético",
    contactEmail: "responsavel-browser@synthetic.invalid",
    contactPhone: "11999999999",
  }))
    await page.locator(`[name="${name}"]`).fill(value);
  await page.screenshot({
    path: output + "/public-desktop.png",
    fullPage: true,
  });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enviar para análise" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Solicitação recebida" })
    .waitFor();
  await context.addCookies([
    {
      name: "pap_session",
      value: fixture.token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(origin + "/admin/solicitacoes");
  await page.getByRole("button", { name: "Detalhes" }).click();
  await page
    .getByRole("heading", { name: "UBS Demonstração Sintética" })
    .waitFor();
  await page.screenshot({
    path: output + "/request-review-desktop.png",
    fullPage: true,
  });
  await page
    .getByLabel("Município validado")
    .selectOption(fixture.municipalityId);
  await page
    .getByLabel("Motivo da decisão")
    .fill("Validação sintética executada pelo teste de navegador.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Aprovar e ativar" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Análise registrada" })
    .waitFor();
  await page.goto(origin + "/admin");
  await page.getByRole("heading", { name: "UBS elegíveis" }).waitFor();
  await page.getByText("Sem dados na janela", { exact: true }).waitFor();
  await page.screenshot({
    path: output + "/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Alternar menu compacto").click();
  await page.getByRole("navigation", { name: "Administração" }).hover();
  await page
    .getByRole("link", { name: "Solicitações", exact: true })
    .waitFor({ state: "visible" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Navegação administrativa" })
    .waitFor();
  await page.screenshot({
    path: output + "/sidebar-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => {
    const el = document.querySelector("aside");
    return (
      el &&
      getComputedStyle(el).visibility === "hidden" &&
      el.getBoundingClientRect().right <= 0
    );
  });
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "Abrir menu",
    "Escape returns focus to the menu trigger",
  );
  await page.getByRole("button", { name: "Abrir menu", exact: true }).waitFor();
  await page.screenshot({
    path: output + "/dashboard-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  assert.equal(
    overflow,
    false,
    "mobile document must not overflow horizontally",
  );
  await page.goto(origin + "/solicitar-adesao");
  await page.screenshot({
    path: output + "/public-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, [], "no client runtime exceptions");
  console.log(
    "PASS desktop/mobile: public submission → PAP review → approval; dashboard, compact hover, mobile menu, Escape/focus, no horizontal overflow or client exceptions.",
  );
} finally {
  await browser.close();
}
