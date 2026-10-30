# PAP Admin Beta — ativação manual isolada

**Não é deploy automático nem aprovação de produção.** O agente não acessa a VPS.
Use somente o SHA e os três digests aprovados pelo workflow `Admin Beta isolated images`.
Não usar imagens `:prod`, `latest` ou imagens do P0 sem a barreira Admin Beta.

## Limites

Projeto Compose `pap-admin-beta`, diretório `/opt/pap-saude-beta`, web somente
`127.0.0.1:3101`, PostgreSQL próprio **sem porta publicada**, redes e volumes próprios.
Não há referência a `pap-internal`, `pap-postgres`, `pap-web`, `pap-n8n`, ao compose
`/opt/pap-saude/compose.yml` ou à landing `/var/www/pap-maintenance` nas operações Beta.
Não copiar bancos, contas, `.local`, senhas ou chaves do laboratório/produção.

`PAP_ADMIN_BETA_ONLY=1` é validado no entrypoint. Uma allowlist de método e caminho
em `src/proxy.ts` bloqueia desconhecidos, clínica, LMS, Vitrine, Comercial,
autoinscrição pública e integrações. O Nginx aplica uma segunda allowlist.
Os guards existentes de sessão, MFA, IAM, CSRF e auditoria permanecem ativos.
Menus filtrados são conveniência; **não são a barreira de acesso**.
O primeiro acesso/MFA e recuperação não concedem permissões adicionais.

## 1. Gates externos antes de ativar

O operador deve registrar evidência, sem segredos:
- CI verde no SHA exato; três imagens GHCR com label revision e digests registrados.
- Espaço, memória, firewall, Docker Compose v2 e relógio/NTP adequados. Revisar os
  limites Beta (web768MiB, DB512MiB; operações temporárias limitadas) e reservar
  capacidade livre para não disputar recursos dos serviços atuais.
- Porta3101 livre. Se ocupada: **parar**, não matar outro processo.
- Nenhum projeto/volume `pap-admin-beta` preexistente sem inventário/propriedade.
- DNS **novo** `admin-beta.papsaude.com.br` e certificado HTTPS válidos.
- Backup, restauração em cópia e retenção definidos para o banco Beta.
- Aprovação dos fluxos administrativos e política de tratamento de dados da homologação.

Inventário read-only pelo operador: IDs/estado/portas dos serviços existentes,
hashes do compose/vhosts/landing atuais e respostas HTTP3000/n8n5678 antes/depois.
Não imprimir `docker inspect` completo, ambientes, tokens, dumps ou `nginx -T`.
Não operar com Docker context/DOCKER_HOST remoto inadvertido; conferir contexto local.

## 2. Imagens e diretório novo

No terminal **do operador na VPS**, depois de autorização de ativação:

```bash
# Executar em shell root do operador: sudo -i (não pelo agente).
set -euo pipefail
BETA_SHA=COLE_O_SHA_COMPLETO_APROVADO
# Registrar os digests obtidos no CI/GHCR; preferir image@sha256 no .env após conferir labels.
sudo install -d -m 0700 /opt/pap-saude-beta
```

Usar um Docker config privado novo, inclusive se as imagens forem públicas, sem
ler/reutilizar credenciais globais dos serviços antigos:

```bash
BETA_AUTH="$(mktemp -d /tmp/pap-admin-beta-ghcr-XXXXXX)"
chmod 0700 "$BETA_AUTH"
printf '%s\n' '{"auths":{},"credHelpers":{"ghcr.io":""}}' > "$BETA_AUTH/config.json"
chmod 0600 "$BETA_AUTH/config.json"
# Se necessário: login somente neste config, com token NOVO read:packages do Beta
# e --password-stdin. Nunca digitar o token como argumento/comando ou usar PAT da produção.
```

```bash
docker --config "$BETA_AUTH" pull "ghcr.io/joaocarlosgm/pap-saude-admin-beta-tools:sha-$BETA_SHA"
docker --config "$BETA_AUTH" run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --user 0:0 \
  --mount type=bind,source=/opt/pap-saude-beta,target=/opt/pap-saude-beta \
  --entrypoint node "ghcr.io/joaocarlosgm/pap-saude-admin-beta-tools:sha-$BETA_SHA" \
  /app/scripts/admin-beta/prepare.mjs --directory /opt/pap-saude-beta \
  --sha "$BETA_SHA" --new-isolated-beta
```

