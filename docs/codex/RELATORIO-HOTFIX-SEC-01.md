# Hotfix SEC-01 — Next.js 16.3.8 → 16.4.2

Data: 2026-10-22T18:02:42.735311+00:00. Branch: `feature/ux-iam-convites-vitrine-email`.
Base obrigatória e HEAD preservado: `c28f76014316a1f2f4c5a1f3ca55e37d0ec4130b`. Árvore inicial limpa, confirmada antes de editar. Nenhum commit/push deste hotfix foi feito.

## Resultado e causa raiz

O CI remoto do Slice B [39822637797](https://github.com/joaoCarlosGM/pap-saude/actions/runs/39822637797) falhou no gate `npm audit --omit=dev --audit-level=high`, antes das regressões, ao reportar Next.js 16.3.8 vulnerável em produção. A versão já estava na base anterior ao B; o B não alterou o lockfile. Os avisos oficiais abaixo cobrem três problemas de segurança; o log daquele gate listava os dois primeiros. A checagem independente deste hotfix inclui os três.

O patch atualiza exclusivamente `next`, `eslint-config-next` e os componentes internos de versão coordenada `@next/*`. As auditorias atuais de produção/migrator e as regressões locais obrigatórias passaram. A auditoria completa ainda falha pelas nove vulnerabilidades altas de desenvolvimento herdadas e aceitas no B; não são escondidas nem confundidas com zero vulnerabilidades em produção.

**Entrega para revisão humana; CI remoto do hotfix: NOT RUN.** O último CI do B continua FAILURE. Sem autorização de commit/push, não há novo SHA remoto para validar. Slice C NÃO INICIADO; permanece bloqueado até SUCCESS do pipeline remoto. Esta evidência local não substitui CI remoto nem autoriza produção.

## Referências oficiais e verificação dos três avisos

| Aviso | Severidade | Problema | Primeira correção 16.x | 16.3.8 / 16.4.2 |
|---|---|---|---|---|
| [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | CRITICAL | RCE não autenticada na otimização de imagens SVG | 16.4.1 | afetada / fora da faixa |
| [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) | HIGH | DoS em Server Actions/App Router | 16.4.1 | afetada / fora da faixa |
| [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | CRITICAL | RCE em funções `use cache` que retornam typed arrays | 16.4.1 | afetada / fora da faixa |

Consultadas as APIs `https://api.github.com/advisories/<GHSA>`. A faixa afetada da linha 16 nos três avisos é `>=16.0.0 <=16.4.0`. Comparação executada com `semver.satisfies`: 16.3.8=true; 16.4.2=false em todos os três. Fontes integrais, timestamps de publicação, avaliação e metadados npm estão em [advisories.json](../evidence/hotfix-sec01/advisories.json). Nenhuma alegação de exploit reproduzido: a comprovação é versão corrigida oficial + auditoria/scans e regressões, sem executar ataques de RCE.

Disponibilidade consultada com `npm view next@16.4.2 version engines peerDependencies dist.integrity --json` e `npm view eslint-config-next@16.4.2 version engines peerDependencies dependencies --json`; consulta ampliada dos mesmos campos armazenada na evidência. Registro oficial: [next](https://registry.npmjs.org/next/16.4.2) e [eslint-config-next](https://registry.npmjs.org/eslint-config-next/16.4.2).

## Compatibilidade, versões e atualização reproduzível

| Componente | Antes (base/lockfile) | Depois instalado |
|---|---|---|
| next | 16.3.8 exata | 16.4.2 exata |
| eslint-config-next | 16.3.8 exata | 16.4.2 exata |
| React / React DOM | 19.2.8 / 19.2.8 | 19.2.8 / 19.2.8 |
| Node local de regressão | 22.23.3 | 22.23.3 |
| npm local / imagem | 11.9.0 / 10.9.9 | mesmas ferramentas |

Next requer Node >=20.9 e aceita React/React DOM ^19.0.0. O config ESLint requer ESLint >=9 e TypeScript >=3.3.1. `npm ls` passou sem conflitos. Os intervalos internos do novo pacote exigem `eslint-plugin-react-hooks ^7.1.0`, `typescript-eslint ^8.56.0`, `sharp ^0.35.5`; o lockfile já tinha respectivamente 7.1.1, 8.70.0 e 0.35.5, preservados. Leitura prévia de AGENTS.md e dos guias locais Next de instalação/upgrade realizada.

Comandos efetivamente executados para alterar e reinstalar:

```bash
npm_config_cache=/tmp/pap-m04-b-verify-cache npm exec --yes --package=node@22.23.3 -- bash -c 'node --version; npm --version; npm install --package-lock-only --save-exact next@16.4.2 eslint-config-next@16.4.2'
npm_config_cache=/tmp/pap-m04-b-verify-cache npm exec --yes --package=node@22.23.3 -- bash -c 'npm ci'
```

O lockfile mantém exatamente o mesmo conjunto de entradas: nenhuma adição/remoção. Só 12 entradas de pacotes mudam versão/integridade/resolução, mais metadados raiz; todas pertencem à família Next. A comparação estrutural verificou igualdade completa das entradas externas a essa família, incluindo React/React DOM. Não houve upgrade indiscriminado, alteração de overrides, instalação com force, `npm audit fix` ou desativação de gates. Migrations, schema Prisma, IAM, autenticação e código clínico estão byte a byte na base aprovada.

## Ambiente descartável e comandos de validação

Regressões executadas por `python3 /tmp/sec01-run.py`, com PATH apontando para Node 22.23.3 e npm cache em `/tmp/pap-m04-b-verify-cache`. `DOCKER_CONFIG=/tmp/pap-m04-b-audit-docker`; `DATABASE_URL=postgresql://pap_user:pap_password@127.0.0.1:5432/pap_saude?schema=public` é exclusivamente o banco sintético deste container descartável. `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`, e-mail desabilitado e credenciais de provider vazias; cada harness cria/remove seu próprio banco de teste.

Antes de criar o container, `docker container inspect pap_saude_db` confirmou que não existia. Criação efetiva:

```bash
docker run --rm -d --name pap_saude_db --label pap.disposable=f0410 --label pap.mission=sec01 -e POSTGRES_USER=pap_user -e POSTGRES_PASSWORD=pap_password -e POSTGRES_DB=pap_saude -p 127.0.0.1:5432:5432 postgres:16-alpine
```

ID criado: `6e0a1fba6c535c1ee12c46e46e7671c41ec67424f91f0061071c7baae70f24fc`. Nenhum bind mount ou volume existente utilizado. Os scripts Docker funcionais criaram suas próprias redes/containers temporários e os removeram por trap. O container principal foi removido após a validação, conferindo ID e rótulo de propriedade. Foram liberados apenas caches de build identificados do repositório na nuvem; nenhum prune global de imagens/volumes foi executado.

Os builds usaram o Dockerfile e imagem base digest-pinned existentes. Para a rede da nuvem, o endereço do proxy foi resolvido em runtime e a CA montada por secret, sem gravar seus conteúdos no repositório. O runner usa `nextjs`; o migrator usa `node`. Confirmação adicional: `docker run --rm --entrypoint node pap-saude:sec01 -p 'require("next/package.json").version'` retornou `16.4.2`.

## Matriz de execução deste hotfix

Quantidades TAP são as reportadas pelo runner; onde há grupos, não representam somente folhas. Não somar totais de suítes sobrepostas como testes únicos. Logs desta execução, normalizados apenas nos espaços ao final de linhas, em [execution.log](../evidence/hotfix-sec01/execution.log); comandos, exit codes, duração, contagens e hashes individuais em [validation.json](../evidence/hotfix-sec01/validation.json).

| Comando efetivamente executado | Resultado | Evidência |
|---|---|---|
| `npm ci` | PASS (exit 0) | 916 pacotes; instalação limpa do lockfile |
| `npm ls next eslint-config-next react react-dom` | PASS (exit 0) | next e eslint-config-next 16.4.2; React/React DOM 19.2.8; sem peers inválidos |
| `npm audit --omit=dev --audit-level=high --json` | PASS (exit 0) | 0 vulnerabilidades |
| `npm audit --prefix docker/migrator --include=dev --audit-level=high --json` | PASS (exit 0) | 0 vulnerabilidades, incluindo dev |
| `npm audit --include=dev --json` | FAIL (exit 1) | 9 HIGH herdadas de desenvolvimento; 0 CRITICAL; nenhuma correção automática |
| `npx prisma generate && npx next typegen` | PASS (exit 0) | Geração de client e tipos de rotas, sem alterar schema/migrations |
| `npx tsc --noEmit` | PASS (exit 0) | Exit 0 |
| `npm run lint` | PASS (exit 0) | Exit 0 |
| `npm run build` | PASS (exit 0) | Next.js 16.4.2; exit 0 |
| `npm run test:mission04:b:browser` | PASS (exit 0) | 28 Node + 5 browser, sem falhas/skips |
| `npm run test:first-access:browser` | PASS (exit 0) | 21 itens TAP (19 casos + 2 grupos) + 15 browser, sem falhas/skips |
| `npm run test:auth` | PASS (exit 0) | 202 itens TAP; sem falhas/skips |
| `npm run test:admin:beta1` | PASS (exit 0) | 29 itens TAP, incluindo grupos; sem falhas/skips |
| `npm run audit:f04:operations` | PASS (exit 0) | 78 itens TAP + gates SQL/esquema + TypeScript/lint/build |
| `npm run test:f03:smart:force` | PASS (exit 0) | 203 itens TAP; 9/9 módulos executados sem cache |
| `docker build --add-host "proxy:$F04_DOCKER_PROXY_IP" --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret "id=build_ca,src=$NODE_EXTRA_CA_CERTS" --target migrator -t pap-saude-migrator:sec01 .` | PASS (exit 0) | Reconstruído, cache válido; mesmo digest esperado, dependências inalteradas |
| `bash scripts/test-f04-migrator-image.sh pap-saude-migrator:sec01` | PASS (exit 0) | Legado, checksum, fresh, idempotência, manutenção e falha SQL real |
| `bash scripts/test-f04-web-image.sh pap-saude:sec01 pap-saude-migrator:sec01` | PASS (exit 0) | Non-root; health/login; acesso DB e gravação de login negado com papel runtime |
| `bash scripts/security/scan-f04-images.sh pap-saude:sec01 pap-saude-migrator:sec01` | PASS (exit 0) | Web e migrator: scanner exit 0, 0 HIGH/CRITICAL |
| `docker build --add-host "proxy:$F04_DOCKER_PROXY_IP" --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret "id=build_ca,src=$NODE_EXTRA_CA_CERTS" --target runner -t pap-saude:sec01 .` | PASS (exit 0) | Imagem web construída com o novo lockfile |
| Comparação dos três GHSA via API + semver | PASS | 3/3 versões fora das faixas afetadas após update |
| git diff --check | PASS | Sem whitespace inválido |
| CI remoto do hotfix | NOT RUN | Commit/push aguardam revisão; CI anterior B: FAILURE |
| Upgrade/homologação da conta e laboratório do operador | NOT RUN | Proibido acessar; regressões usam fixtures sintéticas |
| Deploy, merge e acesso à VPS | NOT RUN | Não autorizados/não realizados |

### Cobertura e limites

- B: projeção privada de organizações, delegação sem escalonamento, MFA/IAM, concorrência, rotas clínicas HTML/RSC/API, upgrade sintético preservando identidade/senha/TOTP e capturas desktop/mobile/dark.
- Primeiro acesso: três papéis, QR/TOTP real no navegador via fixtures, recuperação/novo login, profissional opcional, acessibilidade, sessões expiradas/revogadas, redirecionamento e ausência de loops.
- Docker: migrator bloqueia legado populado sem condição segura, checksum inválido e falha SQL; roda fresh/idempotência. Runner non-root responde health/login e registra tentativa negada usando o papel DB runtime sem credenciais de migração.
- Trivy usa scanner/digest e gate HIGH/CRITICAL originais; ambos retornaram exit 0. É uma fotografia da base de avisos consultada, não garantia sobre futuras vulnerabilidades.
- Os warnings de depreciação do ESLint 9 e de uso concorrente `pg.query` apareceram em ferramentas/testes existentes, sem falha de execução. Não foram corrigidos por estarem fora deste hotfix.
- Capturas e performance regeneradas pelos testes, e a alteração automática de nível do título do bloco Next em AGENTS.md, foram preservadas localmente em `.test-audit/sec01-generated/` e restauradas na árvore rastreada para manter o escopo. Nenhuma instrução do projeto foi removida.

## Riscos residuais

Auditoria completa: **FAIL, 9 HIGH, 0 CRITICAL**. Pacotes: `@next/eslint-plugin-next`, `@shadcn/registry`, `@ts-morph/common`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`, `shadcn`, `ts-morph`. Cadeias de desenvolvimento herdadas, incluindo [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). A atualização coordenada do ESLint config não eliminou essa cadeia. Sem `npm audit fix`, suppressions ou alteração do lockfile para mascará-la. Auditorias completas em [dependency-audits.json](../evidence/hotfix-sec01/dependency-audits.json).

Nenhuma incompatibilidade funcional observada nas regressões executadas. Compatibilidade com o ambiente pessoal do operador não testada por preservação obrigatória. Os limites adversariais/concorrentes previamente documentados na auditoria B continuam; este hotfix não altera os guards, transações ou seu alcance. Não se declara cobertura de todas as combinações de páginas/papéis ou cancelamento retroativo de operações concorrentes.

## Imagens verificadas

- `pap-saude:sec01`: `sha256:a6e88ed33ad75cb119b496567ff8b51aaa044823a45306255637f3f40c052900`, usuário `nextjs`.
- `pap-saude-migrator:sec01`: `sha256:a67cfb42a3a3a0be42440e29baee4942e2216ab306effbaf242d6dac3fcb4adc`, usuário `node`.

## Diff exato de package.json e package-lock.json

```diff
diff --git a/package-lock.json b/package-lock.json
index b7f3181..24fdeb3 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -19,7 +19,7 @@
         "class-variance-authority": "^0.7.1",
         "cn": "^0.2.6",
         "lucide-react": "^1.43.0",
-        "next": "16.3.8",
+        "next": "16.4.2",
         "otpauth": "^9.5.2",
         "pg": "^8.23.0",
         "qrcode": "^1.5.4",
@@ -38,7 +38,7 @@
         "@types/react": "^19",
         "@types/react-dom": "^19",
         "eslint": "^9",
-        "eslint-config-next": "16.3.8",
+        "eslint-config-next": "16.4.2",
         "jsqr": "^1.4.0",
         "pngjs": "^7.0.0",
         "prisma": "^7.10.0",
@@ -2496,15 +2496,15 @@
       }
     },
     "node_modules/@next/env": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/env/-/env-16.3.8.tgz",
-      "integrity": "sha512-Al9zqHVV7TJv0eFuOU4U7Lvv74PTih4Ch63sk2xCIpSTkE3udFnaOcnzP2lQVymiL7yS9Cj2iClUXlR3EQ5sEw==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/env/-/env-16.4.2.tgz",
+      "integrity": "sha512-nTUTFH7G5/J/fmpkjVLegOkqyKOP0CEsJcMsyO4UCYeN1su+YMW/MfaSErnJskL7XM+UDK6aTvslxsRCyya/sA==",
       "license": "MIT"
     },
     "node_modules/@next/eslint-plugin-next": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/eslint-plugin-next/-/eslint-plugin-next-16.3.8.tgz",
-      "integrity": "sha512-eCR9RcLTZrVS+K3+VOhi0xMdUUGNuriCHHhU1ZoABC/QQ/Gp0OWbLKQxV2/9DkmihYdYRcQWFmZXW8M1AMUXYw==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/eslint-plugin-next/-/eslint-plugin-next-16.4.2.tgz",
+      "integrity": "sha512-gCTWlw0e+Y6kajpFyKKgA195jUJCRhlzJE0lV7ufe8a+ghIsANWZ0/FiJwg6DuOG1+OvRbcZDcFBoRh3mNJx0g==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
@@ -2545,9 +2545,9 @@
       }
     },
     "node_modules/@next/swc-darwin-arm64": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-darwin-arm64/-/swc-darwin-arm64-16.3.8.tgz",
