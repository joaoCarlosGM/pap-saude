# Auditoria independente — Missão 04 / Slice E

Escopo auditado: somente E, sobre `5171026699d375c6eae5bd645f1fca6433eaf3f6`. Sem staging/commit/push E. PR #5 continua OPEN/draft/base develop. Fechamento D/CI em `docs/evidence/missao-04-e/d-ci.json`; o CI desse SHA não valida código E ainda não versionado.

## Matriz de autorização

| Identidade/situação | /comercial e /vitrine | Clínica real /dashboard e APIs | Administração |
|---|---|---|---|
| Anônima, expirada, revogada ou inativa | Negado no servidor | Negado | Negado |
| COMMERCIAL global com commercial.read, sem fator ativo | Permitido; MFA continua opcional | Negado, mesmo alterando URL/método/tenant | Negado |
| COMMERCIAL com fator TOTP ativo e sessão primária sem prova | Somente orientação de reautenticação; workspace/DEMO negados | Nenhum grant clínico novo | Negado |
| COMMERCIAL com prova real válida da própria sessão | Permitido, somente fixtures DEMO | Negado | Negado |
| PAP_ADMIN/PAP_MANAGER sem concessão COMMERCIAL | Sem entrada implícita | Sem entrada clínica implícita | Somente IAM/MFA e limites B/C |
| PAP_ADMIN/PAP_MANAGER + COMMERCIAL | Exige grant global/read e MFA verificado | Não recebe grant clínico | Controles anteriores preservados |
| HEALTH_UNIT_ADMIN/PROFESSIONAL sem COMMERCIAL | Negado na vitrine | Somente concessão clínica própria, membership/UBS válidos; nenhuma ampliação E | Política anterior, sem ampliação |
| Convite aceito, sem RoleAssignment autorizado | Não basta | Não basta | Não basta |
| COMMERCIAL apenas escopado, role customizada ou sem commercial.read persistida | Negado | Sem grant clínico novo | Sem grant novo |

O guard novo não atribui papéis, não ativa UBS e não consulta convites como concessão. E não altera migrations, schema, catálogo, bootstrap, serviços de atribuição/revogação, políticas MFA existentes ou guards clínicos/admin. Referências: `src/server/demo/commercial-access.service.ts`, `src/server/clinical/clinical-page-session.ts`, `src/server/admin/admin-session.service.ts`.

## Evidências adversariais concretas

`tests/mission04-e/access.test.ts`: sessão válida, ausente, expirada com timestamps compatíveis com constraints, revogada, usuário inativo, prova anterior/futura, fator renovado, sessão primária com TOTP ativo, MFA opcional sem fator, dupla concessão Admin/Comercial e falta de MFA; Admin/Manager/Professional/sem grant; grant escopado/read removido/revogado e oito recusas concorrentes após commit da revogação; cópias de fixture independentes; todas as nove seções; queries/headers tenant; CSRF/body extra/8 KiB/UUID real/tipo inválido; GET/POST/PATCH clínicos com contexto válido; snapshots reais de tabelas sintéticas inalterados.

`tests/mission04-e/journey.spec.ts`: navegador servido com role PostgreSQL separada que tem somente SELECT em tabelas de autenticação/IAM/notificações. `has_table_privilege` comprova ausência de SELECT e INSERT/UPDATE/DELETE em organizations/patients/encounters; todos os nove módulos e a simulação funcionam mesmo com membership legado sintético existente. O fingerprint de identidade/senha/MFA/sessões/grants/onboarding é idêntico antes/depois. Não se usa uma flag simulando MFA: as fixtures completam enrollment TOTP e novo login com fator real.

Nesse processo restrito, as tabelas clínicas e organizacionais estão inacessíveis por ACL, além da revisão de imports/consultas. O web server recebe URL dessa role; a fixture executa em processo separado com a conexão proprietária apenas para semear/assertar o banco descartável. Não é um proxy que inventa respostas de banco.

