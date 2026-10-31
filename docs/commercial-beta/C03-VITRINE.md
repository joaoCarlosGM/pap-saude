# C03 — Vitrine Premium com disponibilidade finita na Beta

## Implementação e contratos

Reutilizada a implementação existente de `/vitrine` e `src/features/vitrine-premium`:
Dashboard, Registro de cinco etapas, Atendimentos, Pacientes sintéticos, Chat IA simulado,
Protocolos, Ferramentas, Cursos, player demonstrativo e Configurações. Estado e progresso
continuam em memória; restauração confirma e repõe somente a demonstração. Não houve
porte de fixtures para módulos operacionais, alteração de regras clínicas ou ativação de
MEOWS assistencial. Motor demonstrativo e avisos de não homologação foram preservados.

A única alteração interna na UI Premium é remover o aria-label que substituía o texto
visível do botão do perfil sintético. O nome acessível passa a vir do próprio conteúdo,
com title descritivo. Axe havia reproduzido `label-content-name-mismatch`; corrigido sem
suprimir a regra e comprovado na repetição da jornada.

`PAP_ADMIN_BETA_ONLY=1` + `PAP_BETA_COMMERCIAL_ENABLED=1` libera apenas GET/HEAD:

- `/comercial`, `/vitrine` e as dez seções declaradas em `PREMIUM_SECTIONS`;
- pacientes `maria-gracas`, `fernanda-costa`, `juliana-pereira` ou IDs em memória
  `demo-patient-[1-9][0-9]{0,5}`; identificador sintético não cria registro no banco;
- aulas dos seis IDs explícitos de `BETA_DEMO_COURSE_IDS`.

Não existe liberação por prefixo genérico. IDs operacionais/UUIDs, sufixos desconhecidos,
métodos de escrita, `/dashboard`, `/pacientes`, `/registro`, APIs clínicas, LMS e antigas
`/api/vitrine/*` continuam indisponíveis na Beta (404). APIs Admin existentes permanecem
na política externa, mas seus guards negam COMMERCIAL (403). Acesso sem sessão/perfil
é redirecionado pelo servidor; MFA primário mostra apenas aviso em `/comercial` e não
monta o workspace; demais páginas protegidas conduzem à reautenticação existente.

Next e Nginx usam o mesmo catálogo. Corrigidas duas divergências preexistentes por
restrição do mapa externo: AVIF de diretórios públicos não aceito pelo Next e pontos
não escapados em ícones. AVIF de `/_next/static` permanece permitido. `/api/health`
continua apenas interno; webhook conserva exceção externa sujeita ao opt-in e assinatura.
Não houve ampliação de autorização IAM ou de APIs.

## Evidências locais efetivamente executadas

| Comando / verificação | Resultado |
|---|---|
| `npx tsx --test tests/commercial-beta/availability.test.ts tests/commercial-beta/rsc-metadata.test.ts tests/admin-beta-deployment/policy.test.ts tests/admin-beta-deployment/deployment.test.ts` | PASS 14/14; zero skip |
| `node --test tests/vitrine-premium/*.test.mjs` | PASS 83/83; zero skip, inclui motor MEOWS demonstrativo |
| `node --test tests/vitrine-premium/isolation.test.mjs` após ajuste de rótulo | PASS 6/6; controles clínicos/auth/IAM/migrations preservados |
| `node tests/beta1/run-isolated.mjs commercial-browser` | PASS 8/8 em servidor de produção, Chromium serial, zero skip |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `NODE_ENV=production PAP_FIRST_ACCESS_E2E=0 DATABASE_URL=postgresql://build_no_connect:unused@127.0.0.1:1/commercial_build_only npm run build` | PASS real; sem conexão ao banco |
| `node scripts/admin-beta/test-nginx.mjs` e `--commercial` | PASS ambos; containers sem rede/portas do host |
| `node --check tests/admin-beta-deployment/run-isolated.mjs` e `tests/beta1/run-isolated.mjs` | PASS |
| `git diff --check` | PASS pré-versionamento |
| Novas fases HTTP/RSC/read-only dentro das imagens finais e Trivy | NOT RUN local; execução exigida no CI final |

Logs completos privados em `/tmp/pap-commercial-b1/`; browser final em
`/tmp/pap-beta1-tests-mjUb0c/`. Nenhum log cru, segredo ou dump é versionado.
Capturas inspecionadas: `evidence/showcase-1440-light.png` e `showcase-375-dark.png`,
mais as três capturas de workspace C02. Somente dados sintéticos; nenhum código MFA.
Fingerprint de código/testes/config/evidências C03: `4b11e74b5a248db4fa8bd84e62b9f41eabd773fcedf74269f58bbf616749bae9`.
Manifesto privado: `/tmp/pap-commercial-b1/c03-fingerprint.json` (documentos excluídos).

