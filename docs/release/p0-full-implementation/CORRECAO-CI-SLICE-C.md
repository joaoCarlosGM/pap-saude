# Correção dirigida do gate C

Base ccb2817, CI40690382799: primeiro acesso/MFA e B PASS; C FAIL. Investigação restrita ao browser C: helper de login não respondia ao CAPTCHA obrigatório, deixando Entrar desabilitado; cenário Manager reproduziu timeout. Não alegar causa remota exclusiva sem log completo (API bloqueada).

Helper agora responde ao CAPTCHA real pelo helper acessível existente. Cenário de consentimento/espera usa signIn existente, que inscreve/confirma MFA e conclui metadados por serviços reais, sem atribuir papel. O título explicita a pré-condição; continuam as assertions de espera sem privilégios, aprovação e notificação. A jornada separada de novo Manager mantém QR/TOTP e novo login reais pelo navegador. Nenhum guard/backend alterado.

Browser C completo PASS8/8, zero skip; TypeScript/lint/diff PASS. Logs privados c-browser-login-repro (FAIL preservado), c-browser-directed, c-browser-typescript e c-browser-lint. Testes Node e suites anteriores não repetidos por ajuste exclusivo de browser. Mesmo banco/container descartável próprio reutilizado, mailer local-demo em diretório privado; sem e-mails externos. Screenshots gerados preservados privadamente.

CI do novo SHA pendente no momento do documento. Prosseguir somente para o primeiro gate falho. NO-GO de release até CI e aceites restantes. Sem merge/deploy, acesso à VPS ou alteração dos laboratórios/credenciais do operador.
