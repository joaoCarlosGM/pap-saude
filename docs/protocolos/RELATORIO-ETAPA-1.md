# PAP-Protocols — relatório da Etapa 1

Branch: `feature/beta1-protocols-priority-nav`.
Base: `12f67cda73012668c56f8509878531351af50311`.
Código/testes: `ed7f5e42beadbcbdc0ddac16772349b5b68fb3a4`.
Documentação inicial: `e827e34`.
**GO para homologação demonstrativa da Etapa 1; sem liberação clínica/produção.**
O commit documental de fechamento identifica-se no histórico da branch, sem hash circular neste arquivo.

## Escopo entregue

- Biblioteca de três referências: síndromes hipertensivas, hemorragia pós-parto e sepse obstétrica.
  Pesquisa insensível a acentos/caixa; filtros combináveis por tema, origem e versão; contagem,
  limpeza e estados de nenhum resultado, catálogo vazio, carregamento e erro.
- Renderizador único validado por Zod, com quatro abas e consulta profunda por URL.
  Um quarto protocolo **somente de teste** passa pelo mesmo schema/renderer, sem componente próprio.
- Detalhe equivalente: `/vitrine/protocolos?protocolo=<slug>&aba=<aba>`.
  Somente chaves e valores finitos; duplicações, protocolos/abas desconhecidos e parâmetros
  extras são negados pelo servidor. As outras seções continuam rejeitando qualquer query.
  Esta opção preserva os mapas Nginx e o caminho já permitido, sem liberar prefixos.
- Visão geral organiza tópicos neutros. Fluxograma é um roteiro **documental**, com zoom real,
  ajuste à tela e leitura alternativa em lista. Não contém decisões ou intervenções clínicas.
- Checklist é confirmação de leitura demonstrativa, com grupos recolhíveis, progresso local e
  limpeza confirmada. Marcações por protocolo sobrevivem às abas e à biblioteca na mesma
  montagem; não há gravação clínica ou armazenamento persistente. Reload/desmontagem descarta
  o estado. A restauração global existente também o limpa.
- Documento original informa indisponibilidade; Abrir/Baixar estão desabilitados e não fazem
  requisições. Hashes, códigos, datas e páginas são **informados/não conferidos**. Sepse mantém
  explícita a divergência dos dois códigos e não inventa data de revisão.
- Cursos/Chat IA: texto/ícone Em breve, sem `a`, `href`, handlers ou tabindex. Acesso direto às
  duas páginas e ao player demonstrativo antigo apresenta indisponibilidade com retorno seguro.
  O LMS operacional, suas páginas, serviços e APIs permanecem byte a byte iguais à base.
- Tutorial existente continua com seis passos; adaptador de apresentação evita navegar aos
  módulos pausados e funciona partindo de uma aba com query. Core sintético congelado preservado.
  Componentes antigos de criação/preview são mantidos no repositório, mas não são montados.

## Segurança e limites

`requireCommercialPageSession()` continua antes do processamento dos parâmetros nos leaves;
layout mantém sessão, MFA e IAM Comercial. Nenhuma alteração em servidor, APIs, IAM, autenticação,
Prisma/migrations, proxy, Nginx, CI/CD ou rotas clínicas operacionais. Diff desses caminhos contra
base: vazio. Consultas adicionais não selecionam tenant, paciente, instituição ou recursos reais.

A fixture de navegador é outra aplicação temporária em loopback/porta dinâmica. Monta os
componentes reais, mas **não é teste de autenticação de produção**. Não adiciona uma rota de
bypass à aplicação. URL de banco substituída por endereço deliberadamente inutilizável
`127.0.0.1:1`; envio externo desabilitado. Nenhuma migration, conta ou banco foi criado.
Os testes monitoram zero requisições `/api/*`/PDF e zero `pageerror`. O proxy real é exercitado
separadamente com identidade fictícia de teste; isso não substitui sessão/MFA reais.

Os dois testes históricos Comercial/Slice E foram adaptados apenas ao contrato explícito de
recursos sintéticos pausados. Continuam com identidade/fingerprint, negações de APIs, rotas
clínicas/administrativas, ausência de consultas operacionais, acessibilidade e reset.
Não foram removidos asserts de autorização nem foram falsificadas sessões.

