# Matriz de implementação H29–H37

| Item e componentes | Estado de partida | Entrega e critério objetivo | Dados, persistência e regressão a verificar |
|---|---|---|---|
| H29 · Registro, RecordFields | Localizações visíveis para qualquer graduação | Apenas graus 1+ a 4+ mostram opções. Ausente, desconhecido e vazio limpam os campos | Sanitizar novas escritas no demo e laboratório. Reabrir históricos legados e não alterar MEOWS |
| H30 · SoapNotes, DemoProvider, diário privado | Seletor envia autor escolhido | Origem sintética fixa com categoria. Servidor carimba autoria das novas notas e mantém versões antigas | Testar submissão adulterada, recuperação, notas embutidas e anexadas à consulta |
| H31 · LongitudinalEditor e formulários com Modal | Aviso dentro da área rolável e validação genérica | Confirmação persistente na viewport, restauração de foco e primeiro campo inválido visível | Testar X, Escape, clique fora, continuar, descartar e falha de fetch |
| H32 · PatientSummary, PatientTabs | Agenda e administração precedem os dados assistenciais | Duas colunas MEOWS e três de acompanhamento. Cadastro em Documentos, antecedentes em Obs. Anteriores | Preservar shell, abas e rotas contextuais. Comparar captura baseline/candidata e sete larguras |
| H33 · projeções do demo e MEOWS | Score disponível pode ser sintético de fixture ou substituído pelo último incompleto | Valores completos registrados, últimos cinco e distinção entre zero, incompleto e estado vazio | Registro, Atendimentos, Evolução e laboratório após reinício. Algoritmo preservado |
| H34 · PatientHeader e Resumo | Contagem de fixture sem itens | Contar parâmetros críticos registrados da última avaliação real, com lista e horário | Verificar origem, ausência de duplicação e isolamento de avisos/agenda |
| H35 · AgendaPanel | Grade de cards com formulários expostos | Tabela desktop, cards mobile, filtros e modal. Eventos alimentam o calendário do Resumo | Preservar histórico H22, gravação e deep links, operações privadas e locais |
| H36 · ProtocolFlow | Mapas simplificados | Percorrer conexões verificadas nas páginas originais. Indicar pontos de revisão e preservar zoom/pan | Comparar PDFs, testar caminhos, foco, movimento reduzido e documento privado |
| H37 · Documentos, cadastro e card API privada | Carteirinha exige emissão manual, upload inline | PAP-Gest em primeira posição, emissão inicial idempotente e recuperação separada, upload em modal | Verificar cadastro confirmado mesmo se falhar emissão, retentativa, QR, concorrência, histórico, A/B |
