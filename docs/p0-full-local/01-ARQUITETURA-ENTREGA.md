# PAP Saúde — P0 Operacional Premium | Especificação de entrega local completa

> Status: ESPECIFICAÇÃO E BRANCH CRIADAS. **Código funcional desta nova etapa ainda não implementado**. Este documento não é aceite, release ou autorização de deploy.

## 0. Identidade, objetivo e bases imutáveis

- Repositório: `joaoCarlosGM/pap-saude`.
- Branch de trabalho: `feature/p0-premium-operational-local`.
- Base P0 integrada, autorizada para derivar: `feature/p0-vitrine-premium2-integration` @ `a34cd7adf62ec1aabda7a3d15ed24415f2a4c4d3`.
- Referência UX aprovada: `feature/prod-vitrine-ui-refresh` @ `64fc7a9317159436c36c801051ed2065d29547af`.
- P0 de referência antes da Vitrine: `codex/p0-full-implementation` @ `7526cb95454017ede8a77113f91ce3b43e2dc7df`.
- **Produto que o operador espera:** UM ÚNICO servidor Next.js local, com login, primeiro acesso, MFA, Administração P0, clínica P0, Dashboard Premium animado e Vitrine demonstrativa segregada; banco PostgreSQL local **persistente** e caixa de e-mail local; usuários acessam conforme seus papéis. Não é o preview descartável `/vitrine`/3500.
- Destino local de homologação proposto: `http://127.0.0.1:3600`, checkout novo `~/projetos/pap-saude-full-local`, banco local exclusivo em `127.0.0.1:15434`. Preservar 3100, 3200, 3300, 3400 e 3500. Não tocar no checkout `~/projetos/pap-saude-prod-preview` nem seus arquivos privados. A porta 3600 é um **novo laboratório persistente de ponta a ponta**, não um servidor demo de dados em memória.

## 1. Diagnóstico verificado

1. A integração anterior implementou a experiência Premium só nas rotas `/vitrine/*`, em `src/features/vitrine-premium/`, mantendo componentes administrativos e clínicos reais no visual anterior.
2. `/admin/*` está presente e protegido pelo P0, com organizações, pendências, usuários, convites, autorizações, métricas, segurança, auditoria e integrações.
3. `/dashboard`, `/registro`, `/pacientes`, `/atendimentos`, `/configuracoes` já possuem backend e/ou serviços clínicos operacionais; `/dashboard` atualmente usa `clinicalDashboard()` e `ClinicalDashboardView` e não o Dashboard Premium.
4. Admin global não obtém acesso a prontuário por ser admin. `requireClinicalPageSession()` exige vínculo HEALTH_UNIT apropriado e MFA; `accessDestination` redireciona com base nos papéis. Isso DEVE permanecer.
5. No Dashboard clínico real o serviço atual calcula **4 KPIs autorizados**, séries de atendimentos e recentes. O demonstrador contém 8 KPIs fictícios: **não é permitido substituir métricas reais por 8 números inventados**. Novos KPIs requerem definição, dados reais, autorização e testes.
6. `/chat`, `/protocolos`, `/ferramentas`, `/cursos` e `/casos` no P0 clínico são atualmente estados indisponíveis/sem integração; não dizer que funcionam. A nova UX pode mostrar estados 'Em implantação' com explicação, sem conectar simulador ao backend real.
7. O MEOWS operacional em `src/server/meows/*` é `DRAFT_UNVALIDATED`, sem score/alerta clínico definitivo. O motor da Vitrine é demonstrativo e não deve afetar as rotas clínicas.
8. O launcher `tests/vitrine-premium/run-integration.mjs --preview` é **descartável**, cria conta/banco temporários e desabilita e-mail. Não utilizá-lo como forma final de operar o P0 local persistente.

## 2. Resultado funcional esperado por contexto

