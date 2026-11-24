# PAP Saúde 2 · Prontuário longitudinal H23–H28

**Base remota conferida** `dd3782da4a9c43303f9fec4cc757be24f250b2ad` em `feature/beta1-post-acceptance-ux-rc`.

**Branch de homologação** `feature/beta1-longitudinal-record-h23-h28-rc`. Código em `138f1d3b6fe22b27fca026670db28a8c751f9abd`. O HEAD da branch inclui os testes complementares, o relatório e as evidências.

O executor respondeu aos comandos de Git no checkout `/workspace/pap-saude`. O trabalho partiu do SHA solicitado e usou perfis PostgreSQL descartáveis com volumes e portas próprios. O diff com a base confirmou integridade dos arquivos operacionais, das migrações Prisma, dos workflows e do lockfile.

## Implementação

| Requisito | Entrega |
|---|---|
| H23 | Solicitações, resultados e versões separados. Componentes estruturados conservam os valores do emissor. Vínculos selecionam PDFs privados da mesma paciente |
| H24 | Histórico de doses, estados explícitos, comprovantes, coincidências e compromisso de vacinação na Agenda |
| H25 | Edição de contatos e endereço por patch. Retificação justificada dos identificadores e da datação demonstrativa |
| H26 | Medicações com situação, dose e unidade, via, frequência, PDF de referência e motivo. O Registro preserva medicações existentes quando o formulário omite informações |
| H27 | Alergias e condições com confirmação, situação e fonte. A investigação registra graus de conhecimento. Relatos anteriores continuam consultáveis |
| H28 | Timeline usa eventos reais do laboratório, auditoria de Documentos e Agenda. Filtros e links abrem a entidade da mesma paciente. A seção ilustrativa preserva a fixture |

A revisão atual usa as nove abas e o fluxo de cinco etapas. O diário no PostgreSQL recebe operações transacionais da fixture privada. Cada versão conserva paciente, entidade, data/hora, ator, fonte e motivo. A impressão PAP-ID segue o cadastro de origem. A retificação da ficha pode incluir CPF e nome sintéticos, e a Agenda preserva o horário confirmado em seu próprio histórico.

As principais mudanças estão em `scripts/private-review`, `src/features/vitrine-premium`, `tests/pap-id/fixture` e `tests/pap-id`. Para obter a lista completa do código, execute `git diff --name-only dd3782da 138f1d3`. Consulte a [matriz de dados](MATRIZ-DADOS-E-ORIGENS.md) e a [matriz de persistência](MATRIZ-PERSISTENCIA.md).

## Validação técnica

A suíte Node aprovou 111 testes existentes. A integração longitudinal aprovou concorrência, vínculo de PDF, idempotência, versão imutável e recuperação após reinício de PostgreSQL. Outras 11 verificações do laboratório cobriram sessão, pareamento TLS, exportações privadas e histórico. A jornada Chromium H23–H28 passou em desktop e emulação Android. Após reiniciar o banco próprio e a fixture, o teste em um processo novo recuperou exatamente os mesmos IDs de eventos, além das notas SOAP e do compromisso vinculado.

O build webpack completo, o TypeScript integral e o boundary standalone passaram. A CLI do Prisma recebeu HTTP 403 ao baixar checksum e motor. O executor gerou o cliente com os pacotes oficiais 7.10.1 e schema WASM, com o lockfile intacto. O lint teve quatro avisos preexistentes. [Geração e reprodução](evidence/geracao-prisma.md)

A rodada geral de navegador teve 20 PASS e 7 FAIL. Os sete passaram em repetições focadas, incluindo PAP-ID privado, fluxos em 1440 e 390 px e os três PDFs originais. As primeiras tentativas de retomada incluíram timeout e HTTP 503 transitório. A retomada final confirmou os mesmos IDs depois do reinício. [Execução de navegador](evidence/navegador.txt)

## Homologação

**GO para homologação privada.** A aprovação visual e funcional final pertence ao operador. Android e iPhone físicos, Safari e WSL/Windows seguem com status NOT RUN. O [checklist](CHECKLIST-RESULTADOS.md) discrimina a execução automatizada de cada melhoria, e as [evidências](evidence/) incluem os resultados e as capturas de sete larguras. Para repetir, use os roteiros de [WSL](HOMOLOGACAO-WSL.md) e [aparelho físico](HOMOLOGACAO-MOBILE.md).
