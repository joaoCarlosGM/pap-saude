# Segurança MFA — candidato integrado
- MFA mantém limites persistentes/atômicos: 5 por desafio, 20 por identidade e 100 por origem confiável, janela de 15 minutos para identidade/origem.
- Reserva antecede a verificação TOTP/recuperação; 429 genérico com Retry-After e encerramento apenas do desafio.
- Fatores, chaves, senhas e sessões verificadas existentes não são rotacionados pelo upgrade.
- Limites de corpo login/MFA e logs clínicos sem objetos ORM privados foram preservados.
- PASS: 10 testes de limites; 202 de Auth/MFA; 8 de limites de corpo/privacidade. UI 429/401 tem teste separado, com respostas mockadas, sem substituir o teste PostgreSQL real.
- Risco residual: janela fixa permite concentração na fronteira e origem compartilhada pode afetar usuários legítimos; desafio conserva teto total de 5. Origem depende da configuração confiável do proxy.
- Logs atuais: .test-audit/p0-composition/{mfa10,auth-full,p0-runtime-harness}.log. Reproduções históricas permanecem na worktree mfa; não foram reexecutadas sem necessidade.
