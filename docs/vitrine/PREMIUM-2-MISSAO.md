# MISSÃO FINAL — PAP SAÚDE | VITRINE PREMIUM 2.0
## Navegação, UX, animações, onboarding e PAP-MEOWS demonstrativo

### 0. CONTEXTO E ESTADO ATUAL

Repositório: `joaoCarlosGM/pap-saude`

Branch obrigatória de trabalho:
`feature/prod-vitrine-ui-refresh`

HEAD confirmado antes desta missão:
`aef219c97f3dc73640c4ceb508b1c2eb6b2180d5`

Branch `prod` de referência:
`40896212cb01e35fb6b204f6226b8d28ba1f6d1b`

A missão anterior já implementou:

- Base sintética unificada para pacientes, atendimentos e Dashboard.
- Registro demonstrativo com validações.
- Histórico de alergias, medicamentos, comorbidades e antecedentes.
- Prontuário e filtros de atendimentos.
- Interface demonstrativa do Chat IA.
- Primeiro componente de animação do robô.
- Testes Node e testes de navegador.
- Evidências visuais antes/depois.

**NÃO REIMPLEMENTAR O QUE JÁ ESTÁ CONCLUÍDO.**

Começar inspecionando as alterações existentes e trabalhar somente sobre os componentes necessários.

Consultar os documentos versionados em `docs/vitrine/`, principalmente `RELATORIO.md`, `VISUAL.md` e `CHECKPOINT.md`.

### 1. OBJETIVO CENTRAL

Elevar a qualidade visual e funcional da demonstração PAP Saúde, com uma experiência premium, fluida e profissional.

O operador aprovou a identidade visual atual da `prod` e confirmou que ela será referência para a futura Vitrine Comercial do P0.

**PRESERVAR:**

- Cores rosa PAP Saúde, branco e tons claros.
- Tipografia e identidade visual.
- Formato e estilo dos cartões.
- Estrutura dos oito KPIs.
- Gráficos existentes.
- Organização dos formulários.
- Estrutura dos prontuários.
- Chat IA e sua organização de conversas.
- Ordem dos módulos na navegação.
- Rotas existentes.
- Componentes e funcionalidades já implementados.

As mudanças estruturais autorizadas são especificamente as descritas nesta missão.

Não realizar redesign geral.

Não introduzir outra biblioteca de componentes.

---

# BLOCO A — NOVA ARQUITETURA VISUAL DA NAVEGAÇÃO

### A1. Remover os dois elementos horizontais superiores

Atualmente a aplicação possui:

1. Cabeçalho verde-petróleo contendo "Prontuário de Atendimento", Ajuda, notificações e perfil.
2. Faixa horizontal informando que os dados são demonstrativos.

Esses elementos ocupam espaço vertical, especialmente no Chat IA.

**Remover as duas faixas horizontais.**

Verificar principalmente:

- `src/components/layout/DashboardShell.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/demo/DemoProvider.tsx`
- `src/components/chat/ChatLayout.tsx`

Não remover funcionalidades úteis: redistribuí-las na sidebar.

O conteúdo principal deve começar próximo ao topo da área disponível.

### A2. Perfil profissional no topo da sidebar

Reorganizar a sidebar, mantendo seu fundo branco.

Ordem:

1. Logo PAP Saúde.
2. Identificação do profissional.
3. Município e UBS.
4. Identificação de ambiente demonstrativo.
5. Acessos compactos a Ajuda e Avisos.
6. Navegação principal.
7. Configurações no rodapé.

O perfil deve mostrar:

- Avatar circular rosa.
- Nome: Ana Paula (dado inicial demonstrativo).
- Função: Profissional de saúde.
- Município.
- UF.
- Nome da UBS.

Utilizar inicialmente valores claramente demonstrativos, por exemplo:

Município: Belém — PA.
Unidade: UBS Demonstrativa.

Esses valores não representam vínculo institucional oficial.

A sidebar deve continuar compacta, sem excesso de blocos, linhas divisórias ou caixas decorativas.

Se a altura da tela for reduzida, somente a região de navegação necessária deve rolar; as ações essenciais precisam continuar acessíveis.

### A3. Configurações institucionais demonstrativas

Na página Configurações, permitir editar:

- Nome do município.
- UF.
- Nome da UBS.
- Nome de exibição do profissional, se compatível com a estrutura existente.

