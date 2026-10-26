# Missão 04 — Slice A1: segurança da conta e entrada

Estado: implementação local em revisão; **aguarda aprovação do operador antes de commit/push ou próximo slice**, conforme seção 9 do pedido. Missão 04 ainda não concluída. Sem merge, deploy, acesso à VPS ou envio real de e-mails.

## Base e auditoria inicial

- Branch: `feature/ux-iam-convites-vitrine-email`, HEAD inicial `12aeeaa0b35901f08abc0b048689e04a6b1e0b1b`; árvore inicialmente limpa. `develop` observado em `8ed7c14e063c025a52722b959b08fe7c99cf0818`.
- PR #4 observado aberto, draft e não integrado; base de onboarding `b33098381e7b174c7f110e574c657ffd3c91a652` já ancestral desta feature. Último CI observado do PR: [execução 39361895743](https://github.com/joaoCarlosGM/pap-saude/actions/runs/39361895743). Esse resultado anterior **não valida este diff**.
- Lidos integralmente AGENTS.md, a especificação da Missão 04, a referência HTML de espera e o SVG local. Sem alteração dessas referências ou das migrations históricas.
- Segurança da conta incorporava `FirstAccessWizard`; a ajuda utilizava o mesmo wizard e o tour Admin abria automaticamente. Corrigidos neste slice.
- `PAP_MANAGER` ainda ausente; `COMMERCIAL` tem leitura organizacional; aprovação institucional cria UBS ativa. Pendências do slice B: separar decisão institucional de ativação e restringir autorizações no backend antes de liberar as novas jornadas.
- Recuperação de senha ainda precisa integrar captura local; convites globais, espera, autorização, vitrine e auditoria integral das métricas seguem pendentes. Sem alegação de completude dessas funcionalidades.

## Ordem de execução proposta

1. **A1 (este diff):** separar configuração inicial, gestão persistente e ajuda; entrada responsiva com arte local; regressões de preservação MFA.
2. **B:** IAM/PAP_MANAGER/MFA e fronteiras administrativas; impedir ativação automática por aprovação; matriz adversarial de papéis.
3. **C:** convite Comercial sem UBS, aceite/espera/autorização, fila e notificações.
4. **D:** templates e captura local, inclusive recuperação; preparação de homologação externa sem envios.
5. **E:** painel Comercial real e CTA para vitrine clínica isolada; identidade visual restante.
6. **F:** auditoria integral das métricas, regressão final e PR para revisão.

Cada slice depende de aprovação, commit seletivo e push antes de iniciar o seguinte. A1 não implementa o tema completo dos painéis, Gerente, fila, e-mails ou vitrine.

## Comportamento implementado

- `/primeiros-passos` contém exclusivamente a configuração inicial. Conta concluída com MFA verificado segue ao destino; sessão primária antiga sem segundo fator ainda precisa concluir o novo login. O bookmark legado `?ajuda=1` redireciona à ajuda separada.
- `/minha-seguranca` e a tela administrativa equivalente mostram senha, sessões, estado MFA e recuperação persistentes, sem incorporar o wizard.
- As páginas privadas de gestão/configuração exigem sessão primária válida no servidor. Essa exceção de conta própria não concede acesso administrativo; guards de MFA/IAM/CSRF e política profissional existentes permanecem.
- Gerar recuperação exige clique explícito, senha e TOTP atual na API existente. Códigos aparecem somente em memória e são ocultados após confirmação; a ação não troca fator, senha, sessão ou metadados de conclusão do onboarding. Códigos antigos são revogados pela operação já existente.
- `/ajuda/seguranca` apresenta instruções sem gerar chave ou alterar conta. Tour Admin abre somente por Ajuda, com foco contido, Escape e retorno ao botão acionador; corrigido posicionamento em 320 px.
- Login utiliza o SVG local existente com dimensões reservadas, formulário prioritário no mobile e sem dependência de imagens externas. Superfícies de conta administrativa usam petróleo/menta; dashboard clínico permanece intacto.

## Isolamento e laboratório manual

O laboratório do operador não está montado neste workspace e **não foi atualizado ou validado**. Nenhuma credencial/conta/configuração real foi lida ou copiada. Não foram executados comandos de provisionamento no checkout do operador.

As regressões utilizam PostgreSQL criado nesta execução com dados sintéticos e label `pap.disposable=f0410` / `pap.mission=m04-a1`, em 5432. O teste existente `test:local-dev` usa workspace temporário, verifica ausência dos recursos reservados antes de criar fixtures próprias em 15432 e remove somente seus recursos de teste; não representa homologação do laboratório real. A ausência de recursos preexistentes foi verificada antes dos testes. Ao concluir, o container descartável desta execução foi parado após conferir sua label; como foi criado com `--rm`, seus recursos efêmeros foram removidos. Nenhum volume manual foi removido.

