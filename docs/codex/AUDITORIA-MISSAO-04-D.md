# Auditoria final — Missão 04 / Slice D

Base `68c6c2ac6785f08b75663aa59151bdc146a0bb20`; branch `feature/ux-iam-convites-vitrine-email`. Index vazio, sem commit/push. PR #5 aberto/draft. Nenhum arquivo E. Laboratório manual não acessado.

## Estado Git da entrega inicial (histórico preservado)

```text
$ git status --short --untracked-files=all
 M .github/workflows/ci.yml
 M package.json
 M prisma/schema.prisma
 M scripts/security/scan-f04-images.sh
 M src/app/(auth)/convite/page.tsx
 M src/app/api/invitations/accept/route.ts
 M src/components/admin/AccessInvitationsClient.tsx
 M src/components/admin/BetaDashboardClient.tsx
 M src/components/admin/BetaInvitationsClient.tsx
 M src/components/auth/InvitationActivation.tsx
 M src/server/access-invitations/access-invitation.service.ts
 M src/server/admin/admin-organizations.service.ts
 M src/server/auth/password-security.service.ts
 M src/server/email/email.service.ts
 M src/server/email/local-demo-mail.ts
 M src/server/email/password-reset-email.service.ts
 M src/server/invitations/invitation.service.ts
 M tests/admin-beta/email.test.ts
 M tests/admin-beta/journey.integration.test.ts
 M tests/mission04-c/legacy-upgrade.test.ts
?? docs/codex/AUDITORIA-MISSAO-04-D.md
?? docs/codex/HOMOLOGACAO-EMAILS-SLICE-D.md
?? docs/codex/RELATORIO-MISSAO-04-SLICE-D.md
?? docs/evidence/missao-04-d/cleanup.json
?? docs/evidence/missao-04-d/dependency-audits.json
?? docs/evidence/missao-04-d/email-1440-dark.png
?? docs/evidence/missao-04-d/email-1440-light.png
?? docs/evidence/missao-04-d/email-320-dark.png
?? docs/evidence/missao-04-d/email-320-light.png
?? docs/evidence/missao-04-d/email-768-dark.png
?? docs/evidence/missao-04-d/email-768-light.png
?? docs/evidence/missao-04-d/execution.log
?? docs/evidence/missao-04-d/images.json
?? docs/evidence/missao-04-d/legacy-upgrade.json
?? docs/evidence/missao-04-d/pr5.json
?? docs/evidence/missao-04-d/regressao-c-fila-1440-light.png
?? docs/evidence/missao-04-d/regressao-c-fila-320-dark.png
?? docs/evidence/missao-04-d/regressao-c-fila-768-light.png
?? docs/evidence/missao-04-d/regressao-c-performance.json
?? docs/evidence/missao-04-d/validation.json
?? prisma/migrations/20261023060000_mission04_transactional_email/migration.sql
?? scripts/test-mission04-d.sh
?? src/app/api/email/resend/webhook/route.ts
?? src/lib/email-delivery.ts
?? src/server/email/delivery-projection.ts
?? src/server/email/email-config.ts
?? src/server/email/organization-activation-email.service.ts
?? src/server/email/resend-webhook.service.ts
?? src/server/email/templates.ts
?? tests/mission04-d/email.test.ts
?? tests/mission04-d/legacy-upgrade.test.ts
?? tests/mission04-d/mail.spec.ts
?? tests/mission04-d/playwright.config.ts
```

