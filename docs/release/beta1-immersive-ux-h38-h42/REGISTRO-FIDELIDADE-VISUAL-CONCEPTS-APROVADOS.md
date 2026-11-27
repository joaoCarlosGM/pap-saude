# PAP Saúde | Registro — contrato de fidelidade visual aos três concepts aprovados

**Status:** ESPECIFICAÇÃO DE UI/UX — não executa alterações na aplicação.  
**Data:** 27/11/2026. **Branch-base:** `feature/beta1-ux-final-h29-h37-rc`.  
**Princípio vinculante:** **não adicionar, remover, renomear, mover entre etapas, tornar obrigatório, reinterpretar nem alterar a persistência de nenhum campo do Registro da versão em homologação.** Estas imagens foram aprovadas **pela aparência, hierarquia e composição**, não como solicitação de novos campos clínicos. Caso haja divergência entre conteúdo ilustrativo da arte e o formulário existente, **o conteúdo da branch vence; o layout do concept vence**.

## 1. Referência visual inspecionada

Foram examinadas visualmente as seguintes imagens aprovadas na conversa (nomes de arquivo do anexo do operador, não referências binárias armazenadas neste repositório):

1. `interface_médica_de_gestação_com_progresso_e_dados.png` — concept de **Etapa 2: Gestação**; aproximadamente 1408 × 1056 px; tela desktop com card grande de datação e dois cards inferiores.
2. `dashboard_de_sinais_vitais_meows.png` — concept de **Etapa 3: Sinais Vitais**; aproximadamente 1408 × 1056 px; medidas à esquerda e MEOWS à direita.
3. `registro_obstétrico_e_clínico.png` — concept de **Etapa 4: Dados Obstétricos e Clínicos**; aproximadamente 1408 × 1024 px; cards horizontais de avaliação, edema, clínica e histórico.

**Limite de precisão:** estas imagens foram inspecionadas no contexto da conversa, mas os arquivos PNG **ainda não estão versionados na branch**. O Codex deve receber as três imagens originais por anexo para realizar comparação visual. **Proibido alegar igualdade pixel a pixel só com a especificação textual.** O documento registra a composição, a ordem, as proporções e os estilos observáveis; medidas em px abaixo são **alvos aproximados** baseados no visual, não propriedades técnicas extraídas de Figma.

## 2. Gramática visual exata compartilhada

### 2.1 Shell e stepper — sem redesenho

- Fundo geral branco/quase branco, sem gradiente chamativo em cartões de trabalho; shell institucional da PAP e banner existente da rota Registro permanecem intactos.
- Cabeçalho **Registro** no canto superior esquerdo da área de trabalho, subtítulo *Iniciar novo atendimento*. Stepper de cinco etapas à direita/centralizado na mesma faixa horizontal quando houver largura, sem criar uma nova barra.
- **Etapas 1 Identificação, 2 Gestação, 3 Sinais Vitais, 4 Dados Obstétricos e Clínicos, 5 Resultado**. Concluídas: círculo magenta cheio com check branco; atual: círculo magenta cheio com número branco; futuras: círculo branco/cinza com contorno cinza e número cinza. Conectores com linha horizontal fina (cerca de 1–2px), magenta nas passadas e cinza nas pendentes. Rótulo curto abaixo de cada círculo, com o atual em magenta/negrito. Não mudar mecanismo funcional do `Stepper.tsx`.
- Linha horizontal suave separando stepper do conteúdo. Margem lateral ~44–54px desktop dentro da tela do concept, mantendo o max-width do componente existente sem extrapolar.
- Cabeçalhos de seções alinhados horizontalmente: ícone outline magenta dentro de um quadrado rosa muito claro **~52–56px**, cantos **~14px**; título 20–24px navy/slate-900, peso 650–700; subtítulo 13–15px slate-600. Título não invade ícone.

### 2.2 Superfícies e campos