**Nenhum laboratório manual, banco, volume, conta, senha, chave MFA, sessão ou registro do operador
foi acessado ou alterado. Nenhuma VPS, deploy, merge ou branch protegida foi modificada.**
Dependências existentes foram reutilizadas; não houve instalação nem alteração de lockfile.
Prisma Client foi gerado exclusivamente para tipos em cópia temporária do schema/output próprio,
sem conectar a banco. Hash do schema do client compartilhado permaneceu
`8bdc0ad2ff3584e836588ed792d23cfcb5ad7dbb805470608e20e9264cde36aa`.

## Matriz de execução

| Verificação/comando executado | Resultado | Evidência |
|---|---|---|
| `node --import ./tests/protocols/load.mjs --test tests/protocols/*.test.mjs tests/vitrine-premium/*.test.mjs` | PASS 95/95,0 pulados; inclui55 MEOWS existentes e12 novos Protocolos/proxy | `evidence/etapa-1/node.log` |
| `node_modules/.bin/tsx --test tests/commercial-beta/availability.test.ts tests/commercial-beta/rsc-metadata.test.ts tests/mission04-e/rsc-dynamic-metadata.test.ts` | PASS 11/11,0 pulados | `evidence/etapa-1/commercial-boundaries.log` |
| `node_modules/.bin/next typegen` | PASS | `evidence/etapa-1/typegen.log` |
| `npx tsc --noEmit` | PASS | `evidence/etapa-1/typescript.log` |
| `node_modules/.bin/eslint .` | PASS,0 erros;4 avisos herdados fora do diff | `evidence/etapa-1/lint.log` |
| `node_modules/.bin/eslint tests/protocols src/features/vitrine-premium/components/protocolos/ProtocolList.tsx src/features/vitrine-premium/views/protocolos.tsx` | PASS,0 avisos | `evidence/etapa-1/lint-targeted.log` |
| `PAP_PROTOCOLS_EVIDENCE=docs/protocolos/evidence/etapa-1 node tests/protocols/run-browser.mjs` (diretório absoluto na execução) | PASS 9/9,0 pulados/retries,58,5s | `evidence/etapa-1/browser.log` |
| Mesmo runner com `--grep 'all three references\|responsive library'` | PASS 2/2,29,2s; recaptura com viewport fixo | `evidence/etapa-1/captures.log` |
| `node tests/protocols/run-browser.mjs --serve` e smoke de start/GET/stop em processo próprio | PASS: biblioteca200,API clínica404,porta encerrada com SIGTERM | `evidence/etapa-1/preview.log` |
| `git diff --check`; inventário/fingerprints/inspeção de segredos | PASS;0 achados nos padrões inspecionados | `evidence/etapa-1/source-manifest.json`, `validation.json` |
| PDFs originais, integridade dos bytes e direitos de distribuição | **BLOCKED**: arquivos não disponibilizados | Aba Documento original |
| Curadoria/homologação clínica e validação de códigos/paginação | **BLOCKED**: responsável/fonte ainda necessários | Avisos e metadados reportados |
| Auth/MFA real, testes históricos com DB, F03/F04 completos | **NOT RUN**: sem banco/migrations nesta etapa | Guards preservados; estáticos/RSC acima não equivalem a estes gates |
| Build de produção, Docker/scanners, CI remoto integral | **NOT RUN**: não necessários ao frontend P1 solicitado; não alegados aprovados | Workflows não alterados; branch não selecionada por seus filtros atuais |
| Homologação visual/funcional humana | **BLOCKED** até avaliação do operador | Roteiro abaixo |

Falhas finais observadas: nenhuma nos gates executados. As primeiras tentativas da fixture
falharam por alias/log de startup e seletores de teste ambíguos; foram corrigidos sem aumento
de timeout, retries ou remoção de asserts. A fixture recebeu as mesmas fontes locais da raiz
antes da rodada final. A captura adicional usa viewport, pois o shell tem rolagem interna.