`tests/mission04-e/boundaries.spec.ts`: processo web separado/sequencial com conexão normal de teste para exercer os guards legados completos. HTML/RSC diretos em dashboard/pacientes/registro/atendimentos/admin redirecionam Comercial; APIs clínicas/admin recusam com 403 usando contexto organizacional sintético válido. Professional, Admin, Manager, anônimo e Comercial com MFA pendente não recebem HTML/RSC DEMO por URL direta. Revogação após página aberta nega API e submissão seguintes; reload retira vitrine. Um E2E adicional cobre sessão Comercial primária com TOTP ativo: login e vitrine terminam na orientação de MFA do Comercial, sem ciclo de redirects, sem workspace/fixtures e sem alteração do fingerprint por navegação. A API permanece 403. Logout explícito revoga somente essa sessão; outra sessão válida permanece, e novo login real com código de recuperação libera Comercial sem reabrir wizard. A orientação também passa WCAG em mobile/dark. O loop login → Comercial → login encontrado na revisão foi removido sem modificar login-navigation.service, MFA, onboarding ou guards legados. Menu mobile/Escape, CTA por Enter, retorno e logout testam fronteira da sessão.

O recibo `rsc-boundaries.json` contém 108 combinações efetivamente executadas. A prova clínica cobre PAP_ADMIN, PAP_MANAGER, COMMERCIAL, anônimo e Membership sem papel clínico. O teste preserva a validação `_rsc` do Next 16.4.2 e segue somente a normalização de hash no mesmo caminho antes de examinar a autorização. HTML exige redirect ao destino autorizado; RSC de navegação pode ter HTTP 200 após início do stream, mas exige o digest NEXT_REDIRECT com o destino exato. Prefetch sem loading pode retornar apenas árvore pública de rotas: o teste valida um formato fechado de transporte, sem render, head, props de paciente, conteúdo ou perfil. Esses casos são registrados como ROUTE_METADATA_ONLY, com destino null, e não são apresentados como acesso nem como redirect de autorização. A navegação RSC completa continua exigindo o guard. Referência: guia instalado `cdn-caching.md`, `walk-tree-with-flight-router-state.js` e `rsc-transport` da versão fixada; nenhum controle/configuração do Next foi desativado.

Uma versão inicial do teste de rotas legadas as executava no processo sem ACL organizacional: o guard legado tentou resolver o escopo e recebeu permission denied/500, sem expor dados. A prova positiva da vitrine permanece sob ACL restrita; somente a prova de comportamento normal das rotas antigas foi separada. Outra tentativa clínica sem x-organization-id retornava 400 de validação; o teste foi corrigido para enviar escopo válido e exigir 403 real. Nenhuma permissão ou regra de produção foi relaxada.

Concorrência: o E não cria operação clínica ou concessão. A autorização de leitura DEMO usa snapshot RepeatableRead; requisição em andamento pode terminar no snapshot anterior à revogação, com dados exclusivamente fictícios. Todas as novas requisições após revogação confirmada falham. B/C reexecutam os cenários de concorrência de atribuição, mudança de papel/consentimento e revogação nas transações privilegiadas anteriores.

## UX, responsividade e acessibilidade

Doze capturas de Comercial/vitrine em 320/768/1440 × claro/escuro, mais registro/curso demonstrativos e orientação de MFA, sem dados privados. WCAG 2 A/AA e 2.1 AA via axe nas doze combinações, demais módulos, dialogs, menu e troca de tema; overflow horizontal da página negado. Dialog nativo contém foco, Escape retorna ao acionador; sidebar mobile tem foco contido e fecha ao ampliar viewport; menu Comercial usa disclosure inline, Escape e foco de retorno. Progresso de curso é somente memória e desaparece no reload; registro simulado retorna persisted:false. Chat usa texto pré-definido e nenhum provider. Downloads de protocolo estão desabilitados na demo.

A navegação compartilha os componentes clínicos existentes. O CSS novo é escopado às raízes Comercial/DEMO e o banner de cursos usa CSS module compartilhado, sem tema global novo. Quatro componentes legados tiveram CRLF normalizado para LF para satisfazer diff --check; comparar também `git diff --ignore-space-at-eol` para isolar alterações funcionais. Topbar/Sidebar foram parametrizados mantendo comportamento padrão clínico e guards originais.

