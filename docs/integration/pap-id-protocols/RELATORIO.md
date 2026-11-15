# Candidata PAP-ID + PAP-Protocols — relatório de entrega

Branch: `feature/beta1-pap-id-protocols-integrated-rc`.
Base remota de Protocolos: `ed474092a6e60794ac65077ffc37852685aaa588`.
Código validado: `353328152f73bbab74f88e274f3c3a147411cb1a`.
PAP-ID: porte seletivo dos13 documentos/imagens de `ae2a5b941a3cb69fd67da1cd0c2648074c55cb27`;
normalizada apenas a linha vazia final dos Markdown. Nenhum merge/cherry-pick de código.
Nove referências Protocolos mantêm os hashes já inspecionados; seis PNGs PAP-ID conferidos.

**GO técnico somente para executar homologação demonstrativa local privada.**
Aceite visual/funcional do operador ainda PENDING. **NO-GO para publicação/produção clínica.**
Commit documental final encontra-se no histórico da branch; não há hash circular neste relatório.

## Implementação funcional e escopo

- Emissor real `npm run pap-id:demo -- --create-patient --issue-card`: PNG com QR CSPRNG256bit
  opaco, prefixo exclusivo de teste e nenhuma identidade/CNS/CPF/dado clínico no payload.
  Paciente integralmente sintética, identificador UUID, CPF numericamente inválido por construção
  e RG `DEMO-`. Manifesto local reimportável contém hashes/validade/revogação, não o token bruto.
  Diretório novo700/arquivos600, ownership marker e lock; ledger tem troca atômica de arquivo.
  Expirar/revogar/reemitir preserva identidade; reemissão invalida tokens anteriores.
- Registro reutiliza Wizard/Stepper, Input/Button, DemoProvider e prontuário existentes.
  Cinco etapas preservadas. Dentro da primeira: manual, CPF, QR, encontrada, documento
  divergente, não encontrada, credencial inválida, confirmada, resumo e ações independentes.
  Máscara CPF, RG com UF/emissor fictícios, confirmação de contexto, foco nos estados e erros
  acessíveis. Leitura PNG real via jsQR; código digitável. Nenhuma câmera/serviço externo.
- Antes da conferência não há resumo ou link de prontuário. Após a conferência local, dados
  são sintéticos; QR/documento/checkbox NÃO concedem autorização clínica real/PAP-Link.
  Registro da identidade é idempotente em memória e não cria atendimento. Salvar continua no
  fim do wizard. Repetição não duplica paciente; alterações de base/contexto invalidam o fluxo.
  Resumo trata DPP/IG/queixa/alergia/MEOWS ausentes honestamente e não reutiliza score ilustrativo
  como avaliação verificável. Reset/reload descartam estado da Vitrine, não dados de banco.
- P1 preservado: três protocolos, pesquisa/filtros, renderer genérico e quatro abas.
  Links de origem incluem seção, página digital, página impressa e versão. Índice extraído só
  de cabeçalhos conferidos; nenhum medicamento/dose/limiar/intervenção foi convertido em regra.
  Fluxo/checklist interativos continuam documentais; o fluxo clínico original é consultado no
  PDF. Catálogo aceita novos dados sem um componente React específico por documento.
- Leitor PDF.js6.5.438 local, sem CDN: bytes reais, páginas anterior/próxima/número/total,
  zoom, canvas, texto extraído acessível, Abrir em nova aba e download no leitor/card.
  Não monta annotation layer/scripts/XFA. Toda entrega verifica assinatura, tamanho e SHA-256;
  inline/attachment, application/pdf, Content-Length, no-store, nosniff e proteção de origem.
- Cursos/Chat permanecem Em breve, sem href/handlers/tabstops; páginas/player demo antigos
  indisponíveis. LMS operacional e APIs clínicas não foram alterados.

## PDFs, direitos e procedência