-      "integrity": "sha512-2JPRMh2nmQG5CiL7cXGL9AGwnPWJQ//cTtAUCT+w511QHk79SYz3LGv/pc5X643B/WEO0rvu3Yww0hqwt3kgeA==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-darwin-arm64/-/swc-darwin-arm64-16.4.2.tgz",
+      "integrity": "sha512-ONkhFvZNFWlsEHOM/81AtxdyuJP2KRYKYR0JxPwvcu1AuPMMMgcL+wW2luldJvMtZwKtUxoSkCychW5wIeoYSw==",
       "cpu": [
         "arm64"
       ],
@@ -2561,9 +2561,9 @@
       }
     },
     "node_modules/@next/swc-darwin-x64": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-darwin-x64/-/swc-darwin-x64-16.3.8.tgz",
-      "integrity": "sha512-GZtCCOBKJ4leVIT/Th0llWKhD1ca92lzbQiS5R5ON9QkoiFnilFsebDae1JU2a3HWoKMEmEZWGs1AGLavVM72Q==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-darwin-x64/-/swc-darwin-x64-16.4.2.tgz",
+      "integrity": "sha512-luPCMbOsCoaF+kXJEUjmjmOZg1lC3BflhmUu+ZmW4tBu2vW/4AXak8JBFvePizGkxVmNiAw/r9ra+6UviCWtWQ==",
       "cpu": [
         "x64"
       ],
