# F04.10 — gates de CI e limites de release

## Pipeline versionado

- `validate` executa em push para `codex/f04-10-release-hardening`,
  `feature/foundation-04-admin-core`, `develop` e `prod`, e em PR para develop/prod.
  Uppercase `PROD` não é a branch de deploy.
- `publish` depende de validate; `deploy` depende de publish. Ambos exigem exatamente
  `push` em `refs/heads/prod`. PR e push nesta branch de trabalho não publicam/deployam.
- Deploy exige GitHub environment `production` e `VPS_KNOWN_HOSTS` previamente
  verificado. Revisores e proteção desse environment são configurações externas;
  o YAML sozinho não estabelece aprovação humana.
- Actions, base Node e scanner têm referências imutáveis. Permissão global é
  contents:read; packages:write fica somente em publish. Não há pull_request_target.
- CI inicia seu PostgreSQL descartável com credenciais sintéticas e label
  `pap.disposable=f0410`; não usa banco nem credenciais de produção.

## Gates obrigatórios

1. Prontidão PostgreSQL pelo servidor TCP final (não pelo servidor Unix temporário
   de init), com teste de inicialização lenta; npm ci; auditoria de dependências production e migrator isolado; Prisma generate;
   Next typegen; Prisma falha fechado sem DATABASE_URL.
2. Guard YAML estrutural e testes adversariais (ampliação de condição de release,
   remoção de dependência, environment incorreto, refs mutáveis, remoção de auditoria
   ou varredura de imagens devem falhar).
3. Auditoria F04 integrada, invariantes DB sem desativar triggers, RBAC, MFA,
   anti-IDOR, isolamento de tenant, fluxo clínico HTTP, TS, lint e build.
4. Separação de papéis em DB descartável; regressão F03 forçada dos nove módulos,
   sem cache; regressão completa de autenticação/MFA.
5. Build dos targets runner/migrator; isolamento do migrator e ausência de UI/CLI
   desnecessários; ensaio legado inicial→estado final (28 migrations: as 27 históricas
   intactas e uma incremental de paridade), checksum/histórico, dados sintéticos,
   backup/restore, manutenção obrigatória, idempotência, schema diff vazio e bloqueio
   de web após falha do migrator.
6. Smoke das imagens: migrations como owner não-superuser, web não-root com papel
   runtime, liveness, login renderizado e tentativa negada persistida no DB.
7. Trivy fixado em versão/digest, em ambas as imagens, com exit code não zero para
   HIGH/CRITICAL ou falha de varredura. Nenhuma CVE é ignorada. Gerenciadores npm,
   corepack e yarn são removidos dos estágios finais; dependências de build permanecem
   nos estágios de construção. TLS, checksum e CA confiável permanecem ativos.

`/api/health` é liveness, não prova de DB, MFA ou RBAC. O smoke faz uma operação
adicional no DB com runtime; regressões de autorização usam os testes integrados.
O F03 master mantém seus guards históricos de branch e não é apresentado como
executado nesta branch; a regressão forçada F03 executa os nove módulos de testes.

## Limites e aceite externo

Resultados locais estão em `f04-10-release-audit-report.md`. CI remoto só é PASS
quando o run correspondente terminar verde; sucesso local não substitui isso.
O script `/opt/pap-saude/scripts/deploy.sh` e o compose da VPS são externos, não
foram inspecionados nem executados. As proteções GitHub, backup/restore operacional,
credenciais, privilégios reais de pap_prod, impacto em n8n, DNS, RNDS e aceite
clínico continuam exigindo evidência humana. Não fazer merge/deploy baseado apenas
nos testes locais. Procedimento: `f04-10-cutover-runbook.md`.
