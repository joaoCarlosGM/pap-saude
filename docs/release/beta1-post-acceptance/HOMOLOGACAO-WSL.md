# Homologação privada no WSL

Use Git, Node 22.23+ ou 24 compatível, npm e Docker Compose. Abra um terminal sem variáveis de produção. Use somente o laboratório sintético desta candidata.

```bash
cd ~/projetos
git clone --single-branch --branch feature/beta1-post-acceptance-ux-rc \
  https://github.com/joaoCarlosGM/pap-saude.git pap-beta1-post-acceptance
cd pap-beta1-post-acceptance
git status --short
git rev-parse HEAD
npm ci
umask 077
mkdir -p .local
```

Compare o HEAD com o SHA da entrega. Para preparar um laboratório novo, crie o perfil uma vez.

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action create > .local/review-create.log
export PAP_REVIEW_PROFILE="$(sed -n 's/^PROFILE=//p' .local/review-create.log)"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action status --profile "$PAP_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_REVIEW_PROFILE"
```

Para retomar, exporte o caminho absoluto do perfil review já guardado. Use o mesmo diretório de trabalho do perfil. Preserve o arquivo de perfil, a chave e o volume. Ctrl+C encerra a fixture. Ao retomar um container próprio que foi parado, use `start` antes de `serve`.

```bash
export PAP_REVIEW_PROFILE='/caminho/absoluto/do/perfil-review.json'
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PAP_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_REVIEW_PROFILE"
```

Abra o endereço `PRESENTATION_ONLY` impresso pelo launcher e vá a **Configurações → Consulta privada → Autorizar consulta local dos PDFs**. Em **Pacientes → prontuário → Documentos**, emita dois cartões sintéticos. Visualize frente e verso, compare colorido e P&B, imprima em A4 a 100% sem cabeçalhos do navegador e confira os QRs dos arquivos e do papel. Em Registro, confira o fechamento automático a cada leitura, a opção **Adicionar mais carteirinhas** e a conferência explícita de CPF ou RG. Reemita um cartão e confirme que o QR anterior é recusado.

Para executar a suíte no WSL, instale um Chromium compatível e indique seu executável se o caminho padrão não servir.

```bash
export PAP_ID_REVIEW_PROFILE="$PAP_REVIEW_PROFILE"
export PAP_CHROMIUM_PATH=/usr/bin/chromium
node tests/protocols/run-browser.mjs --integrated
```

Guarde resultados brutos em local privado. O roteiro completo está no [checklist de aceite](../beta1-final-local/CHECKLIST-ACEITE-POS-HOMOLOGACAO-2026-11-22.md). Para aparelhos físicos, veja [Homologação mobile](HOMOLOGACAO-MOBILE.md).

Para repetir o gate de build integral em um checkout de teste, use a URL inerte abaixo apenas para a geração e a compilação. O Prisma precisa ter acesso HTTPS a `binaries.prisma.sh` para baixar e verificar seu motor.

```bash
set -e
export DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/unused
export PAP_EMAIL_PROVIDER=disabled PAP_EMAIL_EXTERNAL_ENABLED=0 NEXT_TELEMETRY_DISABLED=1
./node_modules/.bin/prisma generate
./node_modules/.bin/tsc --noEmit
npm run lint
npm run build -- --webpack
node tests/pap-id/production-boundary.mjs
```
