import type { Prisma } from "@prisma/client";
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createSession } from "../../src/server/auth/session.service";
import { actor, request } from "../mission04-b/fixtures";
import { fixture } from "../first-access/fixtures";
import { requireCommercialSession, CommercialAccessError } from "../../src/server/demo/commercial-access.service";
import { demoContent } from "../../src/server/demo/fixtures";
import { DEMO_SECTIONS } from "../../src/lib/demo/types";
import { GET, POST } from "../../src/app/api/vitrine/[section]/route";
import { GET as clinicalGet, POST as clinicalPost, PATCH as clinicalPatch } from "../../src/app/api/clinical/[[...path]]/route";
const ctx = (section = "pacientes") => ({ params: Promise.resolve({ section }) });
let commercial: Awaited<ReturnType<typeof actor>>;
before(async () => {
    assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/pap_saude_m04_e_test");
    await bootstrapSystemIam();
    commercial = await actor("COMMERCIAL");
});
after(() => db.$disconnect());
const denied = (token?: string) => assert.rejects(() => requireCommercialSession(token), CommercialAccessError);
test("only explicit global Commercial grant; Admin, Manager, clinical professional and unassigned denied", async () => {
    assert.equal((await requireCommercialSession(commercial.token)).userId, commercial.user.id);
    await denied();
    await denied("unknown-session-fixture");
    await denied((await fixture("HEALTH_UNIT_ADMIN")).session.token);
    for (const role of ["PAP_ADMIN", "PAP_MANAGER"] as const)
        await denied((await actor(role)).token);
    const professional = await fixture("PROFESSIONAL");
    await denied(professional.session.token);
    await db.roleAssignment.deleteMany({ where: { userId: professional.user.id } });
    await denied(professional.session.token);
    const custom = await db.role.create({ data: { key: `CUSTOM_DEMO_${randomUUID()}`, name: "Custom fixture", system: false } });
    const read = await db.permission.findUniqueOrThrow({ where: { key: "commercial.read" } });
    await db.rolePermission.create({ data: { roleId: custom.id, permissionId: read.id } });
    await db.roleAssignment.create({ data: { userId: professional.user.id, roleId: custom.id } });
    await denied(professional.session.token);
});
test("Commercial MFA is mandatory before enrollment and an active factor requires real verification", async () => {
    const f = await fixture();
    await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
    await assignSystemRole({ userId: f.user.id, roleKey: "COMMERCIAL" });
    await denied(f.session.token);
    const pending = await createSession({ userId: commercial.user.id });
    await denied(pending.token);
});
test("dual Admin/Commercial never bypasses mandatory MFA and renewed factor invalidates stale verification", async () => {
    const f = await actor("COMMERCIAL");
    await assignSystemRole({ userId: f.user.id, roleKey: "PAP_ADMIN" });
    assert.equal((await requireCommercialSession(f.token)).userId, f.user.id);
    const primary = await createSession({ userId: f.user.id });
    await denied(primary.token);
    await db.mfaFactor.updateMany({ where: { userId: f.user.id, status: "ACTIVE" }, data: { enabledAt: new Date(Date.now() + 1000) } });
    await denied(f.token);
});
test("expired, revoked, inactive and forged MFA sessions fail closed", async () => {
    for (const change of [{ createdAt: new Date(Date.now() - 7200000), expiresAt: new Date(Date.now() - 3600000) }, { revokedAt: new Date(), revocationReason: "LOGOUT" }, { mfaVerifiedAt: new Date(0) }, { mfaVerifiedAt: new Date(Date.now() + 3600000) }] satisfies Prisma.SessionUpdateInput[]) {
        const f = await actor("COMMERCIAL");
        await db.session.update({ where: { id: f.verified.session.id }, data: change });
        await denied(f.token);
    }
    const f = await actor("COMMERCIAL");
    await db.user.update({ where: { id: f.user.id }, data: { isActive: false } });
    await denied(f.token);
});
test("scoped grant, removed read permission and role revocation never become global demo access", async () => {
    const f = await actor("COMMERCIAL");
    await db.roleAssignment.updateMany({ where: { userId: f.user.id }, data: { organizationId: f.unit.id } });
    await denied(f.token);
    await db.roleAssignment.updateMany({ where: { userId: f.user.id }, data: { organizationId: null } });
    const role = await db.role.findUniqueOrThrow({ where: { key: "COMMERCIAL" } }), permission = await db.permission.findUniqueOrThrow({ where: { key: "commercial.read" } });
    await db.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: permission.id } });
    try {
        await denied(f.token);
    }
    finally {
        await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
    await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
    const responses = await Promise.all(Array.from({ length: 8 }, () => GET(request("/api/vitrine/pacientes", f.token), ctx())));
    assert.ok(responses.every(r => r.status === 403));
});
test("fresh isolated fixtures on every request, no real entity selection or tenant override", async () => {
    for (const section of DEMO_SECTIONS) {
        const r = await GET(request(`/api/vitrine/${section}`, commercial.token), ctx(section));
        assert.equal(r.status, 200);
        const b = await r.json();
        assert.equal(b.mode, "DEMO");
        assert.equal(b.scope, "SYNTHETIC");
        assert.ok(r.headers.get("cache-control")?.includes("no-store"));
    }
    const first = demoContent("pacientes");
    first.patients[0].name = "MUTATED";
    assert.notEqual(demoContent("pacientes").patients[0].name, "MUTATED");
    for (const headers of ([{ "x-organization-id": randomUUID() }, { "x-tenant-id": randomUUID() }] as Record<string, string>[]))
        assert.equal((await GET(request("/api/vitrine/pacientes", commercial.token, undefined, "GET", headers), ctx())).status, 400);
    assert.equal((await GET(request("/api/vitrine/pacientes?mode=real", commercial.token), ctx())).status, 400);
    assert.equal((await GET(request("/api/vitrine/private", commercial.token), ctx("private"))).status, 400);
});
test("simulation validates CSRF, exact body, identifiers and size; creates no clinical record", async () => {
    const before = await db.patient.count(), visits = await db.encounter.count();
    const body = { patientId: "demo-patient-aurora", kind: "PRE_NATAL" };
    const valid = await POST(request("/api/vitrine/registro", commercial.token, body), ctx("registro"));
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).persisted, false);
    for (const invalid of [{ ...body, patientId: randomUUID() }, { ...body, organizationId: commercial.unit.id }, { ...body, kind: "REAL" }, { ...body, kind: null }, { ...body, kind: { toString: "PRE_NATAL" } }, { ...body, kind: "x".repeat(9000) }])
        assert.equal((await POST(request("/api/vitrine/registro", commercial.token, invalid), ctx("registro"))).status, 400);
    assert.equal((await POST(request("/api/vitrine/registro", commercial.token, body, "POST", { origin: "https://untrusted.invalid" }), ctx("registro"))).status, 403);
    assert.equal((await POST(request("/api/vitrine/pacientes", commercial.token, body), ctx())).status, 405);
    assert.equal(await db.patient.count(), before);
    assert.equal(await db.encounter.count(), visits);
});
test("real clinical APIs reject Commercial irrespective of demo query, organization and HTTP verb", async () => {
    const marker = `PRIVATE-${randomUUID()}`;
    const patient = await db.patient.create({ data: { fullName: marker, birthDate: new Date("2000-01-01") } });
    await db.patientOrganization.create({ data: { patientId: patient.id, organizationId: commercial.unit.id } });
    const snapshot = JSON.stringify(await db.patient.findUnique({ where: { id: patient.id } }));
    for (const [handler, method, path] of [[clinicalGet, "GET", ["patients"]], [clinicalGet, "GET", ["patients", patient.id]], [clinicalPost, "POST", ["patients"]], [clinicalPatch, "PATCH", ["patients", patient.id]]] as const) {
        const r = await handler(request(`/api/clinical/${path.join("/")}?mode=demo`, commercial.token, method === "GET" ? undefined : { fullName: "Overwrite" }, method, { "x-organization-id": commercial.unit.id }), { params: Promise.resolve({ path: [...path] }) });
        assert.equal(r.status, 403);
        assert.equal((await r.text()).includes(marker), false);
    }
    const other = randomUUID();
    for (const path of [
        ["patients", patient.id, "pregnancies"],
        ["encounters"], ["encounters", other], ["encounters", other, "vital-signs"],
        ["encounters", other, "obstetric-data"], ["encounters", other, "meows"],
        ["patients", patient.id, "allergies"],
        ["patients", patient.id, "flags"],
        ["patients", patient.id, "revisions"],
    ]) {
        const r = await clinicalGet(request(`/api/clinical/${path.join("/")}?mode=demo`, commercial.token, undefined, "GET", { "x-organization-id": commercial.unit.id }), { params: Promise.resolve({ path }) });
        assert.equal(r.status, 403, `clinical resource ${path[0]} must reject Commercial`);
        assert.equal((await r.text()).includes(marker), false);
    }
    for (const path of [["pregnancies", other], ["allergies", other], ["flags", other]]) {
        const r = await clinicalPatch(request(`/api/clinical/${path.join("/")}?mode=demo`, commercial.token, {}, "PATCH", { "x-organization-id": commercial.unit.id }), { params: Promise.resolve({ path }) });
        assert.equal(r.status, 403, `clinical update ${path[0]} must reject Commercial`);
    }
    assert.equal(JSON.stringify(await db.patient.findUnique({ where: { id: patient.id } })), snapshot);
});
