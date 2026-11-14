# PAP-Protocols Beta 1 — Especificação funcional, UX e arquitetura

**Documento para Codex — versão 1.0 — 14/11/2026**

**Repositório:** joaoCarlosGM/pap-saude  
**Branch de referência:** feature/beta1-protocols-priority-nav  
**Status:** especificação para implementação. A criação deste arquivo NÃO significa que telas, PDFs, backend ou distribuição já foram implementados.  
**Escopo prioritário:** três protocolos institucionais fornecidos pelo usuário; biblioteca + visualizar + fluxograma + checklist + leitor PDF + download; publicação e gestão escaláveis para futuros documentos.

## 0. Instruções iniciais ao Codex

1. Ler AGENTS.md e este documento integralmente. Ler o prompt histórico PAP_SAUDE_BETA1_MISSAO_CODEX_20261030/PROMPT-PARA-CODEX.md apenas para compreender restrições permanentes. A ordem histórica de trabalhar em feature/p0-premium-unified-rc NÃO vale para esta missão: confirmar HEAD, branch atual e git status. Não realizar merge, deploy ou qualquer modificação em produção sem autorização explícita.
2. Inspecionar componentes atuais antes de construir: src/features/vitrine-premium/views/protocolos.tsx; components/protocolos/{ProtocolList,ProtocolCard,ProtocolPreviewModal,AddProtocolModal}.tsx; lib/mock-protocolos.ts; types/protocolo.ts. Inspecionar também a rota operacional src/app/(dashboard)/protocolos/page.tsx e seus próprios componentes, o shell premium e o administrador.
3. Priorizar Protocolos. Chat IA e Cursos devem continuar com a etiqueta "Em breve" na sidebar da Vitrine conforme commit d4ab057, SEM remoção de código e SEM confundir o indicador visual com o bloqueio de APIs. Não alterar LMS funcional do backend porque uma etiqueta de Vitrine mudou.
4. A Vitrine é totalmente sintética no que diz respeito a pacientes e ações clínicas. O documento PDF de referência pode ser apresentado como **documento institucional real** desde que haja permissão de distribuição; a Vitrine não acessará banco de paciente, upload real nem serviços clínicos.
5. Não fazer migrations destrutivas. Preservar autenticação, MFA, chaves locais, dados, base antiga da porta 15436, aplicação local 3600, políticas de acesso Admin Beta, páginas Comercial e infraestrutura VPS.
6. Não inventar condutas, doses, limiares, fluxogramas ou checklists como se fossem homologados; extrair conteúdo dos PDFs identificados abaixo e exigir aprovação clínica para uso assistencial. Mockups anteriores servem como referência de layout, NÃO como fonte de verdade médica.

## 1. Resumo executivo e posicionamento do produto

PAP-Protocols será uma biblioteca clínica consultável e escalável, não apenas uma lista de PDFs. Cada protocolo publicado aparece em card e abre sempre a MESMA estrutura genérica de página, alimentada por dados versionados: **Visão geral**, **Fluxograma**, **Checklist** e **Documento original**. O download do PDF original deverá ser funcional para usuário autorizado, tanto pelo card quanto pelo leitor.

PAP-Protocols Beta 1 é principalmente referência e apoio educativo. A ação visual "Usar no atendimento" dos conceitos foi descontinuada como CTA genérico para não sugerir integração clínica inexistente. Substituir por "Consultar protocolo". Uma futura ação "Abrir apoio clínico" viverá dentro do atendimento, condicionada a integração autorizada e regras clínicas homologadas — não implementar CDS/IA aqui.

No Beta 1 já haverá três protocolos iniciais. Em evolução posterior, cursos concluídos no LMS poderão liberar **materiais complementares e ferramentas formativas**, nunca ocultar informações essenciais de emergência que os profissionais autorizados precisam consultar.

## 2. Inventário dos PDFs realmente recebidos

