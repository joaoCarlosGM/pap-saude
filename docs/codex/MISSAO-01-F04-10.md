# MISSÃO 01 — F04.10: RELEASE HARDENING E AUDITORIA OPERACIONAL

## Contexto e objetivo
Implementar e verificar a preparação de release das Foundations F01–F04 do PAP Saúde, sobre a branch `codex/f04-10-release-hardening` (derivada de `feature/foundation-04-admin-core`). O objetivo desta missão NÃO é liberar a Beta 1 nem realizar deploy: é obter um candidato F04.10 seguro, reproduzível, auditável e com uma lista explícita do que ainda requer validação humana/VPS.

Leia primeiro `AGENTS.md`, `docs/security/f04-10-ci-release-gates.md`, `.github/workflows/ci.yml`, `Dockerfile`, `docker/migrator/package.json`, `scripts/test-f04-migrator-image.sh`, `scripts/audit-f04-operations.sh`, `prisma/schema.prisma` e as migrations. Inspecione demais arquivos reais conforme necessário. Preserve a arquitetura e testes existentes.

## Fatos já verificados anteriormente — reconfirmar antes de usá-los para aprovar release
- VPS atual: `/opt/pap-saude/compose.yml` e `/opt/pap-saude/scripts/deploy.sh` são EXTERNOS ao repositório e NÃO estão disponíveis automaticamente ao Codex.
- PostgreSQL de produção: `pap_saude` com **1 migration aplicada**, `20260909150044_init_clinical_schema`; três tabelas legadas `patients`, `admissions`, `clinical_evaluations` tinham 0 registros quando auditadas. Esses valores podem mudar.
- Branch F04 possui 27 migrations; a F01 pode remover a tabela `admissions` e colunas legadas. Não assumir ausência de dados na data da implantação.
- `pap-web` usa conexão com papel `pap_prod`, antes auditado como PostgreSQL SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS. Esse privilégio excessivo impede o GO.
- Há um `n8n` com banco/role próprios: não afetar n8n.
- `prod` (minúsculo) publica e faz deploy após push; `PROD` (maiúsculo) é outro branch (padrão). Não fazer merge/push para nenhum deles.

## Conduta operacional inegociável
1. Trabalhar somente nesta branch de feature e em bancos/containers DESCARTÁVEIS de desenvolvimento/CI. Não executar nenhum comando na VPS real; não alterar deploy, banco, dados, DNS, segredos nem volumes de produção.
2. Proibido `prisma migrate dev`, `db push`, `migrate reset`, DROP/TRUNCATE ou qualquer operação destrutiva sobre serviços que não sejam explicitamente descartáveis e identificados. Jamais conectar URL de produção em testes.
3. Não alterar migrations históricas aplicadas nem modificar o esquema para esconder incompatibilidades; usar scripts novos de teste/planos de transição.
4. Nunca imprimir credenciais, conteúdo de `.env`, URLs com senha, snapshots clínicos ou tokens de acesso.
5. Preservar IAM, MFA, isolamento PAP→Município→UBS, auditoria imutável e ausência de acesso clínico implícito do `PAP_ADMIN`.
6. Commits pequenos e descritivos; testar por mudança. Se algum teste não puder executar, relatar `NOT RUN` / `BLOCKED`, nunca `PASS`.
7. Sem deploy automático, sem merge em `prod`, `PROD` ou `develop`; sem alterações no VPS.
8. Não executar `npm audit fix --force` nem introduzir downgrade inseguro.
9. Não supor que rollback de imagem Docker reverta migrations: definir estratégia de restauração/roll-forward e compatibilidade de versão.

## Ordem de trabalho — executar autonomamente com gates
### 0. Inventário e baseline
- Verificar `git status` e commits recentes. Respeitar mudanças não commitadas de terceiros: não sobrescrever.
- Inventariar scripts, testes, migrator, workflow, migrations, schema, controles de autorização e auditoria.
- Mapear riscos por severidade e dependências. Estabelecer baseline de testes usando serviços descartáveis.
- Confirmar se `AGENTS.md` e este documento foram lidos.
- Separar problemas do repositório dos bloqueadores cuja evidência só existe na VPS.

### 1. Exercício realista de migração 1→27
- Criar harness automatizado em banco PostgreSQL DESCARTÁVEL para instalar APENAS a migration inicial como estado de origem e avançar até a migration final via migrator fixado.
- Confirmar integridade estrutural, contagem/histórico `_prisma_migrations`, ausência de migrations falhadas, validade do schema, gatilhos/invariantes F04, auditoria append-only e idempotência da segunda execução.
- Testar independentemente cenários sintéticos de dados legados; quando alterações forem destrutivas, exigir detecção/aborto documentado e orientação de preservação — não apagar silenciosamente conteúdo de teste valioso.
- Testar falha do migrator: deploy web NÃO deve prosseguir após erro de migration. Este teste pode ser contratual/estático se script de VPS real estiver indisponível.
- Reutilizar `scripts/test-f04-migrator-image.sh` e estender sem quebrá-lo.

