# PAP Saúde Beta 1 — Checklist de aceite das correções H01–H17
**Criado em 22/11/2026 — operador único da homologação**. Complementa \`AJUSTES-POS-HOMOLOGACAO-2026-11-22.md\`. Os itens abaixo são critérios **futuros** e estão inicialmente **PENDENTES/NOT RUN**; PASS de suites anteriores não equivale à aprovação destas mudanças.

## 1. Como registrar cada evidência
Para cada ID e caso:
- \`PASS\`: reproduzido com ação real, resultado visível e evidência identificada.
- \`FAIL\`: desvio observado, reprodução e captura/log sanitizado.
- \`BLOCKED\`: depende de autorização, revisão documental/clínica ou recurso inexistente; indicar razão.
- \`NOT RUN\`: ainda não testado; **não** contabilizar como aprovado.
- \`N/A\`: não aplicável à Vitrine, com justificativa explícita.
- Evidência = SHA testado, ambiente, browser/viewport, data, comandos reais e screenshot/vídeo sanitizados. Nunca incluir token QR ativo, chave, CPF/RG real, paciente real, PIN de pareamento ou certificados privados.

**Regras de liberação:**
- **Gate UX:** H01–H17 avaliados com operador; não aprovar quando apenas alguns itens são resolvidos.
- **Gate funcional:** fluxos QR, emissão, impressão, PDFs, navegação, avisos e atendimento em browser real.
- **Gate documental:** transcrição/fluxo/itens do PDF comparados com originais e com estado de revisão; conteúdo que dependa de julgamento clínico fica limitado a consulta até revisão qualificada.
- **Gate de segurança:** fronteira fixture/standalone, expirados/revogados, anti-IDOR, nenhuma permissão clínica ampliada, sem dados reais.
- **Gate de deploy futuro:** separado desta homologação, necessita CI/scanners, licenças/atribuição e GO explícito. Documentação não autoriza deploy.

## 2. Roteiro manual canônico — Desktop + Mobile

### H17 / H01 — Webcam e pós-detecção
- [ ] Câmera inativa: modal limpo e preview não aparenta vídeo ativo.
- [ ] Abrir câmera exige clique e permissão; posição do QR visível e legível em 320/390/1440.
- [ ] Um QR **válido e ativo** provoca uma única leitura; encerra imediatamente tracks, RAF, modal, foco no card renderizado.
- [ ] QR inválido/expirado/revogado **não** revela identidade e não avança.
- [ ] Após leitura aparece ilustração real da carteirinha, não somente linha com nome e botões; informações pré-confirmação minimizadas.
- [ ] Card mostra “Continuar” e “Adicionar mais carteirinhas” como ações principais; “Remover” discreto.
- [ ] “Adicionar mais” reabre a câmera **somente quando clicado**; mantém primeira miniatura; ao detectar outro QR fecha de novo.
- [ ] QR duplicado não cria segundo card; contador correto; teto de candidatos respeitado.
- [ ] “Continuar” pede CPF ou RG da gestante selecionada; erro não exibe prontuário/queixas; sucesso do demo oferece prontuário ou segue Registro etapas 2–5.
- [ ] Se usuário cancelar/perder permissão/background, liberar tracks, permitir retry e importação PNG/código.
- [ ] Conflitos assíncronos (dois frames, câmera ocupada, sessão expirada, rede caída) não duplicam estado.
- [ ] Webcam física do PC aprovada; câmera traseira de celular físico via HTTPS aprovada, senão NOT RUN explícito.

### H03 / H04 / H08 / H09 — Cartão e Documentos
- [ ] Nenhum botão de emitir/reemitir solto sob os cards da **listagem** de Pacientes.
- [ ] Abrir prontuário da paciente → Documentos mostra “Emitir” se ausente ou item de carteirinha se presente.
- [ ] Cartão frente rosa sólido real da Vitrine com texto branco; **sem logo**; nome, idade, número de gestação e DPP legíveis; sem confundir 2ª gestação com 2º trimestre.
- [ ] Verso branco, QR preto no branco com margem; texto enxuto, dados datados; fonte/proveniência onde aplicável.
- [ ] Existe modelo P&B legível e econômico em toner, para **frente e verso**.
- [ ] Clicar na carteirinha abre preview frente/verso; não exibe PNG de debug.
- [ ] “Imprimir” gera layout próprio sem navegação, modais ou botões; testar A4 e escala/tamanho; QR escaneável no papel.
- [ ] Download PNG e PDF reais, colorido e P&B, conteúdo corresponde ao preview e ao token vigente.
- [ ] Cartão original fica revogado após reemissão e o QR anterior é negado; versão atual ativa fica em Documentos; histórico visível sem enganar status.
- [ ] Verso padrão mínimo não divulga informações clínicas desnecessárias; versão detalhada requer seleção consciente e apenas valores existentes.
- [ ] Alergias não registradas ≠ negação de alergias; IG/MEOWS/queixa têm data e fonte; informações antigas não aparecem como atuais.
- [ ] Sessão expirada nega abrir imagens privadas e downloads; não vaza token QR em HTML, URL de imagem sem sessão, logs ou artefatos de build.
- [ ] Cadastro sintético novo, emissão, upload, reinício e recuperação do mesmo cartão continuam funcionando; documentos anexados não desaparecem.

### H02 / H05 / H07 / H13 — PAP-Protocols
- [ ] Biblioteca mantém design/conceito já aprovado; cards/consulta não foram redesenhados sem necessidade.
- [ ] Detalhes têm somente “Voltar aos protocolos” antes do título; **sem breadcrumb duplicado**.
- [ ] Voltar preserva busca/filtros quando tecnicamente possível; deep link/tab/reload/Back funcionam.
- [ ] As **quatro abas** seguem presentes: Visão geral, Fluxograma, Checklist, Documento original.
- [ ] Visão geral inclui conteúdo documental estruturado e utilizável, não sucessão de parágrafos e frases sobre homologação.
- [ ] Cada bloco clínico verificável tem documento, versão, seção, página digital e referência original.
- [ ] Fluxograma em interface navegável com nós/ramos/zoom/pan/tela cheia/ajustar e texto alternativo, **quando** conteúdo foi fielmente estruturado.
- [ ] Em trecho não validado, fluxograma original permanece como fallback identificado, **não** é declarado interativo concluído.
- [ ] Fluxograma não ocupa janelinha de PDF com rolagem da página + rolagem interna; em celular pan/zoom de toque funciona.
- [ ] Checklist contém itens reais extraídos do documento e grupos, distinção transcrito/adaptado; marcar significa apenas “li”, não execução clínica.
- [ ] Não inventar doses, diagnósticos, tratamentos, decisões ou critério de MEOWS/omqSOFA.
- [ ] Os três documentos (hipertensivas 25p, HPP 34p, sepse 36p digitais) abrem, fazem zoom/páginas e baixam **bytes originais idênticos** no escopo autorizado.
- [ ] Separar revisão clínica/direitos em metadata/rodapé discreto; não repetir avisos grandes em cada card.
- [ ] Capturas 320/375/390/430/768/1024/1440, claro/escuro, teclado, touch, sem overflow, contraste AA.
- [ ] Títulos longos, tabs, lateral/aside, toolbar, elementos sticky e retorno não encobrem leitura.

### H06 — Animações Premium
- [ ] Diferenças observadas com baseline commit \`0e0a2d8\` registradas.
- [ ] Entrada de página/título/KPIs/gráficos/navegação e microinterações conferidas em browser; evidência de duração/frames, não apenas grep CSS.
- [ ] \`prefers-reduced-motion: reduce\` desativa transições relevantes e mantém navegação completa.
- [ ] Nenhuma regressão em dark/light ou mobile; performance preservada.

### H10 / H11 — Perfil e foto
- [ ] Bloco sidebar mostra avatar, nome completo, função, UBS e cidade/UF em hierarquia legível.
- [ ] Em 320/375/390px menu não corta nome/ações nem passa por cima de conteúdo.
- [ ] Configurações permite upload de foto válida, preview/crop, salvar, substituir, remover, fallback iniciais.
- [ ] Arquivo inválido/oversized é recusado; EXIF e blob URLs tratados; armazenamento limita-se ao demo.
- [ ] Foto aparece no sidebar e Perfil; comportamento após refresh/reset documentado e testado.

### H12 — Avisos
- [ ] “Avisos” abre modal **Caixa de entrada** com contador de não lidos.
- [ ] Filtros Todos/Pacientes/Atendimentos/Sistema/Protocolos/Documentos; texto vazio e estados acessíveis.
- [ ] Itens exibem título, resumo, data e prioridade moderada; leitura/não leitura muda corretamente.
- [ ] Marcar tudo como lido funciona; clicar abre destino contextual existente/autorizado.
- [ ] Não aparecem alertas clínicos inventados/urgências falsas; eventos sintéticos são atribuíveis às ações do demo.
- [ ] Modal obedece H15.

### H14 — Histórico do atendimento
- [ ] Modal não repete apenas nome/score/IG da tabela; inclui seções com queixa, aferições, obstetrícia, evolução, avaliações, ações registradas e documentos conforme dados disponíveis.
- [ ] Timeline ordenada com autor, data/hora, evento, proveniência e mudança anterior→novo **quando existe histórico real**.
- [ ] Vários registros de PA/FC/FR/SpO2 etc. só se exibem se realmente existem; sem extrapolação retroativa de score.
- [ ] Se fixture só possui data/score, exibe “Sem histórico disponível”/“Não registrado”, sem preencher conteúdo fictício.
- [ ] Link para prontuário é ação separada e semanticamente válida; o modal não altera atendimento ao ser consultado.

### H15 — Modais
- [ ] Modal informativo possui apenas X (sem segundo “Fechar” no rodapé).
- [ ] Clique no backdrop fecha; clique dentro NÃO fecha; Escape fecha.
- [ ] Foco fica contido e retorna ao disparador; scroll de fundo bloqueado; mobile acessível.
- [ ] Formulários com alterações não salvas/ações irreversíveis solicitam confirmação antes de descartar.
- [ ] “Abrir ficha” não fica aninhado dentro de botão “Fechar”.

### H16 — Linguagem e painel técnico
- [ ] Painel fixo “PDFs privados • consulta autorizada” sai da área de navegação corrente.
- [ ] A autorização privada continua obrigatória e acessível em Configurações de homologação ou prompt contextual mínimo; sessão/expiração/revogação continuam reais.
- [ ] Removidas mensagens longas e repetidas sobre “bytes SHA”, “redistribuição”, “modo demonstração”, “revisão”, mas sem esconder status médico relevante em local apropriado.
- [ ] Interface visualmente comparável à experiência Premium; nenhum falso “produto clínico homologado” ou transparência enganosa.

## 3. Testes automatizados mínimos adicionais
- \`QR_SCAN_VALID_AUTO_CLOSE\`: chamar \`onScan\` com token real do laboratório privado, garantir \`MediaStreamTrack.stop\` em todas as tracks, modal fechado, preview/miniatura exibido, foco correto; verify zero continue automatic.
- \`QR_ADD_MORE_SINGLE_USE\`: clique “Adicionar mais”, novo stream, card anterior persistido, novo QR encerra de novo, dedup.
- \`QR_NEGATIVE\`: expirada/revogada/malformed/forged/origin/permission denied; zero identity disclosure.
- \`CARD_VISUAL_PRINT\`: templates color/P&B frente/verso, data/gestação corretos, PNG/PDF exportáveis, QR real legível via jsQR, ausência do token em logs.
- \`CARD_SCOPE\`: operações em paciente A não expõem B, revogação anterior e histórico; PDF/PNG exigem sessão.
- \`DOCS_PLACEMENT\`: emissão ausente na listagem e presente em Documentos.
- \`PROTOCOL_BREADCRUMB\`: só botão volta; filtros preservados e deep links OK.
- \`PROTOCOL_STRUCTURED_SOURCE\`: blocos/itens/nós com referência de página/versão; original byte-idêntico; ausência de texto filler sem fonte.
- \`MODAL_INTERACTION\`: click outside/Escape/focus, proteção de formulários dirty.
- \`NOTICES_EVENTS\`: filtros, unread, links, dedup, nenhum alerta clínico inventado.
- \`ENCOUNTER_TIMELINE\`: sequência registrada corretamente, lacunas explícitas, dados clínicos não forjados.
- \`PROFILE_PHOTO\`: filtro MIME/bytes/EXIF/refresh/fallback; storage demo isolado.
- \`PROD_BOUNDARY\`: HTTP/RSC de \`/homologacao/**\` continuam 404 no build público mesmo com flag; sem review DB, arquivos \`.local\` e endpoints LAN no standalone; IAM/MFA intactos.
- \`FULL_REGRESSION\`: tests PAP-ID/Protocolos/Vitrine, TypeScript, lint, build, browser, test WSL+LAN físico marcado NOT RUN se ausente.

## 4. Matriz de evidências a preencher pelo executor

| ID | Estado inicial | Evidência exigida |
|---|---|---|
| H01 | NOT RUN | Webcam desktop/mobile, gravação de estados |
| H02 | NOT RUN | Screenshot fluxo original e estruturado + pan/zoom |
| H03 | NOT RUN | Frente/verso colorido e P&B renderizados |
| H04 | NOT RUN | Matriz campo/valor/fonte/data/privacidade |
| H05 | NOT RUN | Capturas sete viewports e acessibilidade |
| H06 | NOT RUN | Filme de navegação ou medições reais |
| H07 | NOT RUN | Captura sem breadcrumb + retorno filtros |
| H08 | NOT RUN | Listagem sem botão + guia Documentos com ações |
| H09 | NOT RUN | PDF/PNG/print e QR físico/virtual |
| H10 | NOT RUN | Sidebar desktop e 375px |
| H11 | NOT RUN | Upload/crop/refresh/fallback |
| H12 | NOT RUN | Modal de caixa de entrada e interações |
| H13 | NOT RUN | Cada um dos três documentos estruturado e rastreado |
| H14 | NOT RUN | Timeline com casos com/sem eventos reais |
| H15 | NOT RUN | Backdrop/Escape/focus + dirty form |
| H16 | NOT RUN | UX limpa + sessão privada continua protegida |
| H17 | NOT RUN | Vídeo de um QR → câmera fecha → cartão → Adicionar mais |

**Definição de pronto:** todos os IDs possuem resultado específico, sem PASS presumido; riscos/limites documentados; decisão final do operador. Preservar NO-GO para deploy até aprovação separada.
