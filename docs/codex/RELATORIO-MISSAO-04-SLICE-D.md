# Missão 04 — Slice D: e-mails transacionais

Branch: `feature/ux-iam-convites-vitrine-email`. Base: `68c6c2ac6785f08b75663aa59151bdc146a0bb20`. PR [#5](https://github.com/joaoCarlosGM/pap-saude/pull/5), aberto e draft. Horários de apresentação: America/Fortaleza.

**Entrega exclusivamente do D para revisão humana. Sem staging, commit ou push. E não iniciado.** A versão anterior C tem CI 39956428360 SUCCESS, mas esse resultado **não valida D**. CI remoto de D: NOT RUN, condicionado ao versionamento aprovado.

## Implementação

- Templates compartilhados HTML/texto para convite global/institucional, recuperação de senha, autorização de perfil, ativação de UBS e fechamento de convite aceito. Marca textual PAP Saúde existente, teal, CTA grande, escape de HTML/atributos, links com esquema seguro e validade real no horário de Fortaleza. Não depende de imagem remota. Cinco templates verificados em cada cenário de navegador.
- Adaptador único em `src/server/email/email.service.ts`, configuração fail-closed em `email-config.ts`. LOCAL_DEMO captura somente nos destinos explicitamente permitidos; RESEND exige opt-in, HTTPS, origem/remetente em allowlists e credencial configurada. Provider desconhecido/configuração incompleta não faz fallback. Resultado legado `mode: DEVELOPMENT` é preservado por compatibilidade, com `status: CAPTURED` ou `NOT_REQUESTED` explícito; ledger identifica provider `LOCAL_DEMO`.
- Ledger persistente guarda hashes de identidade/conteúdo, provider, referência lógica, status, tentativas e ID do provider. **Não guarda destinatários, corpos, links ou bearer tokens.** Fingerprint imutável impede reutilizar a mesma identidade com outro conteúdo/transporte. INSERT com skipDuplicates + UPDATE Prisma para lock de linha coordenam retries concorrentes. Não foi criada exceção ao guard SQL.
- Idempotência Resend usa chave estável derivada da identidade lógica; ambiguidades sem ID não são reenviadas depois de 23 horas, antes da janela de 24 horas do provider. Nenhuma promessa de exactly-once distribuído.
- Webhook máquina-máquina `POST /api/email/resend/webhook`: corpo original limitado a 64 KiB; assinatura Svix/HMAC SHA-256, comparação constante e janela de cinco minutos antes de JSON/DB. Replay persistente deduplicado, lock compartilhado com envio; callback desconhecido/antes do commit de aceite pede retry. DELIVERED exige callback autenticado. Bounce/reclamação/falha não são apagados por entrega atrasada. Eventos não utilizados não são armazenados.
- Projeções de entrega na mesma transação do ledger preservam versão do token e não alteram consentimento, atribuições ou MFA. Status antigos SENT/DEVELOPMENT permanecem intactos e possuem rótulos honestos nas filas. Timestamp de tentativa institucional continua registrado. CANCELAMENTO de solicitação não recolhe mensagem já capturada/aceita.
- Reset usa o adaptador comum, captura local real, fragmento no link e validade de 30 minutos. Token aleatório de 32 bytes, hash com domínio, uso único, revogação em falha e após consumo. Quotas por origem/identidade contam desconhecidos e são atômicas entre workers; preservam limites de 20/origem e 3/identidade em 15 minutos, inclusive contagem móvel existente. Auditoria sem bearer. Corpo/status HTTP uniformes para conhecido/desconhecido/erro de envio; a revisão de fechamento abaixo retira todo processamento dependente da identidade do ciclo da resposta HTTP.
- Consumo do reset mantém a política anterior de revogação de sessões/challenges/outros resets e **não remove ou rotaciona MFA**. Novo login da conta com fator ativo continua MFA_REQUIRED. Nenhuma mudança na política de profissionais.
- Convites globais deixam de exigir exclusivamente local-demo, mas mantêm IAM/MFA/CSRF/rate limit e a aprovação exata de `proposedRoleKey`. Template institucional novo coloca segredo no fragmento; cliente o remove da barra/histórico e consulta por POST. GET e links antigos continuam aceitos por compatibilidade. Não altera a autorização institucional preexistente.
- Aviso de fechamento somente após aceite/identidade legítimos; não expõe motivo privado, revisor ou dados de terceiros. Repetição da decisão legítima deduplica a mensagem; falha de configuração/transporte não reabre a autorização e é auditada.
- Recibo de ativação de UBS é preparado **na transação administrativa já protegida**, somente para usuário ativo com Membership ACTIVE + papel de sistema HEALTH_UNIT_ADMIN na própria unidade. Contato de formulário público não basta. Revalida destinatário/unidade antes do envio. Ausência de responsável elegível significa zero avisos, sem inventar autorização. Repetir ACTIVATE autorizado tenta apenas recibos pendentes/falhos de evento existente; gerente não ativa UBS. Não confundir autorização de perfil com ativação institucional.
- Captura local mantém fronteira exata do laboratório e adiciona apenas sink descartável D em `/tmp/pap-m04-d-mail-*`, DB `pap_saude_m04_d_test`, porta 5432/origem 3110. Diretórios/arquivos privados, propriedade conferida, symlinks/conteúdo divergente negados, reparação de par interrompido sem overwrite. Nenhum desses testes aponta para 15432/banco manual.
- CI acrescenta o gate D com navegador. Scanner mantém pin, vulnerabilidades HIGH/CRITICAL e exit-code 1; apenas explicita a base Java oficial GHCR porque o mirror padrão recusou download. Sem atualização de dependências ou relaxamento de segurança.

## Migração e compatibilidade

`20261023060000_mission04_transactional_email` é exclusivamente forward-only: cria ledger/eventos/recibos e amplia constraints de entrega para estados comprováveis, mantendo todos os estados legados. Não altera registros de usuários/UBS, senha, MFA, sessões, progresso, consentimento ou grants. Prisma deploy repetido e comparação de schema fazem parte do harness D.

Teste C→D aplica schema realmente anterior, cria identidades com senha/TOTP reais, sessões verificadas, UBS, convite institucional e convite C ACTIVE com atribuição/notificação reais. Backup binário permanece apenas em memória; restore em segundo DB descartável. Compara snapshots exatos antes/depois de upgrade e restore/roll-forward, repete deploy/bootstrap, valida sessão original, login com senha/TOTP anteriores e aceite institucional legado. Isso comprova compatibilidade **sintética**, não autoriza tocar no banco do operador.

Testes históricos ajustados por necessidade demonstrada: fixture C selecionava todas as migrations exceto C e aplicava D antes de C; agora seleciona somente anteriores à migration testada. Beta usa HTTPS/allowlists/opt-in com fetch inteiramente simulado, valida fragmento e estados novos, sem flexibilizar o adapter ou IAM.

## Validação e evidências da entrega inicial (preservadas)

A matriz abaixo registra a execução anterior à revisão final. A matriz de fechamento ao final deste documento distingue as reexecuções após a correção temporal; resultados históricos não substituem a validação do código modificado.

<!-- MATRIX_START -->

| Comando / gate | Resultado | Quantidade / evidência | Log no execution.log |
|---|---|---|---|
| `npm ci` | PASS | check funcional | `npm-ci.log` |
| `npm run test:mission04:d:browser` | PASS | 27 Node/TAP + 6 navegador | `d-delivery-final.log` |
| `npm run test:mission04:c:browser` | PASS | 41 Node/TAP + 8 navegador | `c-recheck.log` |
| `npm run test:mission04:b:browser` | PASS | 28 Node/TAP + 5 navegador | `b-recheck.log` |
| `npm run test:admin:beta1` | PASS | 29 Node/TAP | `beta1-recheck.log` |
| `npm run test:auth` | PASS | 202 Node/TAP | `auth-recheck.log` |
| `npm run audit:f04:operations` | PASS | 78 Node/TAP | `f04-recheck.log` |
| `npm run test:f03:smart:force` | PASS | 203 Node/TAP | `f03-final.log` |
| `npm run test:first-access:browser` | PASS | 21 Node/TAP + 15 navegador | `first-access-final.log` |
| `npx tsc --noEmit` | PASS | check funcional | `typescript-copy-review.log` |
| `npm run lint` | PASS | check funcional | `lint-copy-review.log` |
| `npm run build` | PASS | check funcional | `build-copy-review.log` |
| `node scripts/security/guard-f04-ci-workflow.mjs && node --test tests/security/f04-ci-workflow.test.mjs tests/security/f04-migration-preflight.test.mjs tests/local/policy.test.mjs` | PASS | 7 Node/TAP | `ci-guards-recheck.log` |
| `bash scripts/test-f04-role-separation.sh` | PASS | check funcional | `role-separation-recheck.log` |
| `npm audit --omit=dev --audit-level=high --json` | PASS | 0 vulnerabilidades | `dependency-audits.json` |
| `npm audit --prefix docker/migrator --include=dev --audit-level=high --json` | PASS | 0 vulnerabilidades | `dependency-audits.json` |
| `npm audit --json` | FAIL (risco dev) | 6 MODERATE; 0 HIGH/CRITICAL; exit 1 | `dependency-audits.json` |
| Docker web final + migrator | PASS | build, migrations/idempotência, runtime least privilege | `images.json` / `execution.log` |
| Trivy das imagens finais | PASS | web exit 0; migrator exit 0; 0 HIGH/CRITICAL | `trivy-final.log` em `execution.log` |
| `git diff --check` / index vazio / base | PASS | sem staging/commit/push | auditoria abaixo |
| CI remoto D / Resend externo / DNS / clientes reais | NOT RUN | revisão/versionamento/autorização externa pendentes | roteiro de homologação |

Os 6 testes Playwright de templates cobrem 5 templates cada: **30 combinações** com axe A/AA, teclado e ausência de overflow. Preferência escura é exercitada; o e-mail mantém superfície institucional clara, sem prometer compatibilidade universal de dark mode em clientes externos.
<!-- MATRIX_END -->

Evidências finais em `docs/evidence/missao-04-d/`; auditoria/inventário em `docs/codex/AUDITORIA-MISSAO-04-D.md`. Logs de tentativas iniciais e reexecuções devem ser diferenciados; testes históricos não substituem execução faltante.

## Achados corrigidos durante a execução

1. Concorrência da criação do ledger por upsert vazio e esgotamento de retries SERIALIZABLE na quota: INSERT idempotente e locks de linha/contadores atômicos em READ COMMITTED.
2. Constraints legadas não aceitavam CAPTURED/NOT_REQUESTED/estados do provider: extensão somente na migration D, preservando históricos.
3. Fixture de upgrade C aplicava migrations futuras antes de C: seleção temporal corrigida e novo teste C→D com dados C persistidos.
4. Guard F04 rejeitou SQL bruto usado inicialmente para locks: removido por completo; apenas API Prisma, sem exceções/disable.
5. Primeiro F03 falhou no preparo clinical-api-ui por disco cheio durante build Docker `vfs`. Build interrompido; removidos somente caches descartáveis identificados; execução forçada repetida. Nada no laboratório foi acessado.
6. Trivy web não concluiu por `Forbidden` no mirror da base Java: origem oficial GHCR explícita, sem pular Java/scanners/severidades. Reexecução sobre imagem final PASS, com as mesmas severidades/scanners.
7. Preflight TypeScript encontrou parâmetro incorreto em fixture nova: corrigido conforme assinatura real do serviço.
8. Houve indisponibilidade transitória da execução; arquivos/processos foram recuperados e resultados lidos novamente, sem presumir conclusão.

## Riscos e validações externas

**Envio Resend real, DNS/SPF/DKIM/DMARC, recebimento em caixa externa, bounce real, webhook público e renderização em clientes reais: NOT RUN / NÃO HOMOLOGADOS.** Nenhum e-mail externo foi enviado. [Roteiro e configuração](HOMOLOGACAO-EMAILS-SLICE-D.md) discriminam os pré-requisitos e a autorização posterior necessária. Allowlist não é prova de domínio validado; aceite HTTP não é entrega/inbox.

O vazamento temporal da versão síncrona foi identificado e corrigido nesta revisão: a rota agenda um callback com `after()` do Next antes de responder 202, e consulta de conta, quotas, emissão e transporte começam somente após finalizar a resposta. Testes determinísticos verificam a ordem, e um teste HTTP real mantém PostgreSQL bloqueado enquanto recebe as respostas. Isso elimina o canal direto identificado, sem alegar tempo constante global sob saturação de infraestrutura. `after()` acompanha o ciclo do processo e não é uma fila durável; queda do worker pode perder o pedido e requer nova solicitação legítima. As quotas e a revogação em falha permanecem. Sem worker automático de retries para os demais eventos; falha/crash após commit exige retry legítimo. Token original de convite não é recuperável de seu hash. Alterações de conteúdo/transporte em retry são negadas, não substituídas silenciosamente. Mensagem já capturada/aceita pode chegar após revogação; guards atuais continuam soberanos.

Mantida compatibilidade legada de inspeção GET/query e `developmentUrl` do serviço/rota institucional apenas no modo de desenvolvimento; não há esse retorno em Resend/produção. Novos e-mails institucionais usam fragmento. Redação de logs/proxy e retirada planejada do contrato legado continuam necessárias; não afirmar que todos os caminhos históricos já eliminam query tokens.

Sem responsável legítimo no instante da ativação, não se envia confirmação institucional ao contato público. Ativação sem recibo elegível não cria destinatário automaticamente depois; liberação de perfil mantém aviso próprio. Revogação via API antiga mantém in-app e guards existentes; aviso opcional de fechamento por e-mail pertence à decisão explícita do fluxo C, sem worker que dispare mensagens antigas indiscriminadamente.

O Trivy final emitiu aviso de metadados ausentes para `CVE-2026-107891` (o próprio scanner sugere possível CVE rejeitada); ambos os exits foram 0, sem findings HIGH/CRITICAL. O aviso permanece no log e requer acompanhamento do feed, sem supressão.

Metadados do ledger/recibos e caixa privada precisam de retenção operacional definida; sem limpeza automática do ambiente manual. Auditoria da entrega inicial: seis vulnerabilidades MODERATE em desenvolvimento (`@modelcontextprotocol/sdk`, `@shadcn/registry`, `express-rate-limit`, `ip-address`, `shadcn`, `socks`), cadeia GHSA-rxp7-6hxx-x8q5. O baseline anterior tinha nove HIGH e uma MODERATE; o feed atual retornou outra classificação/propagação, **sem alteração do lockfile**. Preservado o risco herdado, sem `npm audit fix`, overrides ou upgrades automáticos. Sucesso local não equivale ao CI remoto do D nem a autorização de produção.

## Preservação e decisão

Nenhum recurso de `~/projetos/pap-saude-onboarding`, sua branch, `.local`, banco `pap_admin_beta1_local`, porta 15432, volume, conta PAP_ADMIN, senha, chaves ou MFA foi acessado ou alterado. Nenhuma VPS, DNS ou base de PR foi modificada. Sem merge, deploy ou envio real.

**Aguardar revisão/aprovação do D antes de staging/commit/push. E permanece não iniciado até D aprovado, versionado e validado.** Não reutilizar aprovação histórica do C para versionar estes arquivos.


## Fechamento técnico do D — revisão solicitada pelo operador

Atualizado em 2026-10-23T19:05:53.180533-03:00 (America/Fortaleza). **Sem staging, commit ou push. Slice E não iniciado.** A entrega final contém **66 caminhos: 23 modificados e 43 novos**; 38 arquivos de código/configuração/testes, três documentos e 25 evidências. A lista exata e o comando futuro seletivo estão em [AUDITORIA-MISSAO-04-D.md](AUDITORIA-MISSAO-04-D.md). [Diff integral das alterações de código, contexto zero](../evidence/missao-04-d/revisao-final/diff.txt). Nenhum arquivo funcional do E foi incluído.

### Achados e correções

1. **D-FINAL-01 — enumeração temporal:** conta existente aguardava DB/token/transporte; desconhecida retornava antes. Corrigido em `src/app/api/auth/password/forgot/route.ts` e `src/server/auth/password-recovery-http.ts`: apenas parser limitado/CSRF/origem antecedem 202; callback `after()` começa a emissão após encerrar a resposta. Sem padding/jitter artificial, sem remover quotas, auditoria ou revogação em falha. Passa-se função, nunca promise já iniciada. Referência: [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after), documentação instalada 16.4.2 lida antes da mudança.
2. **D-FINAL-02 — envio no laboratório:** flags de demo/diretório de captura/nome do banco protegido agora negam Resend mesmo com configuração HTTPS/allowlists/opt-in aparentemente válida. Teste altera somente strings de configuração sintéticas; não abre conexão ao banco manual nem lê suas credenciais.
3. **D-FINAL-03 — sigilo e produção:** barreira explícita adicional ao `developmentUrl` institucional em produção, teste real do serviço com NODE_ENV de produção e fetch simulado. Links novos portam segredo em fragmento, inspeção por POST e DTO sem bearer. Navegador confirma remoção do fragmento do histórico, segredo apenas no POST necessário, ausência em URLs/Referer/console. Nenhum SDK de analytics externo foi encontrado na busca específica; não foi feita homologação de proxy/APM externo. Links legados GET/query continuam aceitos por compatibilidade e exigem redação externa antes de exposição pública.
4. **D-FINAL-04 — confirmação honesta:** callbacks autenticados de falha, repetição, entrega atrasada e retry explícito preservam FAILED, sem novo envio ou confirmação falsa. Aceite pelo provider continua distinto de DELIVERED. Nenhum retorno de erro ou log imprime payload/token/credenciais; falha inesperada de after registra só `PASSWORD_RESET_BACKGROUND_FAILED`.

5. **D-FINAL-05 — token perdido no cliente:** o novo teste de sigilo falhou porque Strict Mode repetia o efeito e substituía o token por string vazia após limpar a URL. Corrigido em `src/components/auth/PasswordRecoveryClient.tsx`, preservando a referência em memória no segundo efeito. Novo fragmento dispara reload para descartar o token e a senha anteriores; teste comprova o POST com o token correto e campo limpo após abrir outro link. Strict Mode permaneceu habilitado.

A revisão não altera migrations, IAM, política MFA, consentimento por papel ou autenticação funcional do B/C. Todos os arquivos protegidos/históricos listados em `integrity.json` conferem com o HEAD. Os 53 arquivos iniciais conferiram com os hashes antes da revisão; as 17 evidências originais permanecem idênticas, incluindo PNGs/log/JSON. Snapshot inicial em arquivo ignorado; relatórios e evidências iniciais preservados como histórico.

### Matriz final após correções

| Comando / gate | Resultado | Quantidade / evidência | Log na revisão final |
|---|---|---|---|
| `npm run test:mission04:d:browser` | PASS | 32 Node + 8 navegador | `d-final.log` |
| `npm run test:auth` | PASS | 202 Node | `auth.log` |
| `npm run test:mission04:c:browser` | PASS | 41 Node + 8 navegador | `c.log` |
| `npm run test:mission04:b:browser` | PASS | 28 Node + 5 navegador | `b.log` |
| `npm run test:first-access:browser` | PASS | 21 Node + 15 navegador | `first-access.log` |
| `npm run test:f03:smart:force` | PASS | 203 Node | `f03.log` |
| `npm run audit:f04:operations` | PASS | 78 Node | `f04-retry.log` |
| `npm run test:admin:beta1` | PASS | 29 Node | `beta1.log` |
| `npx tsc --noEmit` | PASS | check | `typescript-after-browser.log` |
| `npm run lint` | PASS | check | `lint.log` |
| `npm run build` | PASS | check | `build.log` |
| `npm run guard:sql-injection && node scripts/security/guard-f04-ci-workflow.mjs && node --test tests/security/f04-ci-workflow.test.mjs tests/security/f04-migration-preflight.test.mjs tests/local/policy.test.mjs` | PASS | 7 | `security-guards.log` |
| `npm run lint` (após correção final do cliente) | PASS | check | `lint-final.log` |
| `npm run build` (após correção final do cliente) | PASS | check | `build-final.log` |
| Primeira rodada do novo teste de sigilo no navegador | FAIL corrigido | Strict Mode apagava o token; 32 Node + 7 browser passaram, 1 browser falhou antes da correção | `d-final-first-failure.log` |
| Build Docker web revisado + runtime/migrator | PASS | não-root, migrations, login negado com papel runtime | `images.json` / `web-functional.log` |
| Trivy HIGH/CRITICAL web + migrator | PASS | imagens exatas desta revisão / migrator idêntico | `trivy.log` |
| `npm audit --omit=dev --audit-level=high --json` | PASS | 0 vulnerabilidades | `dependency-audits.json` |
| `npm audit --prefix docker/migrator --include=dev --audit-level=high --json` | PASS | 0 vulnerabilidades | `dependency-audits.json` |
| `npm audit --json` completo | FAIL / risco dev | 1 HIGH (`zod`) + 1 MODERATE (`ip-address`) | `dependency-audits.json` |
| Primeira execução F04 | FAIL corrigido | TS2540 na fixture NODE_ENV; reexecução integral PASS | `f04-initial-failure.log` |
| `git diff --check` / index vazio | PASS | nenhum staging/commit/push | auditoria |
| CI remoto D / envio externo / laboratório manual | NOT RUN | dependem de revisão/autorização específica | `validation.json` |

Evidências novas em [validation.json](../evidence/missao-04-d/revisao-final/validation.json), [execution.log](../evidence/missao-04-d/revisao-final/execution.log), [integrity.json](../evidence/missao-04-d/revisao-final/integrity.json) e [images.json](../evidence/missao-04-d/revisao-final/images.json). A primeira falha F04 tem trecho real capturado e exit/duração; seu log integral não foi conservado na reexecução. O log integral da reexecução e todas as evidências anteriores à revisão estão preservados. A fixture foi corrigida com Object.assign sobre o ambiente; nenhum guard foi enfraquecido.

### Riscos atuais e decisão

- Auditoria completa de desenvolvimento atual: **FAIL, uma HIGH em zod 4.5.4 ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) e uma MODERATE em ip-address 10.7.3 ([GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5))**. Cadeias de dev registradas, incluindo eslint-plugin-react-hooks/shadcn/MCP SDK e express-rate-limit/socks. Lockfiles inalterados; a resposta atual do registry difere da entrega inicial (seis MODERATE) e dos nove HIGH herdados anteriormente. Não presume remediação dessas entradas por atualização: nenhum npm audit fix/override/upgrade foi feito. Produção e migrator retornam zero na auditoria npm atual; os resultados Trivy das imagens exatas estão separados. A nova HIGH deve ser avaliada explicitamente na revisão humana.
- Trivy atual emitiu WARN de detalhes ausentes para `CVE-2026-107891` (possivelmente rejeitada, segundo o scanner) e uso de severidades de outros vendors. Logs completos preservados, sem supressão; exit 0 nos dois scans não resolve essa limitação do feed.
- `after()` é trabalho acompanhado pelo processo, **não fila durável**. Queda abrupta pode perder o pedido; novo pedido legítimo respeita quotas. 202 não confirma conta nem e-mail enviado. Não se alega tempo constante sob toda saturação compartilhada ou suporte a uma hospedagem não testada; homologar shutdown gracioso/timeouts antes da exposição pública.
- Resend/DNS/SPF/DKIM/DMARC/HTTPS público/webhook/entrega em clientes reais continuam NOT RUN, sem envio externo ou alterações de infraestrutura. A compatibilidade de links legados em query não equivale a prova de redação de logs em proxies externos.
- O laboratório manual não foi acessado ou alterado; sua conta PAP_ADMIN, senha, MFA, sessões, banco, volume, configurações e branch permanecem fora destas operações. Apenas recursos descartáveis próprios foram usados e identificados em cleanup.json. Não foi executado local:init/local:admin/reset, merge ou deploy. PR #5 continua OPEN/draft, base develop inalterada.

