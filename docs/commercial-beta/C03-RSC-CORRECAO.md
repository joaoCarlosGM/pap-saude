# C03 — correção dirigida do contrato RSC de produção

Base `6389b8a91dffc8cacabb946a628046a5b90c2348`, branch
`feature/admin-beta-commercial-b1`; CI com falha41253681567.

## Causa comprovada e contrato

Reproduzido com o runner integrado existente e imagens locais do runtime C03.
Em `http-commercial.log`, ANONYMOUS, `/comercial`, HTTP200,
`text/x-component`, `i:false`, Vary sem Next-Url. O helper exigia `true` e falhou
em `rsc-metadata.ts:6:152`, chamado por `http.test.ts:25`:
**expected true / actual false**. O resumo sanitizado e SHA256 do log estão em
`evidence/rsc-production.json`; o corpo e cookies não são versionados.

O campo `i` é **couldBeIntercepted**, não autenticação/MFA. O produtor Next16.4.2
em `node_modules/next/dist/server/app-render/app-render.js` calcula:
`!!process.env.__NEXT_DEV_SERVER || varyHeader.includes(NEXT_URL)`.
No dev, força true pela compilação sob demanda de rotas de interceptação.
Estas rotas de produção não têm interception rewrites: o resultado correto é false.
O teste copiou uma expectativa do protocolo em dev para o runtime de produção.

O helper exige agora **exatamente false**, não ambos os booleanos nem conversão
de tipo. Nenhuma validação de linhas, chaves, referências, árvore, segmentos,
siblings ou ausência de conteúdo privado foi retirada. Testes rejeitam true,
flag ausente/null/string/número, conteúdo privado, linhas extras e segmentos inválidos.
Prefetch200 somente passa com tipo Flight e esquema público fechado. HTML continua
redirecionando os não autorizados; sessão primária em `/comercial` recebe só o aviso
de reautenticação e perfil403. Convite, autenticação, MFA e IAM não foram alterados.

## Evidências e resultados reais

| Execução | Resultado |
|---|---|
| Contratos Commercial/RSC + Admin policy/deployment (`tsx --test` nos quatro arquivos) | PASS15/15; zero skip |
| `node tests/beta1/run-isolated.mjs commercial` | PASS6/6; zero skip |
| `node tests/beta1/run-isolated.mjs commercial-browser` | PASS9/9; zero skip; servidor de produção |
| `node --test tests/vitrine-premium/isolation.test.mjs` | PASS6/6; zero skip |
| `npx next typegen`; `npx tsc --noEmit`; `npm run lint` | PASS |
| Runner Docker original `tests/admin-beta-deployment/run-isolated.mjs ... --commercial` | PASS5 fases: beta/restart/normal/commercial/commercial-readonly |
| HTTP/RSC dos cinco perfis negados | PASS20 respostas; anônimo, sem COMMERCIAL, Admin, Manager, MFA pendente |
| Sessões/MFA reais, ACL/runtime,36 migrations/replay/drift, backup/restore, restart e modo normal | PASS no runner original |
| Todas as20 páginas sintéticas com runtime sem SELECT em patients/organizations/courses | PASS |
| `git diff --check` | PASS pré-commit |
| Builds Docker completos e Trivy locais | BLOCKED/NOT RUN após limites do executor; exigidos no CI final |
| CI do novo commit | NOT RUN antes do push; conferir o SHA exato no resumo final |

Comandos executados: `npx tsx --test tests/commercial-beta/availability.test.ts
 tests/commercial-beta/rsc-metadata.test.ts tests/admin-beta-deployment/policy.test.ts
 tests/admin-beta-deployment/deployment.test.ts`, os comandos da tabela e o runner
Docker com três imagens explícitas e `--commercial`.
Logs privados atuais: `/tmp/pap-commercial-b1/`, runtime Docker final
`/tmp/pap-admin-beta-test-G3wTqS/`, serviços `/tmp/pap-beta1-tests-QynCRJ/`, browser
`/tmp/pap-beta1-tests-nHorNg/`. Fingerprint efetivamente testado: `66a1f8e3f3b6e5035a697166d2a8d7ec005f019af9909ec23d7ac81e2c03ea01`.
O HEAD dos logs ainda mostra a base6389, pois o patch estava sem commit; os hashes
individuais do conteúdo testado estão no JSON e serão conferidos contra o novo commit.

