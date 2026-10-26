# Missão 04 — Slice E: Comercial e vitrine isolada

Base: `5171026699d375c6eae5bd645f1fca6433eaf3f6`, branch `feature/ux-iam-convites-vitrine-email`. E permanece sem staging, commit ou push, aguardando revisão. Não foram alterados migrations, schema, bootstrap IAM, catálogo de permissões ou contratos clínicos/autenticação. Nenhuma credencial ou sessão do operador foi acessada.

## Fechamento do D e gate de entrada

O commit principal D `ed8b1ca0cdd9fd69882b29d081575ba2bb3ee3d7` contém exatamente os 66 caminhos aprovados. Após os ajustes de CI descritos abaixo, o SHA local/remoto final é `5171026699d375c6eae5bd645f1fca6433eaf3f6`.

[Workflow 40066409046](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40066409046): **SUCCESS**. Job `F04 security, migrations and production builds`: SUCCESS, todos os gates executados, incluindo D, B, C, autenticação/MFA, primeiro acesso, Beta/F04/F03, migrations, separação PostgreSQL, Docker funcional e Trivy HIGH/CRITICAL. `Publish Docker images` e `Deploy to VPS`: SKIPPED. [PR #5](https://github.com/joaoCarlosGM/pap-saude/pull/5): OPEN, draft, base develop preservada. Recibo completo dos jobs/steps em `docs/evidence/missao-04-e/d-ci.json`.

Falhas do fechamento D e correções restritas, sem flexibilizar controles:

- Run 40063921155: smoke local esperava query token; passou a validar fragmento, origem/path exatos e ausência de query. Commit `8b8b28f4bd35a56b3e018e690aaa701293ccf3de`.
- Run 40064414519: WCAG B falhou no Chromium do CI, mas o reporter descartava o diagnóstico; commit `ebe1536b9b5a0cdc4e070153aea987d8891b50ac` acrescentou diagnóstico sanitizado de contraste.
- Run 40065245130: confirmou contraste 3,83:1 nos controles do cabeçalho admin durante troca de tema. Reprodução local RED incluiu hover 1,5:1. Commit final `5171026` removeu interpolação indevida de cores e corrigiu hover escuro. GREEN B 28+5, C 41+8, TypeScript, lint/build e CI completo. Nenhuma regra axe foi removida e nenhum retry foi adicionado.

## Implementação E

`/comercial` tem navegação própria, verde petróleo, roteiro de apresentação, notificações persistentes existentes da própria identidade, segurança e logout. CTA **Abrir vitrine demonstrativa** conduz à vitrine rosa. Leads/propostas estão explicitamente **Em construção**; não há métricas ou oportunidades inventadas nessa área.

`/vitrine` reutiliza `DashboardShell`, Sidebar, Topbar, KPIs, gráficos, riscos, atendimentos, DPPs, ações rápidas, CourseCard, ToolCard e ProtocolCard. O dashboard clínico passa a compartilhar a apresentação `ClinicalDashboardView`; conserva seu guard e as fontes anteriores. O indicador clínico preexistente é identificado como ilustrativo; não foi convertido em métrica operacional. O banner de cursos clínico apresenta **Ainda não há recomendações** enquanto não existir catálogo agregado autorizado. Popularidade, duração e progresso da vitrine são explicitamente fictícios.

A demonstração inclui personagens, busca/estado vazio, fichas e resumos em dialog nativo, simulação de registro sem persistência, protocolos sem download real, ferramentas com cenário fixo, cursos com progresso apenas em memória e chat com pergunta/resposta predeterminadas. Nenhuma IA, vídeo externo, certificado, matrícula, e-mail ou integração é acionada. Recarregar reinicia interações. Uma ilustração SVG local foi adicionada; a arte local de cuidado existente foi reutilizada no Comercial.

## Fronteira de segurança

`requireCommercialSession` revalida, em transação RepeatableRead, sessão viva/usuário ativo, concessão **global explícita de sistema COMMERCIAL**, catálogo e permissão persistida `commercial.read`. Não carrega Membership ou Organization. Administradores não recebem entrada implícita. Se há TOTP ativo, exige prova da própria sessão posterior ao fator e à criação da sessão, sem data futura. Identidade com PAP_ADMIN/PAP_MANAGER global acumulado continua exigindo fator/prova; MFA opcional do Comercial sem fator permanece opcional. Nenhum requisito obrigatório de profissional foi modificado.

A revisão encontrou e corrigiu um loop potencial de sessão Comercial primária com TOTP ativo: login encaminhava ao Comercial, cujo guard recusava a sessão e a devolvia ao login. O guard agora distingue falta de MFA; a página Comercial exibe apenas orientação de reautenticação, sem liberar workspace/DEMO. A vitrine encaminha a essa orientação e suas APIs continuam 403. O botão encerra somente a sessão atual pelo logout existente, permitindo novo login com senha + TOTP/recuperação já cadastrados. Nenhuma chave é gerada e o wizard concluído não reabre. O E2E efetua esse novo login real, verifica ausência de loop e preservação de outra sessão válida.

Layout e páginas de `/vitrine`, `/comercial` e todos os handlers `/api/vitrine/[section]` usam o guard no servidor. APIs respondem no-store/Vary Cookie/no-referrer; DTOs têm `mode: DEMO`, `scope: SYNTHETIC`. A lista de seções é fechada, query strings e headers de seleção de tenant são negados, IDs reais não são aceitos. POST aceita somente personagem/tipo fixos, origem confiável e JSON limitado a 8 KiB. Erros inesperados não serializam exceções, dados de requisição ou detalhes de banco.

Os fixtures de servidor não importam banco, serviços clínicos ou integrações e retornam `structuredClone` por chamada. Uma requisição DEMO já iniciada pode terminar com o snapshot autorizado; não existe escrita operacional nessa transação. Após revogação confirmada, as próximas requisições são negadas. Não é prometida revogação retroativa de conteúdo sintético já exibido.

## Validação

| Comando executado | Resultado | Quantidade / evidência |
|---|---|---|
| `npm ci` | PASS | exit 0 |
| `npx prisma generate` | PASS | exit 0 |
| `npm run test:mission04:b:browser` | PASS | 28/28 testes + 5 E2E |
| `npm run test:mission04:d:browser` | PASS | 32/32 testes + 8 E2E |
| `npm run test:first-access:browser` | PASS | 21/21 testes + 15 E2E |
| `npm run test:auth` | PASS | 202/202 testes |
| `npm run test:admin:beta1` | PASS | 29/29 testes |
| `npm run audit:f04:operations` | PASS | 78/78 testes |
| `npm run test:f03:smart:force` | PASS | 203/203 testes |
| `npm run test:mission04:c:browser` | PASS | 41/41 testes + 8 E2E |
| `node scripts/security/guard-f04-ci-workflow.mjs` | PASS | exit 0 |
| `bash scripts/test-f04-role-separation.sh` | PASS | exit 0 |
| `npm ci` | PASS | exit 0 |
| `npx prisma generate` | PASS | exit 0 |
| `npx next typegen` | PASS | exit 0 |
| `npm run test:mission04:e:browser` | PASS | 8/8 testes + 6 E2E + 108 recibos HTML/RSC/prefetch; 15 capturas; WCAG/teclado/temas |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | exit 0 |
| `npm run build` | PASS | exit 0 |
| `git diff --check` | PASS | exit 0 |
| `docker build --add-host proxy:172.31.3.45 --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret id=build_ca,src=/usr/local/share/ca-certificates/environment-proxy-ca.crt --target runner -t pap-saude:m04-e .` | PASS | exit 0 |
| `docker build --add-host proxy:172.31.3.45 --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY --secret id=build_ca,src=/usr/local/share/ca-certificates/environment-proxy-ca.crt --target migrator -t pap-saude-migrator:m04-e .` | PASS | exit 0 |
| `bash scripts/test-f04-migrator-image.sh pap-saude-migrator:m04-e` | PASS | exit 0 |
| `bash scripts/test-f04-web-image.sh pap-saude:m04-e pap-saude-migrator:m04-e` | PASS | exit 0 |
| `bash scripts/test-mission04-e-image.sh pap-saude:m04-e` | PASS | exit 0 |
| `bash scripts/security/scan-f04-images.sh pap-saude:m04-e pap-saude-migrator:m04-e` | PASS | exit 0 |
| `npm audit --json` | FAIL | 3 HIGH, 2 MODERATE, 0 CRITICAL |
| `npm audit --omit=dev --audit-level=high --json` | PASS | 0 HIGH, 1 MODERATE, 0 CRITICAL |
| `npm audit --prefix docker/migrator --include=dev --audit-level=high --json` | PASS | 0 HIGH, 1 MODERATE, 0 CRITICAL |
| CI remoto E (aguarda aprovação para versionamento) | NOT RUN | depende de execução/validação externa própria |
| homologação do operador (laboratório intocado) | NOT RUN | depende de execução/validação externa própria |
| Safari/Firefox/leitor de tela humano | NOT RUN | depende de execução/validação externa própria |
| envio real de e-mail/DNS/VPS/deploy (não autorizados) | NOT RUN | depende de execução/validação externa própria |
| Estado oficial de CVE-2026-107891: consulta pública indisponível | NOT RUN | depende de execução/validação externa própria |

Os testes RSC respeitam a normalização `_rsc` e distinguem redirect HTTP, redirect no stream Flight e prefetch de metadados sem render. Os 108 recibos sanitizados estão em `rsc-boundaries.json`; HTTP 200 de prefetch não é tratado como autorização.

## Homologação manual proposta (não executada no laboratório do operador)

O laboratório atual **não foi atualizado**. Executar estes passos somente após revisão/versionamento E e autorização separada para disponibilizar essa versão em um ambiente de homologação. Não executar init, provisionamento, reset, rotação de MFA ou atualização automática do worktree manual.

1. Na origem de homologação autorizada, entrar como PAP_ADMIN com senha e TOTP existentes; emitir convite COMMERCIAL para endereço de demonstração e consultar a captura local, sem Resend/envio externo.
2. Em janela privativa, aceitar o convite pelo fragmento, confirmar identidade/senha e entrar. Antes da aprovação, conferir `/aguardando-autorizacao`; a vitrine deve continuar indisponível.
3. Aprovar exatamente o papel aceito como PAP_ADMIN ou gerente emissor autorizado; consultar novamente o estado e seguir para `/comercial`, sem reabrir onboarding concluído. Identidades com TOTP ativo devem autenticar com MFA.
4. Conferir notificações próprias, Em construção, CTA, tema e navegação. Abrir `/vitrine` e percorrer Pacientes, Registro, Atendimentos, Protocolos, Ferramentas, Cursos, Chat e Ajuda. Usar somente personagens disponibilizadas; verificar disclaimer, dialogs/Escape, busca sem resultado e reinício de simulação.
5. Recarregar após simular curso/registro: nenhum progresso clínico deve persistir. Tentar `/dashboard`, `/pacientes`, `/admin` e APIs clínicas em sessão Comercial: acesso negado/redirecionado sem conteúdo real. Revogar o perfil e confirmar recusa na requisição seguinte. Sair e conferir novo bloqueio.
6. Repetir 320/768/1440 px, tema claro/escuro e navegação por teclado. Não colar tokens, senhas, TOTP ou links privados em evidências.

Para automação em infraestrutura descartável com propriedade comprovada: `npm ci`, `npx prisma generate`, `npm run test:mission04:e:browser`. O harness recusa banco/role preexistentes, aplica migrations duas vezes e verifica drift. Nunca apontá-lo para o PostgreSQL do operador.

## Preservação e limites

Nenhum recurso do laboratório manual `~/projetos/pap-saude-onboarding` foi acessado, lido, atualizado ou alterado. Não houve acesso à VPS, DNS, produção, banco/volume manual, conta PAP_ADMIN, senha, sessão, chave ou MFA existentes. Testes usam exclusivamente o container descartável de propriedade comprovada nesta execução e bancos específicos que são eliminados ao final; screenshots contêm somente dados sintéticos e nome próprio mascarado. Nenhum e-mail externo foi enviado.

Homologação humana, leitores de tela reais, Safari/Firefox e CI remoto do E serão explicitamente NOT RUN até execução própria. O CI verde do D não substitui CI do E. Os detalhes de dependências, inventário e diffs estão na auditoria independente do E.

## Resultado para revisão

Validações funcionais e gates locais executados: PASS, incluindo web/migrator funcionais, recusa standalone sem rede/DB e Trivy HIGH/CRITICAL. O arquivo `initial-findings.json` registra falhas iniciais de preparação/teste e a correção de navegação MFA; não foram usadas validações históricas para substituir os testes E finais.

Riscos: auditoria completa npm continua FAIL por 3 HIGH de desenvolvimento e 2 MODERATE; produção/migrator passam o nível HIGH com 1 MODERATE cada. Trivy concluiu exit 0 nas duas imagens com advertência de metadados ausentes de CVE-2026-107891, cujo estado oficial não pôde ser consultado. Nada foi suprimido. CI remoto E, homologação humana e estado público dessa CVE permanecem externos/pendentes. E está pronto para revisão, sem GO de produção.

Capturas: [Comercial desktop](../evidence/missao-04-e/comercial-1440-light.png), [Comercial mobile/dark](../evidence/missao-04-e/comercial-320-dark.png), [vitrine desktop](../evidence/missao-04-e/vitrine-1440-light.png), [vitrine mobile](../evidence/missao-04-e/vitrine-320-light.png) e [reautenticação MFA](../evidence/missao-04-e/mfa-required-dark.png). As 15 capturas completas constam no inventário da auditoria.

A conferência final também verificou whitespace de cada arquivo novo sem staging (`git diff --no-index --check`). O diff de autorização usa contexto zero para preservar um patch válido sem espaços em linhas de contexto vazias. O log público remove ANSI, URLs de banco e espaços finais de terminal; saídas brutas permanecem na área ignorada. Nenhum conteúdo funcional foi alterado nessa normalização.