| Item visual | Alvo do concept | Antipadrão |
|---|---|---|
| Card principal | Branco, borda cinza muito clara 1px, sombra mínima, raio 16–18px | Fundo cinza escuro; múltiplas bordas pesadas |
| Card secundário | Mesmo estilo; espaços interiores 20–26px | Títulos flutuando sem agrupamento |
| Ícone de seção | Magenta outline 22–26px em quadrado rosa muito suave 48–56px, raio 12–14px | Emoji, ícone sólido 3D, cor alternativa |
| Campo | Altura **40–46px** (mínimo de interação 44px), borda slate-200, raio **9–11px**, texto slate-900 | Input cru ou muito compacto |
| Label | 13–14px, semibold, 6–9px acima de input | Placeholder como único label |
| Texto auxiliar | 12–13px slate-500/600; sem parágrafos longos | Avisos técnicos repetidos |
| CTA primário | Fundo rosa PAP `#C41469`, texto branco, ~44–48px altura, raio 11–12px | Verde ou azul primário |
| CTA secundário | Fundo branco, contorno rosa ou slate, texto da PAP | Botão magenta para toda pequena ação |
| Espaçamento horizontal de cards | Aproximadamente **16–20px** | Cards colados ou gaps >40px |
| Espaçamento vertical de seções | Aproximadamente **18–26px** | Bloco único sem divisórias |
| Painel de dados calculados | Rosa palíssimo com blocos internos rosa suave, sem sombra forte | Largura de formulário inteira para três números |
| Rodapé | Divisor cinza fino, Voltar esquerdo, Próximo/Ver Resultado direito; margem ~20px | CTAs no meio de campos |

- Tokens existentes/Tailwind do repositório têm precedência sobre pequenas diferenças numéricas. **Uma única escala consistente** é mais importante que números arredondados.
- Rosa vivo é acento; não pintar cards inteiros de magenta; valores críticos, alertas e status não ganham cores clínicas arbitrárias.
- Usar os **ícones Lucide já disponíveis**; consultar o pacote instalado antes do import. Não instalar outra iconografia.

## 3. Etapa 2 — comparação literal do concept aprovado

### 3.1 Geometria e hierarquia observadas

O concept mostra uma **grande superfície externa (card de Gestação atual) com:**
1. Topo com ícone de gestante rosa, título **Gestação atual** e subtítulo.
2. **Card interno de Origem da datação**, com conteúdo à esquerda (~66%) e **uma coluna de três tiles verticais rosa suave** à direita (~34%), separados por divisor vertical cinza.
3. **Dois cards inferiores lado a lado, largura aproximadamente 50/50**: *Histórico obstétrico resumido* à esquerda (ícone carrinho/gestante) e *Contexto da gestação* à direita (ícone calendário); separados por 16px.
4. **Barra informativa final** rosa-claro, de baixa altura, com ícone `Info` rosa e texto de origem da datação.
5. Rodapé com Voltar delineado à esquerda / Próximo magenta à direita.

Não colapsar tudo em uma única coluna contínua de inputs no desktop. Não mover a coluna IG/DPP para baixo do formulário quando há largura suficiente.

### 3.2 Card Origem da datação — aparência exata

- Título "Origem da datação" em negrito; abaixo, **segmented control horizontal de três segmentos contíguos e mesma altura**, com ícone da fonte:
  - `CalendarDays` / **Por DUM**
  - `Layers`/ícone de ultrassom / **Por ultrassom/exame**
  - `Calendar` / **DPP conhecida**
- Segmento ativo = rosa translúcido, contorno magenta 1–2px, texto magenta e raio 10–12px; os demais = branco com contorno neutro, texto escuro. No concept a aba ativa é "Por ultrassom/exame", mas **não fixar essa seleção na aplicação**.
- Abaixo do controle, formulário em **até três colunas na área esquerda**, com labels acima e controles de data/select alinhados. Texto longo de observação ocupa largura total dessa área. Espaçamento uniforme.
- **Painel lateral direito**: 3 tiles **empilhados verticalmente** com fundo `#FFF0F7` aproximado e raio 12–14px: `IG atual`, `DPP`, `Trimestre`. Cada tile: ícone rosa dentro de quadrado menor, título pequeno slate-900 e valor 18–22px negrito. O tamanho dos três tiles deve ser parecido. Sem gráficos ou indicadores de risco no painel de datação.
- **Dados do concept NÃO são dados a imitar**: a figura mostra `18/01/2027`, `12 semanas e 3 dias`, `13 semanas e 5 dias`, `30/04/2027`; esses exemplos não são necessariamente temporalmente coerentes. Nunca copiar/usar como default; a datação real do produto define os valores.

