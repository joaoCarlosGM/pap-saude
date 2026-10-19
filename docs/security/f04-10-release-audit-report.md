# MISSÃO 01 — F04.10: relatório técnico de release

Data: 2026-10-19. Branch: `codex/f04-10-release-hardening`.
Base da missão: `fd42d91`. **Decisão: NO-GO para produção.**

## Resumo executivo

Os gates locais foram executados com sucesso: migração legado vazio→F04,
preservação e aborto em legado populado, restauração sintética, separação de papéis,
regressões F01–F04, TypeScript, lint, build e ambas as imagens. As 27 migrations
históricas estão byte a byte intactas. Uma migration incremental, a 28ª, corrige
paridade SQL/Prisma sem apagar tabelas, colunas ou dados. Nenhum deploy, acesso à VPS,
merge ou push em prod/PROD/develop foi realizado.

O NO-GO permanece porque os privilégios reais de produção, script/compose externos,
restore operacional, proteções GitHub e aceite humano não foram verificados. Os
resultados locais não substituem esses gates. O CI remoto deve ser verificado no
PR/run correspondente ao commit revisado; sua execução não é presumida neste relatório.

AGENTS.md, a missão, regras de CI, Dockerfile, migrator, schema, migrations e scripts
de auditoria foram lidos. O checkout inicial estava em `work`, no commit de PROD
`00f4562`, sem o documento; a branch correta foi localizada no origin e usada no
checkout existente, sem criar worktree nem sobrescrever trabalho de terceiros.

## Matriz requisito → teste → resultado → evidência

| Requisito | Teste executado | Resultado | Evidência reproduzível |
|---|---|---|---|
| Instalação congelada | npm ci, lockfile original + atualização explícita de yaml dev | PASS, 885 pacotes na reinstalação final | `npm-ci-final.log` |
| Prisma | prisma validate e generate | PASS | `prisma-validate.log`, `prisma-generate.log` |
| Rotas/TS/lint/build | next typegen, tsc --noEmit, npm run lint/build | PASS; lint final sem avisos | `typegen.log`, `tsc.log`, `lint.log`, `build-final.log` |
| F04 integrado | npm run audit:f04:operations | PASS: 78/78, 0 skips/falhas | `operations-final.log` |
| F03 completo | npm run test:f03:smart:force | PASS: 203/203, nove módulos, 0 skips/falhas | `smart.log` |
| Autenticação/MFA/F02 | npm run test:auth | PASS: 202/202, 0 skips/falhas | `auth.log` |
| Preflight/backup sintético | node --test tests/security/f04-migration-preflight.test.mjs | PASS, três cenários; snapshots completos iguais após restore | `security-final.log`, `preflight.log` |
| Segurança do workflow | guard estrutural + seis mutações adversariais | PASS, condições inseguras rejeitadas | `security-final.log`, `ci-guard.log` |
| Histórico 1→27 | imagem migrator fixada e banco inicial legado | PASS histórico/checksums, segunda execução e invariantes; diff detectou drift preexistente | `migration-27-baseline.log` |
| Histórico 1→28 | harness final da imagem | PASS, 28 concluídas, checksums, idempotência, invariantes e diff vazio | `migration-image-final.log` |
| Falha migrator bloqueia web | falha sintética em histórico descartável + contrato condicional | PASS; não é validação do deploy.sh externo | `migration-image-final.log` |
| Separação PostgreSQL | scripts SQL e testes negativos em container próprio | PASS, reaplicação idempotente e DDL/DML diferenciados | `roles.log` |
| Imagens Docker | build runner/migrator, usuários sem root, CLI isolada | PASS | logs `*-build-final.log`, `image-isolation.log` |
| Web com runtime mínimo | migration como owner não-superuser; login HTTP negado gravado por runtime | PASS, liveness e renderização também conferidos | `web-image.log` |
| Dependências prod/migrator | npm audit --omit=dev e audit --prefix docker/migrator --include=dev, nível high | PASS, 0 vulnerabilidades reportadas | `audit-root.log`, `audit-migrator.log` |
| CVEs das imagens | Trivy 0.76.0 fixado por digest, HIGH/CRITICAL, sem ignore | PASS nas duas imagens, exit 0 | `image-scan.log` |
| Imutabilidade histórica | comparação bytes vs fd42d91 | PASS, 27 arquivos preservados | `history-integrity.log`, JSON versionado |
| F03 master legado | guards de branch históricos preservados | NOT RUN nesta branch; nove módulos executados pelo smart runner | Não alegar PASS do master |
| VPS/restore real/branch protection | exige operador autorizado | NOT RUN / externo | Runbook e checklist abaixo |
| CI hospedado | execução automática após push/PR | Validar run do commit; não inferir sucesso do resultado local | Checks do PR |

