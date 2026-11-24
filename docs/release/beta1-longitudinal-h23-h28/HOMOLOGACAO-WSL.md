# Homologação privada no WSL

Use Node 22.23+ ou 24 compatível, npm, Git, Docker Compose e Chromium. Execute em checkout separado e com um perfil novo do laboratório.

```bash
git clone --single-branch --branch feature/beta1-longitudinal-record-h23-h28-rc \
  https://github.com/joaoCarlosGM/pap-saude.git pap-beta1-h23-h28
cd pap-beta1-h23-h28
git status --short
git rev-parse HEAD
npm ci
umask 077
mkdir -p .local
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action create > .local/h23-review-create.log
export PAP_ID_REVIEW_PROFILE="$(sed -n 's/^PROFILE=//p' .local/h23-review-create.log)"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action status --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_ID_REVIEW_PROFILE"
```

No endereço `PRESENTATION_ONLY`, abra **Configurações → Consulta privada → Autorizar consulta local dos PDFs**. Em **Pacientes**, crie duas gestantes fictícias. Use a paciente A para cadastrar contato e retificação, pedido e resultado, dose, medicações, alergia e condição. Envie um PDF sintético em **Documentos** e vincule-o ao resultado em **Exames**. Registre compromisso e SOAP, atualize as situações e valide origem, histórico e links na **Timeline**. Abra a paciente B e confirme que os registros, resultados e PDFs são independentes.

Salve nova consulta na paciente A com antecedentes omitidos. Reabra a ficha e confira medicações, alergias e datação. Recarregue a página, encerre a fixture com Ctrl+C e reinicie somente o perfil criado acima. Autorize a nova sessão e retome a mesma ficha.

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action stop --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PAP_ID_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_ID_REVIEW_PROFILE"
```

Para repetir a verificação automatizada com o mesmo checkout e perfil, execute em um terminal sem a fixture manual em uso.

```bash
export PAP_CHROMIUM_PATH=/usr/bin/chromium
export PAP_H23_RESUME_FILE="$PWD/.local/h23-browser-resume.json"
export PAP_PROTOCOLS_EVIDENCE="$PWD/.local/h23-evidence"
PAP_H23_RESTART=1 ./node_modules/.bin/tsx --test tests/pap-id/longitudinal.test.mts
node tests/protocols/run-browser.mjs --integrated longitudinal.spec.ts --grep-invert retomada
PAP_H23_VERIFY_RESTART=1 node tests/protocols/run-browser.mjs --integrated longitudinal.spec.ts --grep retomada
npm run lint
```

O build completo usa a configuração de conexão inerte abaixo e depende do motor Prisma para a plataforma.

```bash
export DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/unused
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 NEXT_TELEMETRY_DISABLED=1
./node_modules/.bin/prisma generate
./node_modules/.bin/tsc --noEmit
npm run build -- --webpack
node tests/pap-id/production-boundary.mjs
```

Use os [resultados de aceite](CHECKLIST-RESULTADOS.md) e o [roteiro para aparelho físico](HOMOLOGACAO-MOBILE.md).

Se o download de `binaries.prisma.sh` falhar no WSL, a geração JavaScript oficial da mesma versão permite executar o build sem o download do binário. [Geração alternativa verificada](evidence/geracao-prisma.md)
