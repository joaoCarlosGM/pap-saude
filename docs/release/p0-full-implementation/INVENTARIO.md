# Inventário de versionamento

Base: `e3c0cbc18ffa98be64470a7153b1e798a00fbe14`. F seleciona exclusivamente os 60 caminhos abaixo. E2 e etapas anteriores já estão em commits próprios. Nenhum log bruto, banco, e-mail capturado, cookie ou config local integra o commit.

```text
.github/workflows/ci.yml
AGENTS.md
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/HOMOLOGACAO-WSL.md
docs/release/p0-full-implementation/INVENTARIO.md
docs/release/p0-full-implementation/VALIDACAO.md
docs/release/p0-full-implementation/evidence/dependency-audit.json
docs/release/p0-full-implementation/evidence/source-manifest.json
docs/release/p0-full-implementation/evidence/validation.json
package-lock.json
package.json
scripts/test-f04-db-invariants.sh
scripts/test-p0-full.sh
src/app/(admin)/admin/convites-globais/page.tsx
src/app/(admin)/admin/rede/[organizationId]/page.tsx
src/app/(admin)/admin/solicitacoes/page.tsx
src/app/(auth)/primeiros-passos/page.tsx
src/app/api/admin/access-invitations/route.ts
src/app/api/admin/beta/requests/route.ts
src/app/api/auth/password/reset/route.ts
src/components/admin/AccessInvitationsClient.tsx
src/components/admin/AdminSidebar.tsx
src/components/admin/BetaRequestsClient.tsx
src/components/auth/AuthAccessShell.tsx
src/components/auth/LoginSecurity.tsx
src/components/auth/LoginVerification.tsx
src/server/access-invitations/access-invitation.service.ts
src/server/admin-beta/requests.service.ts
src/server/admin-pending/network.service.ts
src/server/admin-pending/pending.service.ts
src/server/auth/captcha-glyphs.ts
src/server/auth/login-captcha.service.ts
src/server/auth/login-navigation.service.ts
src/server/clinical-dashboard/clinical-dashboard.service.ts
src/server/notifications/notification.service.ts
tests/auth/http-auth.integration.test.ts
tests/auth/http-mfa.integration.test.ts
tests/clinical/clinical-api-ui.integration.test.ts
tests/first-access/account-security.spec.ts
tests/first-access/browser.spec.ts
tests/first-access/login-navigation.test.ts
tests/first-access/security.test.ts
tests/helpers/browser-login-verification.ts
tests/helpers/login-verification.ts
tests/helpers/verified-session.ts
tests/mission04-b/governance.spec.ts
tests/mission04-c/fixtures.ts
tests/mission04-c/invitations.test.ts
tests/mission04-d/recovery.spec.ts
tests/mission04-e/access.test.ts
tests/mission04-e/boundaries.spec.ts
tests/p0-full/auth-ui.test.ts
tests/p0-full/operational-data.test.ts
tests/p0-full/pending.test.ts
tests/p0-full/reset-http.test.ts
tests/p0-full/security.test.ts
tests/p0-remediation/clinical-registration.integration.test.ts
tests/p0-remediation/registration-runtime.integration.test.ts
tests/p0-remediation/registration.spec.ts
tests/release/mfa-block-ui.spec.ts
```

Fonte completa desde a base (incluindo commits anteriores), com SHA-256 por caminho: `evidence/source-manifest.json`. O SHA F deve ser lido do commit que contém este inventário; o fingerprint não depende de SHA autorreferente.

## Correção pós-CI F — staging seletivo separado

Somente contrato de teste e documentação; seis caminhos:

```text
tests/first-access/login-navigation.spec.ts
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/VALIDACAO.md
docs/release/p0-full-implementation/evidence/validation.json
docs/release/p0-full-implementation/evidence/source-manifest.json
docs/release/p0-full-implementation/INVENTARIO.md
```

## Correção dirigida CAPTCHA — 12 caminhos

```text
src/server/auth/login-captcha.service.ts
tests/first-access/browser-fixtures.ts
tests/first-access/captcha-client-limits.test.ts
tests/first-access/playwright.config.ts
tests/first-access/browser.spec.ts
tests/first-access/account-security.spec.ts
tests/first-access/login-navigation.spec.ts
docs/release/p0-full-implementation/CORRECAO-CI-CAPTCHA.md
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/evidence/validation.json
docs/release/p0-full-implementation/evidence/source-manifest.json
docs/release/p0-full-implementation/INVENTARIO.md
```

## Correção dirigida Slice B — staging seletivo

```text
tests/mission04-b/governance.test.ts
docs/release/p0-full-implementation/CORRECAO-CI-SLICE-B.md
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/INVENTARIO.md
docs/release/p0-full-implementation/evidence/validation.json
docs/release/p0-full-implementation/evidence/source-manifest.json
```

## Compatibilidade de proxy B — staging

```text
tests/first-access/playwright.config.ts
docs/release/p0-full-implementation/CORRECAO-CI-SLICE-B.md
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/INVENTARIO.md
docs/release/p0-full-implementation/evidence/validation.json
docs/release/p0-full-implementation/evidence/source-manifest.json
```

## C browser — staging

```text
tests/mission04-c/journey.spec.ts
docs/release/p0-full-implementation/CORRECAO-CI-SLICE-C.md
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/INVENTARIO.md
docs/release/p0-full-implementation/evidence/validation.json
docs/release/p0-full-implementation/evidence/source-manifest.json
```

## D browser — staging

```text
tests/mission04-d/recovery.spec.ts
docs/release/p0-full-implementation/CORRECAO-CI-SLICE-D.md
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/INVENTARIO.md
docs/release/p0-full-implementation/evidence/validation.json
docs/release/p0-full-implementation/evidence/source-manifest.json
```

## E — staging seletivo

```text
src/components/demo/DemoRegistrationWizard.tsx
tests/mission04-e/journey.spec.ts
tests/mission04-e/boundaries.spec.ts
docs/release/p0-full-implementation/CORRECAO-CI-SLICE-E.md
docs/release/p0-full-implementation/CHECKPOINT.md
docs/release/p0-full-implementation/INVENTARIO.md
docs/release/p0-full-implementation/evidence/validation.json
docs/release/p0-full-implementation/evidence/source-manifest.json
```
