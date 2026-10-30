# Procedimento de preservação e atualização da HOMOLOGAÇÃO existente 3600

## Infra já existente — NÃO recriar

- Checkout operador: `~/projetos/pap-saude-p0-unified-rc`
- Branch: `feature/p0-premium-unified-rc`
- WEB: `127.0.0.1:3600`
- PG: `127.0.0.1:15436`
- Container: `pap-p0-unified-rc-db`
- Volume: `pap-p0-unified-rc-data`
- DB: `pap_p0_unified_rc`
- Private directory: `.local/pap-p0-unified-rc` (0700), arquivos 0600.
- **Contas/senhas/MFA existentes**: sete contas seed já criadas e usadas pelo operador. O arquivo `seed-accounts.json` e os dados do banco não entram em Git/CI e não devem ser lidos para diagnósticos públicos.

## Invariantes absolutos

1. O mesmo `user.id`, senha hash, flags MFA/TOTP, dispositivos/recovery, memberships, clínicas sintéticas e audit trail devem permanecer após atualização.
2. NENHUM passo chama `local:init`, `local:seed`, `local:admin`, `migrate reset`, `db push`, `prisma migrate dev` contra 15436, `docker down -v`, `docker volume rm`, `docker system prune`, reinicialização de DB ou sobrescrita de `.local`.
3. Manter a MESMA origem `http://127.0.0.1:3600`; não trocar para `localhost` inadvertidamente, pois host da cookie difere; preferir mesmo perfil de navegador. A autenticação persistida pode exigir login após deploy, mas **NÃO recadastro de MFA** se credenciais e chaves preservadas.
4. Não fazer `git reset --hard`, `git clean -fdx`, `git checkout .`, `git pull --rebase` com alterações do operador não auditadas. `npm ci` não pode tocar `.local`, mas confirmar scripts `postinstall` antes de executar.
5. Primeiro aplicar migrations contra banco TEMPORÁRIO clonável e restaurado; jamais experimentar migration destrutiva na fonte operacional.

## Preflight somente leitura antes de atualização (no WSL do operador)

```bash
cd ~/projetos/pap-saude-p0-unified-rc
pwd
git branch --show-current
git status --short
git rev-parse HEAD
docker context show
docker inspect pap-p0-unified-rc-db --format '{{json .Config.Labels}}'
docker volume inspect pap-p0-unified-rc-data --format '{{.Name}}'
ss -ltnp '( sport = :3600 or sport = :15436 )'
ls -ld .local .local/pap-p0-unified-rc
# NÃO fazer cat/print do seed-accounts.json; não publicar docker inspect Environment.
```

**Se aparecer uso de contexto remoto, volume/container não identificado, branch divergente, local não limpo ou arquivo privado com permissão errada, STOP.** Scripts locais têm guardas e devem permanecer.

## Backup e restore ANTES de migrar o laboratório do operador

1. Criar backup PostgreSQL **offline lógico consistente** com `pg_dump --format=custom` usando conexão restrita ao container local e gravar em `.local/pap-p0-unified-rc/backups/`, permissões 0700/0600. Não exibir credenciais na linha de comando nem no log. Um exemplo do formato de backup está em `scripts/backup-db-3600.sh`, de execução manual e opt-in.
2. Verificar dump via `pg_restore --list`, registrar SHA256 do arquivo (hash não é segredo, mas mantê-lo privado é aceitável). Se possível validar restore integral em banco DESCARTÁVEL separado, sem tocar o original. `pg_restore --list` não substitui teste de restauração.
3. Capturar baseline **sanitizada**: contagens 7 usuários, vínculos, tabelas de MFA por contagem sem segredos, pacientes e atendimentos de teste, versões aplicadas, session secret IDENTIDADE por hash apenas armazenado localmente. NÃO imprimir seed accounts, tokens, QR, chaves.
4. Aplicar **somente** migrations ADITIVAS revisadas, na ordem esperada, depois de autorização explícita do operador e sucesso do backup/restore de ensaio.
5. Comparar contagens e IDs de referência com a baseline após migrations. Reusar `.local` original; rodar `npm run local:unified -- start` se o container não estiver rodando e `npm run local:unified -- dev` para web. Não repetir init/seed.
6. Se houver falha após migration, **não executar rollback destrutivo automático**. Desligar somente o web do laboratório identificado, preservar dump e diagnosticar. Reverter código não reverte schema automaticamente; restauração somente com decisão do operador e procedimento isolado.

## Atualizar checkout sem sobrescrever trabalho local

- Codex desenvolve/pusha na mesma `feature/p0-premium-unified-rc`, mas não deve escrever no disco WSL do operador sem acesso/autorização.
- No WSL: parar apenas o processo web com Ctrl+C, `git status --short`, `git fetch origin feature/p0-premium-unified-rc` e inspecionar `git log --oneline --left-right HEAD...FETCH_HEAD`; se local limpo e apenas fast-forward, `git merge --ff-only FETCH_HEAD` sem alterar outros laboratórios.
- Com mudanças locais, criar commit ou patch de salvaguarda após revisão; nunca apagar o trabalho com `reset --hard`.
- Se somente UI, rebuild/retomar sem alterações DB. Se LMS adicionou migrations, executar seção acima antes de iniciar código novo.

## Casos especiais

- A captura de senhas que apareceu na conversa é **dado privado e não será integrada ao pacote**. O Codex não necessita das senhas reais; testes criam contas novas em banco descartável.
- Repetição do seed: embora seja idempotente em condições específicas, é proibida neste fluxo porque não há qualquer necessidade funcional. Confirmar que o banco continua idêntico em contas.
- Autenticadores TOTP: credenciais de usuário e chaves de MFA residem no DB e possivelmente segredos do perfil local; preservar ambos, sem reaproveitar em staging/VPS. Não apagar registros do app Authenticator já cadastrados.
- A instalação antiga `pap-saude-prod-preview`, DBs de portas 3100/3200/3300/3500 e seus volumes permanecem intactos. Migração de banco antigo com contas de produção não faz parte desta missão.
