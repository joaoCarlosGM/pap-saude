# Missão 03 — auditoria de primeiro acesso e MFA

## Base e decisão de integração

- `develop` verificada: `8ed7c14e063c025a52722b959b08fe7c99cf0818` (PR #2).
- PR #3 ainda aberto, sem merge: `21a5605eb251cf0aee4d4442b9deee8eb9e6bd84`.
  CI desse commit: [PASS](https://github.com/joaoCarlosGM/pap-saude/actions/runs/39278677950).
- Implementação em `codex/onboarding-primeiro-acesso-mfa`, baseada nesse commit
  para preservar integralmente o laboratório, inclusive recuperação de volume vazio.
- PR para `develop` declara dependência do PR #3. Após merge humano do #3, atualizar
  esta branch por rebase revisado sobre `develop` e repetir CI. Não há merge automático.
- Especificação copiada integralmente da branch documental
  `docs/missao-03-primeiro-acesso-mfa`, commit `7897a4d`; checklist atualizado abaixo.

## Auditoria prévia: mapa dos fluxos existentes

As referências de linha deste mapa são da base `21a5605`, anterior às alterações.

| Fluxo | Arquivos e referências na base | Decisão |
|---|---|---|
| Convites HUA e profissional | `src/server/invitations/invitation.service.ts:737` e `:740`; aceite `:510`; `src/components/auth/InvitationActivation.tsx:133`; `/api/invitations/accept` | Reutilizar serviço, token hash e vínculo definido pelo emissor. HUA depende de UBS aprovada. Aceite não cria sessão: usuário faz login. |
| Primeiro PAP_ADMIN | `scripts/local/provision.ts:31`, CLI `scripts/local/dev.mjs`; identidade e role global, sem sessão/fator prévio | Wizard depende da identidade autenticada e perfil efetivo, não de seed ou e-mail especial. |
| Login e challenge | `src/server/auth/login.service.ts:42`; `mfa-login.service.ts`; `totp-login.service.ts`; `LoginSecurity.tsx:6` | Senha leva ao challenge quando existe TOTP ativo. Somente conclusão real do challenge gera sessão verificada. |
| Conta e reautenticação | `src/server/auth/account-security.service.ts:13` e `:44`; `src/app/api/auth/security/route.ts:6`; `security-http.ts:42` | Preservar senha atual para vínculo e ações sensíveis, proprietário da sessão e origin/CSRF. |
| UI antiga | `src/components/admin/MySecurityClient.tsx:9` e `:43` | Remover mistura de campos e mensagem genérica; separar setup, confirmação, recuperação e senha/sessões. |
| TOTP e proteção | `src/server/auth/totp.service.ts:99`, `:213`; `src/server/security/constants.ts:44`; `src/server/admin/admin-http.ts:64` | SHA1, seis dígitos, 30s, janela ±1, pendência 10 min e criptografia mantidos. Guard administrativo continua exigindo fator ativo + sessão MFA válida. |
| IAM e clínica | `src/server/iam/system-role-catalog.ts:101`; `effective-access-profile.service.ts`; guards clínicos | PROFESSIONAL tem permissões clínicas limitadas à UBS e MFA opcional antes de ativar. Nenhuma mudança de política, organização ou permissão. PAP_ADMIN não ganha acesso clínico. |
| Progresso | `prisma/schema.prisma:304`; `src/server/onboarding/onboarding.service.ts:88`; `/api/onboarding/[tourKey]` | Reutilizar tabela; reservar a nova chave ao backend de segurança para impedir conclusão arbitrária pelo endpoint genérico. |

Não havia sinal de primeiro onboarding de segurança concluído. Existir um fator
ativo não prova que recuperação foi guardada ou que a sessão passou pelo challenge.
A nova persistência separa essas condições sem confundir tutorial com autorização.

## Reprodução e causa raiz dos erros

O texto antigo “Ação não autorizada ou dados inválidos” era aplicado a toda
resposta HTTP não bem-sucedida. Os testes reproduzem causas distintas:

- Senha incorreta em START/CONFIRM: `INVALID_REAUTH`.
- TOTP gerado dois minutos antes: `INVALID_MFA_CODE`, fora da janela preservada.
- PENDING com criação há mais de dez minutos: `MFA_ENROLLMENT_EXPIRED`, revogado.
- Novo START explícito revoga o PENDING anterior: confirmação antiga retorna
  `MFA_ENROLLMENT_REPLACED`, sem ativar fator.
- Sessão inválida: 401; origin estrangeira: 403; sem criar fator.
- Cinco falhas de confirmação: throttle durável no banco; próxima tentativa: 429.

Não há evidência para atribuir a falha original exclusivamente ao relógio. Também
não havia START disparado por efeito React na UI antiga: o problema demonstrável
é que cliques repetidos sempre substituíam o PENDING, e a interface não explicava
isso nem recuperava o cadastro após reload. A nova UI não faz START em effects.

## Implementação e contrato

`FirstAccessWizard`, `TotpSetupStep`, `RecoveryCodesStep` e `OnboardingTour` separam
as responsabilidades. O tour focaliza a orientação e destaca o controle real,
com link de foco, Voltar, Sair/Escape, Retomar e indicador de oito etapas. Não
cobre os botões com overlay. Tema claro/escuro, 320px, redução de movimento,
labels e avisos acessíveis foram contemplados. Verde `#064f50` e rosa existentes
na identidade dos convites são a origem dos tokens locais; neutros usam tokens
da aplicação. O idioma raiz foi corrigido para pt-BR.

- Login encaminha à rota independente `/primeiros-passos`. Usuários concluídos
  seguem automaticamente ao destino efetivo. `/minha-seguranca` serve a todos os
  papéis; `/primeiros-passos?ajuda=1` reabre orientações sem alterar credenciais.
- Layout administrativo também exige sessão MFA válida. APIs legadas e Beta
  preservam os guards e IAM existentes. A própria API de segurança continua
  acessível para ativar o fator, sem deadlock de bootstrap.
- GET `/api/auth/security` acrescenta expiração da pendência, perfil efetivo,
  progresso próprio e estado derivado de MFA. Não retorna segredo, URI ou códigos.
- START aceita `restart:true` somente por confirmação explícita. Sem ele, PENDING
  existente causa conflito. Lock da linha User via Prisma serializa START e
  ativação entre abas. Só `updatedAt` é tocado para esse lock; não há alteração
  de senha, role, vínculo ou prova MFA. A API de autoatendimento nunca substitui
  fator ACTIVE, inclusive após corrida. Contrato interno legado usado pelo fluxo
  autorizado de recuperação permanece compatível e coberto por regressão.
- Auditoria de ativação é preservada antes de emitir recuperação/progresso: falhas
  posteriores não apagam esse registro. Resposta perdida é retomada com senha e
  TOTP sem substituir o fator ativo; teste adversarial específico aprovado.
- CONFIRM retorna adicionalmente os códigos de recuperação da ativação, uma vez.
  Só hashes ficam no banco. Senha, TOTP, QR e URI ficam apenas na memória da aba
  e saem da UI após a etapa. QR é gerado com biblioteca local, sem serviço remoto.
- POST acrescenta `ONBOARDING_STEP`, `PAUSE_ONBOARDING`, `ACK_RECOVERY`,
  `COMPLETE_ONBOARDING`, `DEFER_OPTIONAL_MFA`, sem aceitar userId/role/org do cliente.
  Chave `security-first-access`, versão 1, passos monotônicos. Eventos de progresso
  são gravados na mesma transação do estado, sem dados sensíveis.
- Concluir para admin exige fator ativo, sessão própria não revogada/não expirada,
  challenge válido posterior à ativação e reconhecimento de recuperação. A sessão
  inicial é revogada pelo usuário e o login usa o mecanismo real. Nunca se escreve
  `mfaVerifiedAt` neste recurso. Para profissional sem MFA, deferir é permitido.
- Reload não recupera URI nem códigos de storage: oferece reinício explícito do
  PENDING ou rotação de recuperação com reautenticação forte. A mesma aba pode
  voltar e continuar com a chave atual. Fator ACTIVE não é trocado pelo tutorial.
- Erros permanecem genéricos para terceiros: detalhes acionáveis apenas para a
  própria sessão autenticada; fator estrangeiro/inexistente recebe o mesmo erro.
- Logs de requests de desenvolvimento foram desligados para não registrar query
  de convite; referrer global é `no-referrer`. Nenhuma chamada à API Google.

## Evidências e regressão

Testes executados contra PostgreSQL local descartável, dados sintéticos e
Chromium. Nenhuma conexão com VPS, entrega de e-mail ou deploy.

| Verificação | Resultado |
|---|---|
| API adversarial, três papéis, throttle, origin/sessão, estado, QR offline | PASS — 11 testes contando subtestes e QR, incluindo resposta de recuperação perdida |
| Browser PAP_ADMIN → MFA → recuperação → login → dashboard | PASS |
| Browser convite HUA → senha → MFA → login; reload PENDING | PASS |
| Browser convite PROFESSIONAL → senha → MFA → login | PASS |
| Browser PROFESSIONAL pode deferir; admin continua negado | PASS |
| Browser Escape/retomada/reload/foco sem novo fator | PASS |
| A11y automatizada axe WCAG A/AA, claro/escuro, desktop/320px | PASS nas etapas de boas-vindas, QR e recuperação |
| Beta 1 | PASS — 29 testes |
| Autenticação/MFA completa, incluindo TOTP e recuperação | PASS — 202 testes |
| Laboratório PR #3, inclusive inicialização interrompida | PASS — política e smoke completo |
| F04 integrada, TypeScript, lint e build | PASS — 78 testes e build de produção |
| F03 completa local | PASS — todas as nove suítes sem cache |
| Imagens runtime/migrador, privilégios e scan de vulnerabilidades | CI completo; resultado consolidado no PR |

O harness `scripts/test-first-access.sh` valida a label do cluster descartável,
fixa o nome `pap_saude_onboarding_test` e limpa apenas esse banco. E2E usa porta
3110 e pasta `.next-first-access`, excluída de Git, Docker e lint. CI instala
Chromium e executa a mesma suíte. A allowlist local F04 acrescenta somente esta
branch exata; regras de banco protegido e deploy não foram relaxadas.

As capturas em `docs/evidence/missao-03/` mascaram QR, campos, chave e códigos **antes**
da captura. Não há traces/vídeos/snapshots DOM privados automáticos; erros dinâmicos
são sanitizados antes dos anexos/reporter. Não imprimir diagnósticos com tokens.
Capturas revisadas: desktop, 320px, escuro, QR mascarado e recuperação mascarada.

## Migração, recuperação operacional e limites

Não há migration nova, edição de migration histórica nem nova tabela. Dados de
progresso usam o schema já integrado. Não existem credenciais de demonstração no
código da aplicação. O laboratório mantém senha e chave locais privadas.

Em rollback de aplicação, não apagar fatores ou progresso: preservar a criptografia
e usar versão compatível do backend, com guards MFA mantidos, ou roll-forward.
Progresso de UI nunca deve ser usado como autorização. Nenhum rollback de código
reverte dados ou autoriza alteração do banco de produção. É necessário revisar a
dependência do PR #3 e repetir CI sobre a base integrada antes do merge humano.

**GO para revisão/homologação local**, condicionado ao CI verde do commit final.
**NO-GO para declarar a missão integralmente homologada em aparelhos/produção**:
Google Authenticator físico, Windows/WSL do operador, leitor de tela e Safari/iOS
são NOT RUN. QR interoperável foi gerado/decodificado offline e o TOTP validado
em sessão real automatizada; isso não substitui leitura com celular. Seguir o
[roteiro exato do navegador](../admin/first-access-mfa.md) para validar esses itens.
Não houve merge, deploy ou acesso à VPS.