Os totais por suíte podem conter cenários compartilhados; não são somados como testes
exclusivos. `security-final.log` possui dois testes: um executa seis mutações de CI;
o outro exercita três cenários em PostgreSQL com dump/restore. As invariantes SQL e
smokes são verificações funcionais adicionais, não contagens inventadas de testes.

## Achados e correções

| Severidade | Achado | Correção/status |
|---|---|---|
| CRITICAL | Migrations históricas removem dados legados se executadas sem inventário | Preflight obrigatório na imagem; qualquer dado legado causa aborto sem mutação; manutenção confirmada e sem outras sessões para legado vazio. Dados existentes exigem plano clínico separado. |
| CRITICAL externo | pap_prod foi anteriormente descrito com SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS | Situação atual NÃO reconfirmada na VPS. Scripts/testes mínimos prontos; produção permanece NO-GO até cutover comprovado. |
| HIGH | .dockerignore excluía os SQL de migration | Exceção explícita para prisma/migrations/**/migration.sql; imagem realmente ensaiada. |
| HIGH | npm herdado da base introduzia 11 CVEs HIGH por imagem, invisíveis ao audit do lockfile da aplicação | Removidos npm/corepack/yarn dos estágios finais; nova varredura HIGH/CRITICAL limpa nas duas imagens. Sem suprimir CVEs. |
| HIGH | Defaults/índices do SQL histórico divergiam do modelo Prisma | Nova migration transacional de paridade; diff final vazio. Histórico não reescrito e schema.prisma não alterado para esconder drift. |
| HIGH | Confiança SSH criada por ssh-keyscan durante deploy | VPS_KNOWN_HOSTS confiável obrigatório; StrictHostKeyChecking e BatchMode; environment production declarado. Configuração humana ainda necessária. |
| MEDIUM | Branch desta missão não acionava validação e guard local F04 a rejeitava | Adicionada branch exata ao CI/guard, mantendo restrição de publish/deploy exclusivamente em push prod. |
| MEDIUM | Smart --force podia selecionar zero módulos; cache não cobria alterações compartilhadas | --force executa todos; fingerprints incluem scripts, migrations, locks, helpers e Node; ausência de seleção não vira PASS; falha não impede registrar módulos independentes. |
| MEDIUM | Fixtures F03 criavam UBS sem município/PAP, incompatíveis com invariantes F04 | Helper de fixtures com hierarquia válida e guard de banco descartável; nenhuma asserção de autorização ou trigger foi removida. |
| MEDIUM | Arquivos copiados com modo restritivo impediam Prisma não-root | COPY com ownership explícito; migrator e web testados sem root. |
| LOW | npm ci avisa que ESLint 9 está fora de suporte | Aviso de manutenção, sem falha de lint ou CVE HIGH reportada pelo audit solicitado. Upgrade major fora desta missão. |

## Migração, dados legados e restauração

