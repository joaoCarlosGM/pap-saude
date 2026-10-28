# Correção dirigida — Auth/MFA HTTP guards

Base: `7b6d0413987da23e5d8de9e08a354befe504479a`, branch `codex/p0-full-implementation`.
Gate anterior: [Authentication and MFA regression, CI 40733487693](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40733487693).

## Causa e contrato preservado

`authenticatedRequest()` criava apenas uma sessão primária. As fixtures positivas agora reutilizam `createVerifiedSession()`: inscrição TOTP real, confirmação por código e conclusão de desafio MFA por código de recuperação. Não se injeta `mfaVerifiedAt`. O fator está ativo e a prova pertence à sessão retornada.

A fixture permite explicitamente sessão primária para testes negativos. Foram acrescentados dois testes: negação antes/depois da inscrição (a prova de uma sessão irmã não autoriza a primária) e negação após revogação do fator. Verificam-se também as relações temporais da prova com `enabledAt`, `createdAt` e o relógio atual. Os testes anteriores de sessão revogada, falta de permissão clínica do PAP_ADMIN e UBS estrangeira continuam presentes; os de IAM usam agora sessões realmente verificadas e não podem passar por negação antecipada de MFA.

Nenhuma mudança em backend, `requireOperationalMfa()`, `http-auth.guard.ts`, IAM, migrations ou configuração de CI.

## Execução e evidências

Exclusivamente no container descartável próprio, validado por ID/owner/label `pap.disposable=p0-full` e porta loopback, banco sintético `pap_saude_f02b_test`. O launcher privado forneceu a conexão sem imprimir credenciais. Nenhum banco do operador foi acessado.

| Verificação | Resultado |
|---|---|
| `tsx --test tests/auth/http-guards.integration.test.ts` | PASS 14/14 |
| Auth/MFA completo: dois arquivos crypto + os 18 arquivos extraídos de `scripts/test-auth-session.sh`, sequencialmente com `tsx --test` | PASS 204/204; 20 arquivos; 0 skipped |
| Contadores finais exigidos pelo harness (users, sessions, password_credentials, login_attempts, audit_events, mfa_factors, mfa_challenges, mfa_recovery_codes) | PASS: todos zero |
| `tsc --noEmit` | PASS |
| `eslint tests/auth/http-guards.integration.test.ts` | PASS |
| `git diff --check` | PASS |
| Docker builds, scanners e auditoria geral local | NOT RUN: fora do escopo dirigido |

O primeiro ensaio local foi bloqueado pelo trigger append-only durante a limpeza, antes de avaliar os casos. Aplicou-se somente no banco descartável allowlisted o helper existente `scripts/testing/allow-audit-test-cleanup.sh`, como no harness oficial. Em seguida todos os testes acima passaram; nenhum trigger de aplicação/produção foi alterado. Não foi necessária instalação, geração Prisma ou reaplicação de migrations.

Comando do ensaio completo (runner privado preserva a lista oficial de testes e redireciona logs):

```bash
PAP_TEST_DATABASE=pap_saude_f02b_test python3 .test-audit/p0-full/run.py auth-suite-complete python3 .test-audit/p0-full/auth-suite-directed.py
```

Evidências privadas locais (não versionadas; sem captura de respostas/tokens no relatório), hashes SHA-256:

- `.test-audit/p0-full/auth-guards-fixed.log`: `0ba5a31fff11608504016216490ec8e5277065e385520cb694c58b97854053b8`
- `.test-audit/p0-full/auth-suite-complete.log`: `e711bd7177ef9232f87e6a33e5dfc0eb36f868749e658de70445a39b3c2c6519`
- `.test-audit/p0-full/auth-suite-results.json`: `fac4e3028c170d1136669d8ef23f372fdce48c23580ee44a186657d547c063bd`
- `.test-audit/p0-full/auth-final-cleanup.log`: `3314a8e519af20c35a557d9dbddd982b53c3f02bb8dd49d0456cd4ed96cb2443`
- `.test-audit/p0-full/auth-guards-typescript.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `.test-audit/p0-full/auth-guards-lint.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

Inventário seletivo: este relatório, `tests/auth/http-guards.integration.test.ts` e `docs/release/p0-full-implementation/evidence/source-manifest.json`.

CI remoto do novo SHA: pendente no momento do commit; acompanhamento armazenado em `.test-audit/p0-full/auth-guards-final-*`. O PASS local não autoriza release. Sem merge, deploy, acesso à VPS, envio externo ou alteração dos laboratórios do operador.
