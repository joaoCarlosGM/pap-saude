# PAP Saúde — Plano de correção pós-homologação P0 e execução econômica no Codex

**Status:** especificação / não implementado. **Data:** 2026-10-27 (referência operacional de homologação). **Linguagem:** pt-BR.

## 0. Base verificada e regras de preservação

- GitHub: `joaoCarlosGM/pap-saude`.
- Branch-base: `codex/p0-local-acceptance`, SHA `e3c0cbc18ffa98be64470a7153b1e798a00fbe14` (inclui perfil `local:p0`). Sua ancestral `codex/p0-remediation-review-20261026` em SHA `8b81b486e29f603f082ac63e159d5621ecc4ff84` tem CI GitHub Actions `40509471057` SUCCESS, **não** substitui homologação manual ou produção.
- Checkout manual do operador: `~/projetos/pap-saude-p0-acceptance`, branch `test/p0-acceptance`, Node 22, aplicativo `127.0.0.1:3200`, PostgreSQL `127.0.0.1:15433`, banco `pap_p0_acceptance`, container `pap-p0-acceptance-db`, volume `pap-p0-acceptance-data`, segredo MFA em `.local/pap-p0-acceptance`.
- Há laboratório antigo distinto e dados de homologação P0 já criados. **Não** alterar os dois laboratórios, seus dados, fatores MFA, containers, volumes ou configurações locais. Não executar reset de banco, `prisma migrate reset`, `db push`, `docker compose down -v`, `prune`, `git reset --hard`, overwrite de `.local`, nem reinicializar contas.
- Criar branch de implementação **separada**, sugerida `codex/p0-post-acceptance-ux-security`, a partir de `e3c0cbc`; trabalhar em worktree/clone isolado, sem trocar a branch do laboratório do operador. Nenhum push a `develop`, `prod`, deploy VPS ou merge automático. Não alterar serviços n8n/Resend existentes.
- Homologação manual já realizada pelo operador: autenticação e MFA PAP_ADMIN 7/7; Comercial 7/7; adesão e ativação UBS 7/7. Registros clínicos foram salvos na interface, mas integridade/autoria/conclusão, isolamento inter-UBS e persistência de dashboard/configurações continuam pendentes. Nunca afirmar que esses gates passaram sem evidência.
- Código P0 de referência: `src/components/auth/LoginSecurity.tsx`, `src/app/(auth)/login/page.tsx`, `src/server/auth/login.service.ts`, `src/server/demo/commercial-access.service.ts`, `src/app/(dashboard)/configuracoes/page.tsx`, `src/lib/mock-configuracao.ts`, `src/components/configuracoes/ProfileSettings.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/lib/mock-dashboard.ts`, `src/server/demo/fixtures.ts`, `src/app/(showcase)/vitrine/*`, `src/components/dashboard/ClinicalDashboardView.tsx`, `src/components/admin/{OrganizationsAdminClient,BetaRequestsClient,BetaInvitationsClient}.tsx`.

## 1. Registros de problemas e decisões (12 itens)