### 3.3 Dois cards inferiores: aparência preservada, sem inventar campos

A arte inclui explicitamente os cards `Histórico obstétrico resumido` e `Contexto da gestação`. **A composição visual desses dois blocos deve ser preservada quando for possível preenchê-los a partir de dados atuais**, mas **não cria autorização para acrescentar G5, filhos vivos, risco, gestação gemelar, unidade ou qualquer campo que não exista na etapa da branch**.

Contrato de reconciliação visual-semântica:
- Não mover o editor de antecedentes da **etapa 4** para a etapa 2 nem criar um editor duplicado. Um card **resumo somente leitura**, ligado ao estado atual do Registro/paciente, pode usar o MESMO estilo, se houver dados e vínculo reais. Se não houver dados exibíveis, card informativo compacto com estado `Ainda não informado` e sem controles fictícios. Evitar card gigante vazio.
- `Contexto da gestação` também pode servir como espaço de **informação já existente** (primeiro atendimento desta gestação, estado da origem de datação, fonte escolhida e dados pertinentes existentes), com **único campo interativo já existente de primeiro atendimento**. Não criar selects `Pré-natal iniciado`, `Gestação gemelar`, `Alto risco`, `Unidade` só por terem aparecido na imagem.
- Se a ausência desses campos inviabilizar equivalência exata com a imagem, registrar **diferença de conteúdo obrigatória por preservação de escopo**; manter **as duas caixas, proporção, cabeçalho, ícones e posição** sem criar informações.
- Barra inferior informativa mostra **origem e referência temporal selecionadas**, quando houver, de maneira breve; evitar repetir aviso de demo.
- **DUM desconhecida** e **Primeiro atendimento Sim/Não** da branch devem continuar editáveis dentro desse arranjo, sem diminuição de acessibilidade.

### 3.4 Breakpoints

Desktop ≥1100: 2/3 + 1/3 no card interno; dois cards inferiores em 50/50. Tablet 768–1099: permitir painel lateral abaixo somente se os inputs não couberem; dois cards inferiores 50/50 quando legíveis. Mobile <768: card superior -> formulário -> tiles IG/DPP/trimestre, depois Histórico e Contexto empilhados. Segmented control pode quebrar em linhas com botões de altura 44px, mantendo ordem.

## 4. Etapa 3 — comparação literal do concept aprovado

### 4.1 Macrocomposição — fundamental

O concept **não** é apenas "formulário com MEOWS lateral": ele tem **duas colunas assimétricas**:
- **Área esquerda ~63–65%:** card grande de medidas 3×2 + **dois mini-blocos opcionais ilustrativos na parte inferior**; abaixo, um **card separado `Achados rápidos`**.
- **Área direita ~35–37%:** **primeiro card `MEOWS em tempo real`**, com cabeçalho, bloco rosa de escore, gráfico e faixa de recomendação no mesmo card; **segundo card `Sinais de alerta`** empilhado abaixo, com estado verde apenas quando devidamente sustentado.
- Gap aproximado 16–18px entre colunas. Abaixo do conjunto, rodapé Voltar/Próximo.

A versão da documentação anterior agrupa todos complementares em um único card lateral/abaixo sem explicitar corretamente o **card `Achados rápidos` separado à esquerda e card `Sinais de alerta` separado à direita**. **Corrigir essa diferença.**

### 4.2 Medidas 3×2: microgeometria

Primeira linha de três mini-cards: `PAS`, `PAD`, `Frequência cardíaca`. Segunda: `Frequência respiratória`, `Temperatura`, `Saturação de O₂`.

Cada mini-card:
- retângulo branco com borda neutra, raio 14–16px;
- pequeno quadrado rosa suave ~42px à esquerda superior com ícone linha magenta; texto do label alinhado à direita desse ícone, **podendo quebrar em 2 linhas**, como PAS/PAD;
- input na linha inferior, largura quase total, unidade alinhada à direita dentro do campo;
- altura visual dos cards equivalente na mesma linha, com pads 14–16px;
- sem indicadores redondos verdes automaticamente.
- Se o formulário atual aceitar medição vazia, não preencher exemplos (118,76,84,16,36,6,98) como se fossem medidos.

