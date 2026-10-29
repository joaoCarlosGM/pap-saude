# PAP Saúde P0 — Missão de produto unificado Premium e candidato de release

**Tipo:** execução integral no Codex (não somente planejamento).  
**Branch:** `feature/p0-premium-unified-rc`  
**Base congelada:** `a34cd7adf62ec1aabda7a3d15ed24415f2a4c4d3` (`feature/p0-vitrine-premium2-integration`).  
**Objetivo:** substituir o mosaico atual de "Vitrine Premium isolada + P0 clínico/Admin legado" por **um único PAP Saúde operacional**, visual Premium consistente, serviços reais mantidos, papéis preservados, homologação local persistente e pacote verificável para futura homologação controlada na VPS.

## 0. Interpretação da solicitação e regras

O operador explicitou que a entrega da porta 3500 NÃO foi o que pediu: ela demonstra a Vitrine somente, enquanto quer visualizar o **sistema integral** com Dashboard animado, Registro, Pacientes, Atendimentos, Administração P0, convites, IAM, MFA, segurança, notificações, perfil, etc., em **uma aplicação**, com navegação de acordo com o perfil. Sua próxima meta é **homologar na VPS depois do aceite local**.

**Não encerrar com mais um preview somente da Vitrine; não apresentar mock como serviço real; não antecipar GO para produção.**

A base atual contém:
- `src/features/vitrine-premium/**` (139 caminhos incluindo diretórios): UI Premium, movimentos, sidebar, tour, DemoProvider, MEOWS sintético; **deve continuar isolada para /vitrine**;
- `src/app/(dashboard)/**`: operações clínicas reais, guard `requireClinicalPageSession`, Dashboard `src/server/clinical-dashboard/clinical-dashboard.service.ts`, Registro API, Pacientes, Atendimentos, Configurações;
- `src/app/(admin)/**`: administração P0, `AdminShell`, permissões, convites, solicitações, órgãos/UBS, métricas, auditoria, MFA;
- `src/app/(auth)/**`: login, CAPTCHA, MFA/primeiro acesso, senha, Comercial;
- `src/app/(showcase)/vitrine/**`: demo protegida por `requireCommercialPageSession`;
- `src/server/meows/**`: protocolo clínico **DRAFT_UNVALIDATED**; não ativar total/alertas;
- `.github/workflows/ci.yml`: **push em `prod` publica e implanta automaticamente na VPS**. Não fazer push, PR merge ou deploy `prod` nesta missão.

## 1. Arquitetura final obrigatória

Um login, sessão e aplicação. A navegação depende de efetivos privilégios/escopos, não apenas de um flag client-side.

- `/login`, `/primeiros-passos`, `/recuperar-senha`, `/minha-seguranca`: componentes AUTH reais mantidos, harmonizados visualmente sem alterar estado/contratos.
- `/dashboard`: **Dashboard Premium operacional**, dados do serviço clínico real no backend e escopos reais.
- `/registro`, `/pacientes`, `/pacientes/[id]`, `/atendimentos`, `/configuracoes`: **componentes operacionais reais** com visual Premium, nenhuma importação do DemoProvider.
- `/admin`, `/admin/*`: gestão administrativa **real P0**, com identidade visual Premium consistente, sem perder busca/filtro/roles, administração, auditoria, governança e onboarding Admin.
- `/comercial`: ambiente comercial real e acesso à `/vitrine` exclusivo para COMMERCIAL habilitado, preservando suas autorizações.
- `/vitrine/**`: **continuar sintética e isolada**. Não usar o MEOWS demo para operações, nem renderizar suas fixtures no Dashboard real.

Menu e entrada: resolver perfil via `getEffectiveAccessProfile`, `accessDestination` e guards já existentes. Exibir apenas módulos que têm permissão; usuário com múltiplos privilégios ganha alternância de área **sujeita a autorização server-side em todas as rotas/APIs**. Não conceder a PAP_ADMIN acesso clínico implícito. Se perfil só tem acesso Admin, entrar em `/admin`; perfil clínico somente entra em `/dashboard`; Comercial somente entra em `/comercial`. Logo após autenticação não redirecionar todos automaticamente ao dashboard.

