# Evidências — PAP Saúde P0 Premium operacional

## Diagnóstico dirigido de CI — 29/10/2026

Run40890691031/SHA7671924: FAIL no subprocesso browser, confirmado pelo operador; publish/deploy SKIPPED. O erro externo não identifica a asserção. Reprodução com Node22.23.4 e checkout limpo do mesmo SHA:137 Node PASS, seed/replay/restore35 PASS, build real PASS, artefato2/2 PASS e browser5/5 PASS. A causa da divergência remota continua desconhecida.

O harness agora preserva o erro bruto somente em arquivo privado e publica um resumo com campos allowlisted. Não foram alteradas aplicação, segurança, asserts, timeouts ou paralelismo. Testes adversariais do diagnóstico3/3 PASS (dados privados, códigos de seis dígitos, campos injetados e erros de setup não vazam); TypeScript e lint dirigido PASS. Regressão browser com o novo harness5/5 PASS em DB descartável próprio, log /tmp/pap-unified-tests-qeCWK5/browser.log. Logs privados da reprodução Node22 e hashes: /tmp/pap-unified-evidence/node22-ci-diagnosis.json. CI do novo commit deverá confirmar o gate ou fornecer o primeiro diagnóstico seguro para uma correção dirigida; não representa GO de release.

Branch feature/p0-premium-unified-rc; base b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a.
O código foi versionado por responsabilidade. SHA final: consultar a entrega e `git rev-parse HEAD`.
Hashes de logs privados, capturas e prova de integridade Prisma em VALIDATION.json. Logs completos não são versionados porque podem conter valores dinâmicos das fixtures. Dados de testes integralmente sintéticos. Nenhuma evidência da branch demonstrativa substitui estas execuções.

## Jornadas reais observadas

Cinco testes Playwright serializados, em servidor standalone NODE_ENV=production, porta3610 e PostgreSQL próprio descartável: **PASS5/5**. Cookie/MFA positivos vieram de inscrição/desafio reais, não de alteração artificial de mfaVerifiedAt. O teste Admin também atravessou a tela real de login, CAPTCHA acessível e recuperação MFA legítima.

- Admin: login/CAPTCHA/MFA, métricas recebidas da API comparadas com contagem real de UBS na DB, rede, usuários, acessos, convites, auditoria, segurança, pendências e notificações.
- Clínica: cinco etapas do Registro real; primeira resposta perdida depois do COMMIT; repetição com mesma identidade; uma única paciente/gestação/consulta, recuperação após F5; Pacientes/ficha/Atendimentos/Dashboard e quatro KPIs `1,1,1,0` na UBS autorizada.
- Finalização: atendimento adicional criado pela API real, iniciado e concluído pelos botões da UI; DB confirma COMPLETED. PATCH de sinais vitais e obstetrícia no registro concluído retorna409 e preserva valores/duas entradas de proveniência.
- Negativos: Admin/Comercial sem acesso clínico em HTML/RSC/API; profissional sem MFA, fator revogado, UBS alheia e grant revogado negados. Comercial acessa /comercial e /vitrine, sem dados clínicos reais.
- UI: seis larguras320/375/390/430/768/1440, menu/Escape/restauração de foco, skip-link/Tab/Enter, movimento reduzido; Axe nas páginas operacionais Admin/Clínica sem violações nos tags WCAG2A/AA/2.1AA testados. Isso não é certificação WCAG ou homologação clínica.

As jornadas não cobrem sozinhas todas as combinações institucionais, ações Admin ou acessibilidade de todas as páginas. F03/F04/Beta/B/C/D/E integrais continuam exigidos no CI remoto, e o operador deve homologar papéis municipais/UBS e combinações de áreas no laboratório persistente.

## Comandos e resultados

