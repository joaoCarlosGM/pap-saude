# PAP SAÚDE — ESPECIFICAÇÃO VISUAL EXATA DO REGISTRO, ETAPAS 2–4
**Contrato de execução para o Codex · PAP-B1-UX-04 / H39–H41 · 27/11/2026**
**Estado:** apenas documentação; NÃO alterar o aplicativo, banco nem produção. **Branch de origem:** `feature/beta1-ux-final-h29-h37-rc`.

## 0. Fonte e cláusula de NÃO INVENÇÃO
Esta especificação formaliza os **concepts visuais aprovados na conversa**: (i) Gestação atual, (ii) Sinais vitais da consulta + painel MEOWS, (iii) Dados Obstétricos e Clínicos. Compare os arquivos locais/arquivos originais do projeto; **as imagens concept não estão anexadas como bitmaps ao GitHub**. Ao executar, solicitar/anexar os concepts originários para conferência visual pixel a pixel; se não disponíveis, cumprir este documento e marcar comparação de imagem como PENDENTE, não inventar um concept substituto.

**Alteração de UI/UX não é autorização para apagar, esconder permanentemente, alterar semântica ou inventar um dado clínico.** A Etapa 2 recebe somente extensões de datação já expressamente solicitadas (DUM / ultrassom-exame / DPP conhecida); Etapas 3 e 4 devem conservar todos os contratos da base, reorganizando sua apresentação. Nenhum dado copiado das ilustrações deve ser salvo automaticamente.

**Leituras obrigatórias:** `CONTRATO-VISUAL-APROVADO.md`, `REGISTRO-ETAPAS-2-3-4.md`, `CHECKLIST-VISUAL-E-REGRESSAO.md`, `AGENTS.md`, as skills `pap-saude-concept-fidelity`, `pap-saude-registration-ux`, `pap-saude-ui-design`, `pap-saude-visual-qa`, `pap-saude-clinical-ux`.

## 1. Moldura e navegação — igual nas três etapas
- Manter `RegistrationWizard.tsx` e o stepper `Stepper.tsx` com cinco etapas: **Identificação → Gestação → Sinais Vitais → Dados Obstétricos → Resultado**. Passo concluído usa círculo com `Check` branco; passo atual círculo rosa número branco; próximos círculo cinza. Linha fina conectando os círculos; label abaixo, centralizado; **não renomear endpoints, IDs, passos ou alterar ordem**.
- No desktop, área central existente `max-w-5xl` do wizard (aumentar somente se houver necessidade comprovada de acomodar cards sem romper o shell). Não criar um novo menu lateral, fundo de página, modal de tela inteira ou barra duplicada; `views/registro.tsx` e hero institucional permanecem. Área entre cabeçalho da etapa e primeiro card ~24px.
- Cada cabeçalho interno de etapa: ícone Lucide de traço (~22–26px) em bloco rosa pálido **52×52px**, `rounded-xl` 12–14px; título em negrito navy `text-slate-900` 20–24px; subtítulo 13–14px `text-slate-600`. Alinhar verticalmente com espaço de 16px; sem gradiente forte/avatares.
- Cards: `bg-white`, `border border-slate-200` 1px, cantos `rounded-2xl` ~16px, preenchimento 20–24px desktop e 16px mobile; títulos 16–18px, ícone rosa sobre fundo `pink-50` 44–48px, subtítulo discreto. Espaçamento entre cards 16–20px. Evitar bordas múltiplas e "cards dentro de cards" desnecessários.
- Labels 13–14px legíveis sempre visíveis sobre inputs; input/select mínimo **44px**, raio 8–10px, fundo branco, borda cinza-claro, unidade alinhada à direita sem sobrepor texto. Foco com anel rosa acessível. Campo número sem spinner inadequado no mobile; máscara de data respeita locale pt-BR (valor interno ISO).
- Botões inferiores: **Voltar** delineado / **Próximo** ou **Ver Resultado** rosa institucional, ambos altura mínima 44px e raio 10–12px; manter ações e tratamento de erros do wizard; não colocar botão salvamento de atendimento nas etapas intermediárias.
- Regra mobile: <=390px uma coluna de cards, labels legíveis, botões ocupam largura apropriada, sem overflow horizontal. Entre 768–1024px reflow natural antes de manter 3 colunas apertadas. Controles de segmented devem quebrar/rolar **localmente**, não o documento.
- Ícones devem vir de `lucide-react`, sem bibliotecas ou fontes novas: etapa 2 `CalendarDays` / `Baby` existente (conferir import), etapa 3 `Activity` ou `HeartPulse`, etapa 4 `Stethoscope`/`ClipboardList`; seção de edema `Droplet`; SOAP `NotebookPen` ou `FilePenLine`; alergias `AlertTriangle`, medicações `Pill`, comorbidades `ClipboardList`. Se um nome não existir na versão instalada, usar equivalente Lucide semanticamente idêntico, justificando; **não criar ícone arbitrário**.
- Paleta dos cards vem do PAP, acento primário `#C41469`, `slate-900` corpo, `slate-600` apoio, `slate-200` bordas. Azul, violeta, verde e vermelho **somente** como semântica específica existente e válida, não como marca alternativa.
- Animar troca de passo com a transição existente (`data-motion-step`); 180–250ms suave, sem slide horizontal que encubra campos. `prefers-reduced-motion` não anima. Nunca substituir uma ação por botão decorativo.

