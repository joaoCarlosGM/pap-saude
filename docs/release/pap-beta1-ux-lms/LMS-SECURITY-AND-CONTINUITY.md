# Beta 1 — contrato LMS, segurança e continuidade

Base recebida: `c7b1d7558b26ec85b09d4c9025c75bdadd79bdc7`. Feature exclusiva: `feature/p0-premium-unified-rc`. O pacote original foi lido integralmente e preservado. A divergência de checksum em 00/PROMPT é whitespace final da importação, já registrada no slice A; os arquivos anexados conferem semanticamente. Nenhuma dependência foi atualizada.

## Separação dos domínios

O LMS operacional usa treze modelos PostgreSQL novos. Nenhuma fixture é semeada na aplicação. Os componentes CourseCatalog e LessonBlockRenderer recebem DTOs; não consultam banco ou API. A Vitrine reutiliza somente esses componentes e tipos declarativos, com seis exemplos identificados, provider próprio em memória e rotas `/vitrine/aprender/*`. Não utiliza matrículas reais, serviços LMS, Prisma ou APIs clínicas. Restaurar a demonstração limpa também o progresso sintético; F5 o descarta. Nada disso altera DemoState clínico, fixtures, algoritmos ou oito KPIs aprovados.

O MEOWS assistencial continua desativado. A Vitrine mantém seu motor demonstrativo isolado. Nenhum texto novo constitui protocolo clínico, prescrição ou certificação profissional.

## Matriz efetiva

| Papel | Autoria/publicação | Oferta institucional | Atribuição à equipe | Progresso |
|---|---|---|---|---|
| PAP_ADMIN | grant dedicado; pode revisar autoria | global autorizada | não implícita | distribuição sem prontuários |
| PAP_MANAGER | somente autoria própria | versões próprias; município/unidade ativos | negada | distribuição própria, sem identidade de aluno |
| MUNICIPAL_ADMIN | negada | encaminhamento mediante grant e ancestry | negada por padrão | agregado do próprio município, pequenas amostras suprimidas |
| HEALTH_UNIT_ADMIN | negada | catálogo liberado à própria unidade | profissionais ativos elegíveis da própria unidade | equipe da própria unidade; paginação/filtros server-side |
| PROFESSIONAL | negada | nenhuma concessão por receber oferta | negada | somente matrículas próprias e imutavelmente vinculadas à versão |
| COMMERCIAL | negada | negada | negada | somente demonstração sintética |

Os dez grants `course.*` são específicos; `organization.read` não serve como autorização de escrita ou distribuição. Uma décima primeira permissão nova, `organization.municipality.create`, permite PAP_ADMIN/PAP_MANAGER globais registrar apenas município PENDING_VERIFICATION/inativo, sob PAP ativo. Exige MFA e origem confiável, tem limite persistente, código municipal único, repetição idempotente e auditoria. Não concede `organization.manage`, ativação, exclusão, papéis ou clínica. UBS/Hospital reutiliza `/solicitar-adesao`, revisão e ativação anteriores. Não foi criado atalho de ativação.

## Transações e conteúdo

- Sessão, usuário, fator MFA, memberships, assignments IAM e role_permissions do ator são verificados dentro de transação Serializable e mantidos com locks até commit. Escopo e ancestrais ativos também são bloqueados. Revogação concorrente não atravessa uma escrita autorizada; novas requisições após revogação falham. Destinatários têm membership/role/permission rows bloqueados antes de atribuir.
- Rascunhos preservam conteúdo incompleto tipado, com limites. Publicar revalida todos os campos pelo schema estrito. HTML/JS, iframe, URLs arbitrárias e upload não verificado não fazem parte do editor. Imagens são artes locais revisadas, de catálogo fechado. A biblioteca não inventa materiais clínicos homologados.
- Novas criações usam chave de requisição e digest; alterações usam revisão CAS. Módulos/aulas/blocos têm ordem explícita. Conteúdo publicado tem hash e triggers SQL de imutabilidade. Novas versões não reescrevem matrículas anteriores.
- Atribuição é atômica por publicação/unidade/profissional; repetição não cria matrícula ou notificação duplicada nem muda silenciosamente prazo/obrigação. Contas externas, inativas, sem vínculo/grant, e autoatribuição indevida são negadas. Revogação mantém histórico.
- VISIT e COMPLETE validam matrícula, proprietário, versão, sequência, checkpoint e sessão no servidor. Resposta perdida é reconciliada com estado persistido. Avaliação tem chave idempotente, limite persistente de tentativas e nota calculada no servidor; `percent`, `finish` e gabaritos enviados pelo cliente não são aceitos.
- O DTO de aprendizado remove `correctIndex` e `expected`. Não há certificado homologado/emissão fictícia. Conclusão é registro do LMS, não habilitação clínica.
- Notificações são persistentes/deduplicadas e restritas ao usuário. Marcar como visto considera somente matrículas/ofertas ainda acessíveis. Prazos são reais; a reconciliação ocorre ao consultar cursos, não é apresentada como scheduler externo. E-mail de curso permanece NOT_REQUESTED; nenhum envio externo foi executado.
- API no-store; mutações exigem sessão MFA, origem confiável e rate limit. Leitura JSON limita o stream a 32 KiB mesmo sem Content-Length ou com cabeçalho falso. Campos desconhecidos são rejeitados. Auditoria não contém conteúdo clínico, senha ou gabarito.