| Original imutável | Bytes | Páginas digitais | SHA-256 |
|---|---:|---:|---|
| sindromes-hipertensivas-gestacao.pdf | 848633 | 25 | 63a0dc9b93bc3be45632bcf46649c92d7118884135ac2ff8a95aa565830804d1 |
| hemorragia-pos-parto.pdf | 1102253 | 34 | f48c79881152eae50e25ebaf8d354f1219db7c8dd9d5c41b8cfb8ff2360337d2 |
| sepse-obstetrica.pdf | 3060688 | 36 | 5d4e5756b397ade0adc829cca8336eec86db14e955c22a528fa533a9a75f093b |

Bytes iguais aos recebidos/manifesto; pdfinfo confirmou páginas, ausência de criptografia/JS/form.
Hashes também conferidos em cada download/abertura nos testes. Originais não foram reescritos.
Sepse mantém códigos divergentes e repetição de seções/páginas; fluxo está na digital15 e
repete na32. Não deduplicar os36 originais nem inventar revisão futura. Curadoria continua pendente.

Direitos públicos **BLOCKED**: somente fixture privada em loopback, com consentimento e sessão
próprios, até2h por processo. Cada requisição exige Host/Origin/porta corretos e cookie HttpOnly,
SameSite=Strict. Concessões individuais têm nonce aleatório e chave hash em memória; renovação
invalida a anterior, logout a revoga e não encerra outra sessão privada. Cabeçalhos de IP/
Forwarded não são autoridade. Next normaliza Request.url para localhost: aceita-se apenas essa
normalização interna na mesma porta, preservando Host original127.0.0.1 e Origin exato.

Essas rotas existem em `tests/pap-id/fixture`, NÃO em src/app. O P0 não monta o provider de
capacidade; PDFs continuam indisponíveis para distribuição pública. Mesmo com flag privada
ligada, o standalone real não registra os endpoints. Cookie técnico não é pap_session/MFA.
Não é um mecanismo de autorização clínica nem um serviço de arquivos pronto para internet.

## Matriz executada e evidências

| Comando/gate | Resultado | Evidência |
|---|---|---|
| `node --import ./tests/protocols/load.mjs --test tests/pap-id/*.test.mjs tests/protocols/*.test.mjs tests/vitrine-premium/*.test.mjs` | PASS104/104,0 skips (inclui55 MEOWS demo existentes) | evidence/node.log |
| `node_modules/.bin/tsx --test tests/commercial-beta/availability.test.ts tests/commercial-beta/rsc-metadata.test.ts tests/mission04-e/rsc-dynamic-metadata.test.ts` | PASS11/11,0 skips | evidence/commercial.log |
| `npm run test:pap-id:browser` | PASS14/14,1 worker,0 retries/skips | evidence/browser.log |
| `node_modules/.bin/tsc --noEmit` | PASS | evidence/typescript.log |
| `node_modules/.bin/eslint .` | PASS,0 erros,4 avisos herdados fora do diff | evidence/lint.log |
| `DATABASE_URL=...127.0.0.1:1/... npm run build -- --webpack` com e-mail desabilitado | PASS, build real e TypeScript Next; sem Google Fonts externo | evidence/build.log |
| `node tests/pap-id/production-boundary.mjs` | PASS: standalone copiado/iniciado fora do checkout, HTTP/RSC privado404, clínica404, Vitrine sem sessão redireciona login | evidence/standalone.log |
| Inspeção do standalone | PASS:2328 arquivos inspecionados, sem .local/.env/cartões/bases/originais | evidence/artifact-privacy.json |
| `npm run pap-id:demo -- --create-patient --issue-card` | PASS; emissão PNG/manifesto reais; produção recusada em teste | evidence/cli.log |
| `npm audit --omit=dev --json` | 0HIGH/CRITICAL;4MODERATE herdadas | evidence/production-audit.json |
| Auditoria isolada pdfjs-dist | 0 vulnerabilidades | evidence/pdf-dependency-audit.json |
| `git diff --check`, inventário, hashes e revisão de segredos | PASS | evidence/source-manifest.json |
| F03/F04 completos, Auth/MFA com DB, IAM entre tenants, Docker/scanners/CI remoto | NOT RUN nesta missão de demo; não substituídos por testes históricos | contratos preservados, não segurança clínica revalidada |
| Homologação humana, direitos de distribuição e aprovação clínica | BLOCKED/PENDING | requer operador/instituição/revisor |

