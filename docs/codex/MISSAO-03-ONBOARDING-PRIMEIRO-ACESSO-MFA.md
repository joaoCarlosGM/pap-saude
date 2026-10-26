# Missão 03 — Onboarding de primeiro acesso e MFA (PAP Saúde)

> **Estado:** especificação para implementação pelo Codex; não é código pronto nem autorização de merge/deploy.
> **Base:** `develop` (PR #2, PAP Admin Beta 1). O laboratório manual está no PR #3, branch `codex/pap-admin-local-dev`, **ainda não integrada** na data de criação desta missão. Não assumir que os scripts `local:*` existem em `develop`. Resolver explicitamente a dependência antes de executar testes manuais.
> **Escopo:** primeiro acesso de PAP_ADMIN, HEALTH_UNIT_ADMIN e PROFESSIONAL; outras funções somente se a política IAM existente as abranger.

## 1. Objetivo e decisões de produto

O primeiro cadastro/autenticação deve oferecer experiência guiada para segurança, não uma página técnica. Usuário convidado aceita convite, define senha e é conduzido por um assistente (“Primeiros passos”) com explicações curtas e **pop-ups de orientação contextuais**. O mesmo assistente deve atender ao primeiro PAP_ADMIN criado por provisionamento local ou por processo legítimo de produção, sem depender do seed local.

**Regras de segurança:**
- MFA **obrigatório** para os papéis administrativos e operações que já o exigem. Respeitar a política de autenticação/autorização dos profissionais; **não declarar MFA obrigatório para PROFESSIONAL sem verificar e aprovar a política existente**. Oferecer configuração guiada a profissionais no primeiro acesso, promovendo proteção sem conceder novas permissões.
- Não conceder acesso administrativo antes do TOTP ativo **e** sessão autenticada com segundo fator verificado. Após ativação, novo login/challenge, nunca carimbar `mfaVerifiedAt` artificialmente.
- Não enfraquecer LGPD/tenant isolation: nenhuma elevação de papel nem visualização de dados clínicos por PAP_ADMIN; nenhum convite pode escolher sua própria organização/role.
- Segredo TOTP criptografado no servidor; URI/QR Code/segredo apenas para sessão autenticada e na etapa necessária. Nunca registrar em analytics, logs, screenshots, URLs externas ou suporte.
- Identidade visual coerente com a landing `papsaude.com.br`: rosa institucional, verde-escuro, branco, tons suaves de rosa; responsivo/mobile e modo escuro com contraste acessível. Consultar tokens reais existentes, evitando definir cores arbitrárias.

## 2. Auditoria obrigatória antes de implementar

Mapear, com arquivos/linhas, o fluxo real:
1. Convite institucional de HEALTH_UNIT_ADMIN e convite de PROFESSIONAL; aceite e criação/ativação de credenciais.
2. Provisionamento inicial do PAP_ADMIN e diferenças entre conta recém-criada e já existente.
3. Login, senha, challenge TOTP, códigos de recuperação, logout global e política IAM.
4. `src/components/admin/MySecurityClient.tsx`, `src/app/api/auth/security/route.ts`, `src/server/auth/account-security.service.ts`, `src/server/auth/totp.service.ts`, configurações de TOTP, guards, fluxos clínicos e scripts de teste.
5. Qual sinal confiável indica que o **primeiro acesso/primeiro onboarding** foi concluído? Projetar persistência idempotente, vinculada ao usuário, sem confiar apenas em `localStorage` ou no front-end. Caso exija migração, acrescentar somente migration incremental e reversão operacional documentada; nunca editar migrations históricas.

**Causa raiz a investigar:** houve falha genérica “Ação não autorizada ou dados inválidos” durante `CONFIRM_MFA`. Reproduzir com evidência em testes. Separar erros de credencial, relógio/código, vencimento do fator PENDING, fator revogado por START_MFA repetido, sessão e CSRF/origin. Não atribuir sem evidência à sincronização do relógio.

## 3. UX — jornada obrigatória

### 3.1 Entrada e boas-vindas
- Depois do aceite de convite, ou no primeiro login do PAP_ADMIN provisionado, apresentar modal/wizard de boas-vindas, informando organização e **papel reais**, objetivos e próximas etapas.
- Se houve criação de senha no aceite, não pedir novamente sem necessidade de reautenticação definida por política.
- Usuários já existentes que ainda não finalizaram configuração de segurança devem ter rota explícita para **retomar** a jornada, sem forçar novo convite ou novo cadastro.
- Usuários com MFA ativo e onboarding concluído não veem o wizard em todos os logins. “Ajuda / Refazer tutorial” abre instruções sem alterar credenciais.

### 3.2 Tour com pop-ups
- Popovers/spotlights ancorados aos controles reais, não overlays de demonstração que bloqueiem ações. Instruções sequenciais: **Boas-vindas → Por que proteger → QR Code → Ler no app → Confirmar 6 dígitos → Guardar recuperação → Novo login/validação → Dashboard**.
- **Voltar, Continuar, Sair do tutorial, Retomar**, indicador `Etapa X de Y`; o usuário pode pular as **explicações** quando permitido, mas não burlar os requisitos MFA do papel.
- Não mostrar a mesma explicação repetidamente após refresh; não perder progresso nem regenerar chave devido a remount/render.
- Acessibilidade: foco de teclado, Escape quando apropriado, labels, aria-live, mobile 320px+, redução de movimento, contraste WCAG AA e popovers que não ocultem botões.

### 3.3 QR Code e cadastro TOTP
- `START_MFA` mediante gesto explícito, senha atual quando necessária, com bloqueio de double submit.
- Servidor retorna URI `otpauth://`, segredo/base32, `factorId` e validade. Gerar QR Code **localmente** no cliente (ou servidor da aplicação), sem API/serviço remoto. Não enviar segredo para Google nem usar “Google Authenticator API”.
- Mostrar QR Code escaneável; opção “Não consigo ler? Usar chave manual”, copiar chave com cuidado, rótulo da conta e nome do emissor PAP Saúde.
- Informar em linguagem simples: **a chave é estável durante o mesmo cadastro; o código de seis dígitos normalmente muda a cada 30 segundos; os relógios precisam refletir o mesmo instante (fusos diferentes não são problema)**.
- Se pressionar “Gerar nova chave”, pedir confirmação explícita de que a anterior deixará de funcionar; invalidar a anterior de acordo com o contrato existente e descartar segredo anterior da UI.
- Se já houver MFA ativo, não permitir substituição silenciosa do fator sem reautenticação forte e confirmação específica; preservar política existente. Verificar comportamento existente e adicionar testes adversariais.
- Identificar fator PENDING expirado; oferecer reinício explícito, sem criar segredo em loop e sem divulgar segredos em logs. Considerar retomada após reload: nunca mostrar segredo persistido em `localStorage`; explicar necessidade de iniciar novo vínculo seguro se a URI anterior não está mais disponível.

### 3.4 Confirmar MFA e recuperação
- Input dedicado de 6 dígitos, numérico, com colagem, sem misturar campo “Nova senha”; submissão apenas com `factorId` pendente correto.
- Ao confirmar, distinguir mensagens seguras e acionáveis: “Código inválido ou expirado”, “Configuração expirou”, “Sessão expirou, entre novamente”, “Nova chave substituiu a anterior”. Não retornar informações que revelem existência/estado de contas a terceiros; aplicar limites de tentativa existentes.
- Informar como corrigir relógio (sincronização automática de celular e Windows/WSL), sem exigir fuso idêntico; aplicar tolerância temporal apenas conforme política segura existente.
- Apresentar os códigos de recuperação **uma vez**, exigir reconhecimento explícito de armazenamento seguro. Não imprimir, enviar por e-mail ou colocar em telemetria.
- Após ativar, orientar **novo login com MFA**; manter admin protegido enquanto `mfaVerifiedAt` da sessão não for válido.

### 3.5 Profissionais e administradores
- PAP_ADMIN: fluxo completo de primeiro login → MFA obrigatório → novo login → dashboard administrativo.
- HEALTH_UNIT_ADMIN: convite aprovado → definir senha → wizard → MFA obrigatório → novo login → administrar apenas sua UBS.
- PROFESSIONAL: convite → definir senha → apresentação do wizard; MFA conforme política existente, sem bloquear indevidamente o trabalho clínico nem afrouxar permissões. Especificar decisão de produto em PR e testes antes de alterar política.
- Profissionais e administradores devem poder reabrir tutorial na área de segurança, sem regenerar fatores.

## 4. Arquitetura e implementação

- Reutilizar backend de TOTP com `otpauth`, as rotas reais `GET/POST /api/auth/security`, IAM/CSRF/origin, sessões e serviços de convite existentes.
- Separar componentes UI: `FirstAccessWizard`, `TotpSetupStep`, `RecoveryCodesStep`, `OnboardingTour` (nomes indicativos); evitar misturar CHANGE_PASSWORD/RESET com CONFIRM_MFA.
- Minimizar alterações no contrato HTTP. Se forem necessárias extensões, documentar compatibilidade e checks de segurança; nunca colocar segredo em query string pública.
- Adotar persistência de progresso segura e idempotente; tratar múltiplas abas, refresh, sessão expirada e reenvio de convite. Auditoria sem dados sensíveis.
- Preservar ambiente do PR #3 (quando for base); não misturar scripts `local:*` com código clínico nem acionar VPS.

## 5. Critérios de aceite demonstráveis

- [x] PAP_ADMIN recém-provisionado consegue configurar MFA por QR Code e completar login válido.
- [x] HEALTH_UNIT_ADMIN recém-convidado completa jornada, sem sair do seu tenant.
- [x] PROFESSIONAL recém-convidado vê tour e segue a política MFA aprovada, sem ganhar privilégios.
- [x] Um START_MFA por ação; nenhum segredo novo por render/refresh; regeneração explícita revoga PENDING anterior.
- [x] Código válido confirma; inválido/vencido recebe orientação específica e segura.
- [x] Relógio defasado é diagnosticável sem presumir que diferenças de fuso implicam erro.
- [ ] QR Code gerado offline e testado em Google Authenticator, sem integração com API Google. **Parcial: geração/decodificação e TOTP automatizados PASS; leitura no app físico NOT RUN.**
- [x] Recuperação visível uma única vez e protegida; logout/login mantém MFA guard.
- [x] Wizard responsivo (desktop e celular), acessível, com pop-ups efetivos e opção de retomar.
- [x] Convites, papéis, isolamento multitenant, auditoria, CSRF e sessões mantêm testes adversariais aprovados.
- [x] Tests: unitários TOTP, integração API, browser E2E de primeiro cadastro e convite para cada papel, rollback de estado pendente, a11y e regressão.
- [x] Documentação de operador e tutorial do usuário final com capturas sem tokens/segredos.

## 6. Entrega Codex / GitHub

1. Confirmar o estado atual de `develop` e do PR #3. **Não alterar branches compartilhadas nem fazer merge automaticamente.** Se PR #3 ainda não estiver integrado, declarar dependência ou basear PR de implementação em sua branch com alvo explícito e plano de rebase após merge humano.
2. Criar branch de implementação `codex/onboarding-primeiro-acesso-mfa` a partir da base correta.
3. Incluir este arquivo de especificação no PR de implementação (cherry-pick/cópia da branch de referência); manter checklist atualizado.
4. Implementar, rodar testes e CI, anexar vídeo/capturas **sem códigos/chaves** para desktop, mobile e modo escuro.
5. Abrir PR para revisão humana com matriz de papéis, evidências, migrações, riscos e instruções do teste local. **Não fazer merge, deploy, acessar VPS ou alterar produção.**

## 7. Fora do escopo

Autenticação via Google OAuth, chamadas à API Google Authenticator, mudança geral de IAM, entrega real de e-mails, esquecimento de senha, refatoração de módulos clínicos, permissões novas de profissionais, alteração de domínio de produção.

Evidências e limites da execução: [relatório técnico](RELATORIO-MISSAO-03-MFA.md). Checklists de execução não autorizam merge/deploy; CI final e homologações externas estão discriminados no relatório/PR.
