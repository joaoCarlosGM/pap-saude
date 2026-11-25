# Concept aprovado — Resumo assistencial da gestante (25/11/2026)

O usuário aprovou visualmente uma revisão baseada na **tela real do prontuário enviada na conversa**. Este é o contrato descritivo; a imagem original pertence à conversa e precisa ser fornecida ao Codex para comparação pixel/visual quando exigido. **Não criar uma tela nova ou substituir toda a página.**

## Áreas que NÃO mudam sem pedido
- Link superior `Voltar para pacientes`, cabeçalho branco com avatar MG, nome, linha com informações verificáveis, contadores de consultas/gestações.
- Faixas de IG, trimestre, DPP, badges obstétricos/alerga, tipografia e espaço do cabeçalho.
- Barra horizontal de abas do prontuário, sua ordem/identidade, navegação e estilos gerais.
- Estrutura externa da página; ajustes limitados ao **conteúdo de Resumo**. Evitar sidebar ou header global adicional.

## Novo conteúdo da aba Resumo — composição exata por hierarquia
**Linha 1:** dois cards de largura semelhante, `Score MEOWS atual` à esquerda e `Tendência MEOWS` à direita.
- Card Score: valor grande à esquerda, última data efetiva, classificação real/demonstrativa claramente diferenciada, estado da tendência. Bloco de informação textual muito curto. **Não incluir recomendação clínica automatizada** sem protocolo homologado: no lugar, orientação neutra do tipo 'Consultar protocolo/avaliar clinicamente' se aplicável.
- Card Tendência: curva dos registros verdadeiramente medidos, últimos cinco atendimentos quando houver, eixos legíveis, datas/número de consultas. Não desenhar zeros fictícios nem 'estável' sem comparação real. Sem dados: estado vazio informativo, sem fabricar gráfico.
**Linha 2:** três cards em grade: `Calendário assistencial` (maior espaço possível), `Próximos compromissos`, `Resumo assistencial`.
- Calendário mensal com navegação anterior/próximo, marcadores magenta consulta, violeta exame, verde/teal vacina. Usar eventos reais da Agenda H22 e eventos sintéticos claramente identificáveis quando presentes; não inventar compromissos como se já estivessem agendados.
- Próximos compromissos: lista curta, no máximo três itens, data/hora, tipo, status, acesso ao item na Agenda. Sem compromisso, estado vazio discreto e ação secundária de abrir a Agenda se relevante.
- Resumo assistencial: quatro ou menos linhas condensadas, por exemplo DPP (com datação validada), última avaliação (com origem/data), alergias (nunca 'sem alergias' por ausência de dados) e medicações em uso (nunca 'nenhuma' por omissão).
**Linha 3:** único aviso/estado contextual e conciso, só quando derivado de informação registrada. Evitar um card gigante sem alertas. Não criar risco clínico automático.
- A antiga área 'Próximos compromissos' grande e isolada deve ser substituída por painel compacto acima.
- **Não colocar edição cadastral, retificação, gerência de alergia/medicações, ou grandes formulários dentro do Resumo**. Editores permanecem em seções contextuais fora da aba.
- Contador 'alertas' deve ter semântica e fonte auditáveis; nunca inventar um número a partir de fixtures como se fosse clínico.

## Filtro de qualidade e domínio
- A tela conceitual aprovada é visual: seus textos, DPP ou score exemplificativos **não são dados válidos**, podendo ser temporalmente inconsistentes. Não copiar data de 25/07/2026, 57 semanas ou outros números como fatos. Preencher de dados reais do laboratório fictício com `as-of` apropriado.
- Na ausência de MEOWS registrado, não mostrar 0 como score; mostrar 'Não avaliado'. Não inferir baixo risco ou ausência de alerta.
- Separar eventos de agenda **previstos** de atendimentos realizados.
- Mobile: primeira linha empilha cards de score/tendência, segunda linha calendário/lista/resumo como cards responsivos; calendário com células utilizáveis e lista sem rolagem horizontal da página.
- Manter a paleta, bordas, raio de canto, alinhamentos e tamanhos de fonte próximos da captura da página existente; concept melhora composição, não reescreve todo o layout.

## Critério de aceite visual
1. Teste diferencial de captura **antes/depois** comprova que cabeçalho e aba não foram alterados.
2. Hierarquia e três linhas de conteúdo seguem o concept.
3. Gráfico não contém dados inventados e rótulos mostram origem.
4. Ações somente nas respectivas áreas, sem poluição administrativa.
5. Playwright real em 375/390/768/1440, com screenshots e revisão manual; demais viewports seguem o padrão da suíte.
