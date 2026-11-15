# Homologação privada no WSL — candidata final

Este roteiro inicia **somente a Vitrine sintética de homologação**, com os mesmos componentes Premium e um adaptador PostgreSQL privado. Não é deploy, não substitui o PAP operacional e não autentica contas reais. Não executar no checkout/laboratório da porta3600 nem apontar DATABASE_URL para ele. Não copiar contas, dados, sessões, MFA ou segredos dos outros ambientes.

## Preparar um checkout separado

No WSL com Git, Node22.23+ compatível, npm e Docker/Compose disponíveis:

```bash
cd ~/projetos
git clone --branch feature/beta1-final-local-acceptance-rc --single-branch https://github.com/joaoCarlosGM/pap-saude.git pap-beta1-final-local
cd pap-beta1-final-local
git status --short
git rev-parse HEAD
npm ci
umask 077
mkdir -p .local
```

Use o SHA publicado no CHECKPOINT/relatório da entrega. Se essa pasta já existir, não a sobrescreva: reutilize apenas após conferir sua branch, HEAD e alterações, ou escolha outra pasta. O npm ci pertence exclusivamente ao novo checkout. Não há Prisma generate, db push, migrations operacionais ou seed de contas neste procedimento.

## Criar uma única vez o PostgreSQL exclusivo

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action create > .local/create.log
cat .local/create.log
export PAP_REVIEW_PROFILE="$(sed -n 's/^PROFILE=//p' .local/create.log)"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action status --profile "$PAP_REVIEW_PROFILE"
```

Guarde o caminho PROFILE. O launcher gera nomes `pap-id-review-<aleatório>`, volume próprio, senha/chave próprias e porta PostgreSQL aleatória publicada **apenas em127.0.0.1**. Valida labels do container e volume, host, porta e proprietário antes de conectar. Inicializa somente tabelas `review_*` e três pessoas sintéticas; não acessa Prisma ou o banco operacional. O schema privadov2 é aditivo. O perfil contém senha e chave AES das carteirinhas: mantenha `.local` privado, fora do Git e de screenshots.

## Iniciar a interface

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_REVIEW_PROFILE"
```

Abra a URL **PRESENTATION_ONLY** impressa pelo launcher, por exemplo `http://127.0.0.1:<porta-livre>/vitrine/pacientes`. A porta é escolhida livre, sem usar3100/3200/3300/3500/3600. Em PDFs privados, marque **Autorizar consulta local dos PDFs**: isso habilita também o registro e os documentos na mesma base própria. A consulta expira; renovar consentimento não redefine banco, identidade ou cartões. O servidor só escuta loopback. Câmera em localhost depende de permissão real; em celular use o roteiro HTTPS, não HTTP de IP de rede.

## Cadastro e emissão pelo terminal — mesma base da interface

É preferível cadastrar pela UI: **Pacientes → Cadastrar nova gestante**. O nome exige o prefixo `Gestante Sintética ` e o CPF de teste é gerado com prefixo98 e dígitos verificadores inválidos. Exige confirmação de dados sintéticos. Não inserir documento real.

Exemplo CLI, exclusivo desta base, sem token na saída:

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action register \
  --profile "$PAP_REVIEW_PROFILE" --name 'Gestante Sintética Homologacao' \
  --birth-date 1998-08-14 --document 98000000000 --synthetic
```

Copie o `review-UUID` retornado (não o nome) e use:

```bash
export PAP_REVIEW_PATIENT='review-UUID-RETORNADO'
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action issue \
  --profile "$PAP_REVIEW_PROFILE" --patient "$PAP_REVIEW_PATIENT"
```

A imagem fica em `.local/pap-id-review-*/carteirinha-*.png` e também criptografada na base, recuperável na aba Documentos. Não publicar nem compartilhar fora do teste. O documento98 acima é aceito apenas como inválido/sintético; se já usado com outra identidade, a duplicidade é recusada. Repetir com a mesma identidade retorna a mesma pessoa. Na UI, emissão, reemissão e revogação usam precisamente esse perfil; atualize a página após ações CLI. Reemissão revoga o QR anterior. A revogação pode ser feita na UI; CLI exige o `subject` correto da base privada.

## Parar e retomar sem perder dados

Ctrl+C no terminal da interface encerra somente essa fixture; não apaga dados.

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action stop --profile "$PAP_REVIEW_PROFILE"
# Em outra sessão, exporte novamente o caminho PROFILE já guardado; não execute create.
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PAP_REVIEW_PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PAP_REVIEW_PROFILE"
```

Use sempre `start` do launcher: Docker pode escolher outra porta dinâmica ao reiniciar; o launcher reconcilia a porta do recurso próprio. Não usar compose down, cleanup, prune ou remoção de volumes. Para um perfil **privado review** anteriorv1, parar sua interface, executar `--action upgrade --profile "$PAP_REVIEW_PROFILE"` uma vez, e retomar. Isso não autoriza upgrade do laboratório operacional.

## Atualização posterior segura

Pare somente a fixture própria. Confira árvore limpa e branch; use `git fetch origin` e `git pull --ff-only origin feature/beta1-final-local-acceptance-rc`. Se houver mudanças locais/divergência, pare e preserve-as. Só execute npm ci se lockfile/dependências mudaram. Nunca copiar `.local` para outro projeto nem executar resets/seed. Mantenha chave e banco do mesmo perfil para recuperar PNGs; perder a chave impede recuperação das imagens antigas. Faça cópia privada controlada do perfil/volume se necessário, nunca em Git.

## Evidência e limites

Siga CHECKLIST-FUNCIONAL/UX/SEGURANCA. Imagens de QR, CPF/RG, URLs privadas, código de pareamento e certificados/chaves não devem constar da evidência compartilhada. A demonstração não concede autorização clínica; MEOWS assistencial continua desativado. Os PDFs institucionais têm hashes verificados e acesso privado; distribuição pública e uso clínico aguardam aprovação humana.