| id estável | Título documental | Origem / versão | Emissão / revisão | Arquivo de origem | Páginas PDF | SHA-256 |
|---|---|---|---|---|---|---|
| sindromes-hipertensivas-gestacao | SÍNDROMES HIPERTENSIVAS NA GESTAÇÃO | Unidade da Mulher HU-UFGD, PRT.UMUL.012, v01 | 02/02/2026; próxima revisão 02/02/2028 | Pré eclampsia.pdf | 25 | 63a0dc9b93bc3be45632bcf46649c92d7118884135ac2ff8a95aa565830804d1 |
| hemorragia-pos-parto | PREVENÇÃO E MANEJO DA HEMORRAGIA PÓS-PARTO (HPP) | Unidade da Mulher HU-UFGD, PRT.UMUL.003, v03 | 21/09/2026; próxima revisão 21/09/2028 | Hpp.pdf | 34 | f48c79881152eae50e25ebaf8d354f1219db7c8dd9d5c41b8cfb8ff2360337d2 |
| sepse-obstetrica | PROTOCOLO DE SEPSE EM PACIENTES OBSTÉTRICAS | HUAB-UFRN/EBSERH, v2 (2025) | Revisão futura não confirmada | Sepse.pdf | 36 | 5d4e5756b397ade0adc829cca8336eec86db14e955c22a528fa533a9a75f093b |

**Atenção ao terceiro PDF:** capa indica "PRT.UPS.007 – versão 2.0" e o cabeçalho da página seguinte indica "PRT.DMED.013 - versão 2", com paginação impressa 16/17 divergente das **36 páginas digitais** verificadas. Registrar ambos os códigos como "identificador documental a validar"; não selecionar um arbitrariamente. Não inferir data de próxima revisão.

**Direitos e aplicabilidade:** arquivos recebidos pelo usuário são fontes para trabalho interno. Antes de redistribuição pública, validar autorização de uso e regras institucionais. Os protocolos foram elaborados em instituições específicas; não assumir adoção automática por toda UBS do Brasil. Os três precisam de curadoria técnica de adaptação à realidade da Atenção Primária quando couber.

Os PDFs originais **NÃO foram enviados a esta branch por este MD**. O Codex deve localizar os anexos autorizados, verificar SHA-256, armazenar os arquivos exatamente como recebidos (sem reescrever páginas), ou marcar o recurso como BLOCKED se não houver bytes/autorizações. Nunca fabricar um PDF substituto. Um download só pode ser habilitado após resolver o arquivo real.

## 3. Fonte real do repositório e lacunas

- Vitrine em src/features/vitrine-premium/views/protocolos.tsx usa mockProtocolos e ProtocolList.
- mock-protocolos.ts possui 5 exemplos antigos, inclusive títulos que não correspondem aos três PDFs fornecidos. Na versão de referência Beta 1, trocar a **lista prioritária** para estes 3 e não inventar novos arquivos locais.
- ProtocolPreviewModal.tsx atualmente declara expressamente "Arquivo indisponível nesta demonstração" e botão "Baixar" disabled.
- ProtocolCard.tsx implementa "Baixar" com window.open(fileUrl) ou console.log de fallback; **console.log não é download**. Conectar a um recurso autorizado real ou desabilitar explicitamente enquanto indisponível. Usar um único mecanismo em todas as vistas.
- Há componentes similares em src/components/protocolos para a rota operacional. Preferir schema/tipos e componentes visuais compartilhados com adaptadores por ambiente; nunca compartilhar DemoProvider com clínica real.
- Admin Beta isolado possui allowlist estrita em src/lib/admin-beta-policy.ts. Não abrir rotas de upload, PDF, clínicas ou LMS na VPS Admin Beta apenas para demonstrar os protocolos. Validar o deployment pretendido, a política e a autorização antes de qualquer disponibilização externa.

## 4. Design system e regras visuais

Fonte de verdade: CSS/tokens premium existentes. O prompt histórico de UX informa: cor principal **#C41469**, superfície #FFFFFF, fundo #F9F7FA, texto #152239 e secundário #64748B. Usar Tailwind/CSS real antes de codificar novas cores. Mockups podem mostrar variações de rosa e elementos ilustrativos; NÃO substituir o tema vigente.

