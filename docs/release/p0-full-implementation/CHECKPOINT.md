# P0 — implementação integral

Branch `codex/p0-full-implementation`; base `e3c0cbc18ffa98be64470a7153b1e798a00fbe14`.
Um agente; worktree independente; nenhum acesso aos laboratórios, banco/volumes/MFA ou VPS do operador.
Especificação e referência lidas uma vez e preservadas em `reference/`. O JS do HTML é apenas referência e não será executado pelo produto.
A instrução mais recente do operador dispensa pausas de aprovação visual descritas no anexo.

## Checklist e limites de esforço

| Etapa | Requisitos / aceite | Dependências | Limite inicial | Estado |
|---|---|---|---|---|
| A | Cartão com fotografia local licenciada, mobile sem foto; LOGIN/MFA/CHANGE reais; labels/autocomplete/senha visível; recuperação neutra, erros de rede reais, confirmação de senha | Asset/licença; contratos auth existentes; testes UI e TS/lint | 45 min | PARCIAL: UI/recuperação PASS; fotografia BLOCKED HTTP 403 |
| B | MFA universal por identidade em guard servidor de toda operação; exceções inscrição/recuperação; CAPTCHA CSPRNG, hash, expiração, origem, consumo atômico, alternativa acessível e limites; adversariais e reset preservam MFA | Inventário restrito dos guards e storage transacional; aprovação de migration se necessária | 60 min | IMPLEMENTADO; testes direcionados PASS, regressões integradas pendentes |
| C | Configurações reais com DTO/allowlist e persistência; email/papel/registro não editáveis; dashboard sem mocks nem MEOWS, escopo multi-UBS e Sem dados | Guards existentes, modelos e endpoints reais | 50 min | IMPLEMENTADO; testes direcionados PASS, F5/browser NOT RUN |
| D | Pendências acionáveis sem filtro inicial, paginação e contagem escopada; notificações reais/idempotentes; navegação rede município→UBS→pessoas; esconder Comercial placeholder | Serviços existentes de IAM/organizações/convites/notificações | 50 min | PARCIAL; fila/rede/avisos de aceite PASS; notificações institucionais ampliadas pendentes |
| E | Componentes REAL/DEMO compartilhados, dados separados no servidor; jornadas sintéticas, nenhuma consulta clínica no demo; header claro/sidebar e estrelas IA sem falsa capacidade | Dados/DTOs C; componentes vitrine existentes | 50 min | PARCIAL; shell/cards/registro DEMO PASS, paridade de prontuário completo pendente |
| F | Scroll/teclado/tooltips/responsividade; regressões finais, CI único no SHA final e PR draft | Consolidação A–E | 45 min | NOT RUN |

Cada etapa terá commit/push seletivo do que estiver validado e checkpoint. Requisitos incompletos permanecerão BLOCKED/NOT RUN; não liberam produção. Sem testes completos repetidos ou instalação desnecessária. Se houver bloqueio complexo, continuar apenas tarefas independentes.

## Evidências / próximo passo

- Base e árvore inicial verificadas; só checkpoint pendente anterior.
- Foto `images.pexels.com/photos/6129243/...` e licença `www.pexels.com/license/`: HTTP 403 do proxy, inclusive após concessão de rede. Nenhum asset foi obtido nem licença verificada. Não usar download de origem desconhecida.
- Próximo: implementar shell e recuperação preservando endpoints; validar comportamento direcionado. Fotografia permanece bloqueada até obtenção legítima do asset e licença.

### A — validação e entrega parcial

