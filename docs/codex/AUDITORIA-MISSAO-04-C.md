# Auditoria final — Missão 04 / Slice C

Base e HEAD: `481d6a3dccafbd626355648ee52a19f8512434f3`. Branch `feature/ux-iam-convites-vitrine-email`. Índice vazio. Sem commit/push; PR #5 permanece draft. Data: 2026-10-23T09:43:07.880292-03:00 (America/Fortaleza).

Esta auditoria complementa o relatório C; resultados e limites estão no relatório e nas evidências integrais, não apenas conclusões PASS.

## Complemento C-AUDIT-01

O achado era válido: aprovação Global podia substituir o papel aceito e sobrescrever a proposta. Corrigido com igualdade estrita do papel dentro da transação e retirada da reescrita; UI apresenta papel aceito sem seletor. Novo fluxo legítimo exige novo convite/aceite. SQL, schema, bootstrap, catálogo, MFA e isolamento não mudaram nesta correção.

Quatro arquivos de código/testes mudaram em relação à auditoria anterior: `src/server/access-invitations/access-invitation.service.ts`, `src/components/admin/AccessInvitationsClient.tsx`, `tests/mission04-c/invitations.test.ts`, `tests/mission04-c/journey.spec.ts`. Diffs integrais atuais abaixo; hashes pré/pós em validation.json. O inventário total continua 67 caminhos, incluindo relatórios e evidências. Sem staging, commit ou push.

PASS/FAIL atuais, comandos e contagens estão na seção C-AUDIT-01 do relatório e no JSON/log integral. A suíte C original de 37 Node/7 browser não era prova deste achado: foi repetida e ampliada. CI remoto e laboratório real continuam NOT RUN; nenhum recurso manual foi acessado ou alterado.

## git status --short

```text
 M .github/workflows/ci.yml
 M package.json
 M prisma/schema.prisma
 M src/app/(auth)/primeiros-passos/page.tsx
 M src/components/admin/AccessAdminClient.tsx
 M src/components/admin/AdminSidebar.tsx
 M src/components/admin/AdminTopbar.tsx
 M src/components/auth/LoginSecurity.tsx
 M src/components/layout/Topbar.tsx
 M src/lib/auth/access-destination.ts
 M src/server/admin/admin-role.errors.ts
 M src/server/admin/admin-roles.service.ts
 M src/server/admin/institutional-invitation-policy.ts
 M src/server/audit/admin-audit-policy.ts
 M src/server/auth/login-navigation.service.ts
 M src/server/email/email.service.ts
 M src/server/email/local-demo-mail.ts
 M tests/admin/admin-mfa.integration.test.ts
 M tests/mission04-b/legacy-upgrade.test.ts
?? docs/codex/AUDITORIA-MISSAO-04-C.md
?? docs/codex/RELATORIO-MISSAO-04-SLICE-C.md
?? docs/evidence/missao-04-c/
?? prisma/migrations/20261022050000_mission04_global_access/
?? scripts/test-mission04-c.sh
?? src/app/(admin)/admin/convites-globais/
?? src/app/(auth)/aceitar-convite/
?? src/app/(auth)/aguardando-autorizacao/
?? src/app/(auth)/comercial/
?? src/app/(auth)/notificacoes/
?? src/app/api/access-invitations/
?? src/app/api/account/
?? src/app/api/admin/access-invitations/
?? src/components/access/
?? src/components/admin/AccessInvitationsClient.tsx
?? src/server/access-invitations/
?? src/server/notifications/
?? tests/mission04-c/
```

## git status --short --untracked-files=all

```text
 M .github/workflows/ci.yml
 M package.json
 M prisma/schema.prisma
 M src/app/(auth)/primeiros-passos/page.tsx
 M src/components/admin/AccessAdminClient.tsx
 M src/components/admin/AdminSidebar.tsx
 M src/components/admin/AdminTopbar.tsx
 M src/components/auth/LoginSecurity.tsx
 M src/components/layout/Topbar.tsx
 M src/lib/auth/access-destination.ts
 M src/server/admin/admin-role.errors.ts
 M src/server/admin/admin-roles.service.ts
 M src/server/admin/institutional-invitation-policy.ts
 M src/server/audit/admin-audit-policy.ts
 M src/server/auth/login-navigation.service.ts
 M src/server/email/email.service.ts
 M src/server/email/local-demo-mail.ts
 M tests/admin/admin-mfa.integration.test.ts
 M tests/mission04-b/legacy-upgrade.test.ts
?? docs/codex/AUDITORIA-MISSAO-04-C.md
?? docs/codex/RELATORIO-MISSAO-04-SLICE-C.md
?? docs/evidence/missao-04-c/aceite-desktop.png
?? docs/evidence/missao-04-c/autorizado-mobile-dark.png
?? docs/evidence/missao-04-c/baseline-ci.json
?? docs/evidence/missao-04-c/cleanup.json
?? docs/evidence/missao-04-c/dependency-audits.json
?? docs/evidence/missao-04-c/espera-1440-dark.png
?? docs/evidence/missao-04-c/espera-1440-light.png
?? docs/evidence/missao-04-c/espera-320-dark.png
?? docs/evidence/missao-04-c/espera-320-light.png
?? docs/evidence/missao-04-c/espera-768-dark.png
?? docs/evidence/missao-04-c/espera-768-light.png
?? docs/evidence/missao-04-c/execution.log
?? docs/evidence/missao-04-c/fila-1440-light.png
?? docs/evidence/missao-04-c/fila-320-dark.png
?? docs/evidence/missao-04-c/fila-768-light.png
?? docs/evidence/missao-04-c/legacy-upgrade.json
?? docs/evidence/missao-04-c/performance.json
?? docs/evidence/missao-04-c/pr5.json
?? docs/evidence/missao-04-c/revogado-mobile-dark.png
?? docs/evidence/missao-04-c/validation.json
?? prisma/migrations/20261022050000_mission04_global_access/migration.sql
?? scripts/test-mission04-c.sh
?? src/app/(admin)/admin/convites-globais/page.tsx
?? src/app/(auth)/aceitar-convite/page.tsx
?? src/app/(auth)/aguardando-autorizacao/page.tsx
?? src/app/(auth)/comercial/page.tsx
?? src/app/(auth)/notificacoes/page.tsx
?? src/app/api/access-invitations/accept/route.ts
?? src/app/api/account/access-status/route.ts
?? src/app/api/account/notifications/route.ts
?? src/app/api/admin/access-invitations/route.ts
?? src/components/access/GlobalInvitationActivation.tsx
?? src/components/access/NotificationInbox.tsx
?? src/components/access/WaitingAuthorization.tsx
?? src/components/access/access.css
?? src/components/admin/AccessInvitationsClient.tsx
?? src/server/access-invitations/access-invitation-http.ts
?? src/server/access-invitations/access-invitation-policy.ts
?? src/server/access-invitations/access-invitation.errors.ts
?? src/server/access-invitations/access-invitation.service.ts
?? src/server/notifications/notification.service.ts
?? tests/mission04-c/fixtures.ts
?? tests/mission04-c/invitations.test.ts
?? tests/mission04-c/journey.spec.ts
?? tests/mission04-c/legacy-upgrade.test.ts
?? tests/mission04-c/playwright.config.ts
```

## git diff --stat

```text
 .github/workflows/ci.yml                           |   5 +-
 package.json                                       |   4 +-
 prisma/schema.prisma                               |  67 ++++++++
 src/app/(auth)/primeiros-passos/page.tsx           |   9 +-
 src/components/admin/AccessAdminClient.tsx         |   4 +-
 src/components/admin/AdminSidebar.tsx              |   7 +
 src/components/admin/AdminTopbar.tsx               |   1 +
 src/components/auth/LoginSecurity.tsx              |   3 +-
 src/components/layout/Topbar.tsx                   | 184 ++++++++++-----------
 src/lib/auth/access-destination.ts                 |   2 +
 src/server/admin/admin-role.errors.ts              |   4 +
 src/server/admin/admin-roles.service.ts            |  37 ++++-
 .../admin/institutional-invitation-policy.ts       |   4 +
 src/server/audit/admin-audit-policy.ts             |   6 +-
 src/server/auth/login-navigation.service.ts        |  10 +-
 src/server/email/email.service.ts                  |  48 ++----
 src/server/email/local-demo-mail.ts                |  45 +++--
 tests/admin/admin-mfa.integration.test.ts          |  10 +-
 tests/mission04-b/legacy-upgrade.test.ts           |  17 +-
 19 files changed, 301 insertions(+), 166 deletions(-)
```

## git diff --check

```text
```
Exit 0, saída vazia.

`git diff --stat` inclui somente rastreados; todos os novos arquivos aparecem individualmente no inventário abaixo. Não houve exclusão de arquivo rastreado.

## Inventário exato / staging seletivo futuro

67 caminhos. **Não executar staging antes da aprovação humana.** Comando apenas documental:

```bash
git add -- \
  .github/workflows/ci.yml \
  docs/codex/AUDITORIA-MISSAO-04-C.md \
  docs/codex/RELATORIO-MISSAO-04-SLICE-C.md \
  docs/evidence/missao-04-c/aceite-desktop.png \
  docs/evidence/missao-04-c/autorizado-mobile-dark.png \
  docs/evidence/missao-04-c/baseline-ci.json \
  docs/evidence/missao-04-c/cleanup.json \
  docs/evidence/missao-04-c/dependency-audits.json \
  docs/evidence/missao-04-c/espera-1440-dark.png \
  docs/evidence/missao-04-c/espera-1440-light.png \
  docs/evidence/missao-04-c/espera-320-dark.png \
  docs/evidence/missao-04-c/espera-320-light.png \
  docs/evidence/missao-04-c/espera-768-dark.png \
  docs/evidence/missao-04-c/espera-768-light.png \
  docs/evidence/missao-04-c/execution.log \
  docs/evidence/missao-04-c/fila-1440-light.png \
  docs/evidence/missao-04-c/fila-320-dark.png \
  docs/evidence/missao-04-c/fila-768-light.png \
  docs/evidence/missao-04-c/legacy-upgrade.json \
  docs/evidence/missao-04-c/performance.json \
  docs/evidence/missao-04-c/pr5.json \
  docs/evidence/missao-04-c/revogado-mobile-dark.png \
  docs/evidence/missao-04-c/validation.json \
  package.json \
  prisma/migrations/20261022050000_mission04_global_access/migration.sql \
  prisma/schema.prisma \
  scripts/test-mission04-c.sh \
  'src/app/(admin)/admin/convites-globais/page.tsx' \
  'src/app/(auth)/aceitar-convite/page.tsx' \
  'src/app/(auth)/aguardando-autorizacao/page.tsx' \
  'src/app/(auth)/comercial/page.tsx' \
  'src/app/(auth)/notificacoes/page.tsx' \
  'src/app/(auth)/primeiros-passos/page.tsx' \
  src/app/api/access-invitations/accept/route.ts \
  src/app/api/account/access-status/route.ts \
  src/app/api/account/notifications/route.ts \
  src/app/api/admin/access-invitations/route.ts \
  src/components/access/GlobalInvitationActivation.tsx \
  src/components/access/NotificationInbox.tsx \
  src/components/access/WaitingAuthorization.tsx \
  src/components/access/access.css \
  src/components/admin/AccessAdminClient.tsx \
  src/components/admin/AccessInvitationsClient.tsx \
  src/components/admin/AdminSidebar.tsx \
  src/components/admin/AdminTopbar.tsx \
  src/components/auth/LoginSecurity.tsx \
  src/components/layout/Topbar.tsx \
  src/lib/auth/access-destination.ts \
  src/server/access-invitations/access-invitation-http.ts \
  src/server/access-invitations/access-invitation-policy.ts \
  src/server/access-invitations/access-invitation.errors.ts \
  src/server/access-invitations/access-invitation.service.ts \
  src/server/admin/admin-role.errors.ts \
  src/server/admin/admin-roles.service.ts \
  src/server/admin/institutional-invitation-policy.ts \
  src/server/audit/admin-audit-policy.ts \
  src/server/auth/login-navigation.service.ts \
  src/server/email/email.service.ts \
  src/server/email/local-demo-mail.ts \
  src/server/notifications/notification.service.ts \
  tests/admin/admin-mfa.integration.test.ts \
  tests/mission04-b/legacy-upgrade.test.ts \
  tests/mission04-c/fixtures.ts \
  tests/mission04-c/invitations.test.ts \
  tests/mission04-c/journey.spec.ts \
  tests/mission04-c/legacy-upgrade.test.ts \
  tests/mission04-c/playwright.config.ts
```

## Preservação e fronteiras