| Contexto | URL | Fonte de dados | Entrega visual | Autorização |
| --- | --- | --- | --- | --- |
| Entrada / primeiro acesso | `/login`, `/primeiros-passos`, `/minha-seguranca` | Auth P0 | UX coerente, sem alteração das regras de MFA | contrato P0 existente |
| Administração | `/admin` e `/admin/*` | serviços admin/IAM P0 | Shell e dashboard Premium; gestão real preservada | `canAccessAdmin` e permissões por operação |
| Clínica | `/dashboard` e `/registro`, `/pacientes`, `/atendimentos`, `/configuracoes` | serviços clínicos P0 e PostgreSQL | Dashboard e navegação Premium, formulários reais e acessíveis | papel HEALTH_UNIT por unidade, MFA, guards P0 |
| Comercial | `/comercial` | serviços comerciais P0 | manter operacional, coerência visual sem trocar contrato | COMMERCIAL explícito e MFA |
| Vitrine | `/vitrine/*` | somente dados sintéticos, em memória | Premium 2.0 já integrada | COMMERCIAL e MFA, guards em cada folha |
| Páginas sem backend real | `/chat`, `/protocolos`, `/ferramentas`, `/cursos`, `/casos` | sem serviço homologado | estados vazios premium, informações honestas, sem conteúdo inventado | guard clínico existente |

## 3. Arquitetura: um aplicativo, vários workspaces autorizados

Uma única instância Next.js e UMA origem local 3600. Navegação de contexto exibe **somente** links disponíveis ao perfil autenticado (Administração, Clínica, Comercial/Vitrine). Selecionar o contexto nunca concede permissão; cada layout/API revalida IAM+MFA no servidor. Perfil com PAP_ADMIN apenas abre `/admin`, não prontuários. Para a **homologação sintética**, permitir provisão legítima e auditável de contas separadas ou múltiplos papéis explícitos numa conta de teste, nunca bypass/auto-grant silencioso.

Componentização sugerida:

- `src/components/premium-ui/`: primitivas visuais reutilizáveis (motion, cartões, contadores, charts, sidebar item, estados vazios, menu, badges), **sem imports do DemoProvider, fixtures ou serviços de negócio**.
- `src/components/layout/*` e `src/components/dashboard/*`: adaptar shell e Dashboard clínico existentes para usar primitivas com dados autorizados; manter fronteira Server Components/Client Components. A origem de dados continua `src/server/clinical-dashboard/clinical-dashboard.service.ts`.
- `src/components/admin/*`: aplicar a mesma linguagem de design premium ao `AdminShell`, `AdminSidebar` e KPIs do `BetaDashboardClient`, preservando dados/status suprimidos, intervalos, filtros e APIs reais de gestão.
- `src/features/vitrine-premium/*`: **não fundir** com a operação; permanece encapsulado e importável só via `/vitrine`.
- `src/server/*`: não alterar autenticação/IAM e lógica MEOWS. Se novas métricas operacionais forem definidas, adicionar consulta autorizada, testes por escopo e documentação antes da UI.
- Estilos: classes/tokens escopados para evitar aplicar `workspace.css`, variantes `.pap-demo` ou estados fictícios no Admin/Clínica. Evitar colisão de `DashboardShell` e import de tipos simulados no domínio operacional.

**Regra de ouro:** portar visual e animação, **não** portar `DemoProvider`, `initialDemo`, `saveDemo`, `seedPatients`, `DEMO_DATE` ou `calculateDemoMeows` às páginas clínicas reais.

## 4. UX premium exigida

