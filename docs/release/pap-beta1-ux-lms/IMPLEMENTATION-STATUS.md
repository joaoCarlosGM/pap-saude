# PAP Saúde Beta 1 — execução por slices

Base: c7b1d7558b26ec85b09d4c9025c75bdadd79bdc7, branch feature/p0-premium-unified-rc.
Baseline funcional: d247020, CI40962511599 SUCCESS. Pacote completo lido:00/PROMPT,oito documentos,manifesto e scripts. SHA256SUMS original diverge somente em00/PROMPT por whitespace final; os anexos conferem semanticamente. Não alterar o pacote recebido.

| Slice | Dependências e aceite | Estado / evidência |
|---|---|---|
| A | Shell/sidebar/hero abstrato/ajuda; preservar identidade e dados; responsivo/teclado | PASS dirigido:4 Node,5 invariantes,1 browser (7 larguras/2 temas/teclado/WCAG);10 capturas |
| B | Cards/ficha/atendimentos/registro com dados autorizados; KPIs byte-idênticos | NOT RUN |
| C | Admin teal; rede→município→UBS→equipe; grants anteriores intactos | NOT RUN |
| D | Domínio LMS aditivo, IAM dedicado, editor seguro, versões imutáveis/release | NOT RUN |
| E | Unidade/município: distribuição/ancestry, membros ativos, idempotência e inbox | NOT RUN |
| F | Player, checkpoints/avaliação no servidor, retomada/badge/progresso | NOT RUN |
| G | Restore/migrations/continuidade de credenciais em fixture, CI integral, GO/NO-GO | NOT RUN |

## Invariantes

Nenhum acesso ao laboratório3600/PG15436, .local, senhas/MFA/sessões/volume do operador. Não executar scripts preflight/backup contra o laboratório: apenas revisar e fornecer comandos opt-in. Testes em bancos descartáveis próprios identificados, nunca copiar dados reais. Não executar seed local. Não alterar dashboard queries/KPIs, clínica/MEOWS assistencial, CAPTCHA/MFA/session store. Conteúdo LMS declarativo, sem HTML/JS arbitrário. Certificação não homologada: sem emissão de certificado. Suporte sem serviço: CTA indisponível honesto, sem envio fictício.

Atualização do laboratório: somente operador, após backup/restore válido e autorização explícita para migrations aditivas; preservar .local e origem127.0.0.1:3600. Nenhum PR, merge de integração, deploy/VPS/prod.

## Checkpoint

Próximo: validar sliceA com testes dirigidos/TypeScript/lint e browser isolado, commit seletivo/push. Continuar B→G sem recomeçar auditoria nem repetir suites aprovadas sem alteração relevante. PASS sempre com execução, fingerprint e evidência; aceites manuais não executados permanecem NOT RUN.

SliceA: logs privados /tmp/pap-beta1-mission-20261030/slice-a-*.log; browser final /tmp/pap-beta1-tests-ANXAGw/browser.log. TypeScript/ESLint/diff PASS, zero warnings novos. Duas falhas de contraste2.21:1/3.7:1 corrigidas sem remover asserts. Harness inicial precisou corrigir import relativo/DB descartável/cwd de webServer.10 capturas sintéticas revisadas. Bootstrap/configuradores/MFA não modificados. Próximo:B paridade de cards/ficha, depoisC Admin eD domínioLMS. CI integral somente no candidato consolidado; pushes intermediários podem acionar o workflow existente, sem desativá-lo.