Nenhum recurso do laboratório manual foi acessado ou alterado. Conta PAP_ADMIN real, senha/MFA, banco, volumes, branch privada, VPS e e-mails externos não foram acessados. Prova executada de preservação é sintética: restore real + upgrade/idempotência + snapshots exatos + login TOTP e sessão anteriores; homologação privada NOT RUN. Detalhes booleanos em legacy-upgrade.json, sem dump/credenciais.

O catálogo IAM, permissions, bootstrap, guard de MFA, policy de primeiro acesso e package-lock são byte a byte iguais à base; SHA-256 em validation.json. Não há diff de política MFA/catálogo/bootstrap porque não foram modificados. Fronteira clínica B não foi relaxada; 50 requisições HTML/RSC diretas no C (cinco identidades, cinco rotas, dois formatos) negadas, além das APIs e regressões B/F03. Manager lê somente sua fila e metadados autorizados; não usa organization.read para obter dados privados.

MFA e autorização são refeitas dentro da transação SERIALIZABLE, como demonstram os diffs e testes reais de lock/revogação. A revisão deve observar política de alvo, estado, escopo e grant real, não somente visibilidade de botões. Nova rota chama guard diretamente por handler, e o inventário AST permanece ativo.

## Diff pontual do serviço contra o C auditado

```diff
--- C-auditado/src/server/access-invitations/access-invitation.service.ts
+++ C-AUDIT-01/src/server/access-invitations/access-invitation.service.ts
@@ -494,0 +495,4 @@
+    // Approval confirms the exact role the recipient accepted. Changing the
+    // proposal requires a new invitation and explicit consent, even for Admin.
+    if (roleKey !== row.proposedRoleKey)
+      throw new AccessInvitationError("INVITATION_ROLE_MISMATCH", 409);
@@ -541 +544,0 @@
-        proposedRoleKey: roleKey,
```

### src/components/admin/AccessInvitationsClient.tsx — correção pontual

```diff
--- C-auditado/src/components/admin/AccessInvitationsClient.tsx
+++ C-AUDIT-01/src/components/admin/AccessInvitationsClient.tsx
@@ -51,2 +51,2 @@
-  const [role, setRole] = useState(row.proposedRoleKey),
-    [reason, setReason] = useState("");
+  const role = row.proposedRoleKey;
+  const [reason, setReason] = useState("");
@@ -126,19 +126,5 @@
-          <label>
-            Perfil a autorizar
-            <select
-              value={role}
-              onChange={(e) => {
-                setRole(e.target.value);
-                setOrg("");
-                setOrganizations(null);
-              }}
-            >
-              {Object.entries(roles)
-                .filter(([key]) => full || key === "COMMERCIAL")
-                .map(([key, label]) => (
-                  <option value={key} key={key}>
-                    {label}
-                  </option>
-                ))}
-            </select>
-          </label>
+          <p>
+            Perfil aceito: <strong>{roles[role]}</strong>. Esta decisão confirma
+            o perfil aceito. Para mudar o papel, encerre este convite e envie
+            outro para novo consentimento explícito.
+          </p>
```

### tests/mission04-c/invitations.test.ts — correção pontual

```diff
--- C-auditado/tests/mission04-c/invitations.test.ts
+++ C-AUDIT-01/tests/mission04-c/invitations.test.ts
@@ -1415,0 +1416,160 @@
+
+// C-AUDIT-01: the accepted proposal is a consent contract, including for Global.
+async function consentSnapshot(id: string) {
+  const row = await db.accessInvitation.findUniqueOrThrow({ where: { id } });
+  return {
+    row,
+    grants: await db.roleAssignment.findMany({
+      where: { userId: row.userId! },
+      orderBy: { id: "asc" },
+    }),
+    notifications: await db.userNotification.findMany({
+      where: { invitationId: id },
+      orderBy: { id: "asc" },
+    }),
+    auditCount: await db.auditEvent.count(),
+    captured: (await localMessages(row.email)).length,
+  };
+}
+
+test("C-AUDIT-01: Admin cannot replace accepted Commercial or Professional roles; repeated/concurrent denials have no side effects", async () => {
+  const admin = await actor();
+  for (const [acceptedRole, deniedRole] of [
+    ["COMMERCIAL", "PAP_MANAGER"],
+    ["PROFESSIONAL", "HEALTH_UNIT_ADMIN"],
+    ["PROFESSIONAL", "COMMERCIAL"],
+  ]) {
+    const i = await invite(admin, acceptedRole);
+    assert.equal((await accept(i)).status, 200);
+    const before = await consentSnapshot(i.id);
+    for (let repetition = 0; repetition < 2; repetition++) {
+      const results = await Promise.all([
+        decide(admin.token, i.id, deniedRole, {
+          organizationId:
+            deniedRole === "HEALTH_UNIT_ADMIN" ? admin.unit.id : null,
+        }),
+        decide(admin.token, i.id, deniedRole, {
+          organizationId:
+            deniedRole === "HEALTH_UNIT_ADMIN" ? admin.unit.id : null,
+        }),
+      ]);
+      for (const result of results) {
+        assert.equal(result.status, 409);
+        assert.equal((await result.json()).error, "INVITATION_ROLE_MISMATCH");
+      }
+      assert.deepEqual(await consentSnapshot(i.id), before);
+    }
+  }
+});
+
+test("C-AUDIT-01: Global approves only the accepted Professional role with legitimate scope and membership; replay never rewrites consent", async () => {
+  const admin = await actor();
+  const i = await invite(admin, "PROFESSIONAL");
+  assert.equal((await accept(i)).status, 200);
+  const pending = await consentSnapshot(i.id);
+  assert.equal(
+    (
+      await decide(admin.token, i.id, "PROFESSIONAL", {
+        organizationId: admin.unit.id,
+      })
+    ).status,
+    400,
+  );
+  assert.deepEqual(await consentSnapshot(i.id), pending);
+  await db.membership.create({
+    data: {
+      userId: pending.row.userId!,
+      organizationId: admin.unit.id,
+      status: "ACTIVE",
+    },
+  });
+  assert.equal(
+    (
+      await decide(admin.token, i.id, "PROFESSIONAL", {
+        organizationId: admin.unit.id,
+      })
+    ).status,
+    200,
+  );
+  const approved = await consentSnapshot(i.id);
+  assert.equal(approved.row.proposedRoleKey, "PROFESSIONAL");
+  assert.equal(approved.grants.length, 1);
+  assert.equal(approved.notifications.length, 1);
+  assert.equal((await decide(admin.token, i.id, "PAP_MANAGER")).status, 409);
+  assert.deepEqual(await consentSnapshot(i.id), approved);
+  assert.equal(
+    (
+      await decide(admin.token, i.id, "PROFESSIONAL", {
+        organizationId: admin.unit.id,
+      })
+    ).status,
+    200,
+  );
+  assert.deepEqual(await consentSnapshot(i.id), approved);
+});
+
+test("C-AUDIT-01: racing legitimate and substituted approvals preserve one Commercial grant and delegated ownership", async () => {
+  const manager = await actor("PAP_MANAGER");
+  const admin = await actor();
+  const i = await invite(manager);
+  assert.equal((await accept(i)).status, 200);
+  const accepted = (await consentSnapshot(i.id)).row;
+  assert.equal((await decide(otherManager.token, i.id)).status, 404);
+  assert.equal((await decide(manager.token, i.id, "PAP_MANAGER")).status, 403);
+  const results = await Promise.all([
+    decide(admin.token, i.id, "PAP_MANAGER"),
+    decide(manager.token, i.id),
+    decide(admin.token, i.id),
+    decide(admin.token, i.id, "PAP_MANAGER"),
+  ]);
+  assert.deepEqual(
+    results.map((r) => r.status),
+    [409, 200, 200, 409],
+  );
+  const final = await consentSnapshot(i.id);
+  assert.equal(final.row.proposedRoleKey, "COMMERCIAL");
+  assert.deepEqual(final.row.acceptedAt, accepted.acceptedAt);
+  assert.equal(final.grants.length, 1);
+  assert.equal(final.notifications.length, 1);
+  assert.equal(final.captured, 2);
+  const grantedRole = await db.role.findUniqueOrThrow({
+    where: { id: final.grants[0].roleId },
+  });
+  assert.equal(grantedRole.key, "COMMERCIAL");
+  assert.equal(
+    await db.auditEvent.count({
+      where: { resourceId: i.id, action: "ACCESS_INVITATION_APPROVED" },
+    }),
+    1,
+  );
+});
+
+test("C-AUDIT-01: a different role needs a new invitation and explicit acceptance, preserving the closed original proposal", async () => {
+  const admin = await actor();
+  const original = await invite(admin);
+  assert.equal((await accept(original)).status, 200);
+  assert.equal((await close(admin.token, original.id, "REJECT")).status, 200);
+  const closed = await db.accessInvitation.findUniqueOrThrow({
+    where: { id: original.id },
+  });
+  const replacement = await invite(admin, "PAP_MANAGER", original.email);
+  replacement.password = original.password;
+  assert.equal(
+    (await decide(admin.token, replacement.id, "PAP_MANAGER")).status,
+    409,
+  );
+  assert.equal(
+    await db.roleAssignment.count({ where: { userId: closed.userId! } }),
+    0,
+  );
+  assert.equal((await accept(replacement)).status, 200);
+  assert.equal(
+    (await decide(admin.token, replacement.id, "PAP_MANAGER")).status,
+    200,
+  );
+  assert.deepEqual(
+    await db.accessInvitation.findUniqueOrThrow({ where: { id: original.id } }),
+    closed,
+  );
+  assert.equal(closed.proposedRoleKey, "COMMERCIAL");
+});
```

### tests/mission04-c/journey.spec.ts — correção pontual

```diff
--- C-auditado/tests/mission04-c/journey.spec.ts
+++ C-AUDIT-01/tests/mission04-c/journey.spec.ts
@@ -563,0 +564,39 @@
+
+test("C-AUDIT-01: Global approval displays the accepted role without a selector and sends only that role", async ({
+  page,
+  context,
+}) => {
+  const admin = await actor();
+  const i = await invite(admin, "COMMERCIAL");
+  expect((await accept(i)).status).toBe(200);
+  await cookie(context, admin.token);
+  await page.goto("/admin/convites-globais");
+  await page.getByLabel("Filtrar situação").selectOption("PENDING_ASSIGNMENT");
+  const card = page
+    .locator(".access-queue-list > li")
+    .filter({ hasText: i.email });
+  await expect(card.getByText(/Perfil aceito: Comercial/)).toBeVisible();
+  await expect(card.getByRole("combobox")).toHaveCount(0);
+  await expect(card.getByText(/novo consentimento explícito/)).toBeVisible();
+  await card
+    .getByLabel("Motivo da decisão")
+    .fill("Confirmar apenas o perfil aceito");
+  const outgoing = page.waitForRequest(
+    (r) =>
+      r.url().endsWith("/api/admin/access-invitations") &&
+      r.method() === "POST",
+  );
+  await card
+    .getByRole("button", { name: "Autorizar perfil", exact: true })
+    .click();
+  expect((await outgoing).postDataJSON().roleKey).toBe("COMMERCIAL");
+  await page.getByLabel("Filtrar situação").selectOption("ACTIVE");
+  await expect(
+    card.getByText("Perfil autorizado", { exact: true }),
+  ).toBeVisible();
+  const row = await db.accessInvitation.findUniqueOrThrow({
+    where: { id: i.id },
+  });
+  expect(row.proposedRoleKey).toBe("COMMERCIAL");
+  await a11y(page, "c-audit-01-consent");
+});
```

## Diffs completos de migração e autorização

Diffs de rastreados usam `git diff --unified=0`: todas as alterações, sem linhas de contexto vazias que produziriam trailing whitespace no Markdown. Novos arquivos aparecem integralmente.


### src/components/admin/AccessInvitationsClient.tsx