Avisos ESLint herdados: `Finalization` em
`tests/p0-remediation/clinical-finalization-race.integration.test.ts:51`;
`Prisma`, `requireClinicalProvenanceScope` e `PERMISSIONS` em
`tests/release/p0-provenance.integration.test.ts:4,10,11`. Nenhum desses arquivos foi modificado.

## Evidências visuais e referências

Nove PNGs de `referencias/` foram inspecionados visualmente,1672×941 cada. O manifesto de
validação registra seus nomes/hashes. Preservados rosa/branco, cartões, ícones, abas, coluna de
procedência e sidebar existentes. Textos clínicos dos conceitos PNG não foram tratados como
fonte homologada. A comparação foi qualitativa, não um gate de identidade de pixels.

27 capturas: biblioteca em1440/390, três protocolos ×quatro abas ×1440/390 e documento em modo
escuro1440. Matriz funcional adicional:320,375,390,430,768,1440. Axe WCAG2/2.1A/AA nas quatro abas
dos três protocolos, biblioteca e modo escuro: nenhuma violação nas áreas auditadas. Teclado,
setas/Home/End das abas, histórico, reload, checkbox, modal/reset, drawer e tutorial desktop/mobile
passaram. Acessibilidade automatizada não substitui avaliação humana/leitor de tela.

Exemplos:

- [Biblioteca desktop](evidence/etapa-1/biblioteca-1440.png)
- [Biblioteca mobile](evidence/etapa-1/biblioteca-390.png)
- [Checklist mobile](evidence/etapa-1/sindromes-hipertensivas-gestacao-checklist-390.png)
- [Documento em modo escuro](evidence/etapa-1/documento-dark-1440.png)

## Homologação segura, sem banco persistente

Em um diretório novo (não nos checkouts/laboratórios do operador):

```bash
git clone --single-branch --branch feature/beta1-protocols-priority-nav \
  https://github.com/joaoCarlosGM/pap-saude.git pap-protocols-review
cd pap-protocols-review
npm ci --ignore-scripts
node tests/protocols/run-browser.mjs --serve
```

A instalação acima é apenas para uma cópia nova sem dependências; não foi necessária neste
executor. Node suportado pelo projeto (aqui24.19.0), lockfile preservado. O comando informa a
URL `http://127.0.0.1:<porta-livre>/vitrine/protocolos`. Usa arquivos temporários próprios,
sem `.env` do laboratório, PostgreSQL, autenticação persistente ou Docker. Ctrl+C encerra
apenas a fixture; nenhum recurso persistente é excluído. Para automação, remover `--serve`;
Chromium no caminho `/usr/bin/chromium` ou definir `PAP_CHROMIUM_PATH`.
Não executar `local:init`, seed, `db push`, migrations nem atualizar o laboratório3600.

Roteiro manual:

1. Conferir biblioteca3, busca `pré-eclâmpsia`/código, filtros combinados e nenhum resultado.
2. Abrir cada referência e suas quatro abas; copiar URL, recarregar e usar voltar/avançar.
3. Usar zoom/lista do roteiro; reconhecer que não existe fluxo clínico homologado.
4. Marcar checklist, alternar abas/referências, cancelar/confirmar limpeza e restaurar demo.
5. Conferir PDF ausente, ações desabilitadas, códigos conflitantes de sepse e datas não inventadas.
6. Conferir Cursos/Chat sem clique/Tab; abrir URLs diretas e player antigo, testar retorno.
7. Testar320–1440px, drawer, foco/teclado e Ajuda/tutorial6passos sem abrir módulos pausados.
8. Avaliar capturas/contraste/legibilidade. Registrar aprovação humana para Etapa1 separadamente.

Esta fixture não valida login/MFA em produção. A homologação autenticada será feita pelo
operador em ambiente autorizado; não há instrução de migration/atualização do banco existente.

## Inventário exato

O manifesto `evidence/etapa-1/source-manifest.json` contém26 arquivos de código/testes e hashes
SHA-256 do conteúdo efetivamente validado. Documentação/evidências são separadas abaixo.
Não há paths de PAP-ID, banco, API clínica ou infraestrutura.

