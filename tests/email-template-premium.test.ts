import assert from "node:assert/strict";
import { test } from "node:test";
import { transactionalTemplate } from "../src/server/email/templates";

const link = "https://admin-beta.papsaude.com.br/aceitar-convite#token=FICTICIO-NAO-VALIDO";
const expiry = new Date("2026-11-02T20:50:15Z");

test("convite mantém token apenas em link e nome escapado", () => {
  const result = transactionalTemplate({kind:"INVITATION", url: link, expiresAt: expiry,
    displayName: '<script>"Teste"', roleKey:"COMMERCIAL"});
  assert.ok(result.html.includes("&lt;script&gt;"));
  assert.ok(!result.html.includes('<script>'));
  assert.ok(result.text.includes("Comercial"));
  assert.ok(result.text.includes("02/11/2026"));
  assert.ok(result.html.includes("#token="));
  assert.ok(!result.html.includes("?token="));
  assert.ok(!result.html.includes("Seu acesso ao PAP Saúde foi liberado"));
  assert.ok(!result.html.includes("Sua organização"));
});

test("organização aparece apenas quando informada", () => {
  const result = transactionalTemplate({kind:"INVITATION", url:link, expiresAt:expiry,
    displayName:"Maria", organizationName:"UBS Exemplo",roleKey:"PROFESSIONAL"});
  assert.ok(result.html.includes("UBS Exemplo"));
  assert.ok(result.html.includes("Profissional"));
  assert.ok(!result.html.includes("24 horas"));
});

test("reset exige validade e não modifica MFA", () => {
  assert.throws(() => transactionalTemplate({kind:"PASSWORD_RESET",url:link}),/MAIL_EXPIRY_REQUIRED/);
  const m = transactionalTemplate({kind:"PASSWORD_RESET",url:link, expiresAt:expiry});
  assert.ok(m.text.includes("multifator"));
});

test("rejeita links inseguros e não inventa suporte", () => {
  assert.throws(() => transactionalTemplate({kind:"INVITATION",url:"javascript:alert(1)",expiresAt:expiry}), /UNSAFE_MAIL_LINK/);
  const m = transactionalTemplate({kind:"INVITATION",url:link,expiresAt:expiry});
  assert.ok(!m.html.includes("suporte@papsaude.com.br"));
  assert.ok(!m.html.includes("3182-0000"));
});