- Sidebar clara com marca PAP Saúde, rosa `#EC268F`, indicador ativo deslizante, ícones, estados hover/active e animações breves; navegação muda conforme contexto e permissão. Administração pode ter agrupamentos distintos dos módulos clínicos para não esconder fluxos existentes.
- Perfil real: nome vindo da sessão, papel/contexto e organização da concessão válida; **nunca** 'Ana Paula'/UBS fictícia como profissional real.
- Um ponto de entrada para Administração/Clínica/Comercial se e somente se o usuário tem as permissões correspondentes; breadcrumbs, botão de segurança, notificações e logout existentes funcionais.
- Dashboard clínico: cartões KPIs com contadores animados a partir de valor final real, gráficos reais com entradas progressivas, Recentes clicáveis com autorização/escopo, ações rápidas. Não animar texto 'Suprimido', `null`, 'Indisponível', valores mascarados como 0. Não inventar tendências.
- Dashboard Admin: aplicar Premium ao resumo de governança, métricas, pendências e gestão; não suavizar ou eliminar supressão de coortes <5, permissões, filtros de organização, janelas UTC, fonte e carimbo temporal. O painel clínico e o administrativo são dashboards DIFERENTES no mesmo produto.
- Registro, Pacientes, Atendimentos: aparência coerente; preservar operações reais, lógica idempotente, identidade, histórico, controles de edição e estados de erros; cartões e linhas devem ter links acessíveis, sem navegação falsa a IDs sintéticos.
- Chat/Protocolos/Ferramentas/Cursos/Casos: renderizar um estado de indisponibilidade premium verdadeiro. O ícone com três estrelas pode ser usado decorativamente no Chat, sem fingir IA conectada.
- Tour: tour administrativo **existente** baseado em permissões, MFA onboarding **existente** e tour demonstrativo **existente** não devem ser unificados por substituição de política. Um tour clínico adicional pode ser novo, com rotas reais e targets reais, sem registrar paciente nem dados em storage.
- `prefers-reduced-motion`, foco visível, Escape, Tab, atalhos, animação sem bloqueio de navegação, feedback de loading/skeleton/empty/error; usabilidade 320, 375, 390, 430, 768 e 1440 px.

## 5. Entrega por fatias atômicas — commits + push por slice

**F00 — Preflight e inventário.** Conferir HEAD, diff da base P0, o que já funciona e o que é placeholder. Congelar hash dos guards, MEOWS operacional, serviços clínicos, workflows e migrações. Produzir baseline dos testes P0. Não codificar antes da inspeção. Registrar riscos e dependências.

**F01 — Biblioteca visual Premium agnóstica.** Extrair/adaptar `AnimatedMetric`, `PageMotion`, estilos de cartões/gráficos/indicador ativo do namespace demo para componentes independentes de dados. Testar valores 0, null, masked, strings e reduced motion, render estável SSR/hidratação. Evitar click capture global que cause navegação RSC duplicada.

**F02 — Dashboard clínico + shell operacional.** Aplicar biblioteca ao `ClinicalDashboardView`, `DashboardKpi`, `AttendanceChart`, `RecentAttendances`, `DashboardShell` e `Sidebar`. Usar `clinicalDashboard()` real. Sem mudar escopos, consultas, KPIs ou `requireClinicalPageSession`. Preservar valores reais, zero real e ausência de score, inclusive quando o banco está vazio. Integrar botões de navegação somente para destinos autorizados.

**F03 — Fluxos clínicos reais.** Harmonizar Registro/Patients/Atendimentos/Configurações com a nova UX, mantendo `RegistrationWizard` real, `submitClinicalRegistration`, `resumeClinicalRegistration`, deduplicação/idempotência e histórico real. Paciente, atendimento e vínculos nunca usam IDs demo. Testar em DB isolado com profissionais habilitados e auditoria intacta.

**F04 — Administração Premium.** Atualizar `AdminShell`, `AdminSidebar`, `AdminTopbar`, `BetaDashboardClient` e páginas gerenciais sem modificar API/IAM. Preservar Navegação por escopo, busca, filtros, tour admin baseado em permissões, notificações e gestão existente. Integrar gráficos e KPI animations com dados de API/admin reais e status suprimido.

**F05 — Entrada e navegação unificadas por perfil.** Menu/troca de workspace somente para papéis autorizados. Admin-only, clinician-only, multi-role e COMMERCIAL-only testados. Não dar acesso clínico a Admin, nem administrativo a profissional. MFA é exigido por fluxo operacional. Links não chamam rotas demo com contas reais.

**F06 — Laboratório local persistente completo.** Criar novo perfil rigorosamente isolado no launcher `scripts/local/dev.mjs` / `src/lib/local-lab-profiles.mjs`: nome `p0-full-local`, app 3600, DB 15434, DB name `pap_p0_full_local`, user `pap_full`, container `pap-p0-full-local-db`, volume `pap-p0-full-local-data`, pasta privada `.local/pap-p0-full-local`, marker `pap-local-p0-full`. Chaves e credenciais próprias; sem copiar `.env`, `.local`, MFA ou passwords de 3100/3200; sem Docker remoto; sem envio externo de e-mail. `PAP_EMAIL_PROVIDER=local-demo` para capturar correios com `local:mail --profile=p0-full-local`. Usar os contratos de isolamento pré-existentes, estendendo-os explicitamente e criando testes para o terceiro perfil; não enfraquecê-los nem reduzir verificações. Estado persistente entre restarts; backup seguro e migração forward-only apenas do banco novo. Contas de teste provisionadas conforme papéis efetivos, via serviços P0 e transações auditadas.

