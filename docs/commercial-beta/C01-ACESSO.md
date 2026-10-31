# C01 — acesso Comercial na Beta

Base da missão: `2c8b5134942293e7bd1795084469270a6da2bb90`.
C00: `9318247` — inventário e contratos, publicado na feature.

## Implementação

- `PAP_BETA_COMMERCIAL_ENABLED=1` habilita GET/HEAD de `/comercial` quando o modo
  Admin Beta está ativo. Sem opt-in, a disponibilidade original é preservada.
- A allowlist de disponibilidade não autentica usuários: o serviço existente exige
  sessão válida, fator ativo/MFA verificado e concessão system GLOBAL COMMERCIAL
  com `commercial.read`. Admin e Manager não recebem acesso Comercial implícito.
- Autenticação, destinos, primeiro acesso, sessão, IAM e MFA existentes foram reutilizados
  sem alteração. Sessão primária é encaminhada a primeiros passos; logout retorna204
  e invalida a sessão. A página pode mostrar aviso de reautenticação sem dados protegidos.
- Mapas default e opt-in são gerados do mesmo catálogo; mapa expandido é
  `deploy/admin-beta/routes.commercial.map.conf`. Por enquanto somente `/comercial`
  é acrescentado; C03 inclui os módulos sintéticos finitos. Não há prefixo livre.
- Compose/prepare deixam opt-in0. Prepare continua recusando diretório existente,
  sem rotação de segredos ou reprovisionamento. Nenhum arquivo da VPS foi tocado.
- CI novo `admin-beta-commercial.yml`: contents:read, sem packages:write, registry
  login, push de imagem ou deploy. Reutiliza testes/builds/scanners locais ao runner.
  O workflow original de publicação permanece inalterado e não dispara nesta branch.

## Validação real

| Comando/verificação | Resultado | Evidência privada |
|---|---|---|
| `tsx --test tests/commercial-beta/availability.test.ts tests/admin-beta-deployment/policy.test.ts tests/admin-beta-deployment/deployment.test.ts` | PASS9/9, zero skip | `/tmp/pap-commercial-b1/c01-availability.log` |
| `node tests/beta1/run-isolated.mjs commercial` | PASS4/4, zero skip | `/tmp/pap-beta1-tests-WaqEn1/commercial.log` |
| `npx tsc --noEmit` | PASS | `/tmp/pap-commercial-b1/c01-typescript-final.log` |
| ESLint dos arquivos alterados | PASS | `/tmp/pap-commercial-b1/c01-lint.log` |
| `node scripts/admin-beta/test-nginx.mjs --commercial` | PASS em container/networknone, sem portas | `/tmp/pap-commercial-b1/c01-nginx.log` |
| `git diff --check` | PASS | conferência pré-commit |
| Browser e build da feature | NOT RUN local nesta etapa | C02/C03 e CI |

Os testes usam inscrição/verificação MFA reais dos helpers existentes. Comprovam:
sem sessão401; MFA pendente/revogado403; scoped grant e ausência de commercial.read
negados; Admin/Manager sem concessão Comercial negados; APIs clínicas/Admin403;
destino `/comercial` sem alteração de senha/fator/sessão/progresso; logout sem loop.
A primeira execução dos testes novos teve duas expectativas incorretas de fixture:
status de revogação exige revokedAt, e logout usa204. Corrigidas somente as fixtures,
sem reduzir restrições de banco ou mudar os serviços.

Fingerprint do conjunto de código/testes/configuração executado:
`d5074a4664d86d764addd782627c86256bcae2660c7daf19ccd4512738a6f372`.
Manifesto privado: `/tmp/pap-commercial-b1/c01-fingerprint.json`.

## Arquivos seletivos C01

- `.github/workflows/admin-beta-commercial.yml`
- `deploy/admin-beta/compose.yml`
- `deploy/admin-beta/routes.commercial.map.conf`
- `scripts/admin-beta/prepare.mjs`
- `scripts/admin-beta/render-nginx.ts`
- `scripts/admin-beta/test-nginx.mjs`
- `src/lib/admin-beta-policy.ts`
- `src/lib/beta-commercial-availability.ts`
- `src/proxy.ts`
- `tests/beta1/run-isolated.mjs`
- `tests/commercial-beta/availability.test.ts`
- `tests/commercial-beta/access.test.ts`
- `docs/commercial-beta/C01-ACESSO.md`

Não ativar na VPS nesta missão. O opt-in e a troca do mapa exigem futura homologação
manual, com código novo validado. Ainda faltam C02/C03; não considerar release aprovado.
