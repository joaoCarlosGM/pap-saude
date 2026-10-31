# C02 — Workspace Comercial Premium

C00 `9318247`; C01 `4e2371a`.
CI C01: https://github.com/joaoCarlosGM/pap-saude/actions/runs/41249363986 — **SUCCESS**,
incluindo build real das três imagens, integração Admin Beta preservada e Trivy.
Esse resultado não substitui a validação do código novo C02/C03.

## Entrega funcional

Reutilizados CommercialWorkspace, ThemeToggle, NotificationInbox, editor OwnProfileSettings
e APIs existentes. A área apresenta o usuário real autenticado, roteiro e aviso de uso
seguro, acesso à Vitrine, perfil persistente e notificações reais da própria identidade.
Não há métricas, leads ou propostas fictícias apresentados como dados comerciais.

O nome é salvo pelo serviço existente com auditoria. E-mail/papéis/vínculos são somente
leitura; o componente compartilhado conserva o comportamento padrão e apenas aceita
h2 na composição Comercial. Falha de transporte oferece feedback/retry. A lista permite
marcar somente a própria notificação como lida. Senha/MFA/sessões usam a área existente.

Sidebar com ícones, menu mobile sobreposto, fundo inert, foco contido/restaurado, Escape,
rolagem própria, reduced motion, skip link, tema claro/escuro e logout com estado ocupado.
O link redundante ao login foi substituído por Meu perfil. Nenhum serviço IAM/MFA mudou.
CTA Vitrine aponta o Premium já existente; sua disponibilidade Beta é concluída em C03.

## Testes realmente executados

| Verificação | Resultado | Evidência privada |
|---|---|---|
| `node tests/beta1/run-isolated.mjs commercial` | PASS6/6, zero skip | `/tmp/pap-beta1-tests-SKqXG3/commercial.log` |
| `node tests/beta1/run-isolated.mjs commercial-browser` | PASS5/5, zero skip | `/tmp/pap-beta1-tests-ydf5h6/commercial-browser.log` |
| `node --test tests/vitrine-premium/isolation.test.mjs` | PASS6/6, zero skip | `/tmp/pap-commercial-b1/c02-isolation.log` |
| `npx tsc --noEmit`, após o browser encerrar | PASS | `/tmp/pap-commercial-b1/c02-typescript-serial.log` |
| ESLint dos arquivos TS/TSX/MJS alterados | PASS | `/tmp/pap-commercial-b1/c02-lint.log` |
| `git diff --check` | PASS | pré-commit |
| Build/CI do código C02 | NOT RUN nesta validação local | workflow da feature após push |

Browser confirma perfil salvo, notificação lida, logout204, dark mode, 320/768/1440px,
sem overflow, foco/teclado, zero violações WCAG A/AA verificadas por axe, nenhum pageerror,
MFA pendente sem workspace, login com CAPTCHA/desafio de recuperação reais, ausência de
loops e retry após503. Contas/fatores são sintéticos criados por serviços reais, sem
falsificar mfaVerifiedAt. Web usa papel PostgreSQL runtime; fixtures usam owner isolado.
Testes de serviços confirmam anti-IDOR, CSRF e impossibilidade de alterar papéis/vínculos.

Falhas corrigidas apenas nos testes novos: enum/slot da fixture de convite, cwd do
webServer e diagnóstico sanitizado de setup. Uma checagem TS concorrente com Next dev
teve corrida em tipos gerados; repetida serialmente com PASS, sem desativar verificações.
Não foram modificados constraints, migrations, autenticação ou credenciais para obter PASS.

## Evidências visuais e inventário

Capturas em `docs/commercial-beta/evidence/`: `commercial-1440-dark.png`,
`commercial-320-light.png`, `commercial-768-light.png`. Inspecionadas: nomes/e-mails
mascarados, apenas identidade sintética, sem senha/token/QR/código MFA.

Fingerprint do conjunto: `a8bf1857787d94fdeead62d74458425fdae9cb04398857b2a7a916e0764b1338`;
manifesto privado `/tmp/pap-commercial-b1/c02-fingerprint.json`.

Arquivos seletivos C02:

- `.github/workflows/admin-beta-commercial.yml`
- `src/components/commercial/CommercialWorkspace.tsx`
- `src/components/commercial/CommercialProfile.tsx`
- `src/components/commercial/commercial-workspace.css`
- `src/components/configuracoes/OwnProfileSettings.tsx`
- `tests/beta1/run-isolated.mjs`
- `tests/commercial-beta/account.test.ts`
- `tests/commercial-beta/fixtures.ts`
- `tests/commercial-beta/playwright.config.ts`
- `tests/commercial-beta/safe-reporter.ts`
- `tests/commercial-beta/workspace.spec.ts`
- `docs/commercial-beta/evidence/commercial-1440-dark.png`
- `docs/commercial-beta/evidence/commercial-320-light.png`
- `docs/commercial-beta/evidence/commercial-768-light.png`
- `docs/commercial-beta/C02-WORKSPACE.md`

Nenhum acesso à VPS/Beta/banco do operador, publicação de imagem ou deploy. Restam C03,
CI integral do SHA final e homologação humana antes de qualquer ativação.