**F07 — Build, regressão e homologação.** Testar fluxos Admin/Clínica/Comercial/Vitrine, MFA/primeiro acesso, e-mails locais, persistência real, limites IAM, ausência de escape, animações/visual, browser mobile, TypeScript, ESLint, testes integrados, build real. Resolver Google Fonts CONNECT403 de modo legítimo (ambiente com acesso ou self-host aprovado, licença/fonte revisadas), sem TLS bypass/mock. Registrar PASS/FAIL/BLOCKED, não declarar pronto com build interrompido.

## 6. Critérios de aceite global

1. `http://127.0.0.1:3600/login` leva a **um** PAP Saúde completo, não à Vitrine automaticamente; apps Admin/Clínica/Comercial roteados pelo perfil.
2. PAP_ADMIN local vê Administração Premium com dados reais do banco local, consegue executar fluxos autorizados; sem acesso automático ao prontuário.
3. Profissional HEALTH_UNIT legítimo vê Dashboard clínico Premium com KPIs reais e consegue criar/retomar atendimento, pesquisar paciente e visualizar histórico; dados persistem após restart.
4. Perfil com ambas concessões explícitas alterna entre Admin e Clínica sem privilégio adicional. Comercial acessa `/vitrine/*` somente com grant explícito; dados fictícios continuam isolados.
5. Caixa de e-mails local lista convites/recuperações gerados neste laboratório, sem Resend nem envio externo; links apontam à origem 3600, não 3100/3200/3500.
6. Conjuntos auth/MFA/IAM/P0/MEOWS operacional, controles por organização, CSRF e limites de privacidade permanecem passando; Nenhum novo dado demo em tabelas reais.
7. Build real bem-sucedido e preview em produção local testado antes de release; CI e PR só com autorização posterior. Sem modificação em `prod`, VPS e laboratórios existentes.

## 7. Restrições e processo

- Não fazer merge/cherry-pick da aplicação `prod-vitrine-ui-refresh` nem mover arquivos de `src/features/vitrine-premium` inteiros para áreas reais sem remover dependências de demo.
- Não migrar schema para obter efeito visual. Qualquer mudança de esquema, IAM, autogestão de papel ou comportamento clínico exige um plano/aprovação específicos.
- Não ativar score/condutas do MEOWS real. Manter `DRAFT_UNVALIDATED` e total null. Vitrine calculadora = exemplo sintético.
- Não fabricar dados para preencher Dashboard vazio; usar empty states claros ou criar fixtures sintéticas em DB *exclusivo de teste* com indicação de desenvolvimento e sem misturar ambientes.
- Commits seletivos por F00–F07, `git add` arquivos exatos, `git diff --check`, push da branch feature após testes de cada slice. Não `git add .` indiscriminadamente.
- **Parar após entrega e testes da branch**, sem PR/merge/deploy sem nova aprovação. O usuário faz homologação local pelo navegador.
- Artefatos finais: relatório de implantação, matrix de autorização, inventário dos arquivos, logs sanitizados/hashes, screenshots, checklist, runbook de primeiro acesso, e-mail local, operação e parada segura.

## 8. O que 'completo' significa e o que não significa

**Completo para esta entrega** = uma única instalação P0 local persistente que contém autenticação/segurança, Admin real, clínica real, comercial/Vitrine, dados e fluxos existentes e identidade visual Premium coerente. Não equivale a integração de IA, RNDS, protocolos homologados, cursos, ferramentas ou MEOWS clínico validado. Esses serviços não existem operacionalmente neste checkpoint; devem constar explicitamente como futuras dependências, nunca como funcionalidades falsas.
