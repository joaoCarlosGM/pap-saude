# Checklist PAP-B1-UX-04

| Verificação | Resultado | Evidência |
|---|---|---|
| Base remota e preservação do checkout | PASS | `cfc1a534ca83825eff77f444b4428c83465705bf` confirmado. A branch isolada preserva os commits da execução e incorpora os contratos atualizados |
| H38 · Fichas, agenda e documentos de apresentação | PASS | Três fichas com tendências calculadas. Teste Chromium abriu exemplo de Agenda, documento e os dois lados da PAP-Gest sem sessão. Os três endpoints privados responderam 403 |
| H39 · Datação e proveniência | PASS | Unitários verificaram 13s5d, 17s5d, DPP, ano bissexto, data civil e data histórica. A integração rejeitou exame futuro e recuperou fontes, anexos e eventos depois do reinício |
| H40 · Campos, opções e validações | PASS | Chromium percorreu as três fontes, medidas, proteinúria qualitativa e laboratorial, SOAP e antecedentes. A primeira evidência faltante recebeu foco. [Matriz de campos](MATRIZ-CAMPOS-ANTES-DEPOIS.md) |
| H40 · Composição renderizada do Registro | PASS · revisão qualitativa | Imagens fornecidas na conversa e capturas reais comparadas visualmente. Quatro estados, sete larguras, três etapas. [Divergências e capturas](REGISTRO-COMPARATIVO-VISUAL.md) |
| H40 · Montagem com originais e comparação pixel a pixel | NOT RUN | Os três concepts estavam visíveis na mensagem. Os arquivos de imagem originais não estavam montados no executor |
| H41 · MEOWS | PASS | Cálculo preservado, campos que não pontuam fora da soma, incompleto distinto de zero, histórico real dos casos. Estado verde condicionado a score zero calculado |
| H42 · Construção, links, teclado e movimento reduzido | PASS | Três testes progressivos e fluxo autorizado com recortes do PDF. Evidências em 0%, 25%, 50%, 75% e 100%. [Frames](evidence/frames/) |
| H42 · Homologação clínica integral | BLOCKED | O PDF foi comparado com as conexões e recortes. Permanecem duas ambiguidades documentais para revisão humana. [Matriz](MATRIZ-FLUXOGRAMAS-PDF.md) |
| H43 · Banner Agenda | PASS | Playwright confirmou caixas de mesma geometria em Agenda, Registro e Atendimentos a 390 e 1440 px |
| Unitários e contratos | PASS | 115 testes. [Saídas técnicas](evidence/verificacoes.txt) |
| PostgreSQL, QR, sessão, PDF, TLS e recuperação | PASS | 14 testes em perfil próprio. Uma nova fixture Chromium reabriu a mesma ficha após reinício e recuperou os mesmos IDs de Timeline |
| Playwright desktop, Android emulado e regressões | PASS | 38 cenários distintos confirmados na bateria e nas repetições, mais a retomada da ficha após reiniciar o laboratório |
| TypeScript, lint, webpack e isolamento | PASS | Lint com quatro avisos preexistentes. Build com 44 páginas estáticas, standalone isolado, guard SQL aprovado |
| Aparelhos físicos, Safari e WSL | NOT RUN | Chromium desktop e Android emulado no Cloud. [Roteiro móvel](HOMOLOGACAO-MOBILE.md) · [Roteiro WSL](HOMOLOGACAO-WSL.md) |
| Revisão clínica de MEOWS e liberação assistencial | NOT RUN | Matriz de demonstração e processo de homologação humana continuam aplicáveis |

A primeira bateria ampla ocorreu antes da última revisão visual, com 33 PASS e 5 FAIL. Os cinco cenários passaram nas repetições. A jornada do Registro também passou isoladamente após uma recarga da fixture na execução concorrente. O log mantém as tentativas anteriores. [Execuções Playwright](evidence/navegador.txt)
