# Continuidade — P0 Premium unificado

## Gate Premium — contraste durante a animação

Run40929820653/SHA6acb324 FAIL no caso WCAG (operational.spec.ts:77); operador forneceu a linha sanitizada, localizando a asserção. Reprodução controlada: congelar o primeiro frame das animações de entrada via CDP provocou color-contrast3,81–3,99:1 (mínimo4,5:1), sem alterar dados/guards/preferência de movimento. A opacidade.85 do contêiner e dos KPIs reduzia o contraste durante a entrada e o escalonamento.

Fix: remover apenas a opacidade de premium-enter; manter transform, tempos, escalonamento, contadores, gráficos e reduced-motion. Asserção WCAG original preservada em helper; novo teste congela o início da animação e verifica Admin e Clínica. Resultado atual: produção6/6 PASS, build real Node22 PASS, TypeScript/lint PASS. Logs privados: /tmp/pap-unified-tests-74wxXR/browser.log e /tmp/pap-unified-evidence/premium-contrast-production-build.log. Novo CI ainda obrigatório. Chromium local154; tentativa isolada de baixar156 para reproduzir o CI bloqueada por403 Domain forbidden; nenhuma dependência da aplicação reinstalada. Não repetir bateria global local.

## Gate B — contraste reproduzido e corrigido

CI40927491741 no SHA ccbe827: primeiro erro agora em Mission04 B; Premium, UI P0 e primeiro acesso/MFA executados antes da falha. Publicação/deploy SKIPPED. Reprodução B em cluster novo:4 jornadas PASS, Manager desktop/mobile/dark FAIL por color-contrast em15 nós da sidebar. Foreground/background intermediários2,29:1 e perfil1,30:1, mínimo4,5:1.

Fix somente em premium.css: transição restrita a transform/width, preservando movimento; superfície opaca e texto contrastante no perfil escuro, em classe dark e preferência do sistema. Reteste exato do caso falho PASS (desktop/mobile/dark, hover/foco, Axe WCAG AA e controles autorizados), sem alterar testes/asserts. Log privado /tmp/pap-unified-tests-ePxbYV/browser.log. Captura sintética mascarada manager-dark.png revisada visualmente. Nenhum backend, IAM, banco, fixture, timeout ou autenticação alterado. Build e gate completo serão confirmados pelo próximo CI, sem repetir os gates locais não afetados.

## Retomada dirigida — 29/10/2026

SHA publicado7671924; CI40890691031 FAIL especificamente no subprocesso browser do gate Premium. Operador confirmou o erro externo `browser FAIL`, sem identificação da asserção. API Forbidden e página pública exigindo login para o log detalhado. Não há causa funcional comprovada.

Reprodução Node22.23.4:137 testes Node PASS, seed/replay/backup/restore35 PASS, build real de checkout limpo PASS, artefato2/2 PASS, produção browser5/5 PASS. Não reinstaladas dependências. Logs privados/hash em /tmp/pap-unified-evidence/node22-ci-diagnosis.json. Não repetir esses gates sem motivo.

Correção restrita ao harness: emitir diagnóstico sanitizado antes da remoção do diff privado e encaminhá-lo ao CI quando o subprocesso falhar. Publicar apenas linha estática do teste/stack, categoria, matcher e escalares limitados; sem cookies, URLs, corpos, DOM, segredos ou diffs textuais. Asserts e aplicação intactos. Novos testes3/3, TypeScript, lint dirigido e navegador de produção5/5 PASS; evidências browser-diagnostics-* em /tmp/pap-unified-evidence. Próximo passo: commit seletivo na feature e CI do novo SHA; corrigir somente o primeiro erro comprovado. NO-GO permanece: CI, Docker/Trivy e laboratório persistente ainda não aprovados.

Branch `feature/p0-premium-unified-rc`; início `b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a`.
Worktree própria `/tmp/pap-p0-premium-unified`. Especificação lida integralmente.
Nenhuma alteração em outros laboratórios, produção, VPS ou checkout de preview.

| Etapa | Dependência / aceite | Estado |
|---|---|---|
| A | Apresentação compartilhada; shell clínico, identidade e menu autorizados; sem imports sintéticos | PASS dirigido |
| B | Quatro KPIs e gráficos reais; zero/ausência; navegação; MEOWS não homologado | PASS dirigido |
| C | Registro idempotente e listas/fichas reais preservados; Premium sem fixtures | PASS dirigido; E2E pendente |
| D | Admin completo, permissões e tour existentes; áreas por autorização | PASS dirigido; E2E pendente |
| E | Perfil persistente3600/15436 próprio, marcador, segredos privados, correio local, restart | Implementado; persistência BLOCKED por disco Docker |
| F | Fontes legítimas locais, build/start, regressões, Playwright, Docker, scanners e CI exato | Software PASS; Docker/CI/Beta/F03/F04 completos pendentes |
| Release | Arquitetura, evidências, homologação local/VPS e GO/NO-GO | Documentação pronta; NO-GO |

Commits/push seletivos apenas nesta feature, após testes pertinentes.
Próxima ação: núcleo de apresentação e shell; reutilizar contratos operacionais.
Sem PR, merge, deploy ou habilitação do MEOWS assistencial.

A: apresentação pura/links por concessão efetiva, identidade/vínculos reais na sidebar e tour clínico via engine existente. 6 testes PASS, next typegen, TypeScript, ESLint direcionado e diff PASS. Browser/release ainda NOT RUN. Dependências existentes reutilizadas por hardlinks, sem instalação.

