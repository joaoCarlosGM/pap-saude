# MISSÃO 04 — PAP Saúde: UX por perfil, convites, vitrine clínica e e-mails transacionais

**Status:** ESPECIFICAÇÃO APROVADA COMO DIREÇÃO DE PRODUTO; implementação ainda não iniciada nesta branch.

**Origem:** solicitação do operador, 21/10/2026. **Branch:** feature/ux-iam-convites-vitrine-email, criada a partir de codex/onboarding-primeiro-acesso-mfa (PR #4 ainda em revisão). Nenhum deploy ou alteração de produção autorizados.

## REQUISITO INEGOCIÁVEL — PRESERVAR O LABORATÓRIO LOCAL JÁ PROVISIONADO

O operador **já possui** worktree local de homologação em `~/projetos/pap-saude-onboarding`, na branch **`test/onboarding-primeiro-acesso-mfa`**, com banco PostgreSQL local `pap_admin_beta1_local`, container `pap-admin-beta1-local-db`, volume persistente **`pap-admin-beta1-local-data`**, configuração privada `.local/pap-admin/config.json`, conta PAP_ADMIN `papsaudeapp@gmail.com`, senha escolhida pelo operador, chave criptográfica MFA e dados de autenticação já cadastrados. **Este é o mesmo laboratório a ser atualizado; nenhum recadastramento é autorizado.**

**Proibido no ambiente manual:**
- `npm run local:init` ou `npm run local:admin` novamente; reinicializar credenciais, criar outro primeiro Admin, trocar a senha ou obrigar recadastro MFA.
- Apagar/substituir/copiar sem necessidade `.local/`, `.env*`, o volume Docker, banco, cookies de navegador, chaves MFA, sessões e usuários; `docker compose down -v`, `docker volume rm`, `prisma migrate reset`, `prisma db push`, `TRUNCATE` e `DROP`.
- Clonar um laboratório diferente para executar a homologação do usuário; usar outro checkout como área **de desenvolvimento** pode ser adequado, porém a homologação deve ser aplicada ao mesmo worktree/banco local já existente.
- Rodar suíte de teste destrutiva no volume real ou apontar testes ao `127.0.0.1:15432`/`pap_admin_beta1_local`. Testes devem usar seus próprios bancos/volumes descartáveis, devidamente marcados e isolados.

**Procedimento obrigatório de atualização in-place**, somente quando houver slice validado e o operador liberar atualização do ambiente de homologação:
1. Inspecionar `git -C ~/projetos/pap-saude-onboarding status --short --branch`, o upstream, HEAD, o grafo da branch de feature e quaisquer edições não commitadas. Preservar inclusive o diagnóstico temporário conhecido em `scripts/local/provision.ts` até confirmar que pode ser retirado; não executar restore genérico sobre mudanças desconhecidas.
2. Garantir plano de migração **forward-only, idempotente e compatível com os registros atuais**. Validar migrations em cópia restaurável de banco de testes, sem alterar as credenciais ou a chave de criptografia do MFA; registrar backup seguro/possibilidade de rollback antes de qualquer migração aplicada ao banco manual, evitando exportar segredos para logs ou Git.
3. Fazer `git fetch origin`, comparar `git merge-base`, `git log --oneline --left-right` e mudanças pendentes. Se a branch de homologação for ancestral da feature e o worktree estiver seguro/limpo, atualizar **na própria branch `test/onboarding-primeiro-acesso-mfa`** com `git merge --ff-only origin/feature/ux-iam-convites-vitrine-email`. Não trocar para outra branch no worktree de homologação. Se não for fast-forward, **parar** e apresentar plano não destrutivo; não fazer merge forçado, rebase, reset ou cherry-pick improvisado.
4. **Não** repetir `local:init` ou `local:admin`. Se preciso, apenas `npm ci`, `npm run local:start`, `npm run local:migrate` (depois da validação de migrações) e `npm run local:dev`, usando rigorosamente o mesmo `.local`, volume e host `http://127.0.0.1:3100`. Reiniciar servidor de aplicação quando necessário não equivale a apagar contas ou MFA.
5. Teste de preservação: antes/depois, comprovar a existência da mesma conta PAP_ADMIN, a integridade das role assignments, mesma chave de criptografia e fator MFA, organizações e registros persistidos; validar login com senha/TOTP **já existentes** e fluxos novos. Não solicitar a senha/token ao chat ou imprimi-los.
6. Prioridade é **preservar sessões já válidas**; evitar rotação de cookie signing key, session secret, session invalidation e alterações disruptivas da autenticação. O sistema pode exigir novo login em caso de expiração natural ou mudança de contrato; **nunca prometer** que cookies/sessões durarão indefinidamente. Caso reautenticação seja inevitável, deve funcionar com a conta e MFA existentes, sem novo provisionamento.

**Critério de aceite de compatibilidade:** implementar a missão sem perder a conta Admin já criada, seus papéis, senhas, TOTP, códigos de recuperação, configurações privadas e dados. Qualquer migração não compatível é BLOQUEANTE. A nova branch no GitHub é de **desenvolvimento**; a branch local que o operador atualizará para testar **continua sendo test/onboarding-primeiro-acesso-mfa**.

## Missão para o Codex

Implementar incrementos testáveis e auditáveis em Next.js/Prisma/PostgreSQL, preservando fluxos existentes, IAM, CSRF, sessões, MFA real, dados, UX clínica e backend. Ler esta especificação, o estado do git, os PRs pendentes, as migrations, as suites de testes e os componentes existentes antes de editar. Nunca presumir que a branch já está integrada à develop. Não misturar ambientes nem sobrescrever alterações não commitadas.

### 1. Contrato visual PAP Saúde

- Base da marca: identidade existente no projeto papsaude.com.br e capturas de referência; preservar logomarca/nome existentes, sem inventar paleta externa.
- PAP_ADMIN e PAP_MANAGER (e painel administrativo do Comercial): **verde petróleo/teal como tema padrão**, navegação escura, superfícies claras, verde menta e neutros. Contraste AA; tokens CSS por layout, sem contaminar outros módulos.
- PROFISSIONAL/HEALTH_UNIT_ADMIN no **ambiente clínico**: preservar **rosa PAP Saúde** como acento primário, cabeçalho verde/teal já existente e cartões atuais; melhorar pontualmente, sem reconstruir design.
- Login: composição responsiva elegante com formulário prioritário, **pequenas ilustrações ou imagens locais** relacionadas a cuidado/tecnologia Amazônia/saúde; otimizadas (Next/Image ou SVG), sem imagens externas em runtime nem dados pessoais. Desktop: ilustração lateral ou abaixo da identidade; mobile: composição discreta, formulário acima da dobra. Nenhuma imagem sobre campos. Evitar excesso visual. Alt significativo ou decorativo com aria-hidden; foco e teclado.
- Escuro/claro e a11y: preservar suporte real, responsividade 320–1440px, preferências de redução de movimento e navegação por teclado. Nada de rosa como tema dominante no admin.
- Protótipo visual de referência: docs/design/pap-espera-convite-preview.html; ilustração opcional reutilizável: public/illustrations/pap-login-care.svg.

### 2. Primeiros passos versus Minha segurança

- Primeiro acesso exclusivo em /primeiros-passos (ou rota exclusiva equivalente sem AdminShell). MFA/wizard continua real e seguro.
- /minha-seguranca é **gestão de conta** (senha, MFA, recuperação, sessões e dispositivos), **NÃO** deve renderizar ou reiniciar wizard automaticamente. No /admin, /admin/minha-seguranca também é gestão de conta, nunca a etapa 8.
- A conclusão persistida redireciona ao destino autorizado; wizard não reaparece em reload, navegação ou re-login. Tour de ajuda só mediante ação explícita em rota/modal separado; não é onboarding.
- Guardas devem diferenciar sessão sem MFA, etapa pendente, perfil ainda não atribuído e acesso concluído. Nunca promover sessão primária a MFA verificado artificialmente.
- Testar PAP_ADMIN, gerente, comercial, profissional e responsável; não conceder privilégios pelo onboarding.

### 3. IAM e matriz de privilégios

- PAP_ADMIN global: nomeia/retira PAP_MANAGER; atribui papéis, autoriza convites, ativa/desativa UBS, pode excluir UBS apenas pelo fluxo legítimo auditado com confirmação forte; administra infraestrutura institucional sem acesso clínico implícito.
- Novo PAP_MANAGER global: convida pessoas, consulta e analisa UBS, prepara/encaminha solicitações, gerencia convites institucionais conforme escopo e **AUTORIZA o perfil COMMERCIAL**. Não ativa, não exclui UBS, não concede PAP_ADMIN/PAP_MANAGER, não eleva própria conta nem manipula segurança de administradores.
- COMMERCIAL: painel comercial real e ferramentas comerciais próprias; botão **Abrir vitrine demonstrativa** → /vitrine. Não pode acessar dados clínicos reais, API clínica, organizações privadas nem métricas institucionais além do que for explicitamente permitido no módulo comercial. A vitrine NÃO é o painel comercial.
- HEALTH_UNIT_ADMIN e PROFESSIONAL: mantêm o escopo e as políticas atuais; somente profissionais autorizados acessam a operação clínica.
- **Permissão exclusiva organization.activate** (e organization.delete/deactivate conforme operações existentes) apenas PAP_ADMIN. Não basta esconder botão; negar no serviço, Route Handler, server action, ORM e teste adversarial.
- A política atual usa ORGANIZATION_MANAGE (ampla), requirePapReviewer e COMMERCIAL com ORGANIZATION_READ/COMMERCIAL_MANAGE. Revisar os call sites, realizar separação mínima de permissões e bootstrap/migration idempotente sem ampliar privilégios por acidente.
- Aprovação de solicitação deve ser separada da ativação da UBS; a implementação atual cria a organização ACTIVE dentro de reviewBetaRequest. Criar estado intermediário e operação explícita pelo Global, preservando históricos e invariantes; não alterar registros existentes de forma destrutiva.
- Papéis/tokens devem permanecer fail-closed, com teste de escopo global/municipal/UBS, IDOR e multi-tenant. Gerente com MFA obrigatório.

### 4. Convite genérico e atribuição de perfil

- PAP_ADMIN e PAP_MANAGER enviam convites a novos e-mails, sem exigir UBS já ativa. Global escolhe gerente; Gerente pode sugerir papéis e autorizar apenas Comercial. Outros papéis devem seguir regras existentes de escopo e aprovação; não abrir autoescalada.
- Convite via e-mail com token aleatório forte, hash em repouso, escopo/intenção e expiração, uso único, revogação, reenvio invalidando anterior, idempotência, controle de concorrência, destinatário normalizado, rate limit, auditoria e tratamento de convite existente/expirado.
- Ao aceitar, usuário cria/confirma identidade e senha, mas **não recebe acesso operacional** até a atribuição/autorização. Página exclusiva /aguardando-autorizacao, sem sidebar admin nem prontuário, acessível somente ao usuário autenticado em status correspondente.
- Página de espera com PAP Saúde, boas-vindas, linha de progresso "Convite aceito > Conta criada > Aguardando autorização > Acesso liberado", explicação do prazo indefinido (sem SLA inventado), consultar status, sair, ajuda. Sem revelar nome do revisor nem dados internos.
- Após Global autorizar papel de gerente ou UBS (onde aplicável) ou Gerente autorizar Comercial, estado ACTIVE, notificação in-app e e-mail de liberação, destino por perfil após login/MFA exigido. Não confundir "convite aceito" com "perfil aprovado" ou "UBS ativada".
- Estados explícitos e transitions auditáveis, sem reutilizar erroneamente enum de convite que significa só aceite: PENDING_ACCEPTANCE, PENDING_ASSIGNMENT, ACTIVE, REJECTED, EXPIRED, REVOKED (nomes adaptados às entidades). Preservar convites anteriores.
- Painel Admin/Gerente: fila de atribuições pendentes, convidar Comercial (prioridade de homologação), reenviar, revogar, rastrear aceite, decisão e motivo; Global lista convites/solicitações e autoriza separadamente a ativação.

### 5. Comercial e /vitrine

- /comercial: área de trabalho comercial própria (leads/propostas apenas se suportados por entidades reais; se não, marcar "Em construção" e não inventar KPIs), destaque visível do botão **Abrir vitrine demonstrativa** que abre /vitrine.
- /vitrine reutiliza interface e componentes do dashboard clínico /dashboard já existente em develop: sidebar Registro, Atendimentos, Pacientes, Chat IA (se houver simulação segura), Protocolos, Ferramentas, Cursos, Dashboard. NÃO criar segunda aplicação clínica divergente.
- Introduzir modo DEMO realmente isolado **no servidor**: fixtures sintéticas claramente marcadas, identificadores fictícios, nenhuma leitura/escrita de dados clínicos ou dados de UBS reais, nenhum acionamento de integrações/IA reais. Proteger APIs contra alternância de modo por query string maliciosa; não aceitar organização real como escopo da demo.
- A vitrine pode mostrar métricas e pacientes fictícios marcados "Demonstração – dados simulados"; formulários não persistem no banco de produção; qualquer interação demonstrativa usa dados isolados e reiniciáveis. Nenhum dado real aparece ao alternar usuário/perfil.
- Reusar layout clínico **rosa** na vitrine. Melhorar o /dashboard clínico existente de forma incremental: mais imagens contextuais leves, banners de cursos e seção "Populares em outras UBS", com tags, thumbnails, duração e CTA. Em operação real, usar dados de catálogo permitidos e agregados/anonimizados; se indisponíveis, mostrar "Ainda não há recomendações" e NÃO alegar popularidade. Na vitrine, o conjunto todo é sintético e rotulado.
- Testar limites entre /comercial, /vitrine, /dashboard e /admin; cookies, session e organização. Comercial não deve acessar clinical mesmo alterando URL.

### 6. E-mails personalizados e notificações

Criar templates HTML + texto simples, marca PAP Saúde, responsivos, acessíveis, bem contrastados, branding verde/rosa discreto e CTA de fácil uso:
1) convite novo (Global/Gerente/institucional), com nome, papel proposto quando seguro, expiração real e link único;
2) recuperação de senha ("Esqueci minha senha") com link temporário e instruções, sem enumerar conta; 
3) confirmação de liberação de acesso/atribuição de perfil e, separadamente, confirmação de ativação da UBS ao contato legitimamente autorizado;
4) opcional aviso de revogação/rejeição sem expor dados privados.

