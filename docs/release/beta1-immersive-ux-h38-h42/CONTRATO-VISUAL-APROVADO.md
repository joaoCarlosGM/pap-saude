# PAP-B1-UX-04 — Contrato visual fechado (H38–H42 + Agenda)
**Base auditada:** `feature/beta1-ux-final-h29-h37-rc` @ `af79307cab705264d38cb971bd67c1058efbca25`. **Status: DOCUMENTAÇÃO PARA CODEX; não foi implementado nesta atualização.**

## A. O que foi aprovado e o que não é autorização para inventar
Conceitos aprovados em conversa pelo operador: **Resumo Assistencial (H32), telas Registro Etapa 2/3/4, fluxograma por construção animada H42**. Duas capturas adicionais de homologação mostram que a Agenda está sem hero/banner, ao contrário de Registro. O concept é um *contrato de composição*, não uma fonte de novos parâmetros clínicos. Onde o concept traz valores, nomes, IG, datas, scores, frases de tratamento, doses ou exames extras: **apenas ilustração**; utilizar dados reais da fixture sintética, nunca hardcode.

As imagens aprovadas estão no histórico da conversa do operador, não foram incorporadas como bitmaps à branch por esta alteração. Para alegar comparação pixel a pixel é obrigatório anexá-las à execução do Codex; **se ausentes, não alegar PASS visual de alta fidelidade**. Referência textual precisa abaixo, sem substituir telas preexistentes.

## B. Design tokens — usar os que já existem
- **Acento principal institucional:** rosa PAP `#C41469` (referência dos SVGs `public/brand/banners/{registro,atendimentos}.svg`); pode reutilizar classes pink já presentes, sem misturar novas famílias de cores.
- **Fundo da página:** cinza-neutro quase branco do tema vigente; superfícies **brancas**; texto navy/slate existente `text-slate-900`; secundário `text-slate-600`; borda `border-slate-200`.
- **Ícone de seção:** área rosa pálido `bg-pink-50`, ícone rosa, quadrado de **48–56px**, `rounded-xl` (~12px), sem sombra exagerada. Não usar emojis no produto.
- **Cards principais:** `rounded-2xl` ou equivalente existente de raio **16px**, borda 1px neutra, sombra de baixa elevação apenas se já usada na página; `padding:20–24px` desktop / `16px` mobile.
- **Campos:** altura mínima **44px**, borda 1px cinza, raio **8–10px** (`rounded-lg`), label acima (12–14px, sem gerar labels flutuantes); unidade no lado direito dentro do input, foco institucional rosa claro com outline visível. Separação vertical **8px** label→campo, **16–20px** entre campos.
- **CTA primário:** rosa PAP sólido, texto branco, altura ≥44px, raio **10–12px**. **Secundário:** branco com contorno rosa/cinza e texto rosa/slate. Não criar mais de um botão chamativo por módulo.
- **Badge:** pequeno, `rounded-full`, valor proveniente do estado; verde apenas para semântica validada (não para prometer baixo risco quando MEOWS incompleto); não usar badges decorativas.
- **Grade:** desktop cartões adjacentes com gap **16–20px**; mobile uma coluna sem corte de conteúdos; conteúdo centrado em max-width existente; sem largura fixa que gere overflow.
- **Tipografia:** fonte já usada pela aplicação; H1 24–28px conforme shell, título de módulo 18–20px, label 13–14px, dado principal 24–32px e body 14–16px; jamais encolher fonte até ilegível para caber.
- **Animação:** 180–350ms transições de card/foco, construção de fluxograma sequencial por nó/aresta; respeitar `prefers-reduced-motion` e permitir pular.
- **Ícones Lucide presentes:** `CalendarDays`/ `Calendar` para gestação/agendamento; `Activity`/ `HeartPulse` sinais vitais; `Baby` ou `PersonStanding` (usar somente ícones existentes, não desenhar bebê duplicado); `Droplet` edema; `Stethoscope` exame clínico/SOAP; `Pill` medicação; `ClipboardList` registro; `ChevronLeft`/`ChevronRight` navegação; `Plus`, `Minus`, `Play`, `Pause`, `RotateCcw`, `Maximize`, `FileText` fluxograma; `Syringe` vacinação; `FlaskConical` exames. Não trocar semântica por ícones aleatórios. Confirmar os nomes e imports existentes no pacote.