## Limites locais e controles preservados

O executor reiniciou e limpou os primeiros logs em `/tmp`; nenhuma evidência perdida
foi contada como PASS. Checkout restaurado do índice/commit existente, sem reset/clean
ou reimplementação. Node22.23.4 verificado por checksum oficial; dependências congeladas
restauradas somente após perda do cache. Novo Prisma Client gerado em instalação própria,
sem modificar dependências compartilhadas; engine em cache com o mesmo commit verificado.

O Docker local usa **vfs** e o disco raiz32GB esgotou. Builds originais tentados falharam
por DNS do proxy,403 do checksum Prisma e ENOSPC. Não foram ignorados checksums ou
modificados Dockerfiles/workflows. Para a reprodução de runtime, reutilizados os arquivos
compilados do C03, dependências já existentes e migrator com lockfile idêntico. Imagens
exclusivas de diagnóstico foram exportadas/reimportadas em camada única; filesystem,
user, environment, workdir, command e entrypoint foram preservados/verificados.
O volume temporário512MB tem holder próprio para permanecer montado durante o restart;
assim as asserções reais de persistência, backup e restauração continuam executadas.
Imagens de preparação próprias foram descartadas após seu último uso para caber no vfs.
Todos esses adaptadores são locais, fora do repositório. O runner versionado e suas
asserções permanecem intactos. O CI final recompila pelos Dockerfiles originais, usa seu
volume padrão e executa auditorias/Trivy; runtime em cache não substitui esses gates.

Somente recursos descartáveis novos, com UUID/labels e propriedade conferida. Caches,
imagens e dados temporários removidos pertenciam a estas tentativas. Não acessados ou
alterados VPS, Beta existente, laboratório3600/15436, contas, senhas, MFA ou banco/volumes
do operador. Nenhum e-mail externo, imagem publicada, PR, merge ou deploy.

Nenhuma alteração em src, APIs, autorização, IAM, MFA, allowlists Next/Nginx, schema,
migrations, Dockerfiles, CI/CD ou dependências. As fronteiras clínicas/Admin continuam
negadas; o runtime da Vitrine não leu tabelas operacionais. O código continua dependente
do CI integral verde e da homologação humana; não representa GO produção.

## Reprodução padrão em executor descartável com espaço e Docker adequados

```bash
npm ci
DATABASE_URL=postgresql://build_no_connect:unused@127.0.0.1:1/beta_build_only npx prisma generate
DATABASE_URL=postgresql://build_no_connect:unused@127.0.0.1:1/beta_build_only npx next typegen
npx tsc --noEmit
npm run lint
node tests/beta1/run-isolated.mjs commercial
NODE_ENV=production PAP_FIRST_ACCESS_E2E=0 DATABASE_URL=postgresql://build_no_connect:unused@127.0.0.1:1/beta_build_only npm run build
node tests/beta1/run-isolated.mjs commercial-browser
candidate_sha=$(git rev-parse HEAD)
bash scripts/admin-beta/build-images.sh "$candidate_sha"
node tests/admin-beta-deployment/run-isolated.mjs "pap-admin-beta-web:$candidate_sha" "pap-admin-beta-migrator:$candidate_sha" "pap-admin-beta-tools:$candidate_sha" --commercial
```

Não executar contra o laboratório/VPS; os runners criam seus próprios bancos novos.
A compilação exige a configuração de build sem conexão descrita no runbook C03.

## Inventário seletivo

- `tests/commercial-beta/http.test.ts`
- `tests/commercial-beta/rsc-metadata.ts`
- `tests/commercial-beta/rsc-metadata.test.ts`
- `tests/commercial-beta/workspace.spec.ts`
- `docs/commercial-beta/C03-RSC-CORRECAO.md`
- `docs/commercial-beta/evidence/rsc-production.json`
