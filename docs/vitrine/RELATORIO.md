# Vitrine prod — refinamento funcional

Base: `40896212cb01e35fb6b204f6226b8d28ba1f6d1b` (`origin/prod`). Branch: `feature/prod-vitrine-ui-refresh`.
Escopo: demonstração sintética exclusivamente no frontend. Sem importação de implementação P0, backend clínico, autenticação simulada apresentada como segurança, banco ou integração externa.

## Contratos e preservação visual

Sidebar branca, topbar verde-petróleo, ordem/rotas dos módulos, oito KPIs, grades, tabelas, oito abas da ficha e cinco etapas do Registro foram mantidos. Os componentes existentes continuam em uso. Cores, tipografia declarada e biblioteca UI foram preservadas. Foram adicionados indicadores pequenos de demonstração, subseções clínicas, mensagens/validações, foco de modal/drawer e um robô com três estrelas. A altura mínima dos KPIs conserva o espaço dos cartões originais após remover tendências fictícias.

A data civil determinística da apresentação é 28/10/2026, exposta na interface. DPP/IG não dependem de relógios aleatórios; consultas históricas preservam suas próprias datas. Datas civis são formatadas sem deslocamento de fuso; horários de consulta usam America/Fortaleza. Não se apresenta uma DPP anterior à referência como futura.

A fonte de verdade é `src/lib/demo/data.ts`, com fixtures em `fixtures.ts`, estado tipado em `DemoProvider` e compatibilidade dos três exports mock antigos. A base tem três pacientes e nove atendimentos identificados. Novos registros conservam o ID da paciente por identificador normalizado, recebem um atendimento próprio, atualizam os dados da ficha e mantêm o snapshot digitado. Memória de navegação apenas: recarregar restaura a base; há botão explícito de restauração com confirmação. Não há localStorage, API clínica, banco, persistência operacional ou envio de dados.

Cobertura populacional e duração média ficam indisponíveis: faltam população-alvo/critério e duração. Retorno significa pacientes com mais de uma consulta dividido pelo total. Gráficos e classificações de fixtures são ilustrativos; novos registros ficam NÃO AVALIADOS, sem score ou conduta. Os limites de entrada servem à demonstração e não constituem protocolo clínico.

## Matriz das 25 inconsistências / aceite

| # | Contrato implementado | Evidência dirigida |
|---|---|---|
| 1 | IDs e nomes compartilhados paciente/atendimento | data.test.mjs |
| 2 | IG coerente com DUM e data do respectivo registro | validation.ts + data.test.mjs |
| 3 | DPP e datas civis sem dia anterior por fuso | formatDemoDate/pregnancyFrom |
| 4 | Contagens/históricos derivados dos atendimentos existentes | data.test.mjs |
| 5 | Oito KPIs e gráficos derivados; indisponíveis explícitos | data.test.mjs |
| 6 | Futuras DPP filtradas por referência pública | data.test.mjs |
| 7 | Navegação atendimento → paciente correta | browser.mjs |
| 8 | Busca sintética real, sem falsa consulta DATASUS | IdentificationStep |
| 9 | Identidade obrigatória, sintaxe do CPF demonstrativo e data válida | registration.test.mjs |
| 10 | Alergias múltiplas, agente/reação/notas, investigação desconhecida | registration.test.mjs + browser.mjs |
| 11 | Medicações múltiplas com adicionar/remover | registration.test.mjs + browser.mjs |
| 12 | Comorbidades múltiplas e informação desconhecida | registration.test.mjs + browser.mjs |
| 13 | Contagens obstétricas e perdas gestacionais, sem negativos padrão | registration.test.mjs |
| 14 | DUM ausente/inválida/futura ou explicitamente desconhecida | registration.test.mjs + browser.mjs |
| 15 | Sinais ausentes não viram medições; valores impossíveis negados | registration.test.mjs |
| 16 | Pressão sistólica maior que diastólica | registration.test.mjs |
| 17 | Stub MEOWS retorna null; nenhuma classificação automática nova | registration.test.mjs |
| 18 | Revisão, observação, encaminhamento e desfecho manuais | browser.mjs |
| 19 | Salvar atualiza ficha, histórico e indicadores; sem paciente duplicada | registration.test.mjs + browser.mjs |
| 20 | Histórico/evolução usam datas, profissionais e medidas dos registros | data.test.mjs |
| 21 | Vacina pendente não aparece aplicada nem na timeline de aplicações | data.test.mjs + browser.mjs |
| 22 | Busca/período/classificação/profissional combinam e contam resultados | data.test.mjs + browser.mjs |
| 23 | Resumo IA informa indisponibilidade; sem chamada a modelo | AtendimentoTable |
| 24 | Documentos/protocolos/cursos/ferramentas/configurações honestos | browser.mjs + inspeção dos componentes |
| 25 | Chat IA simulado, três estrelas/reduced motion; mobile/foco/modal/drawer | browser.mjs |

## Execução reproduzível

