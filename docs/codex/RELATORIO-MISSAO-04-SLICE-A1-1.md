# Missão 04 — A1.1: navegação autenticada no login

Estado: finalização A1.1 autorizada pelo operador, condicionada aos testes obrigatórios, aprovados na rodada abaixo. Registro anterior de revisão preservado como histórico. A autorização desta etapa não dispensa o gate do pedido: A1.1 precisa ser aprovado, commitado seletivamente e enviado antes de iniciar a implementação B. PR #5 permanece draft. Não iniciar C.

## Base auditada e plano

Branch `feature/ux-iam-convites-vitrine-email`, HEAD `d6f69f6ac197b0f53035e5c6542d4cacb8cf2282`, árvore inicialmente limpa. [CI desse A1](https://github.com/joaoCarlosGM/pap-saude/actions/runs/39700424312): SUCCESS. Esse resultado é histórico e não valida o diff A1.1 ainda não publicado. PRs #3, #4 e #5 observados abertos; não foi presumido merge na develop.

Lidos o pedido A1.1+B, AGENTS.md, MISSAO-04-UX-IAM-CONVITES-VITRINE-EMAILS.md, PROMPT-CODEX-MISSAO-04.md, documentação de primeiro acesso/autenticação, auditoria Foundation 02 e guias Next instalados de cookies/redirect/server components. Inspecionados sessão, challenge, MFA, firstAccessState, perfil efetivo, guards, catálogo IAM, atribuições, bootstrap, schema e revisão institucional.

Plano com gates: (1) entregar A1.1 com diff/testes; (2) após aprovação, commit `fix(auth): redirect authenticated users away from login` e push seletivo; (3) implementar B, validar e apresentar para nova aprovação; (4) somente depois commit B e CI remoto. Nenhuma implementação B ou C neste diff.

## Auditoria inicial B — sem alteração de código B

- `PAP_MANAGER` não existe no catálogo; atribuições globais atualmente reconhecem PAP_ADMIN e COMMERCIAL. `assignSystemRole` é uma primitiva sem ator; os caminhos expostos e wrappers precisam aplicar autorização do ator. Não basta adicionar o novo papel ao catálogo.
- `COMMERCIAL` possui `organization.read` e permissões comerciais. Perfil efetivo/authorize fazem interseção com o catálogo e grants persistidos; remover leitura privada exige revisar também entrypoints, serviços e bootstrap.
- `requirePapReviewer` usa PAP_ADMIN com `organization.manage`; `reviewBetaRequest` cria HEALTH_UNIT ACTIVE ao aprovar, resolve requests e audita ativação na mesma transação. A revisão e a ativação precisam ser decisões separadas no B.
- Schema: OrganizationStatus já tem PENDING_VERIFICATION/ACTIVE/SUSPENDED/ARCHIVED; CandidateStatus tem NEW/VALIDATING/APPROVED/REJECTED e outros estados comerciais; RequestStatus tem REQUESTED/WITHDRAWN/RESOLVED. Role é catálogo em tabela, não enum Prisma. Isso permite estudar reaproveitamento de estados ou extensão aditiva, sem redefinir o significado destrutivamente para registros antigos.
- B deverá definir explicitamente estados/transições, permissões exclusivas de ciclo de vida, nomeação/revogação e autorização Comercial, MFA no backend, concorrência/idempotência e auditoria. Qualquer migration será forward-only e testada com dados representativos antes de adoção. Nenhuma conta Gerente automática, reclassificação de UBS já ativa, rotação de credenciais ou recadastro Admin/MFA.
- A escolha final de schema/migration e matriz B será apresentada com a implementação B, após o gate A1.1. Não há migration neste diff.

## B0 — Guard clínico obrigatório no Slice B

Confirmada a ausência de guard próprio em `src/app/(dashboard)/layout.tsx`. No B, tratar como critério de aceite obrigatório, não apenas melhoria visual:

1. Proteger a entrada clínica no servidor com sessão real e autorização efetiva por unidade/vínculo ativo, reutilizando IAM existente. Não usar apenas cookie, nome do papel, canAccessAdmin ou redirecionamento do login como autorização clínica.
2. Negar acesso clínico implícito a PAP_ADMIN, PAP_MANAGER, COMMERCIAL e contas sem permissão clínica. Permitir somente concessão clínica explícita e válida no escopo correto, preservando a política MFA profissional. Papéis administrativos não ganham acesso a prontuário por serem globais.
3. Aplicar proteção também na camada de dados, páginas, Route Handlers e Server Actions: o layout sozinho não basta, pois renders podem ocorrer em paralelo e chamadas diretas não passam pelo layout. Autorizar antes de consultar/serializar dados clínicos; manter todas as verificações existentes de tenant/IDOR.
4. Criar cenários adversariais para acesso direto a `/dashboard`, páginas clínicas, HTML/RSC e APIs por anônimo, sessão expirada/revogada, Admin/Gerente/Comercial sem grant clínico, conta sem papel, vínculo revogado/unidade suspensa e organizationId/patientId de outra UBS. Provar ausência de payload clínico real, não só ausência de botões.
5. Provar o caminho positivo do profissional autorizado na própria UBS e a negação entre UBS, incluindo efeito imediato de revogação. Qualquer vazamento ou permissão implícita bloqueia a aprovação B.

Este planejamento não altera o layout ou as APIs no A1.1, nem autoriza acesso ao laboratório manual. A implementação B só começa após aprovação final, commit e push do A1.1.

## Decisão de navegação A1.1

`/login` passa a ser Server Component assíncrono que lê cookies e consulta `resolveLoginNavigation`. O serviço usa **validateSession**, **loadMfaChallenge** e **firstAccessState** existentes; não reimplementa RBAC nem valida TOTP por uma segunda política. Somente discriminante de tela chega ao componente cliente, sem tokens/usuário/fator.

| Estado real | Resultado | Fonte da decisão |
| --- | --- | --- |
| Challenge válido pendente, inclusive com sessão antiga de outra conta | Formulário MFA na própria `/login`; reload retoma desafio | loadMfaChallenge, sem consumir |
| Sem sessão ou cookie desconhecido | Login | validateSession |
| Sessão expirada/revogada/usuário inativo | Login; cookie não é alterado no GET | validateSession |
| Sessão válida, perfil sem acesso operacional efetivo | Estado Acesso restrito, sem formulário ou links operacionais | firstAccessState.profile |
| Primeiro acesso incompleto e perfil operacional válido | `/primeiros-passos` | progress existente |
| Perfil administrativo, onboarding concluído, segundo fator não verificado nesta sessão | `/primeiros-passos` | mfaRequired/verified existentes |
| Perfil administrativo, MFA verificado e onboarding concluído | `/admin` | canAccessAdmin + verified + progress |
| Profissional com patient.read efetivo e onboarding concluído | `/dashboard`, respeitando a política MFA opcional existente | perfil efetivo + progress |

Challenge inválido/expirado/consumido/revogado não autentica: segue a análise da sessão independente, quando válida, ou mostra login. Falhas inesperadas de infraestrutura propagam; não viram autorização nem são disfarçadas de expiração.

A precedência do challenge preserva uma autenticação explicitamente iniciada, inclusive troca de conta. Login novo com TOTP ativo continua exigindo segundo fator pelo serviço atual. Sessões profissionais já válidas mantêm sua política existente; nenhuma promoção de `mfaVerifiedAt`. Cookies, TTL de oito horas, criptografia, CSRF, guards IAM/MFA e dados persistidos não foram modificados.

O estado restrito permite somente links para gestão da própria conta e ajuda. `/aguardando-autorizacao` e o painel Comercial pertencem às etapas posteriores. O catálogo Comercial e o cálculo atual de canAccessAdmin são preservados neste slice; sua restrição pertence ao B, não é uma permissão nova concedida por A1.1.

## Matriz de segurança aplicada neste slice

| Perfil/condição | Permissão/escopo efetivo | Aplicação | Verificação |
| --- | --- | --- | --- |
| Admin global/municipal/UBS | canAccessAdmin do serviço existente, escopos/grants válidos, MFA obrigatório | login-navigation + firstAccessState; destinos mantêm guards | sessão primária, completa não verificada e verificada incompleta; API Admin nega acesso sem MFA |
| Profissional | patient.read efetivo em unidade/vínculo ativos; MFA opcional existente | effective-access-profile, sem conceder permission por cookie | deferimento e novo login com fator ativo; negação ao suspender vínculo/unidade ou revogar papel |
| Sem papel efetivo | nenhum destino operacional presumido | `/login` renderiza estado restrito | reload estável, sem form/sidebar/links Admin/dashboard |
| Challenge | prova primária temporária, sem sessão concedida pelo GET | loadMfaChallenge; verificação permanece em `/api/auth/mfa/verify` | reload, precedência entre contas, challenge expirado/reutilizado/revogado; só segundo fator real conclui |

Essas decisões de navegação não substituem autorização dos endpoints. O layout clínico visual legado de `/dashboard` foi observado sem guard próprio e com mock-dashboard; A1.1 não o transforma em fronteira de autorização. Os endpoints clínicos mantêm seus guards existentes. Sua revisão de isolamento/jornada passa a ser requisito explícito do Slice B, antes de liberar a governança nova; este relatório não alega proteção nova de todas as URLs visuais.

## Preservação do laboratório

Não foi acessado ou atualizado `~/projetos/pap-saude-onboarding`, nem sua branch `test/onboarding-primeiro-acesso-mfa`. Não foram usados `local:init`, `local:admin`, porta 15432, banco/volume manual, segredos reais, conta do operador, senha, MFA ou sessões do laboratório.

Testes usam container criado exclusivamente nesta execução em 5432, com labels `pap.disposable=f0410` e `pap.mission=m04-a11`, e bancos fixos descartáveis dos harnesses. Ao concluir os testes, o container desta execução foi parado após conferir ambas as labels; seu armazenamento efêmero foi removido pelo --rm, sem qualquer volume manual. MFA dos testes é derivado de enrollment e autenticação reais em contas sintéticas; nenhum `mfaVerifiedAt` é falsificado para validar acesso. Snapshots privados ficam só em memória e são comparados como booleanos, sem credenciais nos diagnósticos. Traces/vídeos/capturas automáticas continuam desativados.

## Homologação futura pelo operador — somente após liberação

Não executar agora. Antes de incorporar no mesmo checkout/branch:

```bash
git -C ~/projetos/pap-saude-onboarding status --short --branch
git -C ~/projetos/pap-saude-onboarding branch --show-current
git -C ~/projetos/pap-saude-onboarding rev-parse HEAD
git -C ~/projetos/pap-saude-onboarding fetch origin
git -C ~/projetos/pap-saude-onboarding log --oneline --left-right HEAD...origin/feature/ux-iam-convites-vitrine-email
git -C ~/projetos/pap-saude-onboarding merge-base --is-ancestor HEAD origin/feature/ux-iam-convites-vitrine-email
```

Preservar alterações locais, inclusive diagnóstico em scripts/local/provision.ts; se houver divergência ou árvore modificada, parar e preparar plano não destrutivo. Não mudar a branch. Somente com liberação, árvore segura/limpa e ancestralidade comprovada, `git merge --ff-only origin/feature/ux-iam-convites-vitrine-email` na mesma branch de testes. A1.1 não exige migration nem bootstrap. Reiniciar apenas a aplicação usando a configuração existente; nunca repetir init/admin ou remover banco/volume/cookies/chaves.

Roteiro no navegador:

1. Entrar com a conta e TOTP já existentes, concluir o onboarding se ainda pendente. Digitar `/login`: deve ir diretamente ao `/admin`, sem novo formulário, QR ou cadastro MFA.
2. Atualizar e repetir `/login`; o mesmo login/TOTP continua válido conforme expiração natural. Conferir Minha segurança e a mesma conta; não rotacionar códigos só para testar.
3. Em janela privada, iniciar um login com MFA e recarregar `/login` durante o desafio: deve manter Confirmar MFA, sem entrar no Admin antes da prova. Concluir com o fator existente.
4. Usar somente contas sintéticas já disponíveis para validar profissional, primeiro acesso incompleto e acesso restrito. Não editar sessão/MFA no banco manual para simular casos adversariais; estes já são automatizados no banco descartável.

Homologação no celular/WSL real e preservação observada do laboratório do operador: NOT RUN, dependem de liberação/validação externa. As comparações automatizadas comprovam ausência de mutação nas fixtures, não alegam inspeção do laboratório real.

## Riscos herdados e limites

Auditoria incluindo desenvolvimento: **FAIL, 9 high / 0 critical**, mesmas dependências herdadas do A1 (`@next/eslint-plugin-next`, `@shadcn/registry`, `@ts-morph/common`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`, `shadcn`, `ts-morph`). Auditorias de produção e do migrator: **PASS, zero vulnerabilidades**. Não foi usado npm audit fix; package/lockfiles e Dockerfile estão intactos.

O CI remoto do A1.1 é **NOT RUN**: esta entrega ainda aguarda aprovação para commit/push. O CI bem-sucedido do A1/PR #5 não é apresentado como validação deste diff. Publicação, deploy, VPS, e-mail real e implementação B/C: **NOT RUN**. A1.1 não exige migration ou bootstrap; testes de novas migrations B permanecem pendentes para a próxima entrega.

## Arquivos exatos A1.1

Conferência nesta revisão: **oito caminhos no total**, não cinco. São **cinco novos** (este relatório, serviço de navegação, login-fixtures.ts e dois arquivos de testes) e **três rastreados modificados** (page.tsx do login, LoginSecurity.tsx e configuração Playwright). Todos os oito diffs são revisados; nenhum arquivo é omitido do escopo de aprovação.

- `docs/codex/RELATORIO-MISSAO-04-SLICE-A1-1.md`
- `src/app/(auth)/login/page.tsx`
- `src/components/auth/LoginSecurity.tsx`
- `src/server/auth/login-navigation.service.ts`
- `tests/first-access/login-fixtures.ts`
- `tests/first-access/login-navigation.spec.ts`
- `tests/first-access/login-navigation.test.ts`
- `tests/first-access/playwright.config.ts`

Os screenshots/medições históricos gerados novamente pela suíte são retornados ao conteúdo versionado conhecido, pois a árvore estava limpa e esses artefatos não pertencem a A1.1. Nenhuma alteração desconhecida do operador foi revertida.

## Resultados da primeira entrega A1.1 — execuções anteriores

Todas as suítes abaixo usaram Node 22.23.3 (Chromium local nos E2E) e infraestrutura descartável. TypeScript, lint e build estão incluídos no agregado F04; não há migration nova.

| Comando/verificação | Resultado | Evidência neste workspace |
| --- | --- | --- |
| `npm run test:first-access:browser` | **PASS**: 21 testes Node/API/QR/navegação e 15 E2E, incluindo 9 casos novos de integração + grupo e 6 E2E novos | `/tmp/m04-a11-first-access-final.log` |
| `npm run test:auth` | **PASS**, 202 testes, 0 falhas | `/tmp/m04-a11-auth.log` |
| `npm run test:admin:beta1` | **PASS**, 29 testes, 0 falhas | `/tmp/m04-a11-beta.log` |
| `npm run audit:f04:operations` | **PASS**, 78 testes Node, invariantes SQL, Prisma validate/geração de tipos, TypeScript, lint e build de produção | `/tmp/m04-a11-f04.log` |
| F03 API/UI afetada | **PASS**, 8 testes dentro do agregado F04 | `/tmp/m04-a11-f04.log` |
| `git diff --check` | **PASS** | revisão final |
| Auditoria produção | **PASS**, zero | `/tmp/m04-a11-prod-audit.log` |
| Auditoria migrator | **PASS**, zero | `/tmp/m04-a11-migrator-audit.log` |
| Auditoria incluindo dev | **FAIL**, 9 high herdadas / 0 critical | `/tmp/m04-a11-full-audit.json` |

A primeira execução dos testes novos teve 3 subtestes inválidos (e o grupo pai em FAIL): fixtures colocavam expiresAt/lastSeenAt antes de createdAt. As constraints recusaram corretamente esses registros. Foram corrigidos somente timestamps sintéticos, sem desativar constraints ou alterar código de segurança para satisfazer testes. A repetição passou; depois do ajuste para usar somente a política mfaRequired existente, a execução final acima foi repetida e passou integralmente.

A revisão final preserva a política profissional: sessão clínica válida já existente não ganha requisito administrativo novo; uma autenticação primária nova com fator ativo continua recebendo challenge, que a página retoma. Testes verificam TTL de oito horas, ausência de Set-Cookie no GET, igualdade dos registros antes/depois, contagem limitada de navegações, API Admin negada para sessão primária e challenge sem sessão, necessidade do segundo fator real, ausência de links operacionais na tela restrita, overflow/axe em 320 px e dark mode.

**NOT RUN neste slice:** regressão F03 completa (clínica não modificada; API/UI executada), rebuild/scan Docker A1.1 (Dockerfile e dependências inalterados), CI remoto A1.1 antes de aprovação, implantação ou envios externos, laboratório do operador, migrations/testes específicos de PAP_MANAGER e governança B. Nenhum PASS histórico do A1 substitui essas verificações.

## Gate de entrega

A1.1 disponível para revisão. **Sem commit, push, staging ou alteração no PR #5** neste gate; o HEAD permanece d6f69f6ac197b0f53035e5c6542d4cacb8cf2282. Após aprovação, usar somente os oito caminhos acima e a mensagem `fix(auth): redirect authenticated users away from login`; push da feature antes de iniciar B. A1.1 não representa conclusão da Missão 04 nem autorização de produção. Risco dev herdado e homologação externa permanecem abertos.

## Consumidores de login-fixtures.ts e matriz final comprovada

`rg -n 'login-fixtures' tests` identifica exatamente dois consumidores diretos:

- `tests/first-access/login-navigation.test.ts:10`: suíte Node, 9 subtestes + 1 grupo pai. Exercita o resolvedor com banco real descartável.
- `tests/first-access/login-navigation.spec.ts:7`: 6 testes Playwright, incluídos em `playwright.config.ts` e no comando test:first-access:browser.

`login-fixtures.ts` não é um teste isolado nem gera um resultado PASS próprio. `verifiedLoginFixture` cria usuário sintético, credencial, enrollment TOTP real, confirma TOTP, gera/consome recuperação no challenge real e conclui onboarding quando solicitado. Não marca mfaVerifiedAt artificialmente. `navigationFingerprint` lê usuário, credencial, sessões, fatores, recuperação, desafios, papéis, vínculos e progresso; só compara igualdade em memória. Não imprime valores privados. Os cenários profissional/expiração também usam a fixture básica; os E2E utilizam navigationFingerprint do helper para comprovar preservação.

| Cenário | Teste Node (`login-navigation.test.ts`) | Teste E2E (`login-navigation.spec.ts`) | Prova observada / resultado |
| --- | --- | --- | --- |
| Admin válido, MFA verificado e onboarding concluído | `verified administrator with complete onboarding goes to admin preserving old session and MFA` (linha 73) | `GET login redirects verified complete Admin on the server without renewing or changing account state` (linha 52) | **PASS**: `/admin`, redirectedFrom termina em `/login`, ausência do botão Entrar, cookie e fingerprint preservados; sem Set-Cookie no GET. |
| Sessão ausente, desconhecida, expirada/revogada | `missing and forged session cookies show login`; `expired, revoked and inactive sessions show login without mutation` (linhas 20/26) | `missing, unknown, expired and revoked session cookies show login without redirect loops` (linha 79) | **PASS**: formulário permanece em `/login`; quatro visitas geram exatamente quatro documentos, sem mutação dos registros. Inatividade também é coberta no Node. |
| Primária sem MFA / onboarding incompleto | `primary administrator and incomplete first access go only to setup`; `a newly created primary session cannot inherit another session's MFA` (linhas 58/234) | `primary Admin with completed metadata cannot inherit MFA, and verified incomplete Admin continues setup` (linha 118) | **PASS**: `/primeiros-passos`, mfaVerifiedAt continua null na primária; GET Admin retorna 403. Metadados concluídos não elevam a sessão. |
| MFA pendente, inclusive sessão antiga de outra conta | `live MFA challenge takes precedence over an older session without consuming or granting access` (linha 168) | `pending MFA resumes after reload ahead of an older session and only authenticates after the real second factor` (linha 149) | **PASS**: mostra Confirmar MFA em `/login`, reload mantém etapa, fingerprint preservado e 2 documentos antes da confirmação. Sem sessão, API Admin retorna 401; somente após segundo fator real via recuperação chega ao Admin. |
| Desafio inválido/expirado/revogado/consumido | `invalid, expired, revoked and consumed challenges cannot grant or loop into setup` (linha 193) | Regressões MFA existentes no mesmo harness/suíte auth | **PASS**: desafio não concede acesso; sem sessão mostra login; sessão válida independente segue sua autorização. Não se consome challenge por GET. |
| Profissional e MFA opcional | `professional keeps optional MFA policy for existing sessions; a new login still challenges an active factor` (linha 107) | `authorized professional with optional MFA goes to dashboard after deferral` (linha 190) | **PASS**: deferimento legítimo leva a `/dashboard`, sem promover MFA; no máximo 2 documentos e fingerprint preservado. Novo login com fator ativo ainda exige challenge. |
| Sem papel efetivo / vínculo ou unidade suspensa | `absent, revoked or inactive scoped access is restricted even with completed metadata` (linha 142) | `account without effective operational role stays restricted with no form or operational links` (linha 211) | **PASS**: estado restrito estável em `/login`, sem form ou links Admin/dashboard; reload totaliza 2 documentos. Axe e ausência de overflow em 320 px/dark passaram. |
| Ausência de loops nos caminhos cobertos | Repetição de resolução sem escrita e destinos fixos nos casos acima | Contadores `observeNavigation` e URLs finais nos 6 E2E | **PASS**: Admin até 2 documentos por visita (até 4 em duas visitas), inválidas 4/4, primária/incompleta até 2 por visita, challenge+reload 2, profissional até 2, restrito+reload 2. Isso comprova estes cenários automatizados; não é alegação sobre todas as combinações possíveis de estado. |

A contagem Node de `test:first-access:browser` é **21 itens reportados: 19 casos folha e 2 grupos pais**. São 9 novos casos Node, 9 casos existentes de primeiro acesso e 1 QR; os dois grupos também entram na estatística do runner. Os **15 E2E** são 6 novos + 9 existentes, sem grupos somados como testes adicionais.

## Revalidação após aprovação conceitual — comandos efetivos e evidências

Esta seção registra a nova execução solicitada pelo operador antes de decidir commit/push. Os sete arquivos de código/teste mantiveram conteúdo byte a byte idêntico ao início desta revalidação (SHA-256 comparado); apenas este relatório foi atualizado. Nenhum arquivo exclusivo do B foi implementado.

Ambiente: Node **22.23.3** para testes/compilação; Chromium em `/usr/bin/chromium`. Container efêmero `pap_saude_db`, criado nesta rodada em 5432, labels `pap.disposable=f0410` e `pap.mission=m04-a11-evidence`. O Docker estava sem containers preexistentes. O harness exige label descartável e usa `pap_saude_onboarding_test`; auth usa seu banco descartável próprio. Nenhuma execução em 15432, volume manual, VPS ou banco do operador.

Comandos executados (cache npm somente em `/tmp`; URL abaixo tem credenciais falsas exclusivas de teste):

```bash
npm_config_cache=/tmp/pap-m04-npm PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm exec --yes --package=node@22.23.3 -- bash -c 'node --version && npm run test:first-access:browser' > /tmp/m04-a11-evidence-browser.log 2>&1

npm_config_cache=/tmp/pap-m04-npm npm exec --yes --package=node@22.23.3 -- bash -c 'node --version && npm run test:auth' > /tmp/m04-a11-evidence-auth.log 2>&1

DATABASE_URL='postgresql://pap_user:pap_password@127.0.0.1:5432/pap_saude?schema=public' npm_config_cache=/tmp/pap-m04-npm npm exec --yes --package=node@22.23.3 -- bash -c 'npx next typegen > /tmp/m04-a11-evidence-typegen.log 2>&1 && npx tsc --noEmit > /tmp/m04-a11-evidence-typescript.log 2>&1 && npm run lint > /tmp/m04-a11-evidence-lint.log 2>&1 && npm run build > /tmp/m04-a11-evidence-build.log 2>&1'

npm audit --omit=dev --audit-level=high > /tmp/m04-a11-evidence-audit-prod.log 2>&1
npm audit --prefix docker/migrator --include=dev --audit-level=high > /tmp/m04-a11-evidence-audit-migrator.log 2>&1
npm audit --json > /tmp/m04-a11-evidence-audit-full.json 2>/tmp/m04-a11-evidence-audit-full.err

git diff --check
```

O comando npm de primeiro acesso executa `bash scripts/test-first-access.sh --browser`: migrations no banco descartável, `npx tsx --test tests/first-access/*.test.ts` e Playwright com a configuração que inclui `login-navigation.spec.ts`. `test:auth` executa crypto, MFA crypto e `scripts/test-auth-session.sh`, incluindo sessão, autenticação primária, abuso/CSRF, enrollment, challenge, recuperação, reset MFA e IAM. Não são mocks do resolvedor nem flags artificiais de MFA.

| Verificação repetida nesta rodada | Resultado | Quantidade / saída |
| --- | --- | --- |
| API/QR/navegação + E2E | **PASS** | 21 itens Node (19 casos + 2 grupos), 15 E2E; exit 0 |
| Autenticação/MFA | **PASS** | 202 testes, 0 falhas; exit 0 |
| `npx next typegen` | **PASS** | tipos gerados; exit 0 |
| `npx tsc --noEmit` | **PASS** | sem diagnósticos; exit 0; não é contagem de testes |
| `npm run lint` | **PASS** | sem diagnósticos; exit 0 |
| `npm run build` | **PASS** | compilação, TypeScript e geração de rotas concluídos; exit 0 |
| Diff rastreado e revisão dos oito caminhos | **PASS** | sem problemas de whitespace ou arquivos fora do manifesto; índice permanece vazio |
| Auditoria produção / migrator | **PASS** | exit 0 em ambas, zero vulnerabilidades reportadas |
| Auditoria incluindo desenvolvimento | **FAIL herdado** | exit 1, 9 high / 0 critical; nenhuma dependência alterada |
| F04/Beta/F03 completo nesta revalidação | **NOT RUN novamente** | resultados da rodada anterior acima; nenhuma mudança de código nesta rodada, regressões de auth/navegação repetidas |
| CI remoto A1.1 | **NOT RUN** | exige commit/push após decisão final; não reutilizar CI do A1 |
| Guard clínico B e novos testes Gerente/Comercial | **NOT RUN** | requisito B0 obrigatório, implementação depende do gate A1.1 |
| Laboratório manual, celular real, deploy/VPS, e-mail real | **NOT RUN** | não acessados/não autorizados |

Não houve falha funcional nesta revalidação. Os problemas temporais de fixtures relatados na primeira rodada continuam documentados como histórico, não como falhas atuais. A auditoria dev continua em FAIL; produção/migrator em PASS não apagam esse risco.

Os limites permanecem explícitos: o redirecionamento de login não protege sozinho acesso direto a módulos; o layout clínico sem guard próprio é uma pendência bloqueante de B, com proteção de dados e testes negativos previstos em B0. A igualdade de registros provada com contas sintéticas não equivale a inspeção do laboratório real. Commit, push e início B aguardam a decisão final do operador; após aprovação, versionar somente A1.1 e então começar B.

## Extratos conferidos dos logs desta rodada

```text
v22.23.3
# tests 21
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
PASSED: GET login redirects verified complete Admin on the server without renewing or changing account state
PASSED: missing, unknown, expired and revoked session cookies show login without redirect loops
PASSED: primary Admin with completed metadata cannot inherit MFA, and verified incomplete Admin continues setup
PASSED: pending MFA resumes after reload ahead of an older session and only authenticates after the real second factor
PASSED: authorized professional with optional MFA goes to dashboard after deferral
PASSED: account without effective operational role stays restricted with no form or operational links
 F02 AUTH INTEGRATION: PASS
```

A soma dos resumos `# tests` em `/tmp/m04-a11-evidence-auth.log` é 202; todos os resumos `# fail` são zero. Os logs completos permanecem neste workspace; estes extratos não incluem credenciais, cookies, QR, TOTP ou códigos de recuperação.

O container efêmero desta revalidação foi parado após conferir ambas as labels; o --rm removeu apenas seu armazenamento efêmero. Nenhum volume manual foi utilizado ou removido.

## Finalização autorizada A1.1 — gate pré-commit

Autorização recebida para commit/push A1.1 após PASS obrigatório e início B somente após CI remoto deste novo commit. Nova execução concluída com Node 22.23.3, PostgreSQL efêmero rotulado `pap.mission=m04-finalize-a11-b`, sem usar o laboratório manual.

Comandos executados:

```bash
npm_config_cache=/tmp/pap-m04-npm PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm exec --yes --package=node@22.23.3 -- bash -c 'npm run test:first-access:browser' > /tmp/m04-a11-finalize-browser.log 2>&1
npm_config_cache=/tmp/pap-m04-npm npm exec --yes --package=node@22.23.3 -- bash -c 'npm run test:auth' > /tmp/m04-a11-finalize-auth.log 2>&1
DATABASE_URL='postgresql://pap_user:pap_password@127.0.0.1:5432/pap_saude?schema=public' npm_config_cache=/tmp/pap-m04-npm npm exec --yes --package=node@22.23.3 -- bash -c 'npx next typegen && npx tsc --noEmit && npm run lint && npm run build' > /tmp/m04-a11-finalize-checks.log 2>&1
git diff --check
```

Resultados: **PASS** 21 itens Node (19 casos + 2 grupos), 15 E2E, 202 autenticação/MFA, geração de tipos, TypeScript, ESLint, build e diff. Todos os processos terminaram com exit 0. Nenhuma falha funcional nesta rodada. Risco herdado das 9 high dev permanece documentado, sem atualização de dependências.

CI remoto deste novo commit: **NOT RUN no instante pré-commit**; verificar após push e registrar SHA/URL/resultado no relatório B. Não iniciar implementação B se CI falhar. Laboratório manual, VPS, deploy e envio real: **NOT RUN/não acessados**. Versionar exclusivamente os oito caminhos do manifesto. Nenhum arquivo B incluído.
