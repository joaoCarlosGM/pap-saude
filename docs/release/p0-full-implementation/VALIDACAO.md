# P0 — implementação e validação após homologação

Branch `codex/p0-full-implementation`, base `e3c0cbc18ffa98be64470a7153b1e798a00fbe14`. Candidato original `8b81b486e29f603f082ac63e159d5621ecc4ff84` e branch do perfil local permanecem intactos. Um agente; nenhum merge, deploy, envio externo de e-mail ou acesso à VPS/laboratórios do operador.

## Estado dos requisitos

| Bloco | Implementação | Aceite restante |
|---|---|---|
| A | Layout aprovado adaptado aos endpoints reais, responsividade/dark, mostrar senha, recuperação neutra e erros de transporte reais | **BLOCKED fotografia/licença:** Pexels recusado HTTP403. Ilustração anterior permanece identificada como ilustração; não declarar login fotográfico concluído |
| B | MFA universal nos guards operacionais, Comercial e transação de registro; inscrição/recuperação próprias preservadas. CAPTCHA CSPRNG, PNG sem fontes, digest salgado, binding HttpOnly/origem, TTL, consumo atômico e limite persistente | CAPTCHA próprio não é prova forte contra bots; alternativa textual de cálculo é automatizável. MFA e limites de credenciais continuam obrigatórios |
| C | Perfil próprio persistido e auditado com allowlist; campos sem suporte indisponíveis. Dashboard servidor, escopo real, pacientes distintos, períodos UTC, sem mocks/MEOWS/comparativos inventados | Aceite manual de F5/perfis e indicadores no laboratório autorizado: NOT RUN |
| D | Pendências acionáveis/paginadas e contagens reais; permissões por grant, sem combinar autoridade global e local; links por ID exato; lista institucional sem filtro inicial NEW. Rede município→UBS→pessoas/convites/solicitação com projeção privada autorizada. Avisos de convite aceito persistentes e badge real | Notificações genéricas de todos os eventos institucionais não foram acrescentadas: o modelo atual é vinculado a convites. Outros trabalhos são indicadores persistentes derivados dos estados institucionais; ampliação do inbox requer contrato próprio |
| E | Mesmo shell/sidebar/header/dashboard/cards/ficha/etapas de registro. Fontes REAL/DEMO separadas no servidor; demo só sintético, sem escrita clínica. Ícone IA compartilhado com três estrelas e reduced-motion | Cursos/protocolos/ferramentas/chat sem backend ficam indisponíveis no operacional; demo é simulação explícita, não implementação desses serviços |
| F | Confirmação de senha também no servidor; acessibilidade e contratos de regressão atualizados; fixtures positivas provam MFA real e negativas continuam primárias; runner descartável; novos gates adicionados ao CI sem substituir os existentes | Build de produção e CI completo no SHA final não aprovados; **NO-GO de release** |

## Evidências executadas

Logs completos permanecem privados em `.test-audit/p0-full/`; hashes e resultados em [evidence/validation.json](evidence/validation.json). Não somar execuções repetidas como casos novos. Não interpretar estes testes de área como pipeline completa aprovada no SHA final.