Os valores devem atualizar imediatamente a sidebar.

Centralizar o estado demonstrativo; evitar cópias independentes em componentes diferentes.

A ação "Restaurar demonstração" deve recuperar os valores iniciais e todos os dados sintéticos, após confirmação.

Não criar vínculo com CNES, IAM, PostgreSQL ou instituições reais.

### A4. Configurações no rodapé

**Manter Configurações na parte inferior da sidebar.**

Não duplicar o botão em outro cabeçalho.

Não voltar a colocar o perfil profissional no rodapé.

### A5. Ajuda, avisos e restauração

Transferir Ajuda e Avisos do antigo Topbar para a região superior da sidebar.

- Ajuda abre o tutorial ou a central de ajuda.
- Avisos exibe somente informações demonstrativas existentes.
- Não apresentar indicador de aviso não lido sem existir notificação.
- Restaurar demonstração fica acessível no menu do perfil ou na área apropriada de Configurações.

Evitar usar `window.alert()` como solução principal; preferir os modais existentes.

### A6. Navegação mobile

No celular:

- Sidebar totalmente oculta quando fechada.
- Menu tipo drawer sobreposto.
- Nenhuma coluna vazia reservada à sidebar.
- Botão compacto e sempre acessível para abrir o menu.
- Não criar outro cabeçalho grande.
- Fechar drawer ao selecionar um módulo.
- Preservar o foco e a navegação por teclado.
- Evitar overflow horizontal.

O Chat IA possui uma segunda navegação interna, referente às conversas. Garantir que os dois menus não se sobreponham indevidamente.

Ajustar os cálculos de altura do Chat após remover o Topbar. Não deixar espaços vazios, campos cortados nem barras de rolagem duplicadas.

---

# BLOCO B — INTERAÇÃO COM PACIENTES E ATENDIMENTOS

### B1. Cartão inteiro da paciente clicável

Atualmente o prontuário é aberto principalmente por um link específico.

Modificar o comportamento:

**Clicar em qualquer região do cartão da paciente abre o prontuário correspondente.**

Inclui:

- Nome.
- Avatar.
- Informações clínicas resumidas.
- Indicadores do cartão.
- Áreas vazias internas.

Preservar o botão "Ver prontuário".

Ao passar o mouse:

- Cursor pointer.
- Realce sutil de borda ou sombra.
- Nenhuma alteração importante de tamanho ou posição.

Acessibilidade:

- Navegação por Tab.
- Abertura por Enter.
- Foco visível.
- Sem links ou botões interativos aninhados de forma inválida.
- Sem disparo duplicado de navegação.

Preferir implementação semântica com Next.js Link e superfície clicável acessível.

### B2. Atendimento inteiramente clicável

Na página Atendimentos:

- Clicar em qualquer área da linha desktop abre o modal de detalhes.
- Clicar em qualquer área do cartão mobile abre o mesmo modal.
- Preservar o botão "Detalhes".
- Preservar o acesso explícito ao prontuário da paciente.
- O clique no link da paciente não pode disparar simultaneamente o modal do atendimento.

Utilizar arquitetura acessível de eventos, foco e teclado, sem transformar inadequadamente elementos de tabela em botões inválidos.

### B3. Dashboard — atendimentos recentes

Aplicar navegação consistente à lista de atendimentos recentes.

Um clique na superfície do atendimento deve levar aos detalhes correspondentes ou abrir a visualização apropriada, sem alterar os dados ou duplicar funcionalidades.

Verificar que todos os IDs correspondem à fonte sintética centralizada.

### B4. Critérios de aceite

- Clicar no cartão de paciente abre a ficha correta.
- Clicar na linha de atendimento abre os detalhes corretos.
- Os botões internos continuam independentes.
- Mouse, teclado e touch funcionam.
- Sem navegação dupla.
- Sem mudanças visuais além de hover e foco discretos.

---

# BLOCO C — ÍCONE CHAT IA COM ESTRELAS ROSA

O componente já existe:

`src/components/chat/AnimatedChatIcon.tsx`

e seu CSS correspondente.

Melhorar o componente existente, sem recriá-lo do zero.

### Requisitos

