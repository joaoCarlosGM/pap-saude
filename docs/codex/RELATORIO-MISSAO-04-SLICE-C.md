# Missão 04 — Slice C: convites globais, autorização e notificações

## Situação e limites da entrega

Implementação local na branch `feature/ux-iam-convites-vitrine-email`, sobre `481d6a3dccafbd626355648ee52a19f8512434f3`. **Sem commit, staging ou push do C; revisão humana obrigatória.** O gate anterior [39830266943](https://github.com/joaoCarlosGM/pap-saude/actions/runs/39830266943) foi consultado e confirma esse SHA: job de segurança/migrations/builds SUCCESS; publicação e deploy SKIPPED. Esse resultado pertence à base SEC-01, não valida o C. O [PR #5](https://github.com/joaoCarlosGM/pap-saude/pull/5) permanece OPEN/draft, base develop. Não houve alteração de bases de PRs.

Escopo implementado: convite global sem UBS, consentimento separado da autorização IAM, fila administrativa, espera real, notificação persistente e captura local de e-mail. Templates completos, reset HTML/local-demo e homologação externa pertencem ao D; vitrine e ferramentas comerciais pertencem ao E; métricas do dashboard pertencem ao F. A rota `/comercial` é apenas destino autorizado mínimo, com recursos explicitamente em construção, sem KPIs fictícios.

## C-AUDIT-01 — consentimento preservado na aprovação

**Achado confirmado na revisão:** o ramo PAP_ADMIN de `approveAccessInvitation()` validava se o papel era permitido, mas não se era o papel aceito; depois sobrescrevia `proposedRoleKey`. Isso permitia transformar um consentimento COMMERCIAL em PAP_MANAGER durante a aprovação. As suítes anteriores não cobriam essa substituição; seu PASS não demonstrava esse contrato.

**Correção:** dentro da mesma transação SERIALIZABLE, após os guards atuais de MFA, propriedade e delegação, `roleKey !== row.proposedRoleKey` gera `INVITATION_ROLE_MISMATCH` (409), antes de concessão, decisão, notificação ou auditoria de aprovação. O update de aprovação não escreve mais `proposedRoleKey`. A mesma regra se aplica ao PAP_ADMIN, às repetições ACTIVE e a concorrência. Manager continua restrito ao COMMERCIAL próprio (403/404 para papel/propriedade indevidos). Contadores de abuso continuam operando; a negação não cria efeitos de autorização.

**Interface:** a decisão mostra “Perfil aceito” como texto, sem seletor ou estado local de papel. A requisição envia exclusivamente `row.proposedRoleKey`; organização do vínculo continua selecionável apenas para o papel institucional aceito e validada no serviço B. A escolha de proposta na emissão de um convite novo continua legítima. Para mudar o papel neste fluxo, encerrar o convite e emitir outro, com novo token e aceite explícito. Sem nova migration, sem alteração de schema, catálogo IAM, bootstrap, política MFA, autenticação ou isolamento clínico.

**Quatro testes adversariais novos (Node):** COMMERCIAL→PAP_MANAGER e PROFESSIONAL→HEALTH_UNIT_ADMIN/COMMERCIAL negados duas vezes em pares concorrentes, com snapshot do convite, concessões, notificações, contagem de auditoria e correio capturado intactos; aprovação Professional original depende de vínculo ativo e mantém estado em replay; aprovação Commercial legítima concorrente com duas substituições produz somente um grant/aviso/evento e preserva acceptedAt/proposta; papel diferente exige novo convite e novo aceite, mantendo o histórico rejeitado intacto. **Um teste browser novo:** PAP_ADMIN vê o papel aceito sem combobox na decisão, payload COMMERCIAL e aprovação real, com axe. Os testes percorrem os handlers HTTP reais e PostgreSQL descartável, sem mock do guard/Prisma.

### Validação executada após a correção

Data da consolidação: 2026-10-23T09:43:07.880292-03:00 (America/Fortaleza). Matriz atual; a matriz original mais abaixo é histórica.

| Comando | Resultado | Evidência |
|---|---|---|
| `npm run test:mission04:c:browser` | **PASS** | 41/41 TAP/Node; 8 Playwright |
| `npm run test:mission04:b:browser` | **PASS** | 28/28 TAP/Node; 5 Playwright |
| `npm run test:auth` | **PASS** | 202/202 TAP/Node |
| `npm run audit:f04:operations` | **PASS** | 78/78 TAP/Node |
| `npm run test:admin:beta1` | **PASS** | 29/29 TAP/Node |
| `npm run test:first-access:browser` | **PASS** | 21/21 TAP/Node; 15 Playwright |
| `npm run test:f03:smart:force` | **PASS** | 203/203 TAP/Node |
| `npx tsc --noEmit` | **PASS** | exit 0; execution.log |
| `npm run lint` | **PASS** | exit 0; execution.log |
| `npm run build` | **PASS** | exit 0; execution.log |
| `node scripts/security/guard-f04-ci-workflow.mjs && node --test tests/security/f04-ci-workflow.test.mjs tests/security/f04-migration-preflight.test.mjs tests/local/policy.test.mjs` | **PASS** | 7/7 TAP/Node |
| `docker build --add-host "proxy:$F04_DOCKER_PROXY_IP" --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret "id=build_ca,src=$NODE_EXTRA_CA_CERTS" --target runner -t pap-saude:c-audit-01 .` | **PASS** | exit 0; execution.log |
| `bash scripts/test-f04-web-image.sh pap-saude:c-audit-01 pap-saude-migrator:m04-c` | **PASS** | exit 0; execution.log |
| `bash scripts/security/scan-f04-images.sh pap-saude:c-audit-01 pap-saude-migrator:m04-c` | **PASS** | exit 0; execution.log |
| `npm audit --omit=dev --audit-level=high --json` | **PASS** | {"info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0} |
| `npm audit --prefix docker/migrator --include=dev --audit-level=high --json` | **PASS** | {"info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0} |
| `npm audit --include=dev --json` | **FAIL** | {"info": 0, "low": 0, "moderate": 1, "high": 9, "critical": 0, "total": 10} |
| `CI remoto C-AUDIT-01` | **NOT RUN** | Sem staging/commit/push; aguarda aprovação |
| `Laboratório manual` | **NOT RUN** | Acesso e alteração proibidos; apenas recursos sintéticos descartáveis |
| `E-mail externo` | **NOT RUN** | Slice D não iniciado; nenhuma entrega real |
| `Browser C em produção` | **NOT RUN** | Playwright no Next dev isolado; runner corrigido validado funcionalmente |
| `local-dev smoke` | **NOT RUN** | Não executar harness com nomes do laboratório protegido; testes puros de política passaram |

**FAIL inicial de infraestrutura:** a primeira execução funcional Docker abortou por `No space left on device` ao criar tabela no PostgreSQL descartável; o migrator manteve o web parado. Foram removidos exclusivamente os caches de build `khx0lvjshzxatl3pfrkimel4k` e `o55h8xbwl42vmg9rhelypmoyv`, criados neste build e conferidos por timestamp/descrição/parentesco, sem prune geral, imagem removida, banco/volume desconhecido ou laboratório manual. A mesma imagem já construída foi testada novamente; resultado final e scan constam da matriz. O FAIL inicial e a limpeza seletiva permanecem no log integral.

**FAIL atual:** somente a auditoria completa de dependências de desenvolvimento (9 HIGH + 1 MODERATE herdadas, lockfile inalterado). Nenhuma falha funcional remanescente nas execuções acima; nenhum teste novo ignorado. CI remoto da correção, homologação no laboratório real, browser C em produção e envio externo: **NOT RUN**. Não houve correção automática de dependências, staging, commit, push ou alteração de PRs. O migrator não foi reconstruído porque SQL/Dockerfile/lockfiles são iguais; a imagem existente participa do teste funcional do runner corrigido e do scan atual, sem usar testes históricos como evidência do código corrigido.

A evidência `validation.json` preserva a rodada anterior em `previousValidation`, registra resultados novos e hashes dos arquivos atuais. `execution.log` mantém a cronologia e acrescenta a seção C-AUDIT-01. Inventário mantém **67 caminhos**, dos quais exatamente quatro arquivos de código/testes mudaram em relação ao C auditado; documentos e evidências foram atualizados. Logs de testes que regeneraram artefatos A1/B/Missão 03 não alteram o escopo: esses arquivos e AGENTS foram preservados na área ignorada e restaurados da base, sem acessar o laboratório manual.

## Arquitetura e estados

- `access_invitations` é uma entidade nova; não se altera o significado dos convites institucionais legados. A emissão não cria usuário, membership, role assignment ou organização. Aceitar cria/confirma identidade e senha; não cria sessão nem concessão IAM.
- Estados: PENDING_ACCEPTANCE → PENDING_ASSIGNMENT → ACTIVE. Alternativas explícitas: EXPIRED, REJECTED e REVOKED. Expiração é aplicada na leitura/uso; a limpeza do slot ocorre na emissão posterior. Não há job de expiração presumido.
- Somente autorização cria o RoleAssignment real, mediante consentimento anterior, IAM/MFA atuais e política B. Uma constraint diferida no COMMIT rejeita ACTIVE sem concessão system correspondente. Membership e organização não são criadas/ativadas por essa ação.
- Um único convite vivo por e-mail normalizado (`email,activeSlot`); histórico encerrado permanece. Token de 32 bytes aleatórios, base64url, SHA-256 com domínio próprio, validade de 48h, hash único, uso único. Reenvio explícito troca hash/versão e invalida o anterior, inclusive quando a aba antiga está aberta.
- O link novo usa fragmento; o cliente remove-o imediatamente do endereço e mantém o segredo somente em memória. INSPECT/ACCEPT recebem token em POST limitado, com CSRF. Nenhum token, URL de convite ou hash é devolvido pela API nova. O contrato legado institucional ainda usa sua rota e URL anteriores (query token/developmentUrl em desenvolvimento); não se declara sua conversão para fragmento no C, e seus segredos não entram nas novas APIs/evidências. Recarregar uma página de aceite após remover o fragmento exige reabrir o link legítimo; não se persiste bearer no navegador.
- Identidade existente exige a senha atual, sem rehash/substituição. Se já possui TOTP ativo, exige a sessão MFA verificada da mesma identidade. Cookie de outra conta não é aceito; há saída explícita da conta, sem logout silencioso. Alteração concorrente da senha/identidade invalida a tentativa.
- Fila paginada (20), filtro por estado, motivos e captura local reais. Gerente vê apenas convites que emitiu; Admin vê todos. Página de espera e notificações usam identidade da sessão, sem parâmetros de outro usuário, revisor, motivo interno ou métricas privadas.
- Notificação in-app participa da mesma transação da concessão/revogação. Deduplicação por convite/evento, leitura idempotente e auditoria própria. Caixa mostra os 30 eventos mais recentes; registros anteriores permanecem no banco, sem paginação de histórico neste slice.

## Matriz de permissões

| Operação C | PAP_ADMIN com MFA | PAP_MANAGER com MFA | COMMERCIAL | Sem perfil / sessão primária |
|---|---|---|---|---|
| Emitir convite global | Sim, cinco propostas permitidas | Sim, sem PAP_MANAGER | Não | Não |
| Ler fila | Todos | Somente próprios | Não | Não |
| Aprovar PAP_MANAGER | Sim | Não | Não | Não |
| Aprovar COMMERCIAL | Sim | Somente próprio, proposto COMMERCIAL | Não | Não |
| Aprovar PROFESSIONAL / HEALTH_UNIT_ADMIN / MUNICIPAL_ADMIN | Sim, política B e vínculo ativo preexistente | Não; pode apenas propor | Não | Não |
| Reenviar | Convite não aceito, sem outro slot vivo | Somente próprio e proposta permitida | Não | Não |
| Rejeitar / revogar acesso | Política B, motivo obrigatório | Próprio COMMERCIAL; pode cancelar convite próprio ainda pendente | Não | Não |
| Nomear PAP_ADMIN / autoelevação | Não pelo C | Não | Não | Não |
| Ativar/desativar/excluir UBS | Fluxos B existentes, separados | Não | Não | Não |
| Consultar estado/notificações próprios | Sessão válida | Sessão válida | Sessão válida | Sessão própria válida, sem acesso operacional |
| Dados clínicos | Apenas concessão clínica independente | Apenas concessão clínica independente | Não pelo perfil Commercial | Não pelo convite |

Papéis propostos permitidos: PAP_MANAGER, COMMERCIAL, PROFESSIONAL, HEALTH_UNIT_ADMIN e MUNICIPAL_ADMIN. Global pode aprovar somente o papel originalmente proposto e aceito, respeitando o escopo; não pode substituir a proposta durante a decisão. MUNICIPAL_ADMIN exige município correto, vínculo ativo e disponibilidade; responsáveis/profissionais exigem UBS correta e vínculo ativo. Não se cria vínculo automaticamente. Autorização de perfil não ativa UBS. Gerente não ganha `organization.read` privado nem novas permissões: catálogo, bootstrap e políticas clínicas B permanecem inalterados.

## Autoridade, MFA e concorrência

HTTP aplica o guard administrativo atual com MFA verificado na sessão exata; as mutações repetem `requireAdminActor`, perfil efetivo e regras de delegação **dentro de SERIALIZABLE**, incluindo revisão do emissor atual, alvo, escopo, membership e organização. Extraíram-se helpers transacionais do serviço B, preservando validações, proteção do último PAP_ADMIN e wrappers dos endpoints existentes. O C usa o helper na mesma transação da decisão, grant e notificação. Sem autorização por papel enviado pelo navegador.

O endpoint antigo de atribuição retorna `PENDING_ACCESS_AUTHORIZATION` (409) para identidade com convite C pendente. Emissão e aceite institucional antigos também negam bypass de pendência C; vínculos e tokens institucionais sem essa pendência mantêm seu contrato anterior. Revogação legítima pela rota antiga fecha o estado C e cria notificação na mesma transação.

Rate limiting usa o UPSERT PostgreSQL existente: 30 mutações por ator/operação/hora, 100 consultas/aceites públicos por origem/operação/hora e 10 provas de identidade por hash de token/hora. Corpo e campos são limitados; parâmetros extras/IDs de terceiros são negados. Sem enfraquecer validação de origem, configuração de proxy confiável ou guards clínicos.

Provas concorrentes reais usam PostgreSQL/Prisma, não mock de transação: criação duplicada, aceite, aprovação, reenvio versus aceite e aprovação versus revogação. Um teste segura a linha do rate limiter após o guard HTTP, revoga a sessão por serviço real ou retira o papel por outra conexão, libera a requisição e comprova negação no recheck transacional. SERIALIZABLE admite ordenação legítima entre ações simultâneas: não se promete cancelar retroativamente ação que já estava autorizada antes da revogação concorrente.

## E-mails e recuperação de falhas

Reutiliza-se o adapter existente `email.service.ts` e o sink `local-demo-mail.ts`; idempotency key Resend institucional foi preservada. C solicita explicitamente `localDemoOnly`, sem chamada externa mesmo com provider Resend configurado. Captura continua limitada ao laboratório local já suportado, ou ao harness C explicitamente opt-in em banco/porta/origem/diretório descartáveis exatos. Diretórios 0700, arquivos 0600, rejeição de symlink final e criação exclusiva; nome determinístico com prefixo temporal mantém `local:mail` e deduplica retries, reparando par parcialmente gravado sem sobrescrever.

Falha de captura inicial fecha o token (REVOKED/FAILED). Operador pode reenviar explicitamente um convite não aceito e recuperar falha. A aprovação preserva o grant e a notificação in-app se a captura de liberação falhar; fila mostra FAILED/PENDING e oferece retry autorizado. Não há worker automático: interrupção após COMMIT pode deixar PENDING e requer essa ação. Revogação cancela aviso de aprovação ainda pendente/falho. Um envio já capturado em corrida não pode ser removido: texto informa autorização registrada e exige consultar situação atual, sem prometer acesso ainda vigente. CAPTURED significa arquivo local, nunca entrega externa.

## Migração e preservação

Migration aditiva `20261022050000_mission04_global_access`: enum, duas tabelas, índices, FKs, CHECKs e constraint trigger. Nenhuma alteração ou UPDATE em credenciais, fatores TOTP, recuperação, sessões, memberships, papéis/UBS existentes. SQL e diffs de autorização completos estão na auditoria separada. O diff de `Topbar.tsx` inclui normalização CRLF→LF para permitir verificação de whitespace; semanticamente muda apenas o atalho de notificações e remove o marcador fixo de aviso não lido.

O teste de upgrade cria dois bancos descartáveis próprios. Executa todas as migrations pré-C, popula credenciais/MFA/sessões/UBS/convites sintéticos, faz pg_dump/pg_restore real (dump apenas em memória), compara snapshots antigos exatos e aplica C nas duas cópias. Repete migrate deploy/bootstrap, valida sessão original, login real com senha/TOTP existentes e aceite de convite institucional anterior. Não é uma simulação nem prova sobre dados privados do operador.

Estabilização de teste MFA legado: a primeira rodada Beta falhou na confirmação com código do período anterior, seguida de falhas dependentes de fator não ativado. O teste agora usa código atual e aguarda mudança de contador antes do login, mantendo TOTP e anti-replay reais; nenhuma janela/guard de produção foi alterada.

Adaptação de teste B: seu snapshot deliberadamente pré-B/pré-C agora insere a fixture institucional legada fiel diretamente, pois o serviço atual exige o schema C para impedir bypass. Não foi introduzido fallback de tabela ausente na autorização de produção. O novo teste C cobre uso real do token legado após upgrade.

**Nenhum recurso do laboratório manual foi acessado ou alterado.** Não se leu `.local`, credenciais ou dados do worktree protegido. Conta, senha, MFA, banco e volumes do operador não foram consultados, reprovisionados, migrados ou reiniciados. A comprovação na conta real é NOT RUN por preservação obrigatória; a preservação sintética foi testada. Não se promete duração indefinida de cookies/sessões: expiração/revogação continuam pela política existente.

## Experiência e evidências visuais

Espera segue a referência local, ilustração existente, tema isolado, status/etapas reais, consulta explícita, ajuda, logout e notificações. Sem sidebar clínica/admin, SLA inventado, identificação do revisor ou dados internos. Perfil ACTIVE com vínculo/organização indisponível é mostrado como autorizado porém indisponível, sem inventar revogação. Comercial chega ao destino mínimo; novo Manager passa pelo wizard/TOTP e novo login, enquanto conta com onboarding concluído segue ao Admin sem recadastro.

Playwright cobre 320/768/1440, claro/escuro, axe WCAG A/AA, teclado e reload. Screenshots em `docs/evidence/missao-04-c/` mascaram e-mails, inputs e campos privados; nunca se fotografa QR, OTP, segredo TOTP ou recuperação. Métricas LCP/CLS são medições locais de uma rodada Next dev, não p75 de produção ou SLA. Inspeção visual desktop/mobile/escuro complementa axe, sem alegar auditoria humana assistiva externa.

## Homologação manual futura — somente após aprovação

Não executar estes passos no laboratório agora. Quando o operador autorizar a atualização, seguir a seção de preservação da especificação: inspecionar a branch `test/onboarding-primeiro-acesso-mfa`, alterações pendentes (inclusive diagnóstico de provisionamento), ancestralidade, backup privado e restauração comprovada. Fazer apenas avanço fast-forward revisado da mesma branch e migration forward-only, sem reset, sem trocar `.local`/chave MFA e sem `local:init`/`local:admin`. Se não houver fast-forward seguro, parar e planejar.

Depois da atualização explicitamente aprovada, no terminal WSL do laboratório existente:

```bash
cd ~/projetos/pap-saude-onboarding
npm ci
npm run local:start
# Somente depois do backup/revisão e autorização da migration:
npm run local:migrate
npm run local:dev
```

1. Abrir `http://127.0.0.1:3100/login`; usar o PAP_ADMIN, senha e TOTP **já existentes**, sem informá-los ao chat. Confirmar Admin sem reabrir wizard; Minha segurança continua gestão da conta.
2. Em **Convites e autorizações**, convidar endereço escolhido pelo operador, proposta PAP_MANAGER, sem UBS. A fila deve mostrar PENDING_ACCEPTANCE e captura local, sem link/token na resposta HTTP.
3. Em outro terminal do mesmo laboratório: `npm run local:mail` lista mensagens; `npm run local:mail -- N` abre o texto da mensagem escolhida. O link privado contém bearer: usar apenas localmente, não copiar para relatório/chat/captura. Nenhum e-mail externo deve chegar.
4. Em perfil separado do navegador, abrir o link; definir senha própria (ou confirmar senha existente; identidade já com TOTP exige login MFA da mesma conta). Aceitar, entrar e comprovar `/aguardando-autorizacao`, ajuda/consulta/logout e negação de `/admin`/`/dashboard`/APIs clínicas.
5. No Admin, aprovar o Manager com motivo. Na conta convidada consultar status/aviso, continuar; **novo** Manager configura TOTP pelo QR no aplicativo e cumpre novo login com seis dígitos. Manager preexistente com onboarding concluído usa seu fator atual, sem wizard repetido.
6. Como Manager convidar segundo endereço para COMMERCIAL; aceitar em perfil de navegador separado, ver espera, aprovar no Manager. Confirmar aviso persistente, leitura após reload, e-mail **capturado localmente** de liberação e `/comercial` após login, sem acesso clínico/private organizations.
7. Manager não deve nomear Manager/Admin, aprovar outro escopo, ver fila de outro gerente ou ativar UBS. Para papel UBS, Admin precisa vínculo ativo legítimo anterior; sem ele a decisão é negada e UBS não muda.
8. Reenviar convite ainda não aceito; link anterior deve falhar. Testar vencido/revogado/reutilizado com fixtures descartáveis, sem editar relógio/banco manual. Revogar Commercial pela fila; sessão pode continuar válida, mas acesso operacional é retirado, status real e aviso de revogação aparecem.
9. Conferir 320/768/1440, modo escuro, teclado, ajuda, notificações e retorno após reload. Não capturar segredos. `/vitrine` e reset de senha HTML ainda aguardam D/E; não são critérios de aprovação deste C.

## Resultados originais do C — histórico anterior ao C-AUDIT-01

| Comando / verificação | Resultado | Quantidade / evidência |
|---|---|---|
| `npm ci` | **PASS** | 916 pacotes instalados |
| `npm run audit:f04:operations` | **PASS** | 78/78 TAP/Node |
| `npm run test:admin:beta1` | **PASS** | 29/29 TAP/Node |
| `npm run test:mission04:b:browser` | **PASS** | 28/28 TAP/Node; 5 browser |
| `npm run test:first-access:browser` | **PASS** | 21/21 TAP/Node; 15 browser |
| `npm run test:auth` | **PASS** | 202/202 TAP/Node |
| `npm run test:f03:smart:force` | **PASS** | 203/203 TAP/Node |
| `node scripts/security/guard-f04-ci-workflow.mjs && node --test tests/security/f04-ci-workflow.test.mjs tests/security/f04-migration-preflight.test.mjs tests/local/policy.test.mjs` | **PASS** | 7/7 TAP/Node |
| `bash scripts/test-f04-role-separation.sh` | **PASS** | DML runtime permitido; DDL, alteração de auditoria e escalada negados; migration DDL permitido |
| `bash scripts/test-f04-postgres-readiness.sh` | **PASS** | exit 0; log integral |
| `npm run test:mission04:c:browser` | **PASS** | 37/37 TAP/Node; 7 browser |
| `env -u DATABASE_URL npx tsx -e 'import "./prisma.config.ts";'` | **PASS** | negação esperada sem URL; exit não zero e mensagem obrigatória conferidos |
| `npx tsc --noEmit` | **PASS** | exit 0; log integral |
| `npm run lint` | **PASS** | exit 0; log integral |
| `npm run build` | **PASS** | exit 0; log integral |
| `docker build --add-host "proxy:$F04_DOCKER_PROXY_IP" --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret "id=build_ca,src=$NODE_EXTRA_CA_CERTS" --target runner -t pap-saude:m04-c .` | **PASS** | exit 0; log integral |
| `docker build --add-host "proxy:$F04_DOCKER_PROXY_IP" --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret "id=build_ca,src=$NODE_EXTRA_CA_CERTS" --target migrator -t pap-saude-migrator:m04-c .` | **PASS** | exit 0; log integral |
| `bash scripts/test-f04-migrator-image.sh pap-saude-migrator:m04-c` | **PASS** | 31 migrations; fresh/legado/checksum/backup/idempotência/falha SQL real |
| `bash scripts/test-f04-web-image.sh pap-saude:m04-c pap-saude-migrator:m04-c` | **PASS** | non-root; health/login; tentativa negada gravada com role runtime |
| `bash scripts/security/scan-f04-images.sh pap-saude:m04-c pap-saude-migrator:m04-c` | **PASS** | web + migrator, zero HIGH/CRITICAL, scanner exit 0 em ambos |
| `npm audit --omit=dev --audit-level=high --json` | **PASS** | {"info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0} |
| `npm audit --prefix docker/migrator --include=dev --audit-level=high --json` | **PASS** | {"info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0} |
| `npm audit --include=dev --json` | **FAIL** | {"info": 0, "low": 0, "moderate": 1, "high": 9, "critical": 0, "total": 10} |
| `remote-ci-C` | **NOT RUN** | C não commitado/pushado; aguardando revisão humana |
| `manual-lab` | **NOT RUN** | Preservação obrigatória; sem acesso ao ambiente real do operador |
| `local-dev-smoke` | **NOT RUN** | Não executar harness que usa nomes do laboratório manual; testes puros de política passaram |
| `external-email` | **NOT RUN** | Slice D; sem envio real, DNS, VPS ou túnel |
| `production-C-browser` | **NOT RUN** | Browser C executado em Next dev isolado; runner produção validado funcionalmente, sem jornada C em produção |

Contagens TAP incluem pais/subtestes conforme o runner; não se declara número de cenários únicos pela soma de suítes. F03 forçado: 9/9 módulos, sem reutilizar cache de resultados. C: 36 testes de domínio + 1 upgrade/restauração e 7 jornadas browser; primeira execução C final falhou só na asserção 400/410 e está preservada no log. Login, MFA, callbacks e grants de produção não foram enfraquecidos.

Evidências: [validation.json](../evidence/missao-04-c/validation.json), [execution.log](../evidence/missao-04-c/execution.log), [dependency-audits.json](../evidence/missao-04-c/dependency-audits.json), [legacy-upgrade.json](../evidence/missao-04-c/legacy-upgrade.json), [performance.json](../evidence/missao-04-c/performance.json). Versões: Next/eslint-config-next 16.4.2, React/React DOM 19.2.8; lockfile inalterado. SHA-256 dos arquivos de código na validação liga as evidências ao diff entregue.


## Falhas encontradas e corrigidas durante a implementação

| Rodada | Resultado real | Correção / repetição |
|---|---|---|
| C inicial | FAIL: 27/32 Node | Ajustados payload/assertions aos contratos legados; retirada tentativa de mock do proxy Prisma, substituída por concorrência real PostgreSQL; fixture de sessão revogada passou a usar o serviço real e seu motivo obrigatório |
| C após ajustes | FAIL: 32/33 Node | Fixture de revogação corrigida; teste novo de upgrade/restore já PASS |
| C browser inicial | FAIL: 35 Node PASS, 3/6 browser | Expectativa passou a admitir landing Manager `/admin/solicitacoes`; alertas restritos ao componente, sem confundir announcer Next |
| C browser seguinte | FAIL: 35 Node PASS, 5/7 browser | Espera de imagem limitada às visíveis (lazy oculta no mobile não decodifica); espera do reload de novo fragmento passou a usar URL, sem evaluate em contexto destruído |
| C intermediário | PASS: 37 Node, 7 browser | Evidência intermediária; não substitui a rodada final após os últimos testes |
| Beta amplo inicial | FAIL: 4/8 itens MFA (inclui pai e falhas dependentes); restante anterior passou | Teste de TOTP com código atual e novo contador para login; repetição Beta integral PASS: 29/29 |
| C final antes da correção de asserção | FAIL: 36/37 Node; browser NOT RUN nessa rodada | Novo teste provou negação legada HTTP 410, mas esperava 400; corrigida somente expectativa ao contrato `InvalidInvitationError`, sem alterar o guard |

O inventário AST de MFA foi conferido e preservado: novo GET/POST chama diretamente o guard compartilhado. Builds/checagens finais e nova imagem correspondem a essa alteração. A matriz histórica registra os comandos daquela rodada; os resultados atuais estão na seção C-AUDIT-01; CI anterior não foi usado para preencher evidências faltantes.

## Riscos residuais e decisão

**GO para revisão humana do C; NO-GO para produção, merge e envio externo.** Nenhuma aprovação automática de commit/push. CI remoto do C é NOT RUN até aprovação e versionamento. Laboratório manual permanece intocado; homologação na conta real é externa e pendente.

Auditoria completa de desenvolvimento: **FAIL**, nove HIGH herdadas (`@next/eslint-plugin-next`, `@shadcn/registry`, `@ts-morph/common`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`, `shadcn`, `ts-morph`, cadeia [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)) e uma MODERATE em `ip-address` ([GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5)). O aviso moderado também está em dependência já presente no lockfile imutável; não representa upgrade do C. Zero CRITICAL; produção e migrator zero vulnerabilidades. Sem audit fix, force, overrides ou remoção de gates. Requer avaliação do operador; não se apresenta a auditoria completa como PASS.

Limites: ausência de worker automático para retry, captura local sem entrega real, templates completos/externalização ainda D, vitrine E não implementada, browser em servidor Next dev (não produção), auditoria assistiva humana e homologação privada pendentes. Os testes de concorrência cobrem os cenários descritos, não todas as ordenações possíveis. pg emite aviso de depreciação sobre query concorrente no driver/adapter durante testes; sem falha de invariantes observada, dependências não atualizadas. As medições locais de performance são diagnósticas. Novas notificações mantêm histórico no banco, mas UI limita a 30 eventos recentes.

Evidências A1/B/Missão 03 e heading automático de AGENTS regenerados por Next/testes foram guardados somente em `.test-audit/mission04-c-generated/` e restaurados byte a byte da base. Nenhuma instrução de projeto ou artefato histórico foi incorporado ao diff do C. Sem reorganização dos PRs, sem merge/deploy ou início do D/E/F.


Conferência final: **67 caminhos**, índice vazio, `git diff --check` PASS e checagem de whitespace também nos novos arquivos PASS. Hashes dos 45 arquivos de código/testes/configuração conferidos; catálogo/bootstrap/guard MFA/lockfile iguais à base. Inspeção dos logs e varredura de padrões de segredo sem ocorrências; isso não representa prova de todos os formatos possíveis de segredo. PostgreSQL próprio removido por ID após conferir os rótulos; detalhes em `docs/evidence/missao-04-c/cleanup.json`.

O inventário exato, staging futuro e diffs completos estão em `AUDITORIA-MISSAO-04-C.md`. Nenhum comando de staging deve ser executado antes da aprovação humana do C.
