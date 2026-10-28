import { expect, test, type Page } from "@playwright/test";

async function primaryLogin(page: Page) {
  // Only login/CAPTCHA UI contract responses are mocked. Backend attempt limits are tested
  // separately against real PostgreSQL; this is not an authorization proof.
  await page.route("**/api/auth/login", route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false, mfaRequired: true }),
  }));
  await page.route("**/api/auth/login/verification", route => route.fulfill({json:{id:"synthetic-contract-only",question:"Desafio exclusivo do teste de interface"}}));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("synthetic@example.invalid");
  await page.getByLabel("Senha", { exact: true }).fill("Synthetic-UI-Only-Password");
  await page.getByLabel("Resposta da verificação",{exact:true}).fill("synthetic");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar MFA", exact: true })).toBeVisible();
}

test("429 explains the wait and offers a working return to primary login without MFA setup", async ({ page }) => {
  await page.route("**/api/auth/mfa/verify", route => route.fulfill({
    status: 429, headers: { "Retry-After": "900" }, contentType: "application/json",
    body: JSON.stringify({ error: "MFA_TEMPORARILY_UNAVAILABLE" }),
  }));
  await primaryLogin(page);
  await page.getByLabel("Código do autenticador ou código de recuperação", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Confirmar MFA", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Aguarde até 15 minutos");
  await expect(page.locator("form").getByRole("alert")).toContainText("Não é necessário recadastrar seu MFA");
  await expect(page.getByRole("button", { name: "Verificação temporariamente bloqueada" })).toBeDisabled();
  await page.getByRole("button", { name: "Voltar ao login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeDisabled();
  await page.getByLabel("Resposta da verificação",{exact:true}).fill("synthetic");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("synthetic@example.invalid");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  await expect(page.locator("form").getByRole("alert")).toContainText("código de recuperação ainda não utilizado");
  await expect(page.getByLabel("Código do autenticador ou código de recuperação", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/QR Code|Configurar MFA|Gerar nova chave/)).toHaveCount(0);
});

test("ordinary invalid MFA remains retryable and recovery help remains available", async ({ page }) => {
  await page.route("**/api/auth/mfa/verify", route => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ error: "INVALID_MFA_CODE" }),
  }));
  await primaryLogin(page);
  await page.getByLabel("Código do autenticador ou código de recuperação", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Confirmar MFA", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Código inválido");
  await expect(page.getByRole("button", { name: "Confirmar MFA", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/recuperar-senha");
  await page.getByRole("button", { name: "Reiniciar login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeDisabled();
  await page.getByLabel("Resposta da verificação",{exact:true}).fill("synthetic");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
});