Browser cobre PNG/CPF/RG correto e divergente, credenciais expiradas/revogadas, mudança de base,
prontuário/novo atendimento, cinco etapas, duplicação/reset/reload; todos os PDFs em canvas,
texto, páginas, zoom, popup real e download byte a byte. Além disso,9 jornadas P1: filtros,
abas/history/teclado, checklists/reset, páginas pausadas HTML/RSC, seis passos do tutorial,
320/375/390/430/768/1440px, light/dark e Axe WCAG2/2.1A/AA nas áreas auditadas.
Zero chamadas `/api/*`, zero origem HTTP externa e zero pageerror nos testes PAP-ID.
Simulação Chromium não substitui teste humano/dispositivo/leitor de tela.

Logs versionados normalizam apenas espaços finais; saídas brutas foram preservadas no executor.

Os4 avisos ESLint preexistem em `tests/p0-remediation/clinical-finalization-race.integration.test.ts`
e `tests/release/p0-provenance.integration.test.ts`. Não foram removidos asserts/gates.
Exceção do lockfile é fechada: só PDF.js exato6.5.438 +12 opcionais canvas1.1.1; todos os pacotes
anteriores continuam idênticos, conforme teste. Nenhum npm audit fix/force/override executado.

### Achados corrigidos antes da entrega

- Tracing conservador incluía originais no standalone, mesmo sem endpoint: exclusões explícitas
  para originais e fixture privada em next.config; build e pacote isolado revalidados.
- Instalação compartilhada do executor resolvia Next fora do tracing root. Materializados
  Next/styled-jsx existentes, SEM mudar versões, e alinhado shim .bin/next; sem ampliar o root
  de tracing. Artefatos próprios antigos preservados fora da worktree. Novo clone/npm ci usa
  dependências locais normais. Erro useContext entre duas cópias do Next foi eliminado.
- Normalização interna localhost diagnosticada por flags sanitizadas; corrigida só na fixture,
  mantendo Host/Origin/porta e testes de spoofing. Sessões locais revogáveis/rotativas.
- Região textual PDF recebeu foco de teclado; estados PAP-ID anunciam erros e focam o título.
  Capacidades adulteradas não podem encaminhar o leitor a URLs clínicas/arbitrárias.

Aplicação de produção foi construída com o conteúdo de7d95036. Alterações posteriores em3533281
são SOMENTE handler/teste da fixture privada, ambos excluídos do artefato, e foram testadas no
Node/browser finais. Fonte operacional/SDK/configuração de build não mudou após o build.
Fingerprint dos33 arquivos de código/testes atuais consta do manifesto, sem confundir HEAD
com estado não commitado. CI não é acionado pelos filtros atuais desta branch; não foi alterado.

## Evidências visuais e execução local

18 capturas versionadas: seis estados PAP-ID ×desktop/mobile e três PDFs ×desktop/mobile.
Nos6 screenshots PDF o canvas é ocultado SOMENTE na captura, para não redistribuir o conteúdo
sem licença; o leitor real não tem essa máscara. Os testes verificaram renderização e hashes.
Capturas completas autorizadas permanecem apenas em `.local/private-pdf-evidence/` do executor,
não versionadas. O operador poderá inspecionar os originais ao vivo na fixture privada.

- [Identificação desktop](evidence/pap-id-identificacao-1440.png)
- [Resumo mobile](evidence/pap-id-resumo-390.png)
- [Leitor privado, conteúdo ocultado no relatório](evidence/pdf-original-sepse-obstetrica-1440.png)
- [Roteiro WSL/retomada/revogação](LOCAL-WSL.md)
- [Checklist de publicação futura](CHECKLIST-PUBLICACAO-FUTURA.md)
- [Plano separado do dashboard clínico oficial](PLANO-CLINICO-OFICIAL.md)

## Riscos/limitações e preservação