### 2. PostgreSQL: separação runtime/migrator
- Preparar scripts versionados, parametrizados, idempotentes e revisáveis para futura criação de `pap_runtime` com privilégios estritamente necessários e papel de migrations separado.
- NÃO executar esses scripts em produção. Testá-los em PostgreSQL descartável.
- Verificar que `pap_runtime` NÃO é SUPERUSER, CREATEDB, CREATEROLE ou BYPASSRLS, não é dono dos objetos sensíveis, não pode desabilitar triggers nem alterar/apagar audit_events.
- Verificar permissões de DML suficientes para as operações autorizadas da aplicação, inclusive sequências, se necessárias; migrator conserva permissões de DDL somente quando executado intencionalmente.
- Conservar compatibilidade com serviços externos como `n8n`, nunca modificar seus grants/bancos.
- Preparar instruções precisas para cutover, rotação de credenciais, critérios de reversão e inspeção read-only pré e pós.

### 3. CI/CD, imagens e deploy seguro
- Auditar `.github/workflows/ci.yml` e guard de branch. Somente push em `prod` deve poder publicar/deploy; PRs não.
- Validar ambientes, proteções, dependências, lockfiles, `npm ci`, audit de dependências production e migrator, build Next.js e Docker de ambos targets.
- Examinar `Dockerfile` e migrator para usar dependências isoladas.
- Conferir health checks, sequência migrator→web, tratamento de falhas e rollback como requisitos. O deploy script real da VPS está fora do Git: NÃO afirmar que foi validado; produzir checklist e comandos SOMENTE READ-ONLY, com saída redigida sem segredos, a serem executados pelo operador, se preciso.
- Redigir procedimento de backup verificável, ensaio de restore em ambiente isolado, ensaio de subida e smoke tests, com GO/NO-GO claro.
- Não criar workflow que possa disparar deploy acidental ao fazer push na branch de trabalho.

### 4. Auditoria e regressão completa
Executar, sempre que ambiente permitir:
- `npm ci`, `npx prisma validate`, `npx prisma generate`, `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- `npm audit --omit=dev --audit-level=high`.
- `npm audit --prefix docker/migrator --include=dev --audit-level=high`.
- `npm run audit:f04:operations` e testes F04/F03 relevantes, respeitando os guards de branch existentes.
- `docker build --target runner` e `--target migrator`; harness de migration isolado e teste de idempotência.
- Verificações adversariais: impersonação de escopo, bypass de tenant, permissões administrativas vs clínicas, auditoria append-only, superuser runtime negado.
- Validar novamente após corrigir cada falha; anexar evidências reproduzíveis, sem segredos.

### 5. Relatório final obrigatório
Criar `docs/security/f04-10-release-audit-report.md` com:
- resumo executivo e status `GO` ou `NO-GO` (release de produção somente após aceite humano e evidência VPS);
- matriz requisito→teste→resultado→evidência;
- achados `CRITICAL/HIGH/MEDIUM/LOW` e correções;
- migrations inicial→final, integridade, idempotência e dados legados;
- privilégios runtime vs migrator, testes negativos;
- status de CI, Docker, deps, TS, lint, build;
- pendências externas à execução: script VPS, testes de restore, DNS, GitHub branch protection, revisão manual;
- instruções de uso para operador e checklist GO/NO-GO;
- lista de commits e arquivos alterados.
A conclusão correta pode ser `NO-GO para produção` mesmo que a branch fique pronta.

## Aceitação desta missão
CONCLUÍDA TECNICAMENTE se: scripts e documentação consistentes, testes disponíveis passaram de verdade, regressões não ocorreram, migração 1→27 com dados sintéticos foi ensaiada, separação de papéis foi comprovada em DB descartável, CI e build estão verdes, e relatório completo permite uma decisão humana.
NÃO CONCLUÍDA se: erros críticos não corrigidos, dados legados perdidos sem detecção, aplicação runtime conserva superuser nos planos, testes falsamente marcados como PASS, ou não há estratégia plausível de backup/restore.

## Forma de trabalho Codex
Implementar autonomamente: identificar falha→corrigir→testar novamente→commitar. Evitar perguntas desnecessárias; escalar apenas decisões que envolvem infraestrutura/segredos externos ou ações irreversíveis. Entregar PR para revisão somente se a execução conseguir criá-lo sem merge nem deploy. Ao encerrar, responder em português com commits, evidências, pendências e GO/NO-GO.