```diff
diff --git a/src/components/admin/AccessInvitationsClient.tsx b/src/components/admin/AccessInvitationsClient.tsx
new file mode 100644
index 0000000..c9f0203
--- /dev/null
+++ b/src/components/admin/AccessInvitationsClient.tsx
@@ -0,0 +1,408 @@
+"use client";
+import { useRef, useState } from "react";
+import { useBetaData, DataState } from "./BetaWidgets";
+import "@/components/access/access.css";
+const labels: Record<string, string> = {
+  PENDING_ACCEPTANCE: "Aguardando aceite",
+  PENDING_ASSIGNMENT: "Aguardando atribuição",
+  ACTIVE: "Perfil autorizado",
+  REJECTED: "Não autorizado",
+  EXPIRED: "Convite expirado",
+  REVOKED: "Revogado",
+};
+const roles: Record<string, string> = {
+  PAP_MANAGER: "Gerente PAP",
+  COMMERCIAL: "Comercial",
+  PROFESSIONAL: "Profissional",
+  HEALTH_UNIT_ADMIN: "Responsável de UBS",
+  MUNICIPAL_ADMIN: "Administrador municipal",
+};
+type Row = {
+  id: string;
+  email: string;
+  displayName: string;
+  proposedRoleKey: string;
+  status: string;
+  expiresAt: string;
+  acceptedAt: string | null;
+  decisionReason: string | null;
+  deliveryStatus: string;
+  releaseEmailStatus: string | null;
+};
+type Organization = {
+  id: string;
+  name: string;
+  type: string;
+  status: string;
+  isActive: boolean;
+};
+type Queue = { rows: Row[]; total: number; pageSize: number; full: boolean };
+function Review({
+  row,
+  full,
+  busy,
+  action,
+}: {
+  row: Row;
+  full: boolean;
+  busy: boolean;
+  action: (body: Record<string, unknown>) => Promise<void>;
+}) {
+  const role = row.proposedRoleKey;
+  const [reason, setReason] = useState("");
+  const [organizations, setOrganizations] = useState<Organization[] | null>(
+      null,
+    ),
+    [org, setOrg] = useState(""),
+    [orgError, setOrgError] = useState("");
+  const scoped = [
+    "PROFESSIONAL",
+    "HEALTH_UNIT_ADMIN",
+    "MUNICIPAL_ADMIN",
+  ].includes(role);
+  async function loadOrganizations() {
+    try {
+      const r = await fetch("/api/admin/organizations", { cache: "no-store" });
+      if (!r.ok) throw new Error();
+      const data = await r.json();
+      setOrganizations(
+        data.organizations.filter(
+          (o: Organization) =>
+            o.type ===
+              (role === "MUNICIPAL_ADMIN" ? "MUNICIPALITY" : "HEALTH_UNIT") &&
+            o.status === "ACTIVE" &&
+            o.isActive,
+        ),
+      );
+      setOrgError("");
+    } catch {
+      setOrgError("Não foi possível consultar as UBS autorizadas.");
+    }
+  }
+  const canReview = full || row.proposedRoleKey === "COMMERCIAL";
+  return (
+    <li>
+      <h2>{row.displayName}</h2>
+      <p data-sensitive>{row.email}</p>
+      <p>
+        <strong>{labels[row.status]}</strong> · Proposta:{" "}
+        {roles[row.proposedRoleKey]}
+      </p>
+      <p className="access-muted">
+        Convite:{" "}
+        {row.deliveryStatus === "CAPTURED"
+          ? "capturado na caixa local; não enviado externamente"
+          : row.deliveryStatus === "FAILED"
+            ? "captura falhou; link invalidado"
+            : "aguardando captura"}
+      </p>
+      {row.releaseEmailStatus && (
+        <p className="access-muted">
+          Aviso de liberação:{" "}
+          {row.releaseEmailStatus === "CAPTURED"
+            ? "capturado na caixa local"
+            : row.releaseEmailStatus === "FAILED"
+              ? "falhou; pode tentar novamente"
+              : row.releaseEmailStatus === "NOT_REQUESTED"
+                ? "cancelado após revogação"
+                : "pendente"}
+          .
+        </p>
+      )}
+      {row.decisionReason && <p>Motivo registrado: {row.decisionReason}</p>}
+      {row.status === "PENDING_ASSIGNMENT" && canReview && (
+        <form
+          onSubmit={(e) => {
+            e.preventDefault();
+            void action({
+              operation: "APPROVE",
+              id: row.id,
+              roleKey: role,
+              organizationId: scoped ? org : null,
+              reason,
+            });
+          }}
+        >
+          <p>
+            Perfil aceito: <strong>{roles[role]}</strong>. Esta decisão confirma
+            o perfil aceito. Para mudar o papel, encerre este convite e envie
+            outro para novo consentimento explícito.
+          </p>
+          {scoped && (
+            <>
+              <p>
+                Perfis institucionais exigem vínculo ativo na organização
+                selecionada. Esta ação não cria vínculo nem ativa UBS.
+              </p>
+              <button
+                className="access-secondary"
+                type="button"
+                onClick={() => void loadOrganizations()}
+              >
+                Consultar organizações autorizadas
+              </button>
+              {orgError && <p role="alert">{orgError}</p>}
+              <label>
+                Organização do vínculo existente
+                <select
+                  required
+                  value={org}
+                  onChange={(e) => setOrg(e.target.value)}
+                >
+                  <option value="">Selecione a organização</option>
+                  {organizations?.map((o) => (
+                    <option key={o.id} value={o.id}>
+                      {o.name}
+                    </option>
+                  ))}
+                </select>
+              </label>
+            </>
+          )}
+          <label>
+            Motivo da decisão
+            <textarea
+              required
+              minLength={3}
+              maxLength={400}
+              value={reason}
+              onChange={(e) => setReason(e.target.value)}
+            />
+          </label>
+          <div className="access-actions">
+            <button disabled={busy}>Autorizar perfil</button>
+            <button
+              className="access-secondary"
+              type="button"
+              disabled={busy || reason.trim().length < 3}
+              onClick={() =>
+                void action({ operation: "REJECT", id: row.id, reason })
+              }
+            >
+              Não autorizar
+            </button>
+          </div>
+        </form>
+      )}
+      {row.status === "PENDING_ASSIGNMENT" && !canReview && (
+        <p>A decisão deste perfil cabe ao PAP_ADMIN.</p>
+      )}
+      <div className="access-actions">
+        {["PENDING_ACCEPTANCE", "EXPIRED", "REVOKED"].includes(row.status) &&
+          !row.acceptedAt && (
+            <button
+              disabled={busy}
+              onClick={() => void action({ operation: "RESEND", id: row.id })}
+            >
+              Reenviar convite
+            </button>
+          )}
+        {["PENDING_ACCEPTANCE", "PENDING_ASSIGNMENT", "ACTIVE"].includes(
+          row.status,
+        ) &&
+          (row.status !== "ACTIVE" || canReview) && (
+            <button
+              className="access-secondary"
+              disabled={busy}
+              onClick={() => {
+                const reason = window.prompt(
+                  "Motivo da revogação (mínimo 3 caracteres)",
+                );
+                if (reason && reason.trim().length >= 3)
+                  void action({ operation: "REVOKE", id: row.id, reason });
+              }}
+            >
+              Revogar {row.status === "ACTIVE" ? "perfil" : "convite"}
+            </button>
+          )}
+        {row.status === "ACTIVE" && canReview && (
+          <button
+            className="access-secondary"
+            disabled={busy}
+            onClick={() =>
+              void action({ operation: "RETRY_NOTICE", id: row.id })
+            }
+          >
+            Repetir captura do aviso
+          </button>
+        )}
+      </div>
+    </li>
+  );
+}
+export default function AccessInvitationsClient() {
+  const [page, setPage] = useState(1),
+    [filter, setFilter] = useState(""),
+    [busy, setBusy] = useState(false),
+    [message, setMessage] = useState(""),
+    [error, setError] = useState("");
+  const lock = useRef(false);
+  const result = useBetaData<Queue>(
+    `/api/admin/access-invitations?page=${page}${filter ? `&status=${filter}` : ""}`,
+  );
+  async function action(body: Record<string, unknown>) {
+    if (lock.current) return;
+    lock.current = true;
+    setBusy(true);
+    setMessage("");
+    setError("");
+    try {
+      const r = await fetch("/api/admin/access-invitations", {
+        method: "POST",
+        headers: { "content-type": "application/json" },
+        body: JSON.stringify(body),
+      });
+      const data = await r.json();
+      if (!r.ok)
+        throw new Error(
+          data.error === "INVITATION_ALREADY_EXISTS"
+            ? "Já existe um convite aberto para este e-mail. Consulte a fila e use o reenvio para invalidar o link anterior."
+            : data.error === "LOCAL_DEMO_MAIL_REQUIRED" ||
+                data.error === "LOCAL_MAIL_FAILED"
+              ? "A captura local de e-mail não está disponível. Confira a configuração local-demo; nenhum e-mail real foi enviado."
+              : data.error === "RATE_LIMITED"
+                ? "Limite de operações atingido. Aguarde antes de tentar novamente."
+                : "A operação não foi autorizada ou o estado mudou. Atualize a fila e confira o perfil, o vínculo e a verificação MFA.",
+        );
+      setMessage(
+        body.operation === "CREATE" || body.operation === "RESEND"
+          ? "Convite capturado na caixa local. Nenhum envio externo realizado. O aceite ainda exigirá autorização do perfil."
+          : "Operação registrada. Consulte o estado atualizado na fila.",
+      );
+      result.refresh();
+    } catch (e) {
+      setError(e instanceof Error ? e.message : "Não foi possível conectar.");
+      result.refresh();
+    } finally {
+      lock.current = false;
+      setBusy(false);
+    }
+  }
+  const data = result.data;
+  return (
+    <div className="access-page access-queue">
+      <section className="access-card">
+        <p className="access-eyebrow">PAP Saúde · Governança</p>
+        <h1>Convites e autorizações</h1>
+        <p>
+          Convide uma pessoa sem exigir vínculo prévio com UBS. O aceite
+          confirma a conta; a autorização do perfil é uma decisão separada.
+        </p>
+        <DataState
+          loading={result.loading}
+          error={result.error}
+          retry={result.retry}
+        />
+        {data && (
+          <>
+            <p>
+              {data.full
+                ? "PAP_ADMIN: autorize Gerente, Comercial ou perfis institucionais com vínculo ativo."
+                : "Gerente: você acompanha seus convites e autoriza somente o perfil Comercial. Outras propostas serão analisadas pelo PAP_ADMIN."}
+            </p>
+            <form
+              className="access-queue-form"
+              onSubmit={(e) => {
+                e.preventDefault();
+                const f = new FormData(e.currentTarget);
+                void action({
+                  operation: "CREATE",
+                  displayName: f.get("displayName"),
+                  email: f.get("email"),
+                  proposedRoleKey: f.get("role"),
+                });
+              }}
+            >
+              <label>
+                Nome da pessoa
+                <input
+                  name="displayName"
+                  autoComplete="off"
+                  required
+                  minLength={2}
+                  maxLength={200}
+                />
+              </label>
+              <label>
+                E-mail do convite
+                <input
+                  type="email"
+                  name="email"
+                  autoComplete="off"
+                  required
+                  maxLength={254}
+                />
+              </label>
+              <label>
+                Perfil proposto
+                <select name="role" defaultValue="COMMERCIAL">
+                  {Object.entries(roles)
+                    .filter(([key]) => data.full || key !== "PAP_MANAGER")
+                    .map(([key, label]) => (
+                      <option value={key} key={key}>
+                        {label}
+                      </option>
+                    ))}
+                </select>
+              </label>
+              <button disabled={busy}>Criar convite global</button>
+            </form>
+            <label>
+              Filtrar situação
+              <select
+                value={filter}
+                onChange={(e) => {
+                  setFilter(e.target.value);
+                  setPage(1);
+                }}
+              >
+                <option value="">Todas as situações</option>
+                {Object.entries(labels).map(([value, label]) => (
+                  <option value={value} key={value}>
+                    {label}
+                  </option>
+                ))}
+              </select>
+            </label>
+            {message && <p role="status">{message}</p>}
+            {error && (
+              <p role="alert" className="access-error">
+                {error}
+              </p>
+            )}
+            <p>{data.total} registro(s) no escopo autorizado.</p>
+            {!data.rows.length && <p>Nenhum convite nesta situação.</p>}
+            <ul className="access-queue-list">
+              {data.rows.map((row) => (
+                <Review
+                  key={row.id}
+                  row={row}
+                  full={data.full}
+                  busy={busy}
+                  action={action}
+                />
+              ))}
+            </ul>
+            <nav aria-label="Páginas da fila">
+              <button
+                className="access-secondary"
+                disabled={page <= 1 || busy}
+                onClick={() => setPage((p) => p - 1)}
+              >
+                Anterior
+              </button>
+              <span>Página {page}</span>
+              <button
+                className="access-secondary"
+                disabled={page * data.pageSize >= data.total || busy}
+                onClick={() => setPage((p) => p + 1)}
+              >
+                Próxima
+              </button>
+            </nav>
+          </>
+        )}
+      </section>
+    </div>
+  );
+}
```

### prisma/schema.prisma