- Preservar o robô Lucide atual.
- Três pequenas estrelas ao redor do robô.
- Estrelas obrigatoriamente na cor rosa PAP Saúde.
- Cor de referência: `#EC268F`.
- Brilho alternado e suave.
- Movimentos discretos, com intervalos.
- Não mudar a posição do robô.
- Não mudar o tamanho do item do menu.
- Não gerar layout shift.
- Respeitar `prefers-reduced-motion`.

Aplicar ao:

1. Item Chat IA na sidebar.
2. Estado inicial do Chat IA.
3. Outros locais existentes que já reutilizem o ícone, quando pertinente.

Não adicionar efeitos excessivos.

Não conectar serviços externos de IA.

A demonstração deve continuar informando que as respostas são simuladas.

---

# BLOCO D — ANIMAÇÕES PREMIUM DE NAVEGAÇÃO

## Referência visual

O operador forneceu um vídeo de uma interface SaaS com navegação lateral e transições progressivas.

A referência não deve ser copiada em identidade visual; somente o padrão de movimentos será aproveitado.

Comportamento desejado:

- Ao selecionar uma nova página, o marcador ativo da sidebar desliza até a opção escolhida.
- A página anterior sai rapidamente.
- O título da nova página aparece.
- Seus componentes entram gradualmente.
- Cartões e indicadores aparecem em sequência.
- Gráficos são apresentados progressivamente.

Usar transições contínuas, não mudanças instantâneas de cor.

### D1. Indicador deslizante na sidebar

Criar um indicador ativo rosa que se desloca entre os itens.

Características:

- Fundo rosa muito claro no item selecionado.
- Indicador rosa alinhado ao item.
- Transição suave.
- Curva de desaceleração ou spring discreta.
- Duração sugerida de 250 a 350 ms.
- Sem salto visual ao trocar de rota.
- Sem alterar a ordem dos módulos.

Preservar a localização do item ativo mesmo após recarregar a página.

### D2. Transição entre páginas

Ao navegar:

- Saída breve do conteúdo anterior.
- Entrada com fade e deslocamento vertical pequeno.
- Duração de 220 a 300 ms.
- Não animar a sidebar inteira a cada navegação.
- Não criar tela branca intermediária.
- Não bloquear interações importantes.

Evitar remount desnecessário do estado demonstrativo.

O estado compartilhado em `DemoProvider` deve permanecer intacto durante a navegação.

### D3. Dashboard — entrada escalonada dos KPIs

Preservar exatamente oito cartões na disposição responsiva existente.

Ao entrar no Dashboard:

1. Título e descrição surgem.
2. Cartões KPI aparecem em sequência.
3. Números são apresentados.
4. Gráficos aparecem.
5. Ações rápidas e demais cartões finalizam a transição.

Parâmetros sugeridos:

- Entrada dos cartões: 300–400 ms.
- Intervalo entre cartões: 60–80 ms.
- Deslocamento vertical: aproximadamente 8–12 px.
- Opacidade inicial baixa.
- Sem mudanças no grid ou na altura final.

### D4. Contadores animados

Para indicadores numéricos:

- Iniciar uma contagem visual progressiva até o valor real.
- Duração de 600–900 ms.
- Preservar unidades e formatação.
- Valores ausentes (`—`) não devem ser animados como zero.
- Não criar números aleatórios.
- Não alterar a fonte real dos indicadores.
- Não alterar valores clínicos em repouso.

Não reiniciar contadores repetidamente por mudanças irrelevantes de estado.

### D5. Gráficos

- Barras crescem da base até a altura correta.
- Linhas aparecem progressivamente.
- Duração aproximada de 700–1.000 ms.
- Valores iguais a zero permanecem com altura zero.
- Não inventar tendências.
- Não modificar o domínio ou a escala dos gráficos para produzir um efeito visual.

### D6. Outras páginas

Aplicar a mesma linguagem de entrada, de forma mais discreta:

- Pacientes: cartões surgem em sequência curta.
- Atendimentos: linhas entram suavemente.
- Registro: transição entre etapas sem perda de preenchimento.
- Chat IA: cabeçalho, conversas e mensagens aparecem coordenadamente.
- Protocolos, Cursos e Ferramentas: entradas discretas.

Não animar dados clínicos para ocultar alertas ou informações importantes.

### D7. Acessibilidade e desempenho

Obrigatório:

