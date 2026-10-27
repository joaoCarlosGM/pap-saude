# Registro atômico e idempotente
PASS: 68 Node (47 cliente/preflight + 21 PostgreSQL) e 4 E2E de navegador com servidor real.
Uma operação identifica ator/organização/chave; payload possui fingerprint. Repetição retorna o mesmo grafo; payload divergente e chave cancelada são negados.
Interrupções em 11 etapas não deixam grafo/ledger parcial; cancelamento registra barreira durável contra POST tardio. Cliente conserva UUID, sem dados clínicos ou tokens no storage.
Upgrade 32→34, replay de migrations e drift foram executados em banco descartável; o mesmo Admin sintético conservou senha/MFA/recuperação/sessão/papéis. Isso não é validação de contas reais.
ACL corrigida: SELECT/INSERT e UPDATE somente status, patientId, pregnancyId, encounterId, evaluationId, completedAt. DELETE/TRUNCATE e atualização de identidade/keyHash/requestFingerprint/createdAt são negados.
Teste com login runtime real concluiu, repetiu, consultou, cancelou, preservou dois eventos de proveniência e negou escrita em chave/DELETE.
Evidências: registration-node-browser-upgrade.log; registration-runtime-acl.log; runtime-functional.json; p0-runtime-harness.log, em .test-audit/p0-composition/.