```diff
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index db465f0..e3f4c89 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -242,0 +243,4 @@ model User {
+  accessInvitations     AccessInvitation[] @relation("AccessRecipient")
+  sentAccessInvitations AccessInvitation[] @relation("AccessSender")
+  accessDecisions       AccessInvitation[] @relation("AccessReviewer")
+  notifications         UserNotification[]
@@ -355,0 +360,62 @@ model UserInvitation {
+// Independent from legacy institutional acceptance: consent never grants IAM.
+enum AccessInvitationStatus {
+  PENDING_ACCEPTANCE
+  PENDING_ASSIGNMENT
+  ACTIVE
+  REJECTED
+  EXPIRED
+  REVOKED
+}
+
+model AccessInvitation {
+  id               String @id @default(uuid())
+  email            String
+  displayName      String
+  proposedRoleKey  String
+  status           AccessInvitationStatus @default(PENDING_ACCEPTANCE)
+  activeSlot       Int? @default(1)
+  tokenHash        String? @unique
+  tokenVersion     Int @default(1)
+  expiresAt        DateTime
+  acceptedAt       DateTime?
+  decidedAt        DateTime?
+  decisionReason   String?
+  revokedAt        DateTime?
+  deliveryStatus   String @default("PENDING")
+  userId           String?
+  invitedByUserId  String
+  reviewedByUserId String?
+  assignmentId     String? @unique
+  createdAt        DateTime @default(now())
+  updatedAt        DateTime @updatedAt
+
+  user       User? @relation("AccessRecipient", fields: [userId], references: [id], onDelete: Restrict)
+  invitedBy  User @relation("AccessSender", fields: [invitedByUserId], references: [id], onDelete: Restrict)
+  reviewedBy User? @relation("AccessReviewer", fields: [reviewedByUserId], references: [id], onDelete: Restrict)
+  assignment RoleAssignment? @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
+  notifications UserNotification[]
+
+  @@unique([email, activeSlot])
+  @@index([invitedByUserId, status, createdAt])
+  @@index([userId, createdAt])
+  @@index([status, expiresAt])
+  @@map("access_invitations")
+}
+
+model UserNotification {
+  id           String @id @default(uuid())
+  userId       String
+  invitationId String
+  kind         String
+  dedupeKey    String @unique
+  readAt       DateTime?
+  emailStatus  String @default("PENDING")
+  createdAt    DateTime @default(now())
+
+  user       User @relation(fields: [userId], references: [id], onDelete: Restrict)
+  invitation AccessInvitation @relation(fields: [invitationId], references: [id], onDelete: Restrict)
+
+  @@index([userId, createdAt])
+  @@map("user_notifications")
+}
+
@@ -452,0 +519 @@ model RoleAssignment {
+  accessInvitation AccessInvitation?
```

### prisma/migrations/20261022050000_mission04_global_access/migration.sql

```diff
diff --git a/prisma/migrations/20261022050000_mission04_global_access/migration.sql b/prisma/migrations/20261022050000_mission04_global_access/migration.sql
new file mode 100644
index 0000000..149768f
--- /dev/null
+++ b/prisma/migrations/20261022050000_mission04_global_access/migration.sql
@@ -0,0 +1,118 @@
+-- Forward-only additive schema. No writes to legacy identities, credentials, MFA, sessions or organizations.
+BEGIN;
+-- CreateEnum
+CREATE TYPE "AccessInvitationStatus" AS ENUM ('PENDING_ACCEPTANCE', 'PENDING_ASSIGNMENT', 'ACTIVE', 'REJECTED', 'EXPIRED', 'REVOKED');
+
+-- CreateTable
+CREATE TABLE "access_invitations" (
+    "id" TEXT NOT NULL,
+    "email" TEXT NOT NULL,
+    "displayName" TEXT NOT NULL,
+    "proposedRoleKey" TEXT NOT NULL,
+    "status" "AccessInvitationStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
+    "activeSlot" INTEGER DEFAULT 1,
+    "tokenHash" TEXT,
+    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
+    "expiresAt" TIMESTAMP(3) NOT NULL,
+    "acceptedAt" TIMESTAMP(3),
+    "decidedAt" TIMESTAMP(3),
+    "decisionReason" TEXT,
+    "revokedAt" TIMESTAMP(3),
+    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
+    "userId" TEXT,
+    "invitedByUserId" TEXT NOT NULL,
+    "reviewedByUserId" TEXT,
+    "assignmentId" TEXT,
+    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
+    "updatedAt" TIMESTAMP(3) NOT NULL,
+
+    CONSTRAINT "access_invitations_pkey" PRIMARY KEY ("id")
+);
+
+-- CreateTable
+CREATE TABLE "user_notifications" (
+    "id" TEXT NOT NULL,
+    "userId" TEXT NOT NULL,
+    "invitationId" TEXT NOT NULL,
+    "kind" TEXT NOT NULL,
+    "dedupeKey" TEXT NOT NULL,
+    "readAt" TIMESTAMP(3),
+    "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
+    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
+
+    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
+);
+
+-- CreateIndex
+CREATE UNIQUE INDEX "access_invitations_tokenHash_key" ON "access_invitations"("tokenHash");
+
+-- CreateIndex
+CREATE UNIQUE INDEX "access_invitations_assignmentId_key" ON "access_invitations"("assignmentId");
+
+-- CreateIndex
+CREATE INDEX "access_invitations_invitedByUserId_status_createdAt_idx" ON "access_invitations"("invitedByUserId", "status", "createdAt");
+
+-- CreateIndex
+CREATE INDEX "access_invitations_userId_createdAt_idx" ON "access_invitations"("userId", "createdAt");
+
+-- CreateIndex
+CREATE INDEX "access_invitations_status_expiresAt_idx" ON "access_invitations"("status", "expiresAt");
+
+-- CreateIndex
+CREATE UNIQUE INDEX "access_invitations_email_activeSlot_key" ON "access_invitations"("email", "activeSlot");
+
+-- CreateIndex
+CREATE UNIQUE INDEX "user_notifications_dedupeKey_key" ON "user_notifications"("dedupeKey");
+
+-- CreateIndex
+CREATE INDEX "user_notifications_userId_createdAt_idx" ON "user_notifications"("userId", "createdAt");
+
+-- AddForeignKey
+ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
+
+-- AddForeignKey
+ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
+
+-- AddForeignKey
+ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
+
+-- AddForeignKey
+ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "role_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
+
+-- AddForeignKey
+ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
+
+-- AddForeignKey
+ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "access_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
+
+
+ALTER TABLE "access_invitations"
+ ADD CONSTRAINT "access_invitation_email_normalized" CHECK ("email" = lower(btrim("email"))),
+ ADD CONSTRAINT "access_invitation_role" CHECK ("proposedRoleKey" IN ('PAP_MANAGER','COMMERCIAL','PROFESSIONAL','HEALTH_UNIT_ADMIN','MUNICIPAL_ADMIN')),
+ ADD CONSTRAINT "access_invitation_slot" CHECK (("status" IN ('PENDING_ACCEPTANCE','PENDING_ASSIGNMENT','ACTIVE') AND "activeSlot" IS NOT NULL AND "activeSlot" = 1) OR ("status" IN ('REJECTED','EXPIRED','REVOKED') AND "activeSlot" IS NULL)),
+ ADD CONSTRAINT "access_invitation_consent" CHECK ("status" NOT IN ('PENDING_ASSIGNMENT','ACTIVE') OR ("acceptedAt" IS NOT NULL AND "userId" IS NOT NULL)),
+ ADD CONSTRAINT "access_invitation_decision" CHECK ("status" <> 'ACTIVE' OR ("decidedAt" IS NOT NULL AND "reviewedByUserId" IS NOT NULL)),
+ ADD CONSTRAINT "access_invitation_token" CHECK (("status" = 'PENDING_ACCEPTANCE' AND "tokenHash" IS NOT NULL) OR ("status" <> 'PENDING_ACCEPTANCE' AND "tokenHash" IS NULL)),
+ ADD CONSTRAINT "access_invitation_hash" CHECK ("tokenHash" IS NULL OR "tokenHash" ~ '^[0-9a-f]{64}$'),
+ ADD CONSTRAINT "access_invitation_version" CHECK ("tokenVersion" > 0),
+ ADD CONSTRAINT "access_invitation_delivery" CHECK ("deliveryStatus" IN ('PENDING','CAPTURED','FAILED'));
+ALTER TABLE "user_notifications"
+ ADD CONSTRAINT "access_notification_kind" CHECK ("kind" IN ('ACCESS_APPROVED','ACCESS_REVOKED')),
+ ADD CONSTRAINT "access_notification_email" CHECK ("emailStatus" IN ('PENDING','CAPTURED','FAILED','NOT_REQUESTED'));
+-- Validate at COMMIT so identity consent, grant, decision and notification can be atomic.
+CREATE FUNCTION enforce_access_invitation_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
+DECLARE current_row access_invitations%ROWTYPE;
+BEGIN
+ SELECT * INTO current_row FROM access_invitations WHERE id = NEW.id;
+ IF current_row.status = 'ACTIVE' AND NOT EXISTS (
+   SELECT 1 FROM role_assignments a JOIN roles r ON r.id = a."roleId"
+   WHERE a.id = current_row."assignmentId" AND a."userId" = current_row."userId"
+     AND r.key = current_row."proposedRoleKey" AND r.system = true
+ ) THEN RAISE EXCEPTION 'access_invitation_assignment_required' USING ERRCODE = '23514'; END IF;
+ RETURN NULL;
+END;
+$$;
+CREATE CONSTRAINT TRIGGER access_invitation_assignment_required
+ AFTER INSERT OR UPDATE ON access_invitations
+ DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_access_invitation_assignment();
+COMMIT;
```

### src/server/admin/admin-role.errors.ts

```diff
diff --git a/src/server/admin/admin-role.errors.ts b/src/server/admin/admin-role.errors.ts
index fdd54f8..2430680 100644
--- a/src/server/admin/admin-role.errors.ts
+++ b/src/server/admin/admin-role.errors.ts
@@ -50,0 +51,4 @@ export class ConcurrentAdminRoleMutationError
+
+export class PendingAccessAuthorizationError extends AdminRoleError {
+  constructor() { super("PENDING_ACCESS_AUTHORIZATION", 409); }
+}
```

### src/server/admin/admin-roles.service.ts

```diff
diff --git a/src/server/admin/admin-roles.service.ts b/src/server/admin/admin-roles.service.ts
index 30c900b..15ed9e4 100644
--- a/src/server/admin/admin-roles.service.ts
+++ b/src/server/admin/admin-roles.service.ts
@@ -0,0 +1 @@
+import { createAccessNotification } from "@/server/notifications/notification.service";
@@ -44,0 +46 @@ import {
+  PendingAccessAuthorizationError,
@@ -285 +287 @@ export async function getAdminRoleOverview(
-async function requireRoleMutation(
+export async function requireRoleMutation(
@@ -352 +354,11 @@ export async function createAdminRoleAssignment(input: {
-  return roleMutationTransaction(async (tx) => {
+  return roleMutationTransaction(tx => createAdminRoleAssignmentInTransaction(input, tx));
+}
+
+export async function createAdminRoleAssignmentInTransaction(input: Parameters<typeof createAdminRoleAssignment>[0], tx: Prisma.TransactionClient) {
+  if (!isSystemRoleKey(input.roleKey)) throw new UnsupportedAdminRoleError();
+  const definition = getSystemRoleDefinition(input.roleKey)!;
+  if (
+    (definition.scope === "GLOBAL" && input.organizationId != null) ||
+    (definition.scope !== "GLOBAL" && !input.organizationId)
+  )
+    throw new UnsupportedAdminRoleError();
@@ -363 +375 @@ export async function createAdminRoleAssignment(input: {
-      select: { isActive: true },
+      select: { isActive: true, email: true },
@@ -365,0 +378,3 @@ export async function createAdminRoleAssignment(input: {
+    if (await tx.accessInvitation.count({ where: {
+      email: target.email, OR: [{ status: "PENDING_ASSIGNMENT" }, { status: "PENDING_ACCEPTANCE", expiresAt: { gt: new Date() } }],
+    } })) throw new PendingAccessAuthorizationError();
@@ -411 +425,0 @@ export async function createAdminRoleAssignment(input: {
-  });
@@ -419 +433,4 @@ export async function revokeAdminRoleAssignment(input: {
-  return roleMutationTransaction(async (tx) => {
+  return roleMutationTransaction(tx => revokeAdminRoleAssignmentInTransaction(input, tx));
+}
+
+export async function revokeAdminRoleAssignmentInTransaction(input: Parameters<typeof revokeAdminRoleAssignment>[0], tx: Prisma.TransactionClient) {
@@ -453,0 +471,9 @@ export async function revokeAdminRoleAssignment(input: {
+    // A legitimate revocation through an old endpoint also closes C's state.
+    const accessInvitations = await tx.accessInvitation.findMany({ where: { assignmentId: current.id, status: "ACTIVE" } });
+    for (const invitation of accessInvitations) {
+      await tx.accessInvitation.update({ where: { id: invitation.id }, data: { status: "REVOKED", activeSlot: null, revokedAt: new Date(), assignmentId: null } });
+      await tx.userNotification.updateMany({ where: { invitationId: invitation.id, kind: "ACCESS_APPROVED", emailStatus: { in: ["PENDING", "FAILED"] } }, data: { emailStatus: "NOT_REQUESTED" } });
+      if (invitation.userId) await createAccessNotification(tx, invitation.userId, invitation.id, "ACCESS_REVOKED", input.actorUserId);
+      await tx.auditEvent.create({ data: { actorUserId: input.actorUserId, action: "ACCESS_INVITATION_REVOKED", resourceType: "INVITATION", resourceId: invitation.id,
+        after: { id: invitation.id, status: "REVOKED", userId: invitation.userId } } });
+    }
@@ -473 +498,0 @@ export async function revokeAdminRoleAssignment(input: {
-  });
```