- Persistência clínica não implementada: manifesto de TESTE é artefato local; dados de
  atendimentos/pacientes da Vitrine vivem em memória. Importar uma base não é cadastro no P0.
  Revogação demonstrativa exige reimportação do manifesto atualizado; não prova backend PAP-ID.
- Conferência de documento e limitação de tentativas são UX demo. MFA/IAM/PAP-Link, vínculo,
  auditoria e rate limiting operacionais dependem de fase própria. Câmera não é iniciada.
- Quatro MODERATE de produção herdadas: fast-uri (GHSA-w74x-v6f9-j3xg,
  GHSA-xhq7-xmqj-769h, GHSA-wjr9-j795-jxcr, GHSA-333x-w4r6-6crp),
  glob (GHSA-3g3m-2fjr-6pw4), minimatch (GHSA-g3hv-75wg-m249) e rimraf via glob.
  Reachability/exploração em produção não foi homologada; sem upgrades fora do escopo.
- Autorização institucional/revisão clínica e homologação humana continuam pendentes.
  MEOWS assistencial não foi ativado; nenhuma conduta automática foi criada.
- ZERO alterações de código em src/server, APIs, Prisma/migrations, IAM/MFA, Nginx/deploy ou
  workflows. Nenhum banco, volume, conta, senha, sessão ou chave do laboratório3600/15436
  foi acessado/alterado. Nenhum serviço existente reiniciado. Sem VPS/SSH/DNS/merge/deploy.
  Instituições/pacientes reais e e-mails externos não foram utilizados.

## Commits e inventário exato

Commits funcionais/documentais anteriores ao fechamento:

```text
a830a83 docs(beta1): import PAP-ID design and scope private acceptance
a5dcd00 feat(pap-id): add synthetic identity wizard and local card issuer
2edd54c feat(protocols): add private original PDF review and integrated acceptance
7d95036 fix(beta1): clarify document access and focus identity transitions
3533281 fix(private-review): rotate and revoke local document grants
```

Inventário completo abaixo.33 arquivos de código/testes têm fingerprints no manifesto;
documentos, referências e evidências ficam separados. Nenhum original PDF é modificado.