@@ -2577,9 +2577,9 @@
       }
     },
     "node_modules/@next/swc-linux-arm64-gnu": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-gnu/-/swc-linux-arm64-gnu-16.3.8.tgz",
-      "integrity": "sha512-O659ygeQYqneJ1fBKMpFxIFqYkYswu8IAS1OCKK/4f3ZgJJm1dRz4fVJZRi/kLLWjnBKnebOePA4WNv+sV1pVA==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-gnu/-/swc-linux-arm64-gnu-16.4.2.tgz",
+      "integrity": "sha512-xhwFTAncJyaCNy5KqKKuKaIIdCy1/1ZV1s5S1G0hhT7wGMkDTlfJ6aQbfRFnIG/s3/kDrxQ8aycVe+c5QnP8ow==",
       "cpu": [
         "arm64"
       ],
@@ -2593,9 +2593,9 @@
       }
     },
     "node_modules/@next/swc-linux-arm64-musl": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-musl/-/swc-linux-arm64-musl-16.3.8.tgz",
-      "integrity": "sha512-dSjKSyWpzxoO1d3DIZZcP4XJcNaKeLmxQMFOiYl5vuBRMmweIqnAhty8tAmRsvTss779cK1FtYnDMj40e4TQlg==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-musl/-/swc-linux-arm64-musl-16.4.2.tgz",
+      "integrity": "sha512-T1PNmfbPcxr5ndtWUL/3wQtLXsz808lq6sc2GrNT5k2oquF7UyqZddHSuAewHVsWsGXe6nsl9HoN1YNriVjuSg==",
       "cpu": [
         "arm64"
       ],