## 2. ETAPA 2 — Gestação atual
### 2.1 Composição espacial exata
```text
[ícone rosa]  Gestação atual
              Defina a datação gestacional e os dados desta gestação.

┌─────────────────────────────────────────────────────────────────────┐
│  ORIGEM DA DATAÇÃO                    │ IG ATUAL                    │
│  [ Por DUM | Por ultrassom/exame |    │ 17 semanas e 5 dias*        │
│    DPP conhecida ]                    │ DPP: 30/04/2027*            │
│  [Campos da origem escolhida]         │ TRIMESTRE: 2º*              │
│  [Fonte, justificativa, vínculo]      │ Referência: dia da consulta │
├───────────────────────────────────────┴─────────────────────────────┤
│  É o primeiro atendimento desta gestação? [Sim] [Não]               │
└─────────────────────────────────────────────────────────────────────┘
                    [Voltar]                       [Próximo]
```
`*` Os valores são EXEMPLOS tipográficos, não valores a salvar ou inferir. Painel resultado deve mostrar `Aguardando datação` se campos faltantes.
- **Card superior** dois painéis desktop, formulário 2/3 e painel de síntese 1/3 separado por divisor vertical neutro; no mobile resultados abaixo. Painel à direita possui três linhas/tiles sutis em rosa quase branco com ícones `CalendarDays` para DPP, `Baby`/alternativo para IG, `Layers` para trimestre. Sem 3 caixas grandes desperdiçando largura.
- **Seletor de fonte** segmented único: "Por DUM", "Por ultrassom/exame", "DPP conhecida", ativo borda rosa e fundo rosa translúcido; não permitir seleção múltipla, não modificar datação confirmada silenciosamente.
- **Por DUM:** campo data com ícone calendário, checkbox/ação "DUM desconhecida" que não significa data negativa. Preservar `dum` e `dumUnknown`; qualquer mudança propaga IG/DPP/trimestre ao painel (calcular apenas com referência real). DUM futura inválida.
- **Por USG/exame (novo requisito funcional H39):** data do exame; IG documentada **em semanas e dias em dois controles** (não texto livre único); tipo de exame e fonte do laudo / ID de anexo da paciente, se disponível; painel de síntese com IG atual e DPP derivadas do exame + tempo transcorrido. Não aceitar um exame sem data ou sem IG medida; conservar DUM original se existir; registrar qual fonte foi **adotada**.
- **Por DPP conhecida (novo H39):** data da DPP, fonte documental ou justificativa e responsável da confirmação; IG calculada por reversão de 40 semanas apenas quando o contrato clínico da fonte permitir, sempre rotulada como estimativa. Sem inventar DUM verdadeira. Não sobrescrever DPP anterior sem revisão/retificação.
- **Pergunta já existente:** `primeiroAtendimento: boolean|null` visível em bloco compacto integrado à parte inferior da seção, `Sim`/`Não`; não deixá-la desaparecer porque faltou no concept ilustrado.
- **Campos NÃO desta etapa:** G/P/C/perdas pertencem ao `ClinicalHistory.tsx` na etapa 4; "gestação gemelar", "alto risco", "unidade", "pré-natal iniciado" aparecem em arte de referência mas **não existem no contrato atual** — NÃO ADICIONAR sem solicitação independente. Não copiar `18/01/2027` ou `12s3d` da arte.
### 2.2 Comportamentos
- Não usar `DEMO_DATE='2026-10-28'` em cálculo, `input max` nem validação. Referência no fuso configurado da UBS, preferencialmente `America/Belem` neste laboratório conforme configuração real, sem atrelar a cidade do usuário no código. Consultas passadas mantêm data de ocorrência; próximas são projeção.
- Diferença em dias civis e resto da divisão por 7, sem ambiguidade UTC/horário de verão. DPP por DUM = 280 dias. Datação USG e DPP conhecida são **fontes documentadas distintas**, com correção versionada.
- Não "normalizar" valores de exame sem validação e rastreabilidade. Se troca a origem adotada, mostrar revisão de impacto (IG, DPP, trimestre), guardar origem e evitar apagar uma datação previamente confirmada.
- Fonte, data de cálculo e estado `estimativa` devem estar visíveis no painel, de forma discreta.

