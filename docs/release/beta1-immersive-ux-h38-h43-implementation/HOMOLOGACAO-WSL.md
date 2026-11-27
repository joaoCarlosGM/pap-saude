# Homologação em WSL

Use Node, Docker Compose e Chromium locais. Crie checkout e perfil sintético exclusivos.

```bash
git clone --single-branch -b feature/beta1-immersive-ux-h38-h43-rc \
  https://github.com/joaoCarlosGM/pap-saude.git pap-beta1-h38-h43
cd pap-beta1-h38-h43
git status --short
git rev-parse HEAD
npm ci
umask 077
mkdir -p .local
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action create > .local/ux04-review.log
export PAP_ID_REVIEW_PROFILE="$(sed -n 's/^PROFILE=//p' .local/ux04-review.log)"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_ID_REVIEW_PROFILE"
```

Abra `PRESENTATION_ONLY`. Percorra as três fichas do cenário e confira, com a sessão privada desautorizada, MEOWS, calendário, anexos ilustrativos e frente/verso da PAP-Gest de apresentação. Depois autorize a consulta privada em **Configurações**, cadastre outra paciente sintética, selecione a fonte da datação, preencha as etapas 2–4 e confirme os dados, autor e data no Resultado e Evolução. Confira a agenda e os três fluxogramas. Use **Ver completo**, **Reiniciar**, zoom e painel de recorte. Compare cada recorte com a figura acessível na mesma aba.

Pare a fixture com Ctrl+C. Para testar atualização e reinício, inicie o mesmo perfil em uma nova fixture com os comandos abaixo e reabra a ficha privada em nova sessão.

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action stop --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_ID_REVIEW_PROFILE"
```

Para executar as verificações, encerre o servidor de homologação do checkout e mantenha o perfil próprio selecionado.

```bash
export PAP_CHROMIUM_PATH=/usr/bin/chromium
export PAP_PROTOCOLS_EVIDENCE="$PWD/.local/ux04-evidence"
export PAP_H23_RESUME_FILE="$PWD/.local/ux04-resume.json"
node --import ./tests/protocols/load.mjs --test tests/vitrine-premium/*.test.mjs tests/protocols/*.test.mjs tests/pap-id/*.test.mjs
PAP_H23_RESTART=1 ./node_modules/.bin/tsx --test --test-concurrency=1 tests/pap-id/{longitudinal,database,final-registry,private-session,mobile-edge,card-exports,restart}.test.mts
node tests/protocols/run-browser.mjs --integrated --grep-invert 'retomada da mesma ficha' --timeout 180000
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action stop --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PAP_ID_REVIEW_PROFILE"
PAP_H23_VERIFY_RESTART=1 node tests/protocols/run-browser.mjs --integrated longitudinal.spec.ts --grep 'retomada da mesma ficha' --timeout 180000
```

A validação do build usa uma URL de banco inerte. Se o download do motor da CLI Prisma falhar, use o [procedimento registrado H23–H28](../beta1-longitudinal-h23-h28/evidence/geracao-prisma.md).

```bash
export DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/unused
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 NEXT_TELEMETRY_DISABLED=1
./node_modules/.bin/prisma generate
./node_modules/.bin/tsc --noEmit
npm run lint
npm run build -- --webpack
node tests/pap-id/production-boundary.mjs
node scripts/security/guard-sql-injection.mjs
```
