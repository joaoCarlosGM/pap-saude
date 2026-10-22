# Auditoria final — Missão 04 / Slice B

Data: **22/10/2026 — America/Fortaleza**. Branch: `feature/ux-iam-convites-vitrine-email`. HEAD/base: `efdbbad14f508139b12abd1a4867c4f97ad1488e`. **B sem commit/push, índice vazio.** PR #5 aberto em draft para develop. Este documento contém o complemento solicitado, incluindo a correção do achado anterior e evidência executada após a correção.

## 1. Estado Git — saídas completas

As saídas abaixo são literais; `git diff --stat` não inclui untracked. A lista seguinte inclui cada arquivo novo, sem abreviar diretórios.

```text
$ git status --short
 M .github/workflows/ci.yml
 M package.json
 M prisma/schema.prisma
 M src/app/(admin)/admin/layout.tsx
 M src/app/(admin)/admin/organizacoes/page.tsx
 M src/app/(admin)/admin/page.tsx
 M src/app/(dashboard)/atendimentos/page.tsx
 M src/app/(dashboard)/casos/page.tsx
 M src/app/(dashboard)/chat/page.tsx
 M src/app/(dashboard)/configuracoes/page.tsx
 M src/app/(dashboard)/cursos/page.tsx
 M src/app/(dashboard)/dashboard/page.tsx
 M src/app/(dashboard)/ferramentas/page.tsx
 M src/app/(dashboard)/layout.tsx
 M src/app/(dashboard)/pacientes/[id]/page.tsx
 M src/app/(dashboard)/pacientes/page.tsx
 M src/app/(dashboard)/protocolos/page.tsx
 M src/app/(dashboard)/registro/page.tsx
 M src/app/api/admin/beta/requests/route.ts
 M src/app/api/admin/organizations/[organizationId]/route.ts
 M src/app/api/admin/organizations/route.ts
 M src/app/api/admin/role-assignments/[assignmentId]/route.ts
 M src/app/api/admin/role-assignments/route.ts
 M src/components/admin/AccessAdminClient.tsx
 M src/components/admin/AdminShell.tsx
 M src/components/admin/AdminSidebar.tsx
 M src/components/admin/AdminTopbar.tsx
 M src/components/admin/BetaInvitationsClient.tsx
 M src/components/admin/BetaRequestsClient.tsx
 M src/components/admin/BetaWidgets.tsx
 M src/components/admin/OrganizationsAdminClient.tsx
 M src/components/security/FirstAccessWizard.tsx
 M src/components/security/security-client.ts
 M src/server/admin-beta/invitations.service.ts
 M src/server/admin-beta/policy.ts
 M src/server/admin-beta/requests.service.ts
 M src/server/admin/admin-access.service.ts
 M src/server/admin/admin-http.ts
 M src/server/admin/admin-organizations.service.ts
 M src/server/admin/admin-roles.service.ts
 M src/server/audit/admin-audit-policy.ts
 M src/server/auth/session.service.ts
 M src/server/iam/authorization.service.ts
 M src/server/iam/effective-access-profile.service.ts
 M src/server/iam/permissions.ts
 M src/server/iam/role-assignment.service.ts
 M src/server/iam/system-role-catalog.ts
 M src/server/invitations/invitation.service.ts
 M src/server/organizations/discovery.service.ts
 M tests/admin-beta/journey.integration.test.ts
 M tests/admin/admin-mfa.integration.test.ts
 M tests/admin/f04-audit-idor.integration.test.ts
 M tests/admin/role-adversarial.integration.test.ts
 M tests/admin/role-governance.integration.test.ts
 M tests/local/provision.integration.test.ts
?? docs/codex/AUDITORIA-FINAL-MISSAO-04-B.md
?? docs/codex/RELATORIO-MISSAO-04-SLICE-B.md
?? docs/evidence/missao-04-b/
?? prisma/migrations/20261022040000_mission04_delegated_governance/
?? scripts/test-mission04-b.sh
?? src/components/admin/admin-theme.css
?? src/lib/auth/
?? src/server/admin/admin-session.service.ts
?? src/server/admin/institutional-invitation-policy.ts
?? src/server/clinical/clinical-page-session.ts
?? tests/helpers/verified-admin-session.ts
?? tests/mission04-b/

$ git diff --stat
 .github/workflows/ci.yml                           |   3 +
 package.json                                       |   4 +-
 prisma/schema.prisma                               |   2 +
 src/app/(admin)/admin/layout.tsx                   |   4 +-
 src/app/(admin)/admin/organizacoes/page.tsx        |  13 +-
 src/app/(admin)/admin/page.tsx                     |  10 +-
 src/app/(dashboard)/atendimentos/page.tsx          |   4 +-
 src/app/(dashboard)/casos/page.tsx                 |   4 +-
 src/app/(dashboard)/chat/page.tsx                  |   4 +-
 src/app/(dashboard)/configuracoes/page.tsx         |  50 ++-
 src/app/(dashboard)/cursos/page.tsx                |  46 +-
 src/app/(dashboard)/dashboard/page.tsx             | 204 ++++-----
 src/app/(dashboard)/ferramentas/page.tsx           |   4 +-
 src/app/(dashboard)/layout.tsx                     |  18 +-
 src/app/(dashboard)/pacientes/[id]/page.tsx        |   2 +
 src/app/(dashboard)/pacientes/page.tsx             |   4 +-
 src/app/(dashboard)/protocolos/page.tsx            |   4 +-
 src/app/(dashboard)/registro/page.tsx              |   4 +-
 src/app/api/admin/beta/requests/route.ts           |   3 +-
 .../admin/organizations/[organizationId]/route.ts  |  10 +-
 src/app/api/admin/organizations/route.ts           |   2 +
 .../admin/role-assignments/[assignmentId]/route.ts |   2 +
 src/app/api/admin/role-assignments/route.ts        |   2 +
 src/components/admin/AccessAdminClient.tsx         |  69 +--
 src/components/admin/AdminShell.tsx                |   2 +-
 src/components/admin/AdminSidebar.tsx              |  10 +-
 src/components/admin/AdminTopbar.tsx               |   2 +-
 src/components/admin/BetaInvitationsClient.tsx     |   6 +-
 src/components/admin/BetaRequestsClient.tsx        |  91 +++-
 src/components/admin/BetaWidgets.tsx               |   2 +-
 src/components/admin/OrganizationsAdminClient.tsx  |  90 ++--
 src/components/security/FirstAccessWizard.tsx      |  11 +-
 src/components/security/security-client.ts         |  12 +-
 src/server/admin-beta/invitations.service.ts       |  16 +-
 src/server/admin-beta/policy.ts                    |   8 +-
 src/server/admin-beta/requests.service.ts          |  69 ++-
 src/server/admin/admin-access.service.ts           |  12 +-
 src/server/admin/admin-http.ts                     |  48 +-
 src/server/admin/admin-organizations.service.ts    | 247 +++++++++--
 src/server/admin/admin-roles.service.ts            | 493 ++++++++++-----------
 src/server/audit/admin-audit-policy.ts             |   1 +
 src/server/auth/session.service.ts                 |   7 +-
 src/server/iam/authorization.service.ts            |  13 +-
 src/server/iam/effective-access-profile.service.ts |   5 +-
 src/server/iam/permissions.ts                      |   6 +
 src/server/iam/role-assignment.service.ts          |   1 +
 src/server/iam/system-role-catalog.ts              |  20 +-
 src/server/invitations/invitation.service.ts       |  33 +-
 src/server/organizations/discovery.service.ts      |   4 +-
 tests/admin-beta/journey.integration.test.ts       |  15 +-
 tests/admin/admin-mfa.integration.test.ts          |   4 +-
 tests/admin/f04-audit-idor.integration.test.ts     |   7 +-
 tests/admin/role-adversarial.integration.test.ts   |  12 +-
 tests/admin/role-governance.integration.test.ts    |  12 +-
 tests/local/provision.integration.test.ts          |  56 ++-
 55 files changed, 1058 insertions(+), 729 deletions(-)

$ git diff --check
[exit 0; nenhuma saída]
```
## 2. Inventário exato

**79 arquivos: 55 modificados + 24 novos/untracked.** Nenhum staged. Os três PNG são capturas sintéticas mascaradas; não contêm credenciais, QR ou códigos MFA.

### Modificados

```text
.github/workflows/ci.yml
package.json
prisma/schema.prisma
src/app/(admin)/admin/layout.tsx
src/app/(admin)/admin/organizacoes/page.tsx
src/app/(admin)/admin/page.tsx
src/app/(dashboard)/atendimentos/page.tsx
src/app/(dashboard)/casos/page.tsx
src/app/(dashboard)/chat/page.tsx
src/app/(dashboard)/configuracoes/page.tsx
src/app/(dashboard)/cursos/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/ferramentas/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/pacientes/[id]/page.tsx
src/app/(dashboard)/pacientes/page.tsx
src/app/(dashboard)/protocolos/page.tsx
src/app/(dashboard)/registro/page.tsx
src/app/api/admin/beta/requests/route.ts
src/app/api/admin/organizations/[organizationId]/route.ts
src/app/api/admin/organizations/route.ts
src/app/api/admin/role-assignments/[assignmentId]/route.ts
src/app/api/admin/role-assignments/route.ts
src/components/admin/AccessAdminClient.tsx
src/components/admin/AdminShell.tsx
src/components/admin/AdminSidebar.tsx
src/components/admin/AdminTopbar.tsx
src/components/admin/BetaInvitationsClient.tsx
src/components/admin/BetaRequestsClient.tsx
src/components/admin/BetaWidgets.tsx
src/components/admin/OrganizationsAdminClient.tsx
src/components/security/FirstAccessWizard.tsx
src/components/security/security-client.ts
src/server/admin-beta/invitations.service.ts
src/server/admin-beta/policy.ts
src/server/admin-beta/requests.service.ts
src/server/admin/admin-access.service.ts
src/server/admin/admin-http.ts
src/server/admin/admin-organizations.service.ts
src/server/admin/admin-roles.service.ts
src/server/audit/admin-audit-policy.ts
src/server/auth/session.service.ts
src/server/iam/authorization.service.ts
src/server/iam/effective-access-profile.service.ts
src/server/iam/permissions.ts
src/server/iam/role-assignment.service.ts
src/server/iam/system-role-catalog.ts
src/server/invitations/invitation.service.ts
src/server/organizations/discovery.service.ts
tests/admin-beta/journey.integration.test.ts
tests/admin/admin-mfa.integration.test.ts
tests/admin/f04-audit-idor.integration.test.ts
tests/admin/role-adversarial.integration.test.ts
tests/admin/role-governance.integration.test.ts
tests/local/provision.integration.test.ts
```

### Adicionados/untracked

```text
docs/codex/AUDITORIA-FINAL-MISSAO-04-B.md
docs/codex/RELATORIO-MISSAO-04-SLICE-B.md
docs/evidence/missao-04-b/critical-review.md
docs/evidence/missao-04-b/final-review-git.txt
docs/evidence/missao-04-b/final-review.json
docs/evidence/missao-04-b/manager-dark.png
docs/evidence/missao-04-b/manager-desktop.png
docs/evidence/missao-04-b/manager-mobile.png
docs/evidence/missao-04-b/npm-audit-complete.json
docs/evidence/missao-04-b/privacy-probe.txt
docs/evidence/missao-04-b/validation.json
prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql
scripts/test-mission04-b.sh
src/components/admin/admin-theme.css
src/lib/auth/access-destination.ts
src/server/admin/admin-session.service.ts
src/server/admin/institutional-invitation-policy.ts
src/server/clinical/clinical-page-session.ts
tests/helpers/verified-admin-session.ts
tests/mission04-b/fixtures.ts
tests/mission04-b/governance.spec.ts
tests/mission04-b/governance.test.ts
tests/mission04-b/legacy-upgrade.test.ts
tests/mission04-b/playwright.config.ts
```
## 3. Falha encontrada, correção e demonstração de privacidade

**M04-B-AUDIT-01: corrigido.** Antes, o grant global `organization.read` do Manager resultava em `findMany` com `include`, retornando todos os escalares, inclusive `settings`. A sonda real da auditoria anterior observou:

```text
# {"httpStatus":200,"settingsReturned":true,"privateCanaryVisible":true,"clinicalCountsReturned":false,"returnedScalarFields":["address","city","cnes","cnpj","code","createdAt","id","isActive","name","parentId","settings","state","status","type","updatedAt"]}
```
A correção usa **select explícito no servidor**. Escopo e projeção derivam do mesmo perfil efetivo carregado uma vez por requisição; o helper aceita esse contexto interno e rejeita perfil cujo userId não corresponda ao ator. Isso evita que uma revogação entre duas leituras de perfil amplie os campos retornados. O contexto não é recebido do payload HTTP nem armazenado entre requisições. A regressão inclui rejeição de perfil de outro usuário; a revisão do diff mostra o mesmo objeto passado ao cálculo de escopo e à seleção de campos. O Manager recebe somente `id`, `name`, `type`, `status`, `isActive`, `parentId`, `city`, `state`, parent `{id,name,type}` e `_count.children`. São omitidos `settings`, endereço, code/CNES/CNPJ, timestamps privados e contagens de usuários/pacientes/atendimentos. Os campos não são apenas escondidos pela UI: não são selecionados/serializados para esse papel. A UI passou a tratar contagens/campos ausentes sem mostrar números fictícios. `settings` não é retornado pelo diretório para nenhum papel; Admin autorizado conserva os demais campos operacionais. Se o usuário possuir também uma concessão PAP_ADMIN global explícita, ela é uma autorização independente; Manager não consegue atribuí-la a si ou a outros.

O alcance global mantém a leitura de **metadados institucionais delegados**, não concede qualquer outro recurso. O escopo das concessões anteriores permanece filtrado por IAM. A regressão semeia marcadores privados não nulos em **PAP, município e UBS sem relação com o Manager**, verifica chaves exatas da resposta, ausência do marcador e acesso legítimo do Admin ao endereço. A regressão do navegador verifica API, HTML, RSC e DOM após carregar o diretório.

### Sonda independente repetida após a correção — saída integral

```text
TAP version 13
# {"httpStatus":200,"settingsReturned":false,"privateCanaryVisible":false,"clinicalCountsReturned":false,"returnedScalarFields":["city","id","isActive","name","parentId","state","status","type"]}
# Subtest: PAP_MANAGER organization.read must not disclose private settings
ok 1 - PAP_MANAGER organization.read must not disclose private settings
  ---
  duration_ms: 3110.83886
  type: 'test'
  ...
# {"endpoint":"/api/admin/audit","httpStatus":403}
# {"endpoint":"/api/admin/users","httpStatus":200}
# {"endpoint":"/api/admin/users","emptyResult":true}
# {"endpoint":"/api/admin/beta/users","httpStatus":403}
# {"endpoint":"/api/admin/security","httpStatus":403}
# {"endpoint":"/api/admin/beta/metrics","httpStatus":403}
# {"endpoint":"/api/admin/operations/metrics","httpStatus":403}
# {"endpoint":"/api/admin/operations/monitoring","httpStatus":403}
# {"endpoint":"/api/admin/operations/integrations","httpStatus":403}
# Subtest: PAP_MANAGER cannot use organization.read for undelegated global endpoints
ok 2 - PAP_MANAGER cannot use organization.read for undelegated global endpoints
  ---
  duration_ms: 2315.453674
  type: 'test'
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7656.57862
```
### Regressão permanente — código executado e TAP real

```ts
test("Manager organization.read returns only delegated fields across unrelated organizations", async () => {
  await assert.rejects(listAccessibleOrganizationIds(
    manager.user.id,
    "organization.read",
    (await getEffectiveAccessProfile(admin.user.id))!,
  ));
  const marker = `private-organization-${randomUUID()}`;
  const foreign = await actor();
  const city = await db.organization.findUniqueOrThrow({ where: { id: foreign.unit.parentId! } });
  const ids = [foreign.unit.id, city.id, city.parentId!];
  for (const id of ids)
    await db.organization.update({
      where: { id },
      data: {
        settings: { confidential: marker },
        address: marker,
        code: `${marker}-${id}`,
        cnes: `${marker}-${id}`,
        cnpj: `${marker}-${id}`,
      },
    });
  const response = await organizations(request("/api/admin/organizations", manager.token));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes(marker), false);
  for (const id of ids) {
    const row = body.organizations.find((o: { id: string }) => o.id === id);
    assert.ok(row);
    assert.deepEqual(Object.keys(row).sort(), [
      "_count", "city", "id", "isActive", "name", "parent", "parentId", "state", "status", "type",
    ].sort());
    assert.deepEqual(Object.keys(row._count), ["children"]);
    if (row.parent) assert.deepEqual(Object.keys(row.parent).sort(), ["id", "name", "type"]);
    else assert.equal(row.type, "PAP");
  }
  const adminResponse = await organizations(request("/api/admin/organizations", admin.token));
  const adminRows = (await adminResponse.json()).organizations;
  assert.equal(adminRows.find((o: {id: string}) => o.id === ids[0]).address, marker);
  assert.equal(adminRows.some((o: object) => Object.hasOwn(o, "settings")), false);
});
```

