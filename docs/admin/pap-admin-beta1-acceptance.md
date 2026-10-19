# PAP Admin Beta 1 — candidata para revisão

Missão 02, branch `codex/pap-admin-beta1`. Base `9b9f495` (merge F04.10).
CI da develop confirmado SUCCESS antes da implementação:
https://github.com/joaoCarlosGM/pap-saude/actions/runs/39253051569.
A consulta posterior de develop manteve o mesmo SHA. Nenhum rebase ou atualização
sobre alterações próprias foi necessário. Não houve merge, publicação ou deploy.

## Inventário e decisões

Reutilizados schema/IAM F01–F04, services de organizações, convite profissional,
aceite, autenticação/TOTP, auditoria append-only, diretório scoped, permissões e
componentes administrativos. Antes desta missão, `PRODUCT_ACTIVITY_EVENTS` era
catálogo: a busca de emissores não encontrou instrumentação de conclusão de
atendimento. O dashboard estático foi substituído por consultas reais.

O HTML `pap_admin_versao3_ta_kanban.html` fornecido durante a execução é referência
visual, não fonte de instruções de produto ou autorização. Foram aplicados shell
escuro `#09282c`, teal `#064f50`, superfícies claras, mint, cantos arredondados,
sidebar agrupada, busca, modo compacto com hover/foco e navegação mobile.
Não foram importados dados fictícios, integrações simuladas, Kanban, TAs,
maintenance ou automações GitHub do protótipo. Não se declara equivalência pixel
perfect; a comparação e o aceite visual humano continuam necessários.

Solicitações públicas não criam `User`. A migration incremental
`20261020000000_admin_beta1` torna opcional o solicitante autenticado e acrescenta
contato/consentimento/revisão no candidato, estado de envio nos convites, evidência
de MFA na sessão e contadores duráveis de abuso. Todas as migrations anteriores
permanecem intactas; execução somente em bancos descartáveis. Não há upload de
documentos: o schema não oferece esse contrato.

## Contratos e invariantes

| Caminho | Contrato e controles |
|---|---|
| `/solicitar-adesao` | Formulário público responsivo; aviso/consentimento; nenhum dado clínico |
| `POST /api/organization-requests` | JSON limitado a 32 KiB, campos allowlisted, origem confiável, limite por origem e global; 202 uniforme para novo/duplicado/terminal |
| `GET /api/admin/beta/requests?page=&status=&q=` | PAP_ADMIN GLOBAL, MFA verificado; páginas de 20; contato privado |
| `POST /api/admin/beta/requests` | `{id,decision,municipalityId,reason}`; motivo obrigatório; decisão final idempotente; outra decisão retorna 409 |
| `GET /api/admin/beta/invitations?organizationId=&page=` | Escopo USER_INVITE, MFA, páginas de 20, sem hashes/tokens/URLs |
| `POST /api/admin/beta/invitations` | `BOOTSTRAP`, `INVITE`, `RESEND`, `REVOKE`; CSRF, MFA e limite por usuário |
| `POST /api/admin/invitations` | Rota anterior preservada para profissionais, agora com MFA e mesmo limite; sem bypass alternativo |
| `/api/invitations/accept` | Contrato anterior mantido; aceita apenas PROFESSIONAL ou HEALTH_UNIT_ADMIN, token temporário hash/uso único, CAS transacional |
| `GET /api/admin/beta/users?page=&q=&organizationId=` | USER_READ server-side, MFA, paginação real de 20, projeções de vínculo/role limitadas ao escopo |
| `GET /api/admin/beta/metrics?from=&to=&organizationId=&format=` | ANALYTICS scoped, MFA, filtros estritos, limite de consultas, agregados/CSV; sem acesso a tabelas clínicas |

- Identidade global, membership e role separados; papel GLOBAL não cria vínculo
  clínico. Convite público não aceita role, tenant ou estado escolhidos pelo cliente.
- Aprovação exclusiva de PAP_ADMIN GLOBAL; município ACTIVE/isActive sob PAP ativo,
  cidade/UF coincidentes. Município ausente exige cadastro administrativo prévio;
  nenhuma entidade municipal é autoativada pela solicitação.