Não há migration, alteração de schema, dependência ou configuração do laboratório neste diff. A única extensão no harness F04 é incluir **esta branch exata** na allowlist local; identidade do banco descartável, recusa a banco preexistente e contexto seguro do CI permanecem.

## Evidências visuais

Capturas sintéticas com inputs e áreas sensíveis mascarados; sem QR, seed, código MFA, recovery code ou token. Inspeção visual desktop/mobile/dark realizada.

- [Login 320 px](../evidence/missao-04-a1/login-320.png)
- [Login 768 px](../evidence/missao-04-a1/login-768.png)
- [Login desktop](../evidence/missao-04-a1/login-1440.png)
- [Login escuro](../evidence/missao-04-a1/login-escuro.png)
- [Conta Admin 320 px](../evidence/missao-04-a1/conta-admin-320.png)
- [Conta Admin escura](../evidence/missao-04-a1/conta-admin-escuro.png)
- [Medições de laboratório](../evidence/missao-04-a1/performance-laboratorio.json): CLS/LCP numéricos em Chromium headless e servidor de desenvolvimento aquecido; sem equivalência com métricas de campo, produção ou comparação antes/depois.

## Roteiro de revisão do A1

Após liberação explícita para atualizar o laboratório preservando o mesmo banco/configuração/contas:

1. Usar a conta local existente; entrar com senha e TOTP atuais.
2. Abrir Minha segurança pelas rotas própria e Admin, recarregar e consultar Ajuda: sem wizard automático, novo QR ou geração de fator.
3. Confirmar que o mesmo TOTP continua funcionando no novo login; Ajuda do Admin só deve abrir quando clicada, com Escape e retorno do foco.
4. Com conta sintética ainda não configurada, abrir Configurar autenticador: QR somente após ação/reautenticação; concluir confirmação, guardar recuperação e realizar novo login. Não recriar o administrador existente para esse teste.
5. Somente se desejado, Gerenciar recuperação: exigir senha/TOTP; após gerar, guardar o novo conjunto antes de confirmar. Essa ação invalida os códigos antigos e não deve ser feita acidentalmente para homologação.
6. Conferir login e gestão em desktop, 320 px, tema escuro e teclado. Não capturar segredos.

Homologação manual real, navegador/celular do operador e atualização in-place do laboratório: **NOT RUN**, dependem de liberação e ambiente externo. CI remoto deste diff: **NOT RUN**, porque commit/push dependem de aprovação. Publicação, deploy e envio real de e-mail: **NOT RUN**, não autorizados.

## Arquivos exatos deste slice

- `docs/codex/RELATORIO-MISSAO-04-SLICE-A1.md`
- `docs/evidence/missao-04-a1/conta-admin-320.png`
- `docs/evidence/missao-04-a1/conta-admin-escuro.png`
- `docs/evidence/missao-04-a1/login-1440.png`
- `docs/evidence/missao-04-a1/login-320.png`
- `docs/evidence/missao-04-a1/login-768.png`
- `docs/evidence/missao-04-a1/login-escuro.png`
- `docs/evidence/missao-04-a1/performance-laboratorio.json`
- `scripts/test-f04-db-invariants.sh`
- `src/app/(auth)/ajuda/seguranca/page.tsx`
- `src/app/(auth)/minha-seguranca/page.tsx`
- `src/app/(auth)/primeiros-passos/page.tsx`
- `src/app/globals.css`
- `src/components/admin/MySecurityClient.tsx`
- `src/components/auth/LoginSecurity.tsx`
- `src/components/layout/DashboardShell.tsx`
- `src/components/onboarding/GuidedTourEngine.tsx`
- `src/components/security/AccountRecovery.tsx`
- `src/components/security/FirstAccessWizard.tsx`
- `src/components/security/account-security.css`
- `src/server/auth/require-page-session.ts`
- `tests/first-access/account-security.spec.ts`
- `tests/first-access/browser.spec.ts`
- `tests/first-access/playwright.config.ts`
- `tests/first-access/safe-reporter.ts`

## Dependências e risco herdado