| Comando/gate realmente executado | Resultado |
|---|---|
| `npm run test:p0:full` (runner novo, PostgreSQL próprio, antes dos últimos refinamentos direcionados) | PASS 28/28, zero skip; incrementos posteriores testados abaixo |
| `tsx --test tests/auth/http-auth.integration.test.ts` / `http-mfa.integration.test.ts`, banco descartável nomeado e autorizado | PASS 7 + 2; autenticação/CAPTCHA reais. Limpeza corrigida para preservar auditoria append-only, sem desabilitar triggers |
| `tsx --test tests/first-access/login-navigation.test.ts` / `security.test.ts` | PASS 10 + 10. Profissional não pode adiar MFA. Navegação repetida de Comercial configurado não reabre onboarding |
| `tsx --test tests/mission04-e/access.test.ts` | PASS 8/8, política atualizada para MFA obrigatório |
| Harness P0 de registro, reutilizando cliente Prisma compatível existente | PASS 68/68; rollback de interrupções, repetição, conflitos, concorrência e invariantes do registro |
| `bash scripts/test-p0-clinical-runtime.sh` | Node PASS 39/39, drift, ACL e login runtime mínimo PASS; os dois testes browser antigos falharam no contrato CAPTCHA e foram corrigidos e repetidos separadamente |
| `playwright test --config tests/release/mfa-block-ui.playwright.config.ts` direcionado após correção | PASS 2/2 no Next real; respostas de autenticação interceptadas somente neste teste de UI. Limites backend têm testes próprios reais |
| Playwright profissional sem MFA, config privada derivada da configuração existente | PASS 1/1 com Next/Chromium/PostgreSQL reais; clínica e API bloqueadas, sem criar fator automaticamente |
| Playwright profissional com MFA verificado | PASS 1/1; dashboard/pacientes permitidos no escopo e API de outra UBS negada |
| `tests/mission04-c/invitations.test.ts` | Primeira execução completa: 37 PASS / 3 FAIL. As três divergências eram contratos de fixture/DTO; corrigidas, PASS 3/3 direcionado. Testes negativos continuam sem MFA. Snapshot separa avisos de pendência dos avisos de concessão e preserva ambos nas comparações contra efeitos indevidos |
| `tests/p0-full/pending.test.ts`, casos incrementais | PASS: escopo por grant (sem autoridade global acidental), convites privados por UBS sem hashes e foco exato/READY visível sem filtro; ver logs individuais |
| `tests/p0-full/operational-data.test.ts`, caso incremental | PASS: paciente desvinculado/inativo não aparece em atendimentos, séries ou contagens |
| CAPTCHA geométrico/HTTP/expiração/replay/concorrência | PASS 5 casos selecionados; PNG usa geometria própria, sem depender de fontes do sistema ou downloads |
| StrictMode CAPTCHA / ficha compartilhada | PASS 1 + 1 direcionados; uma emissão inicial, e ficha DEMO sem requisição clínica |
| TypeScript, lint e `git diff --check` | PASS; lint completo: zero erros e quatro warnings herdados em testes P0 |
| Guard SQL, guard de CI e dois testes do workflow | PASS; sem exceção SQL nova, sem ampliar publicação/deploy |
| Contexto GitHub/local da branch e branch desconhecida | PASS 3/3; apenas a nova branch exata foi acrescentada, contextos desconhecidos continuam negados |
| `npm ci --dry-run --ignore-scripts --offline --no-audit --no-fund` | PASS; não reinstala dependências nem substitui o `npm ci` real do CI |
| `next build --webpack` | **FAIL**: Geist/Geist Mono/Inter não puderam ser obtidas do Google Fonts. Nenhuma fonte/gate desativado para obter PASS |
| F03/F04/Beta/B–E completos, Docker web/migrator e scanners no candidato final | **NOT RUN localmente nesta missão**; gates existentes preservados para a execução remota única |

Os primeiros ensaios de C foram bloqueados pela configuração do harness (mailer exige desenvolvimento, banco/porta e pasta de teste específicos). Foi criado somente um PostgreSQL descartável novo para o mailer, em loopback5432, sem adotar recursos existentes ou afrouxar o guard. A readiness foi confirmada antes da aplicação das migrations. O erro posterior no extrator de convite foi corrigido no helper; não era uma alteração da autenticação em produção.

## Integridade e riscos

- As 34 migrations históricas são idênticas à base; a única nova migration 35 amplia o CHECK de tipo de notificação. Não modifica contas, senhas, MFA, sessões, dados clínicos ou ACL. Aplicada apenas a bancos descartáveis identificados.
- `sharp` já estava no lock em 0.35.5; foi declarado diretamente por ser usado no CAPTCHA. Normalização offline removeu apenas marcações de opcionalidade pertinentes. Versões, URLs de resolução e integridades de todos os pacotes permanecem iguais.
- Auditoria de produção: 6 MODERATE, 0 HIGH/CRITICAL; comando `npm audit --omit=dev --json` saiu 1 por moderadas. Auditoria completa: 12 HIGH, 11 MODERATE, 1 LOW, 0 CRITICAL. Pacotes, dependências e GHSA em [dependency-audit.json](evidence/dependency-audit.json). Sem audit fix, force ou overrides.
- As HIGH da árvore completa não aparecem na auditoria omitindo desenvolvimento; incluem shadcn/MCP/registry/Express/undici e tooling ESLint/zod. São risco de desenvolvimento/build, não aprovação automática: executar ferramentas somente em ambiente isolado e sem segredos de produção. O alcance em imagens finais aguarda CI/Trivy.
- Migração exige revisão de lock/duração do CHECK e implantação coordenada antes de uso do novo tipo. Não misturar versões de UI que desconhecem o novo aviso. Não implica rollback reversível de dados.
- Permanece NO-GO de produção: CI exato, imagens/scanners, homologação manual, backup/restore do destino, infraestrutura/TLS, validação clínica qualificada e riscos residuais não aprovados. MEOWS continua não homologado.

