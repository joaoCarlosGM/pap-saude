# VPS — preflight, backup, restauração e rollback do piloto
**Este é um RUNBOOK; NÃO significa que SSH/deploy/backups foram executados.** Dados conhecidos por versão do repositório, **não estado live**: Ubuntu 26.04 LTS relatado pelo operador, `admin-beta.papsaude.com.br`, manifestos `deploy/admin-beta/`, compose `pap-admin-beta`, porta de entrada local `127.0.0.1:3101`, banco `pap_admin_beta`, `postgres:16-alpine`, Nginx host admin-beta, imagens imutáveis. O plano antigo cita 4GB/2 vCPU como **critério a conferir, NÃO medição**. Não supor IP, caminho de credencial SSH, recursos, imagem executada ou DNS já aplicados. **Nunca imprimir .env, dump clínico, senhas, certificados privados ou tokens no terminal/log do Codex.**

## P0 — inspeção SOMENTE LEITURA (usuário autorizado executa na VPS; sem sudo destrutivo)
```bash
date -Is
uname -a
df -hT
free -h
uptime
docker version --format '{{.Server.Version}}'
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker volume ls --format 'table {{.Name}}\t{{.Driver}}'
ss -lnt
sudo nginx -t
sudo certbot certificates
```
**Atenção:** `nginx -T`, `docker inspect`, `docker compose config` e `printenv` podem exibir segredos, portanto NÃO capturar/colar logs brutos. Documentar apenas nomes de serviços, portas, volumes e digest de imagem (sem valores de env). Verificar backups existentes, discos, versão do Postgres, expiração TLS e monitoramento.

## P1 — congelar fonte e registrar recuperação
- Definir ID do deployment autorizado, dono da janela, hash de imagem, armazenamento, RPO/RTO e responsável pela restauração; sem isso NO-GO.
- **Não alterar `pap-admin-beta`/produção para instalar o piloto**, principalmente sem saber o estado atual da VPS. Criar outro projeto Docker Compose, outra rede privada, outro banco/volume, outro conjunto de secrets e bind loopback exclusivo após aprovação.
- Guardar cópia controlada de: arquivos de infraestrutura COM permissões corretas, configuração Nginx **sem chave privada em artefatos de projeto**, tags/digests, scripts de init/migrations versionadas, segredos num cofre/backup criptografado à parte. Backup de DB isolado NÃO substitui backup das chaves de MFA/documentos ou scripts. Não colocar cópia no GitHub/Drive público.

## P2 — backup com restauração comprovada (somente após autorização de janela)
Se o serviço `backup` de `deploy/admin-beta/compose.yml` estiver comprovadamente instalado e configurado no host, existe um perfil `operations` com `pg_dump --format=custom`. **Não presumir que a pasta local coincide com o deploy real**, nem executar diretamente em produção sem janela e backup storage. Primeiro conferir `docker compose --project-name pap-admin-beta --file <CAMINHO_REAL>/compose.yml config --services` **sem mostrar saída de secrets** (uso somente dentro de sessão privada).
Protocolo seguro, aprovado pelo operador:
1. Testar espaço/quotas e destino criptografado, `umask 077`; iniciar backup consistente via container de backup existente **apenas do banco escolhido**; dump custom `pg_dump -Fc` dentro de storage privado.
2. Gerar SHA-256 e `pg_restore --list` sem imprimir dados; copiar para destino off-host cifrado e restrito; registrar tamanho/hash no ledger privado.
3. Criar **banco NOVO descartável isolado**, restaurar com papel apropriado, validar contagens, migrations, login com usuários de teste, integridade de FKs e autorização; **nunca usar `pg_restore --clean` sobre origem ou restore sobre banco atual**.
4. Testar recuperação de dependências de criptografia: chaves de MFA e carteirinhas sem extrair valores.
5. Verificar retenção, rotação, acesso e teste de restauração. Apenas "backup criado" sem teste de restore = NO-GO.

## P3 — deployment isolado hospital
- Compilar imagem imutável escaneada em CI, sem devtools/fixtures/artefatos privados. Projeto `pap-hospital-beta1` (nome proposto, não existente). Runtime sem DDL; papel migrator separado; Compose `secrets` ou cofre; DB não publicado na rede; app bind somente `127.0.0.1:<PORTA_APROVADA>`.
- Subdomínio hospitalar **a definir com o hospital e DNS**; não reutilizar `admin-beta.papsaude.com.br` ou `papsaude.com.br` sem aprovação. Novo Nginx vhost separado com HTTPS, redirect, headers, proxy IP confiável, noindex para piloto; allowlist explícita por método/rota, não abrir `/api/clinical/**` genericamente sem revisão.
- No primeiro acesso, PAP Admin ativo → HEALTH_UNIT ativa → convite HEALTH_UNIT_ADMIN → profissional ativo + MFA → verificar contexto de organização e permissão por paciente. Não conceder pap_admin acesso clínico implícito.
- **Não habilitar envio de email externo por configuração padrão**, revisar consentimento de conteúdo, domínio e política.
- Testar MFA, permissões cruzadas, CRUD clínico, auditoria, idempotência, privacidade, restart, TLS, Nginx 404/403, encerramento e suporte.
- Migrações somente no banco novo, com preflight/drift e rollback/rollforward documentados. Se o schema exige upgrade irreversível, não fazer corte com pacientes reais sem janela/contingência.

## P4 — rollback
- Registrar digest anterior do novo piloto e readiness anterior; desligar/esconder novo vhost ou mudar apenas upstream do PILOTO, nunca do Admin.
- Se não houve migration incompatível: voltar imagem PILOTO por digest, sem descartar volumes/dados.
- Se houver dados gravados: congelar escrita, preservar eventos/auditoria e escolher roll-forward ou restauração aprovada com RPO aceito pelo hospital; imagem anterior NÃO desfaz alterações de schema.
- Testar idempotência de recuperação e integridade dos registros pós-falha; plano assistencial de contingência (papel/sistema oficial) operado pelo hospital.

## Critérios para paralisar imediatamente
Sem autorização de mudança; disco abaixo da margem definida; backup e RESTORE não demonstrados; rota admin ou produção alterada; aumento de acesso por papel; dados reais em fixture; segredos expostos; DNS/TLS indefinido; score MEOWS usado como decisão não validada; hospital sem responsável técnico ou procedimento de contingência.
