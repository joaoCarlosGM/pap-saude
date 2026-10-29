# Homologação local persistente — sistema integral

Use uma pasta nova e um **perfil de navegador separado**: cookies de 127.0.0.1 não são isolados por porta. Não atualizar o checkout antigo, copiar `.env`, chaves MFA, banco, cookies ou volumes. Não usar pap-saude-prod-preview.

## Preparação no Windows/WSL

Docker Desktop/WSL com daemon local, Node22 compatível com o projeto, npm e espaço livre suficiente. Nunca selecionar contexto Docker remoto.

```bash
cd ~/projetos
git clone --single-branch --branch feature/p0-premium-unified-rc https://github.com/joaoCarlosGM/pap-saude.git pap-saude-p0-unified-rc
cd pap-saude-p0-unified-rc
git rev-parse HEAD
npm ci
ss -ltnp 'sport = :3600 or sport = :15436'
docker context show
docker system df
```

Se alguma porta estiver ocupada ou o contexto não for local, parar e identificar a propriedade. Não encerrar outro laboratório nem executar prune. Não sobrescrever uma pasta existente. npm ci é para esta cópia nova do operador; dependências não foram reinstaladas na worktree de desenvolvimento.

## Opt-in explícito para criar exclusivamente o laboratório novo

```bash
npm run local:unified -- init
npm run local:unified -- start
npm run local:unified -- migrate
npm run local:unified -- seed
npm run local:unified -- dev
```

Abrir http://127.0.0.1:3600/login. Este é o sistema operacional integral, não o launcher da Vitrine.

O perfil fixa web3600, PostgreSQL15436, DB pap_p0_unified_rc, usuário pap_unified, container pap-p0-unified-rc-db, volume pap-p0-unified-rc-data, label pap.local=p0-unified-rc e comentário de DB pap-local-p0-unified-rc. Recursos sem propriedade ou checkout misturado com outro `.local` são recusados. Migrations só após checagem de container, volume, URL e marker.

Chaves e credenciais novas ficam em `.local/pap-p0-unified-rc`, com diretórios0700 e arquivos0600, fora do Git e contexto Docker. Leia `seed-accounts.json` **somente localmente**, sem colar seu conteúdo em relatórios/chat. Sete contas distintas, senhas aleatórias e nenhum fator MFA pré-configurado. Cada conta cadastra seu próprio autenticador pelo fluxo normal. Nenhuma entrada antiga do autenticador deve ser apagada.

A fixture só aceita este perfil local identificado, exige banco novo vazio e registra auditoria. Uma transação cria duas instituições municipais/UBS, sete contas e três pacientes/gestações/atendimentos inteiramente sintéticos, com proveniência. Replay preserva credenciais e dados, e nunca atualiza uma conta preexistente desconhecida. Se provisionar manualmente o primeiro Admin com `local:admin`, o seed de banco vazio será recusado: nesse caso cadastrar os demais dados pelos fluxos institucionais reais.

## Correio local, sem envio externo

Em outro terminal, na mesma pasta:

```bash
npm run local:mail -- --profile=p0-unified-rc
npm run local:mail -- --profile=p0-unified-rc 1
```

O primeiro comando lista destinatário/assunto; o segundo mostra o texto/link privado da primeira mensagem ao operador. **Não compartilhar essa saída**, pois pode conter token de convite/reset. A captura usa arquivos privados locais e Resend permanece bloqueado mesmo que alguém herde flags de remetente público. A confirmação local não significa entrega externa.

## Parar e retomar sem apagar dados

Ctrl+C no terminal web. Depois:

```bash
npm run local:unified -- stop
npm run local:unified -- start
npm run local:unified -- dev
```

Não repetir admin, seed, migrations ou gerar chaves para simplesmente retomar. Volume e configuração permanecem. Não há comando reset/remove neste roteiro. A retomada persistente ainda exige evidência real no ambiente do operador: a tentativa de criação do volume novo neste executor foi bloqueada por falta de espaço no armazenamento Docker; não foi substituída por um teste tmpfs apresentado como persistência.

## Aceite manual

1. Admin: login/CAPTCHA, QR/MFA real, novo login; conferir identidade/vínculos e Central Administrativa Premium. Navegar rede, pessoas, acessos, pendências, convites, auditoria, métricas, segurança e inbox.
2. Solicitação de UBS → análise → ativação por PAP_ADMIN. Gerente não pode ativar/excluir UBS ou nomear gerente/Admin. Convite aceito não significa autorização nem UBS ativada.
3. Emitir convite com e-mail sintético, ler somente na captura local, aceitar em outro perfil de navegador, autorizar papel originalmente consentido e conferir notificação persistente.
4. Profissional: MFA próprio; Dashboard com quatro KPIs reais da sua UBS. Registro completo → salvar → Pacientes → ficha → Atendimentos → Dashboard. Sem classificação MEOWS assistencial. Anotar IDs apenas no caderno privado do laboratório.
5. F5 e logout/login preservam os dados. Parar web/DB, retomar e comparar os mesmos registros/contagens. Essa etapa é obrigatória e ainda não tem PASS neste executor.
6. Repetição após resposta perdida não duplica o grafo clínico. Atendimento concluído recusa novas escritas incompatíveis. Revogação de papel/vínculo bloqueia o próximo acesso, inclusive por URL/API direta.
7. Profissional de outra UBS não lê o registro. Admin-only e Comercial-only não leem clínica. Comercial usa /comercial e /vitrine sintética independente.
8. Testar320/375/390/430/768/1440, Tab/Enter/Escape, foco, movimento reduzido e modo escuro. Recursos ainda indisponíveis não devem parecer serviços funcionais.

## Limite do laboratório de desenvolvimento

O launcher permanece deliberadamente NODE_ENV=development para correio local seguro. Build/start/standalone de produção são verificados separadamente em infraestrutura descartável; isto não transforma o usuário de bootstrap do laboratório em um papel SQL de runtime mínimo de produção. Na VPS é obrigatório separar migrator/runtime e validar ACL e secrets próprios.