- `tsx --test tests/p0-full/auth-ui.test.ts`: PASS 6/6; Chromium real, componentes reais compilados com adaptadores Next apenas no teste e endpoints interceptados. Login→MFA, bloqueio temporário, troca forçada, erros de recuperação, confirmação e remoção do bearer, desktop/mobile/dark/teclado/overflow. Não equivale a autenticação real com banco.
- TypeScript e ESLint dos arquivos alterados: PASS. `git diff --check`: PASS. Logs/capturas sem credenciais em `.test-audit/p0-full/`.
- Dependência disponível tinha client Prisma v32: copiada fisicamente para `/tmp/pap-full-deps` e gerado client v34 apenas nessa cópia; typegen Next gerado nesta worktree. Nenhuma instalação, banco ou container utilizado.
- Fotografia/licença: BLOCKED. Ilustração local anterior continua explicitamente como ilustração; nenhuma fotografia foi simulada. Smoke de login/MFA contra backend: NOT RUN nesta etapa.
- Recuperação agora usa mensagens públicas neutras, distingue erros HTTP/rede, bloqueia envio duplicado, confirma senha e limpa token/senha após sucesso; nenhuma alteração aos serviços de reset/token/MFA.
- Próximo: avaliar B nos guards centrais; se storage/contratos exigirem revisão de migration, documentar bloqueio e continuar C independente.

### B — MFA universal e verificação de login

- MFA passa a ser obrigatório nos guards HTTP operacionais, páginas clínicas, Comercial e transação do registro idempotente; Admin mantém seu guard existente. Sessões primárias permanecem disponíveis exclusivamente para fluxos próprios de configuração/recuperação. Login de Comercial sem fator encaminha primeiros passos; removido desvio que reabria Comercial antes da configuração. Nenhum fator/sessão foi alterado por migration.
- CAPTCHA de cinco caracteres CSPRNG, imagem PNG rasterizada no servidor, digest salgado por cookie HttpOnly, ligado à origem confiável, expiração em 2 min, uma tentativa atômica e limite de emissão persistente por origem (30/10 min). Reusa ledger de abuso existente; nenhuma migration necessária. Alternativa textual de cálculo acessível usa o mesmo protocolo e limitações. A alternativa é de baixa resistência a automação; CAPTCHA próprio não é proteção contra bots sofisticados nem substitui rate limiting/MFA.
- `security.test.ts`: PASS 6/6 em PostgreSQL descartável novo + teste HTTP adicional PASS 1/1 (os seis anteriores não repetidos). Abrange corrida 8 tentativas/1 aceite, replay, expiração, origem/cookie/resposta inválida, PNG e limites, papéis e inscrição, Comercial/fator revogado, reset preservando fator e revogando sessões, recuperação real.
- `auth-ui.test.ts`: PASS 6/6 após integração da verificação no login. TypeScript/lint direcionado: PASS. `sharp` já instalado/lockado foi declarado diretamente na mesma versão, sem instalação/upgrade.
- Banco de teste novo: `pap-p0-full-tests-20261028`, `127.0.0.1:25453`, `pap_p0_full_tests`, tmpfs, labels pap.disposable=p0-full/pap.owner=p0-full-implementation; não compartilha recursos com os laboratórios. Todas as 34 migrations de base aplicadas nesse banco: PASS.
- Regressões históricas com expectativas de MFA opcional e login sem desafio precisam adaptação ao novo contrato; não consideradas PASS por evidências anteriores. Integração final NOT RUN até consolidar C–F. Próximo: C.

### C — dados reais de perfil e dashboard

- `/configuracoes` usa identidade efetiva e endpoint privado de edição do próprio nome. DTO rejeita qualquer campo além de displayName; e-mail/papéis/vínculos/registro não editáveis. Escrita e auditoria na mesma transação com sessão/MFA revalidados; feedback só após OK. Campos sem modelo editável permanecem indisponíveis. Header/sidebar recebem nome real do layout servidor.
- `/dashboard` usa provider servidor em RepeatableRead, apenas grants HEALTH_UNIT com patient.read + encounter.read. Pacientes distintos por vínculo ativo, gestações ativas, COMPLETED no mês de ocorrência UTC e IN_PROGRESS; série de seis meses COMPLETED. Revogação de membership retira o escopo. Sem MEOWS, classificações, comparações, autoria inferida ou cursos fictícios. Ausências explícitas. UI de dashboard continua compartilhada com demo sintético.
- Testes `operational-data.test.ts`: perfil/DTO/CSRF/duas identidades e dashboard vazio/negação Admin-Comercial PASS 2/2; teste de duas UBS e deduplicação inicialmente FAIL por enum de fixture INACTIVE inexistente, corrigido para SUSPENDED e caso direcionado PASS 1/1. Total 3 cenários válidos; nenhum assert removido. TypeScript/lint direcionados e diff check PASS.
- Persistência verificada por nova leitura do serviço e banco; F5 no browser, duas identidades no browser e E2E completo NOT RUN nesta etapa. Próximo: D.

