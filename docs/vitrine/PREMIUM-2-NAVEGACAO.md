# Diagnóstico dirigido — navegação Premium 2.0

Base 50dddba43edecc8e669051aadb1129aca5537fb6. Alteração restrita a foco/Escape dos diálogos e orquestração; contratos e conteúdo dos blocos aprovados preservados.

## Evidências e limites

Primeira falha histórica: B, tests/demo/premium.browser.mjs:34:189, de /pacientes para /pacientes/maria-gracas; continuou /pacientes após5000ms. Os logs históricos não capturaram status/console específicos dessa asserção; não é possível atribuir retrospectivamente todos os erros a esse clique. Também registraram Router action dispatched before initialization e Unexpected end of JSON input. Stack: expect.toHaveURL → premium.browser.mjs:34.

Reprodução atual instrumentada: documento200 text/html, destino200 text/x-component, várias requisições repetidas/ERR_ABORTED no Webpack. Sem pageerror nessa reprodução. Dono original da3400: PID188799, next-server16.3.4, cwd /tmp/pap-prod-vitrine, comando next dev --webpack. Identificado fora do namespace isolado do sandbox, onde ss não mostrava PID. Nenhum processo de outro laboratório foi encerrado. Reinício real do servidor exclusivo e cache dev novo preservado não resolveram o comportamento Webpack.

Experimentos reversíveis: retirar onClickCapture e retirar key de PageMotion, separadamente, não eliminaram requisições repetidas. Ambos revertidos; sem prova para alterar a navegação da aplicação. Nenhum timeout/assert alterado. No mesmo código, usando compilador padrão Turbopack, a reprodução teve uma única resposta RSC200 e navegação concluída. Isto demonstra diferença operacional local entre compiladores; não identifica uma linha interna do Next como causa raiz nem comprova defeito upstream universal.

B/D/E/F passaram individualmente no Turbopack. Primeira execução conjunta: B/D/E passaram, F falhou ao fechar com Escape após reabertura. Três repetições isoladas F passaram; diagnóstico com espera de leitura de foco e duas conjuntas passou4/4 cada, mas essa espera pode alterar timing. Não usar esses dois últimos resultados como prova de correção da intermitência. Captura final é passiva no keydown, sem espera antes de Escape; resultados registrados no checkpoint.

## Orquestração

Novo tests/demo/run-browser.mjs: URL somente loopback, lock exclusivo por porta, teste de saúde HTTP200, arquivos de navegador sequenciais, --test-concurrency=1, propaga falha, libera lock em finally. Não inicia/encerra servidor, não usa APIs clínicas, banco ou P0. Recusa URL externa e segundo runner concorrente: PASS. Não apaga lock de outro processo. Invocações diretas de node --test devem ser evitadas enquanto o runner possui lock.

WSL, em cópia separada desta feature com dependências já instaladas:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3400
```

Não adicionar --webpack para esta homologação. Se3400 estiver ocupada, identificar PID/cwd antes de iniciar ou encerrar algo. Não alterar3200/3300.

Em outro terminal, com Playwright disponível no ambiente:

```bash
node tests/demo/run-browser.mjs --navigation
```

PAP_PLAYWRIGHT_MODULE pode apontar à instalação existente de @playwright/test; PAP_CHROMIUM ao Chromium instalado. Não reinstalar dependências por padrão. No ambiente de execução os caminhos foram /tmp/pap-full-deps/node_modules/@playwright/test e /usr/bin/chromium.

MEOWS/UI e fechamento visual/build permanecem pendentes; este documento não aprova candidato completo, P0 ou produção. Nenhuma alteração em bancos, Prisma, MFA, credenciais, CI/CD, VPS, prod ou laboratórios do operador.

## Correção comprovada de foco

Captura passiva no keydown da execução navigation-final-1: primeiro mobile inside=true/BUTTON; segundo inside=false/BODY; Escape não removeu tutorial. Leitura não introduz await antes da tecla. Correção: GuidedTour toma foco em layout effect; Modal só restaura foco para elemento conectado/visível e sem roubar de outro diálogo; Escape também é tratado em capture enquanto tutorial está aberto. Nenhuma asserção removida, nem espera adicional antes da tecla.