| ID | Prioridade | Problema ou decisão | Critério de aceite |
|---|---|---|---|
| P0-UX-001 | Alta | `/configuracoes` mostra `mockUserSettings` (Ana Paula, COREN fictício); "Salvar alterações" não persiste | Identidade real da sessão, dados de perfil autorizados e persistência verificada após F5; campos sem backend ficam indisponíveis; papel/escopo/registro profissional verificado não editáveis pelo cliente |
| P0-UX-002 | Média | Sidebar PAP Admin mostra scrollbar vertical e item `Comercial` sem função para Admin | Ocultar *visualmente* scrollbar, manter scroll, teclado e acessibilidade; ocultar placeholder `/admin/comercial` do menu sem alterar autorização de `/comercial` nem excluir funcionalidades úteis |
| P0-DATA-003 | **Crítica para liberação operacional** | Dashboard clínico mostra KPIs fictícios `128`, `342`, `7`, `96%`, etc. | Nenhum mock no modo operacional. Contagens/series do backend escopadas por tenant/UBS; métricas ausentes `Sem dados`; proibir métricas derivadas de MEOWS não validado |
| P0-UX-004 | Baixa | Mensagem "Se a conta existir" confunde usuário | Texto claro e neutro, preservando prevenção a enumeração; backend já consulta conta e deve manter mesma resposta pública |
| P0-SEC-005 | Gate de segurança | Reset de senha via link não exigiu TOTP no ato | Verificar e testar login pós-reset **com MFA ainda obrigatório**, fatores preservados, sessões revogadas, tokens de uso único; não assumir falha de segurança somente por não pedir TOTP no reset |
| P0-SEC-006 | **Crítica para política desejada** | Comercial sem TOTP consegue login. Política alvo exige MFA para todos | Todas as contas e perfis (PAP_ADMIN, PAP_MANAGER, COMMERCIAL, HEALTH_UNIT_ADMIN, PROFESSIONAL e futuros papéis) bloqueados de operações até inscrição TOTP; exceções somente rotas necessárias para concluir inscrição/recuperação; sessão de acesso incompleta nunca dá acesso por API; preservar fatores atuais |
| P0-UX-007 | Alta | `/vitrine` não representa a plataforma profissional | Reutilizar mesma UI e jornadas, com dados exclusivamente sintéticos, comportamento demonstrativo sem escrita em banco clínico; visual igual ao modo operacional |
| P0-SEC-008 | Alta | CAPTCHA textual próprio no login | Desafio aleatório emitido no backend, resposta nunca no HTML/JSON, hash ou storage seguro, expiração, uso único, verificação atômica do lado servidor e limites de tentativas; alternativa acessível, teclado, erro claro; nenhum widget fictício; CAPTCHA é defesa adicional, não substitui MFA/rate limit |
| P0-UX-009 | Alta | Aprovações espalhadas, filtros escondem trabalho, hierarquia pouco navegável | Central de Pendências com contagem real, lista visível **sem aplicar filtro**, filtros opcionais; ações/status coerentes; notificações persistidas e escopadas; município → UBS → responsáveis/profissionais/convites/solicitações |
| P0-UX-010 | Alta / primeira entrega | Novo login moderno e simples com fotografia real na lateral | Implementar referência HTML aprovada, responsivo; estados reais LOGIN/MFA/CHANGE/primeiro acesso; links reais e feedback adequado; não colar JS demonstrativo nem autenticação falsa |
| P0-UX-011 | Média | Dashboard clínico com faixa verde superior dominante e sidebar rígida | Header claro/compacto, sidebar expandida/ícones/recolhida, responsiva, atalhos, tooltips e `aria-label`, persistência da preferência visual; scrollbar escondida sem remover rolagem |
| P0-ARCH-012 | Alta / arquitetura | UI clínica e vitrine são duas experiências divergentes; ícone IA sem efeito | Shell, navegação e componentes compartilhados com provedores de dados REAL/DEMO separados **no servidor**, nunca só por flag cliente; animação SVG/CSS discreta com estrelinhas no ícone IA nos dois modos, respeitando `prefers-reduced-motion` |

**Requisitos transversais:** UI em pt-BR, identidade verde-petróleo/rosa, excelente contraste e navegação por teclado, componentes leves, acessibilidade, layout desktop/mobile. Não introduzir perfis falsos, dados de saúde reais em demos, pontuações/condutas automáticas de MEOWS não homologado ou permissões implícitas.

## 2. Referência aprovada de login

O operador aprovou a prévia `pap-saude-login-foto-real.html` criada nesta conversa (anexar esse HTML ao Codex, junto com este plano, ou fornecer a referência visual equivalente). A prévia é **somente protótipo**, seu JS simula login/MFA e o CAPTCHA é inerte: **não transportar lógica demo para a aplicação**.