LCP/CLS locais em `performance.json`: amostra única de Next dev, sem alegação de p75/SLA ou desempenho de produção. Chromium local 154.0.8037.57; paridade com Chromium 156 do CI não é presumida. Testes humanos de leitor de tela/Safari/Firefox e homologação do operador: NOT RUN.

## Dependências e riscos herdados

Sem atualização de dependências, override, npm audit fix ou desativação de gate. `package-lock.json` deve permanecer idêntico ao HEAD D. Next e eslint-config-next 16.4.2 exatos; React/ReactDOM 19.2.8. Auditoria atual e árvore instalada completas em `dependency-audits.json`.

| Dependência instalada | Classificação e referência oficial | Alcance e risco residual |
|---|---|---|
| zod 4.5.4 | HIGH CVSS 7,5, [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), <4.6.6 | dev:true; eslint-config-next → react-hooks/zod-validation-error e tooling shadcn/MCP. Acúmulo de erros ao validar coleções enormes pode esgotar memória. Sem import de zod em src e sem alteração dessas ferramentas; não expor tooling a entradas não confiáveis. Não mitigado por upgrade nesta missão. |
| body-parser 2.3.0 | HIGH CVSS 7,5, [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), >=2 <2.4 | dev:true, Express/MCP do shadcn. DoS por bytes finais em corpo comprimido. Não integra runtime standalone nem provider e-mail E; risco em servidor de ferramentas exposto a requisições não confiáveis. |
| undici 7.29.1 | HIGH CVSS 7,5, [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c), >=7.18 <7.30.1 | dev:true, shadcn/registry/dotenvx. Content-encoding excessivo pode derrubar cliente de ferramentas. Também há avisos EventSource e SRI moderados, preservados no JSON. |
| fast-uri 3.1.8 | MODERATE; quatro GHSA no JSON | dev:false, inclusive Prisma/Ajv; permanece nas auditorias omit-dev e migrator. Confusão de esquema/host/path URI em entradas não confiáveis. Não declarar risco somente de desenvolvimento nem zero vulnerabilidades de runtime. |
| ip-address 10.7.3 | MODERATE, [GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5) | dev:true; risco de consumo quadrático de CPU em zone ID longo de IPv6. Sem upgrade automático. |

Auditoria completa npm: FAIL esperado por **3 HIGH + 2 MODERATE**, zero CRITICAL. Gate produção omit-dev HIGH: PASS com **1 MODERATE**. Auditoria migrator isolada HIGH: PASS com **1 MODERATE**. Esses resultados são consultas atuais; contagens históricas diferentes no D não substituem esta evidência. Uma aceitação desses riscos não significa remediação. Revisar atualizações compatíveis em trabalho separado.

As duas imagens tiveram scanner exit 0 para HIGH/CRITICAL, sem ignore, exclusão de linguagem ou mudança de severidade. O Trivy emitiu advertência real de ausência de detalhes de **CVE-2026-107891** ("may be rejected"). Não foi suprimida e não se afirma que a CVE está rejeitada: a consulta oficial falhou neste ambiente; o estado público depende de validação externa. `scanner-cve-reference.json` registra a tentativa e `execution.log` preserva a advertência. PASS significa conclusão do scanner/gate conforme os dados disponíveis, sem alegar ausência de toda vulnerabilidade.

Runner de 32 GB/Docker VFS: apenas imagens D comprovadamente próprias e sem containers dependentes e IDs novos de cache próprios foram removidos. Para acomodar build/Java DB foram removidos artefatos gerados deste checkout (.next e node_modules instalados pelo npm ci desta tarefa). Dependências foram restauradas via novo npm ci/generate/typegen; E, TypeScript, lint e build reexecutados após restauração. Nenhum recurso do laboratório manual participou dessa limpeza.

## Matriz executada

