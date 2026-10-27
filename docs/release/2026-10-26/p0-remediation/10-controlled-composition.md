# Composição controlada P0 — resultado para revisão

Branch: `codex/p0-remediation-review-20261026`. HEAD: `f5dd8fe0ae1d8058680a82a6bea70648b82bc767` (**base E**, não contém as alterações P0).
Fingerprint dos 111 caminhos de código/teste/CI: `458fe1af0c0907bb6abf57d81248268fe15194475dae630150f8edbbfebad983`.
Gerado: 2026-10-26T23:51:35.927534-03:00. **Nenhum staging, commit, push, merge ou deploy executado.**

## Composição e contratos
106 caminhos do inventário econômico foram copiados somente após conferir hashes; o teste MEOWS já existente foi preservado. Quatro caminhos adicionais de validação/CI completam os 111. A ACL foi corrigida sobre um caminho já composto.
Schema34 é idêntico ao de clinical-registration e contém ledger + operações. Ambas migrations novas seguem 193000 → 194000; 32 migrations históricas e migration_lock permanecem byte a byte intactas. Helper de fixtures é exatamente a versão F03 validada.
Migrations 32→34 preservaram o mesmo Admin **sintético**, senha, MFA, recuperação, sessão, papéis, usuários/UBS legados. Não foram inspecionadas contas reais.

## Achado adicional corrigido
O grant genérico concedia UPDATE/DELETE na tabela de operações. O teste reproduziu FAIL; a correção restringe SELECT/INSERT e UPDATE às seis colunas de conclusão, negando alteração de identidade/chaves/fingerprint, DELETE/TRUNCATE e DDL. Aplicação de grants duas vezes, SQL adversarial e registro real sob login runtime restrito passaram. Diffs completos: `evidence/candidate/migrations.diff` e `authorization.diff`.
A separação de papéis deve ser reaplicada após as novas migrations e antes de servir tráfego; este trabalho não executou essa ação em destino real. O contrato anterior de default privileges genérico não substitui essa etapa.
O workflow mantém os gates anteriores e acrescenta MFA/P0 clínico/Admin F, incluindo o navegador de bloqueio MFA. Nenhuma condição de publicação/deploy foi ampliada.

## Matriz final
| Gate | Resultado | Evidência resumida |
|---|---|---|
| Prisma validate/generate; TypeScript; lint; build | PASS | logs individuais |
| Limites MFA | PASS | 10 Node |
| Auth/MFA integral | PASS | 202 Node |
| Concorrência clínica | PASS | 26 Node |
| Registro atômico, idempotência, upgrade | PASS | 68 Node + 4 E2E |
| Revisão/proveniência | PASS | 13 Node |
| F03 completa — nove módulos sem cache | PASS | 203 Node |
| F04 integral e invariantes SQL | PASS | 70 Node + SQL |
| Beta/Admin MFA/inventário/upgrade | PASS | 29 Node |
| Admin/F | PASS | 49 Node + 4 E2E |
| Missão 04 B | PASS | 28 Node + 5 E2E |
| Missão 04 C | PASS | 41 Node + 8 E2E |
| Missão 04 D | PASS | 32 Node + 8 E2E |
| Missão 04 E | PASS | 8 Node + 6 E2E |
| Primeiro acesso | PASS | 21 Node + 15 E2E |
| ACL/novo harness CI | PASS | 39 Node + SQL; sobrepõe concorrência/unitários |
| UI bloqueio MFA | PASS | 2 E2E, respostas UI mockadas |
| Migrações 32→34, replay/drift, runtime restrito | PASS | credenciais sintéticas preservadas; login runtime real |
| Imagens web/migrator e funcional | PASS | artefatos locais arquivados |
| Trivy HIGH/CRITICAL web e migrator | PASS | 0 HIGH/CRITICAL; análise Java preservada |
| Auditoria produção/migrator HIGH | PASS | 1 MODERATE em cada árvore; 0 HIGH/CRITICAL |
| Auditoria completa desenvolvimento | FAIL — herdado | 3 HIGH + 2 MODERATE; sem atualização automática |
| CI remoto do candidato P0 | NOT RUN | aguarda commit/push autorizados |