- `prefers-reduced-motion`.
- Foco visível.
- Sem atrasos perceptíveis para completar ações.
- Sem layout shift relevante.
- Não animar propriedades caras quando transform/opacity resolvem.
- Evitar dependências pesadas.
- Utilizar CSS/React existentes ou uma solução de animação leve quando houver justificativa.
- Não bloquear telas aguardando animações.
- Não repetir introduções longas a cada mudança de dados.

O ambiente operacional do P0 deverá utilizar animações mais discretas quando a integração for autorizada.

---

# BLOCO E — MODAL DE BOAS-VINDAS DA DEMONSTRAÇÃO

Ao iniciar uma nova sessão demonstrativa, apresentar um modal de boas-vindas.

Usar o componente Modal existente e preservar a identidade visual.

### Conteúdo obrigatório

Título:

**Bem-vindo ao PAP Saúde**

Texto:

"Explore como o PAP Saúde conecta profissionais, pacientes e informações clínicas em uma única plataforma."

Aviso principal:

**Ambiente demonstrativo**

"Todos os pacientes, atendimentos, indicadores e informações apresentados nesta versão são fictícios e utilizados exclusivamente para demonstrar as funcionalidades da plataforma."

Aviso complementar:

"Nenhuma informação desta demonstração representa um atendimento clínico real. Não insira dados pessoais ou clínicos verdadeiros."

### Ações

Botão principal:

**Iniciar tutorial guiado**

Botão secundário:

**Explorar a plataforma livremente**

O modal deve:

- Aparecer no primeiro acesso da sessão demonstrativa.
- Não reaparecer em cada mudança de rota.
- Permitir fechamento sem iniciar tutorial.
- Ser reaberto pela Ajuda.
- Utilizar controle de apresentação restrito à sessão; não armazenar dados clínicos.
- Funcionar ao acessar diretamente `/registro`, `/chat` ou outra rota demonstrativa.
- Respeitar a hidratação do Next.js, sem flicker.
- Ser responsivo e acessível.
- Não bloquear definitivamente o uso da aplicação.

Depois que o modal for fechado, manter um indicador discreto de "Modo demonstração" na sidebar.

Não criar nova faixa horizontal de aviso.

---

# BLOCO F — TUTORIAL GUIADO DA VITRINE

Criar um tutorial interativo que destaque os elementos reais das páginas.

Não entregar apenas um carrossel genérico de textos.

O tutorial deve navegar pela própria interface e mostrar onde ficam os recursos.

### Roteiro demonstrativo

**Etapa 1 — Dashboard**

Título: "Conheça o Dashboard"

Texto:
"Acompanhe os indicadores, gráficos e informações gerais do acompanhamento. Nesta demonstração, os dados são inteiramente fictícios."

Destacar a entrada Dashboard e seus cartões.

**Etapa 2 — Registro**

Título: "Registre um atendimento"

Texto:
"O Registro organiza a identificação, os dados gestacionais, os sinais vitais e o histórico clínico em etapas. Utilize apenas informações demonstrativas."

Destacar Registro e o wizard existente.

**Etapa 3 — Pacientes**

Título: "Consulte um prontuário"

Texto:
"Selecione o cartão de uma paciente para consultar sua ficha, histórico, exames, medicações e documentos."

Destacar Pacientes e um cartão sintético.

**Etapa 4 — Atendimentos**

Título: "Explore os atendimentos"

Texto:
"Consulte o histórico, utilize filtros e selecione um atendimento para visualizar os detalhes."

Destacar Atendimentos e seus controles.

**Etapa 5 — Recursos de apoio**

Título: "Conheça os recursos da plataforma"

Texto:
"Explore Protocolos, Ferramentas e Cursos. Alguns recursos são apresentados apenas para demonstração."

Destacar os módulos correspondentes.

**Etapa 6 — Chat IA**

Título: "Conheça o assistente PAP Saúde"

Texto:
"O Chat IA apresenta a experiência planejada para o assistente clínico. Nesta versão, as respostas são simuladas e não representam uma análise real por inteligência artificial."

Destacar Chat IA.

### Comportamento