- Dedupe por CNES, CNPJ ou identidade nome/cidade/UF, com checagem também em
  organizações existentes. Submissão usa Serializable com retry limitado. CNES e
  CNPJ têm validação estrutural; existência e legitimidade exigem revisão humana,
  sem alegar consulta automática ao cadastro oficial.
- Aprovação serializa a linha do candidato; conversão, resolução da solicitação e
  auditoria são atômicas. Reenvios/corridas não geram duas UBS.
- Bootstrap usa somente o contato da solicitação aprovada e exige PAP reviewer;
  rejeita outra identidade e UBS com administrador já atribuído.
- Convites serializam a organização; reenvio cria novo token/hash, revoga links
  anteriores e nunca eleva outro papel. Identidade existente mantém credencial e
  outros vínculos. Vínculos ativos/suspensos/desabilitados não são reativados pelo
  convite. Aceite revalida usuário e organização e consome o token uma única vez.
- Sessão beta exige fator ativo e `mfaVerifiedAt` posterior à ativação. Só o fluxo
  server-side de MFA/TOTP ou recuperação marca sessões de login. Sessões antigas
  exigem novo login. A própria área de segurança permite configurar o fator.
- Auditoria usa allowlist, sem contato, senha, token ou payload clínico.

## Envio e retentativa

Variáveis existentes: `PAP_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`,
`PAP_EMAIL_FROM`, `PAP_PUBLIC_URL`. Em produção é obrigatório também
`PAP_EMAIL_ALLOWED_HOSTS` (lista explícita de hosts, com porta se aplicável).
A origem é configuração, nunca Host recebido. HTTPS obrigatório em produção;
credenciais na URL, caminhos, query e fragmento de origem são rejeitados.

HTML + texto, escape de campos e link, identidade PAP, CTA, validade de 48 horas
e orientação de suporte ao administrador da UBS. Resend usa timeout de 10s e
chave de idempotência por convite. HTTP 2xx só vira SENT com ID válido do provedor.
SENT significa aceito pelo Resend, **não delivered**. Não há webhook de entrega.

Mecanismo de retentativa explícita, sem outbox com token em claro: o convite é
persistido antes do envio, com SENDING; uma falha conhecida revoga o token e marca
FAILED. O operador pode reenviar pelo histórico, gerando outro token e ID de
idempotência. Se o processo cair depois do commit, SENDING é resultado incerto,
nunca entrega confirmada; reenviar invalida o link anterior. Não existe worker de
retry automático. Eventual e-mail duplicado do provedor não torna o token antigo
válido. Desenvolvimento fica DEVELOPMENT, nunca SENT. Produção sem chave/origem/
provedor válidos falha fechada. Tokens não aparecem no histórico administrativo.

## Definições dos indicadores

Todos os intervalos são `[início, fim)` em UTC, selecionáveis em 7/30/90 dias;
from/to inválidos, repetidos, futuros ou superiores a 90 dias são rejeitados.
Datas de apresentação usam pt-BR; labels explicam UTC. Filtros de dashboard ficam
na URL. UBS aprovadas são conversões de candidatos APPROVED, sem inferir aprovação de organizações históricas. Responsáveis/profissionais ativos são identidades distintas com role e membership ACTIVE na mesma UBS ativa; não representam atividade funcional. Contagens de instituições e convites são administrativas, não clínicas.

- **Fonte funcional:** `encounter.completed`, emitido atomicamente na transição
  real IN_PROGRESS → COMPLETED pela API clínica autenticada, metadados apenas
  `{source: clinical-api, version: beta1}`. Sem paciente, encounter ID ou prontuário.
  CAS evita evento duplicado por corrida/replay. Chamadas de manutenção ao service
  sem ator não contam como utilização autenticada.
- **Elegíveis E:** UBS ACTIVE e isActive com usuário ativo, membership ACTIVE e
  role PROFESSIONAL na mesma UBS, na data da consulta. Não reconstrói elegibilidade
  histórica; alterações posteriores de vínculo podem modificar o denominador.
- **Adoção A/E:** A = UBS de E com evento funcional válido na janela; E = conjunto
  acima. Login/dashboard não contam. A e taxa são suprimidos se A ou E <5.
