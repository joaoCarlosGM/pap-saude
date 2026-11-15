# Segurança — evidência e limites

| Controle | Resultado e evidência |
|---|---|
| Auth, MFA, IAM, APIs clínicas/Admin/LMS e proxy operacional | PASS **de preservação por comparação Git**, não uma nova execução de F03/F04. `protected-boundaries.json`: fontes e36migrations operacionais sem mudança. |
| Laboratórios3600/15436, contas/senhas/MFA/sessões, VPS e Nginx | Não acessados/alterados. Só o perfil review próprio do executor foi usado. |
| Session/Origin/Host/CSRF privados | PASS; sessão ausente/forjada/expirada, origem externa, método e query indevidos negados; admissão HTTPS não concede acesso operacional. |
| Ingresso LAN | PASS automático: IP privado exato, /24 local ou gateway privado explícito, Host/Origin exatos, TLS, cookie Secure/HttpOnly/Strict, código aleatório fora de URL, expiração, logout/revogação e5tentativas por10min. Cabeçalhos IP/authorization não são herdados. |
| Websocket | Somente sessão admitida, Origin exata, GET e dois caminhos exatos Next HMR. Não é proxy genérico. |
| QR e documentos | PASS: opaco, hash no ledger; PNG recuperável AES-256-GCM com chave fora do DB/Git; reemissão revoga anterior, uso após revogação/expiração negado. Leitura não é autorização clínica. |
| Emissão simultânea/retentativa e cadastro duplicado | PASS PostgreSQL: locks, operação idempotente, uma credencial ativa por pessoa e identidade preservada. |
| Upload | PASS:5MB, até50páginas, MIME/assinatura/EOF/parser reais, nome restrito, SHA-256, recusa de JS/arquivos embutidos/corrupção. PDFs versionados, escopo por pessoa, arquivo lógico sem apagar histórico. Quota privada100MB/200documentos. Não há antivírus de produção homologado. |
| Cross-patient/anti-IDOR | PASS: trocar pessoa na URL de imagem/PDF retorna404. Todas as pessoas da base são sintéticas e pertencem ao mesmo laboratório autorizado; não é RBAC clínico. |
| Auditoria review | PASS: operações registradas e UPDATE/DELETE de eventos rejeitados. Não substitui a auditoria clínica/IAM. |
| Standalone/Docker | PASS: nenhum endpoint privado compilado; HTTP/RSC404 mesmo com flag privada; sem sessão, Vitrine redireciona login. Artefato portátil sem links externos; imagem local inspecionada sem perfil, senha, chave, cartão ou original privado. |
| Segredos em evidências | Verificação exata dos valores privados conhecidos + inspeção visual e decodificação QR das capturas selecionadas; resultados em validation.json. Logs íntegros privados, manifestos de hashes públicos. |
| npm produção |0HIGH/0CRITICAL,10MODERATE; sem audit fix, overrides ou mudança de lockfile. |
| npm completo |14HIGH/24MODERATE/1LOW,0CRITICAL; herdados do lockfile. JSON integral preservado, sem supressão. |
| CI integral remoto, rebuild Dockerfile multistage e Trivy | NOT RUN nesta candidata. O teste Docker valida runtime empacotado do standalone e base pinada, não uma reprodução completa do pipeline. Não há autorização implícita de produção. |
| Dispositivos físicos/WSL NAT/CA Android e iOS | NOT RUN externo; exigem aparelho, rede e confiança real do operador. |

## Dependências e alcance residual

As14entradas HIGH do relatório completo envolvem `@dotenvx/dotenvx`, `@modelcontextprotocol/sdk`, `@shadcn/registry`, `body-parser`, `eslint-config-next`, `eslint-plugin-react-hooks`, `express`, `express-rate-limit`, `shadcn`, `systeminformation`, `undici`, `zod`, `zod-to-json-schema` e `zod-validation-error`. São ramos de ferramentas/dev no audit desta árvore, incluindo CLI shadcn/registry e lint; não foram removidos ou atualizados indiscriminadamente. A instalação/build de dependências continua sendo uma superfície de risco. Não presumir que auditoria npm mede todo o sistema operacional da imagem; Trivy permanece pendente para qualquer publicação.

As10entradas MODERATE de produção estão em `@capacitor/cli`, `@prisma/client`, `@prisma/dev`, `@prisma/streams-local`, `ajv`, `fast-uri`, `glob`, `minimatch`, `prisma` e `rimraf`. Há cadeias CLI/Prisma e avisos transitivos. Os JSONs listam versões/faixas, via, efeitos e referências oficiais exatas. Produção não recebeu exceção de segurança.

## Não promover o laboratório

Banco review usa credenciais próprias, um único proprietário e dados exclusivamente sintéticos. Não é um banco de prontuários, não oferece política de autorização por profissional/tenant real e não deve ser exposto publicamente. PDFs institucionais e conteúdo médico aguardam direitos/revisão qualificada. A descrição textual de fluxos rasterizados tem limitações de acessibilidade. MEOWS assistencial não foi ativado. Publicação depende do checklist de deploy futuro e nova decisão humana.