- Destacar o elemento real da página.
- Escurecer discretamente o restante da interface.
- Exibir explicação junto ao elemento.
- Botões Anterior, Próximo, Pular e Concluir.
- Exibir progresso: "Etapa 2 de 6".
- Navegar entre páginas sem apagar dados demonstrativos.
- Retomar corretamente após mudança de rota.
- Permitir reiniciar pela Ajuda.
- No celular, abrir a sidebar quando necessário.
- Evitar que o tutorial cubra o elemento destacado.
- Corrigir posicionamento quando a viewport mudar.
- Manter navegação por teclado e leitor de tela.
- Não exigir que o usuário conclua o tutorial para utilizar a plataforma.

Evitar bibliotecas grandes de onboarding. Reutilizar componentes e infraestrutura existentes quando possível.

---

# BLOCO G — TUTORIAL DA PLATAFORMA CLÍNICA

O PAP Saúde P0 possui autenticação, MFA, IAM, organizações, municípios e unidades de saúde.

**NÃO modificar o P0 nesta fase.**

Desenvolver o roteiro e a arquitetura do componente de tutorial de forma que possam ser reutilizados quando a integração for aprovada.

### Roteiro clínico para PROFESSIONAL

1. Apresentar o perfil e o vínculo institucional autorizado.
2. Explicar o Dashboard operacional.
3. Mostrar a pesquisa e consulta de pacientes.
4. Explicar o fluxo de Registro e Atendimentos.
5. Apresentar Protocolos, Ferramentas, Chat IA e Configurações disponíveis.

### Roteiro administrativo

Para PAP_ADMIN, PAP_MANAGER, MUNICIPAL_ADMIN e HEALTH_UNIT_ADMIN, a apresentação deve ser adaptada às permissões efetivas.

Não mostrar botões ou recursos que a sessão não está autorizada a utilizar.

O tutorial não pode conceder privilégios, abrir dados clínicos sem autorização ou ultrapassar o IAM.

### Primeiro acesso clínico

Após MFA e autenticação completa, o sistema poderá oferecer:

"Conheça seu espaço de trabalho"

Ações:

- Iniciar tutorial.
- Agora não.

Reabrir pela Ajuda.

Não mostrar aviso de que os dados são fictícios no ambiente clínico real.

### Entrega nesta missão

Implementar completamente o tutorial da Vitrine.

Para o P0, entregar o componente reutilizável, roteiro e documentação de integração, mas NÃO alterar o repositório/branch operacional antes da aprovação manual da feature.

Se a adaptação exigir APIs, IAM ou armazenamento de preferências de primeiro acesso, deixar esse trabalho para a fase de integração P0.

---

# BLOCO H — PAP-MEOWS v1.0 DEMONSTRATIVO

## H1. Situação

O arquivo `src/lib/meows.ts` atualmente retorna score `null` e classificação indisponível.

O operador deseja ativar o cálculo na demonstração.

Existe uma especificação técnica consolidada denominada:

**PAP-MEOWS v1.0 — Especificação Clínica e Computacional Consolidada**, de 07/10/2026.

Ela se baseia na matriz de referência `PRT.UMUL.014 — HU-UFGD/Ebserh`.

O núcleo computacional foi consolidado, mas a aplicação assistencial real ainda depende de validação clínica institucional.

**Nesta missão, implementar somente o motor demonstrativo, isolado de qualquer uso assistencial real.**

Não ativar o motor em pacientes reais nem no P0.

## H2. Componentes pontuáveis

O score será a soma dos pontos de sete componentes:

`TOTAL = PAS + PAD + FC + FR + TEMPERATURA + OXIGENIO + CONSCIENCIA`

### PAS — mmHg

- <80 = 3 pontos
- 80–89 = 2
- 90–139 = 0
- 140–149 = 1
- 150–159 = 2
- ≥160 = 3

### PAD — mmHg

- ≤39 = 3
- 40–49 = 2
- 50–89 = 0
- 90–99 = 1
- 100–109 = 2
- ≥110 = 3

### Frequência cardíaca — bpm

- <60 = 3
- 60–100 = 0
- 101–110 = 1
- 111–149 = 2
- ≥150 = 3

### Frequência respiratória — irpm

- <12 = 3
- 12–17 = 0
- 18–24 = 1
- 25–29 = 2
- ≥30 = 3

### Temperatura — °C

- ≤35,0 = 3
- 35,1–37,4 = 0
- 37,5–38,9 = 1
- ≥39,0 = 3

Trabalhar com registro padronizado em uma casa decimal e validação explícita da precisão. Não fazer arredondamentos silenciosos que mudem a classificação.

