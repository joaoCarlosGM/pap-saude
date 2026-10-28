# Correção dirigida do contrato MFA — Slice B

Base `58991c86fd212df44df1f30fbcff8ed2da71b4ba`, branch `codex/p0-full-implementation`. CI 40683788189: primeiro acesso/MFA PASS; Slice B FAIL. Causa remota confirmada pelo operador e reproduzida localmente: teste legado esperava acesso clínico com sessão primária sem MFA.

Alteração exclusiva de teste: primária recebe 403 para própria e outra UBS; helper existente `createVerifiedSession` executa inscrição TOTP, confirmação, desafio e verificação por recuperação reais, sem atribuir mfaVerifiedAt. Com prova real: própria UBS 200, outra UBS 403; ambas as sessões continuam impedidas de ativar organização. A sessão primária permanece sem prova. A UBS estrangeira é criada na fixture, sem dependência da ordem dos outros casos.

Revisão restrita aos testes B: navegador já exigia MFA real; cenário de upgrade preserva sessões primárias legadas como dados, não concede clínica implicitamente. Nenhum backend, guard, IAM, migration ou sessão real foi alterado.

Resultados executados em banco descartável identificado, reutilizado, sem resets: caso dirigido PASS1/1; governança Node B completa PASS27/27, zero skip; TypeScript PASS; ESLint do arquivo PASS; diff check PASS. Logs privados b-mfa-directed.log, b-governance-node.log, b-mfa-typescript.log e b-mfa-lint.log em .test-audit/p0-full; hashes em evidence/validation.json.

Upgrade histórico e browser B completos não foram repetidos localmente: permanecem no workflow remoto do novo SHA. Sem reinstalação, build local, scanner ou auditoria geral. Próximo: acompanhar CI e diagnosticar/corrigir somente o primeiro gate falho. Release NO-GO até CI e aceites restantes. Laboratórios, VPS, produção, contas e credenciais preservados; sem merge/deploy.

## Correção dependente do proxy de teste

CI 40688111302 no commit 0915259: primeiro acesso passou, B voltou a falhar. Reprodução restrita ao browser de ativação institucional falhou na expectativa 202 do POST público (linha159). A configuração B herda servidor que exige x-pap-test-client-ip, mas usa fixture Playwright padrão. Adicionado cliente documental 2001:db8::1 em use.extraHTTPHeaders da configuração compartilhada; a fixture de primeiro acesso mantém precedência e gera cliente único por teste. Configurações derivadas B/C/E recebem agora o cabeçalho exigido pelo seu servidor, sem qualquer bypass de CAPTCHA ou modificação de backend.

Browser B completo PASS5/5; caso MFA pendente/reload PASS1/1; TypeScript/lint/diff PASS. Node27 anterior permanece aplicável, pois somente configuração de browser mudou. Logs b-browser-proxy-repro (FAIL preservado), b-browser-all, b-proxy-pending-mfa, b-proxy-typescript e b-proxy-lint. Screenshots gerados guardados privadamente, sem substituir os históricos. Novo CI deve ser acompanhado no SHA exato; sem rerun manual do candidato anterior.