### D — central, diretório e notificações de aceite

- Fila acionável sem filtro obrigatório: NEW para análise, READY_FOR_ACTIVATION apenas PAP_ADMIN, PENDING_ASSIGNMENT (Manager só COMMERCIAL próprio), memberships REQUESTED por escopo. Paginação keyset global com máximo 21 registros/fonte; contagens reais e consultas ORM fixas, sem N+1. Notificação de aceite abre item autorizado por focus/id mesmo fora da primeira página. Ações permanecem nas áreas existentes; seleção automática da decisão nessas áreas ainda pendente.
- Rede município→UBS→pessoas/vínculos, leitura privada autorizada separadamente do diretório; Manager não lê pessoas. Convites institucionais usam fluxo existente; integração contextual completa de convites/solicitações na UBS ainda pendente.
- Aceite produz aviso persistente para PAP_ADMIN com role.manage e Manager emissor com role.assign_commercial quando proposta COMMERCIAL. Não atribui papel, não envia email nem ativa UBS. Badge de não lidas usa count real. Avisos institucionais fora de convites globais ainda pendentes (modelo existente exige invitationId).
- Migration forward-only 35 `20261028010000_p0_pending_access_notifications`: amplia apenas CHECK de kind; nenhum campo, registro, FK, ACL ou migration histórica alterado. Inspecionada antes da aplicação no banco descartável. Foi necessária porque o primeiro teste detectou CHECK recusando novo tipo; aceite rollbackou em vez de gerar confirmação falsa.
- Primeiro protótipo da fila usava SQL parametrizado: guard SQL FAIL; reescrito com Prisma ORM, sem exceção nem mudança no guard. Guard SQL PASS.
- Testes: fila/escopo/MFA/sem aceite automático PASS 2/2; notificações/replay/revogação/diretório PASS 2/2 após migration; repetição dos quatro após troca ORM PASS 4/4; paginação/foco com 23 itens e datas iguais PASS 1/1. Cinco cenários únicos, não somar reruns. TypeScript/lint/diff check PASS.
- Inventário histórico: 34 migrations anteriores byte a byte iguais à base. Nenhum laboratório do operador acessado. Próximo E.

### E — plataforma compartilhada e demo isolado

- REAL/DEMO usam o mesmo DashboardShell, Sidebar, Topbar, dashboard, cards de pacientes/atendimentos e componentes de quatro etapas do registro. Provider de dashboard REAL continua servidor/autorizado; provider DEMO continua independente de DB e serviços clínicos. Registro demo tem campos fixos desabilitados, só seleciona personagens e envia patientId/kind à API sintética existente.
- Header claro e compacto; navegação expandida/ícones/recolhida persistida por identidade e modo no navegador; overlay mobile com Escape/foco; scrollbar apenas visualmente oculta. Mesmo ícone IA com três estrelas CSS nos dois modos e reduced-motion sem animação. Links de ajuda/perfil agora funcionais; nenhuma IA clínica anunciada como conectada.
- Chat/cursos/protocolos/ferramentas/casos sem backend estão explicitamente indisponíveis no operacional. Não foram inventados serviços ou catálogo. DataSUS não é mais apresentado como consulta realizada; botão inexistente desabilitado.
- Testes server/API: PASS 2/2 (ID sintético, rejeição de contexto real, nenhuma escrita clínica, Comercial negado na API real, providers/rotas sem mocks operacionais). Browser: shell/preferências/destinos PASS 1/1; overlay/reduced-motion/axe WCAG2 A/AA/2.1 AA e jornada com quatro etapas/simulação PASS 2/2 após correção do harness Axe/contexto e seletor com asterisco. Total 3 cenários únicos. TypeScript/lint/guard SQL/diff PASS. Captura mobile sintética em `.test-audit/p0-full/screenshots/`.
- Paridade completa de ficha de paciente e prontuário DEMO, jornadas avançadas de cursos/protocolos sem backend e nova captura dark do shell ainda pendentes; não declarar E integralmente PASS. Próximo F: confirmação servidor, acabamento e integração.