Direção visual: cartão branco sobre fundo suave; painel fotográfico à esquerda com fotografia profissional real de equipe de saúde, overlay verde-petróleo escuro e título "Mais tempo para cuidar. Mais clareza para decidir."; formulário limpo à direita com logo PAP Saúde, e-mail, senha, mostrar/ocultar senha, recuperação, botão principal; em mobile, ocultar imagem e manter boa hierarquia. Tela de MFA separada; estados de erro, bloqueio, primeiro acesso, troca forçada de senha e recuperação com identidade visual consistente. Usar asset de fotografia com licença verificada, preferencialmente estático em `public/`, dimensão otimizada, alt apropriado/crédito conforme licença e sem depender de API remota em runtime. Referência do HTML aponta Pexels `https://images.pexels.com/photos/6129243/pexels-photo-6129243.jpeg` (verificar licenciamento/atribuição antes de incorporar). Nenhuma font binária extra.

**Regra de segurança:** durante o primeiro slice visual, não exibir CAPTCHA decorativo/inoperante em produção. Em segundo slice instalar desafio + validação real no backend e então ativar o campo no login. Não comprometer a autenticação atual para imitar o mockup.

## 3. Plano sequencial de execução (um slice por vez)

### Slice A — Login real com fotografia (ENTREGAR PRIMEIRO)

- Base limpa a partir de SHA especificado; explorar somente componentes relevantes. Editar especialmente `src/components/auth/LoginSecurity.tsx` e estilos de autenticação existentes, e recursos estáticos necessários. Preservar lógica de submit, endpoints, bloqueio MFA, mensagens de erro, recuperação, primeiro acesso e troca de senha. Não redesenhar o backend de autenticação neste slice.
- Estilos isolados em módulo/CSS apropriado, sem quebrar primeiro acesso ou Admin. `autocomplete`, labels, estado loading, focus-visible, mostrar senha e responsividade corretos. Não aceitar credenciais em preview externo; testes no app WSL via perfil isolado.
- Testes direcionados: TypeScript + lint apenas arquivos mudados + testes de login existentes + smoke browser login real, MFA e erro; smoke viewport mobile. Sem F03/F04 completas.
- Commit somente arquivos necessários e push à **branch de feature** após PASS, por exemplo `feat(auth-ui): redesign PAP login with photo`. Parar e reportar para homologação visual do operador antes de alterar segurança.

### Slice B — MFA obrigatório universal + CAPTCHA textual próprio

- Tornar a regra de MFA dependente da identidade **em todos os perfis**, não de papel específico: se fator ativo, exigir desafio; se ausente, sessão de pré-inscrição de escopo mínimo que só permita cadastrar/confirmar TOTP e concluir primeiros passos, com bloqueio em todas as APIs/rotas operacionais. Revisar `login`, `login-navigation`, `first-access`, `session guards`, `requireCommercialSession`, `requireClinicalPageSession`, Admin e endpoints, não só telas.
- Corrigir caminho Comercial atualmente explicitamente `optional MFA` para obrigatório; preservar sessões válidas de usuários existentes com fator, prover migração segura para identidades ainda não inscritas, impedindo acesso clínico anterior ao registro. MFA reset/recovery não deve virar bypass.
- CAPTCHA 5–6 símbolos legíveis, gerados com CSPRNG; desafio efêmero ligado à sessão/origem de login de modo seguro, resposta apenas server-side, prazo curto, validação atômica com consumo de uso único e limite de tentativas; evitar armazenar resposta plaintext ou enviá-la em HTML/JSON. Responder com mensagem genérica e possibilidade acessível alternativa (ex.: áudio protegido por mesmo protocolo, sem resposta pública). Quando a verificação não puder operar, falhar de modo seguro e informar usuário.
- Adicionar server enforcement no `/api/auth/login` e fluxos pertinentes. CAPTCHA case/ambiguidade sem confundir usuários. Não aplicar CAPTCHA toda vez que o usuário digita TOTP, salvo política explícita. Rate-limit atual permanece. Testar bot/replay/expiração/concorrência/origem e login com fator ativo/ausente, inclusive Comercial; recuperar senha → login → MFA.
- Commit/push isolado após testes direcionados. Não elevar privilégio nem resetar MFA dos laboratórios.

### Slice C — Remoção de mocks operacionais e Configurações reais