```text
docs/design/pap-id-v1/00-referencia-original.md
docs/design/pap-id-v1/01-identificacao-cpf-qr.md
docs/design/pap-id-v1/02-validacao-documental.md
docs/design/pap-id-v1/03-nao-encontrada.md
docs/design/pap-id-v1/04-validada-acoes.md
docs/design/pap-id-v1/05-resumo-clinico-expandido.md
docs/design/pap-id-v1/README.md
docs/design/pap-id-v1/images/00-referencia-original.png
docs/design/pap-id-v1/images/01-identificacao-cpf-qr.png
docs/design/pap-id-v1/images/02-validacao-documental.png
docs/design/pap-id-v1/images/03-nao-encontrada.png
docs/design/pap-id-v1/images/04-validada-acoes.png
docs/design/pap-id-v1/images/05-resumo-clinico-expandido.png
docs/integration/pap-id-protocols/CHECKLIST-PUBLICACAO-FUTURA.md
docs/integration/pap-id-protocols/CHECKPOINT.md
docs/integration/pap-id-protocols/LOCAL-WSL.md
docs/integration/pap-id-protocols/MISSAO.md
docs/integration/pap-id-protocols/PLANO-CLINICO-OFICIAL.md
docs/integration/pap-id-protocols/RELATORIO.md
docs/integration/pap-id-protocols/evidence/artifact-privacy.json
docs/integration/pap-id-protocols/evidence/browser.log
docs/integration/pap-id-protocols/evidence/build.log
docs/integration/pap-id-protocols/evidence/cli.log
docs/integration/pap-id-protocols/evidence/commercial.log
docs/integration/pap-id-protocols/evidence/lint.log
docs/integration/pap-id-protocols/evidence/node.log
docs/integration/pap-id-protocols/evidence/pap-id-documento-divergente-1440.png
docs/integration/pap-id-protocols/evidence/pap-id-documento-divergente-390.png
docs/integration/pap-id-protocols/evidence/pap-id-identificacao-1440.png
docs/integration/pap-id-protocols/evidence/pap-id-identificacao-390.png
docs/integration/pap-id-protocols/evidence/pap-id-localizada-1440.png
docs/integration/pap-id-protocols/evidence/pap-id-localizada-390.png
docs/integration/pap-id-protocols/evidence/pap-id-nao-encontrada-1440.png
docs/integration/pap-id-protocols/evidence/pap-id-nao-encontrada-390.png
docs/integration/pap-id-protocols/evidence/pap-id-resumo-1440.png
docs/integration/pap-id-protocols/evidence/pap-id-resumo-390.png
docs/integration/pap-id-protocols/evidence/pap-id-validada-1440.png
docs/integration/pap-id-protocols/evidence/pap-id-validada-390.png
docs/integration/pap-id-protocols/evidence/pdf-dependency-audit.json
docs/integration/pap-id-protocols/evidence/pdf-original-hemorragia-pos-parto-1440.png
docs/integration/pap-id-protocols/evidence/pdf-original-hemorragia-pos-parto-390.png
docs/integration/pap-id-protocols/evidence/pdf-original-sepse-obstetrica-1440.png
docs/integration/pap-id-protocols/evidence/pdf-original-sepse-obstetrica-390.png
docs/integration/pap-id-protocols/evidence/pdf-original-sindromes-hipertensivas-gestacao-1440.png
docs/integration/pap-id-protocols/evidence/pdf-original-sindromes-hipertensivas-gestacao-390.png
docs/integration/pap-id-protocols/evidence/production-audit.json
docs/integration/pap-id-protocols/evidence/reference-assets.json
docs/integration/pap-id-protocols/evidence/source-manifest.json
docs/integration/pap-id-protocols/evidence/standalone.log
docs/integration/pap-id-protocols/evidence/typescript.log
docs/integration/pap-id-protocols/evidence/validation.json
next.config.ts
package-lock.json
package.json
scripts/pap-id/demo.mts
scripts/private-review/documents.ts
src/features/vitrine-premium/components/demo/DemoProvider.tsx
src/features/vitrine-premium/components/protocolos/OriginalDocumentContext.tsx
src/features/vitrine-premium/components/protocolos/OriginalPdfViewer.tsx
src/features/vitrine-premium/components/protocolos/ProtocolCard.tsx
src/features/vitrine-premium/components/protocolos/ProtocolDetail.tsx
src/features/vitrine-premium/components/protocolos/SourceIndex.tsx
src/features/vitrine-premium/components/protocolos/protocols.module.css
src/features/vitrine-premium/components/registro/RegistrationWizard.tsx
src/features/vitrine-premium/components/registro/steps/IdentificationStep.tsx
src/features/vitrine-premium/components/registro/steps/identification.module.css
src/features/vitrine-premium/lib/pap-id.ts
src/features/vitrine-premium/lib/pdf-worker.mjs
src/features/vitrine-premium/lib/protocol-catalog.ts
src/features/vitrine-premium/lib/protocol-originals.ts
src/features/vitrine-premium/views/protocolos.tsx
tests/pap-id/documents.test.mjs
tests/pap-id/fixture/PrivateReviewBridge.tsx
tests/pap-id/fixture/app/homologacao/documentos/[slug]/route.ts
tests/pap-id/fixture/app/homologacao/sessao/route.ts
tests/pap-id/fixture/app/layout.tsx
tests/pap-id/fixture/app/vitrine/pacientes/[id]/page.tsx
tests/pap-id/identity.test.mjs
tests/pap-id/integrated.spec.ts
tests/pap-id/playwright.config.ts
tests/pap-id/production-boundary.mjs
tests/protocols/catalog.test.mjs
tests/protocols/run-browser.mjs
tests/vitrine-premium/isolation.test.mjs
```

**STOP:** entregar esta candidata para homologação privada humana. Não iniciar publicação
na Vitrine nem integração clínica oficial/fases B/C sem nova autorização.