### Oxigênio suplementar

- Ar ambiente = 0
- O₂ suplementar com fluxo menor que 5 L/min = 2
- O₂ suplementar com fluxo maior ou igual a 5 L/min = 3

O formulário deve distinguir explicitamente ar ambiente de oxigênio suplementar. Fluxo desconhecido não pode ser convertido em zero.

### Estado de consciência

- Alerta = 0
- Qualquer estado não alerta ou alteração de consciência = 3

Preservar a descrição detalhada selecionada pelo profissional.

### SpO₂

A saturação deve ser registrada quando disponível, mas **não soma pontos diretamente** nesta versão.

Não atribuir pontos à SpO₂ por iniciativa própria.

## H3. Campos necessários no Registro

Reutilizar os campos existentes para:

- PAS
- PAD
- Frequência cardíaca
- Frequência respiratória
- Temperatura
- Consciência
- SpO₂

Adicionar os campos ausentes relativos à oxigenoterapia:

- Ar ambiente ou O₂ suplementar.
- Fluxo em L/min quando suplementar.
- Estado desconhecido/não aferido quando apropriado.

Preservar a organização da etapa Sinais Vitais.

Não adicionar uma sexta etapa ao wizard.

## H4. Dados incompletos

Se faltar um parâmetro necessário para o cálculo:

- Status = `INCOMPLETO`.
- Não apresentar total definitivo.
- Não converter ausência em zero.
- Informar quais parâmetros faltam.
- Preservar os valores já preenchidos.
- Não classificar a paciente automaticamente como baixo risco.

Campos opcionais não pontuáveis, como SpO₂, devem continuar registrados sem modificar indevidamente o score.

## H5. Parâmetro crítico

Calcular duas saídas independentes:

1. Soma total.
2. Presença de parâmetro crítico.

`PARAMETRO_CRITICO = true` quando qualquer um dos sete componentes recebe 3 pontos.

Um único componente de 3 pontos deve gerar indicação de alerta, mesmo quando a soma total é inferior a 4.

## H6. Classificação computacional

Aplicar a ordem de precedência:

1. Se os dados necessários estiverem incompletos: `INCOMPLETO`.
2. Se total ≥ 6: `ALTO_RISCO_PELO_SCORE`.
3. Se total < 6 e houver parâmetro de 3 pontos: `ALERTA_CRITICO`.
4. Se total entre 4 e 5, sem parâmetro crítico: `MODERADO`.
5. Se total entre 1 e 3, sem parâmetro crítico: `ALERTA_REAVALIACAO`.
6. Se total = 0: `SEM_ALERTA_PELO_SCORE`.

O motor deve guardar o score, a classificação, os pontos por parâmetro, o gatilho crítico e a versão do protocolo.

A lógica matemática deverá ser pura, tipada e independente de React.

Não apresentar esses rótulos como diagnóstico definitivo.

## H7. Resultado visual

Manter o estilo atual da etapa Resultado.

Apresentar:

- Total do PAP-MEOWS.
- Classificação computacional demonstrativa.
- Indicador de parâmetro crítico.
- Tabela de parâmetros.
- Valor de cada medição.
- Pontuação individual.
- Informação sobre dados ausentes.
- Versão: PAP-MEOWS v1.0.

Destacar claramente:

**"Resultado demonstrativo. Protocolo ainda não homologado para uso assistencial nesta plataforma."**

Não gerar prescrição, tratamento ou encaminhamento automático.

Condutas e desfechos continuam sendo informações registradas manualmente no formulário demonstrativo.

## H8. Coerência com Prontuário e Dashboard

Quando um Registro demonstrativo possuir dados completos:

- Calcular o score demonstrativo.
- Associar o resultado ao atendimento criado.
- Exibir o resultado na ficha da paciente.
- Atualizar a evolução demonstrativa correspondente.
- Refletir a classificação nos indicadores aplicáveis.

Quando os dados forem incompletos:

- O atendimento permanece `NÃO AVALIADO` ou `INCOMPLETO`, conforme o domínio adotado.
- Nenhuma classificação falsa deve ser criada.
- O Dashboard não deve contar esses atendimentos como baixo risco.

Não inventar dados vitais para justificar scores antigos das fixtures.

Fixtures com scores preexistentes devem ser identificadas como ilustrativas ou migradas para exemplos completos, verificáveis e sintéticos.