A origem do harness contém somente `20260909150044_init_clinical_schema`, com checksum
registrado por Prisma migrate resolve. O baseline 1→27 mostrou a cadeia aplicada,
segunda execução sem alterações e triggers habilitados, mas o schema diff revelou
drift. O candidato final acrescenta `20261019010000_foundation_04_schema_parity`:
remove defaults divergentes, elimina índice auxiliar redundante de MFA (prefixo
userId continua indexado) e renomeia índice truncado para o nome canônico. A
transação não transforma nem remove registros. As escritas Prisma já fornecem os
campos obrigatórios; compatibilidade operacional com imagem antiga ainda exige ensaio.

O harness final comprova 1→28, histórico/checksums exatos, nenhuma migration pendente
ou falhada antes da injeção deliberada de falha, schema diff vazio e idempotência.
Três cenários independentes (paciente, internação, avaliação) abortam com
LEGACY_DATA_BLOCKED antes de chamar Prisma. O teste direto compara todas as linhas
sintéticas das três tabelas antes/depois do aborto e após pg_dump/pg_restore.

Manutenção explícita é obrigatória para legado vazio. O advisory lock protege
apenas migrators cooperantes; congelamento de escritores e bloqueio de novas
conexões precisam ser mantidos pelo operador. Não há transformação automática
aprovada para legado populado: o resultado seguro é abortar e preservar. Um restore
sintético bem-sucedido não comprova RTO/RPO, backup nem restore de produção.

## PostgreSQL: runtime versus migrator

`f04-role-separation.sql` é transacional, parametrizado e idempotente. Cria papéis
NOLOGIN sem credenciais e recusa reutilização privilegiada, membership ou runtime
dono de objetos. Runtime tem DML, uso de sequências, SELECT/INSERT de auditoria e
nenhum acesso a _prisma_migrations. Não recebe DDL nem poderes de superuser.

No teste, runtime não consegue UPDATE/DELETE/TRUNCATE de auditoria, desabilitar
triggers, DROP/CREATE de tabelas, assumir migrator, mudar session_replication_role
ou consultar histórico Prisma. Migrator mantém DDL. O smoke web aplica a cadeia
com migrator não-superuser e grava uma tentativa de login negada com runtime.

Ownership existente, ACLs PUBLIC, funções externas SECURITY DEFINER, credenciais,
LOGIN e troca da conexão real exigem inventário humano. O script não altera o
pap_prod existente, não transfere ownership globalmente e não toca bancos/roles de
n8n. Revogar CREATE público no schema do banco PAP pode afetar consumidores que
compartilhem esse schema: confirmar segregação antes de executar.

## CI, imagens e limites das evidências

O YAML exige todos os gates locais, incluindo regressão forçada F03, auth, roles,
smokes e varredura Trivy. Actions, base Node e scanner estão fixados por SHA/digest.
PRs não publicam nem fazem deploy. O environment production precisa de revisores
configurados externamente; sua simples declaração não constitui proteção efetiva.

Imagens finais locais verificadas:

- runner: `sha256:0629e776bd7b815e7110f9648242b9d4f7d39db0dc2047cf767cb41048e3f7f9`, usuário nextjs.
- migrator: `sha256:bf13c0b17829b2931a4ae7147a7e779d25f76c79ac089a582501a9abfaffa4c6`, usuário node.

Node local 24.19.0/npm 11.9.0; imagens Node 22.23.3; PostgreSQL 16; Alpine 3.24.2.
Varredura válida para esses artefatos e a base de vulnerabilidades da execução;
não é promessa de ausência de CVEs futuras. `/api/health` prova liveness, não
prontidão clínica/DB. O teste HTTP adicional verifica autenticação negada com DML.

Falhas intermediárias foram diagnosticadas e corrigidas: bloqueio de domínios
Prisma/fontes, DNS do proxy no BuildKit, confiança TLS no builder, permissões
não-root, fixtures antigas, drift e dependências do npm na base. Houve ENOSPC na
reinstalação final; caches/imagens intermediárias desta missão foram liberados e a
reinstalação completa foi repetida com sucesso. TLS/checksums não foram desabilitados.