**D preparado para revisão final e decisão de versionamento; não aprovado automaticamente. Commit/push aguardam aprovação explícita do operador, inclusive dos riscos de dependências. CI remoto D permanece NOT RUN. E só começa após o versionamento aprovado do D; não há autorização de produção.**

## Revisão pré-commit autorizada — 24/10/2026

Os 66 caminhos coincidiram com o inventário aprovado, e os 66 hashes da última entrega conferiram antes desta atualização documental expressamente solicitada. HEAD e remoto: `68c6c2ac6785f08b75663aa59151bdc146a0bb20`; index inicialmente vazio; PR #5 OPEN/draft, base develop. Nenhuma alteração funcional adicional ou arquivo do E.

Auditorias repetidas sem supressão, npm audit fix, overrides ou alteração dos lockfiles:

- `npm audit --json`: **FAIL / exit 1**, 3 HIGH (zod, body-parser, undici) + 2 MODERATE (fast-uri, ip-address). Resultados anteriores permanecem históricos; esta é a revisão pré-commit atual.
- `npm audit --omit=dev --audit-level=high --json`: **PASS / exit 0**, 6 MODERATE, 0 HIGH/CRITICAL. A árvore de produção retorna fast-uri e sua propagação; não deve ser descrita como zero vulnerabilidades.
- `npm audit --prefix docker/migrator --include=dev --audit-level=high --json`: **PASS / exit 0**, 5 MODERATE, 0 HIGH/CRITICAL; resultado bruto registrado em `authorizedPreCommitReview.migrator`, junto às cadeias e aos demais resultados completos.