## 3. ETAPA 3 — Sinais vitais da consulta
### 3.1 Composição espacial exata
```text
[ícone Activity rosa]  Sinais vitais da consulta
                       Registre as medidas verificadas neste atendimento.

┌──────────── ÁREA DE MEDIÇÕES (≈66%) ───────────┐ ┌── MEOWS (≈34%) ──┐
│ [ PAS  mmHg ] [ PAD  mmHg ] [ FC bpm ]          │ │ score / estado    │
│ [ FR irpm   ] [ Temp °C   ] [ SatO2 %]         │ │ parâmetros        │
│                                                 │ │ histórico real*   │
│ ─ Avaliação complementar ─                     │ │ detalhes de pontos│
│ [Oxigenação] [Fluxo O2 condicional]             │ └──────────────────┘
│ [Nível consciência] [Débito urinário]           │
│ [Proteinúria teste] [Método condicional]        │
│ [▸ Resultado laboratorial quantitativo]        │
└─────────────────────────────────────────────────┘
                        [Voltar]                      [Próximo]
```
`*` Gráfico só com avaliações concluídas e registradas em datas reais **do cenário sintético**, nunca repetir pontos artificiais dentro da mesma consulta.
- **Seis mini-cards no alto** 3×2 desktop, borda 1px, raio 14–16, padding 14–16: PAS / PAD / FC na primeira linha; FR / Temperatura / SatO₂ na segunda. Cabeçalho de cada um: ícone menor 36–40px rosa pálido + label. Input único com unidade à direita, mantendo legibilidade em coluna 66%.
- Para largura 768–1024, permitir cards 2×3 e painel MEOWS abaixo se necessário; no mobile 1×6 ou 2×3 quando couber sem esmagar labels.
- **Complementares em card/área distinta** abaixo dos seis: 
  - `oxygenMode` = `unknown|air|supplemental` (labels Desconhecido/não aferido, Ar ambiente, Oxigênio suplementar).
  - `oxygenFlow` L/min somente se `supplemental`, deve aceitar decimal local e ser >0 para avaliação válida.
  - `nivelConsciencia`: Alerta, Confusa, Sonolenta, Inconsciente, ou não informado.
  - `debitoUrinario`: Normal, Reduzido, Ausente ou não informado.
  - Proteinúria `nao_realizado|negativa|tracos|1+|2+|3+`; quando realizada mostrar `proteinuriaMethod` (`fita|outro`); checkbox/disclosure para `proteinuriaLab` com os **quatro campos** `value,unit,date,method`.
- **MEOWS** na direita como card único, topo com `Activity`/ícone gráfico, score grande **somente se calculado**; badge da classificação vinda do algoritmo; lista/accordion `Entender pontuação` mostra parâmetros que compõem a soma. Enquanto incompleto, mostrar `Aguardando parâmetros` + campos faltantes; nunca 0 ou baixo risco fictício.
- Informações de oxigenação, consciência e proteinúria não ficam escondidas em UI impossível de encontrar; disclosure por escolha explícita apenas para laboratório quantitativo. `Voltar`/`Próximo` seguem contrato.
- MEOWS calculado com contrato atual `src/features/vitrine-premium/lib/demo/meows.ts`: PAS, PAD, FC, FR, temperatura, oxigênio, consciência. **SatO₂, proteinúria e débito urinário coletados mas não pontuam diretamente nessa matriz**. Não alterar limites, classificação ou pesos por estética. Usar o mesmo cálculo da etapa 5 e histórico, sem duplicar algoritmo em componente.
- Não inserir novos campos `Glicemia capilar` e `EVA`: aparecem apenas no concept gerado, não em `RegistrationData`.
- **Não incluir recomendações automáticas clínicas** escritas pelo Codex. Se houver explicação de riscos, fornecer fonte de protocolo auditável e nunca alegar validação operacional só porque a demonstração foi autorizada.
### 3.2 Estado e teste
Entrada vazia = campos sem medição; avaliações parciais não impedem navegar quando o contrato permite; erros de faixa física e PAS<=PAD geram aviso focado (não mutação oculta); `inputMode` decimal/integer adequado; estado do painel recalcula a partir do draft sem gravar automaticamente uma consulta.