## Migração 35→36 e privilégios

`20261030090000_beta1_courses_lms` é exclusivamente forward-only. As 35 migrations históricas permanecem byte a byte iguais a c7b1d755, verificadas automaticamente. Adiciona treze tabelas, FKs, índices, checks/triggers, grants dedicados e referências LMS opcionais em user_notifications. A antiga associação de convite continua obrigatória para seus três tipos originais; o novo check exige a referência adequada para cada novo tipo. Nenhuma credencial, usuário, sessão, MFA, registro clínico ou role_assignment preexistente é reescrito.

O ensaio descartável gera sete identidades com TOTP realmente ativo e sessões verificadas, pacientes sintéticas, vínculos e notificação legada; remove os novos grants da fixture antes do baseline, para provar que a migration os instala. Compara hashes privados de todos os campos sensíveis e dos grants antigos. Migração, replay, drift zero, dump/restore e restart do container próprio passaram. Os mesmos sete tokens continuam válidos na fixture, sem novo MFA. A porta efêmera pode mudar ao reiniciar Docker; o harness reinspeciona somente seu próprio container.

O papel runtime não é owner e não pode criar schema, ler migrations, reescrever auditoria/ledger ou a identidade da operação clínica. As treze tabelas LMS têm suas permissões verificadas individualmente. O servidor Playwright usa o runtime; apenas o processo separado de fixtures usa o owner descartável. Não há banco compartilhado com o operador.

## HTML/RSC

O Next16.4.2 pode normalizar uma requisição RSC sem cache discriminator por 307 de mesmo caminho, corpo vazio e somente `_rsc`. Após normalização, uma resposta já iniciada pode ter HTTP200 e transportar `NEXT_HTTP_ERROR_FALLBACK;404`. Os testes aceitam exclusivamente esse contrato de negação, exigem digest404/text-x-component e ausência do título privado, sessões, códigos de recuperação e gabaritos. HTML direto e API estrangeira continuam404. O metadata-prefetch aceita apenas o transport tree fechado e os dois siblings estáticos públicos conhecidos: pacientes/aprender; dados renderizados e siblings arbitrários são rejeitados.

## Limites e riscos

- Contas reais do laboratório3600 não foram acessadas. Continuidade comprovada na fixture não equivale a backup/restauração do banco do operador. Esse aceite permanece manual e bloqueia a atualização do banco até sua autorização.
- Catálogos limitam a consulta a 50 versões/matrículas recentes; públicos a500 instituições; equipes a1000 elegíveis; progresso da equipe é paginado20. Escalas superiores exigem homologação específica/paginação adicional. Sem alegação de carga validada.
- Certificação institucional, upload de novas imagens, scheduler de prazos e e-mail de curso não são disponibilizados como funcionalidades homologadas.
- Auditoria completa:14 pacotes HIGH,10 MODERATE,1 LOW de desenvolvimento; produção6 MODERATE/0 HIGH/0 CRITICAL; migrator5 MODERATE/0 HIGH/0 CRITICAL. O JSON adjunto identifica pacotes, cadeias e GHSA. Não houve audit fix, overrides, upgrades ou supressão. Vulnerabilidades de tooling/build são risco herdado e exigem decisão de manutenção separada.
- Aceite humano das telas, carga, conteúdo educacional e escopo assistencial continuam obrigatórios. VPS/produção permanecem NO-GO nesta missão.

## Preservação explícita

Nenhum recurso do laboratório manual `127.0.0.1:3600`/PostgreSQL15436 foi acessado ou alterado pelo agente: banco, volume, sete contas, senhas, MFA, sessões, registros e `.local` foram preservados. Não executamos init, seed, admin, reset, db push, restart desse banco, envio externo, VPS, PR, merge, deploy ou alteração de produção. Os testes usam exclusivamente bancos/containers novos identificados, removendo somente os recursos próprios após execução.