**HIGH original: zod 4.5.4**, instalado em node_modules/zod, transitivo e marcado dev no lockfile. Cadeias: eslint-config-next 16.4.2 → eslint-plugin-react-hooks 7.1.1; shadcn 4.22.0 → @modelcontextprotocol/sdk 1.32.1 / @shadcn/registry 0.2.0, incluindo peers de conversão/validação de schemas. [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), CVSS 7.5, CWE-770, versões <4.6.6, primeira corrigida 4.6.6. A descrição oficial foi consultada pela API pública GitHub: acumulação ilimitada de erros ao validar coleções grandes pode esgotar memória e derrubar o processo. Não foi identificado import direto de zod no código src; isso não equivale a uma prova geral de ausência em bundles de terceiros. Risco residual concreto no processamento de conteúdo não confiável por ferramentas de desenvolvimento/CI, CLI de componentes/registro ou SDK MCP. Nenhuma dessas ferramentas deve ser exposta como serviço público nesta entrega. O aceite do D para versionamento não corrige a dependência.

**Novas HIGH da auditoria atual:** body-parser 2.3.0, transitivo dev por express/SDK de tooling, [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), DoS por bytes excedentes em corpo comprimido, faixa >=2.0.0 <2.4.0; undici 7.29.1, transitivo dev por shadcn/@shadcn/registry/@dotenvx/dotenvx, [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c), DoS por erro não tratado com codificações excessivas, faixa >=7.18.0 <7.30.1 (também há avisos moderados no mesmo pacote). Não houve atualização automática: manter a auditoria visível e tratar a remediação de dependências separadamente. As seis MODERATE de produção também permanecem risco residual documentado.