O browser comprova: identidade/perfil persistido e auditado, notificações reais próprias,
anti-IDOR/CSRF via serviços; logout, CAPTCHA e desafio MFA reais; negação sem MFA;
desktop1440/mobile320/tablet768, modo escuro, teclado/foco, Axe WCAG2/2.1AA e zero
pageerror. Na Vitrine: nove módulos, aula, Chat simulado, seis passos de tutorial mobile,
registro incompleto sem score normal falso, prontuário criado só em memória, Dashboard
3→4→3 e restauração. Interceptação registra zero chamadas `/api/*` nas interações
sintéticas; contagem real de patients/encounters e fingerprint da identidade inalterados.

## Falhas reproduzidas e correções específicas

O CI C02 41250417287 falhou na injeção de503 do teste de retry: somente a primeira
requisição falhava e StrictMode podia cancelar essa requisição. Agora a falha permanece
até o botão ficar visível, depois a resposta real é liberada. Nenhuma asserção retirada.

O teste novo de navegação falhou em Next dev: manifests de hot-update JSON recebiam404
pela allowlist fechada da Beta, abortando navegação RSC. Cookie e credencial privada
estavam presentes e as respostas RSC eram200. O runner Comercial passou a usar build
standalone real; nenhuma exceção dev/HMR foi acrescentada à política de produção.
O runner Beta1 original permanece inalterado em seu modo browser. CI constrói o
standalone antes dos oito testes. As capturas acima provêm dessa execução real.

## CI, preservação e limites

O workflow novo `.github/workflows/admin-beta-commercial.yml` executa somente nesta
feature, `contents:read`, sem publicação, login no registry ou deploy. Conserva auditorias,
Admin Beta HTTP/MFA/IAM,36 migrations, ACL, backup/restore, restart, modo normal,
builds web/migrator/tools e Trivy HIGH/CRITICAL. Acrescenta Commercial opt-in e um
runtime de leitura exclusivamente IAM sem SELECT em organizations/patients/courses:
todas as páginas sintéticas precisam continuar200. RSC público só é aceito se for
metadado de transporte validado por contrato fechado, sem conteúdo privado adicional.
O resultado remoto do SHA C03 deverá ser consultado no workflow e no resumo final;
resultados anteriores não substituem esse gate. CI C01 41249363986 foi SUCCESS.

Nenhuma alteração de schema, migration, runtime ACL, autenticação, MFA, IAM, API clínica,
KPIs, lockfile, Dockerfile ou workflows de publicação/deploy. Nenhuma consulta à VPS,
Beta implantada, laboratórios/bancos/volumes/contas/MFA do operador, nenhum e-mail
externo, imagem publicada, PR, merge ou deploy. Somente recursos descartáveis próprios
com UUID/labels, portas efêmeras e limpeza conferida por ownership foram utilizados.
Homologação humana e futura ativação opt-in permanecem pendentes; não é GO produção.

## Inventário seletivo C03

- `.github/workflows/admin-beta-commercial.yml`
- `deploy/admin-beta/routes.commercial.map.conf`
- `deploy/admin-beta/routes.map.conf`
- `docs/commercial-beta/C03-VITRINE.md`
- `docs/commercial-beta/HOMOLOGACAO.md`
- `docs/commercial-beta/evidence/showcase-1440-light.png`
- `docs/commercial-beta/evidence/showcase-375-dark.png`
- `scripts/admin-beta/render-nginx.ts`
- `src/features/vitrine-premium/components/layout/Sidebar.tsx`
- `src/lib/beta-commercial-availability.ts`
- `tests/admin-beta-deployment/run-isolated.mjs`
- `tests/beta1/run-isolated.mjs`
- `tests/commercial-beta/availability.test.ts`
- `tests/commercial-beta/http.test.ts`
- `tests/commercial-beta/playwright.config.ts`
- `tests/commercial-beta/rsc-metadata.test.ts`
- `tests/commercial-beta/rsc-metadata.ts`
- `tests/commercial-beta/safe-reporter.ts`
- `tests/commercial-beta/showcase.spec.ts`
- `tests/commercial-beta/workspace.spec.ts`

## Bloqueio externo de publicação no fechamento

A conferência remota nesta sessão falhou: `git ls-remote` exige autenticação e
`gh auth status` identificou o GH_TOKEN fornecido ao executor como inválido.
Nenhum valor de token foi exibido ou persistido. O push e CI do SHA C03 ficam
BLOCKED até restabelecer a integração GitHub do executor; não substituir por CI
antigo nem publicar imagens. Alterações locais validadas são preservadas em commit.