### src/server/admin/institutional-invitation-policy.ts

```diff
diff --git a/src/server/admin/institutional-invitation-policy.ts b/src/server/admin/institutional-invitation-policy.ts
index 5bb6130..c24ddb7 100644
--- a/src/server/admin/institutional-invitation-policy.ts
+++ b/src/server/admin/institutional-invitation-policy.ts
@@ -40,0 +41,4 @@ export async function requireInstitutionalInvitationTarget(
+  // C consent/approval cannot be bypassed with an old institutional bearer link.
+  if (await client.accessInvitation.count({ where: {
+    email: normalizedEmail.toLowerCase(), OR: [{ status: "PENDING_ASSIGNMENT" }, { status: "PENDING_ACCEPTANCE", expiresAt: { gt: new Date() } }],
+  } })) throw new AccessDeniedError();
```

### src/server/audit/admin-audit-policy.ts

```diff
diff --git a/src/server/audit/admin-audit-policy.ts b/src/server/audit/admin-audit-policy.ts
index 9349432..3daf53b 100644
--- a/src/server/audit/admin-audit-policy.ts
+++ b/src/server/audit/admin-audit-policy.ts
@@ -2,0 +3,3 @@ export const ADMIN_AUDIT_ACTIONS = [
+  "ACCESS_INVITATION_CREATED", "ACCESS_INVITATION_ACCEPTED", "ACCESS_INVITATION_APPROVED",
+  "ACCESS_INVITATION_REJECTED", "ACCESS_INVITATION_REVOKED", "ACCESS_INVITATION_RESENT",
+  "ACCESS_INVITATION_EXPIRED", "ACCESS_INVITATION_DELIVERY", "ACCESS_NOTIFICATION_CREATED", "ACCESS_NOTIFICATION_READ",
@@ -13 +16 @@ export const ADMIN_AUDIT_ACTIONS = [
-export const ADMIN_AUDIT_RESOURCES = ["ORGANIZATION_REQUEST", "ORGANIZATION", "INVITATION", "ROLE_ASSIGNMENT", "USER", "USER_SESSION", "MFA_FACTOR"] as const;
+export const ADMIN_AUDIT_RESOURCES = ["ORGANIZATION_REQUEST", "ORGANIZATION", "INVITATION", "ROLE_ASSIGNMENT", "USER", "USER_SESSION", "MFA_FACTOR", "USER_NOTIFICATION"] as const;
@@ -14,0 +18 @@ const SAFE_FIELDS: Record<string, readonly string[]> = {
+  USER_NOTIFICATION: ["id", "kind", "readAt"],
```

### src/server/auth/login-navigation.service.ts

```diff
diff --git a/src/server/auth/login-navigation.service.ts b/src/server/auth/login-navigation.service.ts
index 123fa53..20c3aa4 100644
--- a/src/server/auth/login-navigation.service.ts
+++ b/src/server/auth/login-navigation.service.ts
@@ -1,0 +2,2 @@ import { PERMISSIONS } from "@/server/iam/permissions";
+import { accessDestination } from "@/lib/auth/access-destination";
+import { ownAccessStatus } from "@/server/access-invitations/access-invitation.service";
@@ -21 +23 @@ type LoginNavigation =
-      destination: "/admin" | "/dashboard" | "/primeiros-passos";
+      destination: "/admin" | "/dashboard" | "/primeiros-passos" | "/comercial" | "/aguardando-autorizacao";
@@ -62,0 +65,2 @@ export async function resolveLoginNavigation(
+  if (accessDestination(profile) === "/comercial")
+    return { view: "REDIRECT", destination: "/comercial" };
@@ -70 +74,3 @@ export async function resolveLoginNavigation(
-    return { view: "RESTRICTED" };
+    return await ownAccessStatus(session.user.id)
+      ? { view: "REDIRECT", destination: "/aguardando-autorizacao" }
+      : { view: "RESTRICTED" };
```

### src/lib/auth/access-destination.ts

```diff
diff --git a/src/lib/auth/access-destination.ts b/src/lib/auth/access-destination.ts
index 859df48..8040484 100644
--- a/src/lib/auth/access-destination.ts
+++ b/src/lib/auth/access-destination.ts
@@ -13,0 +14,2 @@ export function accessDestination(profile: EffectiveAccessProfile | null) {
+  if (profile?.roles.some(r => r.key === "COMMERCIAL" && r.scope === "GLOBAL" && r.permissions.includes("commercial.read")))
+    return "/comercial";
```

### src/app/(auth)/primeiros-passos/page.tsx

```diff
diff --git a/src/app/(auth)/primeiros-passos/page.tsx b/src/app/(auth)/primeiros-passos/page.tsx
index 16657ab..cbddf36 100644
--- a/src/app/(auth)/primeiros-passos/page.tsx
+++ b/src/app/(auth)/primeiros-passos/page.tsx
@@ -3,0 +4,3 @@ import FirstAccessWizard from "@/components/security/FirstAccessWizard";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import { ownAccessStatus } from "@/server/access-invitations/access-invitation.service";
+import { accessDestination } from "@/lib/auth/access-destination";
@@ -12 +15,5 @@ export default async function FirstAccessPage({
-  await requireOwnPageSession();
+  const session = await requireOwnPageSession();
+  const profile = await getEffectiveAccessProfile(session.user.id);
+  if (accessDestination(profile) === "/comercial") redirect("/comercial");
+  if (accessDestination(profile) === "/login" && await ownAccessStatus(session.user.id))
+    redirect("/aguardando-autorizacao");
```

### src/components/auth/LoginSecurity.tsx

```diff
diff --git a/src/components/auth/LoginSecurity.tsx b/src/components/auth/LoginSecurity.tsx
index 2ecebbd..c6b0170 100644
--- a/src/components/auth/LoginSecurity.tsx
+++ b/src/components/auth/LoginSecurity.tsx
@@ -82 +82,2 @@ export default function LoginSecurity({
-      router.replace("/primeiros-passos");
+      router.replace("/login");
+      router.refresh();
```

### src/app/api/access-invitations/accept/route.ts

```diff
diff --git a/src/app/api/access-invitations/accept/route.ts b/src/app/api/access-invitations/accept/route.ts
new file mode 100644
index 0000000..bb44cbd
--- /dev/null
+++ b/src/app/api/access-invitations/accept/route.ts
@@ -0,0 +1,54 @@
+import { NextRequest } from "next/server";
+import {
+  assertTrustedRequestOrigin,
+  readSessionToken,
+  resolveTrustedClientOrigin,
+} from "@/server/auth/http-auth";
+import { readAdminJson } from "@/server/admin/admin-http";
+import { betaRateLimit, invalid } from "@/server/admin-beta/policy";
+import {
+  accessJson,
+  accessError,
+  onlyFields,
+} from "@/server/access-invitations/access-invitation-http";
+import {
+  inspectAccessInvitation,
+  acceptAccessInvitation,
+  hashAccessToken,
+} from "@/server/access-invitations/access-invitation.service";
+export const runtime = "nodejs";
+export const dynamic = "force-dynamic";
+// Secret is received only in a bounded POST body, never query string or JSON response.
+export async function POST(request: NextRequest) {
+  try {
+    assertTrustedRequestOrigin(request);
+    if (request.nextUrl.search) invalid();
+    const body = await readAdminJson(request);
+    onlyFields(body, ["operation", "token", "password"]);
+    if (
+      typeof body.token !== "string" ||
+      !["INSPECT", "ACCEPT"].includes(String(body.operation))
+    )
+      invalid();
+    await betaRateLimit(
+      `access-public/${body.operation}`,
+      resolveTrustedClientOrigin(request),
+      100,
+    );
+    if (body.operation === "INSPECT")
+      return accessJson({
+        invitation: await inspectAccessInvitation(body.token),
+      });
+    if (typeof body.password !== "string") invalid();
+    await betaRateLimit("access-identity", hashAccessToken(body.token), 10);
+    return accessJson(
+      await acceptAccessInvitation({
+        token: body.token,
+        password: body.password,
+        sessionToken: readSessionToken(request) ?? undefined,
+      }),
+    );
+  } catch (error) {
+    return accessError(error);
+  }
+}
```

### src/app/api/account/access-status/route.ts

```diff
diff --git a/src/app/api/account/access-status/route.ts b/src/app/api/account/access-status/route.ts
new file mode 100644
index 0000000..d35c9cb
--- /dev/null
+++ b/src/app/api/account/access-status/route.ts
@@ -0,0 +1,18 @@
+import { NextRequest } from "next/server";
+import { ownAccessStatus } from "@/server/access-invitations/access-invitation.service";
+import {
+  ownAccessSession,
+  accessJson,
+  accessError,
+} from "@/server/access-invitations/access-invitation-http";
+import { invalid } from "@/server/admin-beta/policy";
+export const dynamic = "force-dynamic";
+export async function GET(request: NextRequest) {
+  try {
+    if (request.nextUrl.search) invalid();
+    const { user } = await ownAccessSession(request);
+    return accessJson({ access: await ownAccessStatus(user.id) });
+  } catch (error) {
+    return accessError(error);
+  }
+}
```

### src/app/api/account/notifications/route.ts

```diff
diff --git a/src/app/api/account/notifications/route.ts b/src/app/api/account/notifications/route.ts
new file mode 100644
index 0000000..2bc46c0
--- /dev/null
+++ b/src/app/api/account/notifications/route.ts
@@ -0,0 +1,40 @@
+import { NextRequest } from "next/server";
+import { assertTrustedRequestOrigin } from "@/server/auth/http-auth";
+import { readAdminJson } from "@/server/admin/admin-http";
+import { uuid, invalid } from "@/server/admin-beta/policy";
+import {
+  ownAccessSession,
+  accessJson,
+  accessError,
+  onlyFields,
+} from "@/server/access-invitations/access-invitation-http";
+import {
+  ownNotifications,
+  markOwnNotificationRead,
+} from "@/server/notifications/notification.service";
+export const dynamic = "force-dynamic";
+export async function GET(request: NextRequest) {
+  try {
+    if (request.nextUrl.search) invalid();
+    const { user } = await ownAccessSession(request);
+    return accessJson({ notifications: await ownNotifications(user.id) });
+  } catch (error) {
+    return accessError(error);
+  }
+}
+export async function PATCH(request: NextRequest) {
+  try {
+    assertTrustedRequestOrigin(request);
+    if (request.nextUrl.search) invalid();
+    const { user } = await ownAccessSession(request),
+      body = await readAdminJson(request);
+    onlyFields(body, ["id"]);
+    const found = await markOwnNotificationRead(user.id, uuid(body.id));
+    return accessJson(
+      found ? { read: true } : { error: "NOTIFICATION_NOT_FOUND" },
+      found ? 200 : 404,
+    );
+  } catch (error) {
+    return accessError(error);
+  }
+}
```

### src/app/api/admin/access-invitations/route.ts

