# Correção dirigida — smoke test Docker web / CAPTCHA

Base: `aa3dbde91768f8779a0f1200f4c6a056c7481d7c`, branch `codex/p0-full-implementation`.
CI anterior: [40742438927](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40742438927).

## Causa e alteração

O teste enviava credenciais inválidas sem verificação humana e esperava 401. O contrato atual corretamente rejeita essa requisição com 400 antes de autenticar. Corrigido exclusivamente `scripts/test-f04-web-image.sh`:

- Preserva a negativa sem CAPTCHA: 400 / `LOGIN_VERIFICATION_REQUIRED`.
- Emite CAPTCHA acessível real, resolve a multiplicação pública e conserva cookie HttpOnly/Secure, origem e o mesmo cliente confiável em ambas as requisições. Nenhum bypass, injeção de resposta ou acesso ao segredo do desafio.
- Exige 401 / `INVALID_CREDENTIALS` depois da verificação real.
- Lê o banco como `pap_runtime` (a mesma identidade exclusiva do container web), exigindo exatamente uma tentativa FAILURE e nenhuma sessão no banco recém-criado pelo script. A consulta anterior como superusuário foi substituída por essa verificação mais estrita.
- Mantém non-root, healthcheck, renderização de login, migrations com migrator e isolamento descartável originais. Mensagens de falha do desafio/cookie são sanitizadas e não imprimem seus valores.

Nenhuma alteração em aplicação, CAPTCHA, MFA, origem, auditoria, grants, migrations ou workflow.

## Validação dirigida

| Verificação | Resultado |
|---|---|
| `bash -n scripts/test-f04-web-image.sh` | PASS |
| `node --check .test-audit/p0-full/web-smoke-inline.cjs` (JavaScript extraído do script) | PASS |
| Fluxo HTTP extraído do script, handlers reais com `NODE_ENV=production`, origem/cliente/cookie preservados e papel runtime em banco descartável próprio | PASS: 400 sem CAPTCHA; 200 emissão; 401 credenciais inválidas; +1 FAILURE persistido; nenhuma sessão |
| `git diff --check` | PASS |
| Smoke Docker completo local | NOT RUN: não há imagem local do candidato; a imagem disponível não contém a rota CAPTCHA e o workspace tem somente ~212 MiB livres. Não foi usada como evidência equivalente nem foram removidos recursos para liberar espaço |
| Build Docker, Vitrine de produção e scanners do novo SHA | Pendente do CI remoto no momento do commit |
| Suítes completas, instalação, geração Prisma, builds e auditorias gerais locais | NOT RUN: fora do escopo dirigido |

A verificação HTTP usa adaptador HTTP local para os handlers reais, não afirma renderização Next, non-root ou imagem Docker aprovados. O ID, owner, label descartável e binding loopback do container PostgreSQL foram verificados antes de configurar um papel sintético independente com o SQL de separação existente. Só o banco sintético próprio `pap_saude_f02b_test` foi usado; os dados do operador não foram acessados. A consulta final do script Docker usa banco novo `pap_f0410_web`, onde exige contadores absolutos 1/1/0; o probe local reutiliza o banco descartável e verifica o incremento de uma tentativa negada.

Evidências privadas locais:

- `.test-audit/p0-full/web-smoke-http-final.log` SHA-256 `3641a93eb85854e4e123a8f98109f5cc79a6e98767e27c8e7a66b9bc6e350ba7`.
- `.test-audit/p0-full/web-smoke-inline.cjs` SHA-256 `04150e8fc1c6d0f910e1b8c64063230838e35138526c056d11eedaaebd3d44ee`.

Inventário seletivo: este relatório, `scripts/test-f04-web-image.sh` e `docs/release/p0-full-implementation/evidence/source-manifest.json`.

Acompanhamento do novo CI em `.test-audit/p0-full/web-image-final-*`; resultados remotos serão registrados no checkpoint privado e na entrega. Nenhum merge/deploy, alteração de VPS, produção ou laboratório do operador, reinstalação ou rebuild local.
