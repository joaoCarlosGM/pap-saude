# P0 Premium operacional — Runbook do laboratório local persistente

**Estado:** procedimentos para usar **após** o Codex implementar e testar o novo perfil `p0-full-local`; no commit de documentação inicial o perfil ainda não existe. Não tentar executar agora os comandos `--profile=p0-full-local` como se o laboratório estivesse pronto.

## 1. Qual é o ambiente final?

- Um único PAP Saúde Next.js em `http://127.0.0.1:3600` oferece `/login`, `/admin/*`, `/dashboard`, `/registro`, `/pacientes`, `/atendimentos`, `/comercial`, `/vitrine/*`, segurança e MFA.
- PostgreSQL **persistente**, no banco exclusivo `pap_p0_full_local`, loopback `127.0.0.1:15434`, Docker local, volume exclusivo `pap-p0-full-local-data`. Ao encerrar o Next e reiniciá-lo, dados continuam.
- `PAP_EMAIL_PROVIDER=local-demo`: e-mails de teste ficam privados em `.local/pap-p0-full-local/mail`, sem enviar para destinatários externos. Links apontam para `127.0.0.1:3600`.
- Laboratórios antigos: Admin 3100/DB15432, P0 3200/DB15433, original prod preview 3300, premium preview 3400, integração descartável 3500 **não modificados**.
- Cadastro de usuário/organização fictícios para homologação **usa os fluxos de autorização do P0**, não `DemoProvider` nem APIs mock. Dados clínicos inseridos em DB de laboratório de teste são persistidos, mas não são registros assistenciais legítimos.

## 2. Preparar checkout novo, sem tocar no original

**Somente quando a branch tiver código e testes aprovados:**

```bash
cd ~/projetos
git clone --single-branch --branch feature/p0-premium-operational-local https://github.com/joaoCarlosGM/pap-saude.git pap-saude-full-local
cd pap-saude-full-local
git rev-parse HEAD
git status --short
node --version
docker context show
docker version
```

Conferir SHA publicado do fim da missão, não usar automaticamente o commit somente documental atual. O launcher recusa contextos remotos Docker e `.env` locais conflitantes. Não copiar `.local`, `config.json`, `postgres.env`, senhas, MFA, banco ou secrets do laboratório 3200, Admin3100, preview3500, VPS ou `pap-saude-prod-preview`.

Verificar requisitos de Node; o operador relatou Node `v22.23.2`, enquanto o documento P0 recomenda `v22.23.3+`. Atualizar a versão local conforme lockfile/CI antes do aceite, sem mexer em ambientes remotos.

## 3. Provisionar novo laboratório, em etapas

**Estes comandos são o CONTRATO desejado da implementação do novo perfil. Só rodá-los depois dos testes do perfil passarem; sem perfil implementado, serão recusados:**

```bash
npm ci
npm run local:init -- --profile=p0-full-local
npm run local:start -- --profile=p0-full-local
npm run local:migrate -- --profile=p0-full-local
npm run local:admin -- --profile=p0-full-local
npm run local:dev -- --profile=p0-full-local
```

`local:init` cria config e chave MFA novas exclusivamente no checkout; `local:start` valida Docker/marker/volume; `local:migrate` só aplica migrações para o banco novo; `local:admin` solicita credenciais de PAP_ADMIN local em TTY, sem imprimi-las; `local:dev` usa o banco persistente próprio. Não executar `migrate reset`, `db push`, `local:init` no checkout 3200 nem scripts de reset antigos.

Se a implementação recomendar adicionar um alias `npm run local:full`, ele deve apenas chamar `node scripts/local/dev.mjs dev --profile=p0-full-local`; alias só após testes. Não utilizar `run-integration.mjs --preview` nesta entrega.

## 4. Primeira entrada, papéis e dados

1. Abrir `http://127.0.0.1:3600/login`.
2. Entrar com a conta PAP_ADMIN **local nova** criada interativamente; concluir primeiro acesso/inscrição MFA do P0. Guardar sua entrada TOTP local distinta da usada no 3200.
3. Abrir `/admin`, conferir instituições, pendências, usuários, segurança, filtros e métricas. Inicialmente podem estar vazios; nunca preenchê-los com valores inventados na UI.
4. Para testar `/dashboard` real, configurar no DB de laboratório **uma UBS sintética**, um profissional de teste e vínculo HEALTH_UNIT ativo com permissões adequadas via operações legítimas do Admin P0. Admin puro não pode abrir prontuário. Opcionalmente atribuir ambos os papéis ao mesmo usuário sintético por procedimento auditado autorizado.
5. Entrar como profissional autorizado. Abrir `/dashboard`, `/registro`, `/pacientes`, `/atendimentos`, criando cenário *fictício* por interfaces/serviços reais. Conferir persistência e classificação MEOWS operacional como não validada.
6. Para `/vitrine`, utilizar uma conta COMMERCIAL explicitamente autorizada. A calculadora demo e seus registros permanecem somente em memória. Não tratar a Vitrine como parte de prontuário real.

## 5. E-mails locais

Com o servidor que usa `p0-full-local` ativo, mensagens de recuperação, convite e notificações capturadas podem ser listadas pelo checkout **desse** laboratório:

```bash
npm run local:mail -- --profile=p0-full-local
npm run local:mail -- --profile=p0-full-local 1
```

O primeiro comando lista destinatário/assunto; o segundo exibe a mensagem e caminho local do HTML. Não compartilhar capturas contendo links de convite, reset ou tokens; arquivos privados são excluídos de Git.

## 6. Encerrar e iniciar novamente

- `Ctrl+C` encerra o servidor Next local 3600, **não apaga o volume do banco**.
- `npm run local:stop -- --profile=p0-full-local` pode parar somente seu container após validações de propriedade, preservando volume, dados e chave MFA, como no contrato atual de `local:stop`.
- Em outro dia, na mesma pasta: `npm run local:start -- --profile=p0-full-local` seguido de `npm run local:dev -- --profile=p0-full-local`. Não repetir `local:init`/`local:admin` para 'recuperar' um login.
- Migrations são aplicadas apenas quando necessário e mediante revisão; nenhum reset destrutivo.

## 7. Verificações antes de declarar pronto

```bash
git rev-parse HEAD
git status --short
docker ps --filter 'label=pap.local=p0-full-local'
ss -ltnp 'sport = :3600'
ss -ltnp 'sport = :15434'
```

Listar todos os dados reais de teste somente pelo backend/UX autorizados, não publicar `docker inspect` com credenciais. A suíte de aceitação deve incluir comparação dos fingerprints de recursos 3100/3200 antes/depois, sem tocá-los.

## 8. Promoção futura

Após aceite no 3600 e `npm run build` PASS, operador pode decidir posteriormente se este laboratório substitui o antigo 3200 ou se uma branch PR será integrada em ambiente de homologação. Essa decisão exige plano de backup, rollback, conferência de schemas, SMTP/local mail, guards, diffs e autorização explícita. **Nenhuma alteração na VPS ou `prod` ocorre aqui.**

## 9. Motivo da mudança

Uma conta e banco descartáveis de preview 3500 permitem validar a Vitrine, mas não demonstram um produto administrativo + clínico local persistente. O P0 completo tem Admin, clínica e MFA existentes e exige adaptação Premium dos shells reais. Esse runbook é o ponto de partida para uma **única instalação operacional local**, não outra demo isolada.