## Evidências e economia
`evidence/candidate/validation.json`, `source-manifest.json`, `executed-commands.txt` e os logs locais `.test-audit/p0-composition/` contêm resultados/comandos. Node Admin 49 e B 27 foram reaproveitados somente com conteúdo funcional inalterado, mais os testes pendentes, com recibos e hashes dos logs. Gates aprovados não foram globalmente reexecutados após ajustes locais.
Para Turbopack foi reutilizada a instalação física `/tmp/pap-p0-registration-deps`, verificando os 555 arquivos de aplicação/testes e depois todos os fontes do build. Não houve reinstalação no host. C/D exigem legitimamente o endpoint descartável5432: um container novo com nonce e ownership comprovado foi criado, usado sequencialmente e removido; não se flexibilizou o guard local-demo.
Falhas temporárias foram preservadas: alvo Docker legado inexistente/usuário diferente; guard local-demo recusou porta25441; startup com dependências externas; configuração buildx read-only/proxy; ENOSPC no driver VFS; interrupção breve do terminal. Houve também um parâmetro SQL do novo teste sem tipo, corrigido com ::text. Todos os respectivos gates finais passaram.
Trivy web foi repetido somente após ENOSPC, preservando scanner, severidades, bancos e análise Java. Cache já baixado foi reaproveitado. Artefatos novos foram compactados e somente caches desta execução foram removidos por IDs explícitos, sem limpeza global. Caches/instalações temporariamente movidos foram restaurados; imagens novas ficaram em arquivos com hashes, em `image-archives.json`. Imagens e volumes anteriores foram preservados.

## Riscos residuais e limites
- HIGH herdadas: shadcn4.22.0 → undici7.29.1 (DoS/SRI); shadcn → zod4.5.4 (exaustão de memória); shadcn → @modelcontextprotocol/sdk1.32.1 → express5.3.0 → body-parser2.3.0 (DoS). Afetam ferramentas de desenvolvimento/geração e entradas não confiáveis desse processo; `npm run build` invoca Next, sem executar o CLI shadcn. Não estão demonstradas como rota HTTP do aplicativo. Não foram suprimidas nem declaradas corrigidas.
- MODERATE: shadcn → socks2.8.10 → ip-address10.7.3; e fast-uri3.1.8 (também aparece nas auditorias produção/migrator). Detalhes, advisories oficiais e cadeias em `dependency-risk.json`. Trivy acima limita a conclusão a HIGH/CRITICAL.
- Marca interna de transação Prisma7.10.1 exige revalidação ao atualizar Prisma. MFA mantém risco de concentração na fronteira da janela fixa e origem compartilhada.
- MEOWS requer validação clínica qualificada; revisão é proposta não aplicada. A composição não aprova o escopo clínico nem telas/módulos fora dos patches autorizados.
- CI remoto do futuro commit e infraestrutura real/backup do destino continuam pendentes; teste de restore sintético não valida restauração operacional da VPS. **NO-GO produção.**

## Inventário e versionamento proposto — aguardar autorização
Fonte exata: `source-manifest.json` (111 caminhos). Estado Git completo, inclusive documentos anteriores/untracked, em `git-status-short.txt`, `git-diff-stat.txt` e `all-git-paths.json`; documentos históricos não são adicionados implicitamente.
Comandos exatos em `01-mfa-staging.sh` até `06-docs-staging.sh`, dentro de `evidence/candidate/`. São propostas e **não foram executadas**; sem padrões genéricos.
Grupos: 01-mfa: 14, 02-clinical-integrity-provenance: 51, 03-registration: 15, 04-admin-f: 26, 05-ci-p0: 5. Concorrência/proveniência e fixtures dependentes ficam juntas para não criar commit intermediário com contrato incompleto; schema34 + ambas migrations permanecem juntos.
Mensagens propostas:
1. `fix(auth): enforce atomic MFA attempt limits and safe error handling`
2. `fix(clinical): serialize encounter writes and preserve authoritative provenance`
3. `fix(clinical): make registration atomic and idempotent`
4. `fix(admin): enforce transactional authority and governance metrics`
5. `test(release): enforce integrated P0 security and runtime gates`
6. `docs(release): record P0 candidate evidence and residual risks`
Após aprovação, versionar seletivamente e obter CI do SHA novo antes de qualquer promoção. Não alterar bases de PRs ou executar merge/deploy.

## Preservação
Declaração explícita: nenhum acesso ou alteração a `~/projetos/pap-saude-onboarding`, branch de homologação, PAP_ADMIN, senha, MFA, sessões, banco/volume do operador, VPS, DNS ou produção. Nenhum e-mail externo. Nenhum novo agente. Index vazio e HEAD base mantidos.

## Emenda de gatilho CI — preparação do versionamento
Em 27/10/2026, acrescentado exclusivamente `codex/p0-remediation-review-20261026` ao filtro de push. Jobs, permissões e condições de publicação/deploy permanecem idênticos. O manifesto foi atualizado; evidências funcionais permanecem válidas porque aplicação, testes, schema e dependências não mudaram. Conferência F04: 70 Node + 8 Admin/MFA dentro do gate Beta = 78, sem remoção de testes/assertions e com zero skips; SQL é evidência adicional sem contagem Node.

O primeiro CI push P0 pode parar na allowlist de `scripts/test-f04-db-invariants.sh`, que ainda só cita as branches anteriores. Esse arquivo não pertence aos 111 caminhos: foi preservado, sem contornar o guard. Nenhuma conclusão de CI P0 verde é antecipada. Eventual ajuste da allowlist exige reconciliar seu acréscimo ao inventário antes de novo commit/pipeline.
