# Admin Beta isolado — relatório técnico

Base: `ea6b5f969701c8c44c278aec56019a0211b3cc60` (CI de origem 41110597566).
Branch exclusiva: `feature/admin-beta-isolated-deployment`.
O SHA final é o commit que contém este relatório; o workflow **Admin Beta isolated images**
identifica e valida esse mesmo SHA antes de publicar. Consulte a execução dessa branch em
https://github.com/joaoCarlosGM/pap-saude/actions?query=branch%3Afeature%2Fadmin-beta-isolated-deployment .
Não substituir as evidências pendentes pelo CI histórico da origem.

## Escopo e controles

Runtime `PAP_ADMIN_BETA_ONLY=1`, allowlist exata de métodos/caminhos, negação de desconhecidos,
credencial exclusiva de proxy e bloqueio de overrides internos. O modo desligado mantém o
contrato operacional existente. IAM, MFA, CSRF, auditoria e políticas por organização continuam
nos serviços originais, sem alterações. Menus são filtrados apenas como UX adicional.
Clínica, LMS, Vitrine, Comercial e APIs não homologadas são bloqueados no servidor.

Compose independente `pap-admin-beta`: web em **127.0.0.1:3101**, banco sem porta publicada,
redes/volumes próprios, limites de recursos, web sem root e filesystem somente leitura.
Preparação exige destino novo/vazio, gera segredos independentes e recusa sobrescrita.
Arquivos secretos montados individualmente são legíveis pelos diferentes UIDs dos containers;
o diretório hospedeiro que os contém permanece privado0700. Não publicar nem copiar esse diretório.

Não há migration nova nem edição das 36 históricas. O manifesto compara checksums e ledger;
o runtime não pode alterar schema, ledger ou auditoria. Verificação explícita libera o startup
somente após migração, drift e ACL. As migrations históricas incluem operações de transformação:
aplicá-las exclusivamente no novo banco vazio, nunca no banco antigo. Futuras mudanças exigem
revisão aditiva, backup, nova validação e execução manual. Rollback operacional não desfaz SQL.

Primeira identidade utiliza instituição/e-mail/senha escolhidos pelo operador, entrada privada
via stdin, hashing e IAM existentes, transação serializável e recusa de reprovisionamento.
Nenhum fator, sessão, conta de demonstração ou senha foi incorporado. Login primário permite
configuração MFA; funções administrativas continuam exigindo segundo fator real verificado.

Nginx novo apenas, com TLS, origens fixas, cookies Secure da aplicação, sobrescrita de IP pelo
proxy e segredo privado para impedir chamadas locais falsificando IP. Logs estruturados omitem
URI, query, referrer, cookies e IP; erros Nginx desse vhost são descartados para impedir vazamento
de links privados (monitorar status/request_id e auditoria). CSP mantém inline necessário ao Next.
E-mail externo fica desabilitado por padrão; recuperação/convites públicos exigem aprovação
separada, novas chaves/sender e homologação Resend/DNS. Não houve envio real.

## Evidências locais efetivamente executadas