- Sidebar mantém a navegação: Dashboard; Registro, Atendimentos, Pacientes; **Protocolos** como primeiro item de Conhecimento e Apoio; Ferramentas; Chat IA (Em breve); Cursos (Em breve). Sem barra vertical no item ativo.
- Área principal max-w-6xl ou largura responsiva equivalente à Vitrine já existente. Grid de cards 3 desktop, 2 tablet, 1 mobile, conforme legibilidade. Sidebar de resumo na página detalhe: desktop 2 colunas (conteúdo e aside 280–340px), celular 1 coluna.
- Heading principal 24–30px, subtítulo 14–16px, cards com raio 14–18px e borda neutra, sombra leve, botões 44px de altura, foco visível rosa, ícones Lucide consistentes.
- Informação de **status documental** (Em revisão/Aprovado/Publicado/Substituído/Revogado) não pode ser transmitida só por cor; textos e ícones acessíveis.
- Prioridade para leitura em celular, longos títulos, largura de PDF, zoom e índice navegável. AA, navegação por teclado e "prefers-reduced-motion".
- Não usar badges de progresso de curso para conteúdo que não depende de curso. Não afirmar que o profissional está certificado apenas por ter aberto um protocolo.

## 5. Tela A — Biblioteca de Protocolos (clique na sidebar)

URL sugerida Vitrine: /vitrine/protocolos; operacional: /protocolos. Preservar as rotas existentes.

**Cabeçalho:** "Protocolos" + "Biblioteca de protocolos clínicos"; helper "Consulte materiais institucionais, fluxogramas e checklists". Mostrar busca por título, assunto, palavra-chave e código. Filtros: categoria, instituição de origem, versão/status, especialidade, disponíveis para minha unidade. Contador real/fixture, sem números inventados.

**Cards — campos:** ícone temático, título documental legível, descrição curta (sem recomendações médicas não validadas), instituição, identificador verificado ou "a confirmar", versão, data de emissão e próxima revisão quando disponível, status de publicação e disponibilidade para UBS. CTA primário **"Visualizar"** (abre tela detalhe, não modal com texto placeholder); secundário **"Baixar PDF"** (stream original, se permitido); menu opcional "Detalhes do documento".

**Estados:** carregando, nenhum publicado, sem correspondência de busca, indisponível, documento substituído, permissão insuficiente, falha de rede e download. Botão não aparenta funcionar se não existe arquivo. Para Vitrine com documentos autorizados, PDF real público/demonstrativo é possível; caso contrário, mostrar disponibilidade honesta.

**Roteamento:** a estrutura da tela é uniforme para N protocolos, slugs normalizados, ids estáveis e versão imutável. Links diretos devem preservar acesso, nunca confiar só em menu.

## 6. Tela B — Visualizar protocolo: página genérica

Rotas sugeridas /vitrine/protocolos/[slug] e /protocolos/[slug], sujeitos à arquitetura de roteamento existente.

- Breadcrumb: Protocolos / Título do protocolo.
- Cabeçalho: título integral, subtítulo resumido, instituição, código validado, versão, emissão, próxima revisão, data da publicação no PAP, status documental. Não misturar emissão institucional e data de upload.
- Ações no cabeçalho: **"Abrir PDF"**, **"Baixar PDF"**, **"Consultar protocolo"** (navega para a Visão geral ou primeiro bloco; não criar ação clínica).
- Tabs reutilizáveis: **Visão geral | Fluxograma | Checklist | Documento original**. Tabs refletidas na URL (?aba=visao-geral ou caminho equivalente), para deep-link, reload e voltar/avançar navegador.
- Coluna principal: bloco de resumo, objetivos, critérios de aplicabilidade, seções clicáveis, links para páginas oficiais do documento. Coluna lateral: resumo rápido, origem/versão, quando consultar, alerta "Este conteúdo não substitui avaliação profissional" e miniatura/atalho PDF real.
- Se um protocolo não dispõe de checklist/fluxograma homologado, tab pode exibir "Conteúdo estruturado em revisão" com link à fonte PDF; **não gerar instruções substitutas por IA**. Não ocultar documentos disponíveis sem justificativa.
- Preferir conteúdo de cards gerado a partir de dados estruturados, não três componentes copiados com lógica diferente.

