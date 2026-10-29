# PAP Saúde P0 — Integração seletiva da Vitrine Premium 2.0

**Estado:** INÍCIO AUTORIZADO para integração técnica na branch isolada, **não** para PR, merge, deploy, liberação clínica ou modificação da `prod`.

- **Repositório:** `joaoCarlosGM/pap-saude`
- **Branch de destino:** `feature/p0-vitrine-premium2-integration`
- **Base imutável de comparação (P0):** `codex/p0-full-implementation` @ `7526cb95454017ede8a77113f91ce3b43e2dc7df`
- **Fonte visual/demonstrativa:** `feature/prod-vitrine-ui-refresh` @ `64fc7a9317159436c36c801051ed2065d29547af`
- **Relatório da origem:** `docs/vitrine/PREMIUM-2-RELATORIO-FINAL.md` na branch de origem.
- **Referência de integração da origem:** `docs/vitrine/PREMIUM-2-INTEGRACAO-P0.md`.

## 1. Objetivo e fronteiras

Portar seletivamente a experiência Premium 2.0 para as rotas **`/vitrine`** do P0, mantendo o produto clínico operacional independente. A Vitrine é um demonstrador sintético na plataforma P0, **não** uma substituição dos componentes clínicos oficiais nem uma ativação assistencial do PAP-MEOWS.

Preservar os controles já presentes no P0:
- `src/app/(showcase)/vitrine/layout.tsx` exige `requireCommercialPageSession()`, com redirecionamento para MFA pendente;
- `src/server/demo/commercial-access.service.ts` exige sessão válida, MFA operacional e concessão **explícita** `COMMERCIAL` + `commercial.read`; não liberar vitrine implicitamente para PAP_ADMIN/PAP_MANAGER;
- `src/app/api/vitrine/[section]/route.ts` possui verificação de origem, separação de contexto, validação de entrada e sem escrita clínica;
- `src/app/(dashboard)/layout.tsx` exige `requireClinicalPageSession()`.

**Proibições:** Não alterar sessão, MFA, IAM, guards, esquema Prisma, migrações, banco, APIs clínicas, motor `src/server/meows/*`, Docker/VPS/CI/CD, nem as páginas operacionais `/dashboard`, `/registro`, `/pacientes`, etc., nesta integração. Não fazer merge direto da branch de origem, que é uma aplicação mock independente.

## 2. Decisão arquitetural

O P0 já possui rotas `src/app/(showcase)/vitrine/page.tsx` e `[section]/page.tsx` e `DemoExplorer` legado. Substituir **somente a apresentação** dessas rotas por um host da Premium 2.0 com estado sintético próprio. Idealmente manter todo código novo sob **namespace próprio**, por exemplo `src/features/vitrine-premium/{components,lib,styles}`, adaptando imports para não colidir com `src/components/layout/*`, `src/lib/demo/types.ts`, `src/lib/meows.ts` e componentes clínicos P0.

O layout server de `/vitrine` deve executar os guards **antes** de montar o host client; usar o `DemoProvider` Premium **dentro** desse limite. Nenhum import de `@/server/clinical`, `@/server/db`, `@/lib/clinical-api` nem fetch de `/api/clinical/*` no grafo de componentes demonstrativos.

Preservar o menu comercial de retorno para `/comercial` e identificação inequívoca de sessão demonstrativa. Evitar duplicar barras superiores; manter sidebar branca Premium, perfil sintético (Ana Paula/município/UBS fictícios), Ajuda, tutorial, modal de aviso e restauração.

## 3. Rotas — prevenir fuga do modo demonstração

O app da origem navega em caminhos raiz (`/dashboard`, `/registro`, `/pacientes/[id]`). **NENHUM deles pode ser usado como destino interno na Vitrine do P0.**