```text
# Subtest: Manager organization.read returns only delegated fields across unrelated organizations
ok 13 - Manager organization.read returns only delegated fields across unrelated organizations
  ---
  duration_ms: 1332.446421
  type: 'test'
  ...
```
As primeiras tentativas da nova fixture falharam por repetir identificadores com índice unique (`organizations_code_key`), antes da asserção de privacidade; isso **não** é apresentado como reprodução do vazamento. Foram corrigidos os valores sintéticos por organização. Uma tentativa de instrumentar o delegate Prisma com mock.method não era suportada pelo proxy e foi retirada; essa tentativa não foi contada como evidência de privacidade nem concorrência. O vazamento anterior é demonstrado pela sonda acima; a rodada final passou sem mudar guards. Uma tentativa inicial de suíte encontrou PostgreSQL ainda no reinício de inicialização; foi aguardado o TCP final. Docker exigiu configuração em /tmp, CA como build secret e resolução do proxy desta nuvem; tentativas incompletas/canceladas não foram consideradas PASS. O esgotamento de disco foi tratado removendo apenas registros de cache BuildKit próprios, conferidos por ID/data/descrição e marcados não compartilhados: `41hc9w87ys0moljlnmdk6wrsm`, `umtejh37sk5hnh7fpe3e38yzh` e `luea19x2mqnca65ut6nhj6jl7`; não houve prune genérico. A limpeza do cache npm interferiu no módulo MEOWS (ENOENT); a rodada F03 inicial foi rejeitada e a suíte completa foi repetida sem cache de resultados, com cache npm separado e estável. O primeiro teste funcional do migrator não concluiu durante a falta de espaço; foi repetido após liberar o cache próprio. O F04 inicial também falhou com PostgreSQL E53100 (No space left on device) no pico de uso dos containers; foi rejeitado e repetido sequencialmente após o fim dos testes de imagens. A rodada F03 final passou 9/9 sem cache de resultados, incluindo MEOWS.
## 4. Antiescalada e fronteiras clínicas — evidências executadas

O perfil efetivo intersecta grants persistidos com o catálogo canônico. PAP_MANAGER tem exatamente `organization.read`, `organization.request.review`, `institution.invite`, `role.assign_commercial`; não recebe lifecycle de UBS, role.manage, segurança global, auditoria global, analytics ou patient.read. Os testes exercitam nomeação/revogação, autoatribuição, papéis privilegiados como alvo, escopo falso e drift de grants persistidos. A sonda acima registra sete endpoints 403 e `/api/admin/users` 200 com lista vazia (contrato legado).

### manager cannot grant/revoke Managers/Admins, self-elevate or inject actor/scope

```text
# Subtest: manager cannot grant/revoke Managers/Admins, self-elevate or inject actor/scope
ok 3 - manager cannot grant/revoke Managers/Admins, self-elevate or inject actor/scope
  ---
  duration_ms: 137.207235
  type: 'test'
  ...
```

### persisted grant drift cannot give Manager lifecycle, role.manage or patient privileges

```text
# Subtest: persisted grant drift cannot give Manager lifecycle, role.manage or patient privileges
ok 5 - persisted grant drift cannot give Manager lifecycle, role.manage or patient privileges
  ---
  duration_ms: 109.605191
  type: 'test'
  ...
```

### Manager organization.read cannot authorize undelegated global resources

```text
# Subtest: Manager organization.read cannot authorize undelegated global resources
ok 14 - Manager organization.read cannot authorize undelegated global resources
  ---
  duration_ms: 165.88559
  type: 'test'
  ...
```

### global nonclinical roles denied clinical GET/POST/PATCH with forged org and demo query

```text
# Subtest: global nonclinical roles denied clinical GET/POST/PATCH with forged org and demo query
ok 15 - global nonclinical roles denied clinical GET/POST/PATCH with forged org and demo query
  ---
  duration_ms: 84.688349
  type: 'test'
  ...
```

### Professional optional MFA retained: own-unit clinical access, foreign-unit denied

```text
# Subtest: Professional optional MFA retained: own-unit clinical access, foreign-unit denied
ok 16 - Professional optional MFA retained: own-unit clinical access, foreign-unit denied
  ---
  duration_ms: 304.850698
  type: 'test'
  ...
```

### manager requests corrections and forwards exactly one pending UBS under concurrency

```text
# Subtest: manager requests corrections and forwards exactly one pending UBS under concurrency
ok 6 - manager requests corrections and forwards exactly one pending UBS under concurrency
  ---
  duration_ms: 254.761528
  type: 'test'
  ...
```

### verified PAP_ADMIN activation atomic and concurrent repeat records one activation

```text
# Subtest: verified PAP_ADMIN activation atomic and concurrent repeat records one activation
ok 10 - verified PAP_ADMIN activation atomic and concurrent repeat records one activation
  ---
  duration_ms: 230.680504
  type: 'test'
  ...
```

### privileged services bind MFA to exact actor session, not any verified sibling session

```text
# Subtest: privileged services bind MFA to exact actor session, not any verified sibling session
ok 8 - privileged services bind MFA to exact actor session, not any verified sibling session
  ---
  duration_ms: 22.666477
  type: 'test'
  ...
```

### PAP_ADMIN revocation of Manager immediately affects the same verified session

```text
# Subtest: PAP_ADMIN revocation of Manager immediately affects the same verified session
ok 24 - PAP_ADMIN revocation of Manager immediately affects the same verified session
  ---
  duration_ms: 77.174998
  type: 'test'
  ...
```

### Asserções executadas: global nonclinical roles denied clinical GET/POST/PATCH with forged org and demo query

```ts
test("global nonclinical roles denied clinical GET/POST/PATCH with forged org and demo query", async () => {
  for (const person of [admin, manager, commercial])
    for (const [handler, method, path, body] of [
      [clinicalGet, "GET", ["patients"], undefined],
      [clinicalPost, "POST", ["patients"], { fullName: "Synthetic" }],
      [
        clinicalPatch,
        "PATCH",
        ["patients", randomUUID()],
        { fullName: "Synthetic" },
      ],
    ] as const) {
      const response = await handler(
        request(
          `/api/clinical/${path.join("/")}?mode=demo&organizationId=${pendingId}`,
          person.token,
          body,
          method,
          { "x-organization-id": pendingId },
        ),
        { params: Promise.resolve({ path: [...path] }) },
      );
      assert.equal(response.status, 403);
    }
});
```

### Asserções executadas: manager requests corrections and forwards exactly one pending UBS under concurrency

```ts
test("manager requests corrections and forwards exactly one pending UBS under concurrency", async () => {
  const body = publicBody();
  assert.equal(
    (await submit(request("/api/organization-requests", undefined, body)))
      .status,
    202,
  );
  candidateId = (
    await db.organizationCandidate.findFirstOrThrow({
      where: { name: body.name },
    })
  ).id;
  cityId = admin.unit.parentId!;
  await db.organization.update({
    where: { id: cityId },
    data: { city: body.city, state: body.state },
  });
  assert.equal(
    (
      await review(
        request("/api/admin/beta/requests", manager.token, {
          id: candidateId,
          decision: "REQUEST_CHANGES",
          reason: "Conferir identificação institucional",
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await db.organizationCandidate.findUniqueOrThrow({
        where: { id: candidateId },
      })
    ).status,
    "CHANGES_REQUESTED",
  );
  assert.equal(await db.organization.count({ where: { name: body.name } }), 0);
  const results = await Promise.all(
    [1, 2].map(() =>
      review(
        request("/api/admin/beta/requests", manager.token, {
          id: candidateId,
          decision: "APPROVE",
          municipalityId: cityId,
          reason: "Análise institucional concluída",
        }),
      ),
    ),
  );
  for (const result of results) assert.equal(result.status, 200);
  const after = await db.organizationCandidate.findUniqueOrThrow({
    where: { id: candidateId },
  });
  pendingId = after.convertedOrganizationId!;
  assert.equal(after.status, "READY_FOR_ACTIVATION");
  const org = await db.organization.findUniqueOrThrow({
    where: { id: pendingId },
  });
  assert.equal(org.status, "PENDING_VERIFICATION");
  assert.equal(org.isActive, false);
  assert.equal(await db.organization.count({ where: { name: body.name } }), 1);
  assert.equal(
    await db.organizationRequest.count({
      where: { candidateId, status: "REQUESTED" },
    }),
    1,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { resourceId: candidateId, action: "REQUEST_FORWARDED" },
    }),
    1,
  );
  assert.equal(
    (
      await invite(
        request("/api/admin/beta/invitations", manager.token, {
          operation: "BOOTSTRAP",
          organizationId: pendingId,
        }),
      )
    ).status,
    400,
  );
});
```

### Asserções executadas: verified PAP_ADMIN activation atomic and concurrent repeat records one activation

```ts
test("verified PAP_ADMIN activation atomic and concurrent repeat records one activation", async () => {
  for (const result of await Promise.all(
    [1, 2].map(() =>
      lifecycle(
        request(orgPath(), admin.token, { operation: "ACTIVATE" }, "PATCH"),
        orgContext(),
      ),
    ),
  ))
    assert.equal(result.status, 200);
  const org = await db.organization.findUniqueOrThrow({
    where: { id: pendingId },
  });
  assert.equal(org.status, "ACTIVE");
  assert.equal(org.isActive, true);
  assert.equal(
    (
      await db.organizationCandidate.findUniqueOrThrow({
        where: { id: candidateId },
      })
    ).status,
    "APPROVED",
  );
  assert.equal(
    await db.organizationRequest.count({
      where: { candidateId, status: "RESOLVED" },
    }),
    1,
  );
  for (const [resourceId, action] of [
    [pendingId, "ORGANIZATION_ACTIVATED"],
    [candidateId, "REQUEST_ACTIVATED"],
  ])
    assert.equal(
      await db.auditEvent.count({ where: { resourceId, action } }),
      1,
    );
  assert.equal(
    (
      await invite(
        request("/api/admin/beta/invitations", manager.token, {
          operation: "BOOTSTRAP",
          organizationId: pendingId,
        }),
      )
    ).status,
    201,
  );
});
```

### Navegador: direct clinical HTML/RSC denied to anonymous/Admin/Manager/Commercial/unassigned without redirect loops

```ts
test("direct clinical HTML/RSC denied to anonymous/Admin/Manager/Commercial/unassigned without redirect loops", async ({
  page,
}) => {
  const people = [
    undefined,
    await actor(),
    await actor("PAP_MANAGER"),
    await actor("COMMERCIAL"),
    await actor(),
  ];
  await db.roleAssignment.deleteMany({ where: { userId: people[4]!.user.id } });
  const marker = `clinical-secret-${randomUUID()}`;
  const patient = await db.patient.create({
    data: {
      fullName: marker,
      birthDate: new Date("1990-01-01"),
      organizations: { create: { organizationId: people[1]!.unit.id } },
    },
  });
  for (const person of people) {
    await page.context().clearCookies();
    if (person) await cookie(page, person.token);
    let docs = 0;
    const listener = () => docs++;
    page.on("framenavigated", listener);
    for (const path of [
      "/dashboard",
      "/pacientes",
      `/pacientes/${patient.id}`,
      "/registro",
      "/atendimentos",
    ]) {
      const html = await page.request.get(path, { maxRedirects: 0 });
      expect([307, 308]).toContain(html.status());
      expect((await html.text()).includes(marker)).toBe(false);
      const rsc = await page.request.get(path, {
        headers: { RSC: "1", "Next-Router-Prefetch": "1" },
        maxRedirects: 0,
      });
      expect([307, 308]).toContain(rsc.status());
      expect((await rsc.text()).includes(marker)).toBe(false);
    }
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).pathname === "/dashboard").toBe(false);
    expect((await page.content()).includes(marker)).toBe(false);
    expect(docs <= 4).toBe(true);
    page.off("framenavigated", listener);
  }
});
```

### Navegador: Manager institutional directory excludes private values from API, HTML and RSC

```ts
test("Manager institutional directory excludes private values from API, HTML and RSC", async ({ page }) => {
  const manager = await actor("PAP_MANAGER"), foreign = await actor();
  const marker = `private-org-${randomUUID()}`;
  const publicName = `Unidade institucional ${randomUUID()}`;
  await db.organization.update({
    where: { id: foreign.unit.id },
    data: { name: publicName, settings: { private: marker }, address: marker, code: marker, cnes: marker, cnpj: marker },
  });
  await cookie(page, manager.token);
  const api = await page.request.get("/api/admin/organizations");
  expect(api.status()).toBe(200);
  const body = await api.json();
  expect(JSON.stringify(body).includes(marker)).toBe(false);
  const row = body.organizations.find((o: { id: string }) => o.id === foreign.unit.id);
  expect(Object.keys(row).sort()).toEqual([
    "_count", "city", "id", "isActive", "name", "parent", "parentId", "state", "status", "type",
  ].sort());
  expect(Object.keys(row._count)).toEqual(["children"]);
  const variants: Record<string, string>[] = [{}, { RSC: "1", "Next-Router-Prefetch": "1" }];
  for (const headers of variants) {
    const response = await page.request.get("/admin/organizacoes", { headers });
    expect(response.status()).toBe(200);
    expect((await response.text()).includes(marker)).toBe(false);
  }
  await page.goto("/admin/organizacoes");
  await page.getByRole("textbox", { name: "Buscar organização" }).fill(publicName);
  await expect(page.getByText(publicName, { exact: true })).toBeVisible();
  expect((await page.content()).includes(marker)).toBe(false);
});
```

### Saída real dos cinco E2E

```text
PASSED: Manager desktop/mobile/dark authorized controls, keyboard and WCAG AA
PASSED: Admin explicitly activates a reviewed pending UBS; Manager never sees activation
PASSED: direct clinical HTML/RSC denied to anonymous/Admin/Manager/Commercial/unassigned without redirect loops
PASSED: Manager institutional directory excludes private values from API, HTML and RSC
PASSED: Professional without mandatory MFA can access own clinical pages, foreign record denied by API
```
O teste direto percorre anônimo, PAP_ADMIN, PAP_MANAGER, COMMERCIAL e usuário sem papel em `/dashboard`, `/pacientes`, `/pacientes/[id]`, `/registro`, `/atendimentos`: HTML e RSC retornam 307/308, marcador clínico ausente e navegação real termina fora do dashboard sem loop (até quatro navegações). Profissional sem novo MFA obrigatório acessa sua UBS, unidade alheia 403. As APIs clínicas GET/POST/PATCH negam os três papéis globais mesmo com organização forjada e `mode=demo`. Layout e páginas possuem guard, além da autorização no DAL/API. Não foi executado o produto cartesiano de todas as páginas com todos os papéis; a cobertura concreta é a descrita e o código acima.
## 5. MFA, transações, concorrência e preservação do legado

`requireAdminActor(..., tx)` valida **a sessão exata**: vínculo do usuário, atividade, expiração, revogação, mfaVerifiedAt compatível com criação da sessão e fator TOTP ativo/enabledAt. Outra sessão MFA do mesmo usuário não serve. As rotas extraem o ator/token do cookie e mantêm origem/CSRF.

| Operação | Verificação dentro da transação | Concorrência executada |
|---|---|---|
| Atribuir/revogar papel | requireRoleMutation: MFA com tx, perfil efetivo com tx; Admin global + role.manage ou Manager somente Commercial global, outro usuário e alvo sem privilégio protegido; atribuição atual/último Admin e auditoria no tx | SERIALIZABLE, até três tentativas P2034; teste F04 impede duas auto-revogações de remover todos os Admins |
| Criar organização | MFA com tx e organization.manage no parent com tx; criação/evento juntos | SERIALIZABLE, helper até cinco tentativas P2034/P2002 |
| Revisar solicitação | MFA e requirePapReviewer com tx; papel global canônico e organization.request.review; consentimento/estado/município no tx | Duas revisões concorrentes retornam 200 e deixam uma UBS pendente/um REQUEST_FORWARDED |
| Lifecycle UBS | MFA, IAM/escopo e PAP_ADMIN global + permissão específica com tx; candidato/request/organização e evento juntos | Duas ativações retornam 200; mesma UBS ACTIVE e um evento de ativação |
| Emitir/aceitar convite | Escopo/autoridade do emissor e elegibilidade do alvo rechecados com tx; autoconvite Manager e papéis protegidos negados | Lock/transação preexistente; revogação/elevação entre emissão e aceite testadas, sem consumir convite negado |