Manter módulo administrativo completo e funcional: painel, rede municipal e UBS, solicitações/pendências, profissionais e usuários, papéis e convites, auditoria, integrações, métricas, monitoramento, segurança, notificações. Nada disso deve desaparecer em uma refatoração de shell.

## 2. Design system e experiência Premium

Extrair componentes **estritamente de apresentação** da Vitrine para um núcleo `src/components/premium/**` ou equivalente:
- design tokens rosa/branco `#EC268F` e tonalidades compatíveis;
- sidebar branca responsiva, indicador ativo deslizante, avatar/perfil real do usuário, contexto de instituição **real e autorizado**, notificações reais, Ajuda e Segurança;
- transição curta entre páginas sem bloquear links, sem repetição de requests RSC, sem quebrar tecla Enter/Tab, modais/portais, nem formularios;
- `AnimatedMetric`, `PageMotion`, `useReducedMotion`, entradas escalonadas, gráficos animados e ícone IA com três estrelas rosa, acessíveis sob `prefers-reduced-motion`;
- cartões, tabelas, detalhes, KPIs, estados vazios, loading/error/skeleton, cores, tipografia, scrollbar, navegação mobile;
- foco visível, contraste/aria-live, Escape e restauração de foco, sticky/overflow, tamanho de clique adequado;
- esquema visual consistente entre clínico, Admin e Comercial; componentes compartilhados só na camada de apresentação, sem importar dados sintéticos.

O perfil **real** não deve reutilizar `Ana Paula`, município/UBS demo ou placeholders de instituição da Vitrine. Ajustes editáveis respeitam `ownProfile` e serviços de perfil autorizados; não ativar campos sem contrato backend. Perfil demo permanece fictício.

Tutor: preserve `GuidedTourEngine` Admin e permissões; crie/adapte tour clínico com alvos operacionais reais e permissão; **não copie o tour demo como bypass de MFA ou estado de onboarding**. Reset de tour não apaga dados reais.

## 3. Dashboard operacional: dados de verdade

O serviço atual `src/server/clinical-dashboard/clinical-dashboard.service.ts` fornece contagem de pacientes ativos, gestações ativas, atendimentos concluídos no mês, em andamento, série 6 meses e últimos atendimentos; dados são limitados às UBS com permissões efetivas. O Dashboard demo tem 8 KPIs. **Não mostrar 8 métricas se só 4 estiverem corretamente disponíveis.** Reusar ou ampliar métricas somente com contrato autorizado, agregações derivadas de dados existentes e testes de escopo; mostrar 4 quando pertinente.

Exigências:
- `/dashboard` mantém `requireClinicalPageSession()`, acesso a cada UBS e filtro por unidade se houver escopo verdadeiro. Evitar paciente sem vínculo/UBS inativa/atendimento indevido, preservar contagens de indivíduos distintos, UTC explicitado;
- zeros reais continuam zeros, valores null/ausentes são estados 'Indisponível', sem criar tendências, risco ou resultados;
- não mostrar classificação de risco ou distribuição MEOWS como se fosse validada; a seção pode informar indisponibilidade ou excluir o gráfico, com visual coerente. Versão assistencial permanece `DRAFT_UNVALIDATED`;
- cartões/linhas recentes clicáveis somente para URLs clínicas com autorização real; os detalhes nunca carregam fixture;
- indicadores animados acessíveis: valor final está disponível a leitores de tela e já aparece sem animação/reduced motion; dados reais não sofrem contagem errada nem troca visual de sinal;
- criar fixtures **sintéticas** em **banco local de homologação** apenas para testar telas operacionais; nunca embutidas no código/server de produção.

Admin Dashboard: aplicar o mesmo visual Premium a `AdminShell`/`BetaDashboardClient` e `GovernanceSummaryCards`, preservando a origem real de métricas, distinção "suprimido", "sem dados" e erros/atualização. Não converter indicadores de admin em métricas clínicas.