## H9. Testes MEOWS

Criar testes de fronteira para todas as faixas.

Casos obrigatórios:

- PAS em 79, 80, 89, 90, 139, 140, 149, 150, 159 e 160.
- PAD em 39, 40, 49, 50, 89, 90, 99, 100, 109 e 110.
- FC em 59, 60, 100, 101, 110, 111, 149 e 150.
- FR em 11, 12, 17, 18, 24, 25, 29 e 30.
- Temperatura em 35,0; 35,1; 37,4; 37,5; 38,9 e 39,0.
- Ar ambiente, O₂ abaixo de 5 e O₂ a partir de 5 L/min.
- Consciência alerta e não alerta.
- SpO₂ não pontuável.
- Score 0.
- Score 1–3.
- Score 4–5.
- Score ≥6.
- Parâmetro crítico isolado.
- Dados obrigatórios ausentes.
- Dados inválidos.
- Salvar e recuperar o resultado em memória.
- Ausência de resultado clínico quando incompleto.

Documentar os limites de uso e a necessidade de homologação institucional antes de considerar o motor para o ambiente operacional.

---

# BLOCO I — TESTES DE EXPERIÊNCIA E REGRESSÃO VISUAL

## I1. Comparação com a versão aprovada

Usar as capturas anteriores em `docs/vitrine/evidence/`.

Gerar capturas depois das mudanças.

Comparar:

- Sidebar.
- Dashboard.
- Pacientes.
- Atendimentos.
- Registro.
- Resultado.
- Chat IA.
- Configurações.
- Modal de boas-vindas.
- Tutorial.

As únicas diferenças estruturais autorizadas são a remoção das faixas superiores e a reorganização da sidebar.

Não alterar cores, tamanhos ou disposição dos componentes internos sem necessidade técnica demonstrável.

## I2. Testes responsivos

Verificar:

- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- 1440 px

Critérios:

- Sem scroll horizontal inesperado.
- Sidebar responsiva.
- Perfil institucional legível.
- Configurações acessíveis.
- Chat IA ocupando a altura correta.
- Modais não cortados.
- Tutorial funcional no celular.
- Cards clicáveis por toque.
- Gráficos sem overflow.
- Entradas animadas sem layout shift.

## I3. Testes automatizados

Adicionar testes direcionados para:

- Perfil município/UBS e restauração.
- Sidebar e estado ativo.
- Navegação por cartões.
- Modal de boas-vindas.
- Controle de exibição por sessão.
- Tutorial completo.
- Pular/reiniciar tutorial.
- MEOWS e seus limites.
- Regressões do Registro.
- Isolamento de dados sintéticos.
- Preferência de movimento reduzido.
- Ausência de erros JavaScript.

Executar os testes já existentes em `tests/demo/`.

Não desabilitar asserts, verificações de segurança ou testes falhos para obter resultado verde.

---

# BLOCO J — FLUXO DE TRABALHO ECONÔMICO

O operador quer preservar a cota do Codex.

Trabalhar com um agente principal e testes dirigidos por bloco.

### Etapa J1 — Análise

- Confirmar HEAD da feature.
- Inspecionar os componentes existentes.
- Identificar arquivos realmente necessários.
- Preservar alterações não relacionadas.
- Evitar reinstalações e builds repetidos.

### Etapa J2 — Implementação

Ordem de trabalho:

1. Sidebar e perfil institucional.
2. Navegação por cartões.
3. Ícone Chat IA.
4. Sistema de animações.
5. Modal e tutorial.
6. Motor PAP-MEOWS.
7. Ajustes de integração entre os componentes.
8. Testes e evidências.

Executar testes direcionados após cada bloco.

### Etapa J3 — Commits

Criar commits seletivos por responsabilidade, por exemplo:

- `feat(ui): reorganize sidebar and institutional demo profile`
- `feat(ux): make patient and encounter cards interactive`
- `feat(motion): add shared navigation and progressive dashboard transitions`
- `feat(onboarding): add demo welcome and guided platform tour`
- `feat(meows): implement isolated demonstrative scoring engine`
- `test(demo): cover onboarding motion and meows boundaries`

Não usar `git add .` indiscriminadamente.

### Etapa J4 — Build e validação

Executar:

- `npm run test:demo`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Testes de navegador pertinentes.
- `git diff --check`