## 7. Tela C — Fluxograma

- Navegação hierárquica por etapas e decisões presentes no documento, com zoom, pan, "Ajustar à tela", leitura alternativa em lista/árvore para acessibilidade, retorno ao resumo e botão "Abrir fonte no PDF" na página relevante.
- Cada nó: id, título, natureza (start/decision/action/reference), descrição validada, página de origem, next ids, eventual alerta visual; layout gerado a partir de JSON tipado.
- O PDF de síndromes hipertensivas aponta seção "Fluxograma" na página impressa 22; HPP aponta seção 12 na página impressa 32; Sepse possui "Fluxo de processo", seção 7 (índice impresso 9). Conferir a posição real do visual em cada PDF, sem depender apenas do índice.
- **Uso informativo no Beta 1**, jamais executar prescrição automática ou iniciar condutas apenas pelo clique num nó. Indicadores "sim/não" representam navegação pelas condições do fluxograma, não diagnóstico calculado.
- Conteúdo do fluxograma exige dupla conferência com PDF e revisor clínico, incluindo exceções, doses, contraindicações e mudanças de diretrizes. Se não revisado, mostrar visualização do fluxograma **original** ou indicação de revisão pendente.

## 8. Tela D — Checklist interativo

Estrutura comum, independente de especialidade:
1. Cabeçalho "Checklist do protocolo", nome, versão, responsável/uso assistencial (se homologado) e indicação clara de modo "Consulta" versus "Registrado em atendimento".
2. Grupos dobráveis com título, descrição, prioridade, itens checkáveis, fonte por página, campo "não se aplica" e opcional observação quando aprovado.
3. Barra de progresso **local de preenchimento**, não um "score de segurança clínica". Botões "Limpar marcações" e "Ver documento original".
4. No modo Vitrine, somente estado **em memória** (reset controlado), sem criar registros reais. Não mostrar "salvo no prontuário".
5. No modo operacional da primeira etapa, checklist consultivo, sem gravar em Encounter. Persistência assistencial requer autorização específica, modelagem, proveniência, auditoria e confirmação de ações efetivamente realizadas.
6. Avisos acessíveis para item não concluído; nunca inferir que item marcado foi executado ou auditado em paciente real.

**Base documental para agrupamentos candidatos, NÃO checklists finais homologados:**
- Síndromes hipertensivas: classificação; fatores de risco/prevenção; manejo de hipertensão crônica, pré-eclâmpsia, HELLP e eclâmpsia; seção 9 "Checklist pré-eclâmpsia, eclâmpsia e síndrome HELLP" a partir da página impressa 14; kit/caixa de emergência (20); escala MEOWS (23).
- HPP: atribuições por profissional; etiologia; prevenção; definição e mensuração de perda sanguínea; índice de choque; 5 passos de manejo listados no sumário (acionamento/estabilização, ressuscitação, causa 4 Ts, controle não cirúrgico, abordagem cirúrgica); kit, notificação e seguimento. Itens e sequência exatos dependem da revisão médica.
- Sepse: critérios de inclusão/exclusão; responsabilidades; kit sepse; tratamento indicado e plano terapêutico; fluxo de processo; monitoramento. Verificar no PDF o uso de omqSOFA e limitações gestacionais; não trocar por MEOWS arbitrariamente.

**Controles:** não usar progresso numérico como substituto de decisão clínica; exigir revisão antes de qualquer checklist operacional que oriente atendimento. Conteúdo educacional pode citar cabeçalhos e seções, preservando o acesso ao PDF integral.

## 9. Tela E — Documento original / PDF verdadeiro