| Comando executado | Resultado | Quantidade / evidência |
|---|---|---|
| `npm ci` | PASS | exit 0 |
| `npx prisma generate` | PASS | exit 0 |
| `npm run test:mission04:b:browser` | PASS | 28/28 testes + 5 E2E |
| `npm run test:mission04:d:browser` | PASS | 32/32 testes + 8 E2E |
| `npm run test:first-access:browser` | PASS | 21/21 testes + 15 E2E |
| `npm run test:auth` | PASS | 202/202 testes |
| `npm run test:admin:beta1` | PASS | 29/29 testes |
| `npm run audit:f04:operations` | PASS | 78/78 testes |
| `npm run test:f03:smart:force` | PASS | 203/203 testes |
| `npm run test:mission04:c:browser` | PASS | 41/41 testes + 8 E2E |
| `node scripts/security/guard-f04-ci-workflow.mjs` | PASS | exit 0 |
| `bash scripts/test-f04-role-separation.sh` | PASS | exit 0 |
| `npm ci` | PASS | exit 0 |
| `npx prisma generate` | PASS | exit 0 |
| `npx next typegen` | PASS | exit 0 |
| `npm run test:mission04:e:browser` | PASS | 8/8 testes + 6 E2E + 108 recibos HTML/RSC/prefetch; 15 capturas; WCAG/teclado/temas |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | exit 0 |
| `npm run build` | PASS | exit 0 |
| `git diff --check` | PASS | exit 0 |
| `docker build --add-host proxy:172.31.3.45 --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret id=build_ca,src=/usr/local/share/ca-certificates/environment-proxy-ca.crt --target runner -t pap-saude:m04-e .` | PASS | exit 0 |
| `docker build --add-host proxy:172.31.3.45 --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret id=build_ca,src=/usr/local/share/ca-certificates/environment-proxy-ca.crt --target migrator -t pap-saude-migrator:m04-e .` | PASS | exit 0 |
| `bash scripts/test-f04-migrator-image.sh pap-saude-migrator:m04-e` | PASS | exit 0 |
| `bash scripts/test-f04-web-image.sh pap-saude:m04-e pap-saude-migrator:m04-e` | PASS | exit 0 |
| `bash scripts/test-mission04-e-image.sh pap-saude:m04-e` | PASS | exit 0 |
| `bash scripts/security/scan-f04-images.sh pap-saude:m04-e pap-saude-migrator:m04-e` | PASS | exit 0 |
| `npm audit --json` | FAIL | 3 HIGH, 2 MODERATE, 0 CRITICAL |
| `npm audit --omit=dev --audit-level=high --json` | PASS | 0 HIGH, 1 MODERATE, 0 CRITICAL |
| `npm audit --prefix docker/migrator --include=dev --audit-level=high --json` | PASS | 0 HIGH, 1 MODERATE, 0 CRITICAL |
| CI remoto E (aguarda aprovação para versionamento) | NOT RUN | depende de execução/validação externa própria |
| homologação do operador (laboratório intocado) | NOT RUN | depende de execução/validação externa própria |
| Safari/Firefox/leitor de tela humano | NOT RUN | depende de execução/validação externa própria |
| envio real de e-mail/DNS/VPS/deploy (não autorizados) | NOT RUN | depende de execução/validação externa própria |
| Estado oficial de CVE-2026-107891: consulta pública indisponível | NOT RUN | depende de execução/validação externa própria |

## Diffs e estado completo

Diff de autorização e pontos de entrada, incluindo arquivos novos: `docs/evidence/missao-04-e/authorization.diff`. Schema/migrations/catálogo/bootstrap/atribuição/revogação/políticas anteriores: diff vazio, com hashes de comparação no recibo final. Estado completo, stat, diff --check e nomes adicionados/modificados: `docs/evidence/missao-04-e/review.json`. O diff --stat padrão não conta untracked; o inventário abaixo inclui todos eles.

## Inventário exato / staging seletivo futuro

**63 caminhos exatos** (modificados + adicionados/não rastreados), sem staging:

