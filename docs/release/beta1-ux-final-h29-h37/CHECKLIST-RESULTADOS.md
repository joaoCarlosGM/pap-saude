# Checklist de resultados

| Verificação | Resultado | Evidência |
|---|---|---|
| Executor, branch e base remota | PASS | Git 2.56.1. A branch partiu de `fe87c57d20e24e9392e6d6274f077931228ecb31`. Estado inicial limpo |
| H29 · Campos condicionais e armazenamento | PASS | Chromium Pixel 7 mostrou e limpou localizações ao alternar a gradação. A integração descartou localizações incompatíveis com edema ausente. O unitário preservou a apresentação legada |
| H30 · Autoria SOAP | PASS | Chromium Pixel 7 confirmou autoria informativa e três notas vinculadas. A integração confirmou autoria e categoria da sessão e carimbo do servidor após adulterar o autor enviado em notas embutida e avulsa |
| H31 · Modal de resultados | PASS | Chromium Pixel 7 verificou erro e foco visíveis, rascunho após abortar a rede, botão de continuar, descarte e restauração de foco |
| H32 · Resumo assistencial | PASS | Chromium comparou estado vazio e preenchido. As capturas antes/depois cobrem 320, 375, 390, 430, 768, 1024 e 1440 px. O editor cadastral ficou fora de Resumo |
| H33 · MEOWS e persistência | PASS | A integração guardou zero, três e estado incompleto. Chromium confirmou os pontos após refresh. O PostgreSQL recuperou os mesmos eventos depois de reiniciar |
| H34 · Alertas verificáveis | PASS | No Chromium, o indicador abriu o parâmetro PAS sinalizado com valor e referência à avaliação. A ficha vazia manteve indicação de indisponibilidade |
| H35 · Agenda integrada | PASS | Chromium abriu compromisso a partir do calendário, filtrou situação e verificou agendamento, atualização, cancelamento e histórico |
| H36 · Fluxogramas e figura original | PASS | Repetição focada percorreu conexões, zoom e pan de teclado nos três mapas e carregou as figuras autorizadas. [Mapeamento e pendências clínicas](MATRIZ-FLUXOGRAMAS.md) |
| H37 · PAP-Gest e anexos | PASS | Chromium criou cadastro, encontrou PAP-Gest em primeira posição, confirmou emissão única e escopo dos arquivos. PostgreSQL testou concorrência, revogação e recuperação |
| Unitários e contratos | PASS | 111 testes de Vitrine, PAP-ID e Protocolos |
| PostgreSQL, sessão, PDF, QR e TLS | PASS | 14 testes em perfil próprio, com reinício e recuperação de dados |
| Playwright desktop e Android emulado | PASS | 32 cenários distintos entre a rodada completa e as repetições. A primeira rodada registrou 30 PASS e 2 FAIL. As repetições confirmaram os dois cenários. [Resultados e tentativas anteriores](evidence/navegador.txt) |
| Retomada após reiniciar o laboratório | PASS | PostgreSQL próprio transitou de `exited` para `running`. Uma nova fixture e nova sessão Chromium recuperaram a mesma sequência de IDs da Timeline, duas notas SOAP e o compromisso de vacinação |
| TypeScript, lint e build webpack | PASS | Compilação webpack e 44 páginas estáticas. Lint com quatro avisos preexistentes fora do escopo |
| Boundary do standalone e guard SQL | PASS | As rotas e artefatos privados ficaram fora do standalone. Guard de consultas no código operacional aprovado |
| Comparação com a imagem conceitual original | NOT RUN | Material recebido inclui a referência descritiva e capturas de base |
| Android/iPhone físicos, Safari e WSL | NOT RUN | Emulação Chromium executada. Aprovação em dispositivo real pendente |
| CI hospedada e uso assistencial | NOT RUN | A execução foi no Codex Cloud. A branch está fora dos gatilhos configurados de CI |