O concept inclui dois mini-blocos inferiores **Glicemia capilar** e **Dor (EVA)** com slider. **Esses componentes NÃO existem em `RegistrationData` nesta homologação e NÃO DEVEM ser adicionados.** Preservar a distribuição espacial usando campos de complementares já existentes (p.ex. `Situação de oxigenação` e `Débito urinário`) em blocos com o mesmo tamanho/aparência, sem afirmar correspondência semântica. Se não houver dois campos que caibam sem duplicação, deixar a sequência real com dimensões coerentes, sem espaço falso.

### 4.3 Card separado Achados rápidos

No concept, o card ocupa **toda largura da coluna esquerda**, com cabeçalho (`ClipboardList` rosa) e subtítulo, divisor vertical interno e duas subcolunas: **Proteinúria** à esquerda e **Nível de consciência** à direita. Preservar essa composição.

- Proteinúria deve exibir as seis opções atuais `Não realizado, Negativa, Traços, 1+, 2+, 3+` como segmented control **quando couber**; em mobile pode virar select equivalente. Método do teste só quando realizado; laboratório quantitativo em disclosure dentro desta metade do card, acessível e persistente.
- `Nível de consciência` como select na outra metade, quatro opções reais. Não adicionar opção nova só porque o concept diz "Selecione".
- `Débito urinário` e `Oxigenação`/fluxo O₂ (campos atuais ausentes da arte) precisam aparecer sem nova terceira coluna espremida. **Localização visual permitida:** abaixo das duas subcolunas de Achados rápidos, uma segunda linha de campos compactos; ou usar os dois mini-blocos após os seis vitais, *sem duplicar os mesmos campos*. Em qualquer alternativa, manter o topo 3×2, Achados rápidos separado e MEOWS à direita.
- Separador do card horizontal quando mobile para não reduzir a largura de inputs.

### 4.4 Card MEOWS em tempo real: 4 subáreas obrigatórias

1. **Header:** ícone `TrendingUp`/equivalente outline em quadrado rosa pálido, `MEOWS em tempo real` em negrito, subtítulo discreto.
2. **Escore:** painel interno rosa muito claro, dividido visualmente em **valor grande à esquerda** (magenta, aproximadamente 52–64px no concept) e **classificação/tendência à direita**; divisor vertical fino. Badge em verde **apenas** quando classificação calculada da matriz tiver semântica compatível; nunca falsear `Baixo risco` se incompleto. Quando incompleto, valor `—`, texto `Aguardando parâmetros`, lista dos faltantes.
3. **Gráfico:** mini-card branco com título `Evolução do escore na consulta`, linhas horizontais finas, eixo legível. **Não inventar os três valores iguais de `Inicial/Após SV/Atual` mostrados como exemplo no concept.** Exibir pontos somente de avaliações de fato recalculadas/registradas no evento correspondente; se não há série legítima nessa consulta, usar mini-placeholder gráfico `A evolução aparecerá após novas avaliações` com mesmo espaço visual compacto, sem criar medições.
4. **Rodapé contextual:** área rosa pálido com ícone `Lightbulb` e título neutro (ex. `Interpretação dos parâmetros`). O concept traz `Recomendação` e texto de conduta: **não incorporar prescrição/conduta automática**; manter visual e substituir conteúdo por interpretação rastreável da matriz existente, com link `Ver detalhes`.

### 4.5 Card Sinais de alerta

- **Card separado abaixo do MEOWS**, com ícone escudo rosa e título `Sinais de alerta`.
- Bloco de estado interno arredondado, fundo verde pálido **somente quando uma avaliação efetivamente completa demonstrar ausência de critérios de alerta**. Em outros casos, estado neutro `Avaliação incompleta` ou lista de parâmetros sinalizados — não rotular paciente sem dados como "sem alertas críticos".
- Nota informativa discreta abaixo se necessário, sem repetição “demo/não homologado” em todas as subáreas.

### 4.6 Responsividade

Desktop ≥1100 mantém 63–65%/35–37% e top grid 3×2; tablet empilha a direita abaixo se a coluna esquerda não comportar os rótulos; mobile uma coluna: cabeçalho, medidas em 1–2 colunas, Achados rápidos, MEOWS, Alertas. Manter todos os campos atuais e score acessível; não forçar 3 cards estreitos a 390px.

## 5. Etapa 4 — comparação literal do concept aprovado