Os JSONs completos e suas diferenças de escopo estão preservados no mesmo caminho aprovado de dependency-audits.json; nenhuma evidência anterior foi apagada. Código, migrations, autenticação, IAM, MFA e imagens validadas permanecem idênticos. Sem acesso ao laboratório, e-mails externos, DNS/VPS, merge ou deploy. CI do novo commit deverá executar antes de qualquer implementação do E.

## Primeiro CI remoto e correção pontual da fixture

D versionado exclusivamente nos 66 caminhos aprovados: `ed8b1ca0cdd9fd69882b29d081575ba2bb3ee3d7`, commit `feat(email): complete mission 04 transactional email slice D`, push não forçado na feature. PR #5 OPEN/draft, base develop mantida.

[Workflow 40063921155](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40063921155): **FAIL**, job de validação falhou em Isolated local development workflow. F04 integrado, Beta, auditorias de produção/migrator e preflight passaram; D/B/C/browser/auth/Docker posteriores foram SKIPPED, não aprovados. Publish e deploy SKIPPED. Resultado de cada step/job preservado em validation.json.remoteCiAttempts.

Causa raiz comprovada pelo log: `tests/local/provision.integration.test.ts` ainda exigia `mail.text.includes("/convite?token=")`. O e-mail do D usa corretamente fragmento para não expor segredo em requisições/analytics. A correção altera somente essa fixture: exige origem/path corretos, query vazia, fragmento com token aleatório de 43 caracteres e o mesmo link no texto. Asserções booleanas não imprimem bearer em uma futura falha. Não reverte o modelo seguro, não altera runtime, migrações, IAM, MFA ou configuração do laboratório.