**Obrigatório:**
- Abrir o **PDF real, original, não reconstituído**, no visualizador interno, mostrando página atual, total de páginas, zoom, próximo/anterior, abrir em nova aba quando autorizado e "Baixar PDF".
- Botões "Abrir PDF" (navegar/abrir leitor) e "Baixar PDF" (download de fato) têm comportamentos distintos. O download deve fornecer Content-Type: application/pdf, Content-Disposition: attachment; filename UTF-8 com nome seguro, Content-Length quando disponível, e proteção contra cache compartilhado conforme sensibilidade.
- Se PDF for de acesso restrito, a rota de stream valida sessão, papel, escopo UBS, status de publicação e autorização em **cada requisição**, inclusive download direto; não depender do frontend, não expor object keys privadas nem gerar link público duradouro.
- Diferenciar PDF público autorizado vs privado por ambiente. Vitrine pode exibir documento real se direitos autorizarem; não expor documentos clínicos restritos por liberar uma rota comercial.
- Validar assinatura PDF (%PDF), MIME real, extensão, limite de tamanho, hash, sanitizar nome, storage não executável, proteção contra path traversal, e política de segurança de conteúdo/iframe. Desabilitar scripts ou anotações não confiáveis conforme visualizador.
- Download e visualização devem continuar disponíveis do mesmo arquivo/versionId. Registrar log/auditoria de eventos relevantes no backend real. Não registrar dados de pacientes.
- Interface deve oferecer fallback "Abrir documento em outra aba" para navegadores que não renderizam PDF nativamente, e mensagens claras em 401/403/404/410/500. Se a versão foi revogada, não continuar oferecendo seu download como vigente sem política de arquivo.
- Validar comportamento mobile, impressão se autorizada, leitor de tela (alternativa textual/índice) e documentação sobre limitações de acessibilidade do PDF original.
- Não usar console.log, window.open(undefined), PDF fictício ou botão ativo sem arquivo. Não fazer fetch da URL sem revalidar escopo no servidor.

**Uploads e arquivos:** receber PDFs via painel administrativo, mas para Beta 1 inicial pode existir importação controlada/seed dos 3 documentos após validação de direitos. Nenhuma dependência de “upload manual no browser” para que um catálogo recém-criado comece a funcionar.

## 10. Tela F — Cadastro e gestão (PAP_ADMIN / PAP_MANAGER)

**Atenção:** NÃO reaproveitar automaticamente as permissões COURSE_* do LMS para segurança clínica. Código atual concede course.edit, course.publish e course.distribute a PAP_ADMIN e PAP_MANAGER; há workbench /admin/manager/cursos e /admin/manager/distribuicao, mas **não** existe equivalente completo de governança de protocolos nem liberação pela allowlist da implantação Admin Beta.

Proposta de painel "Gestão de Protocolos":
- Lista com tabela: nome, categoria, instituição, código, versão, data emissão, próxima revisão, revisor, status, UBS/municípios destinatários, downloads agregados (se permitido) e ações.
- Ação "Novo protocolo": (1) metadados; (2) upload PDF; (3) revisão documental/autoria; (4) estrutura de Visão geral; (5) fluxograma e checklist opcional/homologável; (6) escolher municípios/UBS; (7) encaminhar para aprovação; (8) publicar/liberar.
- Estados versionados **RASCUNHO → EM_REVISAO_CLINICA → APROVADO → PUBLICADO → DISTRIBUIDO → SUBSTITUIDO/REVOGADO**. Separar documento publicado (referência) de "regras clínicas ativadas" (não incluídas no Beta 1).
- PDF e metadados da versão publicada são imutáveis; correções criam nova revisão. Ao substituir, definir o tratamento das unidades que receberam a anterior, evitar uso inadvertido e preservar trilha.
- Revisor Clínico PAP é **papel novo proposto**, não presente em SYSTEM_ROLES. Aprovação exige competência e autorização institucional; não assumir que qualquer PAP_MANAGER pode homologar condutas.
- PAP_MANAGER: prepara rascunho, associa documentos e distribui **versões previamente aprovadas**, com escopo explícito. PAP_ADMIN: governa catálogo, permissões e publicação administrativa (sem adquirir competência clínica pelo papel). HEALTH_UNIT_ADMIN: recebe e disponibiliza aos profissionais de sua UBS conforme política. PROFESSIONAL: consulta materiais aprovados da sua unidade. MUNICIPAL_ADMIN: pode receber/repassar se grant específico futuro. COMMERCIAL: apenas Vitrine demonstrativa, sem upload ou gestão real.
- Criar permissions protocol.read, protocol.create, protocol.edit, protocol.submit_review, protocol.clinical_review, protocol.publish, protocol.distribute, protocol.assign, protocol.revoke de forma granular e com escopo. Qualquer implementação modifica IAM/testes de autorização; nunca deduzir grants por nome de rota.
- Segregação por organização/unidade em API, acesso direto e download; auditoria dos eventos importantes; anti-IDOR; CSRF nos writes; MFA para ações sensíveis.