| Verificação executada | Resultado atual / alcance |
|---|---|
| `node tests/premium-unified/run-isolated.mjs dashboard` | PASS4/4, dados reais, dois tenants, indivíduos distintos, paciente/vínculo inativo |
| `... run-isolated.mjs clinical` | PASS32/32, concorrência de escrita/finalização, privacidade e MEOWS não homologado |
| `... run-isolated.mjs iam` | PASS27/27, governança B e fronteiras clínicas |
| `... run-isolated.mjs auth` | PASS186 Auth/MFA +18 crypto; harness original com somente container/URL próprios |
| `bash scripts/test-p0-clinical-runtime.sh` | SQL ACL PASS;26 invariantes +1 runtime login real +12 segurança/privacidade PASS; comando inicialmente FAIL ao lançar browser ausente |
| Reteste apenas browser MFA com `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` | PASS2/2; sem reinstalar. São contratos de UI com respostas controladas, não prova de autorização |
| `npm run test:p0:full:ui` final | PASS13/13, incluindo contraste claro/escuro e regressões antigas sem reduzir asserts |
| Presentation/minified domain errors | PASS8/8; seis áreas/métricas +duas regressões de erros; privacidade HTTP adicional PASS |
| `npm run test:premium:unified` | Node por grupo PASS7,6,80,29,14 e seed/restore PASS na execução registrada; comando terminou FAIL no browser pelo mapper HTTP ausente |
| Reteste dirigido após mapper corrigido | PASS5/5 browser produção e PASS4/4 domínio/privacidade; outros grupos sem dependência alterada foram preservados |
| Vitrine Premium Node/MEOWS | PASS80/80; inclui55 casos do motor. Invariante de segurança reexecutado após alterações autorizadas |
| Perfil local | PASS4 políticas +29 casos perfis (14 legado,15 novo) +14 serviços de mail/provisionamento; chmod/symlink/mistura de perfis/produção/Resend negados |
| `node tests/premium-unified/seed-isolated.mjs` | PASS seed7 contas/3 pacientes, replay e backup/restore sintético;35 migrations restauradas, fingerprint de dados conferido |
| Prisma validate com URL explícita localhost:1 | PASS; sem conexão a DB externa. Comando sem URL recusou corretamente antes da configuração explícita |
| Replay/drift e privilégios runtime | PASS no harness descartável de runtime;35 migrations, separação de papéis e ACL da tabela de operações |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS0 erros;4 warnings herdados em testes p0-remediation/release, sem suprimir regras |
| `npm run build` real final | PASS exit0, Next16.4.2, fontes locais Inter/Geist/GeistMono, geração/otimização concluídas |
| `npm run start -- --hostname 127.0.0.1 --port 3611` | PASS health200, login SSR200, fonte local200 e dashboard anônimo307. Esse smoke isolado não prova DB readiness; DB real foi usada na jornada3610 |
| Standalone efetivo e contexto Docker | PASS sem .local, logs privados, .env ou Git; teste lê o artefato, não apenas a configuração |
| Workflow/allowlist | PASS guard e testes adversariais; push desta feature permitido, contexto desconhecido negado, publish/deploy exclusivos de prod |
| `git diff --check` / staged check | PASS nas conferências de versionamento |
| Laboratório persistente3600, stop/start com mesmos dados | BLOCKED ENOSPC; perfil implementado, configuração nova preservada, nenhum laboratório antigo alterado |
| Docker runner / migrator | BLOCKED ENOSPC em tentativas reais. Inicialmente configBuildx fora da área gravável; repetido com config privada em /tmp, chegando à falta real de espaço |
| Trivy das imagens do candidato | NOT RUN, imagens candidatas não concluídas |
| CI remoto completo do SHA final | Pendente de evidência acessível após push. API Actions retornou Forbidden; não declarar verde por testes locais |

Não somar as linhas como testes únicos: alguns contratos aparecem em mais de um grupo. Não foi repetida a bateria global após cada ajuste; falhas foram diagnosticadas e retestadas na área afetada. O CI remoto executará a composição completa no SHA real.

## Achados corrigidos com reprodução