- Reusar src/server/email/email.service.ts, src/server/email/password-reset-email.service.ts, src/server/email/local-demo-mail.ts; abstração de provider com local-demo e Resend configurados, sem duplicação.
- O laboratório local (127.0.0.1:3100) **captura e-mails em local:mail, NÃO entrega externamente**. Adicionar captura local ao reset de senha, preservando token sigiloso e fluxo atual.
- Teste real com outros endereços: somente em ambiente de homologação controlado, URL HTTPS publicamente acessível, domínio/remetente validado, credenciais provider em secrets e destinatário(s) de teste consentidos; nunca usar links 127.0.0.1 em e-mails para destinatários externos. Não abrir túnel público/alterar VPS/DNS/configurações de produção sem aprovação. Prover checklist de domínio SPF/DKIM/DMARC, restrições de sandbox do provedor, rastreamento 'aceito pelo provedor' versus 'entregue/aberto' (se observável), bounce/retry sem duplicação e auditoria sem tokens.
- Não incluir token/OTP/segredo em logs, console, query string de analytics, captura pública, screenshots, corpo da API ou Git. A URL de reset atual usa fragmento; preservar modelo de segredo e validar eventual refatoração.
- Senha reset: token expirável, único, revogação de sessões conforme política, MFA não é automaticamente removido, rate limit e respostas indistinguíveis para e-mail existente/inexistente.
- Notificação dentro da plataforma deve ser persistente/autorizada e expor apenas eventos do próprio usuário; origem e deduplicação auditadas.