**Novas páginas administrativas sugeridas:**
- /admin/manager/protocolos (catálogo de autoria)
- /admin/manager/protocolos/novo (wizard)
- /admin/manager/protocolos/[versionId] (edição/revisão)
- /admin/manager/protocolos/distribuicao (públicos e status)
- /admin/protocolos/revisao (fila do revisor clínico)
Essas são **sugestões**, validar organização real do Admin antes de rotas. Não abrir paths no Admin Beta isolado sem modificar conscientemente allowlist e ensaiar isolamento.

## 11. Cadastro futuro de N protocolos: arquitetura de dados proposta

Evitar um arquivo React por protocolo. Criar catálogo estruturado e engine genérica de apresentação; se já existirem entidades equivalentes, reutilizar após inspeção. Exemplo de contrato conceitual:

~~~ts
type ProtocolVersion = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  institution: string;
  documentCode?: string;
  codeVerificationStatus: "verified" | "pending";
  versionLabel: string;
  issuedAt?: string;
  reviewDueAt?: string;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "SUPERSEDED" | "REVOKED";
  document: {
    storageKey: string;
    originalFilename: string;
    mimeType: "application/pdf";
    sizeBytes: number;
    sha256: string;
    pageCount: number;
  };
  sections: Array<{id:string; title:string; contentBlocks:unknown[]; sourcePages:number[]}>;
  flowNodes?: Array<{id:string; label:string; kind:string; sourcePages:number[]; nextIds:string[]}>;
  checklistGroups?: Array<{id:string; title:string; items:Array<{id:string; label:string; sourcePages:number[]}>}>;
  targetOrganizationIds: string[];
  reviewerUserId?: string;
  approvalAt?: string;
}
~~~

O código acima é contrato explicativo, não migration autorizada nem schema Prisma definitivo. Adicionar manifest/dados compatíveis com schema existente; validação com Zod; sanear conteúdo HTML; renderização declarativa sem executar JS de protocolos enviados. Metadados de autoria/código institucional e links para páginas devem preservar a proveniência.

Separar quatro responsabilidades: repository/storage PDF; catálogo versionado e IAM; renderer genérico de seções/fluxo/checklists; provider demo em memória. Facilitar importação de novos documentos sem copiar componentes. Upload deve ser um fluxo administrativo aprovado e não edição direta da Vitrine.

## 12. Estrutura específica das telas iniciais

### 12.1 Síndromes hipertensivas na gestação — PRT.UMUL.012 v01

- Card: título institucional; descrição curta "Critérios e manejo das síndromes hipertensivas no contexto assistencial de origem"; categoria Obstetrícia, versão, origem, estado.
- Visão geral: objetivos, classificação, fatores de risco/prevenção, manejo por quadro, medicamentos (somente referência às páginas originais até revisão), interrupção da gestação, puerpério, kit, MEOWS.
- Fluxograma: apoiar-se em seção 13 (página impressa 22; validar conteúdo visual).
- Checklist: seção 9 (página impressa 14 em diante) como única fonte para conversão inicial, com curadoria; evitar criar itens de novo a partir de opinião.
- Documento original: 25 páginas e links profundos para páginas de origem.
- Observação: o mockup “Protocolo de Pré-eclâmpsia” é nome abreviado para navegação; manter **título oficial** nos metadados.