Validação local da correção: `node --test tests/local/policy.test.mjs` **PASS (4)**; `npx tsc --noEmit` **PASS**; `npx eslint tests/local/provision.integration.test.ts` **PASS**; `git diff --check` **PASS**. O smoke com nomes fixos/porta de laboratório **NOT RUN neste host**, para preservar a fronteira do operador. Será reexecutado integralmente em runner GitHub descartável pelo CI do commit de correção; não foi executado local:init/local:admin no laboratório manual.

Inventário seletivo do follow-up autorizado pela cláusula de correção do CI: tests/local/provision.integration.test.ts; docs/codex/RELATORIO-MISSAO-04-SLICE-D.md; docs/evidence/missao-04-d/revisao-final/validation.json; docs/evidence/missao-04-d/revisao-final/execution.log. Nenhum arquivo E. E continua bloqueado até SUCCESS completo do novo CI.

## Segundo CI: investigação WCAG sem relaxamento do gate

Correção do smoke enviada em `8b8b28f4bd35a56b3e018e690aaa701293ccf3de`. [Workflow 40064414519](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40064414519): smoke e primeiro acesso/MFA **PASS**; B teve **28 Node PASS + 4 browser PASS + 1 browser FAIL** na asserção WCAG de Manager desktop/mobile/dark (governance.spec.ts). C/D/auth completo/Docker seguintes SKIPPED. Detalhes de cada job/step preservados em remoteCiAttempts.