```text
.github/workflows/ci.yml
docs/codex/AUDITORIA-MISSAO-04-E.md
docs/codex/RELATORIO-MISSAO-04-SLICE-E.md
docs/evidence/missao-04-e/authorization.diff
docs/evidence/missao-04-e/comercial-1440-dark.png
docs/evidence/missao-04-e/comercial-1440-light.png
docs/evidence/missao-04-e/comercial-320-dark.png
docs/evidence/missao-04-e/comercial-320-light.png
docs/evidence/missao-04-e/comercial-768-dark.png
docs/evidence/missao-04-e/comercial-768-light.png
docs/evidence/missao-04-e/curso-simulado-dark.png
docs/evidence/missao-04-e/d-ci.json
docs/evidence/missao-04-e/dependency-audits.json
docs/evidence/missao-04-e/execution.log
docs/evidence/missao-04-e/images.json
docs/evidence/missao-04-e/initial-findings.json
docs/evidence/missao-04-e/mfa-required-dark.png
docs/evidence/missao-04-e/performance.json
docs/evidence/missao-04-e/registro-simulado-dark.png
docs/evidence/missao-04-e/review.json
docs/evidence/missao-04-e/rsc-boundaries.json
docs/evidence/missao-04-e/scanner-cve-reference.json
docs/evidence/missao-04-e/security-review.json
docs/evidence/missao-04-e/validation.json
docs/evidence/missao-04-e/vitrine-1440-dark.png
docs/evidence/missao-04-e/vitrine-1440-light.png
docs/evidence/missao-04-e/vitrine-320-dark.png
docs/evidence/missao-04-e/vitrine-320-light.png
docs/evidence/missao-04-e/vitrine-768-dark.png
docs/evidence/missao-04-e/vitrine-768-light.png
package.json
public/illustrations/pap-demo-learning.svg
scripts/test-mission04-e-image.sh
scripts/test-mission04-e.sh
src/app/(auth)/comercial/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(showcase)/vitrine/[section]/page.tsx
src/app/(showcase)/vitrine/layout.tsx
src/app/(showcase)/vitrine/page.tsx
src/app/api/vitrine/[section]/route.ts
src/components/commercial/CommercialWorkspace.tsx
src/components/dashboard/AttendanceChart.tsx
src/components/dashboard/ClinicalDashboardView.tsx
src/components/dashboard/CourseRecommendations.module.css
src/components/dashboard/CourseRecommendations.tsx
src/components/dashboard/QuickActions.tsx
src/components/dashboard/RecentAttendances.tsx
src/components/demo/DemoDialog.tsx
src/components/demo/DemoExplorer.tsx
src/components/demo/ThemeToggle.tsx
src/components/demo/workspace.css
src/components/layout/DashboardShell.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Topbar.tsx
src/components/protocolos/ProtocolCard.tsx
src/lib/demo/types.ts
src/server/demo/commercial-access.service.ts
src/server/demo/commercial-page-session.ts
src/server/demo/fixtures.ts
tests/mission04-e/access.test.ts
tests/mission04-e/boundaries.spec.ts
tests/mission04-e/journey.spec.ts
tests/mission04-e/playwright.config.ts
```

Nenhum staging foi executado. O manifesto SHA-256 final integral fica em `.test-audit/mission04-e/final-hashes.json` para comparação antes de eventual aprovação. Não usar git add . ou padrões genéricos. Não incluir evidências históricas B/C/D/A1/M03 regeneradas pelos testes; cópias foram arquivadas em área ignorada e os arquivos rastreados desses slices restaurados exatamente ao HEAD.

## Preservação e decisão

**Nenhum recurso do laboratório manual foi acessado ou alterado.** Worktree, branch de homologação, banco, volumes, configurações privadas, PAP_ADMIN, credenciais, senha, sessões e MFA do operador permanecem fora de todas as ações. Não houve conexão à VPS, alteração DNS/produção, envio externo, merge ou mudança de base das PRs. Somente recursos locais descartáveis com propriedade comprovada foram utilizados. Nenhum screenshot contém chave/TOTP, convite, link privado ou paciente real.

E aguarda revisão técnica e autorização humana para seu próprio staging/commit/push. CI remoto E e homologação manual são NOT RUN, não são substituídos por histórico. Não há autorização de produção ou de Slice F.

A conferência final também verificou whitespace de cada arquivo novo sem staging (`git diff --no-index --check`). O diff de autorização usa contexto zero para preservar um patch válido sem espaços em linhas de contexto vazias. O log público remove ANSI, URLs de banco e espaços finais de terminal; saídas brutas permanecem na área ignorada. Nenhum conteúdo funcional foi alterado nessa normalização.