@@ -2609,9 +2609,9 @@
       }
     },
     "node_modules/@next/swc-linux-x64-gnu": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-gnu/-/swc-linux-x64-gnu-16.3.8.tgz",
-      "integrity": "sha512-lbqOuz3RPRcv+o9msNsJw5x4+Y1ZwPTs6vmL6DCf7i0fZfvng/F59wyeDwqHIvV0mK//RBy/jJkZ+nCKsSMXjQ==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-gnu/-/swc-linux-x64-gnu-16.4.2.tgz",
+      "integrity": "sha512-N9cDUOCGtkJG5PNKDFZUF3xXndrJJcpLp121uAGjIGvO/U2p9tfdNOM9htj7+5f72l0m8rMw/cvYacUJBQoudg==",
       "cpu": [
         "x64"
       ],
@@ -2625,9 +2625,9 @@
       }
     },
     "node_modules/@next/swc-linux-x64-musl": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-musl/-/swc-linux-x64-musl-16.3.8.tgz",
-      "integrity": "sha512-+316WswI8ScVgZeUd+1KGaXkHhaYQzCjvH/05TZSpJ8zBizb1a4G7DtO7F12jcBIqMOtsz9ji1t48fmKtzqsGA==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-musl/-/swc-linux-x64-musl-16.4.2.tgz",
+      "integrity": "sha512-yY2uh1YhX6ufuYy2FCbw1dqblbhI57GLYAJfCkqD9auTv6pLrH67Uccjc3QMKBeCYAG6lkgu08ExmX1bbjejjQ==",
       "cpu": [
         "x64"
       ],