O reporter sanitiza erros para a primeira linha; a regra WCAG e o alvo não constavam do log e os arquivos temporários não foram publicados pelo workflow. Causa da violação **ainda não estabelecida**. Reexecuções locais completas com Chromium 154: 28 Node + 5 browser **PASS**. TypeScript e lint **PASS**. Chromium 156 usado no CI: reprodução local **BLOCKED**, download oficial retornou HTTP 403 Domain forbidden. Não se atribui a causa ao browser sem evidência.

Mudança pontual de observabilidade em tests/mission04-b/governance.spec.ts: a primeira linha da asserção passa a incluir viewport, regra, impacto, seletor sem valores de atributos e dados numéricos de contraste. Sem HTML, dados de conta, request, tokens ou DOM completo. A mesma asserção exige zero violações e mantém tags WCAG, browser, ausência de retries e todos os guards. Nenhuma alteração funcional para mascarar a falha. Novo CI necessário; não declarar essa falha resolvida sem evidência.

Inventário deste follow-up: tests/mission04-b/governance.spec.ts e os mesmos três caminhos de relatório/validation.json/execution.log. Nenhum arquivo E; laboratório intacto.

## Terceiro CI: causa WCAG comprovada e correção RED/GREEN

[Workflow 40065245130](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40065245130), SHA `ebe1536b9b5a0cdc4e070153aea987d8891b50ac`: **FAIL**, novamente no B; diagnóstico sanitizado mostrou color-contrast serious em manager-dark nos controles Ajuda e Minha segurança e perfil. Cor intermediária #758785 sobre #142d31: **3,83:1**, exigido **4,5:1**.