- `/configuracoes`: remover `mockUserSettings` operacional; usar sessão autenticada + dados reais, DTO privado com validação estrita e apenas campos permitidos. Nome e meios de contato persistentes se modelos suportarem; quando não suportados, exibir leitura/indisponível e apontar migration aditiva proposta separada (não criá-la sem justificativa). E-mail de login, papel, vínculo institucional e registro profissional verificado não podem ser alterados diretamente.
- Corrigir identidade exibida no header/sidebar para utilizar a conta real. Botão Salvar somente se endpoint realmente persiste; confirmação só após resposta OK; testar F5 e dois usuários distintos.
- `/dashboard`: retirar import `mock-dashboard` da rota operacional. Reusar UI, mas KPIs e gráficos devem derivar de fonte servidora com RBAC e escopo da UBS/tenant. Não mostrar valores inventados nem riscos/urgências baseados em MEOWS não validado; usar `Sem dados` e mensagens honestas. Comparativos sem histórico suficiente não devem ser inventados. Evitar N+1 e exposição cross-tenant.
- Testes isolados de SQL/DTO/acesso, UI sem dados, outra UBS, profissionais com múltiplas UBS e status de gestação/atendimento. Lembrete: MEOWS permanece `DRAFT_UNVALIDATED` / `POLICY_UNRESOLVED` e não gera conduta automática.

### Slice D — PAP Admin: Central de Pendências e Rede hierárquica

- Criar entrada “Central de Pendências”: lista não filtrada de tudo que requer ação **do ator conectado** (UBS NEW, READY_FOR_ACTIVATION, atribuições de perfis PENDING_ASSIGNMENT, convites/decisões aplicáveis etc.), contadores reais e tabs/filtros opcionais. Não confundir convite enviado aguardando aceite com ação do Admin. Paginar, evitar N+1 e vazamento de dados de outras UBS.
- Gerar notificações persistidas/indicadores de pendência e deep link ao item correto, com badge de não lidas e comportamento idempotente; distinguir notificação de tarefa pendente.
- Trocar navegação técnica fragmentada por `Visão geral`, `Central de Pendências`, `Rede de Saúde`, `Pessoas e Acessos`, `Auditoria e Segurança`, mantendo caminhos existentes como alias/links para preservar compatibilidade. Município abre UBS filhas; UBS abre responsáveis, profissionais, vínculos, convites e solicitações com contexto escopado; `PAP_MANAGER` apenas suas competências, `PAP_ADMIN` global, `HEALTH_UNIT_ADMIN` sua UBS. Não permitir aumento de privilégio.
- Remover/ocultar `Comercial` placeholder de `/admin` se não for operável ou permitido, sem quebrar `/comercial`. Scrollbar visualmente oculta mas navegável. Testar tipos de status, decisões duplicadas, revogação, ativação, escalonamento e acesso cruzado.

### Slice E — Plataforma compartilhada e vitrine

- Refatorar **uma só UI** para operacional e demonstrativo: componentes clínicos, sidebar recolhível, header compacto e ações, dashboard, pacientes, atendimentos, registro, ferramentas, cursos, protocolos e Chat IA. Fontes independentes (`clinicalDataProvider` real/escopado no backend; `demoDataProvider` estritamente sintético/sem consulta clínica). Preferir composição de layouts/DTOs server-side; jamais usar `?demo=false`, cookie ou prop cliente como autorização.
- Demo usa IDs sintéticos e rotas separadas; proibir consultas e mutações de tabelas clínicas em `/vitrine` mesmo via APIs diretas; manter `mode=DEMO`, banner inequívoco e salvamentos fictícios identificados. Reutilizar jornadas completas do profissional, não placeholders genéricos. **Não copiar mock-dashboard para produção.** Dados sintéticos podem seguir o visual aprovado sem incorporar risco/score clínico validado.
- Header clínico claro e discreto (eliminar faixa verde dominante); sidebar expandida/compacta ícones/overlay mobile; estado visual de preferência por conta/navegador sem interferir em IAM; ícones Lucide consistentes e tooltips acessíveis. Chat IA: SVG/CSS com 2–3 estrelas animadas suavemente no ícone, mesmo componente nos dois modos; `prefers-reduced-motion: reduce` desabilita animação; não declarar IA funcional onde não houver serviço.
- Testes de paridade de componentes, cenários DEMO, CSP/escopo, negação comercial às APIs reais e isolamento em mobile/desktop.

