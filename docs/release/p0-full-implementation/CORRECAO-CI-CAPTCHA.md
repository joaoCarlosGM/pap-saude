# Correção dirigida — CAPTCHA e isolamento de primeiro acesso

Base `8aa7919c53f601539df89b4f671e64ff821b5a4c`, branch `codex/p0-full-implementation`. Referência: CI 40680713040 e diagnóstico remoto fornecido pelo operador. Sem auditoria geral, reinstalação, Docker build, migração, reset ou acesso aos laboratórios/VPS.

## Causa comprovada e correção

A reprodução do POST de emissão, no handler real e em banco descartável identificado, confirmou 30 respostas 200 e **31ª resposta 429**, corpo público `{ "error": "VERIFICATION_UNAVAILABLE" }`. Usou namespace sintético novo, sem apagar contadores existentes; apenas status e código público foram registrados.

`origin` no serviço **não é o header HTTP Origin**. É `resolveTrustedClientOrigin(request)`: identificador informado pelo cabeçalho explicitamente confiado do proxy. Produção sem configuração falha fechada; cabeçalhos X-Forwarded-For/CF não são confiados implicitamente. Sem configuração em desenvolvimento, todos usam `local-development`, acumulando emissões entre os testes. O problema do CI era a configuração/isolamento desses clientes, não a falta de limitação por IP em produção.

Foi mantida a política atômica de **30 emissões por identificador confiável/10 minutos**, o formato das chaves persistidas e todos os contadores. O parâmetro do serviço foi renomeado para `clientOrigin` e documentado; não houve mudança comportamental no limitador. Não introduzimos cookie/IP arbitrário como escape, nem aumentamos limites.

O servidor Playwright descartável agora configura explicitamente `x-pap-test-client-ip`. A fixture compartilhada gera um endereço sintético IPv6 do bloco documental `2001:db8::/32` por contexto/teste, estável em navegação, reload e `page.request`. Os três arquivos de navegador usam essa fixture. Não há flag que dispense CAPTCHA/MFA. Essa configuração é exclusiva do servidor de teste, não modifica o launcher dos laboratórios nem a configuração de produção.

O proxy real deve sobrescrever o cabeçalho configurado, sem aceitar cadeias fornecidas pelo usuário; acesso direto ao backend deve ser bloqueado na infraestrutura. Nenhuma configuração real foi acessada ou homologada. Clientes atrás do mesmo identificador/IP de proxy continuam sujeitos ao limite compartilhado: uma política diferente para NAT exigiria revisão separada, não foi disfarçada com aumento de limite.

## Testes realmente executados

| Execução | Resultado |
|---|---|
| Reprodução `reproduce-captcha-rate.ts` privada, handler de emissão real | PASS: 31ª emissão HTTP429, `VERIFICATION_UNAVAILABLE` |
| `tsx --test tests/first-access/captcha-client-limits.test.ts` | PASS 4/4: clientes independentes no mesmo site; 40 concorrentes = 30 aceitos/10 negados; spoof/lista/ausência de proxy negados; produção sem proxy falha fechada |
| `tsx --test --test-name-pattern='CAPTCHA|HTTP login' tests/p0-full/security.test.ts` | PASS 5/5: digest, uso único/concorrência, vínculo/origem, expiração, PNG/limite, login real |
| Playwright `--grep 'pending MFA resumes'`, configuração de primeiro acesso derivada | PASS 1/1: caso exato com CAPTCHA real, MFA pendente, reload e verificação real |
| Playwright suíte completa de primeiro acesso | PASS 15/15, zero skip: três papéis, recuperação, navegação, teclado, dark, responsividade, axe |
| `tsx --test tests/auth/http-auth.integration.test.ts` | PASS 7/7 |
| `tsx --test tests/auth/http-mfa.integration.test.ts` | PASS 2/2 |
| `tsc --noEmit`, ESLint dos sete arquivos de código/teste, `git diff --check` | PASS |

Logs completos ficam privados em `.test-audit/p0-full/`; hashes em `evidence/validation.json`. Browser local usa a configuração existente derivada com `--webpack` e Chromium instalado, sem reinstalação. A configuração confiável de proxy é a mesma da configuração versionada. Imagens geradas preservadas apenas em pasta privada, sem substituir evidências históricas aprovadas.

Primeira checagem de lint/TypeScript detectou apenas nome de callback confundido com React hook e atribuição direta ao NODE_ENV readonly. Corrigidos no código de teste e checagens repetidas PASS. Nenhuma falha foi suprimida.

## Escopo e continuidade

Sem alteração de workflow, dependências, migrations, schema, IAM, MFA, dados clínicos ou produção. Os quatro testes novos entram automaticamente no glob Node do gate de primeiro acesso. Os gates posteriores permanecem obrigatórios. O SHA e CI posteriores ao push serão registrados no checkpoint local/final, sem push documental adicional só para disparar outra execução.

CI do novo SHA: pendente no momento deste documento. Acompanhar e diagnosticar somente o próximo gate que falhar. Release **NO-GO** enquanto CI, fotografia/licença e aceites restantes não forem concluídos. PR draft continua bloqueado pela API; nenhum merge/deploy/publicação/envio externo foi executado.