```diff
diff --git a/src/app/api/admin/access-invitations/route.ts b/src/app/api/admin/access-invitations/route.ts
new file mode 100644
index 0000000..5a526e1
--- /dev/null
+++ b/src/app/api/admin/access-invitations/route.ts
@@ -0,0 +1,122 @@
+import { NextRequest } from "next/server";
+import { requireAdminSession, readAdminJson } from "@/server/admin/admin-http";
+import {
+  assertTrustedRequestOrigin,
+  readSessionToken,
+} from "@/server/auth/http-auth";
+import { betaRateLimit, invalid, uuid } from "@/server/admin-beta/policy";
+import {
+  accessJson,
+  accessError,
+  onlyFields,
+} from "@/server/access-invitations/access-invitation-http";
+import {
+  listAccessInvitations,
+  createAccessInvitation,
+  resendAccessInvitation,
+  approveAccessInvitation,
+  closeAccessInvitation,
+  retryAccessRelease,
+} from "@/server/access-invitations/access-invitation.service";
+export const runtime = "nodejs";
+export const dynamic = "force-dynamic";
+export async function GET(request: NextRequest) {
+  try {
+    const session = await requireAdminSession(request);
+    const current = {
+        userId: session.user.id,
+        sessionToken: readSessionToken(request)!,
+      },
+      p = request.nextUrl.searchParams;
+    if (
+      [...p.keys()].some(
+        (k) => !["page", "status"].includes(k) || p.getAll(k).length !== 1,
+      )
+    )
+      invalid();
+    return accessJson(
+      await listAccessInvitations(
+        current,
+        Number(p.get("page") || 1),
+        p.get("status") ?? undefined,
+      ),
+    );
+  } catch (error) {
+    return accessError(error);
+  }
+}
+export async function POST(request: NextRequest) {
+  try {
+    assertTrustedRequestOrigin(request);
+    const session = await requireAdminSession(request);
+    const current = {
+        userId: session.user.id,
+        sessionToken: readSessionToken(request)!,
+      },
+      body = await readAdminJson(request);
+    if (
+      typeof body.operation !== "string" ||
+      ![
+        "CREATE",
+        "RESEND",
+        "APPROVE",
+        "REJECT",
+        "REVOKE",
+        "RETRY_NOTICE",
+      ].includes(body.operation)
+    )
+      invalid();
+    await betaRateLimit(
+      `access-invitations/${body.operation}`,
+      current.userId,
+      30,
+    );
+    if (body.operation === "CREATE") {
+      onlyFields(body, [
+        "operation",
+        "email",
+        "displayName",
+        "proposedRoleKey",
+      ]);
+      return accessJson(
+        await createAccessInvitation(current, {
+          email: body.email,
+          displayName: body.displayName,
+          proposedRoleKey: body.proposedRoleKey,
+        }),
+        201,
+      );
+    }
+    const id = uuid(body.id);
+    if (body.operation === "APPROVE") {
+      onlyFields(body, [
+        "operation",
+        "id",
+        "roleKey",
+        "organizationId",
+        "reason",
+      ]);
+      return accessJson(
+        await approveAccessInvitation(current, id, {
+          roleKey: body.roleKey,
+          organizationId: body.organizationId,
+          reason: body.reason,
+        }),
+      );
+    }
+    if (body.operation === "REJECT" || body.operation === "REVOKE") {
+      onlyFields(body, ["operation", "id", "reason"]);
+      return accessJson(
+        await closeAccessInvitation(current, id, body.operation, body.reason),
+      );
+    }
+    onlyFields(body, ["operation", "id"]);
+    return accessJson(
+      body.operation === "RESEND"
+        ? await resendAccessInvitation(current, id)
+        : await retryAccessRelease(current, id),
+    );
+  } catch (error) {
+    return accessError(error);
+  }
+}
```

### src/server/access-invitations/access-invitation-http.ts

```diff
diff --git a/src/server/access-invitations/access-invitation-http.ts b/src/server/access-invitations/access-invitation-http.ts
new file mode 100644
index 0000000..0a1b1c0
--- /dev/null
+++ b/src/server/access-invitations/access-invitation-http.ts
@@ -0,0 +1,34 @@
+import { NextRequest, NextResponse } from "next/server";
+import { betaError } from "@/server/admin-beta/http";
+import { PasswordPolicyError } from "@/server/auth/auth.errors";
+import { InvalidSessionError } from "@/server/auth/session.errors";
+import { readSessionToken } from "@/server/auth/http-auth";
+import { validateSession } from "@/server/auth/session.service";
+import { AccessInvitationError } from "./access-invitation.errors";
+
+export function accessJson(value: unknown, status = 200) {
+  return NextResponse.json(value, {
+    status,
+    headers: {
+      "Cache-Control": "no-store, max-age=0",
+      "Referrer-Policy": "no-referrer",
+      "X-Content-Type-Options": "nosniff",
+    },
+  });
+}
+export function accessError(error: unknown) {
+  if (error instanceof AccessInvitationError)
+    return accessJson({ error: error.code }, error.status);
+  if (error instanceof PasswordPolicyError)
+    return accessJson({ error: "INVALID_PASSWORD" }, 400);
+  return betaError(error);
+}
+export async function ownAccessSession(request: NextRequest) {
+  const token = readSessionToken(request);
+  if (!token) throw new InvalidSessionError();
+  return validateSession(token, { updateLastSeen: false });
+}
+export function onlyFields(body: Record<string, unknown>, fields: string[]) {
+  if (Object.keys(body).some((key) => !fields.includes(key)))
+    throw new Error("INVALID_ADMIN_PAYLOAD");
+}
```

### src/server/access-invitations/access-invitation-policy.ts

```diff
diff --git a/src/server/access-invitations/access-invitation-policy.ts b/src/server/access-invitations/access-invitation-policy.ts
new file mode 100644
index 0000000..78b4a3f
--- /dev/null
+++ b/src/server/access-invitations/access-invitation-policy.ts
@@ -0,0 +1,50 @@
+import type { Prisma } from "@prisma/client";
+import { db } from "@/server/db/client";
+import { requireAdminActor } from "@/server/admin/admin-session.service";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import { AccessDeniedError } from "@/server/iam/authorization.errors";
+import { AccessInvitationError } from "./access-invitation.errors";
+
+export const PROPOSED_ROLES = [
+  "PAP_MANAGER",
+  "COMMERCIAL",
+  "PROFESSIONAL",
+  "HEALTH_UNIT_ADMIN",
+  "MUNICIPAL_ADMIN",
+] as const;
+export type ProposedRole = (typeof PROPOSED_ROLES)[number];
+
+/** Called again on the transaction client, never a role snapshot from the browser. */
+export async function invitationAuthority(
+  userId: string,
+  tx: Prisma.TransactionClient = db,
+) {
+  const profile = await getEffectiveAccessProfile(userId, tx);
+  const role = profile?.roles.find(
+    (r) =>
+      r.scope === "GLOBAL" &&
+      ["PAP_ADMIN", "PAP_MANAGER"].includes(r.key) &&
+      r.permissions.includes("institution.invite"),
+  );
+  if (!role) throw new AccessDeniedError();
+  return {
+    full: role.key === "PAP_ADMIN" && role.permissions.includes("role.manage"),
+  };
+}
+export async function invitationActor(
+  userId: string,
+  token: string,
+  tx: Prisma.TransactionClient = db,
+) {
+  await requireAdminActor(userId, token, tx);
+  return invitationAuthority(userId, tx);
+}
+export function proposal(value: unknown, full: boolean): ProposedRole {
+  if (
+    typeof value !== "string" ||
+    !PROPOSED_ROLES.includes(value as ProposedRole)
+  )
+    throw new AccessInvitationError("INVALID_PROPOSED_ROLE", 400);
+  if (value === "PAP_MANAGER" && !full) throw new AccessDeniedError();
+  return value as ProposedRole;
+}
```

### src/server/access-invitations/access-invitation.errors.ts

```diff
diff --git a/src/server/access-invitations/access-invitation.errors.ts b/src/server/access-invitations/access-invitation.errors.ts
new file mode 100644
index 0000000..cb7b59c
--- /dev/null
+++ b/src/server/access-invitations/access-invitation.errors.ts
@@ -0,0 +1,8 @@
+export class AccessInvitationError extends Error {
+  constructor(
+    public code: string,
+    public status = 409,
+  ) {
+    super(code);
+  }
+}
```

### src/server/access-invitations/access-invitation.service.ts

