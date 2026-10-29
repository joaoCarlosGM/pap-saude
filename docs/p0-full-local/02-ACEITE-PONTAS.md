# P0 Premium operacional — Matriz de homologação de ponta a ponta

**Branch:** `feature/p0-premium-operational-local`. **Base:** `a34cd7adf62ec1aabda7a3d15ed24415f2a4c4d3`. Este documento é o **contrato de aceite futuro**, não evidencia testes executados na nova etapa.

## A. Gates obrigatórios antes da entrega

| Gate | Evidência exigida | Falha bloqueia? |
| --- | --- | --- |
| Integridade da base | diff byte a byte dos serviços de auth/IAM/MFA/MEOWS operacional/rotas API/Prisma, ou revisão explícita de qualquer mudança inevitável | SIM |
| Dados operacionais | Dashboard real de API/P0 em usuário HEALTH_UNIT, não fixtures demo, sem resultados falsos | SIM |
| Admin funcional | `/admin` e gestão respeitam permissões, métricas e supressão; links/ações continuam efetivos | SIM |
| Login e MFA | login, desafio e inscrição MFA, sessão revogada, logout e não autorizado, sem bypass | SIM |
| Banco persistente | após restart da aplicação e do DB local de **novo laboratório**, registros de teste autorizados continuam; preservar 3100/3200 | SIM |
| Caixa local | `local:mail` em perfil 3600 lista o e-mail capturado, corpo/links locais corretos, sem envio externo | SIM |
| UI Premium | animação, navegação, foco, responsividade e reduced motion; sem page errors e hydration mismatch | SIM |
| Isolamento demo | clínica nunca importa `DemoProvider`, nem `saveDemo`, nem calcula `calculateDemoMeows`; links `/vitrine` não acessam API clínica | SIM |
| Build | `npm run build` conclui em rede aprovada, sem TLS bypass ou mock, seguido de smoke `next start` | SIM |
| Observabilidade | logs sem CPF/senha/segredo/TOTP/links tokens, erros sanitizados, status por suíte | SIM |

## B. Matriz de perfis de teste — no mesmo banco local

Use somente identidades **sintéticas** criadas por mecanismos legítimos do P0; nenhuma conta recebe papel adicional implicitamente. Procedimentos de concessão devem deixar trilha de auditoria. Para as verificações abaixo, autenticação com MFA deve estar efetiva.

| Perfil | `/admin` | `/dashboard` | `/registro` | `/vitrine` |
| --- | --- | --- | --- | --- |
| Anônimo | NEGADO | NEGADO | NEGADO | NEGADO |
| PAP_ADMIN global, sem papel HEALTH_UNIT/COMMERCIAL | PERMITIDO no escopo de admin | NEGADO | NEGADO | NEGADO |
| Profissional HEALTH_UNIT com permissões apropriadas, sem PAP_ADMIN | NEGADO | PERMITIDO no escopo UBS | condicionado às permissões clínicas | NEGADO |
| COMMERCIAL explícito, sem clínica/admin | NEGADO | NEGADO | NEGADO | PERMITIDO |
| Conta de teste com concessões explícitas Admin + HEALTH_UNIT | PERMITIDO com escopo correto | PERMITIDO com escopo UBS correto | condicionado às permissões | somente com COMMERCIAL adicional |
| Sessão com MFA pendente | acesso operacional NEGADO/redirecionado | NEGADO | NEGADO | NEGADO |
| Papel/organização revogados após login | próxima requisição revalida grant | próxima requisição negada se perdeu grant | requisição negada | negada se perdeu COMMERCIAL |

Verificar rotas HTML e RSC por acesso direto, refresh, navegação client, deep link, API e ação. O switcher de contexto é **apenas** UI; não substitui autorização no servidor. Não inserir contexto arbitrário de organização via query para obter dados.

## C. Cenários clínicos

