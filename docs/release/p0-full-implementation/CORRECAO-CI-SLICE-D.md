# Correção dirigida do gate D

Base1f165d6, CI40693217223: primeiro acesso, B e C PASS; D FAIL. Reprodução local de navegador D: 7PASS/1FAIL. O seletor global getByRole(alert) encontrava a mensagem de erro e __next-route-announcer__ do Next. Escopado ao formulário em ambas as assertions; texto esperado e todas as verificações de tokens em fragmento/history/URL/Referer/console preservadas. Nenhum backend alterado.

Resultado: reset fragment dirigido PASS1/1; os sete outros casos passaram na execução inicial. Não declarar nova execução8/8. Email/reset/webhook Node PASS31/31. Upgrade D/backup PASS1/1 em cópia privada do harness: apenas nomes fixos de container, conexão e imports relativos redirecionados ao recurso descartável cujo ID/owner/loopback foram verificados pelo runner; sem remover assertions, alterar migrations ou substituir o teste original. Reutilizado container próprio; criado somente banco D isolado; sem alterar bancos anteriores. Mailer local-demo, sem emails externos. TypeScript/lint/diff PASS.

Logs privados d-browser-repro, d-reset-fragment-directed, d-email-node, d-legacy-owned-repro, d-reset-typescript e d-reset-lint; hashes em evidence/validation.json. Nenhuma auditoria geral, reinstalação ou Docker build local. Próximo CI deve confirmar o SHA exato. Sem merge/deploy/acesso ao laboratório ou VPS. Release continua NO-GO até todos os gates e aceites restantes.
