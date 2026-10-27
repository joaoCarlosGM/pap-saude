# Homologação local P0 no WSL — segundo laboratório

Base: `8b81b486e29f603f082ac63e159d5621ecc4ff84`, CI [40509471057](https://github.com/joaoCarlosGM/pap-saude/actions/runs/40509471057) SUCCESS. Este patch acrescenta apenas o perfil local e seus guards/testes. Não é deploy nem aprovação de produção.

| Recurso | Perfil P0 | Laboratório anterior, preservado |
|---|---|---|
| Aplicação | `http://127.0.0.1:3200` | `http://127.0.0.1:3100` |
| PostgreSQL | `127.0.0.1:15433` | `127.0.0.1:15432` |
| Database | `pap_p0_acceptance` | `pap_admin_beta1_local` |
| Container | `pap-p0-acceptance-db` | `pap-admin-beta1-local-db` |
| Volume | `pap-p0-acceptance-data` | `pap-admin-beta1-local-data` |
| Diretório privado | `.local/pap-p0-acceptance` | `.local/pap-admin` |
| Marker | `pap-local-p0-acceptance` | `pap-local-admin-beta1` |
| Label | `pap.local=p0-acceptance` | `pap.local=admin-beta1` |

## Antes de abrir o navegador

Crie um **perfil separado de navegador**, por exemplo “PAP P0”, sem importar dados do perfil antigo. Cookies são compartilhados entre portas do mesmo host: uma nova aba em 3200 no navegador antigo não isola a sessão de 3100. Não clique no link do terminal se ele abrir o perfil antigo; copie o endereço para o perfil PAP P0. Para testar outros usuários, use outros perfis separados ou uma janela privada do perfil P0, fazendo logout entre identidades. Não visite o laboratório antigo nesses contextos.

Escolha e-mail de demonstração **diferente** do primeiro PAP_ADMIN anterior e senha nova. Ao cadastrar TOTP, adicione uma nova entrada no Authenticator; não substitua nem exclua a entrada anterior. Não copie config, chaves, bancos, volumes ou dados clínicos do laboratório antigo.

## Preparação única — clone novo no filesystem Linux

Pré-requisitos: WSL com Git, Node.js 22.23+ (linha 22), npm e Docker local/Docker Desktop integrado à distribuição. Não altere o daemon/contexto que mantém o laboratório anterior. O launcher rejeita endpoints Docker remotos e `.env*` no checkout. Não copie `.env.example` para `.env`.

O perfil está disponível na branch `codex/p0-local-acceptance`, derivada da base aprovada acima. Use um clone separado; não atualize o laboratório antigo.

Execute em **terminal WSL novo**, não no diretório `pap-saude-onboarding`:

```bash
set -euo pipefail
PAP_P0_DIR="$HOME/projetos/pap-saude-p0-acceptance"
test ! -e "$PAP_P0_DIR" || { echo "Destino existente: não repetir instalação inicial."; exit 1; }
mkdir -p "$HOME/projetos"
git clone --single-branch --branch codex/p0-local-acceptance https://github.com/joaoCarlosGM/pap-saude.git "$PAP_P0_DIR"
cd "$PAP_P0_DIR"
git switch -c test/p0-acceptance
unset DATABASE_URL NODE_ENV DOCKER_HOST RESEND_API_KEY RESEND_WEBHOOK_SECRET MFA_SECRET_ENCRYPTION_KEY MFA_SECRET_ENCRYPTION_KEY_ID
DATABASE_URL="postgresql://install_only:install_only@127.0.0.1:1/pap_install_only?schema=public" npm ci
```

A URL temporária da instalação satisfaz a configuração do Prisma sem apontar para banco acessível (porta1); não cria conta nem aplica migrations. Ela não é exportada para o launcher. Use a autenticação Git já configurada, sem tokens em argumentos. O clone e a instalação são exclusivos deste novo diretório; não compartilhe `node_modules` por symlink com o laboratório anterior. Não use `reset`, `pull`, rebase ou atualização na worktree antiga.

```bash
cd "$HOME/projetos/pap-saude-p0-acceptance" || exit 1
unset DATABASE_URL NODE_ENV DOCKER_HOST
npm run local:p0 -- init
npm run local:p0 -- start
npm run local:p0 -- migrate
npm run local:p0 -- admin
npm run local:p0 -- dev
```

`init` gera senha PostgreSQL e chave de criptografia MFA novas, em config privada 0600, e preserva bytes/segredos em chamadas seguintes. `start` aceita somente container/volume próprios, binding loopback15433 e volume local sem opções externas. Apenas volume próprio realmente vazio recebe o marker inicial; dados não reconhecidos são recusados.

`migrate` verifica URL, label/binding/mount/volume e `current_database()`/marker **antes** de gerar cliente, aplicar as migrations forward-only e inicializar IAM. `admin` pede e-mail/nome/senha em terminal interativo; não passe senha em argumentos. Só provisiona banco vazio; não redefine senha/MFA nem altera contas existentes. A aplicação só inicia após as verificações do banco selecionado.

Se já houver `.local/pap-admin` neste checkout, o perfil P0 recusa antes de criar arquivos ou acessar Docker. O inverso também é recusado. Se nomes/portas estiverem ocupados, houver volume com proprietário/marker desconhecido ou erro de guard, **pare**: não remova recursos, não regrave marker e não faça reset para contornar o bloqueio.

No Windows, entre na distribuição com `wsl -d Ubuntu` (ou o nome da sua distribuição) e execute os comandos acima dentro do WSL. Armazene o clone em `~/projetos`, não em `/mnt/c`, para manter permissões e funcionamento do Node.

## E-mails exclusivamente locais

Em outro terminal WSL no **novo checkout**:

```bash
cd "$HOME/projetos/pap-saude-p0-acceptance" || exit 1
unset DATABASE_URL NODE_ENV DOCKER_HOST
npm run local:p0 -- mail
npm run local:p0 -- mail 1
```

Troque `1` pelo índice desejado. O texto e HTML ficam em `.local/pap-p0-acceptance/mail`. A saída escolhida pode conter link privado de convite/recuperação: não compartilhe, versione nem anexe screenshots/HAR. Não faça envios reais. `Resend` permanece bloqueado pelo perfil/database, mesmo com flags de remetente e host forçadas. Captura significa **CAPTURED**, não confirmação de entrega externa.

## Interromper e retomar sem apagar dados

Para interromper, use `Ctrl+C` somente no terminal do **novo** `local:p0 -- dev`. Depois:

```bash
cd "$HOME/projetos/pap-saude-p0-acceptance" || exit 1
unset DATABASE_URL NODE_ENV DOCKER_HOST
npm run local:p0 -- stop
```

Para retomar:

```bash
cd "$HOME/projetos/pap-saude-p0-acceptance" || exit 1
unset DATABASE_URL NODE_ENV DOCKER_HOST
npm run local:p0 -- start
npm run local:p0 -- dev
```

Não repita `admin` na retomada; `migrate` só é necessário em instalação inicial ou após atualização aprovada com migrations novas. O volume e o arquivo privado devem permanecer juntos: perder a chave privada impede decifrar o MFA desse laboratório. Não há comando de reset/destruição neste roteiro. Não use `docker compose down`, prune, `wsl --shutdown`, remoção de volume ou comandos globais que afetem o laboratório antigo.

## Checklist manual — somente identidades e pacientes sintéticos

- [ ] **Login/MFA:** abra `http://127.0.0.1:3200/login` no perfil PAP P0; configure QR/TOTP real, confirme seis dígitos e guarde os códigos de recuperação em local privado deste laboratório. Logout/novo login deve pedir MFA para o Admin; reload não deve reabrir wizard concluído. Nunca capture QR, segredo, código ou cookie em evidências.
- [ ] **PAP Admin:** veja organizações, usuários, auditoria e indicadores reais/vazios. Acesso direto a `/dashboard`/APIs clínicas não pode conferir prontuários ao PAP_ADMIN sem concessão clínica explícita.
- [ ] **UBS:** crie município sintético (cidade/UF) em Organizações. Em contexto separado P0, solicite uma UBS em `/solicitar-adesao`. Analise em `/admin/solicitacoes`; diferencie aprovação institucional de ativação. Somente PAP_ADMIN deve ativar/desativar UBS explicitamente; não crie duplicata repetindo decisão.
- [ ] **Convites:** teste `/admin/convites` institucional e `/admin/convites-globais`. Pegue links na caixa local. Aceite global não deve autorizar operação automaticamente: confira espera/aprovação pelo papel originalmente consentido. Teste revogação, reenvio invalidando link anterior e negação de reutilização. PAP_MANAGER só delega COMMERCIAL próprio, sem ativar UBS.
- [ ] **Responsável/profissional:** convide HEALTH_UNIT_ADMIN da UBS e depois PROFESSIONAL conforme o fluxo institucional. Cada identidade usa senha escolhida pelo operador. Administradores precisam de MFA; mantenha a política existente do profissional. Vincule apenas à UBS sintética ativa.
- [ ] **Isolamento:** outro profissional/UBS sintética não deve obter prontuários da primeira UBS, inclusive por URL/API direta. COMMERCIAL usa somente `/comercial`/`/vitrine` demonstrativa; PAP_ADMIN/Manager não têm acesso clínico implícito.
- [ ] **Fluxo clínico:** como profissional autorizado, cadastre paciente fictícia (CPF pode ficar vazio) e gestação; salve `/registro` com sinais/dados obstétricos sintéticos. Confira persistência no histórico e atendimento **COMPLETED**. MEOWS permanece **DRAFT_UNVALIDATED**, sem score/alerta validado; isto não homologa algoritmo clínico.
- [ ] **Após finalização:** edição incompatível de sinais/dados obstétricos de atendimento concluído deve ser negada, com histórico preservado. Revisão deve aparecer como proposta **PROPOSED_NOT_APPLIED**, com autor/motivo e estado real anterior, sem alteração clínica silenciosa.
- [ ] **Idempotência:** no DevTools do perfil P0, preserve o POST `/api/clinical/registrations` de uma paciente fictícia. Reenvie a mesma requisição com o mesmo `idempotency-key` e payload (Copy as fetch, somente no console do laboratório3200); deve retornar `200`, `replayed: true` e os mesmos IDs, mantendo um único grafo. Payload diferente com a mesma chave deve dar `409`. Não copie cookies/payloads para chat/HAR ou execute snippets fora desta origem.
- [ ] **Interrupção:** simule offline/rede lenta somente na aba P0, tente salvar e retome; consulte/reenvie a operação pendente com os mesmos dados. “Novo Registro” deve confirmar cancelamento/barreira antes de trocar a operação; não deve duplicar atendimento. Não use uma nova chave manual para mascarar erro de retomada.
- [ ] **Persistência:** pare e retome somente P0; login e TOTP novos, pacientes sintéticos e histórico devem continuar válidos. Não abra nem altere o laboratório anterior para fazer essa checagem.

## Evidências e limites

Testes específicos deste patch: `node --test tests/local/policy.test.mjs tests/local/p0-profile.test.mjs` e `tsx --test tests/local/p0-profile-services.test.ts` com URL inicial de teste sem conexão. Exercitam CLI com Docker/PG simulados, guards reais de bootstrap com leitura mockada e captura local real em diretórios temporários; não são execução real de PostgreSQL ou do navegador do operador.

Migrations/bootstrap real, conta escolhida pelo operador e MFA/TOTP na instância3200 ficam **NOT RUN até esta homologação manual**. Nenhum laboratório foi iniciado pelo Codex. F03/F04 completas, Docker builds e scanners não foram repetidos; a evidência de base é o CI acima. O laboratório usa usuário PostgreSQL proprietário, conforme o launcher legado: não substitui a homologação de ACL/backup/infraestrutura do destino nem configura produção.