1. Sem pacientes/atendimentos: KPIs 0 reais, gráficos vazios e textos claros; score e riscos indisponíveis, sem séries artificialmente preenchidas.
2. Profissional autorizado na UBS sintética: criar paciente fictícia pela API/UI oficial; criar pré-natal e atendimento conforme regras reais, preencher vitais em fluxo P0, retomar operação idempotente e conferir histórico/atendimento/ficha e Dashboard real.
3. Reiniciar Next e container persistente 3600: paciente, atendimento e auditoria continuam. Não usar `--preview` descartável para esse teste.
4. Duas UBS sintéticas A/B: profissional de A não enxerga B; admin sem papel clínico também não lê dados A/B; dashboard usa apenas vínculos ativos e grants vigentes.
5. Conteúdo MEOWS operacional continua `DRAFT_UNVALIDATED` e total/alerta nulos; nenhum cálculo demo aparece na clínica, nem aviso fictício de 'baixo risco'.
6. Gráficos não fabricam denominador/comparativo/porcentagem; série de seis meses usa rótulos e UTC adotados pelo backend. Numérico 0 não se confunde com ausência e não sofre salto visual incorreto.
7. Cards de pacientes/atendimentos e detalhes são acessíveis com Enter/Tab; links válidos em rotas clínicas e autorizados. Não cair em `/vitrine/pacientes/*`.

## D. Cenários administrativos

1. Entrar como PAP_ADMIN e abrir `/admin`; Dashboard mostra métricas de organização autorizada, fonte, período e status. Mesmo tema Premium e interações fluidas.
2. Central de pendências, rede, usuários, convites, perfis/acessos, métricas, auditoria, segurança, integrações e monitoramento continuam navegáveis e permissionados.
3. Dados de coortes com menos de 5 pessoas continuam suprimidos (`Suprimido`, nunca 0 animado); filtros de organização, janelas UTC e carimbo de consulta preservados.
4. Criar convite para conta sintética; verificar gravação de fluxo P0 e captura da mensagem em caixa local (nunca Resend). Aceite, aprovação, senha e MFA seguem contrato existente.
5. A conta Admin **não** adquire acesso clínico por padrão. A troca explícita de contexto só aparece quando há grants efetivos.
6. Tour admin responde às permissões do perfil, funciona com teclado e reabertura. Não substitui onboarding de MFA.

## E. Comportamento Premium visual

- Testar largura 320, 375, 390, 430, 768, 1440 em `/admin`, `/dashboard`, `/registro`, `/pacientes`, `/atendimentos` e menus.
- Sidebar rosa/branca, marcador ativo animado, menu mobile, foco Tab/Escape, menu de perfil real e ações de segurança; em nenhuma largura há overflow horizontal.
- Contadores animam até valores verdadeiros após hidratação, preservam rótulos e reduzem movimento quando `prefers-reduced-motion` estiver ativado.
- Eixos, tabelas e gráficos acessíveis; sem transições que bloqueiem pointer/teclado ou provoquem loops RSC/router.
- Capturar evidências visuais Admin e Clínica no mínimo 390px e 1440px, além de casos 320px; anexar hashes e comparação com referências Premium 2.0.
- Não há tour demonstrativo de seis passos quando se visita o Admin/Clínica real; cada contexto possui onboarding próprio.

## F. Funcionalidades honestamente indisponíveis

- Chat IA: sem API clínica homologada; três estrelas podem decorar o aviso, mas não simular resposta real.
- Protocolos: sem biblioteca assistencial homologada.
- Ferramentas: sem catálogo clínico homologado.
- Cursos: sem catálogo operacional.
- Casos: sem módulo operacional.
- MEOWS clínico: política pendente, sem classificação/conduta automática.

Manter essas rotas com aviso claro, sem copiar o conteúdo fictício da Vitrine. Para torná-las funcionais, abrir missões posteriores com seu próprio backend, IAM, métricas e validação.

## G. Evidências, reprodutibilidade e decisão

Os nomes exatos dos scripts devem ser definidos e testados pela implementação. Exigir execução real de: `node --test` suites Premium e F03/F04, testes de auth/MFA/IAM, validação clínica e admin, suíte de laboratório do novo perfil, TypeScript, lint, build e browser headless com login real. Nunca marcar PASS antes de rodar. Não executar testes destrutivos em bancos 3100/3200 ou VPS.

Relatório final deve registrar por slice: commit, arquivos, testes PASS/FAIL/BLOCKED, capturas, hash, API/DB consultados, autorização, problemas e correções. Critério de pronto: operador recebe uma URL 3600, um comando de iniciar sem flags descartáveis, conta de Admin local, instruções para criar profissional autorizado, caixa de e-mail capturada e persistência real demonstrada.

**Nenhuma promoção de release nem alteração de `prod` por este documento.**