```diff
diff --git a/src/server/access-invitations/access-invitation.service.ts b/src/server/access-invitations/access-invitation.service.ts
new file mode 100644
index 0000000..eaf7d1c
--- /dev/null
+++ b/src/server/access-invitations/access-invitation.service.ts
@@ -0,0 +1,774 @@
+import { createHash, randomBytes } from "node:crypto";
+import {
+  AccessInvitationStatus,
+  type AccessInvitation,
+  type Prisma,
+} from "@prisma/client";
+import { db } from "@/server/db/client";
+import {
+  email,
+  text,
+  uuid,
+  invalid,
+  serializable,
+} from "@/server/admin-beta/policy";
+import { requireAdminActor } from "@/server/admin/admin-session.service";
+import {
+  createAdminRoleAssignmentInTransaction,
+  revokeAdminRoleAssignmentInTransaction,
+  requireRoleMutation,
+} from "@/server/admin/admin-roles.service";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import { createAccessNotification } from "@/server/notifications/notification.service";
+import {
+  hashPassword,
+  validatePasswordPolicy,
+  verifyPassword,
+} from "@/server/auth/password";
+import { validateSession } from "@/server/auth/session.service";
+import {
+  invitationBaseUrl,
+  sendPlatformEmail,
+} from "@/server/email/email.service";
+import { writeAdminAudit } from "@/server/audit/admin-audit-writer.service";
+import { AccessInvitationError } from "./access-invitation.errors";
+import {
+  invitationActor,
+  invitationAuthority,
+  proposal,
+} from "./access-invitation-policy";
+
+export type InvitationActor = { userId: string; sessionToken: string };
+const ttl = 48 * 60 * 60 * 1000;
+const publicFields = {
+  id: true,
+  email: true,
+  displayName: true,
+  proposedRoleKey: true,
+  status: true,
+  expiresAt: true,
+  acceptedAt: true,
+  decidedAt: true,
+  decisionReason: true,
+  deliveryStatus: true,
+  createdAt: true,
+} as const;
+export function hashAccessToken(token: string) {
+  return createHash("sha256")
+    .update("pap-saude:global-access:v1\0")
+    .update(token)
+    .digest("hex");
+}
+function secret(value: unknown) {
+  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{43}$/.test(value))
+    throw new AccessInvitationError("INVITATION_UNAVAILABLE", 400);
+  return value;
+}
+function unavailable(): never {
+  throw new AccessInvitationError("INVITATION_UNAVAILABLE", 400);
+}
+function conflict(): never {
+  throw new AccessInvitationError("INVITATION_STATE_CONFLICT");
+}
+function ownable(
+  invitation: AccessInvitation | null,
+  actor: InvitationActor,
+  full: boolean,
+) {
+  if (!invitation || (!full && invitation.invitedByUserId !== actor.userId))
+    throw new AccessInvitationError("INVITATION_NOT_FOUND", 404);
+  return invitation;
+}
+function visible(row: Pick<AccessInvitation, keyof typeof publicFields>) {
+  return {
+    id: row.id,
+    email: row.email,
+    displayName: row.displayName,
+    proposedRoleKey: row.proposedRoleKey,
+    status:
+      row.status === "PENDING_ACCEPTANCE" && row.expiresAt <= new Date()
+        ? "EXPIRED"
+        : row.status,
+    expiresAt: row.expiresAt,
+    acceptedAt: row.acceptedAt,
+    decidedAt: row.decidedAt,
+    decisionReason: row.decisionReason,
+    deliveryStatus: row.deliveryStatus,
+    createdAt: row.createdAt,
+  };
+}
+async function audit(
+  tx: Prisma.TransactionClient,
+  actorUserId: string,
+  action: string,
+  row: AccessInvitation,
+) {
+  await writeAdminAudit(
+    {
+      actorUserId,
+      action,
+      resourceType: "INVITATION",
+      resourceId: row.id,
+      after: {
+        id: row.id,
+        status: row.status,
+        roleKey: row.proposedRoleKey,
+        userId: row.userId,
+        expiresAt: row.expiresAt.toISOString(),
+      },
+    },
+    tx,
+  );
+}
+async function eligibleIdentity(
+  tx: Prisma.TransactionClient,
+  address: string,
+  actorId: string,
+) {
+  const user = await tx.user.findUnique({
+    where: { email: address },
+    select: { id: true, isActive: true },
+  });
+  if (
+    user &&
+    (!user.isActive ||
+      user.id === actorId ||
+      (await tx.roleAssignment.count({ where: { userId: user.id } })))
+  )
+    throw new AccessInvitationError("INVITATION_TARGET_UNAVAILABLE");
+  return user;
+}
+function requireLocalMail() {
+  if (process.env.PAP_EMAIL_PROVIDER !== "local-demo")
+    throw new AccessInvitationError("LOCAL_DEMO_MAIL_REQUIRED", 503);
+}
+async function deliverInvitation(row: AccessInvitation, token: string) {
+  const url = new URL("/aceitar-convite", invitationBaseUrl());
+  url.hash = `token=${encodeURIComponent(token)}`;
+  try {
+    await sendPlatformEmail({
+      to: row.email,
+      subject: "Seu convite para o PAP Saúde",
+      text: `Olá. Você recebeu um convite individual do PAP Saúde. Aceite em ${url.toString()} . Válido até ${row.expiresAt.toISOString()}. O aceite cria/confirma sua conta e aguarda autorização do perfil; não libera acesso operacional. Não compartilhe o link.`,
+      html: `<html lang="pt-BR"><body><h1>PAP Saúde</h1><p>Você recebeu um convite individual, válido até ${row.expiresAt.toISOString()}.</p><p><a href="${url.toString()}">Aceitar convite</a></p><p>O aceite não libera acesso operacional. Seu perfil ainda precisará de autorização. Não compartilhe o link.</p></body></html>`,
+      messageId: `access/${row.id}/${row.tokenVersion}`,
+      eventTime: new Date(row.expiresAt.getTime() - ttl).toISOString(),
+      localDemoOnly: true,
+    });
+    await db.accessInvitation.updateMany({
+      where: {
+        id: row.id,
+        tokenVersion: row.tokenVersion,
+        status: "PENDING_ACCEPTANCE",
+      },
+      data: { deliveryStatus: "CAPTURED" },
+    });
+    await writeAdminAudit({
+      actorUserId: row.invitedByUserId,
+      action: "ACCESS_INVITATION_DELIVERY",
+      resourceType: "INVITATION",
+      resourceId: row.id,
+      reason: "LOCAL_CAPTURED",
+    });
+  } catch {
+    await serializable(async (tx) => {
+      const result = await tx.accessInvitation.updateMany({
+        where: {
+          id: row.id,
+          tokenVersion: row.tokenVersion,
+          status: "PENDING_ACCEPTANCE",
+        },
+        data: {
+          status: "REVOKED",
+          activeSlot: null,
+          tokenHash: null,
+          revokedAt: new Date(),
+          deliveryStatus: "FAILED",
+        },
+      });
+      if (result.count)
+        await audit(tx, row.invitedByUserId, "ACCESS_INVITATION_REVOKED", {
+          ...row,
+          status: "REVOKED",
+        });
+    });
+    throw new AccessInvitationError("LOCAL_MAIL_FAILED", 503);
+  }
+}
+
+export async function listAccessInvitations(
+  actor: InvitationActor,
+  page = 1,
+  status?: string,
+) {
+  if (!Number.isInteger(page) || page < 1 || page > 10000) invalid();
+  if (
+    status &&
+    !Object.values(AccessInvitationStatus).includes(
+      status as AccessInvitationStatus,
+    )
+  )
+    invalid();
+  return serializable(async (tx) => {
+    const { full } = await invitationActor(
+      actor.userId,
+      actor.sessionToken,
+      tx,
+    );
+    const filter: Prisma.AccessInvitationWhereInput =
+      status === "EXPIRED"
+        ? {
+            OR: [
+              { status: "EXPIRED" },
+              { status: "PENDING_ACCEPTANCE", expiresAt: { lte: new Date() } },
+            ],
+          }
+        : status
+          ? {
+              status: status as AccessInvitationStatus,
+              ...(status === "PENDING_ACCEPTANCE"
+                ? { expiresAt: { gt: new Date() } }
+                : {}),
+            }
+          : {};
+    const where = {
+      AND: [full ? {} : { invitedByUserId: actor.userId }, filter],
+    };
+    const rows = await tx.accessInvitation.findMany({
+      where,
+      select: {
+        ...publicFields,
+        notifications: {
+          where: { kind: "ACCESS_APPROVED" },
+          select: { emailStatus: true },
+        },
+      },
+      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
+      take: 20,
+      skip: (page - 1) * 20,
+    });
+    const total = await tx.accessInvitation.count({ where });
+    return {
+      rows: rows.map((row) => ({
+        ...visible(row),
+        releaseEmailStatus: row.notifications[0]?.emailStatus ?? null,
+      })),
+      total,
+      page,
+      pageSize: 20,
+      full,
+    };
+  });
+}
+
+export async function createAccessInvitation(
+  actor: InvitationActor,
+  input: { email: unknown; displayName: unknown; proposedRoleKey: unknown },
+) {
+  await invitationActor(actor.userId, actor.sessionToken);
+  requireLocalMail();
+  const address = email(input.email),
+    displayName = text(input.displayName, 200);
+  const token = randomBytes(32).toString("base64url");
+  const row = await serializable(async (tx) => {
+    const { full } = await invitationActor(
+      actor.userId,
+      actor.sessionToken,
+      tx,
+    );
+    const proposedRoleKey = proposal(input.proposedRoleKey, full);
+    await eligibleIdentity(tx, address, actor.userId);
+    const current = await tx.accessInvitation.findUnique({
+      where: { email_activeSlot: { email: address, activeSlot: 1 } },
+    });
+    if (current) {
+      if (
+        current.status !== "PENDING_ACCEPTANCE" ||
+        current.expiresAt > new Date()
+      )
+        throw new AccessInvitationError("INVITATION_ALREADY_EXISTS");
+      const expired = await tx.accessInvitation.update({
+        where: { id: current.id },
+        data: { status: "EXPIRED", activeSlot: null, tokenHash: null },
+      });
+      await audit(tx, actor.userId, "ACCESS_INVITATION_EXPIRED", expired);
+    }
+    const created = await tx.accessInvitation.create({
+      data: {
+        email: address,
+        displayName,
+        proposedRoleKey,
+        invitedByUserId: actor.userId,
+        tokenHash: hashAccessToken(token),
+        expiresAt: new Date(Date.now() + ttl),
+      },
+    });
+    await audit(tx, actor.userId, "ACCESS_INVITATION_CREATED", created);
+    return created;
+  });
+  await deliverInvitation(row, token);
+  return { invitation: visible({ ...row, deliveryStatus: "CAPTURED" }) };
+}
+
+export async function resendAccessInvitation(
+  actor: InvitationActor,
+  id: string,
+) {
+  await invitationActor(actor.userId, actor.sessionToken);
+  requireLocalMail();
+  uuid(id);
+  const token = randomBytes(32).toString("base64url");
+  const row = await serializable(async (tx) => {
+    const { full } = await invitationActor(
+      actor.userId,
+      actor.sessionToken,
+      tx,
+    );
+    const current = ownable(
+      await tx.accessInvitation.findUnique({ where: { id } }),
+      actor,
+      full,
+    );
+    if (
+      !["PENDING_ACCEPTANCE", "EXPIRED", "REVOKED"].includes(current.status) ||
+      current.acceptedAt
+    )
+      conflict();
+    proposal(current.proposedRoleKey, full);
+    await eligibleIdentity(tx, current.email, actor.userId);
+    const other = await tx.accessInvitation.findFirst({
+      where: { email: current.email, activeSlot: 1, id: { not: id } },
+    });
+    if (other) conflict();
+    const updated = await tx.accessInvitation.update({
+      where: { id },
+      data: {
+        status: "PENDING_ACCEPTANCE",
+        activeSlot: 1,
+        tokenHash: hashAccessToken(token),
+        tokenVersion: { increment: 1 },
+        invitedByUserId: actor.userId,
+        expiresAt: new Date(Date.now() + ttl),
+        revokedAt: null,
+        deliveryStatus: "PENDING",
+      },
+    });
+    await audit(tx, actor.userId, "ACCESS_INVITATION_RESENT", updated);
+    return updated;
+  });
+  await deliverInvitation(row, token);
+  return { invitation: visible({ ...row, deliveryStatus: "CAPTURED" }) };
+}
+
+async function pendingToken(token: string, tx: Prisma.TransactionClient = db) {
+  const row = await tx.accessInvitation.findUnique({
+    where: { tokenHash: hashAccessToken(secret(token)) },
+  });
+  if (
+    !row ||
+    row.status !== "PENDING_ACCEPTANCE" ||
+    row.expiresAt <= new Date()
+  )
+    unavailable();
+  const authority = await invitationAuthority(row.invitedByUserId, tx).catch(
+    () => unavailable(),
+  );
+  proposal(row.proposedRoleKey, authority.full);
+  await eligibleIdentity(tx, row.email, row.invitedByUserId);
+  return row;
+}
+
+export async function inspectAccessInvitation(token: string) {
+  const row = await pendingToken(token);
+  const user = await db.user.findUnique({
+    where: { email: row.email },
+    select: { passwordCredential: { select: { id: true } } },
+  });
+  return {
+    email: row.email,
+    displayName: row.displayName,
+    expiresAt: row.expiresAt,
+    requiresPassword: !user?.passwordCredential,
+  };
+}
+
+/** Bearer consent creates/confirms identity only. Never mint a session or grant IAM here. */
+export async function acceptAccessInvitation(input: {
+  token: string;
+  password: string;
+  sessionToken?: string;
+}) {
+  const token = secret(input.token);
+  if (
+    typeof input.password !== "string" ||
+    !input.password ||
+    input.password.length > 256
+  )
+    invalid();
+  const row = await pendingToken(token);
+  const existing = await db.user.findUnique({
+    where: { email: row.email },
+    include: { passwordCredential: true },
+  });
+  const oldHash = existing?.passwordCredential?.passwordHash;
+  if (oldHash && !(await verifyPassword(oldHash, input.password)))
+    throw new AccessInvitationError("IDENTITY_CONFIRMATION_REQUIRED", 403);
+  if (!oldHash) validatePasswordPolicy(input.password);
+  const passwordHash = oldHash ? null : await hashPassword(input.password);
+  await serializable(async (tx) => {
+    const current = await pendingToken(token, tx);
+    let user = await tx.user.findUnique({
+      where: { email: current.email },
+      include: { passwordCredential: true },
+    });
+    if ((user?.passwordCredential?.passwordHash ?? null) !== (oldHash ?? null))
+      conflict();
+    if (input.sessionToken) {
+      const session = await validateSession(input.sessionToken, {
+        updateLastSeen: false,
+        client: tx,
+      });
+      if (session.user.email !== current.email)
+        throw new AccessInvitationError("IDENTITY_CONFIRMATION_REQUIRED", 403);
+    }
+    if (
+      user &&
+      (await tx.mfaFactor.count({
+        where: { userId: user.id, type: "TOTP", status: "ACTIVE" },
+      }))
+    )
+      await requireAdminActor(user.id, input.sessionToken, tx);
+    if (!user)
+      user = await tx.user.create({
+        data: { email: current.email, displayName: current.displayName },
+        include: { passwordCredential: true },
+      });
+    if (!user.isActive) unavailable();
+    if (passwordHash)
+      await tx.passwordCredential.create({
+        data: {
+          userId: user.id,
+          passwordHash,
+          algorithm: "ARGON2ID",
+          mustChange: false,
+          changedAt: new Date(),
+        },
+      });
+    const accepted = await tx.accessInvitation.update({
+      where: { id: current.id },
+      data: {
+        status: "PENDING_ASSIGNMENT",
+        tokenHash: null,
+        userId: user.id,
+        acceptedAt: new Date(),
+      },
+    });
+    await audit(tx, user.id, "ACCESS_INVITATION_ACCEPTED", accepted);
+  });
+  return { accepted: true, next: "/login" };
+}
+
+export async function approveAccessInvitation(
+  actor: InvitationActor,
+  id: string,
+  input: { roleKey: unknown; organizationId?: unknown; reason: unknown },
+) {
+  uuid(id);
+  const reason = text(input.reason, 400, 3);
+  const notificationId = await serializable(async (tx) => {
+    const { full } = await invitationActor(
+      actor.userId,
+      actor.sessionToken,
+      tx,
+    );
+    const row = ownable(
+      await tx.accessInvitation.findUnique({ where: { id } }),
+      actor,
+      full,
+    );
+    const roleKey = proposal(input.roleKey, full);
+    if (
+      !full &&
+      (roleKey !== "COMMERCIAL" || row.proposedRoleKey !== "COMMERCIAL")
+    )
+      throw new AccessInvitationError("ROLE_NOT_DELEGATED", 403);
+    // Approval confirms the exact role the recipient accepted. Changing the
+    // proposal requires a new invitation and explicit consent, even for Admin.
+    if (roleKey !== row.proposedRoleKey)
+      throw new AccessInvitationError("INVITATION_ROLE_MISMATCH", 409);
+    const organizationId =
+      input.organizationId == null ? null : uuid(input.organizationId);
+    if (!row.userId || !row.acceptedAt || row.userId === actor.userId)
+      conflict();
+    // Revoked/demoted inviters cannot leave an outstanding authorization path.
+    const inviter = await invitationAuthority(row.invitedByUserId, tx);
+    proposal(row.proposedRoleKey, inviter.full);
+    await requireRoleMutation(
+      actor.userId,
+      actor.sessionToken,
+      row.userId,
+      roleKey,
+      organizationId,
+      tx,
+    );
+    if (row.status === "ACTIVE") {
+      const assignment =
+        row.assignmentId &&
+        (await tx.roleAssignment.findUnique({
+          where: { id: row.assignmentId },
+          include: { role: true },
+        }));
+      if (
+        !assignment ||
+        assignment.role.key !== roleKey ||
+        assignment.organizationId !== organizationId
+      )
+        conflict();
+      return (
+        await createAccessNotification(
+          tx,
+          row.userId,
+          row.id,
+          "ACCESS_APPROVED",
+          actor.userId,
+        )
+      ).id;
+    }
+    if (row.status !== "PENDING_ASSIGNMENT") conflict();
+    await eligibleIdentity(tx, row.email, actor.userId);
+    // No implicit membership or organization activation. Scoped roles require an
+    // already legitimate ACTIVE membership; the shared B helper enforces it.
+    const updated = await tx.accessInvitation.update({
+      where: { id },
+      data: {
+        status: "ACTIVE",
+        decidedAt: new Date(),
+        reviewedByUserId: actor.userId,
+        decisionReason: reason,
+      },
+    });
+    const assignment = await createAdminRoleAssignmentInTransaction(
+      {
+        actorUserId: actor.userId,
+        actorSessionToken: actor.sessionToken,
+        targetUserId: row.userId,
+        roleKey,
+        organizationId,
+      },
+      tx,
+    );
+    await tx.accessInvitation.update({
+      where: { id },
+      data: { assignmentId: assignment.id },
+    });
+    const notice = await createAccessNotification(
+      tx,
+      row.userId,
+      row.id,
+      "ACCESS_APPROVED",
+      actor.userId,
+    );
+    await audit(tx, actor.userId, "ACCESS_INVITATION_APPROVED", updated);
+    return notice.id;
+  });
+  await dispatchAccessRelease(notificationId);
+  return { authorized: true };
+}
+
+export async function closeAccessInvitation(
+  actor: InvitationActor,
+  id: string,
+  operation: "REJECT" | "REVOKE",
+  reasonValue: unknown,
+) {
+  uuid(id);
+  const reason = text(reasonValue, 400, 3);
+  return serializable(async (tx) => {
+    const { full } = await invitationActor(
+      actor.userId,
+      actor.sessionToken,
+      tx,
+    );
+    const row = ownable(
+      await tx.accessInvitation.findUnique({ where: { id } }),
+      actor,
+      full,
+    );
+    if (row.status === "REVOKED" && operation === "REVOKE")
+      return { revoked: true };
+    if (row.status === "REJECTED" && operation === "REJECT")
+      return { rejected: true };
+    if (
+      !["PENDING_ACCEPTANCE", "PENDING_ASSIGNMENT", "ACTIVE"].includes(
+        row.status,
+      )
+    )
+      conflict();
+    if (
+      !full &&
+      row.proposedRoleKey !== "COMMERCIAL" &&
+      (row.status === "ACTIVE" || operation === "REJECT")
+    )
+      throw new AccessInvitationError("ROLE_NOT_DELEGATED", 403);
+    if (operation === "REJECT" && row.status !== "PENDING_ASSIGNMENT")
+      conflict();
+    if (row.status === "ACTIVE") {
+      if (operation !== "REVOKE" || !row.assignmentId) conflict();
+      await revokeAdminRoleAssignmentInTransaction(
+        {
+          actorUserId: actor.userId,
+          actorSessionToken: actor.sessionToken,
+          assignmentId: row.assignmentId,
+        },
+        tx,
+      );
+    }
+    const updated = await tx.accessInvitation.update({
+      where: { id },
+      data: {
+        status: operation === "REJECT" ? "REJECTED" : "REVOKED",
+        activeSlot: null,
+        tokenHash: null,
+        revokedAt: operation === "REVOKE" ? new Date() : null,
+        decidedAt: new Date(),
+        reviewedByUserId: actor.userId,
+        decisionReason: reason,
+      },
+    });
+    if (row.status !== "ACTIVE")
+      await audit(
+        tx,
+        actor.userId,
+        operation === "REJECT"
+          ? "ACCESS_INVITATION_REJECTED"
+          : "ACCESS_INVITATION_REVOKED",
+        updated,
+      );
+    return operation === "REJECT" ? { rejected: true } : { revoked: true };
+  });
+}
+
+/** In-app is transactional. Mail is a deduplicated, retryable local-only side effect. */
+export async function dispatchAccessRelease(notificationId: string) {
+  const notice = await db.userNotification.findUnique({
+    where: { id: notificationId },
+    include: { user: true, invitation: true },
+  });
+  if (
+    !notice ||
+    notice.kind !== "ACCESS_APPROVED" ||
+    ["CAPTURED", "NOT_REQUESTED"].includes(notice.emailStatus)
+  )
+    return;
+  if (notice.invitation.status !== "ACTIVE" || !notice.invitation.assignmentId)
+    return;
+  try {
+    const url = new URL("/login", invitationBaseUrl()).toString();
+    await sendPlatformEmail({
+      to: notice.user.email,
+      subject: "Seu perfil foi autorizado — PAP Saúde",
+      text: `Uma autorização de perfil foi registrada na sua conta PAP Saúde. Entre em ${url} para consultar a situação atual e concluir a verificação de segurança exigida. A autorização de perfil não ativa UBS nem concede acesso clínico fora do escopo autorizado.`,
+      html: `<html lang="pt-BR"><body><h1>PAP Saúde</h1><p>Uma autorização de perfil foi registrada na sua conta.</p><p><a href="${url}">Consultar meu acesso</a></p><p>Entre para consultar a situação atual e concluir a verificação de segurança exigida. Perfil autorizado não significa UBS ativada.</p></body></html>`,
+      messageId: notice.dedupeKey,
+      eventTime: notice.createdAt.toISOString(),
+      localDemoOnly: true,
+    });
+    await db.userNotification.update({
+      where: { id: notice.id },
+      data: { emailStatus: "CAPTURED" },
+    });
+  } catch {
+    await db.userNotification.updateMany({
+      where: { id: notice.id, emailStatus: { not: "CAPTURED" } },
+      data: { emailStatus: "FAILED" },
+    });
+  }
+}
+
+export async function retryAccessRelease(actor: InvitationActor, id: string) {
+  uuid(id);
+  const notice = await serializable(async (tx) => {
+    const { full } = await invitationActor(
+      actor.userId,
+      actor.sessionToken,
+      tx,
+    );
+    const row = ownable(
+      await tx.accessInvitation.findUnique({ where: { id } }),
+      actor,
+      full,
+    );
+    if (
+      !row.userId ||
+      !row.assignmentId ||
+      row.status !== "ACTIVE" ||
+      (!full && row.proposedRoleKey !== "COMMERCIAL")
+    )
+      conflict();
+    const assignment = await tx.roleAssignment.findUnique({
+      where: { id: row.assignmentId },
+      include: { role: true },
+    });
+    if (!assignment) conflict();
+    await requireRoleMutation(
+      actor.userId,
+      actor.sessionToken,
+      row.userId,
+      assignment.role.key,
+      assignment.organizationId,
+      tx,
+    );
+    return tx.userNotification.findUnique({
+      where: { dedupeKey: `access/${row.id}/ACCESS_APPROVED` },
+    });
+  });
+  if (!notice) conflict();
+  await dispatchAccessRelease(notice.id);
+  return { notificationId: notice.id };
+}
+
+export async function ownAccessStatus(userId: string) {
+  return serializable(async (tx) => {
+    const row = await tx.accessInvitation.findFirst({
+      where: { userId },
+      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
+      select: {
+        status: true,
+        proposedRoleKey: true,
+        acceptedAt: true,
+        decidedAt: true,
+        assignment: {
+          select: {
+            userId: true,
+            role: { select: { key: true, system: true } },
+          },
+        },
+      },
+    });
+    const profile = await getEffectiveAccessProfile(userId, tx);
+    if (!row || !profile) return null;
+    const assigned =
+      row.assignment &&
+      row.assignment.userId === userId &&
+      row.assignment.role.system &&
+      row.assignment.role.key === row.proposedRoleKey;
+    const status =
+      row.status === "ACTIVE" && !assigned ? "REVOKED" : row.status;
+    // Deliberately omit email of inviter, reviewer, decision reason, tenant IDs,
+    // role assignments, delivery/provider details and any internal audit data.
+    return {
+      user: {
+        displayName: profile.user.displayName,
+        email: profile.user.email,
+      },
+      status,
+      acceptedAt: row.acceptedAt,
+      decidedAt: row.decidedAt,
+      canContinue: !!(
+        profile.canAccessAdmin ||
+        profile.permissions.includes("patient.read") ||
+        profile.permissions.includes("commercial.read")
+      ),
+    };
+  });
+}
```