- **DAU/WAU/MAU:** atores distintos de eventos funcionais válidos em E nos últimos
  1/7/30 dias até o fim selecionado; não são usuários apenas logados. Valores <5,
  inclusive zero, são suprimidos; série diária usa a mesma regra.
- **Retenção operacional de UBS:** denominador = UBS de E com evento nos 30 dias
  anteriores ao início; numerador = dessas UBS, as que voltaram na janela. Não é
  retenção de pacientes nem estudo clínico. Numerador/taxa só visíveis com ambas
  coortes >=5. Ausência de base suficiente é INSUFFICIENT_SAMPLE.
- Convites: distribuição por papel, estado de aceite e estado do provedor,
  considerando criação na janela; reenvios são tentativas distintas, não pessoas
  únicas. Não apresentar essas contagens como número de profissionais ativos.
- Estados: NO_DATA sem eventos funcionais na janela; INSUFFICIENT_SAMPLE quando
  há dados insuficientes para divulgação; AVAILABLE para coorte publicável.
  Jornadas completas e desfechos permanecem NOT_INSTRUMENTED, sem números inventados.
- Teto de 10.000 eventos por consulta; ao exceder, rejeita e exige filtro menor,
  sem retornar totais truncados. Não lê OrganizationMetricSnapshot como se fosse
  telemetria nova. Snapshot histórico não comprova instrumentação.
- CSV somente série agregada autorizada, com aspas escapadas e prefixo inofensivo
  contra fórmulas; nenhuma identificação de ator/paciente ou payload clínico.

## Matriz de aceite e evidências

| Requisito | Evidência executável |
|---|---|
| Formulário, consentimento, payload malicioso, duplicidade concorrente | `tests/admin-beta/journey.integration.test.ts` |
| Município incorreto, aprovação dupla, rejeição terminal | Mesmo teste, transações reais PostgreSQL |
| Bootstrap, token único, role/vínculo corretos, login real com MFA | Jornada integrada, Resend mockado com ID |
| Identidade existente e membership duplicado | Jornada integrada |
| 4xx/5xx/timeout, reenvio, revogação, expirado e aceite concorrente | Jornada integrada, sem conexão externa |
| Escalada, outro tenant, CSRF, sessão sem MFA e rota anterior | Jornada integrada + F04 integrado |
| PAP sem acesso a pacientes, gestações e atendimentos | Chamadas reais às três APIs clínicas na jornada |
| Evento real, sem PHI, não duplicado, amostra pequena e coorte >=5 | Jornada integrada com atendimentos sintéticos |
| HTML/texto, escape, HTTPS/allowlist, falta de chave em produção | `tests/admin-beta/email.test.ts` |
| Limite durável concorrente, datas/filtros adversariais, CSV injection | Jornada integrada |
| Desktop/mobile, solicitação → revisão → aprovação, menus e runtime | `scripts/testing/beta1-browser.mjs` + capturas em `evidence/` |
| Migração, invariantes, runtime/migrator e backup/restore sintético | Gates F04.10 preservados e CI completo |
| F03 completo e autenticação/MFA | `test:f03:smart:force`, `test:auth`, CI serial |

Resultados locais finais: **19/19** no comando Beta (upgrade populado **1/1** +
jornada/template/adversariais **18/18**); F04 integrado **78/78**; F03 completo sem
cache **203/203**; autenticação/MFA **202/202**; admin HTTP repetido após ajustes
**26/26**. `npm ci --cache /tmp/pap-npm-cache`, Prisma validate/generate, typegen,
TypeScript, lint e build concluídos; guard CI **2/2**, preflight/backup-restore
sintético **1/1** e separação runtime/migrator passaram. Migration deploy repetido
sem pendências e migrate diff: **No difference detected**.

Navegador Chromium via Playwright **1.64.1**: desktop 1440×1000 e mobile 390×844;
submissão/revisão/aprovação, dashboard, menu compacto/hover, Escape retornando foco,
menu mobile sem overflow horizontal e zero exceções de cliente. Seis capturas
sintéticas em `evidence/`, inspecionadas visualmente. A comparação humana V3 continua
externa; o hash do HTML fornecido está no JSON de evidências.
Capturas: [dashboard desktop](evidence/dashboard-desktop.png),
[dashboard mobile](evidence/dashboard-mobile.png),
[revisão PAP](evidence/request-review-desktop.png),
[sidebar mobile](evidence/sidebar-mobile.png),
[formulário desktop](evidence/public-desktop.png) e
[formulário mobile](evidence/public-mobile.png).