## Evidência e reprodução

`evidence/f04-10-validation.json` contém totais, identidades das imagens e hashes
SHA-256 dos logs completos da sessão e de cada migration histórica. Logs completos
ficam em `/tmp/f0410-evidence` nesta máquina; o resumo versionado é a evidência
portável. Não há credenciais reais, dados clínicos reais ou .env em Git.

Executar somente em ambiente descartável, na branch da missão:

1. npm ci; DATABASE_URL sintética explícita; prisma validate/generate; next typegen;
   tsc --noEmit; npm run lint/build; os dois npm audit descritos na matriz.
2. Criar o container de suporte pap_saude_db com PostgreSQL 16, label
   pap.disposable=f0410, usuário/senha CI pap_user/pap_password, DB pap_saude e
   porta local 127.0.0.1:5432. Nenhuma URL de produção deve ser injetada.
3. Executar audit:f04:operations, test:f03:smart:force e test:auth **sequencialmente**:
   auth e patient usam o mesmo nome descartável e não podem disputar esse banco.
4. Executar os testes de tests/security, guard de CI e test-f04-role-separation.sh.
5. Construir runner/migrator e executar test-f04-migrator-image.sh,
   test-f04-web-image.sh e security/scan-f04-images.sh com as tags construídas.
   Proxy/CA e flags opcionais estão no runbook. Conferir exit status real, inclusive
   do scanner, e não interpretar ausência de testes como sucesso.

Os harnesses próprios removem seus containers, redes e dumps. O container de
suporte local foi criado nesta missão com label explícito, nunca conectado à VPS.

## Gates externos e checklist GO/NO-GO

- [ ] CI remoto verde para o commit efetivamente revisado.
- [ ] Revisão humana da nova migration, privilégios e plano de manutenção.
- [ ] Inventário read-only atual do legado e pap_prod, sem assumir contagens antigas.
- [ ] Runtime real sem superuser/DDL/ownership; credenciais separadas e rotacionadas.
- [ ] Backup verificado e restore isolado de volume real; RTO/RPO aceitos.
- [ ] deploy.sh/compose reais auditados; falha migrator impede web; health/smoke reais.
- [ ] Branch protection e environment production com revisores e regras sem bypass.
- [ ] n8n, DNS/TLS, RNDS/telemetria e aceite clínico conforme escopo de release.
- [ ] Compatibilidade de versão e restore/roll-forward aprovados. Rollback de imagem
  não reverte migrations.

Enquanto qualquer gate essencial externo estiver pendente: **NO-GO para produção**.
O runbook `f04-10-cutover-runbook.md` contém inspeção somente leitura e procedimento
revisável; não foi executado na VPS.

## Commits e arquivos

| Commit | Objetivo |
|---|---|
| 62f1627 | Preflight legado, isolamento e privilégios PostgreSQL |
| a86e9dd | Proteção de CI, SSH confiável e referências fixas |
| 97e2b9a | Regressão F03 e fixtures hierárquicas |
| 667a15d | Migration incremental atômica de paridade |
| bb3985e | Contratos de falha, inventário read-only e smoke com runtime mínimo |
| 39df7d9 | Remoção do npm vulnerável e gate de CVEs nas imagens |
| Commit de documentação deste relatório | Relatório, runbook, gates e resumo de evidências |

Arquivos: Dockerfile/.dockerignore; workflow CI; package/lock raiz (yaml dev) e do
migrator (pg fixado); wrapper migrate.mjs; nova migration; scripts/db de privilégios,
invariantes e inventário; harnesses de imagens/roles; guard e scanner de segurança;
smart runner; helper e 16 fixtures clínicas; health route; dois testes de segurança;
documentos e JSON de evidências. A lista exata é reproduzível com
`git diff --name-only fd42d91..HEAD`. Migrations históricas e schema.prisma intactos.
