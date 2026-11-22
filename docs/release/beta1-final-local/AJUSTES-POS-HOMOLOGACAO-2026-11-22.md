# PAP Saúde Beta 1 — Requisitos pós-homologação visual e funcional
**Registro de solicitações do operador — 22/11/2026**  
**Branch observada:** \`feature/beta1-final-local-acceptance-rc\`  
**Base de comparação:** HEAD previamente auditado \`096e9f83b0f4a0895581d6e6a03cd691b92612a5\` (conferir novamente antes de implementar).  
**Status:** especificação de 17 pendências; **NÃO é evidência de implementação ou autorização de deploy**.  
**Escopo:** somente Vitrine Premium demonstrativa e ambiente isolado; não atualizar código operacional, IAM, MFA, LMS ou VPS.  

## 0. Decisão de produto e escopo

A experiência atual tem funcionalidades testadas, mas o operador **não aprovou o acabamento e a lógica de várias telas**. Corrigir a interação de ponta a ponta, sem reimplementar funcionalidades já aceitas desnecessariamente. A biblioteca de Protocolos e a identidade geral da Vitrine tinham conceito visual aprovado: preservar a direção, **melhorar o conteúdo e a experiência interna**. Evitar novos componentes que pareçam painéis de depuração, formulários extensos ou textos institucionais repetitivos.

**Diretriz UX:** produto moderno, leve e objetivo, com paleta/tokens já existentes; rosa principal de referência \`#C41469\` (inspecionar CSS real), fundo neutro, tipografia legível, microinterações preservadas. A versão VPS aprovada tinha OCI \`org.opencontainers.image.revision=0e0a2d816729cd68bebdc6c1a0339b2c8a19b861\`, digest \`sha256:a536276abc4a67335df11d5e54820297d0a49c24d03241cbb02eee02d3384b1c\`. Comparar motion sem copiar componentes antigos indiscriminadamente.

**Aprovação:** o operador é o aprovador desta etapa de UX e funcionalidade. Não exigir equipe adicional para escolher cores, layouts, labels ou fluxos sintéticos. Isso **não** converte uma tela em regra clínica homologada, nem transforma conteúdo institucional público em autorização irrestrita de distribuição comercial. Manter bloqueios reais de acesso, fronteira entre demonstração e prontuário clínico, e rastreabilidade dos PDFs.

### Índice canônico das 17 pendências
| ID | Área | Solicitação |
|---|---|---|
| H01 | Registro | Modal da câmera PAP-ID |
| H02 | Protocolos | Fluxograma como experiência navegável, não PDF embutido |
| H03 | PAP-ID | Design minimalista da carteirinha frente/verso |
| H04 | PAP-ID | Dados pertinentes e verificáveis no verso |
| H05 | Protocolos | Responsividade e fidelidade às referências |
| H06 | Vitrine | Paridade das animações com a VPS |
| H07 | Protocolos | Apenas botão “Voltar aos protocolos” |
| H08 | Pacientes | Emissão/reemissão somente dentro de Documentos |
| H09 | Documentos | Visualizar e imprimir carteirinha, PNG/PDF e P&B |
| H10 | Sidebar | Redesenhar perfil do profissional |
| H11 | Perfil | Upload, recorte e persistência de foto |
| H12 | Avisos | Caixa de entrada em modal |
| H13 | Protocolos | Converter conteúdo dos 3 PDFs em interfaces clínicas de consulta |
| H14 | Atendimentos | Histórico completo e cronologia de cada consulta |
| H15 | UI | Padronizar fechamento de modais |
| H16 | UX geral | Reduzir avisos repetidos de homologação e textos técnicos |
| H17 | Registro | Ao detectar QR válido, PARAR câmera e mostrar carteirinha; “Adicionar mais” reabre |

---

## H01 — Modal de escaneamento PAP-ID [P1, dependente de H17]

**Captura descrita:** modal “Escanear carteirinha PAP-ID” mostra preview escuro, texto “Carteirinha detectada”, seletor de câmera e botão “Ativar câmera” ao mesmo tempo, gerando ambiguidade.

**Estado esperado** (máquina de estados explícita):
1. \`idle\`: instrução breve + botão “Ativar câmera”; nenhum preview preto que pareça stream ativo.
2. \`requesting-permission\`: loader, só uma solicitação de permissão por ação.
3. \`scanning\`: vídeo real, máscara de enquadramento, feedback “Aponte para o QR”, opções mínimas (trocar dispositivo quando houver, cancelar).
4. \`resolving\`: QR capturado; interromper decodificação, mostrar confirmação transitória sem revelar dados antes de verificar token/sessão.
5. \`detected\`: **sair do leitor** e mostrar o cartão na etapa de Registro (H17).
6. \`invalid | expired | revoked | offline | denied\`: erro inteligível, sem identidade; retry, PNG ou código; câmera sempre sob controle do usuário.
7. \`closed\`: \`MediaStreamTrack.stop()\` em TODOS os tracks, limpar \`srcObject\`, RAF/timeouts, no stale callbacks.

**UI:** bordas simples, espaço adequado, ícone Lucide, foco visível, CTA primário inequívoco, seletor secundário se necessário. Sem duplicar “Ativar câmera” depois de leitura concluída. Suportar webcam USB/integrada e traseira do celular com HTTPS confiável. Frames nunca persistidos/transferidos a terceiros. Não criar loops de permissão, race conditions ou modal preso quando o browser retorna background.

**Arquivo provável:** \`src/features/vitrine-premium/components/registro/CameraScanner.tsx\`; inspecionar também modal base e \`IdentificationStep.tsx\`.

## H02 — Fluxograma funcional, distinto de “Documento original” [P0]

**Problema demonstrado:** a aba Fluxograma exibe quase exclusivamente uma página do PDF dentro do leitor; barra de controles extensa, janela interna pequena e rolagem aninhada. O usuário precisa “ler o PDF de novo” em vez de navegar por conteúdo estruturado.

**Alvo de experiência:**
- Canvas/área principal ampla e adaptável, controles compactos de \`+\`, \`−\`, “Ajustar”, “Tela cheia” e “Abrir fonte”; pan/gestos/toque/teclado, sem duplas barras de rolagem.
- Reconstruir **estrutura fiel à fonte** em nós/arestas navegáveis *quando verificável*, com hierarquia visual e ramos claros; cada nó tem ID estável, título, tipo, página/versão e eventual condição textual verificável. Zoom não muda conteúdo.
- Disponibilizar **figura original integral** em alternância “Figura original”, como evidência visual e fallback quando a transcrição dos nós não tiver sido aprovada. Não chamar PDF embutido sozinho de fluxograma interativo concluído.
- Mobile com pan/zoom por toque, botão reset, leitura alternativa em lista, sem scroll horizontal da página inteira.
- Não automatizar diagnóstico, dose, decisão terapêutica, execução de conduta ou cálculo de risco a partir do conteúdo extraído sem revisão clínica qualificada. Se não for possível extrair certo ramo com fidelidade, registrar pendência explícita e oferecer original, sem inventar.

**Arquivos prováveis:** \`components/protocolos/{ProtocolDetail,OriginalPdfViewer}.tsx\`, \`lib/protocol-{content,display,originals}.ts\`; \`docs/protocolos/documentos-originais/*.pdf\`.

## H03 — Carteirinha PAP-ID definitiva (design) [P0]

**Direção aprovada na conversa:** formato horizontal com cantos arredondados, **sem logo** no cartão, minimalista, tipografia moderna, muito espaço em branco/respiração e poucos elementos. **Frente colorida = fundo sólido rosa PAP Saúde e texto branco**. Não usar azul, gradientes dramáticos, ondas excessivas, badges numerosos ou ilustrações dominantes. Uma silhueta de gestante monocromática discreta pode ser usada SOMENTE se não comprometer espaço e legibilidade.

**Frente colorida:** “PAP-ID / Carteirinha da Gestante”; **nome completo** em destaque; **idade**; **número da gestação** (1ª, 2ª, 3ª...; NÃO confundir com trimestre); **DPP**; identificação curta legível não sensível, se necessária. Valores inexistentes = “Não informado”. Adaptar para nomes longos e impressão real.
**Verso colorido:** fundo claro/superfície branca, texto escuro com acentos em rosa PAP, e QR CODE **preto sobre branco** com margem de silêncio e contraste suficientes para câmera/impressora. Info clínica compacta, hierarquizada (H04). Evitar QR rosa que degrade leitura.
**Monocromática:** frente e verso equivalentes, contrastes e espaçamentos consistentes; sem fundos totalmente pretos que gastem toner (versão P&B com fundo branco, preto/cinzas).
**Artefatos:** frente e verso renderizados programaticamente, com modelo compartilhado para preview/PNG/PDF/print, e QR real no local correto. Não apenas uma imagem ilustrativa não funcional. Tomar o conceito aprovado na conversa como direção; não confundir o preview gerado pelo modelo gráfico com arquivo final imprimível ou QR verificável.

**Estado atual inspecionado:** \`scripts/private-review/card-image.ts\` ainda produz PNG sintético antigo de 1050×600, branco e com dados fictícios de depuração; substituir/estender seu renderer respeitando o contrato de token opaco e as chaves privadas existentes. Não imprimir CPF/RG/CNS no QR. Manter separação de template demo e modelo operacional futuro.

## H04 — Conteúdo pertinente do verso [P0, segurança clínica e privacidade]

A conversa solicita dados que ajudem o profissional a tomar decisões rápidas. A proposta de campos **não equivale a uma recomendação assistencial**:
- **Alergias conhecidas e verificadas** (com data e fonte; se não há registro: “Sem registro de alergias”, nunca “Sem alergias”).
- **Idade gestacional** na **data de referência** (não marcar como “atual” uma impressão antiga).
- **Última queixa registrada + data**; descrição curta, truncamento controlado e link QR para detalhamento autorizado. Não usar queixa simulada como dado real.
- **Último MEOWS** somente se houver avaliação verificável, valores necessários, data/hora e contexto; não interpretar escore antigo como risco atual. Se fixture histórica não sustenta o cálculo, omitir score ou indicar “Não disponível”, não inventar.
- **UBS de referência/origem** quando comprovada, sem criar vínculo automaticamente.
- Preferência por mostrar **data de emissão/atualização do cartão** e texto breve “Confira dados atualizados no sistema” porque alergias, risco e queixas podem mudar.

**Regra de minimização:** cartão físico pode circular/ser fotografado. Fazer **versão padrão mínima** (frente com dados de identificação e verso com QR + validade/atualização) e **versão expandida demonstrativa opcional, mediante ação explícita do operador**, com últimos dados pertinentes; o QR continua opaco e nunca revela prontuário sozinho. Não inserir dados reais no fixture. Conferir disponibilidade/last_updated e proveniência antes de incluir qualquer campo sensível.

## H05 — Protocolos responsivos e fiéis aos conceitos [P0]

Biblioteca foi previamente aprovada como direção. **Não redesenhá-la indiscriminadamente**. Os detalhes/abas e navegação precisam refletir as **nove imagens** de \`docs/protocolos/referencias/\` e especificação \`docs/protocolos/PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md\`.
- Verificar 320/375/390/430/768/1024/1440 px, portrait/landscape, light/dark, zoom browser, nomes extensos, tab focus, touch target ≥44 px, AA, \`prefers-reduced-motion\`.
- Layout 1 coluna em mobile e 2 colunas com aside útil quando couber; cabeçalho e tabs não podem ficar minúsculos; sem overflow ou rolagem horizontal global.
- Conteúdo não deve ser apenas cartões preenchidos com prosa; entregar densidade informacional e hierarquia apropriadas ao enfermeiro.
- Capturas comparativas **antes/depois** por aba/protocolo, com anotação das diferenças frente ao conceito original.

## H06 — Animações e microinterações da Vitrine [P1]

Fonte comprovada VPS Admin Beta/Comercial: commit \`0e0a2d816729cd68bebdc6c1a0339b2c8a19b861\`, imagem \`pap-saude-admin-beta\` digest \`a536276abc4a...\`. Os componentes motion/shell já foram comparados e relatados como byte-equivalentes, mas o usuário não percebeu os efeitos durante a homologação.
- Comparar **comportamento efetivo**: entrada página/título, KPI/stagger, gráfico, navegação, modal, menus. Inspecionar montagem da fixture e estilos computados, não apenas arquivos.
- Investigar \`prefers-reduced-motion\`, modo development, velocidade, viewport, overlays, timing, HMR.
- Não aumentar animação artificialmente se desrespeitar usuário com movimento reduzido. Corrigir regressões reais, gravar vídeo curto/séries de frames e demonstrar no browser de teste.

## H07 — Remover breadcrumb redundante em detalhes de protocolo [P1]

A captura mostra botão **“Voltar aos protocolos”** e logo abaixo link \`Protocolos / [nome]\`. Manter **apenas o botão de voltar**, antes do título principal. Remover breadcrumb redundante deste layout (a especificação histórica prevê breadcrumb; **esta decisão do operador é posterior e prevalece para a Vitrine**).
- Preservar deep links \`?protocolo=...&aba=...\`, histórico navegador, foco, e preferencialmente pesquisa/filtros ativos ao retornar.
- Não retirar o título do protocolo nem quebrar a navegação pelo teclado.

## H08 — Mover emissão/reemissão para Documentos do prontuário [P0]

Remover botão solto “Emitir/Reemitir carteirinha” debaixo de cada cartão da listagem geral de pacientes. A lista vira navegação para o prontuário. Na guia **Documentos em anexo**:
- Se não existe credencial: “Emitir carteirinha PAP-ID”.
- Se existe: resumo do cartão atual e ações “Visualizar”, “Imprimir”, “Baixar”, “Reemitir” (com confirmação de revogação do cartão anterior), “Revogar” (com confirmação).
- Ações vinculadas ao ID de paciente/subject corretos, com persistência e histórico, sem duplicar cadastro.
- Cadastro de gestante nova segue existente; emissão deve ser oferecida após cadastro por acesso a Documentos (pode CTA de navegação), sem botão operacional perdido na listagem.

**Arquivos candidatos:** \`components/pacientes/{PatientList,PrivatePatientDocuments,PatientCardIssuer,DemoPatientView}.tsx\`, \`components/demo/DemoPatientsView.tsx\`.

## H09 — Prévia, impressão e exportação da carteirinha [P0]

- Clicar no item **Carteirinha PAP-ID** em Documentos abre um visualizador claro em modal ou página focada, com **frente e verso**, flip/tabs legíveis, nome/versão, QR legível, data de emissão e situação (ativa/reemitida/revogada/expirada).
- Ações reais: “Imprimir”, “Baixar PDF”, “Baixar PNG” e versão “Colorida / Preto e branco”.
- \`@media print\`: tamanho físico consistente, margens, fidelidade do QR, frente/verso separados de elementos da aplicação, sem sidebar/controles/popovers. PDF/PNG gerados pelo mesmo template e dados.
- Revisar política de cartão inválido: histórico pode ser consultado, mas não apresentado como válido; watermark/aviso pontual em cartões revogados/expirados e QR que não resolve. Não imprimir snapshots com dados sensíveis sem a opção explícita H04.
- Testar impressão real/virtual em A4 e papel adequado, QR por webcam após impressão e download; não apenas \`window.print()\` sem layout.

## H10 — Redesenhar bloco do perfil na sidebar [P1]

A captura mostra “PAP Saúde”, iniciais em círculo, “Ana Paula”, “Profissional de saúde”, “Belém — PA”, “UBS Demonstrativa”, texto rosa repetitivo sobre vínculo fictício e dois links “Ajuda” e “Avisos” pouco organizados.

**Composição desejada:** foto/avatar à esquerda, nome **completo** e função à direita; UBS selecionada, cidade/UF abaixo em duas linhas discretas; chevron de perfil; ações Ajuda e Avisos alinhadas; menu para Configurações/Editar perfil. Evitar poluição e repetir “demo” em bloco isolado. Usar mesmo alinhamento/ritmo/tokens Premium; manter sidebar útil em 320/375 px e acessível.
Não afirmar vínculo profissional real ou permissão clínica apenas pelo layout.

## H11 — Foto do profissional [P1]

- Upload pela área Configurações/Perfil e/ou menu do avatar; preview, reposicionar/recortar, salvar, remover, fallback iniciais.
- Validar tipo real PNG/JPEG/WebP, dimensões, limite de bytes, metadados/EXIF, orientação e tratamento de erro. Não aceitar SVG arbitrário/script; não deixar blob URL sem revogação.
- Na Vitrine demonstrativa, usar armazenamento **local de demonstração** controlado ou adaptador isolado, jamais conectar automaticamente conta clínica/serviço de imagem real. Esclarecer persistência esperada e não prometer sincronização de foto se houver apenas memória.
- Testar refresh, reset de demonstração e foto quebrada; avatar da sidebar sincronizado com Perfil.

## H12 — Avisos como caixa de entrada [P1]

Ao clicar em “Avisos” na sidebar, abrir **modal acessível de caixa de entrada**, não apenas texto curto:
- cabeçalho “Caixa de entrada” e contador de não lidos; filtros Todos / Pacientes / Atendimentos / Sistema / Protocolos / Documentos;
- itens com título claro, corpo breve, horário, prioridade (não usar semântica clínica alarmista), status lido/não lido, contexto e link seguro para paciente/documento/protocolo;
- ações abrir, marcar lido e “Marcar todos como lidos”; estados vazio/carregamento/erro; scroll interno próprio acessível;
- origem dos avisos na Vitrine: eventos sintéticos genuínos do ambiente de demonstração (p. ex. documento anexado, cartão reemitido, atualização de protocolo), sem **fabricar sinais clínicos, risco ou alertas críticos** como fatos. Deduplicação e preferências coerentes em memória ou storage demo isolado.
- Em clínico real, uma central de notificações exigirá controles próprios e não será habilitada por este fixture.

## H13 — Protocolos: PDFs como fontes de **telas de consulta úteis** [P0, requisito prioritário]

**Falha funcional percebida:** o Codex usa os originais para renderizar PDF e alguns resumos, mas o profissional continua fazendo trabalho manual para encontrar critérios, checklists, fluxos, referências rápidas. A biblioteca está aprovada; foco agora é a **experiência dentro das 4 abas**:
1. **Visão geral**: blocos curtos de objetivo, aplicabilidade, classificações, critérios e sinais de alerta **extraídos da fonte**; tabelas/cards densos, busca/âncoras, fontes por bloco, indicação de validade e original.
2. **Fluxograma**: fluxo estruturado fiel e legível quando tecnicamente validável, com condições e ramos vinculados a páginas (H02); fallback explícito para imagem original se não for possível garantir fidelidade.
3. **Checklist**: itens e grupos do documento original, não “li a página” ou checklist genérico; distinção entre transcrição literal, adaptação editorial e item pendente de revisão; progresso **apenas de leitura/consulta** no demo, não registro de conduta.
4. **Documento original**: leitor PDF completo com zoom, página, busca se suportada e **download byte-idêntico**, sem confundi-lo com aba Fluxograma.

**Três fontes reais e páginas para investigação**:
- \`sindromes-hipertensivas-gestacao.pdf\` — 25 páginas; versão 01; fluxograma na digital 22; checklist/seções relevantes próximas de 14–16, kit 20–21;
- \`hemorragia-pos-parto.pdf\` — 34 páginas; versão 03; manejo nas digitais 24–28, kit 30–31, fluxograma 32;
- \`sepse-obstetrica.pdf\` — 36 páginas digitais, com duplicação textual e divergências documentais; fluxo na digital 15, kit 8, monitoramento 13, ficha 17. Não harmonizar códigos divergentes automaticamente.

**Regra de conteúdo:** criar um inventário seção/página/versão/trecho e um modelo de dados estruturado, com revisão de transcrição de cada nó/item. Os PDFs são a única fonte de afirmação clínica específica nesta missão; **não gerar recomendações/doses/scores por improviso da IA**. Divergência, falta de nitidez, dose/critério ambíguo = BLOCKED para conversão interativa daquele trecho até revisor clínico; documento original permanece consultável no escopo permitido. A IA não assume autoria institucional nem validade nacional para UBS. Exigir liberação humana antes de qualquer decisão assistencial automática; esta missão NÃO cria CDS.

**Critério de aceite:** uma pessoa deve conseguir localizar, dentro da interface, os itens presentes no PDF sem depender de percorrer páginas inteiras como primeira opção. Testes devem verificar fonte, conteúdo, ramificações e a ausência de texto placebo.

## H14 — Detalhes do Atendimento com trajetória completa [P0]

**Captura:** modal mostra dados da paciente, consulta #3, profissional, data, score 0 e IG; está muito semelhante à tabela e não explica o atendimento.

**Novo padrão**:
- Cabeçalho: paciente, número, data/hora, status e acesso contextual ao prontuário.
- Seções organizadas por navegação interna ou tabs: identificação/queixa, vitais por aferição, dados obstétricos, avaliação/MEOWS e critérios, evolução e reavaliações, condutas/encaminhamentos **registrados**, anexos, fechamento.
- **Timeline**: eventos cronológicos com horário, autor, tipo, valor anterior/novo quando houver edição/sucessão, unidade, fonte e estado. Visualizar a evolução de PA/FC/FR/SpO2/T quando houver histórico; não inventar medidas retrospectivas.
- Filtros “Todas as alterações”, “Avaliações”, “Documentos” opcionais; leitura apenas.
- Eventos históricos ilustrativos sem medições comprovadas devem mostrar “Não registrado”/“Sem histórico disponível” em vez de vitais/condutas fictícios. Score \`0\` ilustrativo não deve ser confundido com avaliação clínica validada.
- Não alterar registro original durante consulta; futuras edições clínicas exigiriam trilha de auditoria append-only, tenant e papel. Nesta Vitrine, usar eventos sintéticos reais do DemoProvider quando disponíveis; se ausentes, apresentar lacuna honestamente.

**Arquivo:** \`components/atendimentos/AtendimentoDetailsModal.tsx\`, \`components/demo/AssessmentDetails.tsx\`, modelos/fixtures.

## H15 — Padrão de modais [P1]

Nos modais informativos (e.g. detalhes do atendimento):
- somente X no cabeçalho, sem botão “Fechar” redundante no rodapé; clique no **backdrop** fecha; \`Escape\` fecha; clique no conteúdo NÃO fecha;
- foco fica contido no modal e retorna ao disparador ao fechar; sem rolagem da página atrás; scroll interno para conteúdo longo; labels acessíveis e tamanho mobile adequado.
- Exceções justificadas: upload, formulário não salvo, reemissão/revogação ou ação destrutiva NÃO fecham sem confirmação de descarte; modais críticos mantêm botões Cancelar/Confirmar; nunca descarte silencioso.
- Evitar bug atual onde um \`Link\` ficou dentro do botão \`Fechar\` de \`AtendimentoDetailsModal.tsx\`: separar navegação contextual de ação de fechar, mantendo HTML/semântica válidos.

## H16 — Remover textos de “homologação” da UX principal, sem retirar segurança [P0 UX]

O operador é único aprovador da experiência demonstrativa e considera excesso de frases:
\`PDFs privados • consulta autorizada\`, \`Somente homologação privada\`, \`Modo demonstração • vínculo fictício\`, \`Conteúdo em revisão • consulta demonstrativa\`, blocos sobre SHA, bytes, direitos de distribuição, “não homologado” repetidos em cada card, cabeçalhos e avisos.

**Mudança esperada:** UI com a aparência de produto final. Um indicador discreto de ambiente de demonstração é suficiente onde necessário; remover duplicação de avisos e longos parágrafos operacionais. **Retirar da posição fixa no topo** o painel expansível “PDFs privados • consulta autorizada”; mover gerenciamento de consentimento/expiração/logout para uma área de **Configurações de homologação**, acessível apenas no ambiente privado, ou oferecer consentimento contextual mínimo quando necessário. Não remover a necessidade real de consentimento, nem autoautorizar invisivelmente.

**Manter:** mensagens relevantes de erro/revogação/expiração, status documental pontual quando altera a interpretação, origem/versão, e distinção de informação clínica não validada. Avisos técnicos sobre direito de distribuição vão para documentação administrativa, não cards repetidos. Nenhum acesso público a PDFs por retirar a faixa visual.

## H17 — Novo fluxo definitivo pós-QR: scanner fecha após primeira leitura válida [P0, SOBREPÕE H01 e comportamento anterior]

**Regra final do operador:** “Quando a câmera detectar a carteirinha ela já deve parar de abrir a câmera e mostrar a ilustração da carteirinha. Se quiser adicionar mais, pode clicar em Adicionar mais”. Esta decisão **substitui** o fluxo anterior de varrer várias carteirinhas com câmera continuamente aberta.

**Contrato de interação detalhado:**
1. No passo **1/5 Identificação** (sem mudar as outras quatro etapas), usuário escolhe QR → “Escanear carteirinha”.
2. Câmera solicita consentimento e entra em leitura. Ao detectar QR com formato PAP-ID, **pausar decodificação imediatamente**; verificar credencial no serviço privado. Só uma **credencial válida/ativa, verificada na base autorizada**, dispara sucesso. Token inválido/expirado/revogado não mostra dados.
3. **No primeiro sucesso válido**: encerrar todos os tracks e RAF; fechar o modal automaticamente; foco vai ao título “Carteirinha detectada”; não esperar clique em “Fechar e selecionar gestante”.
4. A etapa de Registro mostra **uma miniatura ilustrada da carteirinha** (layout H03) com informações permitidas pela sessão demonstrativa e status de leitura; preferir **mascarar dados sensíveis antes de CPF/RG**, mesmo que o QR tenha sido resolvido. Não exibir queixas, alergias, score ou prontuário antes de confirmação documental/autorização; se a experiência demo mostrar nome para escolha, aplicar escopo e minimização. Prévia não torna identidade confirmada.
5. Card principal tem apenas **“Continuar”** e **“Adicionar mais carteirinhas”**, com “Remover” secundário. Se só um candidato, ele aparece selecionável em destaque; **não avançar automaticamente para CPF/RG** sem visualização e confirmação do usuário.
6. “Adicionar mais carteirinhas” reabre a câmera **somente por clique**, mantendo lista de cards visuais já lidos; cada nova detecção válida fecha novamente a câmera, adiciona um item até limite seguro, evita repetidos por identidade/credencial. Manter importação de PNG/código como opções secundárias em disclosure.
7. “Continuar” solicita **CPF ou RG fictício** e contexto como já previsto. Documento incorreto → sem prontuário; correto no demo → ação de abrir prontuário/iniciar atendimento preservando 5 etapas. Em cenário operacional futuro CPF/RG isolado não é autorização, exige IAM/MFA/UBS.
8. **Migração/vinculação** mencionada pelo operador refere-se à experiência futura PAP-Link e eventual importação sintética, **não** significa executar migração clínica real ou reassociar IDs entre UBS automaticamente. A tela deve identificar quando vínculo é necessário, sem simular operação assistencial no backend.
9. Erros de permissão/dispositivo/conexão mantêm fallback PNG/código; trocar câmera e fechar não deixa tracks abertos; testes de duplo decode/race, câmera USB/mobile, card repetido, credencial revogada/expirada, ação teclado, mobile.

**Referências:** \`components/registro/{CameraScanner,steps/IdentificationStep}.tsx\`, \`components/pacientes/PrivatePatientDocuments.tsx\`, \`scripts/private-review/card-api.ts\`.

---

## 18. Condições transversais de implementação

### T1 — O que preservar
- Fluxo Registro \`Identificação → Gestação → Sinais Vitais → Dados Obstétricos → Resultado\`; Vitrine Premium e estilos/animados aprovados; passos 2–5; PDFs originais com hashes; upload/download privados; emissão/reemissão/revogação; banco sintético próprio e persistência.
- Cursos e Chat IA \`Em breve\`, sem liberar rotas antigas; Admin Beta/Comercial sem concessão clínica implícita; IAM/MFA/isolamento real preservados.
- Laboratório já existente na porta \`3600\`, PostgreSQL \`127.0.0.1:15436\`, containers/volumes/credenciais/MFA do operador, VPS e imagem GHCR referência: intocados.
- Em homologação, \`PAP_REVIEW_PROFILE\` próprio. Nunca gerar novos perfis sem necessidade, nunca reset/prune, nunca usar \`DATABASE_URL\` real.
- Não copiar arquivos de \`.local\` ou credenciais/QR ativos para commits, screenshots ou logs publicados.

### T2 — Diferenças entre Vitrine e produto clínico
O resultado desta missão só usa pacientes/documentos/avisos **sintéticos**. Sem acesso a dados de pacientes reais, sem motor MEOWS assistencial, sem prescrição, sem decision support automático. Dados clínicos de PDFs institucionais devem manter fonte/página e revisão qualificada antes de orientar decisões clínicas reais. Acesso a PDF público e licença de reutilização na Vitrine comercial são assuntos distintos: preservar direitos/atribuição e revisar condições de redistribuição por documento antes de publicar.

### T3 — Desempenho, acesso e UX
Acessibilidade AA, teclado, foco, modal/backdrop/Escape, feedback não apenas colorido, empty/error/loading, \`prefers-reduced-motion\`, browser real e celular físico quando disponível. O modelo de dados para timeline, avisos e documento deve distinguir \`missing\`, \`historical\`, \`current\`, \`revoked\`, \`unverified\`. Não inventar dados para “completar” visual.

### T4 — Referências textuais e visuais existentes
- \`AGENTS.md\`
- \`docs/protocolos/PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md\`
- \`docs/protocolos/referencias/\` (nove PNGs)
- \`docs/design/pap-id-v1/\` (seis especificações e imagens)
- \`docs/protocolos/documentos-originais/\` (três PDFs)
- \`docs/release/beta1-final-local/{RELATORIO,HOMOLOGACAO-WSL,HOMOLOGACAO-MOBILE,CHECKLIST-UX,CHECKLIST-SEGURANCA}.md\`
- As capturas enviadas pelo operador no chat em 22/11 ilustram os defeitos. Se não estiverem disponíveis na sessão do Codex, **usar as descrições acima e pedir referência de captura para comparação**, não inventar que foram inspecionadas.

### T5 — Ordem sugerida e gates
1. G0 inventário/testes existentes/branch SHA; 2. P0 scanner+QR/carteirinha/Documentos; 3. P0 protocolos fonte-estruturada e fluxograma; 4. P0 histórico atendimento e avisos reduzidos; 5. P1 perfil/foto/caixa de entrada/modal/navigation; 6. regressões/prints/mobile/prod boundary; 7. relatório final. Prioridades não dispensam nenhum dos H01–H17.

**NÃO executar ainda.** Requisitos preparados para o Codex, aguardando ordem explícita do operador. Sem commits de código, merge, PR ou deploy nesta fase de documentação.
