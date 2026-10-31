# Correção dirigida — publicação GHCR tools

Base: `655d25287d14a3af465d0689419fc0ba3038f5f3`.
Branch: `feature/admin-beta-isolated-deployment`.
Falha de referência: [41144321677](https://github.com/joaoCarlosGM/pap-saude/actions/runs/41144321677).

## Evidência e limite da investigação

- O operador confirmou `error from registry: denied` no push de tools. O job tinha
  `packages: write`; web/migrator foram publicados após aprovação de todos os gates.
- O builder já inclui o rótulo `org.opencontainers.image.source` correto nas três imagens.
  Não é necessário ampliar permissões do workflow ou usar PAT.
- Consulta pública somente leitura: tools existe, sem tags; seu único manifest
  `sha256:32d6660b6f7ea2633cd52a46f28610912c945d2374f23c988fbd41bb5cd10bd8`
  é uma attestation SLSA v1, architecture/os `unknown/unknown`, config167 bytes, sem source label.
  Isso comprova publicação incompleta; não é uma imagem executável aprovada.
- A ACL privada/Manage Actions access não pôde ser lida/alterada: API autenticada retornou
  Forbidden nesta sessão. A associação visual ao repositório não comprova acesso Actions Write.
  A causa exata da ACL requer conferência do operador ou resultado autenticado no novo CI.
- `HEAD` de tag inexistente retornando404 só comprovava ausência, não permissão de push.
  O publisher anterior deixava essa verificação de escrita para depois das outras imagens.

## Correção estritamente de publicação

O publisher mantém o GITHUB_TOKEN e a permissão packages:write existentes. Depois de verificar
que as três novas tags SHA estão ausentes, testa o escopo de escrita **somente tools**:
POST inicia upload vazio; Location é validada contra o mesmo host/pacote; DELETE cancela
exclusivamente esse upload. Nenhum manifest/tag é criado nesse teste. Exige202 e204;
401/403 e respostas ambíguas abortam antes de qualquer push.

Não há envio de bearer para outro host, redirect, cancelamento de recursos alheios ou
alteração de ACL por código. Mensagens públicas incluem apenas pacote/fase/código/status;
saída bruta de push com falha fica privada0600. Negação posterior permanece FAIL.

A correção não concede uma permissão GHCR ausente. Se o pacote recusar o token, o operador
precisa abrir [Settings do pacote tools](https://github.com/users/joaoCarlosGM/packages/container/package/pap-saude-admin-beta-tools/settings),
conectar `joaoCarlosGM/pap-saude` quando necessário e conceder **Write** em **Manage Actions access**
(ou conferir a herança efetiva do repositório). Não ampliar permissões de outros pacotes,
não introduzir PAT, não apagar o pacote e não mudar sua visibilidade para contornar a ACL.
Referência: [GitHub Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

O novo commit produz referências `:sha-<novo SHA40>` nas três imagens. As tags655d252 já
publicadas e o artefato parcial tools são preservados. O CI completo continua obrigatório,
com todos os gates anteriores intactos e um novo teste dirigido de publicação.
Nenhuma nova tentativa usa ou sobrescreve tags imutáveis anteriores.

## Validação e inventário

- `node --test tests/admin-beta-deployment/publish.test.mjs`: **PASS 5/5**, zero skip.
  Casos: upload/cancelamento próprios;401/403; estados ambíguos; Location não confiável;
  cancelamento recusado e diagnóstico sem conteúdo privado.
- ESLint de publisher/teste novo: **PASS**.
- `git diff --check`: **PASS**.
- Testes aprovados de policy/deployment/HTTP/RSC/MFA/migrations/backup/restart: **inalterados**.
- Novo CI completo: consultar execução deste novo commit na branch. Não reutilizar o
  resultado do SHA655d252 como validação do novo SHA ou presumir sucesso da publicação.

Arquivos seletivos deste patch:

- `.github/workflows/admin-beta.yml` — acrescenta somente o gate dirigido de publicação.
- `scripts/admin-beta/publish-images.mjs` — preflight tools e diagnóstico privado.
- `tests/admin-beta-deployment/publish.test.mjs` — cinco testes novos; nenhuma suíte aprovada editada.
- `docs/release/admin-beta-isolated/PUBLISH-TOOLS-FIX.md` — esta evidência e dependência de ACL.

Não houve alteração de aplicação, autenticação, IAM, migrations, banco, imagem tools,
VPS, laboratórios ou CI/CD de produção. Nenhum deploy, merge, alteração de tag existente
ou manipulação de credenciais foi executado. Somente ativar depois do CI verde e dos
três novos digests confirmados, seguindo RUNBOOK.md e validações externas do operador.

## CI dirigido 41164481335

SHA901b430: todos os gates anteriores, cinco testes novos, integração e Trivy **PASS**.
Publicação **FAIL antes de qualquer tag**: o upload de tools recebeu202 (permissão aceita),
mas a validação local recusou Location. Isso não comprova uma recusa atual da ACL.
A validação assumia identificador UUID/base64url; o protocolo fornece Location opaca.
Removida essa suposição: mantidos host GHCR, pacote exato, endpoint de upload, segmento
sem escape/traversal/controle e redirect proibido; identificadores com ponto/padding são aceitos.
Teste novo cobre identificadores opacos e escapes negados. Em nova incompatibilidade,
somente flags estruturais/tamanho limitado da Location são emitidos, nunca seu valor/query.
Testes dirigidos atualizados: **6/6 PASS**, zero skip; lint e diff-check PASS.
O próximo commit usa novamente SHA novo; nenhuma tag901b430 foi publicada.

## CI dirigido 41165178230

SHA1eddcb8: testes, build, integração e scanners **PASS**; publicação **FAIL antes de tags**.
GHCR respondeu202 e Docker-Upload-UUID; diagnóstico sanitizado confirmou mesmo host,
mas caminho diferente do prefixo de repositório presumido. A validação agora usa o UUID
retornado no próprio POST como prova de propriedade do upload e admite rotas de upload
GHCR globais ou do pacote tools. Exige correspondência exata do UUID, HTTPS/same-origin,
rota de upload e pacote correto nas rotas com escopo. Não segue redirects, não permite
outros pacotes/UUIDs e não registra Location/query. Testes novos cobrem essas negativas.
Isso preserva a validação de propriedade sem depender do formato de URI presumido.
Nenhuma tag desse SHA foi publicada; próximo CI será novamente de SHA novo.

Validação dirigida dessa revisão: **7/7 PASS**, zero skip; ESLint e diff-check PASS.