## C. Etapa 2 — layout aprovado (Gestação)
- **Shell:** manter título Registro e Stepper 1 Identificação → 2 Gestação → 3 Sinais Vitais → 4 Dados Obstétricos e Clínicos → 5 Resultado; passo atual rosa, anteriores com check, futuros neutros. Sem trocar espaçamento, lógica ou ordem.
- **Cabeçalho da etapa:** ícone rosa 52px à esquerda, título `Gestação atual`, subtítulo uma linha, margem 24px até card.
- **Card superior único:** `Origem da datação` na área principal (aprox 2/3 desktop), resultados num painel lateral rosa pálido (aprox 1/3 desktop). Segmented control `Por DUM | Por ultrassom/exame | DPP conhecida`; opção ativa rosa suave com borda rosa, outras brancas. Sem modalidade selecionada não definir DPP/IG.
- **Formulário condicional:** Por DUM exibe campo DUM e opção de DUM desconhecida; por ultrassom exibe data real do exame, IG no exame (semanas+dias), tipo de exame, fonte/anexo; DPP conhecida exibe data DPP, origem e justificativa/documento. Sempre manter primeiro atendimento nesta gestação (Sim/Não) como bloco compacto **imediatamente abaixo do card de datação**, não pode desaparecer.
- **Painel de resultado:** IG atual, DPP e trimestre em três pequenas áreas com ícones; cada dado vem da fonte escolhida. Exibir referência temporal ao lado. Ausência: `Não informado` / `Aguardando datação`, não valor inventado.
- **O desenho aprovado mostra Histórico Obstétrico e Contexto da Gestação**: não deslocar os antecedentes de `ClinicalHistory.tsx` na etapa 4 para etapa 2 sem contrato/migração aprovada; aqui usar somente campos existentes e novos campos explicitamente da datação. Gestação gemelar, risco e unidade são **apenas elementos visuais ilustrativos** e não devem ser criados por iniciativa do Codex.
- **Rodapé:** mesmo Voltar (outlined) / Próximo (pink) de todas etapas.

## D. Etapa 3 — layout aprovado (Sinais Vitais)
- **Cabeçalho:** `Sinais vitais da consulta`, ícone ECG rosa.
- **Desktop:** 2 colunas: **66% área de formulário à esquerda**, **34% painel MEOWS à direita**. Formulário inicia com 3 colunas × 2 linhas de mini-cards de medida. As seis medidas são **PAS, PAD, FC, FR, temperatura, SatO₂**, nesta ordem da esquerda para direita e de cima para baixo. Cada mini-card com ícone pequeno 40px, label completo sem cortar, input de uma linha com unidade alinhada.
- **Complementares abaixo**: Oxigenação (`desconhecido, ar ambiente, O₂ suplementar` e fluxo L/min somente suplementar); nível consciência; débito urinário; proteinúria qualitativa (`não realizado, negativa, traços, 1+, 2+, 3+`) com método quando necessário e laboratório quantitativo em disclosure `Adicionar resultado laboratorial`, preservando valor/unidade/data/método. NUNCA omitir campos porque ausentes na imagem.
- **Glicemia capilar e escala EVA que aparecem no concept visual são EXTRAS NÃO EXISTENTES no contrato atual.** Não implementar sem tarefa separada, modelo de dados e aceite.
- **MEOWS lateral:** painel de score em destaque quando `CALCULADO`; quando `INCOMPLETO`, `Aguardando parâmetros` com lista mínima do que falta, sem zero; renderizar tabela de pontuação/explicações em disclosure `Entender resultado`. Se há avaliações longitudinais, curva com datas válidas. **Não inventar uma evolução "Inicial/Após SV/Atual" com três pontos idênticos**, porque a imagem os mostra apenas para ilustrar estilo.
- **Recomendações automáticas do concept não viram conduta clínica.** Se não houver regra clínica validada, trocar por legenda neutra de critério/abertura do protocolo. Cálculo demonstrativo da matriz atual permitido para pacientes sintéticos; acesso clínico real segue gates.
- **Mobile:** cards métricos em 1–2 colunas conforme largura, MEOWS abaixo da entrada, sem sidebar fixa invadindo viewport.

## E. Etapa 4 — layout aprovado (Obstétricos e Clínicos)
- Cabeçalho da etapa: ícone rosa, título `Dados Obstétricos e Clínicos`.
- **Datação gestacional do concept da etapa 4** foi reorganizada e passa a ser responsabilidade da **etapa 2**, evitar formulário duplicado na etapa 4.
- **Primeira linha:** card `Avaliação obstétrica` aprox 55% + card `Edema` aprox 45%, gap 16–20px. Avaliação: altura uterina/cm, BCF/bpm, movimentação fetal, sangramento vaginal, peso atual/kg (manter campos atuais). Edema: seleção graduação `Não avaliado, Ausente, 1+/4+, 2+/4+, 3+/4+, 4+/4+`; locais somente com edema graduado, limpar ocultos; desenho branco/rosa simples, sem caixa cinza clicável falsa.
- **Segunda linha:** card `Registro clínico do atendimento`: manter **Queixa principal** e quatro campos SOAP S/O/A/P (o concept reduz a três áreas para legibilidade ilustrativa; **NÃO eliminar Avaliação/SOAP**). Preferência: queixa em linha e SOAP 2×2 em disclosure aberto por padrão, autoria sintética da sessão informativa, histórico existente preservado. Não dropdown para escolher outro autor.
- **Terceira linha:** card `Alergias, medicações e comorbidades` em três colunas com estado resumido, ação discreta Adicionar/Gerenciar e expansão de formulário sob demanda: investigação alergias `desconhecido/sim com relato/sim sem relato`, substância/reação/observação; medicamentos nome/dose/frequência/via e múltiplas entradas; comorbidade status desconhecido/condições/sem relato + lista; manter antecedentes obstétricos com G/partos/cesáreas/perdas **no mesmo passo** em seção expansível `Antecedentes obstétricos` (sem esconder possibilidade de preenchimento).
- **Não apresentar "sem alergias" ou "sem medicamentos" por falta de informação**; usar `Não investigado`, `Sem informação registrada` ou `Investigado sem relato` conforme estado.
- CTA Voltar/Ver Resultado no padrão do Stepper; não quebrar validação nem banco.

