# F04.10 — procedimento revisável, sem autorização de deploy

## Limites e decisão

Somente bancos descartáveis foram usados nesta missão. Nada aqui autoriza acesso,
DDL, rotação, reinício ou deploy na VPS. `prod` publica e faz deploy; `PROD` é outra
branch. Aprovação humana obrigatória, inclusive GitHub environment `production`
com revisores exigidos e sem bypass administrativo. A declaração `environment`
no YAML não configura essas proteções automaticamente.

## Inventário somente leitura pelo operador

Usar conexão segura existente, sem colocar senha na linha de comando, no chat ou
na saída. Executar `scripts/db/f04-readonly-inventory.sql` via psql (ON_ERROR_STOP),
com usuário de inspeção autorizado, guardar apenas nomes, flags e contagens.
Conferir que o banco inspecionado é PAP, não n8n. Antes/depois comparar separadamente
proprietários e ACLs de n8n sem alterá-los. Nenhum comando desta missão o modifica.
Na VPS, `sha256sum /opt/pap-saude/compose.yml /opt/pap-saude/scripts/deploy.sh`
e `docker ps --format '{{.Names}} {{.Image}} {{.Status}}'` permitem registrar a
identidade dos artefatos sem despejar variáveis. O operador deve revisar o script
e compose **com segredos redigidos**: digest fixo de ambas as imagens, papel runtime,
healthcheck, migrator antes de web, propagação de status não zero e ausência de
`|| true`, execução assíncrona ou continuação após erro. Estes arquivos externos
não foram lidos nem aprovados nesta missão.

## Preservação do legado e backup

1. Inventariar o histórico real e novos dados; a informação de tabelas vazias em
   setembro não prova vazio hoje. Congelar escritores e impedir novas conexões
   do aplicativo legado por procedimento humano aprovado. Não basta parar um pod
   se jobs, réplicas ou integrações continuam escrevendo.
2. Backup PostgreSQL consistente com `pg_dump --format=custom` por canal seguro,
   usando credencial apropriada fora da linha de comando. Guardar com acesso
   restrito, criptografia e retenção aprovada. Registrar hash SHA-256, timestamp,
   versão PostgreSQL, imagem anterior e histórico das migrations; validar o exit
   status de dump e listagem `pg_restore --list` (não imprimir dados clínicos).
3. Restaurar com `pg_restore --exit-on-error` em PostgreSQL isolado e descartável.
   Conferir todas as tabelas, contagens e relações; comparar resumos criptográficos
   internamente, sem publicar conteúdo ou hashes individuais de dados reais.
   Medir RTO/RPO e realizar smoke tests da versão antiga contra o restore.
4. O preflight da imagem aborta se qualquer uma de `patients`, `admissions` ou
   `clinical_evaluations` tem registros no esquema legado. **Não apagar dados nem
   remover o guard**. Exigir plano separado de transformação/mapeamento aprovado
   clinicamente, preservando prontuário, vínculo de tenant e proveniência. Reensaiar
   com cópia sanitizada; até lá, NO-GO com legado populado.
5. Em legado vazio, `F04_LEGACY_MAINTENANCE=writers-stopped` é confirmação operacional
   obrigatória. A imagem também rejeita outras sessões clientes abertas no banco.
   O advisory lock serializa apenas migrators cooperantes: não impede novas conexões
   legadas. O bloqueio externo de escritores deve durar todo o cutover.

## Separação de privilégios

`scripts/db/f04-role-separation.sql` usa parâmetros psql `runtime_role` e
`migrator_role` (padrões recomendados pap_runtime/pap_migrator), conectados ao banco
PAP correto com administrador autorizado. É transacional e idempotente; recusa
papéis reutilizados privilegiados, membros ou runtime dono de objetos. Cria papéis
NOLOGIN sem senha. Ativação LOGIN, credenciais aleatórias, entrega segura e rotação
são responsabilidade do operador; nunca salvar senha no Git.