B: 4/4 testes de perfil/dashboard real PASS em PostgreSQL novo descartável, incluindo dois tenants, vínculo encerrado/inativo, ausência de grants e contagens distintas. Logs privados /tmp/pap-unified-tests-91IEA9. Primeira tentativa falhou por origem CSRF ausente no harness; reteste após configurar a origem exata3110 passou sem alterar asserts/guards. TypeScript/lint PASS. Gráfico mantém zero; recentes navegam ao atendimento real; contrato de apresentação separado de lib/demo.

C: cards de pacientes, detalhes/filtragem/transições reais dos atendimentos, diálogo nativo e entrada entre etapas sem substituir o estado do wizard. Backend e contrato idempotente intactos. 32/32 regressões clínicas/conclusão concorrente/privacidade/MEOWS não homologado PASS em DB descartável; TypeScript/lint PASS. Log /tmp/pap-unified-tests-9Nf4JW/clinical.log. E2E de interação/persistência será executado no consolidado.

D: AdminShell/Sidebar/Topbar e métricas reais em rosa/branco, mantendo menu completo filtrado, busca, compactação, tour e estados suprimidos/sem dados. Alternância clínica/Admin/Comercial deriva do perfil efetivo nas áreas autorizadas. 27/27 testes B de governança/IAM PASS, TypeScript/lint PASS. Log /tmp/pap-unified-tests-UyzL01/iam.log. Guard comercial e Vitrine permanecem sem leitura de organizações clínicas.

E: perfil independente, CLI/mail/seed locais. 4 políticas legadas +14 perfil antigo +14 perfil novo +14 serviços de mail/provisionamento PASS. Seed real em PostgreSQL descartável15436 PASS:7 contas,3 pacientes/gestações/atendimentos, proveniência,0 fatores pré-configurados; replay não altera IDs/credenciais. Logs /tmp/pap-unified-seed-gvdYpZ. TypeScript/lint PASS. Tentativa de laboratório persistente próprio abortou initdb por No space left on device no armazenamento Docker; container pap-p0-unified-rc-db parado e volume vazio preservados, nenhum recurso desconhecido removido. Restart persistente NOT RUN. Primeiros testes novos continham duas portas antigas nos stubs; corrigidos só os stubs e repetidos14/14.

F/fontes: build real exit0, incluindo geração/otimização. Fontsource5.3.0 Inter/Geist/GeistMono OFL1.1, SHA512 dos pacotes e SHA256 dos6 arquivos. 2 testes de fontes PASS. Suíte UI12 apontou contraste no DEMO legado por aplicação indevida do novo escopo; diagnosticado seletor/razão1,74. Isolado premium-workspace ao operacional, sem alterar a Vitrine ou enfraquecer o assert Axe. Reteste dirigido em andamento.

F/E2E produção: Admin CAPTCHA/MFA/navegação, negativos HTML/RSC/API e teclado/reduced-motion passaram. Registro real/replay/F5/ficha/detalhes/KPIs passaram até a matriz320. Diagnóstico de overflow: link de pulo sem CSS era item flex de138px, comprimindo todo o conteúdo. Revertida hipótese de título menor (sem efeito); corrigido somente posicionamento do skip-link com foco acessível no escopo operacional. Reteste dirigido e build final em andamento. Auth/MFA completo PASS no DB próprio /tmp/pap-unified-tests-w3GxM8, sem tocar5432 existente.

F/produção: minificação reproduzida com esbuild: EncounterFinalizedError.name virava a, causandoHTTP500 indevido. Estabilizados nomes públicos de exceções de atendimento, paciente/vínculo e gestação, sem mudar validações, autorização, locks ou escrita. 1 teste cobre todas as classes minificadas e HTTP400/404;19 validações de domínio PASS. Invariante compara os serviços integralmente e normaliza somente atribuições this.name desses4 arquivos. Banco histórico intacto, 35 migrations reais (inclui pending_access_notifications), não34. Primeiro restore detectou a contagem antiga; assert alinhado à lista real congelada35, sem remover a conferência. Docker web/migrator tentados com configBuildx privada: ambos BLOCKED ENOSPC.

## Fechamento de implementação — não repetir a missão

Código funcional publicado até5d74e74; QA/CI/documentação em fechamento. Artefato standalone reconstruído sem arquivos privados, build/start real PASS. Cinco jornadas produção PASS no cluster próprio (43s), com16 capturas operacionais; UI13, domínio/presentation8, Auth186+crypto18, IAM27, concorrência32 e dashboard4 PASS. Node Vitrine80 e perfis29/serviços14 PASS; seed/replay/backup/restore35 PASS. Mapeamento HTTP de medição encerrada409 corrigiu a causa direta do500; nomes minificados eram achado adicional. Invariantes asseguram os serviços/guards/migrations intactos, exceto transporte/nomes explícitos e controles locais documentados.

Pendências: laboratório persistente3600 e Docker runner/migrator BLOCKED ENOSPC; Trivy NOT RUN; CI remoto completo do SHA final a confirmar (API Forbidden). Nenhum uso de volume/DB desconhecido; só caches do próprio build mal sucedido removidos por IDs específicos com evidência. Nunca prune global. Nenhum P0 antigo/credencial/MFA/VPS/prod alterado.

Próximo passo: publicar QA/CI somente na feature e confirmar SHA remoto; acompanhar o workflow quando acessível. Se bloqueado, entregar NO-GO com LOCAL-HOMOLOGATION/VPS-STAGING-PLAN e parar para operador, sem PR/merge/deploy. Não reinstalar, reimplementar ou repetir suítes aprovadas sem mudança relevante.

Último código funcional5fea936 (tour clínico com alvo Configurações e progresso real validado). Cinco jornadas produção PASS mais reteste dirigido1/1 do tour; build e artefato seguros após alteração. CLI/migratorPrisma7.10.1 e clientpkg7.10.0 correspondem aos lockfiles originais. Capturas16 são operacionais atuais. Nenhuma dependência foi reinstalada/atualizada.