```text
docs/protocolos/CHECKPOINT-ETAPA-1.md
docs/protocolos/RELATORIO-ETAPA-1.md
docs/protocolos/evidence/etapa-1/biblioteca-1440.png
docs/protocolos/evidence/etapa-1/biblioteca-390.png
docs/protocolos/evidence/etapa-1/browser.log
docs/protocolos/evidence/etapa-1/captures.log
docs/protocolos/evidence/etapa-1/commercial-boundaries.log
docs/protocolos/evidence/etapa-1/documento-dark-1440.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-checklist-1440.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-checklist-390.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-documento-original-1440.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-documento-original-390.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-fluxograma-1440.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-fluxograma-390.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-visao-geral-1440.png
docs/protocolos/evidence/etapa-1/hemorragia-pos-parto-visao-geral-390.png
docs/protocolos/evidence/etapa-1/lint-targeted.log
docs/protocolos/evidence/etapa-1/lint.log
docs/protocolos/evidence/etapa-1/node.log
docs/protocolos/evidence/etapa-1/preview.log
docs/protocolos/evidence/etapa-1/sepse-obstetrica-checklist-1440.png
docs/protocolos/evidence/etapa-1/sepse-obstetrica-checklist-390.png
docs/protocolos/evidence/etapa-1/sepse-obstetrica-documento-original-1440.png
docs/protocolos/evidence/etapa-1/sepse-obstetrica-documento-original-390.png
docs/protocolos/evidence/etapa-1/sepse-obstetrica-fluxograma-1440.png
docs/protocolos/evidence/etapa-1/sepse-obstetrica-fluxograma-390.png
docs/protocolos/evidence/etapa-1/sepse-obstetrica-visao-geral-1440.png
docs/protocolos/evidence/etapa-1/sepse-obstetrica-visao-geral-390.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-checklist-1440.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-checklist-390.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-documento-original-1440.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-documento-original-390.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-fluxograma-1440.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-fluxograma-390.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-visao-geral-1440.png
docs/protocolos/evidence/etapa-1/sindromes-hipertensivas-gestacao-visao-geral-390.png
docs/protocolos/evidence/etapa-1/source-manifest.json
docs/protocolos/evidence/etapa-1/typegen.log
docs/protocolos/evidence/etapa-1/typescript.log
docs/protocolos/evidence/etapa-1/validation.json
src/app/(showcase)/vitrine/[section]/page.tsx
src/app/(showcase)/vitrine/aprender/[id]/page.tsx
src/features/vitrine-premium/SectionView.tsx
src/features/vitrine-premium/components/demo/DemoOnboarding.tsx
src/features/vitrine-premium/components/layout/ShowcaseUnavailable.tsx
src/features/vitrine-premium/components/layout/Sidebar.tsx
src/features/vitrine-premium/components/onboarding/GuidedTour.tsx
src/features/vitrine-premium/components/protocolos/ProtocolCard.tsx
src/features/vitrine-premium/components/protocolos/ProtocolDetail.tsx
src/features/vitrine-premium/components/protocolos/ProtocolList.tsx
src/features/vitrine-premium/components/protocolos/protocols.module.css
src/features/vitrine-premium/lib/protocol-catalog.ts
src/features/vitrine-premium/lib/showcase-tour.ts
src/features/vitrine-premium/views/protocolos.tsx
tests/commercial-beta/showcase.spec.ts
tests/mission04-e/journey.spec.ts
tests/protocols/catalog.test.mjs
tests/protocols/fixture/app/layout.tsx
tests/protocols/fixture/app/states/[state]/page.tsx
tests/protocols/fixture/app/vitrine/[section]/page.tsx
tests/protocols/fixture/app/vitrine/aprender/[id]/page.tsx
tests/protocols/journey.spec.ts
tests/protocols/load.mjs
tests/protocols/playwright.config.ts
tests/protocols/proxy.test.mjs
tests/protocols/run-browser.mjs
```

**STOP — Etapa 1 encerrada para revisão. Não implementar PAP-ID/Etapa 2 sem aprovação.**