### 12.2 HPP — PRT.UMUL.003 v03

- Card: "Prevenção e Manejo da Hemorragia Pós-Parto"; subtítulo "Reconhecimento, resposta e seguimento".
- Visão geral: responsabilidades por categoria profissional, etiologia, prevenção, definição e mensuração, índice de choque, tratamento, seguimento, notificação, kit.
- Fluxograma: seção 12 (página impressa 32); permitir referência a anexo (34).
- Checklist: candidato baseado nas etapas da seção 8 e kit (seção 10), sujeito à conferência clínica; é emergencial e NÃO deve ser apresentado como checklist assistencial homologado sem revisão.
- Documento original: 34 páginas, registro documental e revisão em 21/09/2028.

### 12.3 Sepse obstétrica — HUAB-UFRN/EBSERH v2 2025

- Card: "Protocolo de Sepse em Pacientes Obstétricas"; instituição e versão, código pendente de confirmação, nenhuma próxima revisão inventada.
- Visão geral: objetivos, justificativas, critérios de inclusão/exclusão, responsabilidades, kit, tratamento/plano, fluxo de processo e monitoramento.
- Fluxograma: seção 7, posição impressa 9; mapear posições reais em arquivo de 36 páginas após inspeção.
- Checklist: extrair itens das seções 3 a 8 e submetê-los a revisão clínica; não forçar mesma sequência da HPP.
- O PDF descreve o **omqSOFA**, uso indicado a partir da 22ª semana e até o 7º dia pós-parto, mas qualquer ferramenta de escore deve respeitar o texto integral, população de uso e homologação. **Não confundir MEOWS e omqSOFA**.
- Documento original: 36 páginas digitais; conferir divergência de código e paginação impressa.

## 13. Referências visuais já criadas na conversa (não enviadas nesta branch)

As capturas de conceito produzidas anteriormente podem ser incorporadas posteriormente sob docs/protocolos/referencias/, caso os arquivos PNG sejam enviados e verificados; este Markdown não presume que estejam no GitHub:

- protocolo_de_pré_eclâmpsia.png — conceito da página do protocolo / fluxo.
- protocolo_de_sepse_obstétrica.png — conceito de fluxo de sepse.
- fluxograma_de_hemorragia_pós_parto.png — fluxo HPP.
- protocolo_de_pré_eclâmpsia_na_pap_saúde.png — Visualizar / visão geral pré-eclâmpsia.
- checklist_de_pré_eclâmpsia_no_pap_saúde.png — checklist pré-eclâmpsia.
- visão_geral_do_protocolo_de_hemorragia_pós_parto.png — Visualizar / visão geral HPP.
- checklist_de_hemorragia_pós_parto.png — checklist HPP.
- painel_pap_saúde_protocolo_de_sepse_obstétrica.png — Visualizar / visão geral sepse.
- checklist_de_sepse_obstétrica.png — checklist sepse.

Tratar números, textos, doses ou recomendações eventualmente presentes nos mockups como **ilustrativos**, não substitutos do documento original.

## 14. Integração futura com LMS — fora do escopo inicial

No Beta 1, os três protocolos aprovados devem estar disponíveis aos profissionais habilitados da UBS independentemente da conclusão de curso, quando a segurança assistencial exigir acesso. Depois:
- ligar courseVersionId a protocolVersionId, com regra de conclusão/nota/validade específica;
- liberar materiais de aprofundamento, exercícios e recursos complementares;
- permitir que um gestor veja capacitações e versões dos protocolos por UBS;
- nunca considerar conclusão de curso como substituta do conselho profissional, qualificação ou permissão clínica;
- revogação de publicação, expiração de curso e atualização documental geram notificações e trilha, não apagamento silencioso de histórico.