O comando apenas prepara arquivos e segredos aleatórios **novos**; não inicia serviços.
Recusa reutilização/symlinks e nunca redefine MFA. Interrupção deixa arquivos
preservados: não apagar/reexecutar automaticamente; revisar o diretório parcial.
Segredos são arquivos Docker individuais, legíveis no container por UIDs distintos,
sob diretórios **0700** no host. Nunca versionar/copiar esses arquivos para o repositório.
Guardar a chave MFA em backup cifrado separado. Perdê-la impede recuperar TOTP existente.

```bash
BETA=/opt/pap-saude-beta
cp "$BETA_AUTH/config.json" "$BETA/.docker/config.json"
chmod 0600 "$BETA/.docker/config.json"
dc() { docker --config "$BETA/.docker" compose --project-name pap-admin-beta \
  --env-file "$BETA/.env" --file "$BETA/compose.yml" "$@"; }
dc config --quiet
dc pull
```

Conferir que as três referências no `.env` correspondem ao mesmo SHA aprovado.
`dc pull` pode incluir serviços de perfil; para explicitar: `dc --profile operations pull`.
Nunca substituir a imagem por `:prod`; tags SHA existentes não são sobrescritas pelo CI.

## 3. Banco e migrations controladas

```bash
dc up -d beta-db
dc --profile operations run --rm migrate
dc --profile operations run --rm migrate   # replay idempotente
dc exec -T beta-db psql -X -U pap_beta_owner -d pap_admin_beta \
  -v ON_ERROR_STOP=1 -v runtime_role=pap_beta_runtime -v migrator_role=pap_beta_migrator \
  < "$BETA/runtime-acl.psql"
dc --profile operations run --rm migrate node /beta/entrypoint.mjs drift
dc --profile operations run --rm tools
```

O manifest fixa as **36 migrations aprovadas**. As migrations históricas não foram
reescritas e algumas contêm DROP de estruturas antigas: a aplicação inicial é
permitida **somente neste banco Beta vazio**, nunca contra legado ou laboratório.
Não confundir isso com promessa de que todo SQL histórico é aditivo.
Novas versões precisam de revisão de migrations exclusivamente forward-only/aditivas,
backup restaurável e novo manifest. Não há `db push`, reset, `migrate reset` ou seed.

Owner PostgreSQL, dono/migrator e runtime são credenciais diferentes. Runtime não
é superuser/dono, não cria schema, não lê `_prisma_migrations` e não reescreve auditoria.
O verificador recusa checksums/histórico incompletos e privilégios excessivos.
Web só inicia após marker de verificação corresponder ao manifest da versão.
Se uma etapa falhar: manter web parada, preservar volume e investigar.
Em atualização futura de um Beta existente, parar **somente** `web` do Beta antes
do backup e da janela de migrations; preservar o mesmo banco e chave MFA. Não
trocar o manifest nem aceitar novo SQL sem revisão aditiva e restauração validada.

## 4. Primeiro PAP_ADMIN — sem conta fixa

O operador define e-mail, nome, instituição real e senha **mínima16 caracteres**.
Execute com terminal interativo. Somente JSON passa pelo stdin, sem arquivo/env/shell history:

```bash
python3 -c '
import json,getpass
with open("/dev/tty","r+") as t:
 def ask(label):
  t.write(label);t.flush();return t.readline().strip()
 email=ask("E-mail: ");name=ask("Nome: ");institution=ask("Instituição: ")
 password=getpass.getpass("Senha nova (mínimo16): ",stream=t)
 if password!=getpass.getpass("Confirme: ",stream=t):raise SystemExit("Confirmação divergente")
 print(json.dumps(dict(email=email,displayName=name,institutionName=institution,password=password)))
' | dc --profile operations run --rm -T tools node /beta/entrypoint.mjs provision
dc up -d web
```

O provisionamento aceita apenas banco Beta verificado e vazio, registra auditoria,
usa Argon2id e IAM existentes e recusa segunda execução. Não cria fatores, sessões
verificadas ou contas sintéticas. No primeiro login, configurar TOTP pelo QR,
confirmar código, guardar recuperação em cofre e fazer novo login com MFA.
Antes disso, operações administrativas devem retornar403.

## 5. Novo vhost — sem alterar landing/vhosts existentes

Após DNS e certificado, criar somente o novo arquivo/vínculo de vhost a partir de
`$BETA/nginx/nginx.conf`. O template inclui o mapa e a credencial privada do proxy.
Criar `$BETA/acme` exclusivamente para desafio ACME se necessário; não reutilizar
`/var/www/pap-maintenance`. Usar emissão `certonly --webroot`, sem plugin que
reescreva vhosts atuais. **Não executar reload antes de `nginx -t` válido**.

