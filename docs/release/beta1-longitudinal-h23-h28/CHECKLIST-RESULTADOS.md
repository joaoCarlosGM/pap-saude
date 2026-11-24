# Checklist H23–H28

Os resultados abaixo são da execução automatizada na Vitrine sintética. A aprovação visual e funcional pelo operador fica pendente.

| Item | Resultado | Evidência |
|---|---|---|
| H23 · Criar pedido e registrar resultado separadamente | PASS | Jornada desktop em Exames. Pedido pendente passou por coleta. Resultado incluiu laboratório, método e componente com valor, unidade e referência |
| H23 · Vínculo, visualização, download e retificação | PASS | Chromium acessou o PDF original e confirmou download. Histórico mostrou o valor anterior. Integração negou PDF e pedido de outro sujeito |
| H23 · Situações, arquivamento e persistência | PASS | PostgreSQL preservou versões, pedido, resultado, vínculo e bytes após reinício. Arquivamento bloqueou abertura |
| H24 · Dose aplicada, agendada e pendente | PASS | Chromium desktop e Android emulado. Aplicada exigiu data e fonte. O editor não mostrou data de aplicação para agendada. O compromisso foi salvo na Agenda |
| H24 · Histórico e coincidência | PASS | Integração guardou aplicação e versão anterior, associou comprovante e rejeitou coincidência. A confirmação de aplicação exige ação própria |
| H25 · Contatos, cancelamento e campos omitidos | PASS | Edição e descarte no Chromium. Integração conservou telefone quando a atualização informou apenas município e UF |
| H25 · Retificação controlada | PASS | Chromium registrou CNS/DUM com justificativa e confirmação. Integração guardou CPF sintético retificado e confirmou que o cadastro usado pelo PAP-ID conservou o CPF de origem |
| H26 · Medicações e mudança de situação | PASS | Chromium registrou duas medicações, suspendeu uma e conferiu ambas após nova consulta. PostgreSQL negou alteração cruzada e conferiu histórico |
| H26 · Reconciliação | PASS | Unitário mostrou o mesmo conjunto de medicações e IDs após `medications=[]` e após campo omitido. Jornada confirmou o estado editado após consulta sem dados novos |
| H27 · Alergias, condições e dados omitidos | PASS | Chromium registrou reação em revisão, resolveu condição e confirmou o alerta de alergia após nova consulta. Unitário verificou que condições, alergias e DPP/IG sobreviveram à omissão |
| H28 · Timeline integrada | PASS | Chromium verificou filtro, foco no resultado certo, eventos de Agenda/Documentos/SOAP e contagem após refresh. Integração verificou versões imutáveis, concorrência e escopo |
| Persistência após refresh e reinício | PASS | PostgreSQL preservou snapshot e bytes. Em nova fixture e no mesmo PostgreSQL reiniciado, Chromium recuperou os mesmos IDs de eventos, SOAP e compromisso da paciente |
| Isolamento de paciente e sessão | PASS | Casos de tentativa cruzada, método, query, origem, revogação, idempotência, retificação, restrições HTTP/RSC e boundary |
| Viewports, teclado e acessibilidade automatizada | PASS | Chromium em 320, 375, 390, 430, 768, 1024 e 1440 px. Rolagem horizontal global, hit target do botão Salvar, Shift+Tab, Escape, foco, validação nativa e axe |
| Modo escuro e toque emulado | PASS | Chromium Pixel 7 em 390/430 px. Modo escuro, preferência de movimento reduzido, editor com rótulos e erro no campo de data |
| Android/iPhone físicos, Safari, WSL e aprovação do operador | NOT RUN | O executor não apresentou aparelhos físicos nem WSL/Windows. Roteiros de entrega incluem os cenários pendentes |
| CI remoto | NOT RUN | A branch está fora das condições de push dos workflows existentes. Validação rodou no executor Cloud |
| Testes unitários e regressões de contrato | PASS | 111 testes Node de Vitrine, PAP-ID e Protocolos. Novo unitário H23–H28 adicional em `longitudinal.test.mts` |
| Integração e segurança do laboratório | PASS | Cenário longitudinal PostgreSQL e 11 regressões de banco, sessão, TLS e PDF. Guard SQL sem violações |
| TypeScript integral | PASS | `tsc --noEmit` depois da geração do cliente Prisma |
| Lint | PASS | Zero erros e quatro avisos preexistentes fora do escopo |
| Build e standalone | PASS | Build webpack completo, 44 páginas estáticas e teste de boundary do processo standalone em loopback |
| Regressões H01–H22, PAP-ID, Agenda e Protocolos | PASS após repetição | Primeira rodada fez 20 PASS e 7 FAIL. Os sete passaram em repetições focadas. H18–H22, animações e câmera simulada passaram na primeira rodada. [Resultados e comandos](evidence/navegador.txt) |