A imagem de `registro_obstétrico_e_clínico.png` tem composição:

1. Cabeçalho `Dados Obstétricos e Clínicos` com ícone obstétrico rosa sobre quadrado ~52px.
2. **Primeira faixa com 2 cards assimétricos:** esquerdo `Avaliação obstétrica` (~54–55%) e direito `Edema` (~45–46%).
3. **Segunda faixa com um card largura total** `Registro clínico do atendimento`: três colunas ilustrativas (`Queixa principal`, `Achados clínicos`, `Conduta/Plano`).
4. **Terceira faixa com um card largura total** `Alergias, medicações e comorbidades` — três colunas separadas por divisores verticais suaves, com resumo + botão pequeno `+ Adicionar` para cada uma.
5. Rodapé Voltar / Próximo.

### 5.1 Primeira faixa

- `Avaliação obstétrica` com `altura uterina` e `BCF` na linha 1; `Movimentação fetal` e `Sangramento vaginal` linha 2; `Peso atual` início da linha 3. Unidade à direita dentro do input, selects de raio 10px. Mesmo espaçamento 14–18px.
- `Edema` com select `Gradação do edema` topo; **o concept desenha a área Localização em cinza mesmo quando Sem edema**, mas **o pedido funcional aprovado depois é ocultar completamente quando não há edema**. Logo, remover a caixa cinza vazia no estado ausente, manter a geometria de card e permitir que a altura varie. Quando graduação 1+–4+, os checkboxes aparecem abaixo sem alterar o card da esquerda; descrição "Outro" condicional. Ícone `Droplet` rosa.

### 5.2 Segunda faixa — respeitar *forma* de três colunas, *sem perder SOAP*

- A imagem traz três textareas na mesma linha, mas a versão homologada possui `queixasPrincipais` + SOAP `S/O/A/P`, com autoria e histórico. **NÃO transformar cinco campos em três nem substituir SOAP por `Achados clínicos` genérico**.
- Preservar o aspecto de um **único card** e distribuição equilibrada das áreas de entrada: queixa principal em linha de destaque e, abaixo, **quatro textareas 2×2** com labels S, O, A, P, espaço uniforme e mesmas bordas/raios que os três textareas da arte. Esse é um ajuste obrigatório para a incompatibilidade entre imagem e dados atuais; não é criação de nova UI.
- Cabeçalho `Registro clínico do atendimento` com ícone `Stethoscope` em quadrado rosa. Autoria da sessão em texto secundário discreto, não dropdown. Botão `Adicionar anotação` outline rosa, não grande botão magenta. Histórico legado via disclosure pequeno dentro ou logo abaixo do card, sem empurrar rodapé para fora de viewport.

### 5.3 Terceira faixa

- Grande card 3 colunas, títulos `Alergias`, `Medicações em uso`, `Comorbidades` no alto de cada uma, estado pequeno tipo pill **quando verificado**, botão + Adicionar contornado magenta à direita do cabeçalho do grupo. Divisores verticais cinza finos entre grupos no desktop.
- Ao clicar + Adicionar/Gerenciar, expandir **somente** o grupo relevante com campos existentes, de preferência área interna do card/drawer da mesma identidade; não abrir simultaneamente três formulários de listas.
- Alergias preserva status investigativo e agent/reaction/notes; medicações nome/dose/frequência/via; comorbidades status e condições; não eliminar a possibilidade de remover/adicionar múltiplos registros nem inferir ausência por campo vazio.
- Antecedentes obstétricos atuais (`pregnancies,deliveries,cesareans,pregnancyLosses`) não aparecem na arte. Mantê-los em **disclosure claramente rotulado** no final do terceiro card ou em quarto card discreto logo abaixo — **sem mover para a etapa 2**, sem tornar inacessíveis ou excluir.
- A arte acima NÃO possui formulários de datação gestacional na primeira faixa (a versão discutida anteriormente teve outra composição): preservar a escolha da etapa 2 sem duplicar campos de datação na etapa 4.

### 5.4 Mobile

Primeira faixa: Avaliação obstétrica, depois Edema. Segunda: Queixa, SOAP em coluna única com mesmo ritmo visual. Terceira: alergias, medicações, comorbidades empilhadas e separadas por dividers horizontais, mesmos CTAs e disclosures. Rodapé permanece claro, sem scroll horizontal.