## Continuidade

Próximo passo técnico: acompanhar o único CI acionado pelo push final de F, investigar apenas o primeiro gate que falhar e repetir somente testes afetados antes de novo candidato. A API GitHub retornou HTTP403 na consulta; nunca presumir sucesso. PR deve ser draft, base proposta `codex/p0-local-acceptance`, sem alterar PRs existentes.

Para concluir a fotografia falta obter o asset exato e verificar sua licença. O HTML anexado contém somente um link remoto e JS demonstrativo, que não foi incorporado como autenticação. Não gerar foto substituta nem declarar a licença verificada.

## Correção dirigida após o primeiro CI remoto

- Commit `a5a77de93b0c4b97e09abef050c7ec8fe40687b2`, [run 40677604924](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40677604924): **FAIL** no gate de primeiro acesso/MFA. Até o erro, passaram instalação, auditorias de produção/migrator, preflight/backup-restauração sintética, Prisma/typegen, guards, P0 servidor, F04 integrada, Beta Admin, desenvolvimento local e P0 UI. Gates B/C/D/E, F03, Auth, P0 clínico, Docker e Trivy posteriores: **SKIPPED/NOT RUN**. Publish/deploy: **SKIPPED**, sem execução.
- A página pública do GitHub permitiu confirmar SHA, etapas e conclusão; API REST retornou HTTP403, impedindo obter logs privados e criar o PR draft. Não atribuir causa remota exata além do gate/exit code 1; as causas abaixo foram reproduzidas localmente.
- Reprodução direcionada `f-ci-first-access-repro.log`: **FAIL 2/2** — login HTTP de fixture sem CAPTCHA e expectativa antiga de acesso profissional após adiar MFA.
- Correção exclusivamente em `tests/first-access/login-navigation.spec.ts`: emissão/solução do desafio acessível real antes do POST de login; profissional recebe `400/MFA_REQUIRED` ao adiar, permanece sem prova e tem API negada; somente depois de inscrição/verificação reais chega ao dashboard, sem loops e sem alterar a sessão primária. O cenário de ausência de papel usa sessão genuinamente verificada, isolando IAM da exigência anterior de MFA.
- Suíte browser afetada, com Next/Chromium/PostgreSQL reais: `f-ci-first-access-browser.log`, **13 PASS / 2 FAIL**. Passaram as jornadas completas de primeiro acesso/QR/recuperação/novo login dos três papéis e os dois casos corrigidos. A fixture sem papel foi corrigida e repetida: **PASS 1/1** em `f-ci-browser-remaining.log`.
- O outro FAIL era o teste visual usando uma origem já saturada por ensaios anteriores no mesmo banco descartável: contagem 34 na janela, limite 30. Diagnóstico privado confirmou ausência da pergunta após emissão negada; `f-ci-captcha-counters.log` registra apenas contagens/prazos, sem chaves. Sem apagar contadores ou mudar a política, aguardou-se a próxima janela; o mesmo teste visual passou **1/1** em `f-ci-login-visual-fresh-window.log`, incluindo 320/768/1440, dark, teclado, axe e medições originais.
- Não alegar 15/15 em uma nova execução integral: são 13 casos aprovados na suíte mais os dois casos restantes aprovados em repetições dirigidas. Nenhum assert de isolamento foi removido; nenhuma mudança de produção, schema, migration ou proteção nesta correção.
- TypeScript, ESLint do arquivo e diff check: **PASS**. Não repetir F03/F04, Docker ou scanners localmente por alteração exclusiva de teste. O novo push acionará o workflow existente; nunca reutilizar o resultado do SHA anterior como aprovação do novo.
- Screenshots gerados preservados apenas no diretório privado; arquivos de evidência históricos restaurados ao conteúdo versionado, sem substituir evidências aprovadas. Laboratórios do operador, contas, MFA, bancos, volumes e VPS permanecem intocados.