## 4. Módulos clínicos operacionais reais

Porte de design, nunca porte do estado mock:
- Registro: manter `src/components/registro/RegistrationWizard.tsx` e `submitClinicalRegistration`/`resumeClinicalRegistration`/`restartClinicalRegistration`; contrato atômico, idempotência, vínculo UBS, validações, rascunho, concorrência, revisões e status. Preservar cinco etapas só se semanticamente compatíveis. Não chamar `saveDemo`.
- Pacientes: lista/ficha reais, vínculos, prontuário, histórico e evolução conforme API permitida; adaptar a apresentação de `ClinicalPatientList` e `ClinicalPatient...` sem simplificar autorização; não criar documentos/vacinas/exames fictícios. O que não tem backend é indisponível.
- Atendimentos: lista/filtros/detalhes/estado do encontro/finalização reais; nenhuma mutação após COMPLETED; timeline com dados auditados.
- Configurações: `ownProfile` real; notificações e segurança reais ou explícita indisponibilidade, nunca toggles decorativos que afirmem salvar.
- Chat IA, Protocolos, Ferramentas, Cursos: hoje operacionalmente são `ClinicalModuleNotice`, **não têm backend clínico homologado**. Manter como 'Em desenvolvimento / indisponível' ou ocultar com descrição honesta; **não inventar IA, protocolos, diagnósticos, aulas, uploads ou APIs**. O ícone IA rosa pode ser reaproveitado visualmente, mas sem chat com dados clínicos até fluxo específico aprovado.

## 5. Administração real e governo de permissões

- Preservar e testar `AdminShell`, `AdminSidebar`, `AdminTopbar`, `GuidedTourEngine`, acesso `firstAccessState` + `getEffectiveAccessProfile`, pendências e todos os submódulos;
- UI Premium administrava nomes/escopos conforme perfil efetivo; não remover filtros, colapsos, formulários, estados de erro, tabelas, detalhes ou CTAs autorizados;
- mesma linguagem premium rosa/branco com distinção clara entre contexto Admin e Clínico; nunca confundir instituição selecionada com concessão de permission;
- trocar de área por links permitidos e revalidar guard; testes de usuários Admin-only, Clinical-only, Commercial-only, combinações e sem permissão/MFA;
- preserve auditoria append-only, proteção contra IDOR, MFA/step-up, grants, notificações, validação de status e revisão humana de convites.

## 6. Homologação local persistente: um P0 INTEIRO, não o launcher demo

Criar um perfil de laboratório **inteiramente novo**, nominal `p0-unified-rc`, em worktree novo. Reservar por padrão:
- web: `127.0.0.1:3600`;
- PostgreSQL: `127.0.0.1:15436`;
- container `pap-p0-unified-rc-db`, volume `pap-p0-unified-rc-data`, labels explícitas `pap.local=p0-unified-rc` e marcador de propriedade de DB;
- configuração privada `.local/pap-p0-unified-rc` (0700/0600), *chaves próprias* de MFA e credenciais;
- saída de e-mails locais capturados (`PAP_EMAIL_PROVIDER=local-demo` **somente** para este laboratório) e `npm run local:mail -- --profile=p0-unified-rc`, com sink endurecido e sem enviar e-mails reais.

Estender `LOCAL_LAB_PROFILES`, `scripts/local/policy.mjs`, `scripts/local/dev.mjs`, `operatorMailProfile` e seus testes com a nova allowlist **sem abrir portas, permissões ou acesso dos perfis anteriores**. Impedir coexistência perigosa de `.local` de outro perfil no mesmo checkout, endpoints externos ou Docker context remoto. Nenhuma criação/migração no banco preexistente `3200/15433` ou `3100/15432` e nenhuma cópia de arquivos MFA/DB/usuários de outros laboratórios.