@@ -2641,9 +2641,9 @@
       }
     },
     "node_modules/@next/swc-win32-arm64-msvc": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-win32-arm64-msvc/-/swc-win32-arm64-msvc-16.3.8.tgz",
-      "integrity": "sha512-ji0gd4kMYUxO+1fJBIbiBVRCjzG/lloiyCccnlebvb1ZJ5qXCPZqYg4Jl1DrrixnWNMKylzgpmMWx0yNDYXlzw==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-win32-arm64-msvc/-/swc-win32-arm64-msvc-16.4.2.tgz",
+      "integrity": "sha512-j/ArWRIHpMMB6wYLMhr2puTguBt70lNU/Cmjl9p6dTDE8DGknYJMP9PdwPk2dqpCNL/KIX9yfngDvIesxJPmsg==",
       "cpu": [
         "arm64"
       ],
@@ -2657,9 +2657,9 @@
       }
     },
     "node_modules/@next/swc-win32-x64-msvc": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/@next/swc-win32-x64-msvc/-/swc-win32-x64-msvc-16.3.8.tgz",
-      "integrity": "sha512-WcTlaKt/TWkh5kUjdJcUmB1XgZ+1c6fz4Y9fDHL73YNSdGaUWjceeWrrlwF0nv19iABYWC4iAq1oX1w4Bn0vfg==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/@next/swc-win32-x64-msvc/-/swc-win32-x64-msvc-16.4.2.tgz",
+      "integrity": "sha512-AA4edyWHDko3NCSo0x6GomsdgFb0oR1J3MXU1b5xt6FRFg4AucrMPW3S0hCe/9onU0O1BbpGQBsqo1r0Gneu1g==",
       "cpu": [
         "x64"
       ],