### Slice F — acabamento, textos e gates

- UX de recuperação de acesso: mensagem pública neutra sem enumeração, erro real de rede não deve fingir sucesso; tela de redefinição não deve repetir texto do pedido de e-mail; confirmar senha com validação cliente/servidor, depois testar recuperação sem quebra de MFA. Não alterar política segura de token único/expiração/revogação de sessões.
- Revisão completa do escopo visual: tooltips, breadcrumb, acessibilidade, labels, contraste, teclado, estados vazios/erro/loading, scrolling, mobile, links e textos. Testar que notificações representam trabalho real, não mocks.
- Executar **uma única** bateria final integrada com TS/lint/testes críticos/CI+migrations smoke após todos os slices no SHA final. Só rodar novo gate se o SHA mudar. Sem deploy nem merge sem aprovação do operador. Documentar riscos remanescentes e distinguir desenvolvimento, aceite manual e prontidão de produção.

## 4. Política de economia de créditos (obrigatória)

1. **Um agente e um slice por execução**, sem subagentes concorrentes, sem auditoria geral repetida. Ler só os arquivos do slice e as dependências diretas. Usar este documento como fonte única dos requisitos: não reconstruir histórico de chats.
2. Antes de mudar: registrar SHA, tree limpa, diff mínimo e testes relevantes existentes. Usar trabalho já implementado; não reescrever serviços seguros só por estilo.
3. Em cada patch: testar com comandos dirigidos ao arquivo/comportamento; TypeScript quando necessário. Não rodar F03/F04 completas, `npm ci`, Docker builds, Prisma generate ou scans repetidamente sem alteração dependente.
4. Logs detalhados locais/artefatos; resposta ao usuário com **até 15 linhas úteis**: slice, commit, PASS/FAIL, arquivos principais, testes, bloqueios, próximo slice. Sem colar logs ou diff de milhares de linhas.
5. Após PASS, `git add -- <arquivos exatos>`, commit único/slice e push da feature; nunca `git add .`. Não tocar nos outros worktrees e não sobrescrever edições do operador. Não merge/deploy. Reutilizar a mesma branch de feature e reabrir contexto leve por slice.
6. Se encontrar bloqueio de alto risco, **parar naquele slice e explicar a decisão necessária**, não contornar controles. Alterações de schema somente aditivas, review prévio de migrations, nenhuma migração aplicada aos laboratórios do operador sem autorização.

## 5. Critérios globais de segurança e aceite

- Conta sintética de cada papel e MFA obrigatório; login, desafio CAPTCHA, TOTP, recovery codes, reset e logout testados, incluídos replay/expiração/rate limit.
- Não há dados demo no operacional nem dados de pacientes reais no demo. RBAC/tenant backend para todas as rotas, sem `PAP_ADMIN` ou `COMMERCIAL` receber acesso clínico implícito.
- Nome do profissional em sidebar/header/configurações corresponde ao usuário autenticado, com persistência real se campo editável.
- Ações de revisão e ativação preservam auditoria e distinção de estados; Central de Pendências não exige filtro para mostrar trabalho.
- Fluxo de registro clínico e APIs com integridade P0 previamente corrigida permanecem protegidos (idempotência, COMPLETED imutável salvo fluxo de revisão explícita, provenance `PROPOSED_NOT_APPLIED`). MEOWS não homologado permanece desabilitado para decisão clínica.
- Testes em laboratório separado e perfis de navegador separados; nunca usar dados reais de pacientes.
- **Bloqueios de produção continuam:** revisão clínica humana de MEOWS, staging real, backup/restauração, TLS/VPS e segredos, regras de branch, PR base e riscos de dependências. CI verde **não** autoriza deploy.

## 6. Ordem de aprovação

O operador deseja **ver o login fotográfico funcionando primeiro**. Executar **Slice A** e apresentar comando/URL de preview real para validação. Após aprovação do resultado, seguir B → C → D → E → F. Em cada slice, indicar o commit/push separado antes de iniciar o próximo. Não esperar para entregar todas as mudanças numa única resposta ou missão de múltiplas horas.