## 4. ETAPA 4 — Dados Obstétricos e Clínicos
### 4.1 Composição espacial exata
```text
[ícone obstétrico rosa] Dados Obstétricos e Clínicos
                        Informações obstétricas e clínicas deste atendimento.

┌──── Avaliação obstétrica (~55%) ────┐ ┌──── Edema (~45%) ──────────────┐
│ [Altura uterina] [BCF]              │ │ [Gradação]                     │
│ [Movimentação] [Sangramento]        │ │ [Localizações SE 1+ a 4+]     │
│ [Peso atual]                        │ │ [Outra localização se marcada] │
└─────────────────────────────────────┘ └────────────────────────────────┘

┌──── Registro clínico do atendimento ────────────────────────────────┐
│ [Queixa principal (linha inteira, max 200)]                         │
│ [S Subjetivo] [O Objetivo]                                          │
│ [A Avaliação] [P Plano]                                             │
│ [Adicionar anotação]   [Histórico existente em disclosure]          │
└─────────────────────────────────────────────────────────────────────┘

┌──── Alergias, medicações e comorbidades ─────────────────────────────┐
│ [Alergias]    │ [Medicações em uso] │ [Comorbidades]                 │
│ estado real   │ estado real         │ estado real                   │
│ [Gerenciar]   │ [Adicionar]         │ [Gerenciar]                   │
│ conteúdo expansível de cada lista, sem exclusão silenciosa         │
├──────────────────────────────────────────────────────────────────────┤
│ [▸ Antecedentes obstétricos: Gestações / Partos / Cesáreas / Perdas]│
└──────────────────────────────────────────────────────────────────────┘
                         [Voltar]              [Ver Resultado]
```
- **Card Avaliação obstétrica** 55%: `alturaUterina` cm; `bcf` bpm; `movimentacaoFetal` `presente|reduzida|ausente`; `sangramentoVaginal` `ausente|leve|moderado|intenso`; `pesoAtual` kg, inclusive zeros e desconhecidos conforme validação.
- **Card Edema** 45%: `edema` `nao_avaliado|ausente|1+/4+|2+/4+|3+/4+|4+/4+`; quando graduação ausente/não avaliado, **não renderizar** campos ou caixa reservada de localização — concept tinha placeholder cinza, mas usuário pediu especificamente que localização SÓ EXISTA se houver edema. Quando positivo, exibir checkboxes `membros_inferiores|maos|face|generalizado|outro`; `edemaOtherLocation` visível só quando Outro, preservar `edemaProvenance`. Limpar localizações ocultas ao mudar grau; evitar salvar dados inconsistentes.
- **Card Registro Clínico**: `queixasPrincipais` texto max 200, e **SOAP completo com 4 áreas** `subjective|objective|assessment|plan`, em grade 2×2; autoria informativa da sessão; botão `Adicionar anotação` só habilita com conteúdo, impede sair com rascunho pendente; `SoapHistory` e `observacoesProfissional` legado acessíveis. **O concept tinha apenas três áreas genéricas** para forma; estas NÃO substituem as quatro seções SOAP. Conservar `onAppend` e autor do servidor, não mostrar dropdown de profissionais.
- **Card História clínica**: três colunas desktop (uma por assunto), sem abrir todos os editores de uma vez. Cada coluna mostra estado derivado sem falsificar ausência:
  - Alergias: `allergyStatus` desconhecido/sim/nao, coleção `allergies` múltipla `agent|reaction|notes`, botão `Adicionar/Gerenciar`, editar/remover explicitamente com confirmação/contexto.
  - Medicações: `medications[]` múltiplas `name|dose|frequency|route`; nenhuma entrada = `Sem informação registrada`; botão Adicionar; expansão de linhas em painel do próprio card ou modal consistente, sem perder campos nem formulário antigo.
  - Comorbidades: `comorbidityStatus` desconhecido/sim/nao, `conditions[]` múltipla. `não investigado` e `investigado sem relato` distintos.
  - Antecedentes `pregnancies|deliveries|cesareans|pregnancyLosses` em disclosure abaixo dessas colunas, acessível sem abandonar etapa 4; validar partos+perdas<=gestações e cesáreas<=partos conforme contrato atual. Não mover para etapa 2 sem necessidade/sem alterar o fluxo aprovado.