### E2 — ficha de paciente compartilhada (retomada)

- Removida a duplicidade visual da ficha: `PatientRecordView` recebe DTO mínimo e não importa serviços. O loader operacional mantém suas consultas e seus guards originais. A vitrine recebe prontuários estritamente sintéticos do provider servidor independente, sem campos de escore ou conexão clínica.
- Reutilizadas as seções reais de identidade, gestação, flags, alergias, atendimentos e histórico de revisões. Links DEMO permanecem em `/vitrine`. Não há seleção de provider por flag cliente, query string ou cookie.
- `tsx --test --test-name-pattern='same patient record' tests/p0-full/workspace-ui.test.ts`: PASS 1/1; ficha completa apresentada, navegação demonstrativa e zero requisições clínicas. TypeScript e lint dos arquivos E2: PASS; diff check PASS.
- Último SHA remoto confirmado antes de E2: `e3b00929298ff8b2a1b0bdb93b0b0a55e4d0fa5b`. A branch candidata e todas as worktrees originais permanecem preservadas.
- F permanece em andamento, com alterações não versionadas; erro do helper de convite corrigido e cenários direcionados PASS. Não repetir gates já aprovados ao retomar.

### F — checkpoint de consolidação

- SHA E2 confirmado: `35159ea` (ficha compartilhada). F inclui correções dirigidas e está sendo preparado para versionamento seletivo; seu SHA é o commit que contém este checkpoint. Manifesto de conteúdo em `evidence/source-manifest.json`, resultados em `VALIDACAO.md` e `evidence/validation.json`.
- Corrigido o helper C: extrator de bearer de convite permanece puro; inscrição/MFA e conclusão de onboarding só ocorrem no helper de sessão positiva. Testes negativos de Manager/Municipal continuam explicitamente primários. DTO público de notificações preservado; pendência não é aviso de concessão. Execução C completa 37 PASS/3 FAIL; correções dirigidas 3/3 PASS, sem remover asserts.
- Corrigidos CAPTCHA reutilizado no retorno de MFA, emissão dupla por StrictMode e dependência de fontes nativas no desenho. PNG usa glifos geométricos próprios. Nova prova StrictMode PASS 1/1.
- Sessões profissionais reais no navegador: sem MFA negadas (1/1), com MFA verificado permitidas no escopo e outra UBS negada (1/1). Runtime mínimo/ACL/drift e 39 testes Node passaram; dois testes MFA UI antigos corrigidos e repetidos PASS 2/2. Registro P0 PASS 68/68.
- Dashboard exclui vínculos encerrados/inativos; fila respeita permissão de cada grant, sem somar escopo global de um papel à autoridade local de outro; UBS não expõe convites alheios/hashes. Casos específicos PASS.
- Links acionáveis selecionam item exato de convite/solicitação. Solicitações não começam mais filtradas por NEW; READY não fica invisível. Caso dirigido PASS. Sidebar reorganizada por gestão institucional, pessoas, inteligência, auditoria/segurança e operações, preservando links autorizados.
- TypeScript/lint/diff e guards de SQL/CI PASS; 4 warnings de lint herdados. Lock offline/dry-run npm ci PASS, nenhuma versão/integridade alterada. Auditorias completas preservadas sem audit fix.
- **Bloqueios externos:** foto e licença Pexels HTTP403, API GitHub HTTP403, build Google Fonts indisponível. PR draft ainda não criado. CI remoto será acionado uma vez no push F; resultado não deve ser presumido. Não repetir toda a pipeline antes de diagnosticar um gate concreto.
- **Próximo passo:** confirmar SHA remoto F, observar CI/abrir draft se a API permitir; caso contrário registrar bloqueio. Obter fotografia/licença e concluir homologação manual autorizada. NO-GO de release. Não usar os laboratórios WSL existentes nem criar credenciais neles.
