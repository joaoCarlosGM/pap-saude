## Problema e comportamento

A demonstração de `prod` usava identidades, históricos e indicadores independentes; o Registro não salvava dados e exibia MEOWS zero sem protocolo implementado. Esta branch compartilha uma base sintética tipada entre ficha, lista, atendimentos e Dashboard, preservando a identidade visual, oito cartões, oito abas e cinco etapas.

Inclui validações, DUM desconhecida, históricos múltiplos, conclusão/revisão em memória, filtros combinados, documentos e ações indisponíveis honestos, robô com três estrelas e melhorias de foco/drawer/mobile. Novos registros não recebem score, risco ou conduta automáticos.

## Validação e bloqueios — NÃO REALIZAR MERGE

- PASS: 10 testes Node; TypeScript; lint; três jornadas browser; seis larguras; gráficos zero e terminologia; 28 capturas antes/depois.
- BLOCKED: `npm run build` local falha ao acessar Google Fonts (CONNECT 403). Imports/tipografia originais preservados, sem mocks ou bypass TLS.
- CI remoto deve ser concluído no SHA desta branch; nenhum CI P0 vale para esta alteração. Workflow existente não foi alterado e não executa os novos testes Node/browser automaticamente.
- Operação apenas demonstrativa: alterações em memória são descartadas ao recarregar; preferências não implementadas ficam indisponíveis; sem autenticação real ou prontuário operacional.

Detalhes: `docs/vitrine/RELATORIO.md`, `VISUAL.md`, `evidence/validation.json`, `INVENTARIO.json`.

Sem alterações de schema/migrations, PostgreSQL, ambientes, Docker/CI/deploy, VPS, DNS, P0 ou laboratórios. Sem merge ou deploy. Base solicitada: `prod`, sem push direto nela.