@@ -8315,21 +8315,21 @@
       }
     },
     "node_modules/eslint-config-next": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/eslint-config-next/-/eslint-config-next-16.3.8.tgz",
-      "integrity": "sha512-81vovwMe6NGnoFsl0KUJWzlS+y239i3fdsxs49gSEX3pDQW2cuKy+fxUPXNkQqqx6OCPheYPtBlSufc9aZ0k+w==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/eslint-config-next/-/eslint-config-next-16.4.2.tgz",
+      "integrity": "sha512-P33vjcETMXc+qBjpF77TeJHZLzk6cPcTy8KjpxLucYB3mCIFIORMcZ+cBXcAiIYjE5RM7jyknEEOwMNdnx/ADQ==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
-        "@next/eslint-plugin-next": "16.3.8",
+        "@next/eslint-plugin-next": "16.4.2",
         "eslint-import-resolver-node": "^0.3.6",
         "eslint-import-resolver-typescript": "^3.5.2",
         "eslint-plugin-import": "^2.32.0",
         "eslint-plugin-jsx-a11y": "^6.10.0",
         "eslint-plugin-react": "^7.37.0",
-        "eslint-plugin-react-hooks": "^7.0.0",
+        "eslint-plugin-react-hooks": "^7.1.0",
         "globals": "16.4.0",
