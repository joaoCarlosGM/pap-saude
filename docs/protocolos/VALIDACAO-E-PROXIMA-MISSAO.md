# Validação documental — PAP-Protocols Beta 1

**Data:** 2026-11-14  
**Branch:** `feature/beta1-protocols-priority-nav`  
**Status da documentação:** APROVADA COM RESSALVAS; próxima missão delimitada a frontend Vitrine sintético.

## Documentos revisados

- `docs/protocolos/PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md`: contrato amplo para o produto, incluindo backend e futuro Admin.
- `docs/protocolos/PROMPT-CODEX-PAP-PROTOCOLS-BETA1.md`: prompt anterior misturava biblioteca, visualização, upload, IAM, publicação e distribuição; **não executar integralmente em uma única tarefa**.
- `PAP_SAUDE_BETA1_MISSAO_CODEX_20261030/PROMPT-PARA-CODEX.md`: referência histórica, não é o comando de branch nem da missão atual.
- `AGENTS.md`: regras obrigatórias de projeto, testes em ambientes descartáveis, segurança e instruções atuais do Next.js.

## Evidências de código verificadas nesta branch

1. `src/features/vitrine-premium/views/protocolos.tsx` usa `ProtocolList` e `mockProtocolos`.
2. `src/features/vitrine-premium/lib/mock-protocolos.ts` lista cinco protocolos demonstrativos anteriores, não os três PDFs institucionais definidos.
3. `src/features/vitrine-premium/components/protocolos/ProtocolList.tsx` expõe "Adicionar Protocolo" na Vitrine e abre `AddProtocolModal`. **Ação de criação real deve pertencer à administração**, não à Vitrine.
4. `ProtocolPreviewModal.tsx` informa que o arquivo está indisponível e mantém Baixar desabilitado.
5. `ProtocolCard.tsx` abre `fileUrl` quando presente, mas usa `console.log` quando não há URL. **Isto não é download**.
6. `src/app/(dashboard)/protocolos/page.tsx` só apresenta aviso institucional, sem biblioteca funcional real.
7. `src/features/vitrine-premium/components/layout/Sidebar.tsx` já mostra Cursos e Chat IA como "Em breve" sem navegação pela sidebar; não alterar mais o escopo dessa mudança.

## Riscos e decisões de validação

- **P0 — PDFs ausentes do GitHub:** hashes e números de páginas indicados nos MDs não foram revalidados contra bytes originais nesta auditoria. Revalidar somente com os três arquivos originais em mãos. Nenhum botão de download deve ser apresentado como funcional sem PDF íntegro e autorização documental.
- **P0 — Conteúdo clínico:** textos de mockups e fluxogramas gerados não são regras homologadas. Na missão imediata, estruturar conteúdo neutro e indicativos "Em revisão", com links de proveniência a serem preenchidos.
- **P0 — Escopo:** frontend demonstrativo, upload real, backend e publicação clínica não devem ser implementados no mesmo slice.
- **P1 — Governança:** PAP_MANAGER/PAP_ADMIN já têm concessões para cursos, mas isso não autoriza publicação de protocolos clínicos. Revisor Clínico é papel ainda proposto; exigir aprovação técnica e desenho de IAM antes da gestão real.
- **P1 — Direitos:** revisar permissão de distribuição dos PDFs institucionais, especialmente por meio da Vitrine Comercial.
- **P1 — UI:** o novo "Visualizar" deve navegar a uma página genérica; o modal antigo é incompatível com o contrato de quatro abas.
- **P2 — Cobertura:** manual de revisão e homologação visual após primeiro slice; backend terá missão separada.

## Próxima missão única autorizada por este documento — P1: Vitrine PAP-Protocols

**Objetivo:** implementar o frontend demonstrativo de Protocolos, navegável e responsivo, fiel ao tema existente. Sem clínica real, sem bancos, sem migrations, sem publicação de documentos reais e sem mexer na VPS.

**Entregáveis:**
1. Biblioteca /vitrine/protocolos com três entradas documentais **identificadas como demonstrativas ou em preparação**, filtros e busca. Metadados institucionais apenas quando confirmados.
2. Página genérica /vitrine/protocolos/[slug] com breadcrumb e abas Visão geral, Fluxograma, Checklist e Documento original.
3. Reutilização de componentes e contrato de dados, demonstrando um quarto protocolo de teste sem componente JSX novo.
4. Fluxograma consultivo sem árvore clínica inventada; caso não haja conteúdo revisado, usar ilustração neutra, referência ao PDF ou estado "Aguardando revisão".
5. Checklist demonstrativo/interativo em memória, com indicadores claros de demonstração, sem escrever no prontuário e sem simular condutas executadas.
6. Documento original: estado de PDF indisponível quando os bytes não estiverem acessíveis; nenhum CTA "Baixar" fingindo sucesso.
7. Remover da Vitrine o botão "Adicionar Protocolo" de criação e colocar gerenciamento futuro no roadmap Admin, sem suprimir componentes do produto que possam ser reaproveitados.
8. Preservar a sidebar Cursos/Chat IA "Em breve" e todos os demais módulos intactos.

**Aceite mínimo:** navigation/deep-link, loading/empty/error, mobile/desktop, teclado, sem regressões, TypeScript, lint e testes específicos executados; relatórios PASS/FAIL/BLOCKED sem declarar PDF funcional sem evidência. Capturas de biblioteca e 3 páginas com suas 4 abas. Testar que uma nova entrada de dados rende sem copiar componentes.

**Proibido:** upload real, novas rotas administrativas operacionais, alteração de grants, migrações, APIs clínicas, envio RNDS, publicação para UBS, qualquer deploy, merge ou alterações em prod/PROD/develop/VPS.

## Missões seguintes, NÃO autorizadas nesta execução

- **P2 — PDFs reais:** ingestão com hash e direitos conferidos, visualizador e download real protegido.
- **P3 — Admin e Governança:** cadastro, versionamento, validação por revisor clínico e distribuição por UBS, após desenho de IAM/schema em clone isolado.
- **P4 — Homologação:** conteúdo/fluxos/checklists derivados dos PDFs, revisão assistencial, segurança e testes institucionais.

**STOP após a P1:** produzir relatório dos artefatos e testes e esperar autorização para avançar para P2/P3.