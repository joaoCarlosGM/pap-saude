# Correção dirigida do contrato MFA — Slice B

Base `58991c86fd212df44df1f30fbcff8ed2da71b4ba`, branch `codex/p0-full-implementation`. CI 40683788189: primeiro acesso/MFA PASS; Slice B FAIL. Causa remota confirmada pelo operador e reproduzida localmente: teste legado esperava acesso clínico com sessão primária sem MFA.

Alteração exclusiva de teste: primária recebe 403 para própria e outra UBS; helper existente `createVerifiedSession` executa inscrição TOTP, confirmação, desafio e verificação por recuperação reais, sem atribuir mfaVerifiedAt. Com prova real: própria UBS 200, outra UBS 403; ambas as sessões continuam impedidas de ativar organização. A sessão primária permanece sem prova. A UBS estrangeira é criada na fixture, sem dependência da ordem dos outros casos.

Revisão restrita aos testes B: navegador já exigia MFA real; cenário de upgrade preserva sessões primárias legadas como dados, não concede clínica implicitamente. Nenhum backend, guard, IAM, migration ou sessão real foi alterado.

Resultados executados em banco descartável identificado, reutilizado, sem resets: caso dirigido PASS1/1; governança Node B completa PASS27/27, zero skip; TypeScript PASS; ESLint do arquivo PASS; diff check PASS. Logs privados b-mfa-directed.log, b-governance-node.log, b-mfa-typescript.log e b-mfa-lint.log em .test-audit/p0-full; hashes em evidence/validation.json.

Upgrade histórico e browser B completos não foram repetidos localmente: permanecem no workflow remoto do novo SHA. Sem reinstalação, build local, scanner ou auditoria geral. Próximo: acompanhar CI e diagnosticar/corrigir somente o primeiro gate falho. Release NO-GO até CI e aceites restantes. Laboratórios, VPS, produção, contas e credenciais preservados; sem merge/deploy.