```bash
npm ci
npm run test:demo
npx tsc --noEmit
npm run lint
npm run build
# Navegador em servidor exclusivamente local e sem banco:
npm run dev -- --webpack --hostname 127.0.0.1 --port 3301
# Outro terminal: ferramenta de teste instalada separadamente, sem alterar dependências da aplicação:
npm install --prefix /tmp/pap-vitrine-browser-tools --no-package-lock @playwright/test@1.64.1
PAP_PLAYWRIGHT_MODULE=/tmp/pap-vitrine-browser-tools/node_modules/@playwright/test \
PAP_CHROMIUM=/usr/bin/chromium node --test tests/demo/browser.mjs
```

O teste browser só permite origem HTTP em 127.0.0.1 com porta explícita. O runner aguarda hidratação antes de interagir, captura erros de página e verifica overflow em 320, 375, 390, 430, 768 e 1440 px, incluindo as subseções longas das etapas 4/5. Nenhum assert de ausência de erro ou isolamento foi removido.

## Resultados e limites

Os resultados finais, hashes, inventário e capturas selecionadas serão consolidados em `evidence/validation.json`. Logs completos permanecem privados em `.test-audit/vitrine/`.

- Build local: **FAIL/BLOCKED externo**. `npm run build` falha em `next/font` porque o proxy bloqueia o endpoint oficial do Google Fonts (CONNECT 403, confirmado separadamente). Nenhuma substituição de fonte, resposta mockada, bypass TLS ou alteração de configuração foi aplicada.
- As capturas locais usam o fallback do Next após a mesma falha de fonte, tanto antes quanto depois; a tipografia declarada permanece intacta. Homologação da fonte efetiva depende de ambiente com acesso ao provedor.
- A comparação e os testes devem ser lidos como demonstração, sem validação clínica, autenticação real, integração de IA, documentos reais ou persistência de prontuário. CPF tem validação sintática demonstrativa, sem consulta oficial.
- Preferências e notificações que não têm efeito real estão explicitamente indisponíveis. Confirmação de saída do Registro não foi implementada; seu controle está indisponível. Dados são descartados ao recarregar, por opção segura prevista na missão.
- Dependências/lock da prod foram preservados; não houve atualização de versões. Esta missão não certifica segurança/release da aplicação operacional.

O push será exclusivamente na feature; PR solicitado para `prod`, sem merge. Banco, schema, migrations, Dockerfiles, workflows, deploy, DNS, VPS, P0 e laboratórios do operador permanecem inalterados.

## Fechamento local

- **PASS**: 10 testes Node, 0 falhas/skips; TypeScript; `npm run lint`; `git diff --check`.
- **PASS**: três testes browser (jornada completa; documentos/estados; matriz responsiva/acessibilidade), mais a verificação final dirigida dos gráficos/terminologia. As 6 larguras passaram sem erro JS ou overflow. A jornada completa foi reexecutada após o ajuste do estado vazio da tabela de medicações.
- **PASS**: 28 capturas antes/depois e de novas subseções, índices em [VISUAL.md](VISUAL.md).
- **BLOCKED**: build local por Google Fonts CONNECT 403. Não há evidência válida de build do candidato final nem autorização de merge/release.
- CI do PR: **NOT RUN** até a criação do PR e conclusão do workflow. Push de feature não dispara o workflow existente; ele não foi alterado.

As rodadas iniciais falharam e foram preservadas nos logs privados. Entre os achados: seletor de alerta abrangia o anunciador do Next; DPP desconhecida era formatada como Date inválida; navegação/preload em modo dev falhava. O prefetch automático da sidebar e do link para paciente criado em memória foi desativado sem alterar cliques, URL, guards ou asserts. Com o conteúdo congelado, os testes finais de navegação e a matriz passaram. As páginas mantêm wrappers server; a leitura do estado sintético fica em componentes client.

O corpus de fontes não foi substituído para passar o build. Nenhum sucesso de CI anterior, incluindo o P0, foi reutilizado como validação desta branch. Decisão atual: **NO-GO para merge/deploy** até build/CI válidos e revisão das limitações externas.

## Publicação e bloqueio externo final

Seis commits seletivos publicados; código consolidado em `c23195402b1f271867c6a10f2fc1a7a78194244a`. A atualização documental posterior mantém o mesmo fingerprint de código/testes. `origin/prod` continuou em `40896212cb01e35fb6b204f6226b8d28ba1f6d1b`.

**PR: BLOCKED, não criado.** Tentativa `gh pr create --draft --base prod --head feature/prod-vitrine-ui-refresh` falhou com `Post https://api.github.com/graphql: Forbidden`. Fallback REST `POST /repos/joaoCarlosGM/pap-saude/pulls`, com `draft:true` e base `prod`, também recebeu `Forbidden`. Nenhum PR ou CI remoto foi declarado aprovado; nenhuma permissão/gate foi ampliada para contornar a negativa.

[Comparação para abrir o PR contra prod](https://github.com/joaoCarlosGM/pap-saude/compare/prod...feature/prod-vitrine-ui-refresh?expand=1). O texto está em `PR.md`; manter draft. O workflow existente só é acionado por push em prod ou PR para prod, portanto o push desta feature não equivale a CI.

Estado da missão: **BLOCKED / não concluída nos critérios finais**, até abertura do PR, build/CI do candidato e revisão da tipografia com acesso às fontes. A implementação/testes locais estão preservados e publicados para revisão. Sem merge, deploy, envio de e-mail, acesso a banco/VPS ou alteração do P0/laboratórios.
