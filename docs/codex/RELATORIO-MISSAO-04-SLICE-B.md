> Complemento posterior: o achado de privacidade foi corrigido e revalidado. A auditoria atual e autossuficiente está em [AUDITORIA-FINAL-MISSAO-04-B.md](AUDITORIA-FINAL-MISSAO-04-B.md). As seções de revisão abaixo são o snapshot anterior à correção.

# Missão 04 — Slice B: governança PAP e fronteiras clínicas

**Data:** 22/10/2026 (America/Fortaleza). **Branch:** `feature/ux-iam-convites-vitrine-email`.
**Base:** `efdbbad14f508139b12abd1a4867c4f97ad1488e` (A1.1).
**Estado da revisão final:** **NO-GO para commit/push**. A auditoria encontrou exposição de configuração organizacional privada ao PAP_MANAGER (M04-B-AUDIT-01). As suítes existentes passam, mas não cobriam esse campo. Nenhum commit/push do B foi realizado; nenhuma alteração no laboratório manual.

## Gate anterior e preservação

O [CI A1.1](https://github.com/joaoCarlosGM/pap-saude/actions/runs/39713829048), no SHA acima, concluiu **SUCCESS**: `F04 security, migrations and production builds` passou; `Publish Docker images` e `Deploy to VPS` foram **SKIPPED**. Esse resultado liberou o início do B; não é validação do código B ainda não versionado. O [PR #5](https://github.com/joaoCarlosGM/pap-saude/pull/5) continua aberto, **draft**, para `develop`.

Não foram acessados ou alterados o worktree manual `~/projetos/pap-saude-onboarding`, sua branch, `.local`, conta, senha, MFA ou recursos **existentes** do operador. Não houve provisionamento/reset/migração no laboratório manual, VPS, merge, deploy ou envio real de e-mail. As suítes gerais usam somente PostgreSQL descartável próprio `pap_saude_db`, label `pap.disposable=f0410`, porta 5432 e dados sintéticos.

O harness **preexistente** `test:local-dev` cria uma cópia de teste em `/tmp/pap-local-smoke-*` e só prossegue depois de comprovar que não existem os nomes Docker reservados. Nesse daemon da nuvem ele cria/limpa seus próprios recursos sintéticos com nomes padrão (`pap-admin-beta1-local-db`, `pap-admin-beta1-local-data`, banco `pap_admin_beta1_local`, porta 15432), jamais adota recursos existentes. Suas chamadas `init`/provisionamento são exclusivamente da cópia temporária e de identidade aleatória `@synthetic.invalid`, não do worktree/conta do operador. Não executar esse harness no laboratório manual: o guard deve recusá-lo se esses recursos já existirem. `scripts/local/dev.mjs`, `policy.mjs` e `provision.ts` não foram modificados. A chave de teste é aleatória e existe apenas no ambiente dos subprocessos. Imagens e containers desta execução são locais.

## Implementação e decisões

- `PAP_MANAGER` global recebe exatamente quatro permissões: `organization.read`, `organization.request.review`, `institution.invite`, `role.assign_commercial`. Não recebe `organization.manage`, segurança de usuários, reset MFA, auditoria global, métricas institucionais, permissões clínicas ou `role.manage`.
- Somente `PAP_ADMIN` com concessões canônicas pode nomear/revogar Gerentes e executar o ciclo de vida de UBS. Foram criadas `organization.activate`, `organization.deactivate`, `organization.delete`; o legado `organization.manage` sozinho não autoriza essas operações em UBS. Municípios mantêm a política anterior de escopo; exclusão lógica exige confirmação forte.
- Os serviços de escrita de organizações, IAM e revisão validam o token da **sessão exata do ator**, usuário ativo, prazo/revogação, fator TOTP ativo e data da prova MFA. A existência de outra sessão verificada do mesmo usuário não serve como prova. Rechecagem de IAM/MFA dentro de transações serializáveis, com retry limitado. Routes derivam ator/token do cookie, nunca do payload.
- Gerente autoriza/revoga somente `COMMERCIAL`, global, em outra conta ativa elegível. Autoatribuição e alvos com outros papéis são negados. O catálogo delegado e a lista mínima de destinatários evitam conceder `user.read`/`role.read` globais ao Gerente. O seletor lista até 200 contas elegíveis; a fila global de atribuições pertence ao C.
- `COMMERCIAL` perde `organization.read` no banco e no catálogo. `commercial.read` deixa de ser entrada no AdminShell. Permissões persistidas são intersectadas com o catálogo canônico; drift não cria privilégios.
- Gerente tem MFA obrigatório por ser perfil administrativo. Profissional conserva a política existente de MFA opcional; ativação de fator continua exigindo o login com segundo fator previsto no mecanismo atual.
- Convites institucionais existentes recebem a permissão específica, mantendo unidade ativa, contato inaugural legitimado, token hash, uso único, CSRF, rate limit e auditoria. Não foram implementados convites globais/espera/notificações do C.
- A auditoria encontrou uma autoelevação por convite: Gerente poderia convidar o próprio e-mail como profissional. Emissão e aceite agora bloqueiam essa identidade e alvos com papéis protegidos. A autoridade do emissor e a elegibilidade do destinatário são rechecadas no aceite; mudanças de papel ou revogação enquanto o convite está pendente não produzem acesso clínico. Um convite negado não é consumido nem cria credencial/permissão.
- A exclusão é **lógica**, `ARCHIVED`; nome exato da organização + senha atual + TOTP fresco, usando a reautenticação existente e seu backoff/replay protection. Não há hard delete de prontuários, vínculos ou histórico. A rota PATCH antiga exige a mesma confirmação. DELETE de organização não é exposto (405).

### Máquina de estados institucional

| Origem | Decisão / ator | Destino da solicitação | Organização | Request |
|---|---|---|---|---|
| `NEW` / `CHANGES_REQUESTED` | Pedir correções, Admin/Gerente | `CHANGES_REQUESTED` | não cria | `REQUESTED` |
| `NEW` / `CHANGES_REQUESTED` | Rejeitar, Admin/Gerente | `REJECTED` | não cria | `RESOLVED` |
| `NEW` / `CHANGES_REQUESTED` | Aprovar análise/encaminhar, Admin/Gerente | `READY_FOR_ACTIVATION` | uma UBS `PENDING_VERIFICATION`, `isActive=false` | `REQUESTED` |
| `READY_FOR_ACTIVATION` | Ativar, exclusivamente Admin com MFA | `APPROVED` | a mesma UBS `ACTIVE` | `RESOLVED` |
| `APPROVED` legado / UBS ativa | Migração/bootstrap | preservado | preservada | preservado |

Repetição de encaminhamento pendente para o mesmo município e ativação concorrente não duplicam UBS/eventos. Revisões e ativação são transações distintas; o convite inaugural só é permitido depois da ativação. Solicitação de correções registra a análise/motivo; não introduz canal público de edição de dados nesta entrega.

### Fronteira clínica e navegação

O layout clínico não tinha guard próprio. Agora o layout **e cada página** do grupo `(dashboard)` exigem sessão e concessão clínica efetiva em UBS disponível. Não se confia apenas no layout: HTML, RSC, páginas de pacientes, registro, atendimentos e APIs são testados diretamente. IAM/DAL clínicos existentes continuam verificando unidade, paciente e vínculo. Query `mode=demo` e cabeçalho de organização não concedem acesso.

`PAP_ADMIN`, Gerente e Comercial não ganham acesso clínico implícito. Um papel profissional explicitamente autorizado continua sujeito à sua UBS. O destino de navegação usa o perfil efetivo, impedindo os fallbacks indiscriminados para `/dashboard`. Comercial permanece na tela de acesso restrito até os slices previstos para seu painel/vitrine; não foi iniciado o C/E. Gerente entra na fila de solicitações, sem acesso aos KPIs globais.

### Interface

Menu e ações refletem as permissões. Gerente não vê criação/ciclo de vida de UBS nem controles de segurança de terceiros; a página de papéis apresenta apenas a autorização Comercial. Admin tem encaminhamento e ativação separados e uma confirmação explícita de ativação. Exclusão lógica usa diálogo nativo com nome/senha/TOTP e limpa os campos ao fechar. Contadores clínicos são omitidos da resposta de organizações para Gerente sem `analytics.organization.read`.

Tema administrativo teal/menta com escopo próprio e superfícies escuras; não altera o tema clínico rosa. A auditoria axe encontrou e corrigiu contraste durante a animação de carregamento e tabela horizontal sem foco no mobile. Capturas sintéticas, inputs mascarados e sem QR/OTP/chaves/senhas: [desktop](../evidence/missao-04-b/manager-desktop.png), [mobile 320px](../evidence/missao-04-b/manager-mobile.png), [escuro 768px](../evidence/missao-04-b/manager-dark.png).

## Matriz de autorização e evidências

Todos os endpoints administrativos mantêm o guard MFA compartilhado; escritas mantêm CSRF/origem e auditoria. Primitivas internas de bootstrap/CLI continuam confiáveis, sem se tornarem endpoints de atribuição arbitrária.

| Papel | Permissão/escopo | Serviço responsável | Endpoint / entrada | Evidência positiva e negação |
|---|---|---|---|---|
| PAP_ADMIN | `role.manage`, global | `requireRoleMutation`, create/revoke IAM | POST `/api/admin/role-assignments`, DELETE `/[assignmentId]` | nomeação/revogação Manager, último Admin, concorrência, payload falso, sessão primária negada |
| PAP_MANAGER | `role.assign_commercial`, global restrito | `requireRoleMutation`, overview delegado | mesmos endpoints; GET `/api/admin/roles` | Commercial elegível autorizado/revogado; próprio usuário, Admin, Manager, papéis clínicos/escopo injetado negados |
| Admin / Manager | `organization.request.review`, global | `requirePapReviewer`, `reviewBetaRequest` | GET/POST `/api/admin/beta/requests` | correções, encaminhamento concorrente, uma UBS pendente, decisão ACTIVATE negada |
| PAP_ADMIN | `organization.activate/deactivate/delete`, UBS + global canônico | `mutateAdminOrganization`, `requireAdminActor` | PATCH `/api/admin/organizations/[organizationId]` | ativação concorrente única, suspensão/reativação, exclusão lógica forte; Manager/sem MFA/CSRF/expirada/revogada negados |
| Admin / Manager | `institution.invite`, organização ativa | institutional invitation policy, invitation service | Beta e `/api/admin/invitations` legado, aceite público limitado ao token | convite legítimo, pré-ativação negada, autoconvite/conta privilegiada/convite após revogação/elevação pendente negados |
| Municipal / UBS Admin | permissões anteriores, vínculo/escopo | admin-access, invitation policy, serviços existentes | rotas administrativas/institucionais anteriores | regressões F04/Beta; cross-tenant e atribuição global negados; UBS lifecycle reservado ao PAP_ADMIN |
| COMMERCIAL | somente permissões comerciais canônicas | perfil efetivo, authorization e guards existentes | Admin organizations/requests/roles/security/metrics; API clínica | respostas 403 sem organizações privadas; sem AdminShell; parâmetro demo não abre clínica |
| PROFESSIONAL | concessão clínica explícita, própria UBS | page guard + HTTP guard + DAL clínico | `/dashboard`, `/pacientes`, demais páginas clínicas, `/api/clinical/*` | sessão sem MFA obrigatório acessa própria unidade; unidade alheia negada |
| Anônimo / sem papel | sem concessão | sessões, perfil efetivo, guards | rotas Admin e HTML/RSC clínicos | 401/403/redirect seguro; nenhuma autoatribuição, dado clínico ou loop |

Eventos: `ROLE_ASSIGNED`, `ROLE_REVOKED`, `REQUEST_CHANGES`, `REQUEST_FORWARDED`, `ORGANIZATION_CREATED`, `REQUEST_ACTIVATED`, `ORGANIZATION_ACTIVATED/SUSPENDED/ARCHIVED`. Escrita junto à mutação; snapshots administrativos em allowlist, sem contatos, motivo privado, senha, OTP, token ou PHI. O histórico antigo `REQUEST_APPROVED` não é reescrito.

## Migração e preservação

Nova migration forward-only: `20261022040000_mission04_delegated_governance`. Adiciona dois valores de enum, seis permissões e o papel Manager, atualiza somente concessões IAM e remove a leitura privada do Comercial. Não escreve em usuários, credenciais, sessões, fatores MFA, memberships, organizações ativas ou solicitações aprovadas. Nenhuma migration histórica foi editada.

O teste de upgrade aplica as 29 migrations anteriores em PostgreSQL descartável, semeia o catálogo anterior e identidades reais de teste com senha Argon2, TOTP, recuperação, sessão verificada, papel profissional/vínculo, UBS ativa/solicitação aprovada e convite pendente. Compara fingerprints privados **somente por igualdade booleana**, aplica a nova SQL duas vezes e bootstrap duas vezes, comprova preservação e autentica novamente com senha/TOTP existentes. Nenhuma conta Manager é criada automaticamente. Há também preflight/backup-restauração sintéticos e teste PostgreSQL de separação runtime/migrator.

## Comandos e resultados

As evidências abaixo distinguem execução local de CI remoto. Logs transitórios ficam em `/tmp/m04-b-*`; contagens, hashes e IDs das imagens foram consolidados em [validation.json](../evidence/missao-04-b/validation.json), sem valores privados.

| Comando efetivamente executado | Resultado final | Quantidade / observação |
|---|---|---|
| `npm ci` com Node 22.23.3 | PASS | 916 pacotes; lockfile preservado |
| `npx prisma generate`, `npx next typegen` | PASS | cliente e tipos gerados |
| `npm run test:mission04:b:browser` com Node 22.23.3 | PASS | **26 Node + 4 E2E**, 0 falhas, sem skips; inclui upgrade legado |
| `npm run audit:f04:operations` com Node 22.23.3 | PASS | 78 testes Node + invariantes SQL, typecheck, lint, build; repetido após hardening de convites |
| `npm run test:admin:beta1` | PASS | 29 itens Node (inclui grupos); upgrade, jornada, MFA e inventário |
| `npm run test:auth` | PASS | 202 testes, autenticação/MFA/IAM/descoberta |
| `npm run test:f03:smart:force` | PASS | 9/9 módulos, sem cache |
| `npm run test:local-dev` com Node 22.23.3 | PASS | **4 unitários + 1 integração**, recuperação interrompida, preservação e fluxo MFA/convites; recursos próprios do harness |
| `npm run test:first-access:browser` com Node 22.23.3 | PASS | **21 itens Node (19 casos + 2 grupos) + 15 E2E**, onboarding/A1/A1.1 e MFA real; sem skips |
| `npx tsc --noEmit`, `npm run lint` | PASS | sem erros/avisos; repetido sobre o código final, incluindo a adaptação do teste local |
| `node --test tests/security/f04-ci-workflow.test.mjs`, guard CI | PASS | 2 testes, SSH sem conexão e releases fail-closed |
| `node --test tests/security/f04-migration-preflight.test.mjs` | PASS | 1 teste, aborto sem mutação e restauração sintética |
| `bash scripts/test-f04-role-separation.sh` | PASS | grants idempotentes, DML, auditoria append-only, DDL/escalada negados |
| builds Docker `runner` / `migrator` | PASS | tags locais `pap-saude:m04-b` / `pap-saude-migrator:m04-b` |
| testes funcionais das duas imagens + Trivy HIGH/CRITICAL | PASS | runtime não root/DB mínimo; migrator idempotente/aborta sem corrupção; **0 HIGH/CRITICAL em ambas** |
| `npm audit --omit=dev --audit-level=high` | PASS | **0** vulnerabilidades de produção |
| `npm audit --prefix docker/migrator --omit=dev --audit-level=high` | PASS | **0** vulnerabilidades do migrator |
| `npm audit --json` (árvore completa) | FAIL por risco herdado | **9 altas de desenvolvimento**, 0 críticas; nenhuma atualização automática |
| `git diff --check` | PASS | sem staging/commit do B |
| CI remoto do B | NOT RUN | depende de aprovação humana para commit/push; A1.1 verde não o substitui |

## Limites e riscos

- Nove vulnerabilidades altas herdadas em ferramentas de desenvolvimento: `@next/eslint-plugin-next`, `@shadcn/registry`, `@ts-morph/common`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`, `shadcn`, `ts-morph`. Sem `npm audit fix`, alterações de dependências ou lockfile. Avaliação/atualização deve ter trabalho próprio.
- CI remoto deste B, revisão humana e homologação pelo operador ainda são necessários; não se apresenta o slice como aprovado ou pronto para produção.
- Nada foi aplicado no laboratório manual. Eventual atualização exige liberação separada, inspeção de divergências, backup seguro e o mesmo procedimento in-place previsto na especificação; não repetir provisionamento ou MFA.
- Exclusão é arquivamento com preservação clínica, não apagamento físico. Convites pendentes deixam de autorizar aceite quando o emissor perde a permissão ou o alvo passa a ser protegido; exigir reemissão legítima é comportamento intencional.
- Painel Comercial/vitrine, convites globais e fila de espera, novos e-mails e auditoria completa de KPIs continuam nos slices C–F. O dashboard clínico preserva seus componentes/dados demonstrativos preexistentes; não afirma KPIs reais novos.
- Provas usam identidades sintéticas e não substituem validação institucional do contato ou testes em produção. O pipeline emite aviso de depreciação de consultas concorrentes do adapter `pg`; não houve atualização automática do adapter.

## Homologação após liberação específica

Não executar estes passos no laboratório já provisionado sem a liberação de atualização. Não trocar sua branch nem refazer `local:init`, `local:admin`, senha ou MFA. Após a atualização in-place autorizada e migration forward-only validada:

1. Entrar como PAP_ADMIN com a mesma senha/TOTP. Conferir organizações e segurança existentes. Em Perfis e acessos, nomear outra conta ativa como Gerente PAP. O Gerente precisa concluir MFA antes de usar a administração.
2. Submeter uma UBS sintética pelo cadastro público. Entrar como Gerente, registrar correções e encaminhar para o município correto. A UBS deve permanecer pendente; botões de ativação/suspensão/exclusão não devem existir para esse papel.
3. Entrar novamente como PAP_ADMIN, filtrar `READY_FOR_ACTIVATION`, abrir detalhes e confirmar **Ativar UBS**. Só então o convite inaugural fica disponível. Usar apenas captura de e-mail de demonstração já configurada no laboratório.
4. Como Gerente, autorizar Commercial em conta elegível diferente da própria. Tentar nomear outro Manager/Admin, convidar a própria conta como profissional e acionar PATCH de ciclo de vida: negar. Commercial não deve abrir Admin/organizações privadas ou páginas/APIs clínicas; seu painel futuro não pertence ao B.
5. Como profissional autorizado, abrir `/dashboard` e pacientes da própria UBS; com outro identificador/cabeçalho de UBS, negar. Não exigir ativação MFA onde a política profissional continua opcional.
6. Em UBS exclusivamente sintética e sem necessidade operacional, testar exclusão lógica pelo Admin com nome exato, senha e novo TOTP; confirmar preservação do histórico. Não usar unidades/dados reais nesse teste.
7. Revogar o Gerente e repetir as chamadas na mesma sessão: negar imediatamente; convites pendentes dele não devem conceder novos acessos. Verificar auditoria sem códigos/segredos.

## Arquivos e decisão

O inventário exato está abaixo. O diff completo, incluindo fontes novas, está disponível localmente em `.test-audit/missao04-b-review.patch` (ignorado pelo Git; não é artefato de produção). Nada deve ser staged genericamente. O próximo commit/push do B depende da aprovação humana pedida pelo operador; o PR permanece draft e sem merge/deploy. **NO-GO para produção.**


## Fechamento da auditoria

As rodadas finais obrigatórias acima passaram. O teste local falhou inicialmente por usar o contrato anterior (sem sessão MFA e aprovação que ativava a UBS); foi atualizado com confirmação TOTP real, novo login com segundo fator e ativação exclusiva e explícita do Admin, e passou novamente. As falhas de contraste/carregamento e foco da tabela mobile também foram corrigidas e reexecutadas. Nenhum guard foi removido para obter PASS. A mensagem da análise distingue correções, rejeição e encaminhamento; o navegador percorre correção → reanálise → ativação.

O gate F04 final inclui typecheck/lint/build; após os últimos ajustes de UX/testes, B + E2E + `next typegen`, TypeScript, lint e build foram repetidos. F03 completo e autenticação/MFA rodaram com Node 22.23.3. O inventário e o teste de release/SSH passaram novamente sem conexão SSH. Migrações fresh/replay e upgrade legado passaram; todas as nove regressões clínicas passaram sem cache. Artefatos históricos de QR/performance regenerados pelas suítes foram restaurados somente nos dois caminhos conhecidos, sem misturar evidências A1/Missão 03 no diff B.

**Decisão técnica anterior, superada pela revisão final abaixo:** as suítes existentes passaram, mas a auditoria adversarial adicional encontrou falha bloqueante. **NO-GO para commit/push** até correção e nova validação. **CI remoto B: NOT RUN** até essa autorização. **Produção: NO-GO**; homologação do operador não executada e nenhum deploy/merge autorizado. As nove vulnerabilidades altas de desenvolvimento continuam como risco herdado e não são apresentadas como resolvidas.

Fonte/testes/configuração revisados, SHA-256 agregado: `61e3ed29c782324650e459bf74762d2d3a426d166edd96e94599d40a90e2265b`.

Imagens finais verificadas:

- `pap-saude:m04-b`: `sha256:b50e7521c1658c0779149acba758368a9a1b0c167170aeff47b65db8843d03f1`, usuário `nextjs`.
- `pap-saude-migrator:m04-b`: `sha256:a67cfb42a3a3a0be42440e29baee4942e2216ab306effbaf242d6dac3fcb4adc`, usuário `node`.

## Revisão final solicitada antes do commit — 22/10/2026

**Decisão: NO-GO para commit/push.** Nesta etapa só foram alteradas documentação/evidências. O código de produção e os testes do Slice B permaneceram idênticos ao manifest anterior: **68/68 hashes conferidos**, agregado acima. Não foi feita correção silenciosa no diff submetido à revisão.

### M04-B-AUDIT-01 — ALTA / BLOQUEANTE: `organization.read` expõe `settings`

`listAdminOrganizations` (`src/server/admin/admin-organizations.service.ts`) restringe as contagens clínicas, mas usa Prisma `include`, que retorna também todos os campos escalares de Organization. `listAccessibleOrganizationIds` resolve o grant global canônico do PAP_MANAGER como `global=true`; a consulta não tem filtro de organizações nem uma projeção de campos delegados. A resposta GET `/api/admin/organizations` contém `settings`, inclusive configuração privada arbitrária, além de endereço, CNPJ/CNES, código e timestamps. A falha é no servidor e independe de o componente renderizar esses campos.

**Reprodução executada, não apenas análise estática:** identidade sintética PAP_MANAGER, login e MFA reais, bootstrap canônico e um `settings.privateAuditCanary` sintético. API: **HTTP 200, settingsReturned=true, privateCanaryVisible=true, clinicalCountsReturned=false**. Teste de privacidade: **FAIL (0/1)**. A outra sonda, de fronteiras globais, passou (**1/1**, oito endpoints). Código, comandos e saída integral sanitizada: [privacy-probe.txt](../evidence/missao-04-b/privacy-probe.txt). A sonda é evidência desta auditoria, executada em `.test-audit`; ainda não integra o CI. A futura correção precisa de teste de regressão permanente.

**Correção necessária antes de aprovação:** definir uma allowlist explícita de campos institucionais necessários ao Gerente, usando `select`/DTO no servidor; excluir `settings` e demais dados não delegados, mantendo escopo e proteção dos perfis anteriores. Testar valores privados não nulos em organizações de diferentes níveis/municípios e confirmar ausência no JSON, HTML e RSC. Não basta esconder colunas na interface. A prova atual não demonstra que a leitura organizacional é segura; por isso o item 3 do pedido é **FAIL**.

### Fronteiras de acesso — resultado efetivamente demonstrado

| Cenário | Resultado | Evidência e limite |
|---|---|---|
| Manager → configuração organizacional privada via `organization.read` | **FAIL** | `settings` e marcador sintético retornados; achado bloqueante acima |
| Manager → contadores clínicos na listagem | PASS | `patientLinks`/`encounters` ausentes; não elimina a exposição de outros campos |
| Manager → métricas Beta/operations, audit, security, beta/users, integrations, monitoring | PASS | sete endpoints com 403; sonda adicional executada |
| Manager → users legado | PASS quanto a não divulgação | HTTP 200 com `users: []`; contrato legado retorna vazio, não 403. A primeira versão da sonda esperava 403; expectativa ajustada após leitura do contrato, sem mudar código |
| Manager → criar/revogar Admin/Manager, próprio papel, escopo clínico, ciclo de UBS | PASS | testes B, payload injetado e drift persistido; somente Commercial elegível é delegado |
| Commercial → organizações privadas/segurança/papéis/métricas/solicitações | PASS | 403 nos testes B; catálogo e migration removem organization.read |
| Anônimo/Admin/Manager/Commercial/sem papel → HTML e RSC clínicos | PASS | acesso direto a `/dashboard`, `/pacientes`, `/pacientes/[id]`, `/registro`, `/atendimentos`: redirects 307/308, sem marcador de paciente; navegação real sem loops (até quatro navegações) |
| Admin/Manager/Commercial → API clínica | PASS | GET/POST/PATCH negados, mesmo com organização forjada e `mode=demo` |
| Sem papel/anônimo → administração | PASS | 403/401 e autoatribuição negada; não ganha concessão clínica |
| Professional → clínica da própria UBS / alheia | PASS | própria UBS acessível sem novo MFA obrigatório, unidade alheia 403; navegador confirma dashboard/pacientes |
| Todas as páginas clínicas × todos os papéis por HTML/RSC | NOT RUN como produto cartesiano | layout e todas as páginas recebem guard; browser executa a seleção explícita acima, não cada combinação possível |

### Upgrade sem redefinir identidade ou MFA

**PASS em legado sintético populado**, repetido nesta auditoria. `tests/mission04-b/legacy-upgrade.test.ts` aplica as 29 migrations históricas, monta catálogo anterior e semeia Admin, profissional, vínculos, UBS ativa/aprovada, solicitação resolvida e convite pendente. Compara todos os campos de User, PasswordCredential, Session, MfaFactor, MfaRecoveryCode, MfaChallenge, RoleAssignment, Membership e progresso de onboarding por igualdade booleana; compara também organizações, candidatos, solicitações e convites. Aplica a nova SQL duas vezes e bootstrap duas vezes: tudo permanece igual, salvo os grants IAM previstos; Manager não é atribuído a ninguém automaticamente. A sessão Admin anterior ainda é aceita; novo login com a **mesma senha e o mesmo fator TOTP** conclui MFA. A senha e o segredo não são impressos.

O bootstrap é **idêntico ao HEAD**: não há diff nele. Ele consome o catálogo, faz upserts de roles/permissões e sincroniza grants; não provisiona ou reseta identidades. A migration só adiciona enum/roles/permissões/grants e remove o grant Comercial; não escreve em tabelas de conta, credencial, MFA, sessão, organização, vínculo ou candidato legado. [Diff integral e bootstrap completo](../evidence/missao-04-b/critical-review.md).

**Conta/senha/MFA reais do operador: NOT RUN.** O laboratório manual não foi acessado, portanto não se afirma ter autenticado a conta real após upgrade. A evidência é o teste in-place sintético e a revisão SQL; homologação real permanece externa e requer autorização específica. Nenhum reset, provisionamento, mudança de branch, migration ou acesso à VPS foi executado nesta revisão.

### MFA, autorização e concorrência dentro das transações

| Mutação | Verificações dentro da transação | Isolamento / cobertura |
|---|---|---|
| Atribuição e revogação de papéis | `requireRoleMutation` chama `requireAdminActor` com `tx`; valida token exato, usuário ativo, expiração/revogação, MFA da sessão e fator TOTP ativo/data; perfil efetivo e autorização no mesmo `tx`. Admin exige papel global canônico + role.manage. Manager exige role.assign_commercial, alvo diferente, Commercial global e alvo sem papel protegido. Revogação carrega atribuição atual no `tx`, verifica último Admin e audita junto à exclusão | SERIALIZABLE; até três tentativas para P2034. Regressões F04 de duplicidade/último Admin e B de revogação da autoridade na mesma sessão |
| Criar organização | Revalida sessão/MFA exatos e organization.manage no parent com `tx`; criação e evento juntos | SERIALIZABLE, helper de até cinco tentativas P2034/P2002 |
| Ativar/suspender/arquivar/atualizar | Revalida sessão/MFA e acesso à organização com `tx`; UBS exige PAP_ADMIN global + permissão específica. Estado/candidato/solicitação e auditoria na mesma transação | SERIALIZABLE/retry; ativação concorrente testada: uma UBS/evento, sem ativação pelo Gerente |
| Revisão institucional | `requireAdminActor(...,tx)` e `requirePapReviewer(...,tx)`; Admin/Manager global canônico com organization.request.review; estado/município/consentimento conferidos no tx | SERIALIZABLE/retry; encaminhamento concorrente/idempotência testados |
| Emitir/aceitar convite institucional | Revalida permissão/escopo do emissor e elegibilidade do alvo com `tx`; impede autoconvite do Manager e papéis protegidos. Aceite reavalia autoridade do emissor e destino, não consome convite negado | Transação preexistente/lock da organização; **não** foi convertida integralmente para SERIALIZABLE; testes de revogação/elevação entre emissão e aceite |

`requireReauthentication` (senha/TOTP fresco para arquivar) ocorre **antes** da transação de mutação; dentro dela são rechecados sessão/MFA, IAM, estado e nome de confirmação. Não se alega que o consumo do TOTP faz parte do mesmo commit da organização. Rotas de convite administrativo executam MFA no guard HTTP; não há revalidação da sessão MFA em todos os callbacks de convite. O aceite público usa o token de convite e mantém o fluxo inicial sem exigir uma sessão administrativa do destinatário.

**Limite de concorrência: NOT RUN** para uma corrida determinística que intercale reset/revogação MFA ou revogação de papel exatamente entre leitura e commit de outra operação. SERIALIZABLE garante uma ordem serial válida e refaz leituras nos retries; não cancela automaticamente uma transação já em andamento quando outra sessão revoga autoridade. Os testes demonstram concorrência de estado/último Admin/idempotência e negação de requisições posteriores à revogação, não cancelamento retroativo universal. Comentários amplos no código não ampliam essa garantia. Essa limitação deve permanecer explícita na revisão de segurança.

### Rodada final — comandos executados e matriz

Node usado: **22.23.3**, via `npm_config_cache=/tmp/pap-m04-npm npm exec --yes --package=node@22.23.3 -- bash -c '<comando>'`. PostgreSQL criado nesta nuvem com `--rm`, bind **127.0.0.1:5432**, labels `pap.disposable=f0410` e `pap.mission=m04-b-final-audit`; dados aleatórios `@synthetic.invalid`, e-mail disabled e chave MFA aleatória só em memória. O runner da sonda verifica propriedade e nome exato do banco e remove apenas `pap_m04_b_final_review`; as suítes usam seus bancos de teste próprios. Nenhum recurso do laboratório manual foi usado. Ao final, o container criado nesta revisão foi removido após nova conferência das duas labels de propriedade.

| Comando efetivamente executado nesta revisão | Resultado | Contagem / evidência |
|---|---|---|
| `npm run test:mission04:b` | PASS | 26/26, 0 fail/skip, inclui preservação legado |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:mission04:b:browser -- --grep "direct clinical\|Professional without"` | PASS | 26 Node + **2/2 E2E** de fronteira clínica; outros dois E2E não repetidos nesta rodada, 4/4 no gate anterior |
| `bash .test-audit/m04-b-final-review/run-privacy-probe.sh` | **FAIL** | **1 PASS / 1 FAIL**; oito endpoints não delegados protegidos, exposição de settings confirmada |
| `npm run audit:f04:operations` | PASS | **78 Node**, SQL, TypeScript, ESLint, build; nova execução completa e finalizada |
| `npm audit --json` | **FAIL**, exit 1 | 9 high, 0 critical, árvore completa com desenvolvimento |
| `npm audit --omit=dev --json` | PASS | 0 vulnerabilidades |
| `npm audit --prefix docker/migrator --include=dev --json` | PASS | 0 vulnerabilidades, inclusive dev desse pacote isolado |
| Conferência de hashes do código do B | PASS | **68/68** idênticos ao manifest anterior, nenhuma alteração de implementação nesta revisão |
| `git diff --check` | PASS | exit 0, sem saída; índice vazio |
| `git diff --no-index --check -- /dev/null <cada arquivo novo textual>` | PASS | 20 arquivos novos textuais conferidos; três PNG não se aplicam |
| `gh pr view 5 --json url,isDraft,state,baseRefName,headRefName` | PASS | OPEN/draft, base develop e feature corretas |
| Beta 1 / Auth-MFA / F03 completo / primeiro acesso completo / Docker+Trivy | PASS na execução anterior | 29 / 202 / 9 módulos / 21 Node + 15 E2E / duas imagens, conforme matriz anterior; **não repetidos nesta revisão** |
| CI remoto B / conta real / deploy | NOT RUN | sem commit/push; laboratório e produção preservados |

Saídas e hashes finais: [final-review.json](../evidence/missao-04-b/final-review.json). Dois hashes armazenados anteriormente (F04 e static) divergiam dos arquivos de log completos; a causa não foi presumida. O gate F04/TypeScript/lint/build foi **reexecutado**, terminou exit 0 e agora usa seu novo hash; os valores antigos foram preservados na evidência da revisão. Os demais logs conferidos (B, Beta, auth/MFA, local e primeiro acesso) coincidiam com seus hashes. Não foi alterado resultado de teste para mascarar o achado de privacidade.

### Dependências e riscos residuais

Auditoria completa nova, com JSON integral público em [npm-audit-complete.json](../evidence/missao-04-b/npm-audit-complete.json): **9 altas, 0 críticas**, herdadas de desenvolvimento. Pacotes afetados: `@next/eslint-plugin-next`, `@shadcn/registry`, `@ts-morph/common`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`, `shadcn`, `ts-morph`. São nove entradas afetadas, não nove vulnerabilidades raiz independentes: a cadeia passa por `braces`/`micromatch`/`fast-glob`. Advisory `GHSA-vfj7-8cjw-p6xm`, CVSS 7.5, exaustão de pilha/DoS ao processar padrões profundamente aninhados. Não há prova de exploração no PAP, mas ferramentas/CI continuam expostos a entradas maliciosas processadas pela cadeia vulnerável; requer atualização planejada e teste separado. `npm audit fix` **não executado**; dependências/lockfiles preservados. Produção e migrator, inclusive dev isolado deste último, têm zero achados na nova consulta.

Risco bloqueante novo: divulgação de settings ao Gerente. Riscos/limites remanescentes: corrida intercalada MFA/IAM ainda sem prova determinística; homologação da conta real não executada; CI remoto B pendente; comportamento novo de ativação/arquivamento demanda revisão humana; C–F não fazem parte do B. Imagens sem HIGH/CRITICAL na execução anterior não substituem o novo achado de autorização na aplicação.

### Diff completo, inventário e staging futuro

[Saídas literais de git status --short, git diff --stat e git diff --check, lista classificada e comando seletivo](../evidence/missao-04-b/final-review-git.txt). `git diff --stat` mostra apenas os **55 arquivos tracked modificados**, 1024 inserções/719 exclusões; os arquivos novos estão no inventário exato abaixo. O [diff sensível integral](../evidence/missao-04-b/critical-review.md) contém migration, schema, catálogo, permissões, bootstrap sem alteração, atribuição/revogação e controles dependentes, sem omitir hunks. O patch integral de todos os caminhos, incluindo novos/binários, fica em `.test-audit/missao04-b-review.patch` (ignorado).

O comando de staging é somente referência para depois da correção e aprovação: **não foi executado**. É necessário regenerar inventário/diff após corrigir M04-B-AUDIT-01. Nenhum `git add`, commit ou push do B foi feito. PR #5 permanece draft; sem merge/deploy, sem avanço para C e sem mudanças no laboratório.

### Caminhos exatos do Slice B (78 arquivos: 55 modificados + 23 novos)

```text
.github/workflows/ci.yml
docs/codex/RELATORIO-MISSAO-04-SLICE-B.md
docs/evidence/missao-04-b/critical-review.md
docs/evidence/missao-04-b/final-review-git.txt
docs/evidence/missao-04-b/final-review.json
docs/evidence/missao-04-b/manager-dark.png
docs/evidence/missao-04-b/manager-desktop.png
docs/evidence/missao-04-b/manager-mobile.png
docs/evidence/missao-04-b/npm-audit-complete.json
docs/evidence/missao-04-b/privacy-probe.txt
docs/evidence/missao-04-b/validation.json
package.json
prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql
prisma/schema.prisma
scripts/test-mission04-b.sh
src/app/(admin)/admin/layout.tsx
src/app/(admin)/admin/organizacoes/page.tsx
src/app/(admin)/admin/page.tsx
src/app/(dashboard)/atendimentos/page.tsx
src/app/(dashboard)/casos/page.tsx
src/app/(dashboard)/chat/page.tsx
src/app/(dashboard)/configuracoes/page.tsx
src/app/(dashboard)/cursos/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/ferramentas/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/pacientes/[id]/page.tsx
src/app/(dashboard)/pacientes/page.tsx
src/app/(dashboard)/protocolos/page.tsx
src/app/(dashboard)/registro/page.tsx
src/app/api/admin/beta/requests/route.ts
src/app/api/admin/organizations/[organizationId]/route.ts
src/app/api/admin/organizations/route.ts
src/app/api/admin/role-assignments/[assignmentId]/route.ts
src/app/api/admin/role-assignments/route.ts
src/components/admin/AccessAdminClient.tsx
src/components/admin/AdminShell.tsx
src/components/admin/AdminSidebar.tsx
src/components/admin/AdminTopbar.tsx
src/components/admin/BetaInvitationsClient.tsx
src/components/admin/BetaRequestsClient.tsx
src/components/admin/BetaWidgets.tsx
src/components/admin/OrganizationsAdminClient.tsx
src/components/admin/admin-theme.css
src/components/security/FirstAccessWizard.tsx
src/components/security/security-client.ts
src/lib/auth/access-destination.ts
src/server/admin-beta/invitations.service.ts
src/server/admin-beta/policy.ts
src/server/admin-beta/requests.service.ts
src/server/admin/admin-access.service.ts
src/server/admin/admin-http.ts
src/server/admin/admin-organizations.service.ts
src/server/admin/admin-roles.service.ts
src/server/admin/admin-session.service.ts
src/server/admin/institutional-invitation-policy.ts
src/server/audit/admin-audit-policy.ts
src/server/auth/session.service.ts
src/server/clinical/clinical-page-session.ts
src/server/iam/authorization.service.ts
src/server/iam/effective-access-profile.service.ts
src/server/iam/permissions.ts
src/server/iam/role-assignment.service.ts
src/server/iam/system-role-catalog.ts
src/server/invitations/invitation.service.ts
src/server/organizations/discovery.service.ts
tests/admin-beta/journey.integration.test.ts
tests/admin/admin-mfa.integration.test.ts
tests/admin/f04-audit-idor.integration.test.ts
tests/admin/role-adversarial.integration.test.ts
tests/admin/role-governance.integration.test.ts
tests/helpers/verified-admin-session.ts
tests/local/provision.integration.test.ts
tests/mission04-b/fixtures.ts
tests/mission04-b/governance.spec.ts
tests/mission04-b/governance.test.ts
tests/mission04-b/legacy-upgrade.test.ts
tests/mission04-b/playwright.config.ts
```