-        "typescript-eslint": "^8.46.0"
+        "typescript-eslint": "^8.56.0"
       },
       "peerDependencies": {
         "eslint": ">=9.0.0",
@@ -11285,12 +11285,12 @@
       }
     },
     "node_modules/next": {
-      "version": "16.3.8",
-      "resolved": "https://registry.npmjs.org/next/-/next-16.3.8.tgz",
-      "integrity": "sha512-U7QEZaTini6wKrb8A8hqLLqYQyCetegKjCpJOyxk642vWoMoU1x5PyZCJFvgYgiptA8xc5j/9xYlZFO7w9Sjmw==",
+      "version": "16.4.2",
+      "resolved": "https://registry.npmjs.org/next/-/next-16.4.2.tgz",
+      "integrity": "sha512-r+oBJojfefUjOiWkBhXgLS+igxX/7BWyK59uHnyOyplMSLtBZ+QLP3okrdYTbrfrbrmNTVWLBPaHDX9KRaIt3w==",
       "license": "MIT",
       "dependencies": {
-        "@next/env": "16.3.8",
+        "@next/env": "16.4.2",
         "@swc/helpers": "0.5.23",
         "baseline-browser-mapping": "^2.9.19",
         "caniuse-lite": "^1.0.30001579",
@@ -11304,15 +11304,15 @@
         "node": ">=20.9.0"
       },
       "optionalDependencies": {
-        "@next/swc-darwin-arm64": "16.3.8",
-        "@next/swc-darwin-x64": "16.3.8",
-        "@next/swc-linux-arm64-gnu": "16.3.8",
-        "@next/swc-linux-arm64-musl": "16.3.8",
-        "@next/swc-linux-x64-gnu": "16.3.8",
-        "@next/swc-linux-x64-musl": "16.3.8",
-        "@next/swc-win32-arm64-msvc": "16.3.8",
-        "@next/swc-win32-x64-msvc": "16.3.8",
-        "sharp": "^0.35.4"
+        "@next/swc-darwin-arm64": "16.4.2",
+        "@next/swc-darwin-x64": "16.4.2",
+        "@next/swc-linux-arm64-gnu": "16.4.2",
+        "@next/swc-linux-arm64-musl": "16.4.2",
+        "@next/swc-linux-x64-gnu": "16.4.2",
+        "@next/swc-linux-x64-musl": "16.4.2",
+        "@next/swc-win32-arm64-msvc": "16.4.2",
+        "@next/swc-win32-x64-msvc": "16.4.2",
+        "sharp": "^0.35.5"
       },
       "peerDependencies": {
         "@opentelemetry/api": "^1.1.0",
diff --git a/package.json b/package.json
index eb92b80..7587ddd 100644
--- a/package.json
+++ b/package.json
@@ -97,7 +97,7 @@
     "class-variance-authority": "^0.7.1",
     "cn": "^0.2.6",
     "lucide-react": "^1.43.0",
-    "next": "16.3.8",
+    "next": "16.4.2",
     "otpauth": "^9.5.2",
     "pg": "^8.23.0",
     "qrcode": "^1.5.4",
@@ -116,7 +116,7 @@
     "@types/react": "^19",
     "@types/react-dom": "^19",
     "eslint": "^9",
-    "eslint-config-next": "16.3.8",
+    "eslint-config-next": "16.4.2",
     "jsqr": "^1.4.0",
     "pngjs": "^7.0.0",
     "prisma": "^7.10.0",
```

## Inventário exato para futuro commit seletivo

Nenhum arquivo está em staging. Apenas os dois manifests e este relatório/evidências são entregues. Caminhos:

- `package.json`
- `package-lock.json`
- `docs/codex/RELATORIO-HOTFIX-SEC-01.md`
- `docs/evidence/hotfix-sec01/validation.json`
- `docs/evidence/hotfix-sec01/execution.log`
- `docs/evidence/hotfix-sec01/dependency-audits.json`
- `docs/evidence/hotfix-sec01/advisories.json`

## Preservação e decisão

**Nenhum recurso de `~/projetos/pap-saude-onboarding` foi acessado ou alterado**, incluindo branch de testes, conta PAP_ADMIN, senha, MFA/TOTP, PostgreSQL ou volumes. Não foram executados `local:init`, `local:admin`, resets, migração no banco manual, provisionamento, rotação MFA, merge ou deploy. Bases dos PRs #3, #4 e #5 não alteradas; PR #5 mantido OPEN/draft.

Resultado local: regressões obrigatórias e gates de produção PASS, com risco de desenvolvimento herdado explicitamente FAIL. Pronto para revisão do relatório e decisão humana sobre versionamento. **NO-GO para iniciar C enquanto o CI remoto não for SUCCESS.** Após aprovação do hotfix, será necessário commit/push seletivo e acompanhar uma nova execução do PR #5; não reutilizar o CI do SHA anterior.
