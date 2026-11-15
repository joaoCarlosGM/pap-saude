# Homologação privada pós-ajustes — WSL

Somente pacientes sintéticas. Este é um laboratório novo da Vitrine, não atualização do P0
persistente. Não executar comandos no checkout/laboratório da porta 3600, não copiar .env,
credenciais, sessões, chaves MFA, volumes ou dados do operador. Não publicar esta fixture.
Requer WSL2, Node compatível com package.json, Docker Desktop integrado ao WSL e Compose v2.

## Obter a candidata sem publicar

A entrega permanece em branch local de correções. O bundle fornecido contém somente os commits
novos; importar em um repositório que já contenha a base `a953ca7`. Substituir o caminho do bundle
pelo arquivo baixado no Windows. Conferir HEAD/estado antes de qualquer operação.

```bash
cd /caminho/da/sua/copia/pap-saude
git status --short
git fetch origin feature/beta1-pap-id-protocols-integrated-rc
git bundle verify /mnt/c/Users/SEU_USUARIO/Downloads/pap-beta1-pos-homologacao.bundle
git fetch /mnt/c/Users/SEU_USUARIO/Downloads/pap-beta1-pos-homologacao.bundle \
  feature/beta1-post-homologation-fixes
git worktree add -b test/beta1-post-homologation \
  ../pap-beta1-post-homologation FETCH_HEAD
cd ../pap-beta1-post-homologation
npm ci
```

Se a worktree/branch já existir, não recriar nem sobrescrever. Retomar o diretório existente
após conferir SHA e alterações locais. Não usar reset, clean ou git add .

## Criar exclusivamente o banco novo

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action create
```

O comando gera `.local/pap-id-review-XXXXXX/profile.json` e `compose.json`, ambos privados.
**Anotar o caminho PROFILE impresso** e atribuí-lo sem abrir/imprimir o JSON:

```bash
PROFILE="$PWD/.local/pap-id-review-XXXXXX/profile.json"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action status --profile "$PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PROFILE"
```

Abrir no Chrome/Edge do Windows a URL loopback impressa. A porta da UI e a porta do PostgreSQL
são alocadas automaticamente; não há bind 0.0.0.0 nem uso das portas 3600/15436/5432.
O banco `pap_id_review_<aleatório>`, o container `pap-id-review-<aleatório>-db` e o volume
`pap-id-review-<aleatório>-data` são próprios. Senha nova gerada localmente; não reutilizada.
O adaptador valida nome/porta, labels do container e volume, mount e proprietário do banco.
A inicialização usa somente três tabelas e um índice de TESTE nesse banco novo, sem Prisma migrate,
db push ou alterações das migrations operacionais. Somente as três pessoas do catálogo sintético
já existente são provisionadas, sem contas de autenticação ou MFA.

Na interface, expandir **PDFs privados** e autorizar a consulta privada. Esse consentimento local
habilita os documentos e, se o banco próprio estiver disponível, o emissor. Não é sessão clínica,
nem substitui MFA/IAM. Nenhum endpoint de homologação existe no build da aplicação operacional.
Ausência do banco não é disfarçada como persistência: as ações de emissão ficam indisponíveis.

## Roteiro de aceite

1. Em **Pacientes**, emitir carteirinha PAP-ID para uma pessoa sintética do catálogo inicial.
   Confirmar, visualizar e baixar o PNG. O QR não contém nome/CPF/CNS nem informações clínicas.
   O cartão de TESTE mostra os documentos fictícios para a conferência manual. Não publicar o PNG.
2. Emitir para uma segunda pessoa. Em **Registro**, enviar os dois PNGs juntos ou sucessivamente.
   Conferir o contador, remoção e ausência de duplicatas; selecionar explicitamente uma pessoa.
3. Somente após a seleção, confirmar CPF **ou** RG fictício com UF/emissor e contexto de teste.
   Documento da outra pessoa deve falhar; nenhum resumo/prontuário deve aparecer antes da confirmação.
   Conferir os estados no celular e desktop, foco e botões. Nunca inserir dados reais.
4. Abrir prontuário sintético ou iniciar atendimento nas mesmas cinco etapas. Os atendimentos da
   Vitrine continuam em memória; não são gravados em banco clínico e não há MEOWS assistencial.
5. Reemitir o cartão em Pacientes. O anterior deve ser recusado; o novo deve resolver para a mesma
   pessoa, sem duplicar cadastro. Revogar e confirmar recusa da credencial. O histórico fica no DB.
6. Recarregar a UI e conferir emissão/histórico. Encerrar a UI com Ctrl+C e executar novamente
   `serve` com o mesmo PROFILE; reautorizar a consulta privada após novo processo.
7. Repetir emissão pelo terminal **na mesma base**, enquanto a UI permanece aberta:

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts \
  --action issue --profile "$PROFILE" --patient maria-gracas
```

   O terminal imprime somente o caminho do PNG privado e metadados seguros. Ler esse PNG na UI.
   Não usar o antigo `pap-id:demo` neste roteiro: aquele emissor legado é baseado em manifesto,
   não grava PostgreSQL. A emissão do novo perfil usa o mesmo serviço SQL transacional da UI.
8. Em Protocolos, conferir os três resumos com citações; abrir Fluxograma e sua figura original,
   Checklist com transcrições/adaptações identificadas e Documento original. Zoom, páginas e
   download permanecem privados. **Voltar aos protocolos** deve retornar à biblioteca, inclusive
   sem sidebar; pesquisa/filtros são mantidos enquanto a página compartilhada permanecer montada.
9. Cursos/Chat continuam Em breve; acesso direto permanece indisponível. Nenhuma API clínica é chamada.

## Interromper e retomar sem apagar

Ctrl+C encerra somente a UI iniciada por `serve`. O PostgreSQL permanece disponível.

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action stop --profile "$PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action status --profile "$PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action start --profile "$PROFILE"
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve --profile "$PROFILE"
```

`start` retoma somente o container com propriedade comprovada, sem reconstrução/recriação.
A porta efetiva é atualizada no perfil após retomada; volume/credenciais/identidades são preservados.
Não executar docker compose down, prune, rm genérico ou comandos contra outros projetos.
Se recursos estiverem ausentes ou divergentes, o launcher recusa recuperação automática.

## Testes dirigidos (somente neste perfil)

```bash
PAP_ID_REVIEW_PROFILE="$PROFILE" ./node_modules/.bin/tsx --test tests/pap-id/database.test.mts
PAP_ID_REVIEW_PROFILE="$PROFILE" npm run test:pap-id:browser
```

A suíte DB executa stop/start do SEU perfil descartável e testa persistência. Não usá-la em
qualquer banco existente. Browser usa uma única instância própria/portas livres e um worker.

## Limpeza opcional — destrutiva somente para este perfil

Não necessária para interromper/retomar. Após decisão explícita de descartar os dados sintéticos,
substituir o nome abaixo pelo project exato impresso por `status`:

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action cleanup \
  --profile "$PROFILE" --confirm pap-id-review-IDENTIFICADOR_EXATO
```

A ferramenta confere nome/labels/mount/proprietário e recusa confirmação incorreta. Remove apenas
o container e volume próprios; mantém os arquivos privados do perfil/cartões e a rede Compose
inerte. Nunca reutilizar esses segredos em outro ambiente. Direitos de distribuição dos PDFs e
aprovação clínica permanecem pendentes; nenhuma publicação ou implantação está autorizada.
