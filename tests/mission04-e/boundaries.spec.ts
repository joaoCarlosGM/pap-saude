import { test, expect, type APIResponse, type Page, type BrowserContext } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { db } from "../../src/server/db/client";
import { navigationFingerprint } from "../first-access/login-fixtures";
import { fixture } from "../first-access/fixtures";
import { createSession } from "../../src/server/auth/session.service";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { actor, origin } from "../mission04-b/fixtures";
test.beforeAll(async () => { expect(new URL(process.env.DATABASE_URL!).pathname).toBe("/pap_saude_m04_e_test"); await bootstrapSystemIam(); });
test.afterAll(() => db.$disconnect());
test.afterEach(async ({}, info) => { for (const e of info.errors) {
    const location = e.stack?.match(/boundaries\.spec\.ts:\d+:\d+/g)?.join(", ") || "";
    e.message = (e.message || "Browser assertion failed").split("\n")[0].replace(/https?:\/\/\S+/g, "[URL]");
    e.stack = location;
} });
async function cookie(context: BrowserContext, token: string) { await context.clearCookies(); await context.addCookies([{ name: "pap_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]); }
// Next 16.4 validates the RSC cache discriminator before rendering a page.
// Follow only that same-path protocol normalization, never an auth redirect.
async function boundaryRequest(page: Page, path: string, headers: Record<string,string>) {
    let response = await page.request.get(path, { headers, maxRedirects: 0 });
    if (headers.RSC && response.status() === 307 && response.headers().location) {
        const target = new URL(response.headers().location, origin);
        if (target.origin === origin && target.pathname === path && target.searchParams.has("_rsc")) {
            expect([...target.searchParams.keys()]).toEqual(["_rsc"]);
            response = await page.request.get(target.pathname + target.search, { headers, maxRedirects: 0 });
        }
    }
    return response;
}
// Next's non-PPR prefetch deliberately sends only public router metadata.
// Reject anything beyond this closed transport-tree shape (no rendered data).
function assertMetadataPrefetch(body: string, path: string) {
    const rows = new Map<string, unknown>();
    for (const line of body.trim().split("\n")) {
        const match = line.match(/^([0-9a-f]+):(.+)$/);
        expect(!!match).toBe(true);
        rows.set(match![1], JSON.parse(match![2]));
    }
    const root = rows.get("0") as Record<string, unknown>;
    expect(Object.keys(root).sort()).toEqual(["S","b","i","q","r","t"].sort());
    expect(root.i).toBe(true); expect(root.S).toBe(false); expect(root.q).toBe("");
    expect(root.r).toBe("$undefined"); expect(typeof root.b).toBe("string");
    const tree = root.t as { t: Record<string, unknown>; h: unknown };
    expect(Object.keys(tree).sort()).toEqual(["h","t"]);
    expect(tree.h).toEqual({ r: [null,null], p: true, v: null });
    const segments = new Set(["", "__PAGE__", "(dashboard)", "(admin)", "(auth)", "(showcase)", ...path.split("/").filter(Boolean)]);
    const seen = new Set<string>();
    function node(value: Record<string, unknown>) {
        expect(Object.keys(value).every(k => ["s","c","h"].includes(k))).toBe(true);
        if (typeof value.s === "object" && value.s !== null) {
            expect(path.startsWith("/vitrine/")).toBe(true);
            expect(value.s).toEqual({ n:"section", t:"d", k:path.split("/")[2], s:[] });
        } else expect(segments.has(value.s as string)).toBe(true);
        if (value.h !== undefined) expect(typeof value.h).toBe("number");
        if (value.c !== undefined) {
            expect(typeof value.c).toBe("string");
            const reference = (value.c as string).match(/^\$Q([0-9a-f]+)$/);
            expect(!!reference).toBe(true); expect(seen.has(reference![1])).toBe(false);
            seen.add(reference![1]);
            const children = rows.get(reference![1]) as [string,Record<string, unknown>][];
            expect(Array.isArray(children)).toBe(true);
            for (const child of children) { expect(child.length).toBe(2); expect(child[0]).toBe("children"); node(child[1]); }
        }
    }
    node(tree.t);
    expect(rows.size).toBe(seen.size + 1);
}
async function assertAccessRedirect(response: APIResponse, path: string, headers: Record<string,string>, destination: string) {
    const body = await response.text();
    let metadataOnly = false;
    if ([307, 308].includes(response.status())) {
        expect(new URL(response.headers().location, origin).pathname).toBe(destination);
    } else {
        // Flight may begin streaming before an async guard resolves. Its 200
        // must carry the actual redirect digest, never a successful page.
        expect(headers.RSC).toBe("1");
        expect(response.status(), `RSC ${path} status=${response.status()}`).toBe(200);
        expect(response.headers()["content-type"]).toContain("text/x-component");
        const redirects = [...body.matchAll(/NEXT_REDIRECT;(?:replace|push);([^;]+);30[78];/g)].map(m => m[1]);
        if (headers["Next-Router-Prefetch"] && !redirects.length) {
            assertMetadataPrefetch(body,path); metadataOnly = true;
        } else expect(redirects, `RSC ${path} must carry the authorization redirect`).toContain(destination);
    }
    expect(body.includes("Paciente Demo Aurora")).toBe(false);
    return { path, variant: headers.RSC ? headers["Next-Router-Prefetch"] ? "RSC_PREFETCH" : "RSC" : "HTML", status: response.status(), destination: metadataOnly ? null : destination, outcome: metadataOnly ? "ROUTE_METADATA_ONLY" : "AUTHORIZATION_REDIRECT", demoPatientExposed: false };
}
test("direct HTML/RSC/API and URL changes never grant clinical/admin access; revocation invalidates next request", async ({ page, context }) => {
    const f = await actor("COMMERCIAL"), admin = await actor(), manager = await actor("PAP_MANAGER");
    const unassigned = await fixture("PROFESSIONAL");
    await db.roleAssignment.deleteMany({where:{userId:unassigned.user.id}});
    const receipts = [];
    for (const identity of [
        {role:"COMMERCIAL",token:f.token,destination:"/comercial"},
        {role:"PAP_ADMIN",token:admin.token,destination:"/admin"},
        {role:"PAP_MANAGER",token:manager.token,destination:"/admin"},
        {role:"MEMBERSHIP_WITHOUT_ROLE",token:unassigned.session.token,destination:"/login"},
        {role:"ANONYMOUS",token:undefined,destination:"/login"},
    ]) {
        await context.clearCookies();
        if (identity.token) await cookie(context, identity.token);
        for (const path of identity.role === "COMMERCIAL" ? ["/dashboard", "/pacientes", "/registro", "/atendimentos", "/admin"] : ["/dashboard", "/pacientes", "/registro", "/atendimentos"]) {
            for (const headers of ([{}, { RSC: "1" }, { RSC: "1", "Next-Router-Prefetch": "1" }] as Record<string,string>[])) {
                const response = await boundaryRequest(page, path, headers);
                receipts.push({...await assertAccessRedirect(response,path,headers,identity.destination),role:identity.role});
            }
        }
    }
    await cookie(context, f.token);
    for (const path of ["/api/clinical/patients", "/api/admin/organizations", "/api/admin/beta/metrics"]) {
        expect((await page.request.get(path, { headers: { "x-organization-id": f.unit.id } })).status(), path).toBe(403);
    }
    const professional = await fixture("PROFESSIONAL"), pending = await createSession({ userId: f.user.id });
    for (const token of [professional.session.token, pending.token, undefined, admin.token, manager.token]) {
        await context.clearCookies();
        if (token)
            await cookie(context, token);
        for (const path of ["/comercial", "/vitrine", "/vitrine/pacientes"]) {
            for (const headers of ([{}, { RSC: "1" }, { RSC: "1", "Next-Router-Prefetch": "1" }] as Record<string, string>[])) {
                const r = await boundaryRequest(page, path, headers);
                if (token === pending.token && path === "/comercial") {
                    expect(r.status()).toBe(200);
                    const body = await r.text();
                    expect(body.includes("Paciente Demo Aurora")).toBe(false);
                    if (headers["Next-Router-Prefetch"]) assertMetadataPrefetch(body,path);
                    receipts.push({path, variant: headers.RSC ? headers["Next-Router-Prefetch"] ? "RSC_PREFETCH" : "RSC" : "HTML", status:200, destination:headers["Next-Router-Prefetch"] ? null : "MFA_NOTICE",outcome:headers["Next-Router-Prefetch"] ? "ROUTE_METADATA_ONLY" : "MFA_NOTICE",demoPatientExposed:false});
                } else receipts.push(await assertAccessRedirect(r, path, headers, token === pending.token ? "/comercial" : "/login"));
            }
        }
    }
    await cookie(context, f.token);
    await page.goto("/vitrine/registro");
    await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
    expect((await page.request.get("/api/vitrine/pacientes")).status()).toBe(403);
    await page.getByRole("button", { name: "Simular registro", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Confira sua sessão");
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await writeFile("docs/evidence/missao-04-e/rsc-boundaries.json",JSON.stringify(receipts,null,2)+"\n");
});
test("commercial mobile navigation, CTA, back link and logout preserve session boundaries", async ({ page, context }) => {
    const f = await actor("COMMERCIAL");
    await cookie(context, f.token);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/comercial");
    const menu = page.getByRole("button", { name: "Alternar navegação comercial" });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("link", { name: "Abrir vitrine demonstrativa", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/vitrine$/);
    await expect(page.getByRole("heading", { name: "Dashboard demonstrativo", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await page.getByRole("link", { name: "Registro", exact: true }).click();
    await expect(page).toHaveURL(/\/vitrine\/registro$/);
    await expect(page.getByRole("heading", { name: "Simular um registro", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Voltar ao Comercial", exact: true }).first().click();
    await expect(page).toHaveURL(/\/comercial$/);
    await menu.click();
    await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await db.session.findUniqueOrThrow({ where: { id: f.verified.session.id } })).revokedAt !== null).toBe(true);
    expect((await page.request.get("/api/vitrine/pacientes")).status()).toBe(401);
});

test("primary Commercial with active TOTP exits navigation loop and completes real second-factor login without reopening wizard", async ({ page, context }) => {
    const f = await actor("COMMERCIAL"), primary = await createSession({ userId: f.user.id });
    const before = await navigationFingerprint(f.user.id);
    await cookie(context, primary.token);
    let navigations = 0;
    page.on("request", r => { if (r.isNavigationRequest()) navigations++; });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/comercial$/);
    await expect(page.getByRole("heading", { name: "Confirme a segurança desta sessão" })).toBeVisible();
    expect((await page.request.get("/api/vitrine/pacientes")).status()).toBe(403);
    await page.goto("/vitrine");
    await expect(page).toHaveURL(/\/comercial$/);
    await expect(page.getByRole("heading", { name: "Confirme a segurança desta sessão" })).toBeVisible();
    expect(navigations).toBeLessThan(8);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    expect((await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(v=>v.id)).toEqual([]);
    await page.screenshot({ path: "docs/evidence/missao-04-e/mfa-required-dark.png", fullPage: true });
    expect((await navigationFingerprint(f.user.id)) === before).toBe(true);
    await page.getByRole("button", { name: "Encerrar esta sessão e validar MFA" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await db.session.findUniqueOrThrow({where:{id:f.verified.session.id}})).revokedAt).toBeNull();
    await page.getByLabel("E-mail", { exact: true }).fill(f.user.email);
    await page.getByLabel("Senha", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByLabel("Código do autenticador ou código de recuperação").fill(f.codes[1]);
    await page.getByRole("button", { name: "Confirmar MFA", exact: true }).click();
    await expect(page).toHaveURL(/\/comercial$/);
    await expect(page.getByRole("link", { name: "Abrir vitrine demonstrativa", exact: true })).toBeVisible();
    expect((await page.request.get("/api/vitrine/pacientes")).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Seu cuidado começa com segurança" })).toHaveCount(0);
});