Reprodução do navegador: instalar Playwright fora das dependências da aplicação,
ter Chromium disponível, executar `npm run build` com DATABASE_URL descartável e
`PAP_PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs bash scripts/test-admin-beta1-browser.sh`.
O harness cria e remove somente `pap_saude_beta1_browser_test`, servidor local em
127.0.0.1:3100 e arquivo privado temporário de sessão. O teste bloqueia requisições
do navegador a outras origens. Não utiliza a VPS.

O CI remoto completo (inclusive Docker/CVEs) é executado no PR; SHA, links e resultado
final são registrados no próprio PR. Nenhuma validação Docker remota é presumida
com base apenas no build Next local. O JSON de evidências preserva hashes dos logs
locais e capturas. Logs locais
privados `/tmp/beta-*.log` não contêm dados reais nem são fonte de credenciais.

## Incidentes de validação corrigidos

1. `npm ci` encontrou cache padrão sem permissão de escrita neste ambiente;
   repetido com `--cache /tmp/pap-npm-cache`, instalação concluída sem mudar lock.
2. Fixtures de expiração/MFA violaram constraints temporais; datas sintéticas
   corrigidas, constraints preservadas e testes repetidos.
3. Harness F04 só permitia a branch anterior: adicionada esta branch explicitamente,
   sem ampliar alvos de banco nem permissão para produção.
4. Primeira execução paralela de auth/F03 colidiu em `pap_saude_f02b_test`, banco
   compartilhado por esses harnesses legados. Reexecução sequencial obrigatória;
   CI preserva essa ordem. Não classificar a primeira execução como PASS.

## Homologação externa — NO-GO para produção / beta homologada

- [ ] Operador configurar domínio/remetente Resend, SPF, DKIM e DMARC e verificar
  o alinhamento. Configuração no código não comprova entregabilidade.
- [ ] Configurar origem HTTPS/allowlist, segredo Resend, cabeçalho de IP definido
  somente pelo proxy confiável, AUTH_ALLOWED_ORIGINS, MFA encryption key persistente.
- [ ] Em staging isolado, realizar envio real para inbox, abrir link, ativar identidade,
  configurar MFA e convidar profissional; comprovar revogação/expiração e suporte.
- [ ] Garantir redação dos tokens dos links nos logs do proxy e política no-referrer em staging.
- [ ] Revisar privacidade/retenção dos contatos e política institucional de consentimento.
- [ ] Aprovar visualmente as capturas contra V3; não presumir pixel-perfect.
- [ ] Aplicar branch protection e regras/revisores do environment production. Consulta
  GitHub desta missão ainda retornou develop `protected:false`.
- [ ] Executar revisão do compose/deploy, privilégios reais e restore de backup em
  infraestrutura validada por operador, conforme runbook F04.10. Não executado na VPS.
- [ ] Avaliar volumes/índices, supressão e elegibilidade histórica com dados sintéticos
  representativos antes de ampliar a beta. O limite por consulta é explícito.

Software pode ser candidato a revisão após os testes/CI, mas **Codex não declara
BETA 1 HOMOLOGADA nem GO de produção**. Não houve acesso à VPS, dados reais,
merge em develop/prod/PROD ou deploy nesta missão.

## Commits por subfase

- `dd8ecb4`: modelo incremental, solicitação pública e revisão auditada/MFA.
- `4255fc7`: bootstrap, convites scoped, envio e resultados do provedor.
- `fa1cb30`: evento funcional e agregados privados.
- `6f0e13f`: fluxos de UI e navegação administrativa V3.
- `875f15d`: diretório paginado, fechamento da rota alternativa de convite, limites e refinamentos V3.
- `da89d6a`: testes de upgrade/jornada/contratos, CI e navegador reproduzível.
- Commit deste relatório: matriz, resultados e capturas sintéticas.
