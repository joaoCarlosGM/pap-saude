# Integridade clínica — concorrência
PASS: 26 testes reais PostgreSQL, ambos os ordenamentos entre criar/editar sinais vitais ou dados obstétricos e concluir/cancelar atendimento.
Validação e escrita compartilham transação e lock/CAS no atendimento; cliente Prisma raiz explícito é recusado. Rollback inclui ledger/auditoria.
Cada medição exige ator real autorizado, organização e vínculo clínico; snapshots concorrentes preservam cadeia causal.
A detecção de transação usa marca interna do Prisma 7.10.1 e falha fechada: upgrade dessa dependência exige revalidar o contrato.
Evidência: .test-audit/p0-composition/clinical-concurrency26.log e p0-runtime-harness.log. As quatro reproduções completion-first no E original permanecem em clinical-concurrency/.test-audit/p0-clinical/four-baseline-current.log.
Não houve alteração de regra clínica ou aprovação de algoritmo MEOWS.