Criar scripts de teste local de onboarding:
1. inicializar container/DB persistentes **somente mediante opt-in local explícito**;
2. aplicar migrations forward-only do código à DB própria, bootstrap IAM;
3. configurar um PAP_ADMIN **sintético** e papéis distintos de profissionais/comercial por fluxo seguro existente, com MFA próprio;
4. popular *apenas* o laboratório novo com pacientes/gestantes/atendimentos sintéticos **pelas APIs e regras de autorização**, ou fixture idempotente restrita a ambiente identificado/isolado, nunca em produção; demonstrar dashboards/clínico/admin sem abrir /vitrine;
5. testar login, primeiro acesso, MFA, convites, UBS, registros, auditoria, entrega de e-mails locais, relatórios, logout e retomada após restart;
6. parar/reiniciar mantendo os dados de homologação. Não fazer reset/deletar volume sem autorização explícita.

**Não reutilizar `~/projetos/pap-saude-prod-preview` em detached HEAD como laboratório persistente.** Manter pasta separada, por ex. `~/projetos/pap-saude-p0-unified-rc`. Scripts devem apresentar comandos exatos, verificações de porta, perfil, permissões, status e como abrir a UI. O runner descartável 3500 continua útil para testes automatizados, mas NÃO é o produto homologável.

Se perfis 3600 ou infra local demandarem intervenção no operador, terminar essa etapa com instruções determinísticas sem executar contra recurso existente.

## 7. Build real, CI e release package

Bloqueio histórico: `next/font/google` baixa Inter/Geist/Geist Mono e proxy retorna `CONNECT 403`. Corrigir **na solução de build**, não mascarar:
- preferir tipografia licenciada, verificável, auto-hospedada (com licença e hash/fonte legítima), ou fallback system stack deliberado e aprovado visualmente; não usar bypass TLS, não mudar proxy, não fingir PASS. Não copiar fontes sem direito de redistribuição.
- `npm run build` executado com exit 0, `npm run start` smoke real, SSR/hidratação, routes, CSS, `next/font`, e `docker build` web runner e migrator íntegros;
- testar TypeScript/lint/tests Node e Playwright atuais, regressões Admin/F03/F04/IAM/MFA, Prisma validate, migration replay/drift, p0-full, runtime DB ACL, audit invariants, scanners de segurança e política de release;
- CI remoto do SHA candidato obrigatório, com trigger de branch/PR que **não publique nem faça deploy**. Verificar allowlists de scripts de CI, sem desligar guards. `publish` e `deploy` em `prod` devem permanecer exclusivos; nenhuma atualização de `prod` nesta missão;
- validar uma auditoria npm de dependências (risco/mitigação fundamentados), Trivy web/migrator e no-change de segredos; não tratar HIGH/CRITICAL como aprovação automática;
- produto deve poder iniciar em `NODE_ENV=production` com imagem de release e bancos/roles corretos, não só Next dev.

Gerar `docs/release/p0-premium-unified/`:
- `ARCHITECTURE.md`: fluxos UI↔serviços e matriz roles/rotas;
- `LOCAL-HOMOLOGATION.md`: roteiro do laboratório persistente3600, scripts, contas sintéticas e e-mails locais sem expor segredos;
- `EVIDENCE.md`: SHA, resultados/contagens/testes/log hashes e capturas320,390,768,1440 com Admin, clínico, login, MEOWS indisponível;
- `VPS-STAGING-PLAN.md`: **preparação** de homologação na VPS, não deploy: inventário de versões Docker/migrator/Prisma, imagem por SHA/digest, segredos privados, HTTPS/proxy, portas, healthchecks, fail-closed, roles SQL mínimos, limites 4 GB/2 vCPU a verificar, monitoramento sem PII, smoke, backup e restore em ambiente descartável, avanço/rollback de imagens e migrations, pontos de parada;
- `GO-NO-GO.md`: checklist de risco clínico, autorização, build, segurança, QA visual, perfis e decisão explícita.

VPS: não presumir que é possível rodar staging no mesmo banco de produção. Não executar `ssh`, deploy, `docker compose up`, `migrate deploy` no servidor, alterar DNS, variáveis ou segredos, sem ordem separada do operador. A documentação deve permitir uma **homologação controlada**, com staging/ambiente isolado e backup verificado, depois que os gates locais/CI estiverem verdes. **Push em `prod` aciona deploy automático; proibido sem GO formal.**