- Histórico longitudinal do prontuário não pode ser apagado quando o novo atendimento omite medicamento, alergia ou comorbidade. Anotações SOAP legadas permanecem.
- **Não duplicar datador gestacional da etapa 2** no topo da etapa 4, embora o concept de etapa 4 antigo tenha mostrado um card de datação: a datação aparece unificada na etapa 2 e a etapa 4 dedica-se a exame/registro/antecedentes.

## 5. Matriz de DOM visual e edição mínima por componente
| Arquivo | Responsabilidade após redesign | NÃO ALTERAR |
|---|---|---|
| `views/registro.tsx` | manter rota/hero e título | shell/toolbar/ícones globais |
| `components/registro/Stepper.tsx` | manter círculos, connectors, labels, mobile | 5 etapas, ordem, status |
| `steps/PregnancyStep.tsx` | layout etapa 2, fonte da datação, painel IG/DPP | primeiro atendimento, DUM, histórico |
| `steps/VitalSignsStep.tsx` | 6 cards + complementares + MEOWS | 13 grupos atuais, mesmas unidades/enum |
| `steps/ObstetricStep.tsx` | grade obstétrico/edema, SOAP, história | todos valores, limites e mudanças |
| `RecordFields.tsx` | proteinúria/edema condicionais | testes, métodos, lab, proveniência |
| `SoapNotes.tsx` | SOAP 2×2 com explicações breves | S/O/A/P, autor, ID, recordedAt, histórico |
| `ClinicalHistory.tsx` | resumo 3-colunas + editores progressivos | alergias, medicações, condições, antecedentes |
| `RegistrationWizard.tsx` | estado e persistência compartilhados | validação por etapa, botão Salvar só etapa 5, retomada |
| `types/registration.ts` | somente estender datação H39 com tipos auditáveis | não renomear/remover campos |
| `lib/demo/{validation,meows,data}.ts` | separar datação real e cálculo MEOWS central | nenhuma mudança em limiares clínicos sem autorização |
| `steps/ResultStep.tsx` | preservar resultado, conduta e resumo final | nenhuma remoção de valores/revisões |

## 6. Checklist de qualidade OBJETIVO
- Capturas reais antes/depois por etapa em 1440, 1024, 768, 430, 390, 375 e 320px; evidência do estado de campo vazio e preenchido.
- `STEP 2`: DUM, DUM desconhecida, primeiro atendimento, USG, DPP conhecida, IG histórica/atual, fonte e trimestre, sem data fixa; menus visíveis no teclado.
- `STEP 3`: 6 cards/13 grupos; oxigenação air/supplemental com fluxo, consciência, débito, proteinúria qualitativo/método/lab; score incompleto vs completo; campo não-salvo não cria medição fictícia.
- `STEP 4`: 5 obstétricos, edema condicional com locais/Outro, queixa, S/O/A/P, 3 grupos clínicos e antecedentes; contagens múltiplas e persistência; nenhuma info omitida.
- `STEP 5`: resumo final e avaliação permanecem semanticamente corretos, mesmo com datação nova; sem apagar evoluções anteriores. Testes integrados com paciente A e B, sem vazamento.
- Quando um campo ou validador desaparecer, **FAIL**, mesmo que screenshots sejam parecidas. Quando o executor não tiver a imagem original, registrar **comparação visual exata não executada** em vez de inventar PASS.
- `PASS` exige funcionamento + estética + fonte/segurança; projeto não pode ser declarado pronto com modais, dados ou botões falsos.

## 7. Convenções de entrega
Produzir screenshots, diff de componentes e `MATRIZ-CAMPO-ANTES-DEPOIS.md` com DOM locator, ligação ao contrato e teste de cada campo. Não instalar novo pacote de UI, não alterar produção/VPS/banco 15436/porta 3600; branch de execução isolada `feature/beta1-immersive-ux-h38-h43-rc`. Não fazer deploy nem merge.