- `/vitrine` → Dashboard Premium.
- `/vitrine/dashboard` → Dashboard Premium (alias, se conveniente).
- `/vitrine/registro`, `/vitrine/atendimentos`, `/vitrine/pacientes`, `/vitrine/chat`, `/vitrine/protocolos`, `/vitrine/ferramentas`, `/vitrine/cursos`, `/vitrine/configuracoes`, `/vitrine/ajuda` → módulos Premium correspondentes.
- `/vitrine/pacientes/[id]` → prontuário **sintético** exclusivo, com guarda server comercial e checagem de ID da fixture Premium (404 para desconhecido/real).
- Preservar/estender `isDemoSection` e as validações de rota sem permitir URL arbitrária ou parâmetros de tenant; adaptar o mapa de rotas, Sidebar, Chat, cartão da paciente, linhas de atendimento, lista recente e tutorial; garantir que navegação pelo teclado e botões internos não chamem rotas clínicas reais.
- Acesso direto por URL a qualquer rota Premium deve exigir sessão comercial/MFA; no client, não tratar `demo=true` em querystring como concessão.

## 4. UX fiel à Premium 2.0

Preservar os componentes visuais aprovados:
1. Sidebar branca, indicador rosa deslizante, perfil sintético, município/UF/UBS editáveis no estado DEMO, Configurações no rodapé, Ajuda/Avisos e retorno ao Comercial;
2. Topbar verde e faixa horizontal removidas apenas da Vitrine, sem mexer no shell clínico P0;
3. Interações de cartões de pacientes, linhas/cards de atendimentos e recentes;
4. Robô do Chat IA com três estrelas `#EC268F`, animações discretas e `prefers-reduced-motion`;
5. Entrada progressiva dos KPIs, contadores, gráficos, transições curtas de navegação, sem modificar indicadores;
6. Modal de boas-vindas no primeiro acesso à sessão demonstrativa, aviso de que TODOS os dados são fictícios, opção de tutorial ou exploração livre;
7. Tour real de seis etapas com foco, Escape, skip/reinício, mudança de rota e mobile;
8. Oito KPIs derivados de estado **sintético**; cinco etapas do Registro, dados não aferidos, histórico, alergias, medicações, comorbidades, filtros, prontuário e evolução;
9. Coerência de identidade visual e responsividade 320, 375, 390, 430, 768 e 1440 px.

Cuidado com estilos globais de `workspace.css`, Tailwind e temas P0: isolar estilos Premium para que não alterem `/comercial` nem páginas clínicas reais. Não substituir `src/components/layout/DashboardShell.tsx` operacional por versão mock.

## 5. PAP-MEOWS — fronteira clínica mandatória

A Vitrine Premium já contém `src/lib/demo/meows.ts` (origem), 55 testes de motor, 6 de integração, avaliação/snapshot em memória e rótulos de origem. Portar **apenas** como motor **DEMONSTRATIVE_NOT_CLINICALLY_VALIDATED** dentro do namespace de Vitrine. Registro, Resultado, Atendimento, Evolução e Dashboard da Vitrine podem usar esse cálculo sintético.

**NUNCA** substituir ou reexportar globalmente o `src/server/meows/*` do P0: a política clínica oficial atual está como `PAP_MEOWS_V1_REAVALIACAO`, `1.0-draft`, `DRAFT_UNVALIDATED`, `clinicallyValidated:false`, com total/alerta nulos, conforme `docs/release/2026-10-26/p0-remediation/09-meows-operational-state.md`.

Não transpor os rótulos `ilustrativo` para registros clínicos reais, mas preservá-los para **fixtures DEMO**, diferenciando `ILLUSTRATIVE_FIXTURE` de `PAP_MEOWS_DEMO`. Escore 0 = 'Sem alerta pelo score' na demonstração, **não** diagnóstico de baixo risco clínico. Nenhum algoritmo demo poderá produzir recomendação terapêutica, encaminhamento ou alerta operacional.

## 6. Persistência, autorização e privacidade