O build da missão anterior foi bloqueado por Google Fonts CONNECT 403.

Investigar se o bloqueio persiste no ambiente atual.

Não substituir a identidade tipográfica aprovada apenas para mascarar falha de rede.

Distinguir claramente erro externo de erro de código.

Não declarar build aprovado sem conclusão real.

### Etapa J5 — Publicação da feature

Fazer push somente para:

`feature/prod-vitrine-ui-refresh`

Não alterar diretamente `prod`.

Não executar merge ou deploy.

Não modificar VPS, SSH, Dockerfiles, workflows, Prisma, PostgreSQL, MFA ou credenciais.

Atualizar os relatórios em `docs/vitrine/`.

Entregar o SHA final e instruções para testar a feature localmente na porta 3400.

---

# BLOCO K — HOMOLOGAÇÃO EM TRÊS FASES

## Fase 1 — Feature demonstrativa

O operador testará a nova implementação na porta 3400.

A versão original da prod continuará disponível na porta 3300.

Não tocar no laboratório P0 da porta 3200.

**PARAR AO CONCLUIR ESTA FASE E ENTREGAR O COMMIT PARA TESTE MANUAL.**

Não começar a integração P0 antes de uma aprovação explícita do operador.

## Fase 2 — Integração no PAP Saúde P0

Somente após homologação da feature:

- Criar uma branch independente a partir do P0 aprovado.
- Portar seletivamente os componentes visuais e o tutorial.
- Adaptar o tutorial ao IAM e às permissões reais.
- Preservar autenticação, MFA, bancos e APIs clínicas.
- Manter dados sintéticos exclusivos da Vitrine.
- Não realizar merge direto de `prod` para P0.
- Não habilitar o PAP-MEOWS para atendimento real sem validação institucional.
- Executar o CI completo do P0.
- Homologar manualmente na porta 3200.

Essa fase exige uma nova autorização do operador.

## Fase 3 — PR para `prod`

Somente depois da homologação da feature e do P0:

- Abrir ou atualizar o PR para `prod`.
- Conferir os arquivos alterados.
- Executar e verificar CI remoto.
- Exigir build válido.
- Validar ausência de alterações de infraestrutura.
- Aguardar autorização explícita para merge.

O operador realizará o merge somente depois da aprovação.

Nenhum deploy deve ser iniciado pelo agente.

---

# BLOCO L — CRITÉRIOS FINAIS DE ACEITE

A implementação demonstrativa estará pronta para homologação manual quando:

1. A barra verde superior não existir mais.
2. A faixa horizontal de demonstração tiver sido removida.
3. O perfil estiver no topo da sidebar.
4. Município e UBS puderem ser configurados.
5. Configurações permanecerem no rodapé.
6. Ajuda, Avisos e restauração funcionarem.
7. Os cartões de pacientes forem inteiramente clicáveis.
8. Os atendimentos puderem ser abertos clicando na linha ou cartão.
9. As estrelas do Chat IA forem rosa e animadas.
10. A seleção da sidebar deslizar suavemente.
11. Os KPIs aparecerem progressivamente.
12. Os números e gráficos tiverem animações discretas.
13. O modal de boas-vindas apresentar o aviso de dados fictícios.
14. O tutorial demonstrativo estiver completo e navegável.
15. O roteiro clínico estiver documentado para integração posterior.
16. O PAP-MEOWS demonstrativo possuir motor de cálculo e testes de fronteira.
17. Dados incompletos não produzirem classificação falsamente normal.
18. As páginas preservarem o design aprovado.
19. Mobile, teclado e movimento reduzido funcionarem.
20. P0, banco, VPS, autenticação e infraestrutura permanecerem intocados.

### RELATÓRIO FINAL OBRIGATÓRIO

Fornecer:

- Branch e SHA final.
- Commits criados.
- Arquivos modificados.
- Funcionalidades concluídas.
- Testes executados e resultados.
- Capturas comparativas.
- Resultado real do build.
- Problemas remanescentes.
- Instruções para iniciar o preview na porta 3400.
- Confirmação de ausência de merge/deploy.
- Confirmação de que o P0 e a VPS não foram alterados.

**REGRA FINAL: preservar a experiência visual aprovada, aplicar as melhorias solicitadas e entregar uma feature pronta para avaliação humana — sem publicar em produção.**