## 6. Regras de não-invenção — prioridade máxima

1. **FONTE DOS CAMPOS:** `src/features/vitrine-premium/types/registration.ts` e os componentes atuais `PregnancyStep`, `VitalSignsStep`, `ObstetricStep`, `RecordFields`, `ClinicalHistory`, `SoapNotes` e `RegistrationWizard`. Criar uma matriz 100% completa com `campo, valor, label, opção, validação, local antes, local depois` antes da primeira alteração. Não adicionar campos apenas por estarem desenhados.
2. **FONTE DA UI:** os 3 concepts aprovados; usar exatamente o arranjo macro, hierarquia dos cards, estilo dos ícones/inputs, densidade, cantos, alinhamento e cores. Não criar uma nova arquitetura de página. `min-height` e padding não podem deixar o formulário artificialmente esticado.
3. **Áreas fora do escopo:** identificação, resultado, dashboard, sidebar, hero Registro e navegação global não mudam nesta tarefa de UI.
4. **H39 funcional separado:** as novas fontes de datação são requisito explícito já registrado (não criação livre do Codex), mas sua validação e modelo precisam de implementação/aceite próprios. **Não misturar mudanças arbitrárias no domínio com refinamento visual.**
5. **MEOWS:** somente a matriz versionada implementada; score zero só com avaliação completa; 0 ≠ não avaliado; sem inventar série, tendê ncia, recomendação ou classificação. A autorização da demonstração não aprova decisões clínicas operacionais.
6. **Sem duplicação:** um campo não pode ser editável em duas etapas com estados independentes. Se um card do concept ilustra um campo que pertence à etapa 4, usar visualização somente leitura ou outro campo já existente, sem nova entrada.
7. **Teste de fidelidade:** screenshot baseline e final nos mesmos estados em `1440,1024,768,430,390,375,320px`; conferir lado a lado com a **imagem original** de cada concept. Diferenças de conteúdo impostas pelos campos atuais devem ser anotadas, não escondidas. Se não houver imagem no ambiente Codex: `VISUAL_REFERENCE_NOT_AVAILABLE`, sem aprovação visual integral.
8. **Critério final:** "Todos os campos preservados" e "UI fiel ao concept" são **dois gates independentes**, ambos obrigatórios; uma tela bonita que perde informação é FAIL, e uma tela funcional mas distante do concept também é FAIL.

## 7. Matriz de inspeção visual obrigatória (preencher com evidências)

| Elemento | Etapa 2 | Etapa 3 | Etapa 4 |
|---|---|---|---|
| Stepper (tamanho/posição/cores) | Conferir | Conferir | Conferir |
| Ícone no cabeçalho | Gestante | ECG/Activity | Obstétrico |
| Composição macro | Card datação + 2 inferiores | Esquerda medidas+achados / direita MEOWS+alertas | 2 cards topo + clínico largura total + 3 colunas |
| Cards com borda 1px/raio16 | Conferir | Conferir | Conferir |
| Ícones rosa em tile rosa | Conferir | Conferir | Conferir |
| Inputs 44px/raio10 | Conferir | Conferir | Conferir |
| Badge e status sem invenção | Conferir | Conferir | Conferir |
| Gaps e alinhamentos | Conferir | Conferir | Conferir |
| Campos de branch íntegros | Conferir | Conferir | Conferir |
| Mobile sem overflow | Conferir | Conferir | Conferir |
| Captura lado a lado original | Evidência | Evidência | Evidência |

## 8. Entregáveis do Codex

- `docs/release/beta1-immersive-ux-h38-h43-implementation/REGISTRO-COMPARATIVO-VISUAL.md`: imagem de referência utilizada, screenshot final, diferenças, justificativa *somente de preservação de campos*, resposta PASS/FAIL.
- `MATRIZ-CAMPOS-ANTES-DEPOIS.md`: todos os bindings, opções, persistência, validações, locators e resultados de testes.
- Imagens antes/depois para cada uma das sete larguras; ao menos vazio, parcialmente preenchido, completo e com erros.
- Relatório sobre breakpoints, teclado, cor, contraste, foco, modais, autores SOAP, MEOWS incompleto/calculado e transição de etapas.
- Sem merge/deploy ou alteração da VPS, banco operacional ou ambientes anteriores.