### src/server/notifications/notification.service.ts

```diff
diff --git a/src/server/notifications/notification.service.ts b/src/server/notifications/notification.service.ts
new file mode 100644
index 0000000..124cc08
--- /dev/null
+++ b/src/server/notifications/notification.service.ts
@@ -0,0 +1,80 @@
+import type { Prisma } from "@prisma/client";
+import { db } from "@/server/db/client";
+
+export async function createAccessNotification(
+  tx: Prisma.TransactionClient,
+  userId: string,
+  invitationId: string,
+  kind: "ACCESS_APPROVED" | "ACCESS_REVOKED",
+  actorUserId = userId,
+) {
+  const dedupeKey = `access/${invitationId}/${kind}`;
+  const existing = await tx.userNotification.findUnique({
+    where: { dedupeKey },
+  });
+  if (existing) return existing;
+  const result = await tx.userNotification.create({
+    data: {
+      userId,
+      invitationId,
+      kind,
+      dedupeKey,
+      emailStatus: kind === "ACCESS_APPROVED" ? "PENDING" : "NOT_REQUESTED",
+    },
+  });
+  await tx.auditEvent.create({
+    data: {
+      actorUserId,
+      action: "ACCESS_NOTIFICATION_CREATED",
+      resourceType: "USER_NOTIFICATION",
+      resourceId: result.id,
+      after: { id: result.id, kind },
+    },
+  });
+  return result;
+}
+
+export async function ownNotifications(userId: string) {
+  const rows = await db.userNotification.findMany({
+    where: { userId },
+    select: { id: true, kind: true, readAt: true, createdAt: true },
+    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
+    take: 30,
+  });
+  return rows.map((row) => ({
+    ...row,
+    title:
+      row.kind === "ACCESS_APPROVED"
+        ? "Seu acesso foi liberado"
+        : "Seu perfil de acesso foi revogado",
+    message:
+      row.kind === "ACCESS_APPROVED"
+        ? "A autorização foi registrada. Entre para continuar com seu perfil e a verificação de segurança exigida."
+        : "Você pode consultar sua situação e gerenciar a segurança da sua conta.",
+    href: row.kind === "ACCESS_APPROVED" ? "/login" : "/aguardando-autorizacao",
+  }));
+}
+
+export async function markOwnNotificationRead(userId: string, id: string) {
+  const result = await db.$transaction(async (tx) => {
+    const row = await tx.userNotification.findFirst({ where: { id, userId } });
+    if (!row) return false;
+    if (!row.readAt) {
+      const changed = await tx.userNotification.updateMany({
+        where: { id, userId, readAt: null },
+        data: { readAt: new Date() },
+      });
+      if (changed.count)
+        await tx.auditEvent.create({
+          data: {
+            actorUserId: userId,
+            action: "ACCESS_NOTIFICATION_READ",
+            resourceType: "USER_NOTIFICATION",
+            resourceId: id,
+          },
+        });
+    }
+    return true;
+  });
+  return result;
+}
```

## Leitura das evidências e riscos

Relatório completo: [RELATORIO-MISSAO-04-SLICE-C.md](RELATORIO-MISSAO-04-SLICE-C.md). Logs preservam falha Beta inicial e falha da asserção legada C, seguidas de execuções integrais finais. PASS: regressões funcionais, estáticas, Docker, Trivy e auditorias prod/migrator. FAIL residual: auditoria dev (9 HIGH + 1 MODERATE); NOT RUN: CI C remoto, laboratório real, envio externo, C browser em produção. Não se usa CI histórico como evidência C. Nenhuma aprovação de merge/deploy.