O operador habilita somente `admin-beta.papsaude.com.br` e faz reload controlado.
Não há `default_server` ou mudança de regras dos outros domínios.
Nginx sobrescreve Host, proto e identidade do cliente (`$remote_addr`) e injeta
credencial que navegadores não recebem. Cabeçalhos internos de rewrite são removidos.
Se houver CDN, validar IP real com ranges confiáveis explícitos; nunca confiar
automaticamente em X-Forwarded-For/CF-Connecting-IP do cliente.

Logs novos contêm apenas tempo, request ID, status e duração — sem URL/query,
Referer, Authorization, IP ou cookies. Error log deste vhost é desativado porque
seu formato pode incluir a URL; investigar5xx por métricas seguras e auditoria da aplicação.
Configurar retenção/alertas próprios para esses logs, sem alterar logs antigos.

## 6. E-mail e recuperação

**Envio externo bloqueado por padrão.** Para convites/redefinição públicos, antes
de liberar destinatários o operador precisa aprovar/validar Resend, SPF/DKIM/DMARC,
remetente e webhook assinado, com credenciais **novas do Beta**.
Preencher privadamente `secrets/resend_api_key` e `secrets/resend_webhook_secret` e
definir no `.env`: `PAP_EMAIL_PROVIDER=resend`, `PAP_EMAIL_EXTERNAL_ENABLED=1`,
`PAP_BETA_EMAIL_APPROVED=1`, remetente e allowlist exata. O entrypoint e o serviço
existente recusam configuração parcial. O webhook permanece fechado sem esse opt-in.
Recriar somente o container `web` após alteração, preservando banco/MFA/volumes.
Não declarar entrega de e-mail sem evento legítimo. Homologação externa de e-mail
não foi executada pelo agente. Não usar local-demo na VPS nem enviar dados clínicos.

## 7. Smoke e coexistência

- Login sem CAPTCHA negado; CAPTCHA real; senha incorreta negada; cookie Secure/HttpOnly.
- Primeiro acesso QR/TOTP, recuperação guardada, novo login MFA, logout e sessão revogada.
- PAP_ADMIN: rede, solicitações, aprovação/ativação, usuários, convites, IAM e auditoria.
- PAP_MANAGER: escopo delegado; sem nomear Admin/Manager, ativar/excluir UBS ou ler privado.
- Diretamente por URL, RSC e API: clínica, LMS, Vitrine, Comercial, desconhecidos404.
- Sem credencial do proxy: acesso direto3101 negado (exceto health interno).
- Após `dc restart web` e reinício controlado **somente** de `beta-db`: mesmas contas,
  senhas, fatores e sessões ainda válidas conforme TTL; nenhum QR novo/seed/reset.
- Backups e restore em cópia, cópia da chave MFA e conferência de checksums/ACL.
- Repetir inventário dos serviços/landing/vhosts antigos: IDs, portas e hashes intactos.
- Validar HTTPS, CSP, NTP, cabeçalhos, logs seguros e acesso externo sem publicar PostgreSQL.

## 8. Backup, restore e rollback

`dc --profile operations run --rm backup` cria dump privado no volume Beta de backups
e verifica o catálogo. Cifrar/exportar com controle de acesso; nunca anexar dumps a CI/chat/Git.
Testar restauração em **outro projeto Compose**, por exemplo `pap-admin-beta-restore`,
com diretório privado novo terminando em `/pap-saude-beta`, redes/volumes novos e web parada.
Nesse projeto: iniciar só DB; restaurar via `pg_restore --exit-on-error --single-transaction
--no-owner --no-privileges` usando papel migrator e o dump montado read-only. Não aplicar
migrations novamente sobre o dump antes de verificar seu histórico.
Reaplicar ACL, executar drift/verificador e comparar contas/credenciais/fatores/sessões.
Preservar **a chave MFA e ID originais do próprio Beta** e credencial de proxy para
continuidade; não reutilizar segredos de produção/laboratórios. Não regenerar chaves.
O teste automatizado exercita backup/restore com dados sintéticos e reinício de PG/web;
a restauração no destino real ainda exige evidência do operador.

Rollback inicial seguro: `dc stop web`, desabilitar somente o vhost Beta (ou fazê-lo
responder503), testar Nginx e recarregar manualmente. **Preservar DB e todos os volumes**.
Se houver Beta anterior homologado e compatível com o manifest, voltar somente às suas
três imagens/digests. Não usar a imagem antiga sem modo restrito.
Migrations não têm rollback automático: restaurar em cópia isolada ou roll-forward
aprovado; nunca apagar/reescrever histórico ou usar `down -v`, prune, reset ou DROP
no banco em uso. Nenhum comando deste procedimento altera serviços antigos.