```text
$ git diff --stat
 .github/workflows/ci.yml                           |   3 +
 package.json                                       |   4 +-
 prisma/schema.prisma                               |  47 ++++++
 scripts/security/scan-f04-images.sh                |   1 +
 src/app/(auth)/convite/page.tsx                    |   2 +
 src/app/api/invitations/accept/route.ts            |   6 +
 src/components/admin/AccessInvitationsClient.tsx   |  24 +--
 src/components/admin/BetaDashboardClient.tsx       |   9 +-
 src/components/admin/BetaInvitationsClient.tsx     |   6 +-
 src/components/auth/InvitationActivation.tsx       |  25 +++-
 .../access-invitation.service.ts                   |  77 ++++++----
 src/server/admin/admin-organizations.service.ts    |   8 +-
 src/server/auth/password-security.service.ts       |  36 +++--
 src/server/email/email.service.ts                  | 163 ++++++++++-----------
 src/server/email/local-demo-mail.ts                |  20 ++-
 src/server/email/password-reset-email.service.ts   |  31 ++--
 src/server/invitations/invitation.service.ts       |   6 +-
 tests/admin-beta/email.test.ts                     |   6 +-
 tests/admin-beta/journey.integration.test.ts       |  13 +-
 tests/mission04-c/legacy-upgrade.test.ts           |   2 +-
 20 files changed, 301 insertions(+), 188 deletions(-)
```

`git diff --stat` enumera somente arquivos rastreados; novos arquivos constam no inventário abaixo.

```text
$ git diff --check
[exit 0, sem saída]
$ git diff --cached --name-status
[sem saída; index vazio]
```

## Contratos e evidências

- Catálogo/permissões/bootstrap IAM, MFA administrativo, primeiro acesso, serviço de atribuição/revogação e lockfile: bytes idênticos ao HEAD. Hashes em `validation.json`. Todas as 32 entradas históricas de migrations preservadas.
- PAP_MANAGER permanece sem ativação de UBS ou elevação de papel. Proposta aceita permanece imutável. Controle MFA/IAM dentro das transações originais preservado; D acrescenta somente metadados e efeitos de e-mail autorizados.
- Tests D na entrega inicial: 27 Node + 6 navegador/30 combinações de templates; na revisão final: 32 Node + 8 navegador. Regressores B/C cobrem HTML/RSC, APIs, revogação entre guard/tx, consentimento exato e isolamento clínico. Resultados/contagens efetivas no relatório e `validation.json`.
- Teste C→D usa senha/TOTP e sessão reais sintéticos, snapshots exatos, backup em memória, restore e roll-forward, sem banco manual. `legacy-upgrade.json` guarda apenas booleanos, nenhum segredo.
- Nenhum envio externo. Fetch Resend simulado integralmente; rede negada por padrão no teste D. Webhook testado com HMAC/secret efêmeros em memória e payload sintético. CAPTURED, ACCEPTED_BY_PROVIDER, DELIVERED, BOUNCED, COMPLAINED e FAILED não são confundidos.
- Auditoria completa de dependências tem FAIL documentado: seis MODERATE dev na entrega inicial; revisão final: uma HIGH + uma MODERATE dev. Produção/migrator zero; lockfile inalterado. Trivy final web/migrator exit 0. Logs incluem falhas iniciais e reexecuções; nenhuma exceção ao guard SQL ou supressão de scanner.
- Arquivos gerados de missões anteriores foram arquivados em `.test-audit/mission04-d/generated` e retornados aos bytes do HEAD, somente nos caminhos conhecidos gerados pelas suítes. Capturas atuais alteradas da fila C ficam na evidência D; o histórico C não é substituído. Título automático de AGENTS restaurado byte a byte, sem remoção de instrução.
- `execution.log` passou scan de bearer em URL, chaves privadas, credenciais/sessões serializadas e hash de senha. Screenshots de e-mail contêm somente endereço público fictício example.test/login e nome demonstrativo; capturas da fila usam máscaras. Validação externa e compatibilidade legada são limitações expressas; a enumeração temporal direta foi corrigida na revisão final, sem promessa de tempo constante global. Esses limites estão expressos no relatório, não provas de produção.

## Revisão final — estado Git completo atual

Data: 2026-10-23T19:05:53.180533-03:00. HEAD `68c6c2ac6785f08b75663aa59151bdc146a0bb20`; branch `feature/ux-iam-convites-vitrine-email`; index vazio. **66 caminhos (23 modificados, 43 novos).** Os snapshots anteriores acima são históricos. Esta seção e o inventário abaixo são os vigentes.

`git status --short --untracked-files=all`:

