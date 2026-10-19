# PAP Admin Beta 1 — desenvolvimento local para teste manual

Base: develop integrada no merge `8ed7c14` (PR #2). Este procedimento não usa SSH,
VPS, compose de produção, credenciais reais de banco ou deploy. Use apenas pessoas,
UBS e contatos sintéticos. Não reutilize a senha de nenhuma conta real.

## Pré-requisitos e checkout Windows/WSL

Recomendado: Windows 10/11 + WSL2 Ubuntu, Docker Desktop em Linux containers com
integração habilitada para a distribuição WSL, Git e Node **22.23.3 ou superior
compatível** (CI usa Node 22). Execute Git, Node/npm e Docker no mesmo WSL, com o
checkout em `~/src`, evitando `/mnt/c` para preservar permissões e desempenho.

No PowerShell, com WSL/Docker Desktop instalados:

```powershell
wsl --list --verbose
wsl -d Ubuntu
```

No terminal Ubuntu/WSL, após instalar Node pela ferramenta aprovada pelo operador:

```bash
mkdir -p ~/src
cd ~/src
git clone --branch develop https://github.com/joaoCarlosGM/pap-saude.git pap-saude-local
cd pap-saude-local
# Até o PR deste procedimento ser integrado, use sua branch de revisão:
git fetch origin codex/pap-admin-local-dev
git switch --track origin/codex/pap-admin-local-dev
node --version
npm --version
docker version
docker context show
npm ci
```

Após merge humano deste PR, permanecer em `develop` atualizada basta. Não faça
merge/rebase automático de branches com alterações próprias para seguir o guia.

Também é possível executar os comandos `npm run local:*` em PowerShell nativo
com Node e Docker Desktop Linux containers. O launcher usa Node e Docker CLI, sem
Bash, sudo, curl ou scripts PowerShell de execução remota. Exemplo de checkout:

```powershell
Set-Location $env:USERPROFILE
git clone --branch develop https://github.com/joaoCarlosGM/pap-saude.git pap-saude-local
Set-Location pap-saude-local
git fetch origin codex/pap-admin-local-dev
git switch --track origin/codex/pap-admin-local-dev
npm ci
```

No Windows nativo, restrinja o diretório ao usuário na aba Segurança/ACL do Windows;
modos POSIX 0600/0700 não substituem ACLs NTFS. O fluxo nativo foi preparado por
portabilidade, mas não executado em Windows nesta validação Linux; homologar esse
passo no equipamento do operador. Não compartilhe o checkout por pasta de rede.

## Inicializar o laboratório

Os mesmos comandos funcionam em WSL e PowerShell:

```text
npm run local:init
npm run local:start
npm run local:migrate
npm run local:admin
npm run local:dev
```

`local:init` cria `.local/pap-admin/config.json` privado e excluído tanto do Git quanto do contexto Docker (incluindo capturas e tokens). Gera
uma senha aleatória **do PostgreSQL local** e uma chave persistente de criptografia
MFA. Não imprime esses valores nem cria conta da aplicação. Não apague a chave
para contornar MFA: fatores existentes precisam dela para serem descriptografados.

`local:start` cria apenas:

| Recurso | Valor fixo |
|---|---|
| Container | `pap-admin-beta1-local-db` |
| Volume | `pap-admin-beta1-local-data` |
| Label de propriedade | `pap.local=admin-beta1` |
| Endpoint DB | `127.0.0.1:15432` |
| Database | `pap_admin_beta1_local` |
| Marker do database | `pap-local-admin-beta1` |
| Aplicação | `http://127.0.0.1:3100` |

A porta 15432 não conflita com o banco 5432 dos harnesses F03/F04. O serviço aceita
conexões somente por loopback. O launcher recusa Docker por SSH/TCP, recursos com
nomes ocupados sem a label correta, bind de porta/volume divergente, DATABASE_URL
herdada divergente, bancos sem marker e execução com NODE_ENV=production. Não há
comando de reset, drop de database, remoção de volume ou alteração de banco remoto.
Se a primeira execução for interrompida após criar o volume ou antes de iniciar o
container, repita `npm run local:start`. A recuperação valida a propriedade de
ambos os recursos, o contrato do container, o volume local sem opções e a ausência
de outros containers consumidores. Uma inspeção somente leitura, sem rede nem
entrypoint PostgreSQL, comprova que o volume está vazio antes de permitir o
marcador inicial. A existência anterior do volume não impede essa recuperação.

Volumes não vazios nunca recebem automaticamente o marcador. Dados sem
`PG_VERSION` são recusados antes de iniciar PostgreSQL; um cluster inicializado
sem o marcador válido também é recusado na verificação, sem apagar dados nem
reescrever comentários. Isso inclui interrupção durante `initdb` ou entre a
inicialização do cluster e o marcador: exige inspeção manual do laboratório pelo
operador, em vez de reset ou adoção automática. A recuperação não altera senhas,
chaves MFA, migrations ou registros existentes.

O papel PostgreSQL do laboratório é proprietário/superuser do cluster isolado;
não use isso como modelo de permissões de produção.

**Não criar/copiar `.env`, `.env.local`, `.env.development*` ou `.env.production*`
neste checkout.** O launcher os recusa em vez de importar ou modificar configurações
preexistentes. Se houver algum, use outro clone limpo. Remova DATABASE_URL e
DOCKER_HOST herdados do terminal antes de iniciar, após conferir sua origem; não
copie valores da VPS. Não execute o docker-compose.yml legado para este fluxo.

`local:migrate` verifica container/endpoint/marker, gera Prisma, aplica todas as
migrations históricas forward-only e faz bootstrap IAM idempotente. Pode repetir:

```text
npm run local:migrate
```

Não usa `db push`, `migrate reset`, truncate ou fixtures de demonstração em tabelas
reais. As configurações necessárias são passadas somente aos processos filhos.

## Primeiro PAP_ADMIN: credenciais do operador

`npm run local:admin` solicita interativamente e-mail, nome e senha (mínimo 12
caracteres), com confirmação e entrada oculta da senha. Não passe senha em
argumentos, URLs, arquivos do Git ou scripts. A senha de aplicação não fica no
config.json: somente hash Argon2id no banco local. Não existe login/senha padrão.

O provisionamento exige banco de aplicação vazio (sem usuários/organizações), cria
a raiz PAP ativa e atribui PAP_ADMIN **GLOBAL**, sem membership nem acesso clínico.
Não cria fator MFA, sessão autenticada ou evidência MFA falsa. Recusa repetir a
operação para redefinir conta existente, inclusive se o e-mail informado coincidir.
Não use fixtures de testes para entrar no ambiente manual.

## Configurar MFA real pelo navegador

1. Com `local:dev` ativo, abra **http://127.0.0.1:3100/login** e entre com as
   credenciais definidas no terminal. Use sempre 127.0.0.1, sem alternar para
   localhost, para manter cookies e política de origem consistentes.
2. A sessão inicial pode abrir o próprio contexto e **Minha segurança**, mas
   operações administrativas retornarão `ADMIN_MFA_REQUIRED` até confirmar MFA e
   fazer novo login. Esse bloqueio é esperado; não remova o guard.
3. Em `/admin/minha-seguranca`, informe a senha e inicie a configuração MFA.
   Cadastre o segredo/URI `otpauth` apresentado em um autenticador TOTP real.
   Se não houver QR renderizado, use a opção de chave de configuração manual do
   autenticador. Não fotografe nem envie o segredo para terceiros.
4. Confirme com o código atual de seis dígitos. Gere e guarde códigos de recuperação
   pelo fluxo da própria conta quando disponível, reautenticando conforme a tela.
5. Em Minha segurança, use **Encerrar todas as sessões** com senha e um novo código TOTP (se o código da confirmação já foi consumido, aguarde o próximo). Faça novo login: senha → TOTP. A sessão primária anterior
   não é promovida automaticamente. Agora organizações, solicitações e convites
   devem estar acessíveis segundo IAM. Relógios do computador/celular devem estar
   sincronizados; TOTP usa tempo absoluto, independentemente do fuso da tela.

Nenhum provisionador pré-configura/contorna o segundo fator. Perder a chave privada
de criptografia e o autenticador não deve ser “corrigido” editando prova de sessão
ou desabilitando MFA no código. Use recuperação legítima ou outro laboratório vazio.

## Jornada institucional completa, sem envio real

1. Com PAP Admin autenticado por MFA, em **Organizações**, cadastre e ative o
   município sob a raiz PAP. Preencha **Cidade e UF**, que precisam coincidir com
   os campos da futura solicitação. Exemplo sintético à escolha do operador;
   não precisa existir município real. Não crie manualmente a UBS desta jornada.
2. Em janela anônima, abra `/solicitar-adesao`, informe UBS e responsável sintéticos,
   cidade/UF correspondentes, endereço, contato e consentimento. CNES/CNPJ são
   opcionais; se informar, respeite formato e unicidade. Não use dados clínicos.
3. Como PAP Admin, abra **Solicitações**, confira detalhes, selecione o município,
   escreva o motivo e aprove. Confirme a ação. A UBS deve ser criada uma só vez e
   ativada no município correto; repetir a solicitação não deve duplicá-la.
4. Em **Convites**, selecione a UBS e envie convite ao responsável aprovado.
   O modo é **DEVELOPMENT**, não SENT/DELIVERED. Nenhuma chamada ao Resend ocorre.
5. Em outro terminal no mesmo checkout:

   ```text
   npm run local:mail
   npm run local:mail -- 1
   ```

   O primeiro comando lista mensagens privadas; o segundo mostra o texto e o link
   da mensagem escolhida (troque o número conforme a lista). Também informa o
   caminho do HTML institucional. No WSL, pode abrir a pasta privada pelo Explorer
   com `explorer.exe .local/pap-admin/mail` e abrir o HTML no navegador. Os arquivos
   contêm tokens: não os versione, publique, anexe ao PR nem envie como e-mail real.
6. Abra o link da mensagem em janela anônima, ative a identidade com uma senha à
   escolha e faça login como responsável. Configure MFA real e entre novamente,
   da mesma forma que o PAP Admin. O papel será HEALTH_UNIT_ADMIN scoped à UBS.
7. Como responsável, convide um profissional na própria UBS. Consulte a caixa local,
   abra o novo link em outra janela/perfil e aceite. Confira o papel PROFESSIONAL
   e ausência de acesso a outra UBS. Profissional sem papel administrativo usa o
   fluxo clínico/autorizado existente, sem receber PAP_ADMIN por convite.
8. Teste reenviar (link anterior perde validade), revogar, aceitar duas vezes,
   submissão duplicada, tentativa de outro município e bloqueio sem MFA. Consulte
   auditoria e dashboard. UBS nova sem profissionais ativos/eventos pode mostrar
   NO_DATA ou amostra insuficiente; não são estatísticas simuladas.

A caixa local registra HTML/texto e links de **convites** exclusivamente. Ela não
comprova inbox, SPF/DKIM/DMARC, DNS ou entrega real. Recuperação de senha por e-mail
permanece indisponível neste laboratório, em vez de usar Resend; códigos de
recuperação MFA continuam pelo mecanismo real da conta. O launcher zera as
configurações Resend no processo local e não lê arquivos .env.

## Parar, retomar e solucionar problemas

Pare Next com Ctrl+C. Em outro terminal:

```text
npm run local:stop
npm run local:start
npm run local:dev
```

`stop` preserva volume, usuários, MFA e chave privada. Não rode `local:admin` de novo
para “redefinir” senha. Não há limpeza destrutiva automática. Se 15432 ou 3100
estiver ocupada, identifique o processo antes de parar qualquer serviço; o launcher
não escolhe portas ou destinos alternativos. Se marker/label/config não coincidirem,
interrompa e investigue; não aponte DATABASE_URL a outro banco para passar o guard.

No WSL, confirme que Docker Desktop está aberto, a integração WSL habilitada e o
contexto usa socket local. O procedimento não inicia Docker via SSH. Execute `npm
ci` na distribuição onde Node roda (não reutilize node_modules de Windows no WSL).
Erros de sessão/MFA: use mesma origem 127.0.0.1, saia/entre após confirmar o fator,
verifique relógio e chave persistente. Não desligue MFA/IAM para testar.

## Validação e limites

`npm run test:local-dev` executa política de destinos e smoke completo em diretório
privado temporário, com container/volume exclusivos de teste e cleanup ao final.
**Recusa executar se os nomes do laboratório já existirem**, para não destruir o
ambiente manual do operador. O harness de testes usa Linux/WSL e symlinks; o
launcher de uso manual não depende deles. Ele testa provisionamento, senha hash,
negação de sobrescrita, MFA inicial via HTTP, solicitação/aprovação, convites de
responsável/profissional e captura sem rede. Nenhuma credencial de teste é fixa.

Executados nesta implementação em Linux com Docker: inicialização real, 29
migrations, replay sem pendências, bootstrap IAM idempotente, testes de política e
smoke, TypeScript/lint e regressão Beta. Resultados finais de CI e demais checks
são registrados no PR. Windows nativo, Docker Desktop/WSL do operador e leitura
real do TOTP pelo aparelho dependem de validação no equipamento local. Não foi
executado deploy nem qualquer comando contra a VPS. Este laboratório não homologa
produção, entregabilidade de e-mail, infraestrutura ou privilégios de produção.