- Registros e preferências clínicas sintéticos permanecem na memória do host Premium; recarregar/restaurar descarta mudanças; `sessionStorage` só pode manter flag de apresentação do tutorial, sem PHI/PII.
- Não enviar CPF, nomes, sinais vitais ou conteúdo demonstrativo a serviços de produção ou endpoints clínicos.
- Se preservar `/api/vitrine/*` legado, manter seu contrato isolado e suas proteções, e não ligar a camada Premium a ele sem necessidade comprovada.
- Impedir acesso público anônimo à Vitrine: preserve a autorização comercial P0. Alteração de política de acesso exige autorização separada.
- Não acessar dados reais de pacientes nem conectar org/UBS reais às opções sintéticas de configuração.

## 7. Testes e aceite

**Segurança (obrigatórios):**
- Usuário anônimo, sem MFA ou sem concessão COMMERCIAL: bloqueado em `/vitrine` e cada subrota, inclusive paciente sintético por URL direta;
- COMMERCIAL + MFA: Vitrine acessível, mas nenhuma permissão clínica criada;
- `tests/p0-full/demo-boundaries.test.ts` continua válido ou é atualizado preservando/excedendo o contrato de isolamento e demonstrando contagens do DB clínico iguais antes/depois;
- Nenhuma chamada `/api/clinical/*` na navegação Premium, mesmo ao salvar e restaurar;
- Nenhum link interno de paciente/registro conduz a `/pacientes`, `/registro` ou `/dashboard` operacional.

**Funcional/UX:** rodada com 76/76 Node Premium (adaptados, não apenas copiados), navegação por cartões, 6 etapas do tour, badges de origem, calculado/INCOMPLETO/CRÍTICO do MEOWS, dados e indicadores coerentes; componentes em seis larguras; foco, Escape, reduzido movimento; nenhuma regressão das páginas reais.

**P0:** executar TypeScript, lint, testes de auth/MFA/IAM, `tests/clinical/meows-*.test.ts`, `tests/release/p0-meows-operational-state.test.ts`, runtime clínico isolado e suites de fronteira da Vitrine. Usar **somente** infraestrutura isolada de testes aprovada para P0; nunca rodar migrações/bancos no servidor VPS nem no laboratório existente sem controle. Diferenciar PASS, FAIL, BLOCKED. `npm run build` é obrigatório em ambiente com acesso legítimo às fontes; persistindo CONNECT403, reportar como BLOCKED, não PASS.

**Evidências:** screenshots comparáveis em desktop/mobile, inventário de alterações, relatório de segurança, resultados dos testes e SHA final.

## 8. Workflow e parada

1. Confirmar a branch base e conferir `git status`. Preservar alterações locais.
2. Trabalhar **somente** em `feature/p0-vitrine-premium2-integration` (ou worktree separado dessa branch); não tocar no workspace da porta 3200 antes de passar testes dirigidos.
3. Commits pequenos e seletivos: `feat(vitrine): ...`, `test(vitrine): ...`, `docs(vitrine): ...`. Nunca `git add .` indiscriminadamente.
4. Push apenas na branch de integração. **Não abrir PR, não mesclar, não deployar** sem nova aprovação.
5. Iniciar preview integrado em porta livre e isolada (por exemplo 3500); após estabilidade, preparar homologação manual controlada no P0/3200 mantendo intacto o laboratório preexistente.
6. Encerrar com SHA, arquivos, testes PASS/FAIL/BLOCKED, comprovação de isolamento e comandos de preview. **Parar para aprovação humana** antes de qualquer merge ou publicação.

## 9. Risco especial

A origem Premium usa rotas e nomes absolutos incompatíveis com o P0. Fazer cherry-pick ou merge direto importaria mocks para as rotas clínicas, poderia substituir componentes e/ou interferir em guards; **explicitamente proibido**. O desafio desta missão é integrar a UX sem atravessar a fronteira operacional.