`npm audit --omit=dev --audit-level=high` e auditoria do `docker/migrator` retornaram **PASS, zero vulnerabilidades**. A auditoria incluindo desenvolvimento retornou **FAIL: 9 high, 0 critical**, em `@next/eslint-plugin-next`, `@shadcn/registry`, `@ts-morph/common`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`, `shadcn` e `ts-morph` (incluindo dependentes transitivos). Package/lockfiles não foram modificados: o risco já existe na base. Não foi executado `npm audit fix` nem atualização automática de dependências. Esse resultado impede alegar ausência global de vulnerabilidades e deve ser tratado ou explicitamente avaliado antes de uma decisão de release.

## Testes executados

| Verificação | Resultado e evidência local |
| --- | --- |
| Primeiro acesso API/QR + navegador | **PASS**: 11 testes API/QR e 9 E2E (5 existentes + 4 novos); `/tmp/m04-browser-final.log`. Execução final com Node 22.23.3 e Chromium local. |
| Beta Admin | **PASS**: 29 testes; `/tmp/m04-regression.log`. Inclui migração incremental e cenários adversariais. |
| Autenticação/MFA/IAM | **PASS**: 202 testes; `/tmp/m04-regression.log`. |
| F03 completo forçado | **PASS**: 9/9 módulos, sem cache; `/tmp/m04-regression.log`. |
| F04 integrado | **PASS**: `npm run audit:f04:operations`, 78 testes Node, invariantes SQL com triggers ativos, Prisma validate, guard SQL, types, lint e build de produção; `/tmp/m04-f04.log`. Node 22.23.3. |
| Desenvolvimento local descartável | **PASS**: política, recuperação de inicialização interrompida, fixtures isoladas e captura sem envio real; `/tmp/m04-local-dev.log`. |
| Guard de CI/SSH | **PASS**: guard e 2 testes, incluindo unidade do comando SSH sem conexão; `/tmp/m04-workflow.log`. |
| Preflight/restore sintético | **PASS**: 1 teste; `/tmp/m04-preflight.log`. |
| PostgreSQL pronto | **PASS**: servidor temporário recusado e TCP final exigido; `/tmp/m04-readiness.log`. |
| Prisma sem URL | **PASS**: recusa sem `DATABASE_URL`; `/tmp/m04-fail-closed.log`. A primeira tentativa de setup sem URL também falhou; geração repetida com URL explícita descartável passou. |
| Separação runtime/migrator PostgreSQL | **PASS**: DML permitido, DDL/escalada/auditoria negados; `/tmp/m04-roles.log`. |
| Builds Docker web e migrator | **PASS**, `/tmp/m04-docker-resolved.log`. Ajustes exclusivamente locais: `DOCKER_CONFIG` em `/tmp`, resolução do proxy e CA como build secret; Dockerfile inalterado. Tentativas anteriores sem esses ajustes não concluíram. |
| Migrator funcional/idempotência/falhas | **PASS**: migração, preservação de legado, checksum e falha SQL bloqueando startup; `/tmp/m04-migrator-image.log`. |
| Web com role restrita | **PASS**: non-root, health/login, autenticação negada persistida com credenciais runtime; `/tmp/m04-web-image.log`. |
| Trivy das duas imagens finais | **PASS**, filtro HIGH/CRITICAL e saída 0 em ambas; `/tmp/m04-image-scan.log`. |
| Dependências produção/migrator | **PASS**, zero; `/tmp/m04-audit.log`, `/tmp/m04-migrator-audit.log`. |
| Dependências incluindo desenvolvimento | **FAIL**, 9 high herdadas; `/tmp/m04-audit-all.json`. Ver seção de risco. |

Os comandos de referência são `npm run test:first-access:browser`, `npm run test:admin:beta1`, `npm run test:auth`, `npm run test:f03:smart:force`, `npm run audit:f04:operations`, `npm run test:local-dev` e os scripts F04 de readiness, role separation e imagens usados pelo workflow. Todos os harnesses com banco foram executados somente em infraestrutura descartável. Beta/auth/F03/local-dev utilizaram Node 24.19.0 do host; primeiro acesso final e agregado F04 utilizaram Node 22.23.3; as imagens utilizam a base Node 22 fixada pelo Dockerfile.

Axe A/AA, teclado, ausência de overflow em 320/768/1440, dark/reduced-motion e ausência de requisições externas no login passaram. Invariantes adversariais do A1: sessão primária sem MFA não entra no Admin, visitas/reloads não enviam ações de segurança nem criam fatores, ajuda explícita não altera credenciais/fator/progresso de configuração, recuperação nega senha inválida e preserva fator/senha/conclusão após rotação legítima. As suítes existentes continuam verificando MFA/IAM/CSRF/tenant e política de profissionais.

**NOT RUN:** CI remoto para este diff não publicado, laboratório real, TOTP no celular real, navegadores físicos/Safari, métricas de campo/baseline de performance, e-mails externos e jornadas novas dos slices B–F. Não há evidência de CI remoto do código ainda não commitado.

## Decisão e gate humano

Slice A1 pronto para revisão do diff, com risco de dependências de desenvolvimento explicitado. **NO-GO para release da Missão 04:** funcionalidades B–F pendentes, homologação externa não realizada e alertas de desenvolvimento ainda abertos. Não há falha nas suítes funcionais executadas. `git diff --check` passou.

Commit, push e abertura do PR desta missão não realizados: dependem da aprovação exigida no item 9 do pedido. Após aprovação, incluir somente os caminhos deste relatório, criar commit do A1 e fazer push imediato para a feature antes de iniciar B. Nenhuma atualização automática do laboratório manual foi autorizada ou executada.