```text
 M .github/workflows/ci.yml
 M package.json
 M prisma/schema.prisma
 M scripts/security/scan-f04-images.sh
 M src/app/(auth)/convite/page.tsx
 M src/app/api/auth/password/forgot/route.ts
 M src/app/api/invitations/accept/route.ts
 M src/components/admin/AccessInvitationsClient.tsx
 M src/components/admin/BetaDashboardClient.tsx
 M src/components/admin/BetaInvitationsClient.tsx
 M src/components/auth/InvitationActivation.tsx
 M src/components/auth/PasswordRecoveryClient.tsx
 M src/server/access-invitations/access-invitation.service.ts
 M src/server/admin/admin-organizations.service.ts
 M src/server/auth/password-security.service.ts
 M src/server/email/email.service.ts
 M src/server/email/local-demo-mail.ts
 M src/server/email/password-reset-email.service.ts
 M src/server/invitations/invitation.service.ts
 M tests/admin-beta/email.test.ts
 M tests/admin-beta/journey.integration.test.ts
 M tests/auth/f04-access-trust.integration.test.ts
 M tests/mission04-c/legacy-upgrade.test.ts
?? docs/codex/AUDITORIA-MISSAO-04-D.md
?? docs/codex/HOMOLOGACAO-EMAILS-SLICE-D.md
?? docs/codex/RELATORIO-MISSAO-04-SLICE-D.md
?? docs/evidence/missao-04-d/cleanup.json
?? docs/evidence/missao-04-d/dependency-audits.json
?? docs/evidence/missao-04-d/email-1440-dark.png
?? docs/evidence/missao-04-d/email-1440-light.png
?? docs/evidence/missao-04-d/email-320-dark.png
?? docs/evidence/missao-04-d/email-320-light.png
?? docs/evidence/missao-04-d/email-768-dark.png
?? docs/evidence/missao-04-d/email-768-light.png
?? docs/evidence/missao-04-d/execution.log
?? docs/evidence/missao-04-d/images.json
?? docs/evidence/missao-04-d/legacy-upgrade.json
?? docs/evidence/missao-04-d/pr5.json
?? docs/evidence/missao-04-d/regressao-c-fila-1440-light.png
?? docs/evidence/missao-04-d/regressao-c-fila-320-dark.png
?? docs/evidence/missao-04-d/regressao-c-fila-768-light.png
?? docs/evidence/missao-04-d/regressao-c-performance.json
?? docs/evidence/missao-04-d/revisao-final/cleanup.json
?? docs/evidence/missao-04-d/revisao-final/dependency-audits.json
?? docs/evidence/missao-04-d/revisao-final/diff.txt
?? docs/evidence/missao-04-d/revisao-final/execution.log
?? docs/evidence/missao-04-d/revisao-final/images.json
?? docs/evidence/missao-04-d/revisao-final/integrity.json
?? docs/evidence/missao-04-d/revisao-final/pr5.json
?? docs/evidence/missao-04-d/revisao-final/validation.json
?? docs/evidence/missao-04-d/validation.json
?? prisma/migrations/20261023060000_mission04_transactional_email/migration.sql
?? scripts/test-mission04-d.sh
?? src/app/api/email/resend/webhook/route.ts
?? src/lib/email-delivery.ts
?? src/server/auth/password-recovery-http.ts
?? src/server/email/delivery-projection.ts
?? src/server/email/email-config.ts
?? src/server/email/organization-activation-email.service.ts
?? src/server/email/resend-webhook.service.ts
?? src/server/email/templates.ts
?? tests/mission04-d/email.test.ts
?? tests/mission04-d/legacy-upgrade.test.ts
?? tests/mission04-d/mail.spec.ts
?? tests/mission04-d/playwright.config.ts
?? tests/mission04-d/recovery.spec.ts
```

`git diff --stat` (somente tracked; os 43 novos estão na lista completa):

