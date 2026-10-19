# PAP Admin V3 — referência visual aprovada

**Situação:** protótipo HTML interativo aprovado no ChatGPT, congelado como REFERÊNCIA DE DESIGN. Não é aplicação Next.js nem versão homologada do PAP Admin. Todos os registros mostrados no protótipo são demonstrativos; interações podem persistir somente no navegador. Não possui serviço de e-mail, permissões server-side, integração SQL ou dados reais.

## Arquivo original

- `prototypes/pap-admin-v3/index.html` — HTML/CSS/JS em arquivo único, autocontido; CSS e JS inline, sem assets ou fetch externos. Abrir no navegador local para inspecionar as telas. Título PAP Saúde · Admin v3 — Tickets, Kanban e Manutenção.

## Como consultar durante a Missão 02 sem trocar sua branch

```bash
git fetch origin reference/pap-admin-v3
git show origin/reference/pap-admin-v3:prototypes/pap-admin-v3/index.html > /tmp/pap-admin-v3-reference.html
# Abra /tmp/pap-admin-v3-reference.html no navegador ou use browser automation local.
```

Se a URL do GitHub puder ser acessada diretamente pelo navegador, usar:
`https://github.com/joaoCarlosGM/pap-saude/blob/reference/pap-admin-v3/prototypes/pap-admin-v3/index.html`.

## Padrão visual aprovado (leitura do CSS original)

- Paleta shell verde-azulado escuro `#09282c`; sidebar em gradiente escuro; cor institucional PAP `#064f50`; superfícies `#f5f7f6` e branco; destaque rosa `#de4d86`; verde suave `#d9f5ea`.
- Sidebar compactável, grupos e navegação estruturada, estado ativo claro, ícones, comportamento responsivo.
- Conteúdo principal com superfícies amplas arredondadas, KPIs, gráficos, tabela, ranking, estados de carregamento, filtros, badges discretos e microinterações.
- Telas demonstrativas existentes: Visão geral, Central de TAs, Kanban, Manutenção e áreas administrativas, adaptadas desktop e mobile.
- A referência é de estilo, navegação, proporção, hierarquia e estados interativos. A implementação final deve ser React/Next.js acessível e usar APIs reais e permissionamento server-side.

## Regra de escopo: Missão 02 vs F07

**Missão 02 (PAP Admin Beta 1):** incorporar layout, sidebar e visual premium à gestão de UBS, solicitações, convites, usuários, permissões, auditoria, dashboards e métricas reais — estas funcionalidades deverão ser implementadas no projeto Next.js.

**F07 (posterior):** deixar as funcionalidades completas de Central de TAs, Kanban, indicadores de manutenção e perfil de desenvolvedor sênior para uma etapa separada, prioritariamente do administrador geral. Não incluir tabelas ou APIs para esses módulos na Beta 1 só porque existem na demonstração.

## Restrições

Nunca tratar dados ou números do HTML como verdade operacional; nunca migrar HTML de demonstração diretamente para produção; não substituir IAM/multitenancy da F04. Não adicionar este protótipo como rota pública em produção. Para screenshots atualizados, renderize o HTML localmente em viewport desktop e mobile após fazer fetch desta branch.

Esta branch `reference/pap-admin-v3` é **somente referência**, criada separada da branch de execução `codex/pap-admin-beta1` para evitar conflitos de desenvolvimento.
