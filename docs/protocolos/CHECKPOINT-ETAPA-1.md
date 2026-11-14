# PAP-Protocols — checkpoint controlado da Etapa 1

Base verificada: `12f67cda73012668c56f8509878531351af50311`.
Branch: `feature/beta1-protocols-priority-nav`; worktree isolada em `/tmp/pap-protocols-stage1`.
Checkout principal e suas alterações locais preservados.

## Escopo e decisões

- Somente frontend sintético P1. PAP-ID/Etapa2, PDFs reais, publicação clínica e Admin fora do escopo.
- Lidos AGENTS e os cinco Markdown de docs/protocolos. Nove PNGs conferidos visualmente,
  todos1672×941. As seis imagens do branch irmão PAP-ID também existem; apenas inventário
  de ativos, nenhum porte/implementação de PAP-ID.
- PDFs/bytes, direitos de redistribuição e curadoria clínica: **BLOCKED**. Hashes/páginas
  informados no MD são expectativas, não validação dos originais.
- Detalhe canônico equivalente: `/vitrine/protocolos?protocolo=<slug>&aba=<aba>`.
  Preserva caminho permitido, guards e Nginx; nenhum prefixo novo nem rota operacional aberta.
  Query é validada no servidor contra catálogo/abas finitos. URLs desconhecidas retornam404.
- Catálogo tipado/validado com três fontes informadas, todas Em revisão; renderer único
  para Visão geral, Fluxograma, Checklist e Documento original. Quarto documento só em teste.
- Fluxo documental neutro e checklist de leitura em memória; sem limiares, doses,
  prescrições, classificação ou ações em atendimento. Não copiar condutas dos conceitos PNG.
- Cursos/Chat: texto/ícone Em breve, sem href/eventos/tabindex; acesso direto e player
  de curso demonstrativo mostram indisponibilidade. LMS operacional e código legado mantidos.
- Tutorial deriva os seis passos existentes para não encaminhar a recursos pausados;
  core sintético, pacientes/Registro e reset existentes não são reimplementados.
- Sem banco, Docker, migrations, contas, chaves ou MFA. Browser usa fixture separada em
  loopback, sem API/DB. Auth/MFA reais não serão declarados reexecutados sem banco autorizado.

## Checklist de execução

- [x] Branch/HEAD/status, documentação e nove referências verificados.
- [x] Catálogo/validação/rotas e biblioteca reutilizável.
- [x] Quatro abas, fluxo documental, checklist em memória e estado de PDF ausente.
- [x] Pausa segura de Cursos/Chat e regressão de tutorial.
- [x] Unit/SSR, quarto protocolo por dados, fronteiras de rotas e isolamento.
- [x] Navegador desktop/mobile, abas/history/reload, teclado/Axe e capturas.
- [x] TypeScript, lint, diff/segredos, relatório PASS/FAIL/BLOCKED e commits seletivos.
- [x] Entrega para homologação e STOP antes da Etapa2.

## Fechamento

Implementação validada: `ed7f5e42beadbcbdc0ddac16772349b5b68fb3a4`.
106 testes Node (95 Premium/Protocolos +11 Comercial/RSC),9 browser e2 de
recaptura: PASS. TypeScript/lint: PASS (quatro avisos herdados fora do diff).
27 capturas com fontes locais reais. A matriz automatizada é
320/375/390/430/768/1440; capturas da biblioteca e12 combinações em1440/390,
mais documento em modo escuro. Detalhes e inventário no RELATORIO-ETAPA-1.md.
PDFs, direitos e curadoria clínica: BLOCKED. Auth/DB/CI integral: NOT RUN.
Nenhum recurso de laboratório/VPS alterado. Parar aqui; PAP-ID exige aprovação.