**Limites reais:** senha/TOTP fresco para arquivamento são verificados por requireReauthentication antes do tx; dentro dele são rechecados sessão/MFA, IAM, estado e nome. Convites administrativos mantêm MFA no guard HTTP, mas não revalidam a sessão em todos os callbacks de convite; aceite público usa o token de convite, preservando primeiro acesso. Nem todo callback de convite é SERIALIZABLE. **NOT RUN:** corrida determinística intercalando reset/revogação MFA ou revogação IAM exatamente entre leitura e commit de outra operação. SERIALIZABLE admite ordem serial válida, não garante cancelamento retroativo de operação já em voo. Testes provam last-admin, idempotência, concorrência de estado e negação de chamadas posteriores à revogação; não se afirma garantia mais ampla.

### Teste F04 real de último Admin concorrente

```ts
test("two simultaneous self-revocations cannot remove all PAP admins", async () => {
  const adminA = await papAdmin("race-a@example.test")
  const adminB = await papAdmin("race-b@example.test")
  const roles = await db.roleAssignment.findMany({
    where: { role: { key: "PAP_ADMIN" } },
  })
  assert.equal(roles.length, 2)
  const assignmentA = roles.find((entry) => entry.userId === adminA.id)
  const assignmentB = roles.find((entry) => entry.userId === adminB.id)
  assert.ok(assignmentA)
  assert.ok(assignmentB)
  const outcomes = await Promise.allSettled([
    revokeAdminRoleAssignment({
      actorUserId: adminA.id, assignmentId: assignmentA.id,
    }),
    revokeAdminRoleAssignment({
      actorUserId: adminB.id, assignmentId: assignmentB.id,
    }),
  ])
  assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1)
  assert.equal(
    await db.roleAssignment.count({
      where: { role: { key: "PAP_ADMIN" }, user: { isActive: true } },
    }),
    1,
  )
  assert.equal(
    await db.auditEvent.count({ where: { action: "ROLE_REVOKED" } }),
    1,
  )
})
```

```text
# Subtest: two simultaneous self-revocations cannot remove all PAP admins
ok 6 - two simultaneous self-revocations cannot remove all PAP admins
  ---
  duration_ms: 286.164036
  type: 'test'
  ...
1..6
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 14138.512568

F04.4 G ROLE GOVERNANCE: PASS

> pap-saude@0.1.0 test:f04:admin-core
> bash scripts/test-f04-admin-core.sh


========================================
 F04 ADMIN CORE INTEGRATION
========================================

==> create isolated test database
CREATE DATABASE

==> migrations
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pap_saude_f04_admin_core_test", schema "public" at "localhost:5432"

30 migrations found in prisma/migrations

Applying migration `20260909150044_init_clinical_schema`
Applying migration `20260926001330_foundation_01`
Applying migration `20260926014952_foundation_02_identity`
Applying migration `20260926210500_foundation_02_email_identity`
Applying migration `20260926220000_foundation_02_login_abuse_protection`
Applying migration `20260927001500_foundation_02_mfa_challenge`
Applying migration `20260927033000_foundation_02_mfa_reset`
Applying migration `20260927043000_foundation_02_organization_lifecycle`
Applying migration `20260927050000_foundation_02_membership_discovery`
Applying migration `20261002010000_foundation_02_roles_permissions`
Applying migration `20261002020000_foundation_02_product_activity`
Applying migration `20261002030000_foundation_02_organization_metrics`
Applying migration `20261002040000_foundation_02_feedback`
Applying migration `20261002050000_foundation_02_health_alerts`
Applying migration `20261003010000_foundation_03_patient_registry_core`
Applying migration `20261003020000_foundation_03_pregnancy_core`
Applying migration `20261003030000_foundation_03_encounter_core`
Applying migration `20261003040000_foundation_03_vital_signs_core`
Applying migration `20261003050000_foundation_03_obstetric_data_core`
Applying migration `20261003060000_foundation_03_allergies_clinical_flags`
Applying migration `20261003070000_foundation_03_meows_engine`
Applying migration `20261005080000_foundation_03_clinical_revision_authorization`
Applying migration `20261007094500_foundation_04_user_invitations`
Applying migration `20261007101500_foundation_04_onboarding`
Applying migration `20261016010000_foundation_04_password_reset_token`
Applying migration `20261016200000_foundation_04_admin_audit_indexes`
Applying migration `20261016210000_foundation_04_audit_integrity`
Applying migration `20261019010000_foundation_04_schema_parity`
Applying migration `20261020000000_admin_beta1`
Applying migration `20261022040000_mission04_delegated_governance`

The following migration(s) have been applied:

migrations/
  └─ 20260909150044_init_clinical_schema/
    └─ migration.sql
  └─ 20260926001330_foundation_01/
    └─ migration.sql
  └─ 20260926014952_foundation_02_identity/
    └─ migration.sql
  └─ 20260926210500_foundation_02_email_identity/
    └─ migration.sql
  └─ 20260926220000_foundation_02_login_abuse_protection/
    └─ migration.sql
  └─ 20260927001500_foundation_02_mfa_challenge/
    └─ migration.sql
  └─ 20260927033000_foundation_02_mfa_reset/
    └─ migration.sql
  └─ 20260927043000_foundation_02_organization_lifecycle/
    └─ migration.sql
  └─ 20260927050000_foundation_02_membership_discovery/
    └─ migration.sql
  └─ 20261002010000_foundation_02_roles_permissions/
    └─ migration.sql
  └─ 20261002020000_foundation_02_product_activity/
    └─ migration.sql
  └─ 20261002030000_foundation_02_organization_metrics/
    └─ migration.sql
  └─ 20261002040000_foundation_02_feedback/
    └─ migration.sql
  └─ 20261002050000_foundation_02_health_alerts/
    └─ migration.sql
  └─ 20261003010000_foundation_03_patient_registry_core/
    └─ migration.sql
  └─ 20261003020000_foundation_03_pregnancy_core/
    └─ migration.sql
  └─ 20261003030000_foundation_03_encounter_core/
    └─ migration.sql
  └─ 20261003040000_foundation_03_vital_signs_core/
    └─ migration.sql
  └─ 20261003050000_foundation_03_obstetric_data_core/
    └─ migration.sql
  └─ 20261003060000_foundation_03_allergies_clinical_flags/
    └─ migration.sql
  └─ 20261003070000_foundation_03_meows_engine/
    └─ migration.sql
  └─ 20261005080000_foundation_03_clinical_revision_authorization/
    └─ migration.sql
  └─ 20261007094500_foundation_04_user_invitations/
    └─ migration.sql
  └─ 20261007101500_foundation_04_onboarding/
    └─ migration.sql
  └─ 20261016010000_foundation_04_password_reset_token/
    └─ migration.sql
  └─ 20261016200000_foundation_04_admin_audit_indexes/
    └─ migration.sql
  └─ 20261016210000_foundation_04_audit_integrity/
    └─ migration.sql
  └─ 20261019010000_foundation_04_schema_parity/
    └─ migration.sql
  └─ 20261020000000_admin_beta1/
    └─ migration.sql
  └─ 20261022040000_mission04_delegated_governance/
    └─ migration.sql

All migrations have been successfully applied.

==> database safety
ALTER TABLE
TEST CLEANUP MODE: ephemeral pap_saude_f04_admin_core_test only; audit immutability is tested in separate protected database
database=pap_saude_f04_admin_core_test

==> admin HTTP integration
TAP version 13
```
### Upgrade legado efetivamente repetido

29 migrations anteriores + dados sintéticos populados; nova SQL duas vezes e bootstrap duas vezes. Comparações por igualdade de User/PasswordCredential/Session/MfaFactor/recuperação/challenges/papéis/vínculos/onboarding e organizações/candidatos/requests/convites. Mesma sessão aceita e novo login com **senha e TOTP existentes**; nenhum Manager atribuído automaticamente. O teste não imprime senha, segredo ou linhas privadas.

```text
# Subtest: forward-only upgrade of populated Beta preserves identities/password/TOTP/sessions/memberships/approved UBS/invites; bootstrap idempotent
ok 28 - forward-only upgrade of populated Beta preserves identities/password/TOTP/sessions/memberships/approved UBS/invites; bootstrap idempotent
  ---
  duration_ms: 5012.020271
  type: 'test'
  ...
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 18558.563015
PASSED: Manager desktop/mobile/dark authorized controls, keyboard and WCAG AA
PASSED: Admin explicitly activates a reviewed pending UBS; Manager never sees activation
PASSED: direct clinical HTML/RSC denied to anonymous/Admin/Manager/Commercial/unassigned without redirect loops
PASSED: Manager institutional directory excludes private values from API, HTML and RSC
PASSED: Professional without mandatory MFA can access own clinical pages, foreign record denied by API
```

```ts
test("forward-only upgrade of populated Beta preserves identities/password/TOTP/sessions/memberships/approved UBS/invites; bootstrap idempotent", async () => {
  assert.equal(
    new URL(process.env.DATABASE_URL!).pathname,
    "/pap_saude_m04_b_test",
  );
  assert.equal(
    execFileSync(
      "docker",
      [
        "inspect",
        "-f",
        '{{index .Config.Labels "pap.disposable"}}',
        "pap_saude_db",
      ],
      { encoding: "utf8" },
    ).trim(),
    "f0410",
  );
  const name = `pap_m04_b_upgrade_${process.pid}`;
  const admin = new pg.Client({
    connectionString:
      "postgresql://pap_user:pap_password@127.0.0.1:5432/postgres",
  });
  await admin.connect();
  const connectionString = `postgresql://pap_user:pap_password@127.0.0.1:5432/${name}`;
  const client = new pg.Client({ connectionString });
  let disconnect: (() => Promise<void>) | undefined;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    await client.connect();
    const migration = "20261022040000_mission04_delegated_governance";
    for (const directory of readdirSync("prisma/migrations")
      .filter((d) => d < migration && d !== "migration_lock.toml")
      .sort())
      await client.query(
        readFileSync(`prisma/migrations/${directory}/migration.sql`, "utf8"),
      );
    process.env.DATABASE_URL = connectionString;
    const { db } = await import("../../src/server/db/client");
    disconnect = () => db.$disconnect();
    const { SYSTEM_ROLES } = await import(
      "../../src/server/iam/system-role-catalog"
    );
    const { ALL_PERMISSION_KEYS } = await import(
      "../../src/server/iam/permissions"
    );
    const added = new Set([
      "organization.activate",
      "organization.deactivate",
      "organization.delete",
      "organization.request.review",
      "institution.invite",
      "role.assign_commercial",
    ]);
    for (const key of ALL_PERMISSION_KEYS.filter((k) => !added.has(k)))
      await db.permission.create({ data: { key } });
    for (const definition of SYSTEM_ROLES.filter(
      (r) => r.key !== "PAP_MANAGER",
    )) {
      const role = await db.role.create({
        data: { key: definition.key, name: definition.name, system: true },
      });
      const keys = [
        ...definition.permissions.filter((k) => !added.has(k)),
        ...(definition.key === "COMMERCIAL" ? ["organization.read"] : []),
      ];
      const permissions = await db.permission.findMany({
        where: { key: { in: keys } },
      });
      await db.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
    const { verifiedLoginFixture, navigationFingerprint } = await import(
      "../first-access/login-fixtures"
    );
    const { fixture } = await import("../first-access/fixtures");
    const { createProfessionalInvitation } = await import(
      "../../src/server/invitations/invitation.service"
    );
    const f = await verifiedLoginFixture();
    const professional = await fixture("PROFESSIONAL");
    const candidate = await db.organizationCandidate.create({
      data: {
        type: "HEALTH_UNIT",
        name: "UBS legada aprovada",
        normalizedName: "ubs legada aprovada",
        dedupeKey: randomUUID(),
        status: "APPROVED",
        convertedOrganizationId: f.unit.id,
        consentedAt: new Date(),
        contactEmail: `${randomUUID()}@synthetic.invalid`,
      },
    });
    await db.organizationRequest.create({
      data: { candidateId: candidate.id, status: "RESOLVED" },
    });
    await createProfessionalInvitation({
      invitedByUserId: f.user.id,
      organizationId: f.unit.id,
      email: `${randomUUID()}@synthetic.invalid`,
      displayName: "Convite legado",
    });
    const beforeAdmin = await navigationFingerprint(f.user.id),
      beforeProfessional = await navigationFingerprint(professional.user.id);
    const snapshot = async () =>
      JSON.stringify(
        await Promise.all([
          db.organization.findMany({ orderBy: { id: "asc" } }),
          db.organizationCandidate.findMany({ orderBy: { id: "asc" } }),
          db.organizationRequest.findMany({ orderBy: { id: "asc" } }),
          db.userInvitation.findMany({ orderBy: { id: "asc" } }),
        ]),
      );
    const before = await snapshot();
    const sql = readFileSync(
      `prisma/migrations/${migration}/migration.sql`,
      "utf8",
    );
    await client.query(sql);
    await client.query(sql);
    const { bootstrapSystemIam } = await import(
      "../../src/server/iam/bootstrap.service"
    );
    await bootstrapSystemIam();
    await bootstrapSystemIam();
    assert.equal(
      beforeAdmin === (await navigationFingerprint(f.user.id)),
      true,
    );
    assert.equal(
      beforeProfessional ===
        (await navigationFingerprint(professional.user.id)),
      true,
    );
    assert.equal(before === (await snapshot()), true);
    assert.equal(await db.role.count({ where: { key: "PAP_MANAGER" } }), 1);
    assert.equal(
      await db.roleAssignment.count({
        where: { role: { key: "PAP_MANAGER" } },
      }),
      0,
    );
    assert.equal(
      await db.rolePermission.count({
        where: {
          role: { key: "COMMERCIAL" },
          permission: { key: "organization.read" },
        },
      }),
      0,
    );
    const { requireAdminActor } = await import(
      "../../src/server/admin/admin-session.service"
    );
    assert.equal(
      (await requireAdminActor(f.user.id, f.verified.sessionToken)).user.id,
      f.user.id,
    );
    const { authenticateLogin } = await import(
      "../../src/server/auth/login.service"
    );
    const { completeMfaLogin } = await import(
      "../../src/server/auth/mfa-login.service"
    );
    const { decryptSecret } = await import(
      "../../src/server/security/secret-encryption"
    );
    const factor = await db.mfaFactor.findFirstOrThrow({
      where: { userId: f.user.id, status: "ACTIVE" },
    });
    const login = await authenticateLogin({
      email: f.user.email,
      password: f.password,
      origin: "legacy-upgrade-test",
    });
    assert.equal(login.status, "MFA_REQUIRED");
    if (login.status !== "MFA_REQUIRED")
      throw new Error("Expected MFA challenge");
    const code = new OTPAuth.TOTP({
      secret: decryptSecret(factor.secretEncrypted),
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    }).generate();
    const verified = await completeMfaLogin({
      challengeToken: login.challengeToken,
      code,
    });
    assert.equal(
      (await requireAdminActor(f.user.id, verified.sessionToken)).user.id,
      f.user.id,
    );
  } finally {
    await disconnect?.();
    await client.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
});
```

**Conta real do operador após upgrade: NOT RUN.** Não foi acessada nem migrada. A preservação foi demonstrada no legado sintético, não por login na conta real. O bootstrap não mudou e não escreve credenciais/MFA; a SQL não altera identidades, organizações ou vínculos legados.
## 6. Matriz de execuções desta correção

Node **22.23.3**, com caches próprios `/tmp/pap-m04-npm` e `/tmp/pap-m04-b-verify-cache` (F03 reexecutado e gates finais), via `npm_config_cache=<cache> npm exec --yes --package=node@22.23.3 -- bash -c <comando>`. Browsers com `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`. PostgreSQL próprio descartável `pap_saude_db`, bind 127.0.0.1:5432, labels `pap.disposable=f0410`, `pap.mission=m04-b-audit-complement`; não é o laboratório do operador. Cada suíte cria seus bancos sintéticos próprios. O e-mail de demonstração não faz entrega externa.

| Comando executado | Resultado | Quantidade |
|---|---|---|
| npm run test:mission04:b:browser | PASS | 28 Node + 5 E2E, sem skips/fails |
| bash .test-audit/m04-b-final-review/run-privacy-probe.sh | PASS | 2/2, saída integral acima |
| npm run test:first-access:browser | PASS | 21 itens Node (19 casos + 2 grupos) + 15 E2E |
| npm run test:auth | PASS | 202 testes |
| npm run test:admin:beta1 | PASS | 29 itens, incluindo grupos |
| npm run test:f03:smart:force | PASS | 9/9 módulos, sem cache |
| npm run audit:f04:operations | PASS | 78 Node, SQL, TypeScript, ESLint e build |
| node scripts/security/guard-f04-ci-workflow.mjs; node --test tests/security/f04-ci-workflow.test.mjs | PASS | guard + 2 testes, sem SSH real |
| node --test tests/security/f04-migration-preflight.test.mjs | PASS | 1 teste, preflight/restauração sintéticos |
| bash scripts/test-f04-role-separation.sh | PASS | grants runtime/migrator e escalada/DDL negados |
| docker build --target runner / migrator | PASS | duas imagens locais; argumentos de infraestrutura abaixo |
| bash scripts/test-f04-migrator-image.sh pap-saude-migrator:m04-b-audit | PASS | legacy/fresh/replay/failure gate, backup/restauração |
| bash scripts/test-f04-web-image.sh pap-saude:m04-b-audit pap-saude-migrator:m04-b-audit | PASS | não root, health/login, runtime DB mínimo |
| bash scripts/security/scan-f04-images.sh pap-saude:m04-b-audit pap-saude-migrator:m04-b-audit | PASS | scanner exit 0 nas duas imagens, zero HIGH/CRITICAL |
| npm audit --json | FAIL por risco herdado | nove altas dev; não corrigidas automaticamente |
| npm audit --omit=dev --json; npm audit --prefix docker/migrator --include=dev --json | PASS | zero achados em ambas |
| test:local-dev / npm ci | NOT RUN nesta etapa | execução histórica registrada no relatório B; dependências inalteradas; nenhum init/admin/reset aqui |
| CI remoto B / homologação manual / deploy | NOT RUN | commit/push não autorizados; laboratório e VPS intocados |

### final — totais TAP reais

```text
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### first-access — totais TAP reais