## F. Fluxograma H42 — layout aprovado
- Shell de Protocolos e tabs preservados; canvas branco com borda 1px e raio 16px; toolbar horizontal `Reproduzir | Pausar/Continuar | Reiniciar | Ver completo | PDF original | Zoom | Tela cheia`. Compactar botões no mobile sem esconder `Ver completo`.
- **Cor dos NÓS do flow redesenhado:** PAP magenta no foco, superfícies brancas/rosa pálido, conexões slate + magenta ao serem reveladas. NÃO usar verde-laranja-vermelho dos PDFs para a nova visualização. PDF original intacto, acesso na própria tela.
- Blocos com raio 10–14px, ícones Lucide semânticos, hierarquia nó título em 14–16px; detalhes clínicos disponíveis em painel de expansão/detalhe textual associado, não condensados em resumo incorreto. Cada `SIM/NÃO`, seta lateral, retorno e nota preservados.
- Frame inicial sem conteúdo clínico exibido `A animação vai começar`, em seguida surgem nós e arestas até diagrama completo; click `Ver completo` instantâneo. 250–350ms por unidade/aresta, delay curto, navegável mesmo se usuário pausar; sem autotratamento.
- Seguir `FLUXOGRAMAS-CONSTRUCAO-PROGRESSIVA.md` para estados 0/25/50/75/100% e confronto fonte PDF.

## G. Agenda — MESMO BANNER/THUMBNAIL DAS OUTRAS PÁGINAS
Comparação de homologação mostra **Agenda sem arte do banner** e Registro com faixa rosa decorativa. Causa no código: `src/components/premium/RouteHero.tsx` tem `sections` mas **não inclui chave `agenda`**. `SectionHero.tsx` carrega `/brand/banners/${visual}.svg`. Assets vigentes `public/brand/banners/registro.svg` e `atendimentos.svg`: `960×220`, `viewBox="0 0 960 220"`, `rx=20`, degradê `#FFF0F7→#F6CBE0`, curvas de fundo e contorno de ícone `#C41469`.

**Contrato de correção:**
1. Adicionar `agenda:["Agenda","agenda"]` em `RouteHero.sections`. Reutilizar `SectionHero`, não criar novo hero nem segunda faixa.
2. Criar `public/brand/banners/agenda.svg` como VARIANTE do mesmo template e dimensões. **Ícone central `CalendarDays`**: contorno de calendário rosa, encadernação e grade 2×3 dias, no MESMO local/tamanho do SVG `atendimentos.svg`. Resto do gradiente, curvas, raios, opacidade, padrão, margem e proporção = iguais aos irmãos. SVG puramente decorativo `alt="" aria-hidden` conforme `SectionHero`.
3. `AgendaPage` continua com h1/listagem/filtros/botão existentes imediatamente abaixo do hero. Não duplicar h1 dentro de hero? O `RouteHero` usa `headingAs="p"`, portanto pode preservar h1 da página. Não mover o botão Novo compromisso nem apagar filtros.
4. Banner Agenda deve aparecer tanto em ambiente Vitrine quanto nos caminhos equivalentes que usam `RouteHero` sem conflito visual. Legenda do banner: preferir `Agenda`; não criar copy longa ou repetir "Compromissos sintéticos deste navegador" no hero.
5. Testar pixel alignment: banner `Agenda` vs `Registro` vs `Atendimentos` no mesmo viewport 1440/390; mesmas dimensões/raio/gradiente e apenas ícone/título diferentes.
6. Nenhuma alteração à sidebar ou semântica dos compromissos.

## H. Regra de resultado
`PASS UI` somente se composição segue referência, todos campos atuais funcionam, não há dados clínicos fictícios implícitos, banner Agenda igual aos outros e testes de interação passam. Se a imagem original da conversa não estiver disponível ao executor, classificar comparação visual exata `PENDING REFERENCE IMAGE`, nunca PASS por aproximação.