```text
 .github/workflows/ci.yml                           |   3 +
 package.json                                       |   4 +-
 prisma/schema.prisma                               |  47 ++++++
 scripts/security/scan-f04-images.sh                |   1 +
 src/app/(auth)/convite/page.tsx                    |   2 +
 src/app/api/auth/password/forgot/route.ts          |  23 ++-
 src/app/api/invitations/accept/route.ts            |   6 +
 src/components/admin/AccessInvitationsClient.tsx   |  24 +--
 src/components/admin/BetaDashboardClient.tsx       |   9 +-
 src/components/admin/BetaInvitationsClient.tsx     |   6 +-
 src/components/auth/InvitationActivation.tsx       |  25 +++-
 src/components/auth/PasswordRecoveryClient.tsx     |   8 +-
 .../access-invitation.service.ts                   |  77 ++++++----
 src/server/admin/admin-organizations.service.ts    |   8 +-
 src/server/auth/password-security.service.ts       |  36 +++--
 src/server/email/email.service.ts                  | 163 ++++++++++-----------
 src/server/email/local-demo-mail.ts                |  20 ++-
 src/server/email/password-reset-email.service.ts   |  31 ++--
 src/server/invitations/invitation.service.ts       |   8 +-
 tests/admin-beta/email.test.ts                     |   6 +-
 tests/admin-beta/journey.integration.test.ts       |  13 +-
 tests/auth/f04-access-trust.integration.test.ts    |   6 +-
 tests/mission04-c/legacy-upgrade.test.ts           |   2 +-
 23 files changed, 322 insertions(+), 206 deletions(-)
```

`git diff --check`: exit 0, saída vazia. `git diff --cached --name-status`: saída vazia. Nenhum staging/commit/push.

## Inventário exato / staging seletivo futuro

**66 caminhos. Comando somente para revisão; NÃO EXECUTADO. Requer nova aprovação explícita.**

```bash
git add -- \
  .github/workflows/ci.yml \
  docs/codex/AUDITORIA-MISSAO-04-D.md \
  docs/codex/HOMOLOGACAO-EMAILS-SLICE-D.md \
  docs/codex/RELATORIO-MISSAO-04-SLICE-D.md \
  docs/evidence/missao-04-d/cleanup.json \
  docs/evidence/missao-04-d/dependency-audits.json \
  docs/evidence/missao-04-d/email-1440-dark.png \
  docs/evidence/missao-04-d/email-1440-light.png \
  docs/evidence/missao-04-d/email-320-dark.png \
  docs/evidence/missao-04-d/email-320-light.png \
  docs/evidence/missao-04-d/email-768-dark.png \
  docs/evidence/missao-04-d/email-768-light.png \
  docs/evidence/missao-04-d/execution.log \
  docs/evidence/missao-04-d/images.json \
  docs/evidence/missao-04-d/legacy-upgrade.json \
  docs/evidence/missao-04-d/pr5.json \
  docs/evidence/missao-04-d/regressao-c-fila-1440-light.png \
  docs/evidence/missao-04-d/regressao-c-fila-320-dark.png \
  docs/evidence/missao-04-d/regressao-c-fila-768-light.png \
  docs/evidence/missao-04-d/regressao-c-performance.json \
  docs/evidence/missao-04-d/revisao-final/cleanup.json \
  docs/evidence/missao-04-d/revisao-final/dependency-audits.json \
  docs/evidence/missao-04-d/revisao-final/diff.txt \
  docs/evidence/missao-04-d/revisao-final/execution.log \
  docs/evidence/missao-04-d/revisao-final/images.json \
  docs/evidence/missao-04-d/revisao-final/integrity.json \
  docs/evidence/missao-04-d/revisao-final/pr5.json \
  docs/evidence/missao-04-d/revisao-final/validation.json \
  docs/evidence/missao-04-d/validation.json \
  package.json \
  prisma/migrations/20261023060000_mission04_transactional_email/migration.sql \
  prisma/schema.prisma \
  scripts/security/scan-f04-images.sh \
  scripts/test-mission04-d.sh \
  'src/app/(auth)/convite/page.tsx' \
  src/app/api/auth/password/forgot/route.ts \
  src/app/api/email/resend/webhook/route.ts \
  src/app/api/invitations/accept/route.ts \
  src/components/admin/AccessInvitationsClient.tsx \
  src/components/admin/BetaDashboardClient.tsx \
  src/components/admin/BetaInvitationsClient.tsx \
  src/components/auth/InvitationActivation.tsx \
  src/components/auth/PasswordRecoveryClient.tsx \
  src/lib/email-delivery.ts \
  src/server/access-invitations/access-invitation.service.ts \
  src/server/admin/admin-organizations.service.ts \
  src/server/auth/password-recovery-http.ts \
  src/server/auth/password-security.service.ts \
  src/server/email/delivery-projection.ts \
  src/server/email/email-config.ts \
  src/server/email/email.service.ts \
  src/server/email/local-demo-mail.ts \
  src/server/email/organization-activation-email.service.ts \
  src/server/email/password-reset-email.service.ts \
  src/server/email/resend-webhook.service.ts \
  src/server/email/templates.ts \
  src/server/invitations/invitation.service.ts \
  tests/admin-beta/email.test.ts \
  tests/admin-beta/journey.integration.test.ts \
  tests/auth/f04-access-trust.integration.test.ts \
  tests/mission04-c/legacy-upgrade.test.ts \
  tests/mission04-d/email.test.ts \
  tests/mission04-d/legacy-upgrade.test.ts \
  tests/mission04-d/mail.spec.ts \
  tests/mission04-d/playwright.config.ts \
  tests/mission04-d/recovery.spec.ts
```