### 7. Dashboard administrativo — auditoria de dados

- Inspecionar o dashboard admin real e todas as métricas/cards/tabelas/gráficos/filtros/períodos. Mapear origem, consulta e autorização de cada indicador; definir exatamente o numerador/denominador, timezone, período, cardinalidade e status de ausência.
- Corrigir dados incorretos, duplicados, contadores inflados por múltiplos papéis, filtros inconsistentes, escopo de município/UBS e status; testar contra SQL/Prisma em banco descartável.
- Sem números hardcoded no admin. Respeitar NO_DATA / INSUFFICIENT_SAMPLE / NOT_INSTRUMENTED e privacidade de amostras pequenas que já existem em betaMetrics. Mostrar data de atualização/fonte no UI quando útil. Comercial não vê dados clínicos.
- Acrescentar visão de convites, pendências, atribuições comerciais e UBS aguardando ativação somente com dados reais do banco.

### 8. Execução em slices, Git e guardrails OBRIGATÓRIOS

Antes de tocar em código: git status (incluindo untracked), branch, SHA, dependências dos PRs, inspeção de testes/documentação. Não usar git add ., reset --hard, checkout que destrua arquivos, drop/reset/migrate dev destrutivo, .env de produção ou recursos externos sem aprovação. Não fazer merge ou deploy sozinho. Se houver mudanças locais não commitadas, isolar worktree/feature e preservá-las.