| Verificação | Resultado | Evidência privada neste executor |
|---|---|---|
| `tsx --test tests/admin-beta-deployment/{policy,deployment}.test.ts` | PASS 6/6, zero skip | `/tmp/admin-beta-unit-final.log` |
| `npm run test:beta1:unit` | PASS 29/29 (21+6+2), zero skip | `/tmp/admin-beta-baseline-unit.log` |
| `npx tsc --noEmit` | PASS | `/tmp/admin-beta-tsc-final.log` |
| ESLint dos arquivos TS/TSX/MJS novos/modificados | PASS | `/tmp/admin-beta-lint-final.log` |
| `bash -n scripts/admin-beta/build-images.sh`, `sh -n deploy/admin-beta/init-db.sh` | PASS | execução local, exit0 |
| Compose config, manifesto36 e baseline protegida | PASS, incluído nos 6 testes | log unitário |
| `node scripts/admin-beta/test-nginx.mjs` em nginx descartável/networknone | PASS após corrigir UID do teste | `/tmp/admin-beta-nginx-fixed.log` |
| `npm audit --omit=dev --audit-level=high --json` | PASS gate, 6 MODERATE/0 HIGH/0 CRITICAL | `/tmp/admin-beta-prod-audit.json` |
| Audit migrator isolado com mesmos parâmetros | PASS gate, 5 MODERATE/0 HIGH/0 CRITICAL | `/tmp/admin-beta-migrator-audit.json` |
| Build Docker novo (builder/web/migrator/tools) | BLOCKED local: npm ci retornou `Exit handler never called!` | `/tmp/admin-beta-build-images.log` |
| Integração HTTP/RSC/API/TOTP/recovery/ACL/restore/restart em imagens de produção | NOT RUN local, obrigatório no CI | `run-isolated.mjs` |
| Trivy HIGH/CRITICAL das três imagens | NOT RUN local, obrigatório no CI | `scan-images.mjs` |
| Publicação GHCR Beta | NOT RUN nesta revisão local; somente após gates do CI | workflow separado |
| Ativação VPS, DNS/TLS, Resend e smoke público | NOT RUN, operador | RUNBOOK.md |

A primeira tentativa de build não iniciou por Dockerconfig global somente leitura; a execução
com Dockerconfig temporário próprio ultrapassou esse ponto e falhou dentro de npm ci.
Diagnóstico limitado: registry npm respondeu PONG em container; o checksum oficial do engine
Prisma linux-musl-openssl-3.0.x recebeu CONNECT403 do proxy deste executor. Isso comprova
bloqueio externo de download, mas não prova isoladamente a causa interna do erro do npm.
Não houve alteração de Dockerfile histórico, desativação de scripts/checksums ou instalação forçada.
O CI limpo deve concluir build e integração; enquanto não concluir, **NO-GO para ativação pública**.

Auditorias: a cadeia MODERATE é `prisma -> @prisma/dev -> @prisma/streams-local -> ajv -> fast-uri`;
a aplicação também inclui o vínculo `@prisma/client -> prisma` (6 entradas contra5 no migrator).
Nenhum audit fix/override/upgrade foi feito. Manifestos e lockfiles permanecem os da base.
Os scans de imagens são gates independentes, ainda sem evidência local.

## CI e publicação

O novo workflow dispara apenas na branch tópica ou dispatch nessa mesma branch. Instalação
congelada, auditorias, testes, build único com reuso do builder, Nginx, integração real de imagens,
Trivy e somente depois login/publicação. Verifica inexistência das tags antes de publicar e recusa
sobrescrita. Não há tags mutáveis/prod/latest, SSH, deploy ou alteração no workflow antigo.
Três pacotes Beta com `:sha-<40hex>`: `pap-saude-admin-beta`, `pap-saude-admin-beta-migrator`,
`pap-saude-admin-beta-tools` em `ghcr.io/joaocarlosgm/`. Digests são registrados pelo job.
Permissão packages:write limita-se ao job novo confiável; checkout não persiste credenciais.

O harness descartável verifica inscrição TOTP e recuperação HTTP reais, sessão primária negada,
Admin/Manager e escalonamento negado, CSRF, negativas HTML/RSC/API, segredo do proxy,
backup/restauração das linhas de segurança, replay/drift/ACL, persistência após restart e regressão
modo desligado. Usa recursos próprios com ownership, nunca o laboratório ou banco anterior.
Se o CI revelar falha, interromper publicação e corrigir o primeiro gate sem reduzir as assertions.

## CI inicial e correção dirigida

