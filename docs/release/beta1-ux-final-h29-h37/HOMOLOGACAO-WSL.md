# Homologação privada no WSL

Use Node e Chromium compatíveis, Git e Docker Compose. Crie um checkout e um perfil sintético separados.

```bash
git clone --single-branch -b feature/beta1-ux-final-h29-h37-rc \
  https://github.com/joaoCarlosGM/pap-saude.git pap-beta1-h29-h37
cd pap-beta1-h29-h37
git status --short
git rev-parse HEAD
npm ci
umask 077
mkdir -p .local
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action create > .local/h29-review.log
export PAP_ID_REVIEW_PROFILE="$(sed -n 's/^PROFILE=//p' .local/h29-review.log)"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action status --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_ID_REVIEW_PROFILE"
```

Abra o endereço `PRESENTATION_ONLY`. Em **Configurações → Consulta privada**, autorize a sessão. Cadastre uma gestante sintética e confira a PAP-Gest em primeira posição em **Documentos**. Abra frente, verso e exportações. Anexe um PDF sintético pelo modal e vincule-o ao resultado em **Exames**. Abra do prontuário as abas **Documentos** para cadastro e **Obs. Anteriores** para antecedentes.

No Registro, alterne edema graduado e ausente. Salve uma nota SOAP e confira a identidade sintética em Evolução. Registre duas avaliações completas e uma incompleta e compare o score, as datas e os pontos no Resumo. Agende consulta, exame e vacinação, selecione a data no calendário e confira o modal contextual da Agenda. Visite decisões e caminhos alternativos dos três fluxogramas e compare com a figura autorizada.

Para confirmar persistência, encerre a fixture com Ctrl+C, pare e inicie exclusivamente o perfil criado acima e abra a mesma ficha em uma nova sessão.

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action stop --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_ID_REVIEW_PROFILE"
```

Testes automatizados com o mesmo perfil sintético, sem outras suítes usando-o durante o reinício de banco.

```bash
export PAP_CHROMIUM_PATH=/usr/bin/chromium
export PAP_PROTOCOLS_EVIDENCE="$PWD/.local/h29-evidence"
export PAP_H23_RESUME_FILE="$PWD/.local/h29-resume.json"
node --import ./tests/protocols/load.mjs --test tests/vitrine-premium/*.test.mjs tests/protocols/*.test.mjs tests/pap-id/*.test.mjs
PAP_H23_RESTART=1 ./node_modules/.bin/tsx --test --test-concurrency=1 tests/pap-id/{longitudinal,database,final-registry,private-session,mobile-edge,card-exports,restart}.test.mts
node tests/protocols/run-browser.mjs --integrated --grep-invert 'retomada da mesma ficha' --timeout 180000
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action stop --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PAP_ID_REVIEW_PROFILE"
PAP_H23_VERIFY_RESTART=1 node tests/protocols/run-browser.mjs --integrated longitudinal.spec.ts --grep 'retomada da mesma ficha' --timeout 180000
```

O build usa uma URL de conexão inerte. Se a CLI não conseguir baixar o motor, consulte o [procedimento oficial de geração JavaScript verificado no laboratório](../beta1-longitudinal-h23-h28/evidence/geracao-prisma.md).

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