Não declarar plataforma clínica homologada apenas por testes de software. MEOWS do operacional continua `DRAFT_UNVALIDATED` e nenhuma conduta automática. RNDS e IA clínica não homologadas não entram em produção só por UI.

## 8. Testes de aceitação do usuário — E2E obrigatórios

Cobrir com contas e dados inteiramente sintéticos num banco local próprio:
A. Admin: login/CAPTCHA/MFA, `/admin` com dashboard Premium animado e métricas reais da DB; usuários, org/rede/UBS, convites, autorização, inbox e auditoria, sem links inválidos.
B. Profissional UBS: login/MFA, `/dashboard` Premium com 4 (ou mais, se validados) KPIs reais, sem fixtures; Registro cria paciente/gestação/atendimento real no DB **do laboratório próprio**; depois Pacientes→Ficha→Atendimentos→Dashboard mostra persistência e contagens coerentes; F5 e restart preservam.
C. Integridade: finalize encontro, edições proibidas; retry idempotente; remova permissão/UBS e novas leituras/escritas são negadas.
D. Comercial: `/comercial`, `/vitrine` premium demo; não obtém leitura de `/dashboard`/APIs clínicas ou admin.
E. Sem MFA / sem consentimento/permissão: bloquear páginas HTML/RSC/API, inclusive URLs diretas e transições cliente; alterar client nav não eleva acesso.
F. UI: 320,375,390,430,768,1440; teclado Tab/Enter/Escape; foco, reduced motion, animações, sidebar, modais, overflow, contraste, acessibilidade; screenshots **do operacional Admin e clínico**, não somente /vitrine.
G. Segurança: nenhuma PHI/PII em logs/capturas/evidências; testar acessos cruzados, função e contexto; sessão/cookies e portas; status e notificações honestos.
H. Build production, Docker image smoke, startup, shutdown, migrations forward-only, ACL, recuperação e teste de backup/restore sintético. Nenhuma regressão de testes antigos reduzida para PASS.

Revisar sem quebrar os testes do P0 e nem a Vitrine já aprovada. Não eliminar asserts, desligar MFA, não aplicar `git add .` e não misturar alterações de branch.

## 9. Protocolo de execução e reporte

- Trabalhar exclusivamente em `feature/p0-premium-unified-rc`, HEAD inicial base `a34cd7ad...`; primeiro validar `git status`/head, inventariar preservação e testar antes/depois.
- Implementar em fatias: A) design tokens + shell clínico premium, B) Dashboard vivo, C) Registro/Pacientes/Atendimentos, D) Admin Premium e navegação role-aware, E) laboratório persistente3600 + local mail, F) build/fonts, testes e release readiness.
- Após cada fatia, testes pertinentes, **commit seletivo e push feature**; só avançar após PASS ou bloqueio documentado. Preservar worktrees e alterações preexistentes; sem rebase/merge `prod`.
- Não iniciar nova missão ad hoc, não reduzir escopo silenciosamente. Se achado impedir release, deixar NO-GO com caminho de correção concreto.
- Entregar branch/SHA/links de código/commits, changelog, testes PASS/FAIL/BLOCKED, comandos WSL do **sistema inteiro** na3600, captures, demonstração do Admin e Clinical DB próprio persistente, build+CI+Docker/status, plano VPS e riscos.
- **Parar para homologação humana na 3600** e para aprovação separada de deploy em ambiente VPS staging. Não fazer PR, merge ou deploy automaticamente.

**Critério de conclusão:** usuário entra uma vez em PAP Saúde P0, vê Admin Premium e Clínica Premium (conforme papel), trabalha com entidades persistentes no banco **local sintético da homologação**, mantém Vitrine DEMO independente, com teste e build reais PASS; candidata tecnicamente qualificada para homologação controlada na VPS. Caso ainda existam bloqueios, emitir NO-GO e **não declarar pronta**.