```text
# tests 21
# suites 0
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### auth — totais TAP reais

```text
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### beta — totais TAP reais

```text
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### f04 — totais TAP reais

```text
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### F03 — saída real

```text
 └─ 20261007094500_foundation_04_user_invitations/
    └─ migration.sql
  └─ 20261007101500_foundation_04_onboarding/
    └─ migration.sql
  └─ 20261016010000_foundation_04_password_reset_token/
    └─ migration.sql
  └─ 20261016200000_foundation_04_admin_audit_indexes/
    └─ migration.sql
  └─ 20261016210000_foundation_04_audit_integrity/
    └─ migration.sql
  └─ 20261019010000_foundation_04_schema_parity/
    └─ migration.sql
  └─ 20261020000000_admin_beta1/
    └─ migration.sql
  └─ 20261022040000_mission04_delegated_governance/
    └─ migration.sql

All migrations have been successfully applied.

==> database safety
ALTER TABLE
TEST CLEANUP MODE: ephemeral pap_saude_f03_clinical_governance_test only; audit immutability is tested in separate protected database
database=pap_saude_f03_clinical_governance_test

==> revision validation
TAP version 13
# Subtest: revision reason is trimmed
ok 1 - revision reason is trimmed
  ---
  duration_ms: 0.902677
  type: 'test'
  ...
# Subtest: blank revision reason is rejected
ok 2 - blank revision reason is rejected
  ---
  duration_ms: 0.546682
  type: 'test'
  ...
# Subtest: revision requires an actual snapshot change
ok 3 - revision requires an actual snapshot change
  ---
  duration_ms: 0.183225
  type: 'test'
  ...
# Subtest: different snapshots are accepted
ok 4 - different snapshots are accepted
  ---
  duration_ms: 0.209355
  type: 'test'
  ...
1..4
# tests 4
# suites 0
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 224.859178

==> governance integration
TAP version 13
# Subtest: professional has patient clinical scope in own unit
ok 1 - professional has patient clinical scope in own unit
  ---
  duration_ms: 670.426854
  type: 'test'
  ...
# Subtest: resource resolver enforces encounter organization scope
ok 2 - resource resolver enforces encounter organization scope
  ---
  duration_ms: 294.792555
  type: 'test'
  ...
# Subtest: clinical revision records immutable before and after snapshots
ok 3 - clinical revision records immutable before and after snapshots
  ---
  duration_ms: 705.067759
  type: 'test'
  ...
# Subtest: vital signs resolve back to encounter patient and organization
ok 4 - vital signs resolve back to encounter patient and organization
  ---
  duration_ms: 357.708812
  type: 'test'
  ...
# Subtest: unlink revokes centralized clinical access
ok 5 - unlink revokes centralized clinical access
  ---
  duration_ms: 321.296983
  type: 'test'
  ...
# Subtest: professional can read clinical revision history
ok 6 - professional can read clinical revision history
  ---
  duration_ms: 199.701747
  type: 'test'
  ...
# Subtest: PAP admin has no default clinical revision access
ok 7 - PAP admin has no default clinical revision access
  ---
  duration_ms: 184.483426
  type: 'test'
  ...
1..7
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 13382.185116

==> cleanup verification
audit_events=0 patients=0

========================================
 F03.8 + F03.9 GOVERNANCE: PASS
========================================
PASS  clinical-governance (24644ms)

========================================
 F03 SMART TEST SUMMARY
========================================
changed=78
direct=9
selected=9
PASS        clinical-api-ui
PASS        patient
PASS        pregnancy
PASS        encounter
PASS        vital-signs
PASS        obstetric-data
PASS        allergies-flags
PASS        meows
PASS        clinical-governance

F03 SMART TEST: PASS
```

### Container/scanner — evidência real

```text
izations_hierarchy_guard   | O
(3 rows)

NOTICE:  patients count=0
NOTICE:  clinical_evaluations count=0
DO
COMMIT
UPDATE 1
PASS failed migration blocks web startup contract (VPS script unverified)
CREATE TYPE
CREATE TYPE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
ALTER TABLE
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pap_f0410_engine_failure", schema "public" at "pap-f0410-pg-173460-21324:5432"

Migration 20260909150044_init_clinical_schema marked as applied.

CREATE TYPE
PASS actual Prisma SQL failure blocks web startup contract
F04.10 MIGRATOR FUNCTIONAL CI GATE: PASS
```

```text
tegrity/
    └─ migration.sql
  └─ 20261019010000_foundation_04_schema_parity/
    └─ migration.sql
  └─ 20261020000000_admin_beta1/
    └─ migration.sql
  └─ 20261022040000_mission04_delegated_governance/
    └─ migration.sql

All migrations have been successfully applied.
PASS migration history: 30
BEGIN
 set_config
-------------
 pap_runtime
(1 row)

  set_config
--------------
 pap_migrator
(1 row)

DO
REVOKE
GRANT
GRANT
GRANT
GRANT
GRANT
REVOKE
REVOKE
GRANT
ALTER DEFAULT PRIVILEGES
ALTER DEFAULT PRIVILEGES
COMMIT
ALTER ROLE
PASS runner non-root, liveness, login render and runtime DB-backed denied authentication
PASS runtime role persisted login attempt without migration credentials
```

```text
Scanner exit for pap-saude:m04-b-audit: 0
Scanner exit for pap-saude-migrator:m04-b-audit: 0
```

```text
[
  {
    "tag": "pap-saude:m04-b-audit",
    "id": "sha256:59f447ad15a863a813beb4282091f21da512c2edeb6f548e937caeb15ef90b2f",
    "user": "nextjs"
  },
  {
    "tag": "pap-saude-migrator:m04-b-audit",
    "id": "sha256:a67cfb42a3a3a0be42440e29baee4942e2216ab306effbaf242d6dac3fcb4adc",
    "user": "node"
  }
]
```
Os builds usaram `DOCKER_CONFIG=/tmp/pap-m04-b-audit-docker`, `--add-host proxy:<IP resolvido nesta nuvem>`, `--build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY` e `--secret id=build_ca,src=$NODE_EXTRA_CA_CERTS`; a CA não é incorporada à imagem final. O scanner usa F04_DOCKER_PROXY_HOST/IP para o mesmo proxy da nuvem, sem alterar configuração do laboratório ou produção.

### Logs executados e hashes finais
- `/tmp/m04-b-complement-final.log`: `8529b780c52281436ce8ee84476d83f3de653bfd2470588d46e9802fde95b056`
- `/tmp/m04-b-complement-probe.log`: `6bb8b6fb6343c7b9966bcfaef52741b0aeebe6dc076842504f2a3654012a261d`
- `/tmp/m04-b-complement-first-access.log`: `70d16e1a2b951739667ba7701799a3b8283868189a3fd0077d54759b6537d233`
- `/tmp/m04-b-complement-auth.log`: `a556b968d0b4fb20b8d03473a82dbea85dc47a5743495ba9016c0e6f7ba42905`
- `/tmp/m04-b-complement-beta.log`: `ac74b43f0ea502b92ba947b37c4e127d9a79b021296ec09cee4925114afb32bc`
- `/tmp/m04-b-complement-f03.log`: `95b6ae140ee32470b9ce27044e1407b80ea5a78a0fb80ffb02d977de7a0c91df`
- `/tmp/m04-b-complement-f04.log`: `a3a1781ce7f28cf639e0a60e866c0e26e47d6ae27851131eab753f614a1ae532`
- `/tmp/m04-b-complement-ci.log`: `1a3ca83d18289796d9c29f6b775eda74ac54565c32e1a2fd117ff89a2772290e`
- `/tmp/m04-b-complement-preflight.log`: `d2e278b1db62cdfa2ca321815984c030ed0b30d5d280024b68ab1e71649c6dda`
- `/tmp/m04-b-complement-roles.log`: `fe4d5bdc96750dd1d45c218abcfcaa1d7edf28b588276c22b306400cfb793cad`
- `/tmp/m04-b-complement-runner-build.log`: `0b2f48b8f1eaff719998145bcfb97cfda6e0d1efbe93f7382f11846231c6abdf`
- `/tmp/m04-b-complement-migrator-build.log`: `5979833c5a3c01ebdb7a845f72f7a20123ee8673d5e09cb48049272d7250c46b`
- `/tmp/m04-b-complement-migrator.log`: `8188918e7dcfa28fee2065f6b2cfb2786d61a3a3154fed63a01251bcfe0f13e5`
- `/tmp/m04-b-complement-web.log`: `67c773da076facd4eea5c0a165cace3cb84cb329de5aa404239decf7a0641a89`
- `/tmp/m04-b-complement-trivy.log`: `8045fa98465c2045c1bac42ab0677ca5fc366009ff2a054cd6611f196a1aafb4`

Manifest de fontes/testes/configuração: **68 arquivos**, SHA-256 agregado `07b23b3a930060524449adbf85ca1f800a9445deea57553d69715ef79084228f`. Os hashes estão em `docs/evidence/missao-04-b/validation.json`. Docker IDs acima correspondem aos builds após a correção; imagens históricas não foram usadas como prova do código novo.
## 7. Auditoria completa de dependências e riscos residuais

Nenhum `npm audit fix` executado; package-locks e versões preservados. A comparação de dependencies/devDependencies/overrides com HEAD retornou igualdade; `git diff -- package-lock.json docker/migrator/package-lock.json` não produziu saída. Saídas atuais de severidades:

### Completa

```json
{
  "info": 0,
  "low": 0,
  "moderate": 0,
  "high": 9,
  "critical": 0,
  "total": 9
}
```

### Produção

```json
{
  "info": 0,
  "low": 0,
  "moderate": 0,
  "high": 0,
  "critical": 0,
  "total": 0
}
```

### Migrator incluindo dev

```json
{
  "info": 0,
  "low": 0,
  "moderate": 0,
  "high": 0,
  "critical": 0,
  "total": 0
}
```
São nove **pacotes afetados de desenvolvimento**, não nove vulnerabilidades raiz independentes. A cadeia inclui braces → micromatch → fast-glob → ferramentas ESLint/shadcn/ts-morph. Advisory GHSA-vfj7-8cjw-p6xm, CVSS 7.5: DoS por exaustão de pilha ao processar padrões profundamente aninhados. O risco herdado permanece nas ferramentas/CI; produção e migrator não apresentam achados nesta consulta. Não há prova de exploração no PAP. Atualização requer tarefa própria com regressão, não mudança automática durante este slice.