## Diff completo vigente de código/configuração/testes

[diff.txt](../evidence/missao-04-d/revisao-final/diff.txt) contém todas as alterações dos 38 arquivos de código/configuração/testes em diff de contexto zero, incluindo novos arquivos completos, migration SQL, Prisma, autorização, provider, política do reset e testes. Sem staging. Migração D idêntica ao hash da entrega inicial; todas as migrations históricas e contratos IAM/MFA protegidos idênticos ao HEAD.

[Relatório final e matriz de resultados](RELATORIO-MISSAO-04-SLICE-D.md#fechamento-técnico-do-d--revisão-solicitada-pelo-operador), [comandos e hashes finais](../evidence/missao-04-d/revisao-final/validation.json), [integridade e preservação](../evidence/missao-04-d/revisao-final/integrity.json).

### Evidências específicas

- Enumeração: testes de ordem não iniciam emissão antes da resposta; Next HTTP real devolve 202 sob lock ACCESS EXCLUSIVE em beta_abuse_buckets para identidade existente, desconhecida, inativa e repetida. Nenhum token é criado enquanto bloqueado; após liberar, exatamente três para a identidade. O teste Node complementar de consumo preserva o MFA. Log d-final.log: 32 Node + 8 navegador, zero falhas.
- Sigilo: DTO institucional com NODE_ENV=production sem bearer/developmentUrl, erro assíncrono com log fixo, navegador sem token em URL/Referer/console e histórico limpo. Novos links em fragmento/POST, sem analytics externo detectado. Proxy/APM externo e links legados GET/query têm limite explícito no relatório.
- Local-demo: Resend negado por cada flag/diretório/nome de banco, mesmo com allowlists válidas. Só strings sintéticas de configuração; nenhum recurso manual acessado.
- Entrega: mock de aceite não é DELIVERED; assinatura inválida/replay/corpo excessivo negados ou deduplicados; callback conhecido antes do commit pede retry; falha/bounce/complaint não são apagados por entrega atrasada. Retry explícito mantém FAILED sem novo envio.
- MFA/IAM/isolamento: C 41+8, B 28+5, primeiro acesso 21+15, autenticação 202, F04 78, Beta 29 e F03 203 passaram nesta revisão. Essas contagens devem ser conferidas nos logs/validation.json.
- Dependências: produção/migrator zero; desenvolvimento FAIL (1 HIGH zod + 1 MODERATE ip-address), sem alteração de lockfile ou remediação automática. Ver dependency-audits.json atual, sem substituir a auditoria inicial preservada.
- A conta e o laboratório do operador não foram lidos/atualizados; a prova de upgrade usa somente identidades sintéticas em bancos descartáveis. Nenhuma garantia sobre um upgrade manual não executado é inferida disso. Sem e-mails externos, DNS/VPS, mudanças de PRs, merge ou deploy.

**Decisão de commit/push pendente do operador. CI remoto D NOT RUN. PR #5 OPEN/draft. E não iniciado.**