Causa comprovada: `transition` genérico nos controles anima a cor herdada entre #172c2c e #e6f4ef enquanto o fundo do header já mudou. Hover também usava fundo claro no tema escuro. Ao ampliar o teste para hover/foco, o erro foi reproduzido localmente ANTES do patch: 3,83:1 e 1,5:1 no perfil com fundo de hover intermediário. Não é atribuída falha ao Chromium; a diferença de timing expôs uma violação real da UI.

Patch mínimo em src/components/admin/AdminTopbar.tsx: remover a transição genérica de três controles (menu, ajuda e perfil) e definir dark:hover #28484b. Cores de texto/fundo mudam juntas; nenhum delay, retry, exclusão de alvo ou desativação de regra foi usado. Asserção WCAG preservada e ampliada para normal/hover/foco nos dois controles identificados. Sem alterações de IAM, MFA, dados ou regras de negócio.

Matriz atual: B **PASS: 28 Node + 5 browser**, incluindo 9 estados WCAG por viewport/interação no cenário do gerente; C **PASS: 41 Node + 8 browser**; TypeScript **PASS**; ESLint dos arquivos alterados **PASS**; build **PASS** após corrigir o comando de execução local. A primeira invocação do build falhou corretamente por ausência de DATABASE_URL; a reexecução usou apenas a URL do PostgreSQL descartável próprio, mantendo o guard fail-closed sem alteração de código. Logs RED, GREEN, tentativa de build e reexecução preservados.

Inventário seletivo deste follow-up: src/components/admin/AdminTopbar.tsx; tests/mission04-b/governance.spec.ts; docs/codex/RELATORIO-MISSAO-04-SLICE-D.md; docs/evidence/missao-04-d/revisao-final/validation.json; docs/evidence/missao-04-d/revisao-final/execution.log. Capturas geradas de B/C e a mudança automática de título AGENTS foram arquivadas fora do Git e restauradas aos bytes do HEAD. E não iniciado; exige SUCCESS completo do próximo CI.