### JSON integral do npm audit (incluindo dev), exit 1

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "@next/eslint-plugin-next": {
      "name": "@next/eslint-plugin-next",
      "severity": "high",
      "isDirect": false,
      "via": [
        "fast-glob"
      ],
      "effects": [
        "eslint-config-next"
      ],
      "range": ">=14.3.0-canary.0",
      "nodes": [
        "node_modules/@next/eslint-plugin-next"
      ],
      "fixAvailable": {
        "name": "eslint-config-next",
        "version": "14.2.35",
        "isSemVerMajor": true
      }
    },
    "@shadcn/registry": {
      "name": "@shadcn/registry",
      "severity": "high",
      "isDirect": false,
      "via": [
        "fast-glob"
      ],
      "effects": [
        "shadcn"
      ],
      "range": "<=0.0.0-rc-20261007105214 || >=0.1.0",
      "nodes": [
        "node_modules/@shadcn/registry"
      ],
      "fixAvailable": {
        "name": "shadcn",
        "version": "1.0.0",
        "isSemVerMajor": true
      }
    },
    "@ts-morph/common": {
      "name": "@ts-morph/common",
      "severity": "high",
      "isDirect": false,
      "via": [
        "fast-glob"
      ],
      "effects": [
        "ts-morph"
      ],
      "range": "0.2.0 - 0.24.0 || 0.26.0 - 0.27.0",
      "nodes": [
        "node_modules/@ts-morph/common"
      ],
      "fixAvailable": true
    },
    "braces": {
      "name": "braces",
      "severity": "high",
      "isDirect": false,
      "via": [
        {
          "source": 1240992,
          "name": "braces",
          "dependency": "braces",
          "title": "braces vulnerable to stack-exhaustion denial of service through deeply nested patterns",
          "url": "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
          "severity": "high",
          "cwe": [
            "CWE-674"
          ],
          "cvss": {
            "score": 7.5,
            "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H"
          },
          "range": "<=3.0.3"
        }
      ],
      "effects": [
        "micromatch"
      ],
      "range": "*",
      "nodes": [
        "node_modules/braces"
      ],
      "fixAvailable": {
        "name": "shadcn",
        "version": "1.0.0",
        "isSemVerMajor": true
      }
    },
    "eslint-config-next": {
      "name": "eslint-config-next",
      "severity": "high",
      "isDirect": true,
      "via": [
        "@next/eslint-plugin-next"
      ],
      "effects": [],
      "range": ">=14.3.0-canary.0",
      "nodes": [
        "node_modules/eslint-config-next"
      ],
      "fixAvailable": {
        "name": "eslint-config-next",
        "version": "14.2.35",
        "isSemVerMajor": true
      }
    },
    "fast-glob": {
      "name": "fast-glob",
      "severity": "high",
      "isDirect": false,
      "via": [
        "micromatch"
      ],
      "effects": [
        "@next/eslint-plugin-next",
        "@shadcn/registry",
        "@ts-morph/common",
        "shadcn"
      ],
      "range": "*",
      "nodes": [
        "node_modules/@shadcn/registry/node_modules/fast-glob",
        "node_modules/@ts-morph/common/node_modules/fast-glob",
        "node_modules/fast-glob",
        "node_modules/shadcn/node_modules/fast-glob"
      ],
      "fixAvailable": {
        "name": "shadcn",
        "version": "1.0.0",
        "isSemVerMajor": true
      }
    },
    "micromatch": {
      "name": "micromatch",
      "severity": "high",
      "isDirect": false,
      "via": [
        "braces"
      ],
      "effects": [
        "fast-glob"
      ],
      "range": ">=0.2.0",
      "nodes": [
        "node_modules/micromatch"
      ],
      "fixAvailable": {
        "name": "shadcn",
        "version": "1.0.0",
        "isSemVerMajor": true
      }
    },
    "shadcn": {
      "name": "shadcn",
      "severity": "high",
      "isDirect": true,
      "via": [
        "@shadcn/registry",
        "fast-glob",
        "ts-morph"
      ],
      "effects": [],
      "range": "<=0.0.0-rc-20261007105214 || >=2.0.0",
      "nodes": [
        "node_modules/shadcn"
      ],
      "fixAvailable": {
        "name": "shadcn",
        "version": "1.0.0",
        "isSemVerMajor": true
      }
    },
    "ts-morph": {
      "name": "ts-morph",
      "severity": "high",
      "isDirect": false,
      "via": [
        "@ts-morph/common"
      ],
      "effects": [],
      "range": "6.0.1 - 23.0.0 || 25.0.0 - 26.0.0",
      "nodes": [
        "node_modules/ts-morph"
      ],
      "fixAvailable": true
    }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 9,
      "critical": 0,
      "total": 9
    },
    "dependencies": {
      "prod": 373,
      "dev": 608,
      "optional": 122,
      "peer": 0,
      "peerOptional": 0,
      "total": 1019
    }
  }
}
```
Riscos/limites residuais: nove altas dev; corrida determinística MFA/IAM intercalada não executada; conta real sem homologação; CI remoto B pendente até aprovação/push. Cobertura HTML/RSC é a seleção demonstrada, não uma enumeração exaustiva de todas as combinações de página/papel. Nenhum desses limites é apresentado como teste PASS. A exposição de settings foi corrigida e passou nos testes permanentes e na sonda independente. Não se solicita aprovação de produção.
## 8. Declaração de preservação e decisão

**Declaro explicitamente: nenhum recurso do laboratório manual foi acessado ou alterado nesta etapa.** Não foi acessado o worktree `~/projetos/pap-saude-onboarding`, a branch de testes do operador, `.local`, conta PAP_ADMIN, senha, fator/chave MFA, sessões, banco, volume ou container do laboratório. Não executei local:init, local:admin, resets, migrations ou limpezas nesse ambiente. Não acessei VPS, não fiz merge, deploy, commit ou push. O PR #5 permanece OPEN/draft para develop. Todos os testes de dados foram feitos em recursos descartáveis criados por esta execução ou pelos harnesses de teste com nomes próprios aleatórios. O container principal desta revisão foi removido somente após confirmar as duas labels de propriedade.

Os dois artefatos históricos de QR/performance regenerados pelas suítes foram restaurados exclusivamente nos caminhos conhecidos que estavam limpos no início; não foram misturados ao B. Nenhuma alteração desconhecida foi descartada.

**Decisão:** correção do bloqueio de privacidade validada localmente; revisão humana da auditoria e CI remoto do B permanecem pendentes. Nenhum commit/push até aprovação. **Produção: NO-GO**, sem homologação/autorização/deploy. A auditoria não afirma que validou a conta real ou cancelamento retroativo universal de transações.

### Estado remoto observado (consulta de leitura)

```json
{
  "baseRefName": "develop",
  "headRefName": "feature/ux-iam-convites-vitrine-email",
  "isDraft": true,
  "state": "OPEN",
  "url": "https://github.com/joaoCarlosGM/pap-saude/pull/5"
}
```

### Staging seletivo futuro — apenas referência, NÃO EXECUTADO

A lista inclui este complemento e as evidências. Revalidar status/diff antes de usar após aprovação; não usar git add genérico.

```bash
git add -- \
  .github/workflows/ci.yml \
  docs/codex/AUDITORIA-FINAL-MISSAO-04-B.md \
  docs/codex/RELATORIO-MISSAO-04-SLICE-B.md \
  docs/evidence/missao-04-b/critical-review.md \
  docs/evidence/missao-04-b/final-review-git.txt \
  docs/evidence/missao-04-b/final-review.json \
  docs/evidence/missao-04-b/manager-dark.png \
  docs/evidence/missao-04-b/manager-desktop.png \
  docs/evidence/missao-04-b/manager-mobile.png \
  docs/evidence/missao-04-b/npm-audit-complete.json \
  docs/evidence/missao-04-b/privacy-probe.txt \
  docs/evidence/missao-04-b/validation.json \
  package.json \
  prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql \
  prisma/schema.prisma \
  scripts/test-mission04-b.sh \
  'src/app/(admin)/admin/layout.tsx' \
  'src/app/(admin)/admin/organizacoes/page.tsx' \
  'src/app/(admin)/admin/page.tsx' \
  'src/app/(dashboard)/atendimentos/page.tsx' \
  'src/app/(dashboard)/casos/page.tsx' \
  'src/app/(dashboard)/chat/page.tsx' \
  'src/app/(dashboard)/configuracoes/page.tsx' \
  'src/app/(dashboard)/cursos/page.tsx' \
  'src/app/(dashboard)/dashboard/page.tsx' \
  'src/app/(dashboard)/ferramentas/page.tsx' \
  'src/app/(dashboard)/layout.tsx' \
  'src/app/(dashboard)/pacientes/[id]/page.tsx' \
  'src/app/(dashboard)/pacientes/page.tsx' \
  'src/app/(dashboard)/protocolos/page.tsx' \
  'src/app/(dashboard)/registro/page.tsx' \
  src/app/api/admin/beta/requests/route.ts \
  'src/app/api/admin/organizations/[organizationId]/route.ts' \
  src/app/api/admin/organizations/route.ts \
  'src/app/api/admin/role-assignments/[assignmentId]/route.ts' \
  src/app/api/admin/role-assignments/route.ts \
  src/components/admin/AccessAdminClient.tsx \
  src/components/admin/AdminShell.tsx \
  src/components/admin/AdminSidebar.tsx \
  src/components/admin/AdminTopbar.tsx \
  src/components/admin/BetaInvitationsClient.tsx \
  src/components/admin/BetaRequestsClient.tsx \
  src/components/admin/BetaWidgets.tsx \
  src/components/admin/OrganizationsAdminClient.tsx \
  src/components/admin/admin-theme.css \
  src/components/security/FirstAccessWizard.tsx \
  src/components/security/security-client.ts \
  src/lib/auth/access-destination.ts \
  src/server/admin-beta/invitations.service.ts \
  src/server/admin-beta/policy.ts \
  src/server/admin-beta/requests.service.ts \
  src/server/admin/admin-access.service.ts \
  src/server/admin/admin-http.ts \
  src/server/admin/admin-organizations.service.ts \
  src/server/admin/admin-roles.service.ts \
  src/server/admin/admin-session.service.ts \
  src/server/admin/institutional-invitation-policy.ts \
  src/server/audit/admin-audit-policy.ts \
  src/server/auth/session.service.ts \
  src/server/clinical/clinical-page-session.ts \
  src/server/iam/authorization.service.ts \
  src/server/iam/effective-access-profile.service.ts \
  src/server/iam/permissions.ts \
  src/server/iam/role-assignment.service.ts \
  src/server/iam/system-role-catalog.ts \
  src/server/invitations/invitation.service.ts \
  src/server/organizations/discovery.service.ts \
  tests/admin-beta/journey.integration.test.ts \
  tests/admin/admin-mfa.integration.test.ts \
  tests/admin/f04-audit-idor.integration.test.ts \
  tests/admin/role-adversarial.integration.test.ts \
  tests/admin/role-governance.integration.test.ts \
  tests/helpers/verified-admin-session.ts \
  tests/local/provision.integration.test.ts \
  tests/mission04-b/fixtures.ts \
  tests/mission04-b/governance.spec.ts \
  tests/mission04-b/governance.test.ts \
  tests/mission04-b/legacy-upgrade.test.ts \
  tests/mission04-b/playwright.config.ts