Migrator deve ser dono dos objetos PAP e do schema correspondente para DDL; o
runtime não deve ser dono do banco, schema, funções nem tabelas. Para objetos
existentes, revisar inventário e preparar transferência **por objeto PAP** para o
migrator antes do cutover. Não usar REASSIGN OWNED global, nem alterar pap_prod/n8n
às cegas. O script não transfere ownership nem revoga privilégios do pap_prod:
essa intervenção depende do inventário real e do plano aprovado.

O script revoga CREATE público no schema public do banco conectado. Se outro
serviço compartilhar esse banco/schema, NO-GO até avaliar impacto. Ele não muda
roles, bancos ou grants de n8n. Runtime recebe DML, USAGE de sequências, apenas
SELECT/INSERT em audit_events e nenhum acesso ao histórico Prisma. Conferir também
ACLs PUBLIC e funções SECURITY DEFINER externas. Grants futuros dependem do papel
que realmente executa a migration; reaplicar o script após cada migration e auditar
as exceções antes de iniciar web. Não conceder runtime ao migrator nem o inverso.

## Sequência de release a aprovar externamente

- Proteger branches e environment GitHub; cadastrar `VPS_KNOWN_HOSTS` obtido por
  canal confiável. Não usar ssh-keyscan em tempo de deploy como fonte de confiança.
- Fixar SHA/digests web e migrator testados e aprovados. Nunca usar tag mutável
  isoladamente como prova de identidade. Revisar scan de vulnerabilidades da imagem.
- Backup/restore aprovado, manutenção e verificação read-only concluídos.
- Executar migrator separado intencionalmente; **somente status zero permite iniciar
  web**. Contrato esperado: `migrator && web`; nenhuma execução de web no ramo de erro.
- Reaplicar grants revisados, trocar a conexão web para runtime de privilégio mínimo,
  retirar a credencial anterior dos consumidores e rotacioná-la sob plano aprovado.
- Verificar liveness `/api/health` (não é prova de DB/RBAC), conexão DB e smoke tests
  autenticados com dados sintéticos: login/MFA, tenant A vs B, prontuário, auditoria
  append-only, operação administrativa e negação clínica ao PAP_ADMIN.
- Verificar logs sem segredos, saúde e ausência de regressões em n8n; registrar GO
  humano com hashes, responsável, janela e observabilidade.

## Reversão

Falha do migrator: manter web parado; diagnosticar e escolher restore ou roll-forward.
Uma imagem antiga **não reverte o banco**. Após migrations destrutivas, rollback
exige banco restaurado e aplicação compatível, sob manutenção, validando o RPO e
reconciliando escritas posteriores. Nunca promover backup restaurado sem teste nem
reexecutar cegamente migration parcialmente aplicada. Restauração operacional real
e compatibilidade imagem/banco continuam gates externos.

## Reprodução local

`bash scripts/test-f04-role-separation.sh` cria e remove seu próprio container.
`node --test tests/security/f04-migration-preflight.test.mjs` exige o container
pap_saude_db marcado `pap.disposable=f0410`, credenciais CI falsas e porta local.
O harness `bash scripts/test-f04-migrator-image.sh pap-saude-migrator:mission` cria
rede e container próprios, instala somente a migration inicial, registra seu
checksum via Prisma, ensaia dados sintéticos, restore, 1→27 (baseline histórico) e 1→28 (migration incremental de paridade), segunda execução,
invariantes e falha que bloqueia web. Nada aceita URL de produção.

Em builds atrás de proxy, usar os build args HTTP_PROXY/HTTPS_PROXY e o secret
BuildKit `build_ca` com a CA confiável fornecida pelo ambiente; nunca desabilitar
TLS/checksum. Se o hostname do proxy não resolver dentro do BuildKit, usar
`--add-host` com o endereço fornecido pelo ambiente. Não copiar CA ou credenciais
para a imagem final. CI sem proxy usa os mesmos targets sem esses parâmetros.