Slices pequenos: (A) visual e roteamento onboarding/segurança; (B) IAM Gerente + restrição Comercial + transição UBS; (C) convites globais, fila de espera e notificação; (D) e-mails HTML/local-demo/Resend homologação controlada; (E) Comercial e vitrine clínica mock isolada, cursos/arte; (F) auditoria dos dados/admin dashboard e hardening final. Priorizar C+D+E para permitir convite Comercial e experimentar vitrine logo, SEM pular B de segurança. Cada slice com diff mínimo, documentação, migrations forward-only, testes e relatório.

Ao finalizar e **APROVAR** testes de cada slice, realizar commit contendo só arquivos daquele slice (git add caminhos EXATOS) e push imediato para a feature branch, antes de avançar. Não commitar arquivos de outros trabalhos. Preservar PR #4 e a branch de teste onboarding, não alterar develop e não presumir PROD/TEST como branch deploy.

### 9. Testes e auditorias obrigatórios

- npm ci, TypeScript, lint, build, testes pré-existentes de autenticação/MFA, Beta Admin/F04, clínica F03, e integrações afetadas. Rodar em bancos descartáveis comprovadamente isolados, nunca o volume manual pap-admin-beta1-local-data. Evitar teste que delete recursos de outra jornada.
- Matriz adversarial por papel: API GET/POST/PATCH/DELETE, IDOR, permissão ausente, promoção de papel, tentativa manager.activate/delete, comercial lendo clinical, demo escapando para dados reais, no MFA, CSRF, session fixation, origem Host, race requests.
- Convite: entrega local, aceite, duplicidade, expiração, revogar, reenviar, concorrência, autorização Gerente→Comercial, Global→Gerente e Global→UBS, impossibilidade Comercial→outros papéis; senha reset, token reuse, e-mail existente/inexistente sem enumeração; in-app notifications.
- Navegador E2E com viewport 320/768/1440, dark mode, navegação teclado, axe WCAG A/AA, screenshots mascarados e sem segredos. Testar /primeiros-passos versus /minha-seguranca, /aguardando-autorizacao, /comercial→/vitrine, /dashboard rosa e /admin verde. Validar que imagens não prejudicam LCP/CLS e acessibilidade.
- Analisar migrations e dependências, npm audit (informar severidade, não supor que zerou), auditoria de logs/segredos, LGPD minimização e bloqueio cross-tenant. Não alegar testes não executados.
- Relatório por slice: arquivos alterados, arquitetura/decisões, evidências PASS/FAIL/NOT RUN, cobertura e regressões, métricas auditadas, limitações, SHA commit e branch push. STOP ao detectar regressão de MFA, permissão indevida, dados clínicos visíveis na vitrine, ou risco de recurso de produção.

### 10. Definition of Done

Na branch de desenvolvimento, operador consegue: (a) logar como Admin verde sem wizard reaparecendo na Minha segurança; (b) nomear Gerente; (c) Gerente convidar pessoa a e-mail escolhido; (d) pessoa aceitar e visualizar página de espera; (e) Gerente aprovar Comercial sem conseguir ativar UBS; (f) Comercial entrar em painel próprio e abrir /vitrine com experiência do /dashboard rosa, curso popular **fictício** e zero vazamento real; (g) Global aprovar/ativar UBS de forma explícita e auditável; (h) recuperar senha com e-mail HTML na caixa local; (i) receber notificação in-app e e-mail de ativação; (j) consultar KPIs admin auditados. Envio para e-mail externo só se houver homologação HTTPS/Resend realmente configurada e testada; diferenciar 'provisionado', 'integrado' e 'entregue'.

**Importante:** esta especificação não autoriza implantação de produção, acesso a credenciais, DNS, VPS, ou envio arbitrário de mensagens reais. Implementar e testar; abrir PR para revisão humana.
