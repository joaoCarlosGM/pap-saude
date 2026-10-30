# Homologação local sem recadastrar MFA

Este procedimento é para o operador, no MESMO checkout e perfil de navegador do laboratório3600. O agente não o executou. Não copie `.local` de outro ambiente, não mude a origem para localhost e não substitua nenhuma chave, conta ou configuração. Não atualize os outros laboratórios.

## Antes de atualizar

1. Pare somente o web3600 com Ctrl+C no terminal que o iniciou. Mantenha PostgreSQL15436 e o volume existentes.
2. Confira o diretório e o Git. Se houver divergência, trabalho local ou histórico não fast-forward, STOP e preserve-o. Não faça reset/clean/stash de dados privados.

```bash
cd ~/projetos/pap-saude-p0-unified-rc
git branch --show-current
git status --short
git fetch origin feature/p0-premium-unified-rc
git log --oneline --left-right HEAD...FETCH_HEAD
```

3. Após confirmar checkout limpo e fast-forward, atualize somente o código. Este comando não aplica migrations:

```bash
git merge --ff-only FETCH_HEAD
```

4. Revise e execute manualmente os scripts recebidos do pacote. Eles são opt-in e recusam caminho/contexto/ownership inesperados. Não publique sua saída privada nem o dump.

```bash
bash PAP_SAUDE_BETA1_MISSAO_CODEX_20261030/scripts/preflight-3600.sh
bash PAP_SAUDE_BETA1_MISSAO_CODEX_20261030/scripts/backup-db-3600.sh
```

**STOP antes de migrar15436:** `pg_restore --list` sozinho não valida restauração. Selecione o dump específico criado pelo script (não use um comando automático “último arquivo”) e execute:

```bash
node scripts/local/validate-beta1-copy.mjs \
  --backup "$PWD/.local/pap-p0-unified-rc/backups/ARQUIVO_ESCOLHIDO.dump" \
  --validate-isolated-copy
```

O arquivo precisa ser regular, privado0600 e do operador, sem symlink. O helper não descobre nem acessa o banco original: lê somente o dump escolhido, cria container PostgreSQL16 com nome/labels próprias, tmpfs, porta efêmera loopback e credencial aleatória independente. Valida checksums das migrations, restore, migrate deploy/replay/drift e hashes/contagens de identidade, senha, MFA, sessões, vínculos, clínica e auditoria. Remove somente a cópia de ownership comprovada; guarda evidências privadas em /tmp. Não usa nem troca as chaves do laboratório. Não valida login da conta real: esse aceite usa o navegador e as chaves originais, após autorização e atualização.

O agente executou esse helper exclusivamente sobre seu próprio dump sintético, nunca sobre os backups do operador. Se o ensaio do SEU dump falhar, ou faltar autorização, mantenha o banco original intacto.

## Atualização autorizada do banco existente

Somente depois de backup/restauração e cópia migrada aprovados pelo operador, no mesmo checkout, mantendo `.local` e sem instalar novas dependências (lockfile não mudou):

```bash
npm run local:unified -- migrate
npm run local:unified -- dev
```

O launcher existente verifica perfil, container, volume e URL; gera o client para o schema novo, executa apenas migrate deploy e bootstrap IAM. O bootstrap aplica o catálogo aprovado; não reprovisiona contas nem configura TOTP. Não execute init/seed/admin/reset/db push. Não use migrate dev. Não reinicie nem recrie o PostgreSQL para essa atualização.

Abra **http://127.0.0.1:3600/login** no MESMO perfil de navegador. Uma sessão expirada pode exigir login legítimo; isso não exige novo QR/MFA. Se solicitar recadastro inesperado de fator, STOP: preserve o banco/chaves e investigue; não redefina MFA para contornar o erro.

## Checklist por conta existente

- PAP_ADMIN: MFA anterior, Admin teal light/dark, KPIs aprovados, rede→município→unidade→vínculos, pendências/convites/auditoria. Não abre prontuários implicitamente.
- PAP_MANAGER: home de ações, município somente pendente, solicitação de UBS pelo fluxo anterior; criar rascunho parcial, editar blocos/ordem, publicar, liberar à UBS/município, consultar distribuição. Não ativa unidade, atribui a profissionais, nomeia gerente/Admin ou abre clínica.
- MUNICIPAL_ADMIN: entrar em Cursos institucionais, consultar ofertas/UBS do município, encaminhar oferta autorizada; agregado pequeno suprimido, outro município negado.
- HEALTH_UNIT_ADMIN: `/cursos`, conteúdo recebido somente leitura; buscar profissional, selecionar um/todos, definir obrigatoriedade/prazo e confirmar. Repetir não duplica; equipe externa não elegível. Consultar filtros/páginas e revogar preservando histórico.
- PROFESSIONAL: badge real, abrir matrícula, atividade/checkpoint, F5/sair/retomar, avaliação e conclusão confirmada no servidor. Prazo real; nenhum certificado fictício. Login com MFA anterior e prontuários existentes preservados.
- PROFESSIONAL_B: não vê/abre matrícula da outra UBS por HTML, RSC ou API. Registros clínicos próprios e finalização/idempotência anteriores continuam funcionando.
- COMMERCIAL: `/comercial`→`/vitrine/cursos`, seis exemplos→player sintético; progresso apenas em memória, restaurar/F5 limpa; APIs operacionais negadas.
- Teclado,320/375/390/430/768/1024/1440px, modo escuro e Ajuda de aprendizagem. A janela de segurança/MFA não deve reaparecer indevidamente.

## Interromper e retomar

Ctrl+C encerra apenas o web. Para retomar o mesmo laboratório persistente:

```bash
npm run local:unified -- dev
```

Se o banco já estava parado por ação do operador, o launcher `start` existente pode ser usado somente após conferir ownership; não é necessário executá-lo quando o banco já está ativo. Nenhum comando de limpeza/remoção de volume é parte deste procedimento.

Código antigo não desfaz schema novo. Em caso de falha, pare somente o web, preserve dump/logs privados e diagnostique; restauração ou roll-forward exigem decisão específica do operador. Não execute rollback destrutivo automático.
