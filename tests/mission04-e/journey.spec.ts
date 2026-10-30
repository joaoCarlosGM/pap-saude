import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { Client } from "pg";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { actor, origin } from "../mission04-b/fixtures";
import { DEMO_SECTIONS } from "../../src/lib/demo/types";
import { navigationFingerprint } from "../first-access/login-fixtures";
import {welcome,incompleteDraft} from './premium-ui';
test.beforeAll(async () => { expect(new URL(process.env.DATABASE_URL!).pathname).toBe("/pap_saude_m04_e_test"); await bootstrapSystemIam(); });
test.afterAll(() => db.$disconnect());
test.afterEach(async ({}, info) => { for (const e of info.errors) {
    const location = e.stack?.match(/journey\.spec\.ts:\d+:\d+/g)?.join(", ") || "";
    e.message = (e.message || "Browser assertion failed").split("\n")[0].replace(/https?:\/\/\S+/g, "[URL]");
    e.stack = location;
} });
async function cookie(context: BrowserContext, token: string) { await context.clearCookies(); await context.addCookies([{ name: "pap_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]); }
async function a11y(page: Page, label: string) { const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); if (r.violations.length) {
    await mkdir('.test-audit/mission04-e', {recursive:true,mode:0o700});
    await writeFile(`.test-audit/mission04-e/axe-${label}.json`, JSON.stringify(r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })) })), null, 2), {mode:0o600});
} expect(r.violations.map(v => v.id), label).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label).toBe(true);
if(await page.locator('[data-vitrine-premium]').count())expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),`${label}: only the application content should scroll`).toBe(true); }
async function capture(page: Page, label: string) { await mkdir("docs/evidence/missao-04-e", { recursive: true }); await page.screenshot({ path: `docs/evidence/missao-04-e/${label}.png`, fullPage: true, mask: [page.locator("input,textarea,[data-sensitive]")], maskColor: "#475569" }); }
async function metricsReady(page: Page) { await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(i => i.getClientRects().length && (i.complete || i.loading !== "lazy")).map(i => i.decode().catch(() => { }))); await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); }); }
test("database runtime cannot read organizations or clinical tables; all showcase sections still work", async ({ page, context }) => {
    const restricted = new Client({ connectionString: process.env.PAP_E_RUNTIME_DATABASE_URL });
    await restricted.connect();
    try {
        for (const table of ["organizations", "patients", "encounters"]) {
            const r = await restricted.query("SELECT has_table_privilege(current_user,$1,'SELECT') AS can_read,has_table_privilege(current_user,$1,'INSERT,UPDATE,DELETE') AS can_write", [table]);
            expect(r.rows[0]).toEqual({ can_read: false, can_write: false });
        }
    }
    finally {
        await restricted.end();
    }
    const f = await actor("COMMERCIAL");
    await db.membership.create({ data: { userId: f.user.id, organizationId: f.unit.id, status: "ACTIVE" } });
    const before = await navigationFingerprint(f.user.id);
    await cookie(context, f.token);
    let first=true;
    for (const section of DEMO_SECTIONS) {
        const r = await page.request.get(`/api/vitrine/${section}`);
        expect(r.status()).toBe(200);
        expect((await r.json()).scope).toBe("SYNTHETIC");
        await page.goto(section === "dashboard" ? "/vitrine" : `/vitrine/${section}`);
        await welcome(page,first);first=false;
        await expect(page.getByText("Modo demonstração · vínculo fictício", { exact: true })).toBeVisible();
        await expect(page.locator("main h1")).toBeVisible();
    }
    const r = await page.request.post("/api/vitrine/registro", { headers: { origin }, data: { patientId: "demo-patient-aurora", kind: "RETORNO" } });
    expect(r.status()).toBe(200);
    expect((await r.json()).persisted).toBe(false);
    expect((await navigationFingerprint(f.user.id)) === before).toBe(true);
});
test("premium Commercial and pink showcase at desktop/tablet/mobile, light/dark, no external requests", async ({ page, context }) => {
    const f = await actor("COMMERCIAL");
    await cookie(context, f.token);
    let external = false;
    await page.route("**/*", route => { const u = new URL(route.request().url()); if (u.protocol.startsWith("http") && u.origin !== origin) {
        external = true;
        return route.abort();
    } return route.continue(); });
    await page.addInitScript(() => { const metrics = { lcpMs: 0, cls: 0 }; Object.assign(window, { papEPerformance: metrics }); new PerformanceObserver(l => { for (const e of l.getEntries())
        metrics.lcpMs = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); new PerformanceObserver(l => { for (const e of l.getEntries()) {
        const s = e as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
        };
        if (!s.hadRecentInput)
            metrics.cls += s.value;
    } }).observe({ type: "layout-shift", buffered: true }); });
    const rows = [];let first=true;
    for (const width of [1440, 768, 320])
        for (const colorScheme of ["light", "dark"] as const)
            for (const path of ["/comercial", "/vitrine"]) {
                await page.setViewportSize({ width, height: 900 });
                await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
                await page.goto(path);
                if(path==='/vitrine'){await welcome(page,first);first=false;}
                await metricsReady(page);
                await expect(page.locator("main h1")).toBeVisible();
                if (path === "/comercial")
                    await expect(page.getByRole("link", { name: "Abrir vitrine demonstrativa", exact: true })).toBeVisible();
                await a11y(page, `${path.slice(1)}-${width}-${colorScheme}`);
                await capture(page, `${path.slice(1)}-${width}-${colorScheme}`);
                const metrics = await page.evaluate(() => (window as unknown as {
                    papEPerformance: {
                        lcpMs: number;
                        cls: number;
                    };
                }).papEPerformance);
                expect(metrics.cls).toBeLessThanOrEqual(.1);
                rows.push({ path, width, colorScheme, ...metrics });
            }
    await writeFile("docs/evidence/missao-04-e/performance.json", JSON.stringify({ environment: "single local Next dev run; diagnostic, not production p75 or SLA", rows }, null, 2) + "\n");
    expect(external).toBe(false);
    await page.goto('/comercial');
    await page.getByRole("button", { name: "Alternar tema claro e escuro" }).click();
    await a11y(page, "theme-toggle");
});
test("all demo interactions are labeled, keyboard accessible and reset without persistence", async ({ page, context }) => {
    const f=await actor("COMMERCIAL");await cookie(context,f.token);
    const before=await navigationFingerprint(f.user.id);const forbidden:string[]=[];
    page.on('request',r=>{const path=new URL(r.url()).pathname;if(/^\/api\/(clinical|admin)(?:\/|$)/.test(path))forbidden.push(path);});
    await page.setViewportSize({width:1440,height:900});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await page.goto('/vitrine/pacientes');await welcome(page,true);
    for(const section of ['pacientes','atendimentos','protocolos','ferramentas','cursos','registro','chat','ajuda','configuracoes']){
        await page.goto(`/vitrine/${section}`);await welcome(page,false);await a11y(page,section);
    }
    await page.goto('/vitrine/pacientes');
    const search=page.getByRole('searchbox',{name:'Buscar pacientes demonstrativos'});await search.fill('sem resultado');
    await expect(page.getByRole('status')).toContainText('Nenhuma paciente encontrada');await search.fill('');
    const card=page.locator('[data-patient-id]').first(),patientId=await card.getAttribute('data-patient-id'),patientName=await card.getByRole('heading').innerText();
    await card.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp('/vitrine/pacientes/'+patientId+'$'));
    await expect(page.getByRole('heading',{name:patientName,exact:true})).toBeVisible();await a11y(page,'patient-record');
    await page.goto('/vitrine/registro');
    await expect(page.locator('#patient-name')).toBeEditable();await incompleteDraft(page,'Pessoa Sintética Slice E');
    await expect(page.locator('[data-meows-status]')).toHaveAttribute('data-meows-status','INCOMPLETO');
    await expect(page.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','—');
    await page.getByRole('button',{name:'Salvar Registro',exact:true}).click();
    await expect(page.getByRole('button',{name:'Registro demonstrativo salvo',exact:true})).toBeDisabled();
    await capture(page,'registro-simulado-dark');await page.getByRole('link',{name:'Abrir ficha da paciente'}).click();
    await expect(page.getByRole('heading',{name:'Pessoa Sintética Slice E',exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Dashboard',exact:true}).click();
    await expect(page.getByText('Pacientes ativas',{exact:true}).locator('..')).toContainText('4');
    expect((await navigationFingerprint(f.user.id))===before).toBe(true);
    await page.getByRole('link',{name:'Configurações',exact:true}).click();
    await page.getByRole('button',{name:'Restaurar demonstração',exact:true}).click();
    await page.getByRole('button',{name:'Restaurar dados sintéticos',exact:true}).click();
    await page.getByRole('link',{name:'Dashboard',exact:true}).click();
    await expect(page.getByText('Pacientes ativas',{exact:true}).locator('..')).toContainText('3');
    await page.reload();await expect(page.getByRole('dialog',{name:'Bem-vindo ao PAP Saúde'})).not.toBeVisible();
    await page.goto('/vitrine/cursos');await page.getByRole('link',{name:'Explorar demonstração',exact:true}).first().click();
    await expect(page).toHaveURL(/\/vitrine\/aprender\/pre-natal$/);
    await expect(page.getByRole('heading',{name:'Explore a experiência de aprendizagem',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Concluir atividade demonstrativa',exact:true})).toBeDisabled();
    await expect(page.getByText('Ambiente fictício.',{exact:false})).toBeVisible();
    await a11y(page,'course-player');await capture(page,'curso-simulado-dark');
    await page.goto('/vitrine/chat');await page.getByPlaceholder('Digite sua mensagem...').fill('Mensagem sintética Slice E');
    await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();
    await expect(page.getByText('Simulação: nenhuma IA externa foi consultada. Este texto ilustrativo não avalia dados nem orienta condutas clínicas.',{exact:true})).toBeVisible();
    await page.reload();await expect(page.getByText('Mensagem sintética Slice E',{exact:true})).toHaveCount(0);
    await page.setViewportSize({width:320,height:900});await page.goto('/vitrine');
    const menu=page.getByRole('button',{name:'Abrir menu',exact:true});await menu.click();
    await expect(page.getByRole('dialog',{name:'Navegação principal'})).toBeVisible();await a11y(page,'mobile-menu');
    await page.keyboard.press('Escape');await expect(menu).toBeFocused();await menu.click();
    await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('dialog',{name:'Navegação principal'})).toHaveCount(0);
    expect((await navigationFingerprint(f.user.id))===before).toBe(true);expect(forbidden).toEqual([]);
});
