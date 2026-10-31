# PAP Comercial Beta 1 — C00

Base obrigatória confirmada: `2c8b5134942293e7bd1795084469270a6da2bb90`.
Branch exclusiva: `feature/admin-beta-commercial-b1`.
O checkout foi criado a partir dessa base, com árvore limpa. Lockfiles e dependências
não mudaram; a instalação existente foi reutilizada. Outras worktrees foram preservadas.
Nenhuma conexão com VPS ou banco Beta/produção/laboratórios foi feita.

## Inventário funcional

| Área | Implementação existente | Trabalho desta missão |
|---|---|---|
| Comercial | `src/app/(auth)/comercial/page.tsx`, `CommercialWorkspace.tsx`: boas-vindas, apresentação, notificações, tema e logout | Liberar na Beta por política explícita; completar perfil real, navegação/foco, estados e responsividade |
| Autorização | `commercial-access.service.ts`: sessão, concessão GLOBAL COMMERCIAL system e commercial.read, MFA obrigatório em transação | Reutilizar; provar negativas, revogação, MFA pendente e ausência de privilégio Admin |
| Navegação/login | `login-navigation.service.ts` e destinos efetivos já encaminham Comercial verificado após onboarding | Preservar código e testar login, MFA, primeiro acesso e logout sem loops |
| Perfil | `/api/account/profile`, `own-profile.service.ts`, `OwnProfileSettings.tsx` | Reutilizar perfil da própria conta; sem alterar papéis/vínculos ou segredos |
| Notificações | `NotificationInbox.tsx` e `/api/account/notifications` | Reutilizar lista real, leitura e feedback; não inventar indicadores |
| Vitrine Premium | `src/app/(showcase)/vitrine`, `src/features/vitrine-premium`: dashboard, registro5 etapas, pacientes/atendimentos, chat simulado, protocolos, ferramentas, cursos, configurações, ajuda/tutorial | Disponibilizar módulos existentes em allowlist finita; verificar navegação e isolamento |
| Estado sintético | DemoProvider e catálogo local; testes congelam grafo sem fetch/API/Prisma | Preservar isolamento, motor MEOWS apenas demonstrativo e aviso de dados fictícios |
| Fronteiras Beta | `src/proxy.ts`, `admin-beta-policy.ts`, mapa gerado por `render-nginx.ts` | Sincronizar disponibilidade Next/Nginx, métodos e rotas dinâmicas |
| CI | Admin Beta existente publica somente na branch anterior e tem guard de contexto | Novo CI da feature somente valida/build/testa; nenhuma publicação de imagens |

O placeholder legado `/admin/comercial` não é o workspace; a superfície Comercial
é `/comercial`. Leads/propostas não possuem serviço homologado: apresentar limite
funcional honesto, sem dados ou métricas simuladas como reais.

## Política de disponibilidade escolhida

- Preservar `PAP_ADMIN_BETA_ONLY=1` e a negação padrão de caminhos desconhecidos.
- Novo opt-in **`PAP_BETA_COMMERCIAL_ENABLED=1`**: sem valor/0/valor inválido, o Admin
  Beta conserva exatamente sua disponibilidade atual. Sem ativação automática na VPS.
- Com opt-in, liberar GET/HEAD somente em `/comercial` e nos caminhos Premium enumerados
  pela missão. C01 abre o workspace; C03 completa as rotas finitas da Vitrine.
- Rotas dinâmicas aceitam exclusivamente identificadores sintéticos previstos. Não
  existe autorização genérica por prefixo `/vitrine/`.
- Premium não utiliza a API legada `/api/vitrine`; essa API permanece bloqueada na Beta.
  Os endpoints existentes da própria conta continuam protegidos por seus guards.
- Clínica, LMS operacional, APIs clínicas e rotas administrativas não ganham permissões.
  Admin/Manager não recebem acesso implícito à Vitrine: precisam de COMMERCIAL global.
- Gerar mapas Nginx para os dois modos a partir do mesmo contrato; homologar sua equivalência.
  A ativação futura exigirá alinhar flag e mapa, após revisão humana. Mapa/flag divergentes
  devem resultar em indisponibilidade, nunca em bypass dos guards da aplicação.

## Contratos preservados

Sessões, senha, MFA/TOTP e recuperação, IAM/transações, CSRF, auditoria, multitenancy,
catálogo clínico, KPIs aprovados, dados e progresso do operador permanecem inalterados.
Não há necessidade identificada de schema, migration, seed ou novas credenciais.
Não usar DemoProvider ou fixtures em componentes operacionais. Vitrine continua sintética.
Testar somente PostgreSQL/recursos descartáveis novos, identificados e com ownership.
Não utilizar portas/bancos5432,15436,3600 ou serviços existentes do executor/operador.

## Evidência C00

- `node --test tests/vitrine-premium/isolation.test.mjs`: **PASS 6/6**, zero skip.
  Log privado: `/tmp/pap-commercial-b1/c00-isolation.log`.
- `tsx --test tests/admin-beta-deployment/policy.test.ts tests/admin-beta-deployment/deployment.test.ts`:
  **PASS 6/6**, zero skip. Log: `/tmp/pap-commercial-b1/c00-admin-policy.log`.
- A base possui todos os módulos Premium solicitados. Não serão reimplementados.
- Build/Playwright/DB de integração da nova missão: **NOT RUN nesta etapa documental**;
  executar nos slices correspondentes e consolidar ao final.

## Checklist persistente

- [x] C00 inventário/base, contratos e política; testes de baseline dirigidos.
- [ ] C01 opt-in/Next/Nginx/workspace, testes de IAM/MFA e redirecionamentos isolados.
- [ ] C02 workspace Premium, perfil real, feedback, teclado/mobile/dark.
- [ ] C03 Vitrine finita, negativas HTTP/RSC/API, grafo sintético, navegador e build real.
- [ ] Relatório final, hashes/commits, CI de validação sem publish e homologação manual.

C00 modifica exclusivamente este documento. Comandos posteriores de ativação são
apenas instruções ao operador; não constituem autorização de deploy.
