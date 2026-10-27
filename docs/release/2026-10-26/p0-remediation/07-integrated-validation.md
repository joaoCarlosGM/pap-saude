# Validação integrada P0

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

Não somar linhas como testes únicos: há sobreposição explícita de gates. Todos os resultados locais referem-se ao código composto; nenhum CI antigo foi reapresentado como CI P0.

Logs, comandos, fingerprint e reutilizações: evidence/candidate/validation.json e executed-commands.txt.
