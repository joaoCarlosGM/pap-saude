# Prompt de implementação para Codex — PAP-Protocols Beta 1

## Missão

Implementar o módulo de Protocolos na branch atual do repositório joaoCarlosGM/pap-saude, seguindo **integralmente** [PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md](./PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md). Este é o documento de escopo atual e prevalece, para Protocolos, sobre instruções antigas de navegação ou branch contidas no pacote PAP_SAUDE_BETA1_MISSAO_CODEX_20261030.

### Insumos

Três PDFs verdadeiros fornecidos pelo operador:
1. "Pré eclampsia.pdf", documento institucional **Síndromes Hipertensivas na Gestação**, PRT.UMUL.012 v01, 25 páginas, SHA-256 63a0dc9b93bc3be45632bcf46649c92d7118884135ac2ff8a95aa565830804d1.
2. "Hpp.pdf", **Prevenção e Manejo da Hemorragia Pós-Parto**, PRT.UMUL.003 v03, 34 páginas, SHA-256 f48c79881152eae50e25ebaf8d354f1219db7c8dd9d5c41b8cfb8ff2360337d2.
3. "Sepse.pdf", **Protocolo de Sepse em Pacientes Obstétricas**, HUAB-UFRN/EBSERH v2 2025, 36 páginas digitais, SHA-256 5d4e5756b397ade0adc829cca8336eec86db14e955c22a528fa533a9a75f093b. A identificação documental diverge entre capa e página interna; exigir revisão.

**Os bytes PDFs não estão incluídos nesta branch por este prompt.** Se não disponíveis na sessão/checkout autorizado, não inventar arquivos: marcar ingestão PDF como BLOQUEADA e implementar a interface e os testes independentes.

### Escopo de implementação

- Biblioteca com busca, filtros, cards e status dos três protocolos; remover placeholders antigos da experiência inicial sem remover histórico útil.
- Ao clicar "Visualizar", abrir página genérica estruturada e reusável para N protocolos.
- Tabs: Visão geral, Fluxograma, Checklist, Documento original.
- Checklist consultivo com agrupamentos validados, interações acessíveis e progresso local não clínico.
- Fluxograma visual navegável, com links de proveniência no PDF; sem decisões automatizadas.
- PDF real: visualização por página/zoom e download correto, autorizado, com filename e integridade.
- Preservar Vitrine sintética e rotas clínicas/tenant segregados; Chat IA e Cursos seguem visíveis **Em breve** na sidebar da Vitrine.
- Preparar arquitetura de versionamento, revisão e distribuição por UBS como especificado. Editor/painel de gestão devem observar escopo administrativo, autoridade clínica e validação de upload.
- Não adicionar mecanismo de CDS, IA de diagnóstico ou emissão automática de condutas. Material derivado de PDF requer revisão humana responsável.

### Passos obrigatórios

1. Ler AGENTS.md, confirmar branch/HEAD/status e arquivos atuais de protocolos. Não tocar em alterações locais não commitadas.
2. Reportar plano e lacunas, depois implementar em slices pequenos com testes a cada etapa.
3. Testar catálogo, visualizações, três checklists, navegação por abas, PDFs, responsividade e autorização, sem dados reais de pacientes.
4. Comparar hashes dos PDFs originais e verificar que "Baixar PDF" não é console.log nem window.open sem arquivo.
5. Demonstrar criação de um quarto protocolo por dados/configuração, sem duplicar componentes.
6. Entregar relatório de PASS/FAIL/BLOCKED, commits e capturas das telas.

### Restrições absolutas

- Sem merge, deploy, alteração de Nginx, VPS, RNDS, credenciais, e-mail ou APIs clínicas em produção.
- Sem migrations destrutivas, reset, seeds nas bases persistentes, mudança de contas/MFA, apagamento de banco/volumes.
- Não abrir as rotas operacionais pela allowlist do Admin Beta isolado.
- Não alegar conteúdo assistencial homologado, arquivos publicados ou download funcional sem evidência real.
- Ao concluir, parar e solicitar homologação técnica e clínica antes de qualquer implantação.