## 15. Sequência de implementação incremental

**Slice P0 — inventário e autenticação:** achar caminhos, tokens visuais, roles e storage já existentes; confirmar direitos e disponibilidade dos 3 PDFs; registrar riscos.

**Slice P1 — biblioteca:** catálogo inicial correto, filtros e cards; páginas de detalhe genéricas e navegação de tabs; fixtures de Vitrine sem dados de paciente; testes de visual e acessibilidade.

**Slice P2 — documentos:** associar bytes PDF originais com hashes comprovados; leitor com páginas/zoom; abrir/baixar funcional; controle de acesso por contexto. Se indisponíveis, declarar BLOCKED, sem simulação de sucesso.

**Slice P3 — seções e conteúdos:** visão geral, referências às páginas, fluxograma visual de origem e checklist consultivo; marcar por revisão clínica todo elemento ainda não conferido.

**Slice P4 — gestão e distribuição:** editor administrativo, workflow aprovação, audience por UBS, versionamento, auditoria, proteção de download; apenas quando permitido adicionar backend e migrations.

**Slice P5 — validação:** testes, homologação com responsável clínico, revisão de direitos, rollout controlado. Admin Beta / Comercial não recebem API clínica inadvertidamente.

## 16. Critérios de aceite e testes mínimos

- [ ] Catálogo mostra os 3 documentos corretos, com metadados verificados, sem arquivos fictícios.
- [ ] Visualizar abre a mesma página genérica para três slugs e suporta adicionar quarto sem novos componentes React.
- [ ] Tabs abrem seção correta e funcionam com voltar, refresh e deep-link.
- [ ] Fluxogramas e checklists exibem apenas conteúdo aprovado ou aviso de revisão, sempre com referência à fonte.
- [ ] Em tela pequena não há overflow; conteúdo acessível por teclado/leitor de tela.
- [ ] "Abrir PDF" abre PDF real e "Baixar PDF" entrega os bytes originais; SHA-256 confere com os anexos (se disponibilizados).
- [ ] Ausência de PDF retorna mensagem útil, não ação falsa nem PDF gerado.
- [ ] GET/HEAD direto à rota do documento exige autenticação/autorização adequada para arquivos restritos.
- [ ] PAP_MANAGER não publica versão clínica sem aprovação; PAP_ADMIN não vira revisor clínico pelo simples cargo.
- [ ] PROFESSIONAL acessa somente materiais distribuídos ao seu escopo institucional; acessos revogados deixam de funcionar.
- [ ] Nenhuma rota do Admin Beta isolado ou Comercial foi ampliada sem autorização, revisão e teste.
- [ ] Chat IA e Cursos seguem "Em breve" na Vitrine, sem apagar o LMS e sem quebrar links protegidos.
- [ ] TypeScript/lint/testes de UI/unit/integration/E2E relevantes passam em banco isolado; relatório real PASS/FAIL/BLOCKED.
- [ ] Não há deploy, migração destrutiva, quebra de MFA ou alteração do banco local original.

## 17. Entrega esperada do Codex

- Lista de arquivos modificados com diffs por slice.
- Capturas desktop/mobile de Biblioteca, 3 telas Visualizar, 3 Fluxogramas, 3 Checklists e PDF viewer (3 arquivos), com evidências de ações de download.
- Contrato genérico para múltiplos protocolos e teste de inserção de quarto protocolo fictício.
- Inventário PDF (sha256, bytes, páginas, instituição, versão, código), log de riscos documentais e registro de revisão.
- Evidência de permissão por perfil/UBS e de isolamento Vitrine versus sistema operacional.
- Relatório com testes realmente executados e bloqueios explícitos; sem declarar recurso concluído quando for apenas mock.

**STOP:** não publicar, não fazer merge, não mexer em VPS, não conectar RNDS ou APIs clínicas, não migrar banco persistente sem autorização.