1. Origem CSRF ausente no primeiro harness: fixtures de MFA falharam; apenas env de teste alinhado à origem3110.
2. Contador do restore esperava34: base possui35 migrations, incluindo20261028010000_p0_pending_access_notifications. Replay/restore passou após conferir a lista verdadeira; nenhuma migration foi removida.
3. Overflow320: skip-link sem CSS ocupava138px como item flex. Posicionamento acessível corrigido; hipótese de reduzir título foi revertida por não resolver a causa.
4. Contraste: slate400/white2,63 e rosa do logo/white3,58. Tokens operacionais ajustados, mantendo rosa PAP; estilos do DEMO legado preservados, AA claro/escuro retestado.
5. Minificação: new.target.name de exceções clínicas virava nome curto. Literais públicos preservados, teste minificado cobre todas as classes dos quatro arquivos. Serviços, locks e validações não mudaram.
6. Causa direta do500 na negativa de medição: NotEditable não estava no mapper. Agora409 em ambos os recursos, dados/proveniência intactos. A atribuição inicial à minificação foi corrigida.
7. Tracing: build com laboratório local copiava arquivos privados ao standalone. Fonte restrita a .local, recusa antecipada em produção e exclusões de tracing; cópias geradas removidas e artefato reconstruído/testado. Nada foi publicado com esses arquivos.

## Segurança e dependências

`DEPENDENCY-AUDIT.json` contém pacotes, versões instaladas, caminhos transitivos, severidade, GHSA oficiais e hashes dos resultados reais:
- Produção:6 MODERATE,0 HIGH/CRITICAL.
- Migrator:5 MODERATE,0 HIGH/CRITICAL.
- Incluindo desenvolvimento:14 HIGH,10 MODERATE,1 LOW.

HIGH no desenvolvimento: @dotenvx/dotenvx, @modelcontextprotocol/sdk, @shadcn/registry, body-parser, eslint-config-next, eslint-plugin-react-hooks, express, express-rate-limit, shadcn, systeminformation, undici, zod, zod-to-json-schema e zod-validation-error. A cadeia chega principalmente por shadcn/CLI e eslint-config-next/hooks; shadcn/tailwind.css participa do build CSS, sem importar seu servidor/CLI para a aplicação. O alcance no toolchain e risco de dependências transitivas continuam exigindo revisão, lock confiável e execução sem segredos de produção. Não equivalem a14 falhas distintas alcançáveis no servidor web; também não são aceitação automática. Não houve npm audit fix, override ou upgrade indiscriminado. Imagens e dependências de SO ainda não foram aprovadas por scanner.

Runtime/migrator non-root e gates existentes foram mantidos. O warning de concorrência de query no pg8 observado no servidor é risco técnico a revisar antes de qualquer futuro pg9; não foi atualizado pacote nesta missão. MEOWS operacional, IA, RNDS e módulos sem backend homologado não ganharam funcionalidades clínicas fictícias.

## Capturas operacionais atuais

Todas são do P0 integrado com sua DB descartável própria; nenhuma vem da Vitrine/branch de origem. Login tem a área CAPTCHA mascarada deliberadamente; sem senha, token, QR ou segredo MFA nos PNGs.

| Superfície |320|390|768|1440|
|---|---|---|---|---|
| Admin real |[PNG](evidence/admin-320.png)|[PNG](evidence/admin-390.png)|[PNG](evidence/admin-768.png)|[PNG](evidence/admin-1440.png)|
| Clínica real / MEOWS indisponível |[PNG](evidence/clinical-320.png)|[PNG](evidence/clinical-390.png)|[PNG](evidence/clinical-768.png)|[PNG](evidence/clinical-1440.png)|
| Registro persistido |[PNG](evidence/registro-real-320.png)|[PNG](evidence/registro-real-390.png)|[PNG](evidence/registro-real-768.png)|[PNG](evidence/registro-real-1440.png)|
| Login |[PNG](evidence/login-320.png)|[PNG](evidence/login-390.png)|[PNG](evidence/login-768.png)|[PNG](evidence/login-1440.png)|

## Preservação e decisão

