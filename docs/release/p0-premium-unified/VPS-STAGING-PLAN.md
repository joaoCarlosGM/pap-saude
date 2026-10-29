# Plano de homologação controlada na VPS — nenhuma execução autorizada

Esta entrega prepara um roteiro. Nenhum SSH, DNS, túnel, Docker Compose remoto, migração, segredo ou deploy foi executado. Push em prod publica/implanta automaticamente: **não usar prod para iniciar staging**. Exigir autorização separada do operador após os gates locais/CI.

## Pontos de parada

1. Sem CI remoto verde no SHA candidato, scanners aceitos, Docker funcional e backup/restore comprovado: NO-GO para staging.
2. Sem autorização de acesso read-only: não conectar à VPS. Operador inventaria Docker/Compose, SO, PostgreSQL, proxy/HTTPS, disco, memória e CPU; não imprimir env, sessões, prontuários ou conteúdo de backups.
3. Confirmar se há 4GB/2vCPU e capacidade para aplicação, PostgreSQL e serviços existentes. Não presumir espaço para staging paralelo, nem executar builds na VPS limitada. Se não houver capacidade, provisionar destino independente mediante aprovação.
4. Staging precisa de banco/volume/roles/segredos próprios, sem dados reais, sem compartilhar o banco de produção ou publicar PostgreSQL. Proibir colisões de nomes, portas e redes. Se não puder provar isolamento, parar.

## Inventário e imagens

Registrar versões/digests do Node22-alpine fixado no Dockerfile, PostgreSQL16, Next16.4.2, Prisma CLI/migrator7.10.1 e pacote client7.10.0, scanner Trivy fixado e versão do Docker/Compose do destino. Não inventar digest: registrar somente imagens efetivamente construídas e escaneadas para o SHA candidato. Release package referencia os lockfiles e as35 migrations sem editar seu histórico.

Preparar web runner e migrator do mesmo SHA, com tag imutável/digest. Execução non-root, sem package manager no runtime e healthcheck existente. Nenhuma credencial de build, local3600 ou produção deve entrar na imagem. `.local` é excluído do contexto. Publicar/transportar imagens para staging exige fluxo autorizado separado; esta missão não publicou imagens.

## Banco e migrations

Segredo SQL migrator separado do login runtime; runtime sem SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS, sem DDL nem alteração de ledger. Aplicar `scripts/db/f04-role-separation.sql` no banco staging próprio e verificar ACL da tabela de operações e provenance. Revisar checksums das35 migrations e realizar preflight/drift. Migrator-before-web, sem iniciar web se falhar. Não executar db push/reset nem modificar migrations históricas.

Backup antes de qualquer upgrade do destino autorizado. Guardar em diretório privado criptografado, sem versionar/transferir por chat. Restaurar em **outro banco descartável isolado**, testar integridade, autenticação, contagens sintéticas e operações essenciais, registrar hashes/totais sem PII. Uma cópia sem restore exercitado não é backup aprovado. A evidência do destino ainda está pendente.

## Rede, identidade e correio

HTTPS/proxy confiável, cookies Secure/HttpOnly/SameSite e origins explícitas. Configurar AUTH_TRUSTED_CLIENT_IP_HEADER apenas se o proxy remover e sobrescrever esse header; impedir acesso direto à aplicação que permita forjá-lo. Limites de CAPTCHA/MFA permanecem habilitados.

Separar chaves MFA, IDs de chave, senhas SQL e conta inicial de staging. Não copiar configurações3600 ou da produção. Não reutilizar sessões reais. Fazer primeiro acesso e cadastro TOTP reais no novo ambiente, com armazenamento privado de recuperação.

Correio deve continuar sem envio externo até autorização específica. local-demo é restrito a desenvolvimento e não deve ser habilitado em NODE_ENV=production. Preparar capturador externo isolado/contrato de teste ou manter transações de e-mail bloqueadas com status honesto. Resend, SPF/DKIM/DMARC, webhook assinado, HTTPS e domínio exigem homologação separada; nenhum DNS foi alterado.

## Smoke e observabilidade

Liveness `/api/health` não comprova DB pronto. Validar readiness SQL com papel runtime, versão de migrations, grants e fluxo autenticado. Exercitar Admin-only, Profissional de duas UBS e Comercial; criação idempotente, conclusão, negativos de tenant/MFA/CSRF, notificações e restauração. Sem pacientes reais e sem MEOWS/IA assistenciais.

Registrar latência, CPU, memória, disco, falhas, filas e reenvios sem payload clínico, cookies, tokens ou links privados. Alertar 5xx, falhas de login/MFA, volume/disco, falha migrator e backup. Definir operador responsável, contatos privados, retenção/acesso/rotação de logs e procedimento de incidente. Não declarar conformidade LGPD por estes testes de software.

## Retorno / avanço

Registrar digest anterior e novo e compatibilidade da aplicação com o schema. Reverter imagem não desfaz migration. Se o schema não for retrocompatível, escolher roll-forward ou restauração previamente validada, com janela de perda de dados explicitamente aceita. Congelar escritas durante recuperação; testar recuperação em staging antes de qualquer produção.

Autorizações independentes: (1) inspeção read-only; (2) criação/configuração de staging isolado; (3) migração e inicialização de staging; (4) homologação humana; (5) eventual release/produção, sempre após GO formal. Nenhuma delas é consequência automática deste plano.