CI `41142543592`, SHA `b7b30303c593fd65f59cc38dd75f11dffe3e32cc`:
instalação, auditorias, tipos, testes/TypeScript/lint, builds das três imagens e Nginx **PASS**;
integração **FAIL**; scanners e publicação **NOT RUN**. Não houve deploy.
Reprodução isolada do stdin Docker: JSON14 bytes chega como0 sem `-i` e14 com `-i`.
O harness omitia esse flag tanto no primeiro provisionamento como na recusa da repetição;
correção mantém entrada privada via stdin e todas as assertions. Adicionado diagnóstico
sanitizado da subetapa/códigos estáticos, nunca stderr bruto, URL ou credenciais.
Também reproduzida falha de leitura sob umask077: arquivos de secret montados por UIDs
diferentes e scripts públicos precisam chmod explícito. Preparação agora impõe0444 aos
secret mounts e0644 aos arquivos públicos, mantendo diretórios0700/credencial de proxy0600.
Teste unitário força umask077 e confere as permissões. Nenhuma mudança em IAM/MFA/migrations.
O próximo CI deve validar o conjunto; não atribuir PASS aos gates anteriormente pendentes.

CI `41143584849`, SHA `99f7bf22946371e4b025ab45de4ea688aeeb43e5`:
gates iniciais, imagens e Nginx **PASS**; integração **FAIL** na subetapa `verify`;
scanners/publicação **NOT RUN**. Em PostgreSQL16 descartável, a consulta do marcador
com `format(...,$1)` reproduziu SQLSTATE **42P18**; `format(...,$1::text)` passou.
Corrigida apenas a tipagem do parâmetro e acrescentado diagnóstico estático de fase/código,
sem imprimir queries, connection strings ou valores. Evidência privada:
`/tmp/admin-beta-verifier-sql.log`. Inicialização real do PG preparado e os dois papéis
sem privilégios também passaram sob umask077: `/tmp/admin-beta-prepared-pg.log`.
O terceiro CI continua obrigatório antes de publicar/ativar.

## Operação, limites e preservação

Procedimento completo de ativação, preparação de segredos, provisionamento, smoke e rollback:
[RUNBOOK.md](RUNBOOK.md). Somente operador pode executar no destino, após gates aprovados.
DNS/TLS/NTP, capacidade e conflitos no host, GHCRread, monitoramento, segregação de acesso,
restore no destino e governança de administradores permanecem validações externas.
O flag é fronteira de homologação; não remove código operacional do bundle. Serviços críticos
continuam protegidos pelos guards existentes e por redes/credenciais distintas.
Não se declara conformidade legal ou liberação assistencial.

**Nenhuma conexão à VPS, alteração de DNS/Nginx/landing/serviços existentes, operação em banco
antigo ou laboratório3600/15436, modificação de contas/senhas/MFA/sessões/volumes do operador,
merge, deploy ou push em produção foi executado.**

## Inventário seletivo

- `.github/workflows/admin-beta.yml`
- `deploy/admin-beta/Dockerfile.tools`
- `deploy/admin-beta/compose.yml`
- `deploy/admin-beta/entrypoint.mjs`
- `deploy/admin-beta/init-db.sh`
- `deploy/admin-beta/migration-manifest.json`
- `deploy/admin-beta/nginx.conf`
- `deploy/admin-beta/routes.map.conf`
- `deploy/admin-beta/runtime-acl.psql`
- `deploy/admin-beta/verify.mjs`
- `docs/release/admin-beta-isolated/IMPLEMENTATION.md`
- `docs/release/admin-beta-isolated/REPORT.md`
- `docs/release/admin-beta-isolated/RUNBOOK.md`
- `scripts/admin-beta/build-images.sh`
- `scripts/admin-beta/prepare.mjs`
- `scripts/admin-beta/provision.ts`
- `scripts/admin-beta/publish-images.mjs`
- `scripts/admin-beta/render-nginx.ts`
- `scripts/admin-beta/scan-images.mjs`
- `scripts/admin-beta/test-nginx.mjs`
- `src/app/(admin)/admin/layout.tsx`
- `src/app/(admin)/admin/manager/page.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/lib/admin-beta-policy.ts`
- `src/proxy.ts`
- `tests/admin-beta-deployment/deployment.test.ts`
- `tests/admin-beta-deployment/http.test.ts`
- `tests/admin-beta-deployment/policy.test.ts`
- `tests/admin-beta-deployment/run-isolated.mjs`