Somente recursos de teste próprios ou o perfil novo nominal foram criados.5432 existente não foi adotada. Limpeza de cache limitou-se aos IDs criados pelo próprio build falho, conferidos individualmente como reclaimable/private; sem prune global, sem remoção de imagens/volumes desconhecidos. O laboratório novo que falhou permaneceu preservado, sem reset. Produção, VPS, laboratórios anteriores e pap-saude-prod-preview não foram acessados/modificados como ambientes operacionais.

Decisão: **NO-GO de release e VPS**, mesmo com software operacional Premium exercitado. Pendências e responsáveis em GO-NO-GO.md; comandos do sistema integral3600 em LOCAL-HOMOLOGATION.md; plano de VPS é preparação, sem execução.

O harness legado de Auth usa o helper de limpeza de auditoria somente em sua DB descartável allowlisted para isolar casos; ele não é evidência de append-only. A prova de ACL/ledger com gatilhos ativos é separada no harness runtime. Nenhum gatilho de ambiente operacional foi desativado.

## Commits de implementação

- [390d0aa](https://github.com/joaoCarlosGM/pap-saude/commit/390d0aab64e2da44725142fc07e5b0991dafb46b) — feat(premium): share operational presentation and authorized clinical shell
- [9ec2f63](https://github.com/joaoCarlosGM/pap-saude/commit/9ec2f631980d760a80da411364134659781cc7a5) — feat(dashboard): animate authorized live clinical metrics and attendance links
- [a5711c0](https://github.com/joaoCarlosGM/pap-saude/commit/a5711c00bf0d640daa859a2eb9b7a163f936b4ae) — feat(clinical): present persistent patient and encounter workflows in Premium UI
- [cf14d6c](https://github.com/joaoCarlosGM/pap-saude/commit/cf14d6c42dda74fe14e1c4f26efb2cc26e24694f) — feat(admin): harmonize authorized administration with Premium presentation
- [56b6d7b](https://github.com/joaoCarlosGM/pap-saude/commit/56b6d7bc31f1eff326699927b1add3ada640e59a) — feat(local): add isolated persistent unified lab and synthetic acceptance setup
- [ea011d2](https://github.com/joaoCarlosGM/pap-saude/commit/ea011d2afe7ff35b9abfd0f4d144b9677cc5108b) — fix(build): self-host licensed Inter and Geist with verified provenance
- [dcfec79](https://github.com/joaoCarlosGM/pap-saude/commit/dcfec79bfb80471a829b729314e8f79923b19660) — fix(clinical): preserve domain error contracts after production minification
- [bfe92ee](https://github.com/joaoCarlosGM/pap-saude/commit/bfe92eea6539e911968d20693d88a141fd524d49) — fix(clinical): report finalized measurement writes as domain conflicts
- [7845077](https://github.com/joaoCarlosGM/pap-saude/commit/78450779796e06243d1b93e311a45ec23df0cf20) — fix(release): exclude private lab artifacts and verify operational accessibility
- [5d74e74](https://github.com/joaoCarlosGM/pap-saude/commit/5d74e744d429a19ed9b49473d1c2af5e9c796721) — fix(local): reject exposed unified lab configuration before resource access

O commit posterior de QA/documentação ativa o CI desta feature sem ampliar publicação/deploy. Não se coloca hash autorreferente dentro do próprio documento; conferir HEAD final e manifesto.

Tour clínico e teclado retestados isoladamente após acrescentar o alvo real Configurações: PASS1/1; cinco etapas, permissões do perfil e conclusão persistida via API de onboarding. O artefato foi reconstruído após a alteração de atributo, sem mudanças visuais ou de dados.

Versões efetivamente usadas no executor: v24.19.0, next 16.4.2, react 19.2.8, react-dom 19.2.8, prisma 7.10.1, @prisma/client 7.10.0, pg 8.23.0, eslint-config-next 16.4.2. CI e imagens usam Node22 conforme workflow/Dockerfile; essa validação do destino não é substituída pelo host.