```
## 9. Diff integral solicitado — migration, schema, IAM, bootstrap, papéis, MFA e autorização organizacional

Nenhum hunk omitido. Espaços finais de contexto nas cercas Markdown foram normalizados; o patch bruto completo, incluindo todos os arquivos novos/binários, está em `.test-audit/missao04-b-review.patch`. A primitiva interna assignSystemRole permanece destinada a bootstrap/CLI/fluxos confiáveis; endpoints usam os serviços com ator/MFA do diff, não uma atribuição arbitrária vinda do payload.

### prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql

```diff
diff --git a/prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql b/prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql
new file mode 100644
index 0000000..7cc9c53
--- /dev/null
+++ b/prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql
@@ -0,0 +1,21 @@
+-- Forward-only. Never reclassify existing APPROVED/ACTIVE organizations or identities.
+ALTER TYPE "OrganizationCandidateStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_ACTIVATION';
+ALTER TYPE "OrganizationCandidateStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
+INSERT INTO "permissions" ("id", "key", "description") VALUES
+ (gen_random_uuid()::text, 'organization.activate', 'Activate health units'),
+ (gen_random_uuid()::text, 'organization.deactivate', 'Deactivate health units'),
+ (gen_random_uuid()::text, 'organization.delete', 'Archive health units with strong confirmation'),
+ (gen_random_uuid()::text, 'organization.request.review', 'Review institutional requests without activation'),
+ (gen_random_uuid()::text, 'institution.invite', 'Manage scoped institutional invitations'),
+ (gen_random_uuid()::text, 'role.assign_commercial', 'Authorize Commercial only')
+ON CONFLICT ("key") DO NOTHING;
+INSERT INTO "roles" ("id", "key", "name", "description", "system", "updatedAt")
+VALUES (gen_random_uuid()::text, 'PAP_MANAGER', 'Gerente PAP', 'Delegated institutional governance without clinical access', true, CURRENT_TIMESTAMP)
+ON CONFLICT ("key") DO NOTHING;
+INSERT INTO "role_permissions" ("roleId", "permissionId")
+SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
+WHERE (r."key" = 'PAP_ADMIN' AND p."key" IN ('organization.activate','organization.deactivate','organization.delete','organization.request.review','institution.invite','role.assign_commercial'))
+OR (r."key" = 'PAP_MANAGER' AND p."key" IN ('organization.read','organization.request.review','institution.invite','role.assign_commercial'))
+ON CONFLICT DO NOTHING;
+DELETE FROM "role_permissions" rp USING "roles" r, "permissions" p
+WHERE rp."roleId"=r."id" AND rp."permissionId"=p."id" AND r."key"='COMMERCIAL' AND p."key"='organization.read';
```

### prisma/schema.prisma

```diff
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index abe285e..db465f0 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -60,6 +60,8 @@ enum OnboardingStatus {
 }

 enum OrganizationCandidateStatus {
+  READY_FOR_ACTIVATION
+  CHANGES_REQUESTED
   NEW
   QUALIFYING
   CONTACTED
```

### src/server/iam/permissions.ts

```diff
diff --git a/src/server/iam/permissions.ts b/src/server/iam/permissions.ts
index a94af58..854fb6f 100644
--- a/src/server/iam/permissions.ts
+++ b/src/server/iam/permissions.ts
@@ -2,6 +2,12 @@ export const PERMISSIONS = {
   // Organizations
   ORGANIZATION_READ: "organization.read",
   ORGANIZATION_MANAGE: "organization.manage",
+  ORGANIZATION_ACTIVATE: "organization.activate",
+  ORGANIZATION_DEACTIVATE: "organization.deactivate",
+  ORGANIZATION_DELETE: "organization.delete",
+  ORGANIZATION_REQUEST_REVIEW: "organization.request.review",
+  INSTITUTION_INVITE: "institution.invite",
+  ROLE_ASSIGN_COMMERCIAL: "role.assign_commercial",

   // Memberships
   MEMBERSHIP_READ: "membership.read",
```

### src/server/iam/system-role-catalog.ts

```diff
diff --git a/src/server/iam/system-role-catalog.ts b/src/server/iam/system-role-catalog.ts
index 9fd3a60..a7a624d 100644
--- a/src/server/iam/system-role-catalog.ts
+++ b/src/server/iam/system-role-catalog.ts
@@ -5,6 +5,7 @@ import {

 export const SYSTEM_ROLE_KEYS = {
   PAP_ADMIN: "PAP_ADMIN",
+  PAP_MANAGER: "PAP_MANAGER",
   MUNICIPAL_ADMIN: "MUNICIPAL_ADMIN",
   HEALTH_UNIT_ADMIN: "HEALTH_UNIT_ADMIN",
   PROFESSIONAL: "PROFESSIONAL",
@@ -32,6 +33,12 @@ export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
     permissions: [
       PERMISSIONS.ORGANIZATION_READ,
       PERMISSIONS.ORGANIZATION_MANAGE,
+      PERMISSIONS.ORGANIZATION_ACTIVATE,
+      PERMISSIONS.ORGANIZATION_DEACTIVATE,
+      PERMISSIONS.ORGANIZATION_DELETE,
+      PERMISSIONS.ORGANIZATION_REQUEST_REVIEW,
+      PERMISSIONS.INSTITUTION_INVITE,
+      PERMISSIONS.ROLE_ASSIGN_COMMERCIAL,
       PERMISSIONS.MEMBERSHIP_READ,
       PERMISSIONS.MEMBERSHIP_MANAGE,
       PERMISSIONS.USER_READ,
@@ -54,6 +61,18 @@ export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
     ],
   },

+  {
+    key: SYSTEM_ROLE_KEYS.PAP_MANAGER,
+    name: "Gerente PAP",
+    description: "Institutional review and delegated commercial authorization; no clinical or organization lifecycle access.",
+    scope: "GLOBAL",
+    permissions: [
+      PERMISSIONS.ORGANIZATION_READ,
+      PERMISSIONS.ORGANIZATION_REQUEST_REVIEW,
+      PERMISSIONS.INSTITUTION_INVITE,
+      PERMISSIONS.ROLE_ASSIGN_COMMERCIAL,
+    ],
+  },
   {
     key: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
     name: "Municipal Administrator",
@@ -139,7 +158,6 @@ export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
       "Global PAP commercial role without clinical access.",
     scope: "GLOBAL",
     permissions: [
-      PERMISSIONS.ORGANIZATION_READ,
       PERMISSIONS.COMMERCIAL_READ,
       PERMISSIONS.COMMERCIAL_MANAGE,
     ],
```

### src/server/iam/bootstrap.service.ts
**UNCHANGED**: git diff sem saída; bytes idênticos ao HEAD, SHA-256 `205f51e18d27fb6048fd9f95c6c94633d68511eff224488135857a6910771c14`. Bootstrap consome o catálogo modificado e sincroniza grants, sem provisionar conta/senha/MFA. Conteúdo integral:

```ts
import { db } from "@/server/db/client"

import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "./permissions"

import {
  SYSTEM_ROLES,
} from "./system-role-catalog"

function permissionDescription(
  key: PermissionKey,
) {
  return `System permission: ${key}`
}

export async function bootstrapSystemIam() {
  return db.$transaction(async (tx) => {
    for (const key of ALL_PERMISSION_KEYS) {
      await tx.permission.upsert({
        where: { key },
        create: {
          key,
          description: permissionDescription(key),
        },
        update: {
          description: permissionDescription(key),
        },
      })
    }

    for (const definition of SYSTEM_ROLES) {
      const role = await tx.role.upsert({
        where: {
          key: definition.key,
        },
        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          system: true,
        },
        update: {
          name: definition.name,
          description: definition.description,
          system: true,
        },
      })

      const desiredPermissions =
        await tx.permission.findMany({
          where: {
            key: {
              in: [...definition.permissions],
            },
          },
          select: {
            id: true,
            key: true,
          },
        })

      if (
        desiredPermissions.length !==
        definition.permissions.length
      ) {
        throw new Error(
          `IAM bootstrap failed for role ${definition.key}: permission catalog mismatch`,
        )
      }

      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: {
            notIn: desiredPermissions.map(
              (permission) => permission.id,
            ),
          },
        },
      })

      await tx.rolePermission.createMany({
        data: desiredPermissions.map(
          (permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          }),
        ),
        skipDuplicates: true,
      })
    }

    return {
      permissions: ALL_PERMISSION_KEYS.length,
      roles: SYSTEM_ROLES.length,
    }
  })
}
```

### src/server/iam/role-assignment.service.ts

```diff
diff --git a/src/server/iam/role-assignment.service.ts b/src/server/iam/role-assignment.service.ts
index 47ff840..033d170 100644
--- a/src/server/iam/role-assignment.service.ts
+++ b/src/server/iam/role-assignment.service.ts
@@ -21,6 +21,7 @@ import {

 const GLOBAL_ROLES = new Set<SystemRoleKey>([
   SYSTEM_ROLE_KEYS.PAP_ADMIN,
+  SYSTEM_ROLE_KEYS.PAP_MANAGER,
   SYSTEM_ROLE_KEYS.COMMERCIAL,
 ])

```

### src/server/admin/admin-roles.service.ts

```diff
diff --git a/src/server/admin/admin-roles.service.ts b/src/server/admin/admin-roles.service.ts
index 2da24a3..30c900b 100644
--- a/src/server/admin/admin-roles.service.ts
+++ b/src/server/admin/admin-roles.service.ts
@@ -1,3 +1,4 @@
+import { requireAdminActor } from "./admin-session.service"
 import {
   MembershipStatus,
   Prisma,
@@ -94,6 +95,57 @@ export async function getAdminRoleOverview(
       actorUserId,
     )

+  if (
+    profile?.permissions.includes(PERMISSIONS.ROLE_ASSIGN_COMMERCIAL) &&
+    !profile.permissions.includes(PERMISSIONS.ROLE_READ)
+  ) {
+    const eligible = {
+      isActive: true,
+      id: { not: actorUserId },
+      roleAssignments: {
+        every: {
+          role: { key: "COMMERCIAL", system: true },
+          organizationId: null,
+        },
+      },
+    };
+    const [assignableUsers, assignments] = await Promise.all([
+      db.user.findMany({
+        where: eligible,
+        select: { id: true, email: true, displayName: true, isActive: true },
+        orderBy: { displayName: "asc" },
+        take: 200,
+      }),
+      db.roleAssignment.findMany({
+        where: {
+          organizationId: null,
+          role: { key: "COMMERCIAL", system: true },
+          user: eligible,
+        },
+        select: {
+          id: true,
+          organizationId: true,
+          user: {
+            select: {
+              id: true,
+              email: true,
+              displayName: true,
+              isActive: true,
+            },
+          },
+          role: { select: { key: true, name: true } },
+          organization: { select: { id: true, name: true, type: true } },
+        },
+      }),
+    ]);
+    return {
+      delegated: true,
+      roles: SYSTEM_ROLES.filter((r) => r.key === "COMMERCIAL"),
+      assignments,
+      assignableUsers,
+      canManage: true,
+    };
+  }
   if (
     !profile ||
     !profile.permissions.includes(
@@ -111,11 +163,7 @@ export async function getAdminRoleOverview(
       access.organizationIds.length ===
         0
     ) {
-      return {
-        roles: [],
-        assignments: [],
-        canManage: false,
-      }
+      throw new AccessDeniedError()
     }
   }

@@ -233,283 +281,194 @@ export async function getAdminRoleOverview(
   }
 }

-export async function createAdminRoleAssignment(
-  input: {
-    actorUserId: string
-    targetUserId: string
-    roleKey: string
-    organizationId?: string | null
-  },
+/** Called inside the mutation transaction: revocation cannot leave a stale authority snapshot. */
+async function requireRoleMutation(
+  actorUserId: string,
+  token: string | undefined,
+  targetUserId: string,
+  roleKey: string,
+  organizationId: string | null | undefined,
+  tx: Prisma.TransactionClient,
 ) {
-  if (
-    !isSystemRoleKey(
-      input.roleKey,
-    )
-  ) {
-    throw new UnsupportedAdminRoleError()
+  await requireAdminActor(actorUserId, token, tx);
+  const profile = await getEffectiveAccessProfile(actorUserId, tx);
+  const full = profile?.roles.some(
+    (r) =>
+      r.key === "PAP_ADMIN" &&
+      r.scope === "GLOBAL" &&
+      r.permissions.includes(PERMISSIONS.ROLE_MANAGE),
+  );
+  if (full) {
+    await requirePermission(
+      {
+        userId: actorUserId,
+        permission: PERMISSIONS.ROLE_MANAGE,
+        organizationId,
+      },
+      tx,
+    );
+    return;
   }
-
-  const definition =
-    getSystemRoleDefinition(
-      input.roleKey,
+  if (
+    roleKey !== "COMMERCIAL" ||
+    organizationId != null ||
+    targetUserId === actorUserId ||
+    !profile?.roles.some(
+      (r) =>
+        r.key === "PAP_MANAGER" &&
+        r.scope === "GLOBAL" &&
+        r.permissions.includes(PERMISSIONS.ROLE_ASSIGN_COMMERCIAL),
     )
+  )
+    throw new AccessDeniedError();
+  // A commercial delegate may never alter an existing privileged account.
+  const privileged = await tx.roleAssignment.count({
+    where: {
+      userId: targetUserId,
+      OR: [
+        { organizationId: { not: null } },
+        { role: { key: { not: "COMMERCIAL" } } },
+        { role: { system: false } },
+      ],
+    },
+  });
+  if (privileged) throw new AccessDeniedError();
+}

-  if (!definition) {
-    throw new UnsupportedAdminRoleError()
-  }
-
+export async function createAdminRoleAssignment(input: {
+  actorUserId: string;
+  actorSessionToken?: string;
+  targetUserId: string;
+  roleKey: string;
+  organizationId?: string | null;
+}) {
+  if (!isSystemRoleKey(input.roleKey)) throw new UnsupportedAdminRoleError();
+  const definition = getSystemRoleDefinition(input.roleKey)!;
   if (
-    definition.scope ===
-    "GLOBAL"
-  ) {
-    await requirePermission({
-      userId:
-        input.actorUserId,
-
-      permission:
-        PERMISSIONS.ROLE_MANAGE,
-    })
-
-    if (
-      input.organizationId !=
-      null
-    ) {
-      throw new UnsupportedAdminRoleError()
-    }
-  } else {
-    if (
-      !input.organizationId
-    ) {
-      throw new UnsupportedAdminRoleError()
-    }
-
-    await requirePermission({
-      userId:
-        input.actorUserId,
-
-      permission:
-        PERMISSIONS.ROLE_MANAGE,
-
-      organizationId:
-        input.organizationId,
-    })
-  }
-
-  return roleMutationTransaction(
-    async (tx) => {
-      const targetUser =
-        await tx.user.findUnique({
-          where: { id: input.targetUserId },
-          select: { id: true, isActive: true },
-        })
-
-      if (!targetUser?.isActive) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      if (definition.scope !== "GLOBAL") {
-        const membership =
-          await tx.membership.findUnique({
-            where: {
-              userId_organizationId: {
-                userId: input.targetUserId,
-                organizationId: input.organizationId!,
-              },
-            },
-            select: { status: true },
-          })
-
-        if (membership?.status !== MembershipStatus.ACTIVE) {
-          throw new UnsupportedAdminRoleError()
-        }
-      }
-
-      const role = await tx.role.findUnique({
-        where: { key: input.roleKey },
-        select: { id: true },
-      })
-
-      // assignSystemRole remains the canonical scope/type validator.
-      if (!role) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      const existing = await tx.roleAssignment.findFirst({
+    (definition.scope === "GLOBAL" && input.organizationId != null) ||
+    (definition.scope !== "GLOBAL" && !input.organizationId)
+  )
+    throw new UnsupportedAdminRoleError();
+  return roleMutationTransaction(async (tx) => {
+    await requireRoleMutation(
+      input.actorUserId,
+      input.actorSessionToken,
+      input.targetUserId,
+      input.roleKey,
+      input.organizationId,
+      tx,
+    );
+    const target = await tx.user.findUnique({
+      where: { id: input.targetUserId },
+      select: { isActive: true },
+    });
+    if (!target?.isActive) throw new UnsupportedAdminRoleError();
+    if (definition.scope !== "GLOBAL") {
+      const member = await tx.membership.findUnique({
         where: {
-          userId: input.targetUserId,
-          roleId: role.id,
-          organizationId: input.organizationId ?? null,
-        },
-        select: { id: true },
-      })
-
-      const assignment = await assignSystemRole(
-        {
-          userId: input.targetUserId,
-          roleKey: input.roleKey as SystemRoleKey,
-          organizationId: input.organizationId,
-        },
-        tx,
-      )
-
-      // Idempotent assignments should not generate false audit events.
-      if (!existing) {
-        await tx.auditEvent.create({
-          data: {
-            actorUserId: input.actorUserId,
-            organizationId: assignment.organizationId,
-            action: "ROLE_ASSIGNED",
-            resourceType: "ROLE_ASSIGNMENT",
-            resourceId: assignment.id,
-            after: {
-              targetUserId: input.targetUserId,
-              roleKey: input.roleKey,
-              organizationId: assignment.organizationId,
-            },
+          userId_organizationId: {
+            userId: input.targetUserId,
+            organizationId: input.organizationId!,
           },
-        })
-      }
-
-      return assignment
-    },
-  )
-}
-
-export async function revokeAdminRoleAssignment(
-  input: {
-    actorUserId: string
-    assignmentId: string
-  },
-) {
-  const assignment =
-    await db.roleAssignment.findUnique({
+        },
+      });
+      if (member?.status !== MembershipStatus.ACTIVE)
+        throw new UnsupportedAdminRoleError();
+    }
+    const role = await tx.role.findUnique({ where: { key: input.roleKey } });
+    if (!role) throw new UnsupportedAdminRoleError();
+    const existing = await tx.roleAssignment.findFirst({
       where: {
-        id:
-          input.assignmentId,
+        userId: input.targetUserId,
+        roleId: role.id,
+        organizationId: input.organizationId ?? null,
       },
-
-      include: {
-        user: {
-          select: {
-            id: true,
-            isActive: true,
-          },
-        },
-
-        role: true,
-
-        organization: {
-          select: {
-            id: true,
-          },
-        },
+    });
+    const assignment = await assignSystemRole(
+      {
+        userId: input.targetUserId,
+        roleKey: input.roleKey as SystemRoleKey,
+        organizationId: input.organizationId,
       },
-    })
-
-  if (
-    !assignment
-  ) {
-    throw new AdminRoleAssignmentNotFoundError()
-  }
-
-  const definition =
-    getSystemRoleDefinition(
-      assignment.role.key,
-    )
-
-  if (!definition) {
-    throw new UnsupportedAdminRoleError()
-  }
-
-  try {
-    if (definition.scope === "GLOBAL") {
-      await requirePermission({
-        userId: input.actorUserId,
-        permission: PERMISSIONS.ROLE_MANAGE,
-      })
-    } else {
-      if (!assignment.organizationId) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      await requirePermission({
-        userId: input.actorUserId,
-        permission: PERMISSIONS.ROLE_MANAGE,
-        organizationId: assignment.organizationId,
-      })
-    }
-  } catch (error) {
-    if (error instanceof AccessDeniedError) {
-      // A foreign assignment must not be distinguishable from a missing one.
-      throw new AdminRoleAssignmentNotFoundError()
-    }
-    throw error
-  }
-
-  return roleMutationTransaction(
-    async (tx) => {
-      const current = await tx.roleAssignment.findUnique({
-        where: { id: assignment.id },
-        include: {
-          user: { select: { id: true, isActive: true } },
-          role: { select: { key: true } },
-        },
-      })
-
-      if (!current) {
-        throw new AdminRoleAssignmentNotFoundError()
-      }
-
-      // Block any role/key substitution between authorization and delete.
-      if (
-        current.role.key !== assignment.role.key ||
-        current.organizationId !== assignment.organizationId ||
-        current.userId !== assignment.userId
-      ) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      if (
-        current.role.key === SYSTEM_ROLE_KEYS.PAP_ADMIN &&
-        current.user.isActive
-      ) {
-        const activePapAdmins = await tx.roleAssignment.count({
-          where: {
-            organizationId: null,
-            role: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN },
-            user: { isActive: true },
-          },
-        })
-
-        if (activePapAdmins <= 1) {
-          throw new LastPapAdminError()
-        }
-      }
-
-      const deleted = await tx.roleAssignment.deleteMany({
-        where: { id: current.id },
-      })
-
-      if (deleted.count !== 1) {
-        throw new AdminRoleAssignmentNotFoundError()
-      }
-
+      tx,
+    );
+    if (!existing)
       await tx.auditEvent.create({
         data: {
           actorUserId: input.actorUserId,
-          organizationId: current.organizationId,
-          action: "ROLE_REVOKED",
+          organizationId: assignment.organizationId,
+          action: "ROLE_ASSIGNED",
           resourceType: "ROLE_ASSIGNMENT",
-          resourceId: current.id,
-          before: {
-            targetUserId: current.userId,
-            roleKey: current.role.key,
-            organizationId: current.organizationId,
+          resourceId: assignment.id,
+          after: {
+            targetUserId: input.targetUserId,
+            roleKey: input.roleKey,
+            organizationId: assignment.organizationId,
           },
         },
-      })
+      });
+    return assignment;
+  });
+}

-      return { revoked: true, assignmentId: current.id }
-    },
-  )
+export async function revokeAdminRoleAssignment(input: {
+  actorUserId: string;
+  actorSessionToken?: string;
+  assignmentId: string;
+}) {
+  return roleMutationTransaction(async (tx) => {
+    const current = await tx.roleAssignment.findUnique({
+      where: { id: input.assignmentId },
+      include: { role: true, user: true },
+    });
+    if (!current) throw new AdminRoleAssignmentNotFoundError();
+    if (!getSystemRoleDefinition(current.role.key))
+      throw new UnsupportedAdminRoleError();
+    try {
+      await requireRoleMutation(
+        input.actorUserId,
+        input.actorSessionToken,
+        current.userId,
+        current.role.key,
+        current.organizationId,
+        tx,
+      );
+    } catch (error) {
+      if (error instanceof AccessDeniedError)
+        throw new AdminRoleAssignmentNotFoundError();
+      throw error;
+    }
+    if (
+      current.role.key === SYSTEM_ROLE_KEYS.PAP_ADMIN &&
+      current.user.isActive
+    ) {
+      const count = await tx.roleAssignment.count({
+        where: {
+          organizationId: null,
+          role: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN },
+          user: { isActive: true },
+        },
+      });
+      if (count <= 1) throw new LastPapAdminError();
+    }
+    const deleted = await tx.roleAssignment.deleteMany({
+      where: { id: current.id },
+    });
+    if (deleted.count !== 1) throw new AdminRoleAssignmentNotFoundError();
+    await tx.auditEvent.create({
+      data: {
+        actorUserId: input.actorUserId,
+        organizationId: current.organizationId,
+        action: "ROLE_REVOKED",
+        resourceType: "ROLE_ASSIGNMENT",
+        resourceId: current.id,
+        before: {
+          targetUserId: current.userId,
+          roleKey: current.role.key,
+          organizationId: current.organizationId,
+        },
+      },
+    });
+    return { revoked: true, assignmentId: current.id };
+  });
 }
```

### src/server/admin/admin-session.service.ts

```diff
diff --git a/src/server/admin/admin-session.service.ts b/src/server/admin/admin-session.service.ts
new file mode 100644
index 0000000..49e3e74
--- /dev/null
+++ b/src/server/admin/admin-session.service.ts
@@ -0,0 +1,38 @@
+import type { Prisma } from "@prisma/client";
+import { db } from "@/server/db/client";
+import { validateSession } from "@/server/auth/session.service";
+import { InvalidSessionError } from "@/server/auth/session.errors";
+
+export class AdminMfaRequiredError extends Error {
+  constructor() {
+    super("ADMIN_MFA_REQUIRED");
+  }
+}
+/** Proof belongs to this exact live session, never another session of the actor. */
+export async function requireAdminActor(
+  userId: string,
+  token?: string,
+  client: Prisma.TransactionClient = db,
+) {
+  if (!token) throw new AdminMfaRequiredError();
+  const result = await validateSession(token, {
+    updateLastSeen: false,
+    client,
+  });
+  if (result.user.id !== userId) throw new InvalidSessionError();
+  const verified = result.session.mfaVerifiedAt;
+  const factor = await client.mfaFactor.findFirst({
+    where: { userId, type: "TOTP", status: "ACTIVE" },
+    orderBy: { enabledAt: "desc" },
+    select: { enabledAt: true },
+  });
+  if (
+    !verified ||
+    !factor?.enabledAt ||
+    verified < factor.enabledAt ||
+    verified < result.session.createdAt ||
+    verified > new Date()
+  )
+    throw new AdminMfaRequiredError();
+  return result;
+}
```

### src/server/admin/admin-http.ts

```diff
diff --git a/src/server/admin/admin-http.ts b/src/server/admin/admin-http.ts
index bc1636c..5fa585d 100644
--- a/src/server/admin/admin-http.ts
+++ b/src/server/admin/admin-http.ts
@@ -1,3 +1,4 @@
+import { AccountSecurityError } from "@/server/auth/account-security.service"
 import {
   NextRequest,
   NextResponse,
@@ -52,39 +53,17 @@ import {
   OrganizationAlreadyArchivedError,
 } from "@/server/organizations/organization.errors"

-import { db } from "@/server/db/client"
-
-export class AdminMfaRequiredError extends Error {
-  constructor() { super("ADMIN_MFA_REQUIRED") }
-}
-
-const MAX_ADMIN_BODY_BYTES =
-  32 * 1024
-
-export async function requireAdminSession(
-  request: NextRequest,
-) {
-  const token =
-    readSessionToken(
-      request,
-    )
-
-  if (!token) {
-    throw new InvalidSessionError()
-  }
-
-  const result = await validateSession(token)
-  const verifiedAt = result.session.mfaVerifiedAt
-  const factor = await db.mfaFactor.findFirst({
-    where: { userId: result.user.id, type: "TOTP", status: "ACTIVE" },
-    orderBy: { enabledAt: "desc" },
-    select: { enabledAt: true },
-  })
-  if (!verifiedAt || !factor?.enabledAt || factor.enabledAt > verifiedAt ||
-      verifiedAt < result.session.createdAt || verifiedAt > new Date()) {
-    throw new AdminMfaRequiredError()
-  }
-  return result
+import {
+  requireAdminActor,
+  AdminMfaRequiredError,
+} from "./admin-session.service";
+export { AdminMfaRequiredError } from "./admin-session.service";
+const MAX_ADMIN_BODY_BYTES = 32 * 1024;
+export async function requireAdminSession(request: NextRequest) {
+  const token = readSessionToken(request);
+  if (!token) throw new InvalidSessionError();
+  const { user } = await validateSession(token);
+  return requireAdminActor(user.id, token);
 }

 export async function readAdminJson(
@@ -191,6 +170,9 @@ function noStoreHeaders() {
 export function adminErrorResponse(
   error: unknown,
 ) {
+  if (error instanceof AccountSecurityError) {
+    return NextResponse.json({ error: error.message }, { status: error.message === "REAUTH_THROTTLED" ? 429 : 403, headers: noStoreHeaders() })
+  }
   if (error instanceof AdminMfaRequiredError) {
     return NextResponse.json({ error: "ADMIN_MFA_REQUIRED" }, {
       status: 403, headers: noStoreHeaders(),
```

### src/server/auth/session.service.ts

```diff
diff --git a/src/server/auth/session.service.ts b/src/server/auth/session.service.ts
index 567a4d1..0989c09 100644
--- a/src/server/auth/session.service.ts
+++ b/src/server/auth/session.service.ts
@@ -1,5 +1,6 @@
 import {
   SessionRevocationReason,
+  type Prisma,
   type Session,
   type User,
 } from "@prisma/client";
@@ -40,6 +41,7 @@ export interface ValidatedSession {
 export interface ValidateSessionOptions {
   now?: Date;
   updateLastSeen?: boolean;
+  client?: Prisma.TransactionClient;
 }

 function addSeconds(date: Date, seconds: number): Date {
@@ -84,8 +86,9 @@ export async function validateSession(
   }

   const now = options.now ?? new Date();
+  const client = options.client ?? db;

-  const result = await db.session.findUnique({
+  const result = await client.session.findUnique({
     where: {
       tokenHash: hashSessionToken(token),
     },
@@ -116,7 +119,7 @@ export async function validateSession(
     options.updateLastSeen !== false &&
     shouldUpdateLastSeen(result.lastSeenAt, now)
   ) {
-    session = await db.session.update({
+    session = await client.session.update({
       where: {
         id: result.id,
       },
```

### src/server/iam/authorization.service.ts

```diff
diff --git a/src/server/iam/authorization.service.ts b/src/server/iam/authorization.service.ts
index 3980189..890c8ec 100644
--- a/src/server/iam/authorization.service.ts
+++ b/src/server/iam/authorization.service.ts
@@ -1,4 +1,5 @@
 import {
+  type Prisma,
   MembershipStatus,
   OrganizationStatus,
   OrganizationType,
@@ -93,8 +94,9 @@ function allowsTarget(input: {

 export async function authorize(
   input: AuthorizationInput,
+  client: Prisma.TransactionClient = db,
 ): Promise<AuthorizationDecision> {
-  const user = await db.user.findUnique({
+  const user = await client.user.findUnique({
     where: {
       id: input.userId,
     },
@@ -113,7 +115,7 @@ export async function authorize(

   const targetOrganization =
     input.organizationId
-      ? await db.organization.findUnique({
+      ? await client.organization.findUnique({
           where: {
             id: input.organizationId,
           },
@@ -142,7 +144,7 @@ export async function authorize(
   }

   const assignments =
-    await db.roleAssignment.findMany({
+    await client.roleAssignment.findMany({
       where: {
         userId: input.userId,
         role: {
@@ -226,7 +228,7 @@ export async function authorize(
       }

       const membership =
-        await db.membership.findUnique({
+        await client.membership.findUnique({
           where: {
             userId_organizationId: {
               userId: input.userId,
@@ -295,9 +297,10 @@ export async function authorize(

 export async function requirePermission(
   input: AuthorizationInput,
+  client: Prisma.TransactionClient = db,
 ) {
   const decision =
-    await authorize(input)
+    await authorize(input, client)

   if (!decision.allowed) {
     throw new AccessDeniedError()
```

### src/server/iam/effective-access-profile.service.ts

```diff
diff --git a/src/server/iam/effective-access-profile.service.ts b/src/server/iam/effective-access-profile.service.ts
index 5a3e765..07acb1f 100644
--- a/src/server/iam/effective-access-profile.service.ts
+++ b/src/server/iam/effective-access-profile.service.ts
@@ -9,6 +9,7 @@ import type {
   EffectiveAccessRole,
 } from "@/lib/admin/types"

+import type { Prisma } from "@prisma/client"
 import { db } from "@/server/db/client"

 import {
@@ -29,7 +30,6 @@ const ADMIN_ENTRY_PERMISSIONS =
     PERMISSIONS.USER_SECURITY_MANAGE,
     PERMISSIONS.MFA_RESET,
     PERMISSIONS.AUDIT_READ,
-    PERMISSIONS.COMMERCIAL_READ,
     PERMISSIONS.ORGANIZATION_ANALYTICS_READ,
     PERMISSIONS.FEEDBACK_READ,
     PERMISSIONS.RNDS_INTEGRATION_READ,
@@ -60,9 +60,10 @@ function compareOrganizations(

 export async function getEffectiveAccessProfile(
   userId: string,
+  client: Prisma.TransactionClient = db,
 ): Promise<EffectiveAccessProfile | null> {
   const user =
-    await db.user.findUnique({
+    await client.user.findUnique({
       where: {
         id: userId,
       },
```

### src/server/admin/admin-access.service.ts

```diff
diff --git a/src/server/admin/admin-access.service.ts b/src/server/admin/admin-access.service.ts
index 2b2e53a..418289e 100644
--- a/src/server/admin/admin-access.service.ts
+++ b/src/server/admin/admin-access.service.ts
@@ -1,3 +1,5 @@
+import type { Prisma } from "@prisma/client"
+import type { EffectiveAccessProfile } from "@/lib/admin/types"
 import type {
   PermissionKey,
 } from "@/server/iam/permissions"
@@ -22,6 +24,7 @@ export async function requireAdminOrganizationAccess(
   userId: string,
   permission: PermissionKey,
   organizationId: string,
+  client: Prisma.TransactionClient = db,
 ) {
   const [
     profile,
@@ -29,10 +32,10 @@ export async function requireAdminOrganizationAccess(
   ] =
     await Promise.all([
       getEffectiveAccessProfile(
-        userId,
+        userId, client,
       ),

-      db.organization.findUnique({
+      client.organization.findUnique({
         where: {
           id:
             organizationId,
@@ -122,16 +125,17 @@ export async function hasGlobalAdminPermission(
 export async function listAccessibleOrganizationIds(
   userId: string,
   permission: PermissionKey,
+  effectiveProfile?: EffectiveAccessProfile,
 ): Promise<{
   global: boolean
   organizationIds: string[]
 }> {
-  const profile =
+  const profile = effectiveProfile ??
     await getEffectiveAccessProfile(
       userId,
     )

-  if (!profile) {
+  if (!profile || profile.user.id !== userId) {
     throw new AccessDeniedError()
   }

```

### src/server/admin/admin-organizations.service.ts

```diff
diff --git a/src/server/admin/admin-organizations.service.ts b/src/server/admin/admin-organizations.service.ts
index cd4865d..ca2945d 100644
--- a/src/server/admin/admin-organizations.service.ts
+++ b/src/server/admin/admin-organizations.service.ts
@@ -1,7 +1,13 @@
+import { requireAdminActor } from "./admin-session.service";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import {
+  requireReauthentication,
+  AccountSecurityError,
+} from "@/server/auth/account-security.service";
+import { serializable } from "@/server/admin-beta/policy";
 import {
   OrganizationStatus,
   OrganizationType,
-  Prisma,
 } from "@prisma/client"

 import {
@@ -34,10 +40,13 @@ import {
 export async function listAdminOrganizations(
   userId: string,
 ) {
+  const profile = await getEffectiveAccessProfile(userId)
+  if (!profile) throw new AccessDeniedError()
   const access =
     await listAccessibleOrganizationIds(
       userId,
       PERMISSIONS.ORGANIZATION_READ,
+      profile,
     )

   if (
@@ -45,9 +54,15 @@ export async function listAdminOrganizations(
     access.organizationIds.length ===
       0
   ) {
-    return []
+    throw new AccessDeniedError()
   }

+  // Scope and projection must use the same profile: revocation between reads
+  // must never turn a global delegated directory into a private-field response.
+  // Global directory access delegates institutional metadata, never private configuration.
+  const delegatedDirectory = profile.roles.some(r => r.key === "PAP_MANAGER") &&
+    !profile.roles.some(r => r.key === "PAP_ADMIN" && r.scope === "GLOBAL")
+  const canSeeClinicalCounts = profile?.permissions.includes(PERMISSIONS.ORGANIZATION_ANALYTICS_READ) ?? false
   return db.organization.findMany({
     where:
       access.global
@@ -59,7 +74,22 @@ export async function listAdminOrganizations(
             },
           },

-    include: {
+    select: {
+      id: true,
+      name: true,
+      type: true,
+      status: true,
+      isActive: true,
+      parentId: true,
+      city: true,
+      state: true,
+      code: !delegatedDirectory,
+      cnes: !delegatedDirectory,
+      cnpj: !delegatedDirectory,
+      address: !delegatedDirectory,
+      createdAt: !delegatedDirectory,
+      updatedAt: !delegatedDirectory,
+      // settings is deliberately absent for every role: this is a directory DTO.
       parent: {
         select: {
           id: true,
@@ -71,9 +101,9 @@ export async function listAdminOrganizations(
       _count: {
         select: {
           children: true,
-          memberships: true,
-          patientLinks: true,
-          encounters: true,
+          memberships: !delegatedDirectory,
+          patientLinks: !delegatedDirectory && canSeeClinicalCounts,
+          encounters: !delegatedDirectory && canSeeClinicalCounts,
         },
       },
     },
@@ -104,7 +134,9 @@ export async function createAdminOrganization(
     state?: string | null
     address?: string | null
   },
+  actorSessionToken?: string,
 ) {
+  await requireAdminActor(userId, actorSessionToken)
   if (
     input.type !==
       OrganizationType.MUNICIPALITY &&
@@ -120,7 +152,9 @@ export async function createAdminOrganization(
     input.parentId,
   )

-  return db.$transaction(async tx => {
+  return serializable(async tx => {
+    await requireAdminActor(userId, actorSessionToken, tx)
+    await requireAdminOrganizationAccess(userId, PERMISSIONS.ORGANIZATION_MANAGE, input.parentId, tx)
     const organization = await createOrganization({
     type:
       input.type,
@@ -169,61 +203,188 @@ export async function mutateAdminOrganization(
   organizationId: string,
   input:
     | {
-        operation:
-          "ACTIVATE"
+        operation: "ACTIVATE";
       }
     | {
-        operation:
-          "SUSPEND"
+        operation: "SUSPEND";
       }
     | {
-        operation:
-          "ARCHIVE"
+        operation: "ARCHIVE";
+        confirmationName?: string;
+        password?: string;
+        code?: string;
       }
     | {
-        operation:
-          "UPDATE"
-        name?: string
-        code?: string | null
-        cnes?: string | null
-        cnpj?: string | null
-        city?: string | null
-        state?: string | null
-        address?: string | null
+        operation: "UPDATE";
+        name?: string;
+        code?: string | null;
+        cnes?: string | null;
+        cnpj?: string | null;
+        city?: string | null;
+        state?: string | null;
+        address?: string | null;
       },
+  actorSessionToken?: string,
 ) {
+  await requireAdminActor(userId, actorSessionToken);
   await requireAdminOrganizationAccess(
     userId,
     PERMISSIONS.ORGANIZATION_MANAGE,
     organizationId,
-  )
+  );

-  return db.$transaction(async tx => {
-    const before = await tx.organization.findUnique({ where: { id: organizationId } });
+  if (input.operation !== "UPDATE") {
+    const profile = await getEffectiveAccessProfile(userId);
+    const target = await db.organization.findUnique({
+      where: { id: organizationId },
+    });
+    const permission =
+      input.operation === "ACTIVATE"
+        ? PERMISSIONS.ORGANIZATION_ACTIVATE
+        : input.operation === "SUSPEND"
+          ? PERMISSIONS.ORGANIZATION_DEACTIVATE
+          : PERMISSIONS.ORGANIZATION_DELETE;
+    if (
+      target?.type === "HEALTH_UNIT" &&
+      !profile?.roles.some(
+        (r) =>
+          r.key === "PAP_ADMIN" &&
+          r.scope === "GLOBAL" &&
+          r.permissions.includes(permission),
+      )
+    )
+      throw new AccessDeniedError();
+    if (input.operation === "ARCHIVE") {
+      if (
+        !target ||
+        input.confirmationName !== target.name ||
+        typeof input.password !== "string" ||
+        typeof input.code !== "string"
+      )
+        throw new AccountSecurityError("STRONG_CONFIRMATION_REQUIRED");
+      await requireReauthentication(userId, input.password, input.code);
+    }
+  }
+  return serializable(async (tx) => {
+    await requireAdminActor(userId, actorSessionToken, tx);
+    const { profile, organization } = await requireAdminOrganizationAccess(
+      userId,
+      PERMISSIONS.ORGANIZATION_MANAGE,
+      organizationId,
+      tx,
+    );
+    if (input.operation !== "UPDATE") {
+      const permission =
+        input.operation === "ACTIVATE"
+          ? PERMISSIONS.ORGANIZATION_ACTIVATE
+          : input.operation === "SUSPEND"
+            ? PERMISSIONS.ORGANIZATION_DEACTIVATE
+            : PERMISSIONS.ORGANIZATION_DELETE;
+      if (
+        organization.type === "HEALTH_UNIT" &&
+        !profile.roles.some(
+          (r) =>
+            r.key === "PAP_ADMIN" &&
+            r.scope === "GLOBAL" &&
+            r.permissions.includes(permission),
+        )
+      )
+        throw new AccessDeniedError();
+      if (
+        input.operation === "ARCHIVE" &&
+        input.confirmationName !== organization.name
+      )
+        throw new AccountSecurityError("STRONG_CONFIRMATION_REQUIRED");
+    }
+    const before = await tx.organization.findUnique({
+      where: { id: organizationId },
+    });
     if (!before) throw new AccessDeniedError();
     let after;
     switch (input.operation) {
-      case "ACTIVATE": after = await activateOrganization(organizationId, tx); break;
-      case "SUSPEND": after = await suspendOrganization(organizationId, tx); break;
-      case "ARCHIVE": after = await archiveOrganization(organizationId, tx); break;
+      case "ACTIVATE": {
+        const candidate = await tx.organizationCandidate.findFirst({
+          where: {
+            convertedOrganizationId: organizationId,
+            consentedAt: { not: null },
+          },
+        });
+        if (
+          candidate &&
+          !["READY_FOR_ACTIVATION", "APPROVED"].includes(candidate.status)
+        )
+          throw new AccessDeniedError();
+        after = await activateOrganization(organizationId, tx);
+        if (candidate?.status === "READY_FOR_ACTIVATION") {
+          const activated = await tx.organizationCandidate.update({
+            where: { id: candidate.id },
+            data: { status: "APPROVED" },
+          });
+          await tx.organizationRequest.updateMany({
+            where: { candidateId: candidate.id, status: "REQUESTED" },
+            data: { status: "RESOLVED" },
+          });
+          await writeAdminAudit(
+            {
+              actorUserId: userId,
+              organizationId,
+              action: "REQUEST_ACTIVATED",
+              resourceType: "ORGANIZATION_REQUEST",
+              resourceId: candidate.id,
+              before: candidate,
+              after: activated,
+            },
+            tx,
+          );
+        }
+        break;
+      }
+      case "SUSPEND":
+        after = await suspendOrganization(organizationId, tx);
+        break;
+      case "ARCHIVE":
+        after = await archiveOrganization(organizationId, tx);
+        break;
       case "UPDATE":
-        after = await updateOrganizationDetails(organizationId, {
-          name: input.name, code: input.code, cnes: input.cnes, cnpj: input.cnpj,
-          city: input.city, state: input.state, address: input.address,
-        }, tx);
+        after = await updateOrganizationDetails(
+          organizationId,
+          {
+            name: input.name,
+            code: input.code,
+            cnes: input.cnes,
+            cnpj: input.cnpj,
+            city: input.city,
+            state: input.state,
+            address: input.address,
+          },
+          tx,
+        );
         break;
     }
-    if (JSON.stringify(projectAdminSnapshot("ORGANIZATION", before)) !==
-        JSON.stringify(projectAdminSnapshot("ORGANIZATION", after))) {
-      await writeAdminAudit({
-        actorUserId: userId, organizationId,
-        action: input.operation === "UPDATE" ? "ORGANIZATION_UPDATED" :
-          input.operation === "ACTIVATE" ? "ORGANIZATION_ACTIVATED" :
-          input.operation === "SUSPEND" ? "ORGANIZATION_SUSPENDED" : "ORGANIZATION_ARCHIVED",
-        resourceType: "ORGANIZATION", resourceId: organizationId,
-        before, after,
-      }, tx);
+    if (
+      JSON.stringify(projectAdminSnapshot("ORGANIZATION", before)) !==
+      JSON.stringify(projectAdminSnapshot("ORGANIZATION", after))
+    ) {
+      await writeAdminAudit(
+        {
+          actorUserId: userId,
+          organizationId,
+          action:
+            input.operation === "UPDATE"
+              ? "ORGANIZATION_UPDATED"
+              : input.operation === "ACTIVATE"
+                ? "ORGANIZATION_ACTIVATED"
+                : input.operation === "SUSPEND"
+                  ? "ORGANIZATION_SUSPENDED"
+                  : "ORGANIZATION_ARCHIVED",
+          resourceType: "ORGANIZATION",
+          resourceId: organizationId,
+          before,
+          after,
+        },
+        tx,
+      );
     }
     return after;
-  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
+  });
 }
```

### src/server/admin-beta/policy.ts

```diff
diff --git a/src/server/admin-beta/policy.ts b/src/server/admin-beta/policy.ts
index fa6d0f7..586cb4e 100644
--- a/src/server/admin-beta/policy.ts
+++ b/src/server/admin-beta/policy.ts
@@ -29,14 +29,14 @@ export function uuid(value: unknown) {
     return invalid();
   return value;
 }
-export async function requirePapReviewer(userId: string) {
-  const profile = await getEffectiveAccessProfile(userId);
+export async function requirePapReviewer(userId: string, client: Prisma.TransactionClient = db) {
+  const profile = await getEffectiveAccessProfile(userId, client);
   if (
     !profile?.roles.some(
       (r) =>
-        r.key === "PAP_ADMIN" &&
+        ["PAP_ADMIN", "PAP_MANAGER"].includes(r.key) &&
         r.scope === "GLOBAL" &&
-        r.permissions.includes("organization.manage"),
+        r.permissions.includes("organization.request.review"),
     )
   )
     throw new AccessDeniedError();
```

### src/server/admin-beta/requests.service.ts

```diff
diff --git a/src/server/admin-beta/requests.service.ts b/src/server/admin-beta/requests.service.ts
index 3ea1243..d80e987 100644
--- a/src/server/admin-beta/requests.service.ts
+++ b/src/server/admin-beta/requests.service.ts
@@ -1,3 +1,5 @@
+import { requireAdminActor } from "@/server/admin/admin-session.service";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
 import { createHash } from "node:crypto";
 import { Prisma } from "@prisma/client";
 import { db } from "@/server/db/client";
@@ -134,12 +136,19 @@ export async function listBetaRequests(
     !Number.isInteger(page) ||
     page < 1 ||
     page > 10000 ||
-    (status && !["NEW", "APPROVED", "REJECTED"].includes(status))
+    (status &&
+      ![
+        "NEW",
+        "CHANGES_REQUESTED",
+        "READY_FOR_ACTIVATION",
+        "APPROVED",
+        "REJECTED",
+      ].includes(status))
   )
     invalid();
   const where: Prisma.OrganizationCandidateWhereInput = {
     consentedAt: { not: null },
-    status: status as "NEW" | "APPROVED" | "REJECTED" | undefined,
+    status: status as Prisma.EnumOrganizationCandidateStatusFilter["equals"],
     ...(query
       ? { name: { contains: text(query, 100, 1), mode: "insensitive" } }
       : {}),
@@ -153,19 +162,37 @@ export async function listBetaRequests(
     }),
     db.organizationCandidate.count({ where }),
   ]);
-  return { rows, total, page, pageSize: 20 };
+  const profile = await getEffectiveAccessProfile(userId);
+  return {
+    rows,
+    total,
+    page,
+    pageSize: 20,
+    canActivate:
+      profile?.roles.some(
+        (r) =>
+          r.key === "PAP_ADMIN" &&
+          r.scope === "GLOBAL" &&
+          r.permissions.includes("organization.activate"),
+      ) ?? false,
+  };
 }
 export async function reviewBetaRequest(
   userId: string,
   body: Record<string, unknown>,
+  actorSessionToken?: string,
 ) {
+  await requireAdminActor(userId, actorSessionToken);
   await requirePapReviewer(userId);
   const id = uuid(body.id),
     reason = text(body.reason, 500, 5);
-  if (body.decision !== "APPROVE" && body.decision !== "REJECT") invalid();
-  return db.$transaction(async (tx) => {
+  if (!["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(String(body.decision)))
+    invalid();
+  return serializable(async (tx) => {
+    await requireAdminActor(userId, actorSessionToken, tx);
+    await requirePapReviewer(userId, tx);
     const claim = await tx.organizationCandidate.updateMany({
-      where: { id, status: "NEW" },
+      where: { id, status: { in: ["NEW", "CHANGES_REQUESTED"] } },
       data: { updatedAt: new Date() },
     });
     void claim;
@@ -173,10 +200,10 @@ export async function reviewBetaRequest(
       where: { id },
     });
     if (!candidate?.consentedAt) invalid();
-    if (candidate.status !== "NEW") {
+    if (!["NEW", "CHANGES_REQUESTED"].includes(candidate.status)) {
       if (
         candidate.status ===
-          (body.decision === "APPROVE" ? "APPROVED" : "REJECTED") &&
+          (body.decision === "APPROVE" ? "READY_FOR_ACTIVATION" : "REJECTED") &&
         (!body.municipalityId ||
           (candidate.convertedOrganizationId &&
             (
@@ -213,7 +240,7 @@ export async function reviewBetaRequest(
       const organization = await createOrganization(
         {
           type: "HEALTH_UNIT",
-          status: "ACTIVE",
+          status: "PENDING_VERIFICATION",
           name: candidate.name,
           parentId: parent.id,
           cnes: candidate.cnes,
@@ -229,7 +256,7 @@ export async function reviewBetaRequest(
         {
           actorUserId: userId,
           organizationId,
-          action: "ORGANIZATION_ACTIVATED",
+          action: "ORGANIZATION_CREATED",
           resourceType: "ORGANIZATION",
           resourceId: organizationId,
           after: organization,
@@ -240,23 +267,33 @@ export async function reviewBetaRequest(
     const after = await tx.organizationCandidate.update({
       where: { id },
       data: {
-        status: body.decision === "APPROVE" ? "APPROVED" : "REJECTED",
+        status:
+          body.decision === "APPROVE"
+            ? "READY_FOR_ACTIVATION"
+            : body.decision === "REQUEST_CHANGES"
+              ? "CHANGES_REQUESTED"
+              : "REJECTED",
         convertedOrganizationId: organizationId,
         reviewReason: reason,
         reviewedByUserId: userId,
         reviewedAt: new Date(),
       },
     });
-    await tx.organizationRequest.updateMany({
-      where: { candidateId: id, status: "REQUESTED" },
-      data: { status: "RESOLVED" },
-    });
+    if (body.decision === "REJECT")
+      await tx.organizationRequest.updateMany({
+        where: { candidateId: id, status: "REQUESTED" },
+        data: { status: "RESOLVED" },
+      });
     await writeAdminAudit(
       {
         actorUserId: userId,
         organizationId,
         action:
-          body.decision === "APPROVE" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
+          body.decision === "APPROVE"
+            ? "REQUEST_FORWARDED"
+            : body.decision === "REQUEST_CHANGES"
+              ? "REQUEST_CHANGES"
+              : "REQUEST_REJECTED",
         resourceType: "ORGANIZATION_REQUEST",
         resourceId: id,
         before: candidate,
```

### src/server/admin/institutional-invitation-policy.ts

```diff
diff --git a/src/server/admin/institutional-invitation-policy.ts b/src/server/admin/institutional-invitation-policy.ts
new file mode 100644
index 0000000..5bb6130
--- /dev/null
+++ b/src/server/admin/institutional-invitation-policy.ts
@@ -0,0 +1,70 @@
+import { AccessDeniedError } from "@/server/iam/authorization.errors";
+import type { Prisma } from "@prisma/client";
+import { db } from "@/server/db/client";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import { PERMISSIONS } from "@/server/iam/permissions";
+import { requireAdminOrganizationAccess } from "./admin-access.service";
+export async function requireInstitutionalInvitationAccess(
+  userId: string,
+  organizationId: string,
+  client: Prisma.TransactionClient = db,
+) {
+  const profile = await getEffectiveAccessProfile(userId, client);
+  if (profile?.permissions.includes(PERMISSIONS.INSTITUTION_INVITE)) {
+    return requireAdminOrganizationAccess(
+      userId,
+      PERMISSIONS.INSTITUTION_INVITE,
+      organizationId,
+      client,
+    );
+  }
+  await requireAdminOrganizationAccess(
+    userId,
+    PERMISSIONS.USER_INVITE,
+    organizationId,
+    client,
+  );
+  return requireAdminOrganizationAccess(
+    userId,
+    PERMISSIONS.MEMBERSHIP_MANAGE,
+    organizationId,
+    client,
+  );
+}
+
+/** A delegated inviter cannot use institutional enrollment to gain clinical or admin access. */
+export async function requireInstitutionalInvitationTarget(
+  actorUserId: string,
+  normalizedEmail: string,
+  client: Prisma.TransactionClient = db,
+) {
+  const profile = await getEffectiveAccessProfile(actorUserId, client);
+  const full = profile?.roles.some(
+    (r) =>
+      r.key === "PAP_ADMIN" &&
+      r.scope === "GLOBAL" &&
+      r.permissions.includes(PERMISSIONS.ROLE_MANAGE),
+  );
+  const delegated = profile?.roles.some(
+    (r) => r.key === "PAP_MANAGER" && r.scope === "GLOBAL",
+  );
+  if (!delegated || full) return;
+  if (profile!.user.email.toLowerCase() === normalizedEmail.toLowerCase())
+    throw new AccessDeniedError();
+  const target = await client.user.findUnique({
+    where: { email: normalizedEmail },
+    select: {
+      roleAssignments: {
+        select: { role: { select: { key: true, system: true } } },
+      },
+    },
+  });
+  // Existing professionals may receive another legitimate institutional scope.
+  // All other assigned roles (including unknown/custom ones) are protected.
+  if (
+    target?.roleAssignments.some(
+      (a) => !a.role.system || a.role.key !== "PROFESSIONAL",
+    )
+  )
+    throw new AccessDeniedError();
+}
```

### src/server/invitations/invitation.service.ts

```diff
diff --git a/src/server/invitations/invitation.service.ts b/src/server/invitations/invitation.service.ts
index c08412d..602bead 100644
--- a/src/server/invitations/invitation.service.ts
+++ b/src/server/invitations/invitation.service.ts
@@ -1,3 +1,4 @@
+import { requireInstitutionalInvitationAccess, requireInstitutionalInvitationTarget } from "@/server/admin/institutional-invitation-policy"
 import { requirePapReviewer } from "@/server/admin-beta/policy"
 import {
   createHash,
@@ -26,15 +27,6 @@ import {
   normalizeEmail,
 } from "@/server/auth/password-authentication.service"

-import {
-  PERMISSIONS,
-} from "@/server/iam/permissions"
-
-
-import {
-  requireAdminOrganizationAccess,
-} from "@/server/admin/admin-access.service"
-
 import {
   INVITATION_TOKEN_BYTES,
   INVITATION_TOKEN_HASH_DOMAIN,
@@ -102,17 +94,7 @@ async function createInvitation(
     roleKey: "PROFESSIONAL" | "HEALTH_UNIT_ADMIN"
   },
 ) {
-  await requireAdminOrganizationAccess(
-    input.invitedByUserId,
-    PERMISSIONS.USER_INVITE,
-    input.organizationId,
-  )
-
-  await requireAdminOrganizationAccess(
-    input.invitedByUserId,
-    PERMISSIONS.MEMBERSHIP_MANAGE,
-    input.organizationId,
-  )
+  await requireInstitutionalInvitationAccess(input.invitedByUserId, input.organizationId)

   if (input.roleKey === "HEALTH_UNIT_ADMIN") {
     await requirePapReviewer(input.invitedByUserId);
@@ -160,6 +142,8 @@ async function createInvitation(
     throw new InvitationPayloadError()
   }

+  await requireInstitutionalInvitationTarget(input.invitedByUserId, email)
+
   const displayName =
     normalizeDisplayName(
       input.displayName,
@@ -193,6 +177,8 @@ async function createInvitation(
       async (
         tx,
       ) => {
+        await requireInstitutionalInvitationAccess(input.invitedByUserId, organization.id, tx);
+        await requireInstitutionalInvitationTarget(input.invitedByUserId, email, tx);
         // Serialize invite/accept/revoke and bootstrap per organization.
         await tx.organization.update({where:{id:organization.id},data:{updatedAt:new Date()}});

@@ -588,6 +574,13 @@ export async function acceptInvitation(
     async (
       tx,
     ) => {
+      // Revalidate authority and target at acceptance: identities/roles can change
+      // while a bearer invitation is pending. Never consume a now-invalid grant.
+      if (!existing.invitedByUserId) throw new InvalidInvitationError();
+      try {
+        await requireInstitutionalInvitationAccess(existing.invitedByUserId, existing.organizationId, tx);
+        await requireInstitutionalInvitationTarget(existing.invitedByUserId, existing.email, tx);
+      } catch { throw new InvalidInvitationError(); }
       await tx.organization.update({where:{id:existing.organizationId},data:{updatedAt:new Date()}});
       const currentUser = await tx.user.findUnique({where:{id:existing.user!.id}});
       const currentOrg = await tx.organization.findUnique({where:{id:existing.organizationId}});
```

### src/server/clinical/clinical-page-session.ts

```diff
diff --git a/src/server/clinical/clinical-page-session.ts b/src/server/clinical/clinical-page-session.ts
new file mode 100644
index 0000000..ef35f2b
--- /dev/null
+++ b/src/server/clinical/clinical-page-session.ts
@@ -0,0 +1,19 @@
+import { redirect } from "next/navigation";
+import { requireOwnPageSession } from "@/server/auth/require-page-session";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import { accessDestination } from "@/lib/auth/access-destination";
+/** No implicit clinical grant for platform administrators. Professional MFA policy is unchanged. */
+export async function requireClinicalPageSession() {
+  const session = await requireOwnPageSession();
+  const profile = await getEffectiveAccessProfile(session.user.id);
+  if (
+    !profile?.roles.some(
+      (r) =>
+        r.scope === "HEALTH_UNIT" &&
+        r.organization &&
+        r.permissions.includes("patient.read"),
+    )
+  )
+    redirect(accessDestination(profile));
+  return { ...session, profile };
+}
```
