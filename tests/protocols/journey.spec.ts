import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {demoProtocols,protocolHref,protocolTabs} from '../../src/features/vitrine-premium/lib/protocol-catalog';
const api=new WeakMap<Page,string[]>(),errors=new WeakMap<Page,string[]>();
const file=(name:string)=>process.env.PAP_PROTOCOLS_EVIDENCE+'/'+name+'.png';
test.beforeEach(async({page})=>{
 api.set(page,[]);errors.set(page,[]);
 page.on('request',r=>{const p=new URL(r.url()).pathname;if(p.startsWith('/api/')||p.endsWith('.pdf'))api.get(page)!.push(p)});
 page.on('pageerror',e=>errors.get(page)!.push(e.name+': '+e.message));
 await page.addInitScript(()=>sessionStorage.setItem('pap.vitrine.premium.welcome.v2','seen'));
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});
});
test.afterEach(async({page})=>{expect(api.get(page)).toEqual([]);expect(errors.get(page)).toEqual([])});
async function ready(page:Page){await page.locator('[data-demo-ready=true]').waitFor({state:'attached'})}
async function library(page:Page){await page.goto('/vitrine/protocolos');await ready(page);await expect(page.getByRole('heading',{name:'Protocolos',exact:true})).toBeVisible()}
async function axe(page:Page){const result=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([])}

test('library searches accents/codes, combines filters and recovers from no results',async({page})=>{
 await library(page);await expect(page.getByRole('link',{name:'Visualizar',exact:true})).toHaveCount(3);
 await page.getByRole('searchbox',{name:'Pesquisar protocolos'}).fill('PRE ECLAMPSIA');await expect(page.getByRole('link',{name:'Visualizar',exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Limpar filtros'}).click();await page.getByLabel('Tema',{exact:true}).selectOption('Sepse obstétrica');await page.getByLabel('Origem informada',{exact:true}).selectOption('HUAB-UFRN / EBSERH');await page.getByLabel('Versão informada',{exact:true}).selectOption('2 (2025)');await expect(page.getByRole('link',{name:'Visualizar',exact:true})).toHaveCount(1);
 await page.getByRole('searchbox').fill('sem correspondencia');await expect(page.getByRole('heading',{name:'Nenhum protocolo encontrado'})).toBeVisible();await page.getByRole('button',{name:'Limpar filtros'}).click();await expect(page.getByRole('link',{name:'Visualizar',exact:true})).toHaveCount(3);await axe(page);
});

test('all three references and four tabs have real deep links and desktop/mobile evidence',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await library(page);await page.screenshot({path:file('biblioteca-'+width),fullPage:false});
  for(const protocol of demoProtocols){
   await page.getByRole('article').filter({has:page.getByRole('heading',{name:protocol.title,exact:true})}).getByRole('link',{name:'Visualizar',exact:true}).click();
   for(const tab of protocolTabs){
    await page.getByRole('tab',{name:tab.label,exact:true}).click();await expect(page).toHaveURL(new RegExp('protocolo='+protocol.slug+'&aba='+tab.id+'$'));
    await expect(page.getByRole('heading',{name:protocol.title,exact:true})).toBeVisible();await expect(page.getByRole('tab',{name:tab.label,exact:true})).toHaveAttribute('aria-selected','true');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('tabpanel').scrollIntoViewIfNeeded();
    await page.screenshot({path:file(protocol.slug+'-'+tab.id+'-'+width),fullPage:false});
    if(width===1440)await axe(page);
   }
   await page.getByRole('navigation',{name:'Navegação estrutural'}).getByRole('link',{name:'Protocolos',exact:true}).click();
  }
 }
});

test('checklist remains local across tabs/protocols and resets only after confirmation',async({page})=>{
 await page.goto(protocolHref(demoProtocols[0].slug,'checklist'));await ready(page);
 const boxes=page.getByRole('checkbox');await boxes.nth(0).check();await boxes.nth(1).check();await expect(page.getByRole('status').last()).toContainText('2 de 6');
 await page.getByRole('tab',{name:'Visão geral',exact:true}).click();await page.getByRole('tab',{name:'Checklist',exact:true}).click();await expect(boxes.nth(0)).toBeChecked();await expect(boxes.nth(1)).toBeChecked();
 await page.getByRole('navigation',{name:'Navegação estrutural'}).getByRole('link',{name:'Protocolos',exact:true}).click();await page.getByRole('article').filter({has:page.getByRole('heading',{name:demoProtocols[1].title,exact:true})}).getByRole('link',{name:'Visualizar',exact:true}).click();await page.getByRole('tab',{name:'Checklist',exact:true}).click();await expect(boxes.nth(0)).not.toBeChecked();await boxes.nth(0).check();
 await page.getByRole('navigation',{name:'Navegação estrutural'}).getByRole('link',{name:'Protocolos',exact:true}).click();await page.getByRole('link',{name:'Visualizar',exact:true}).first().click();await page.getByRole('tab',{name:'Checklist',exact:true}).click();await expect(boxes.nth(1)).toBeChecked();
 await page.getByRole('button',{name:'Limpar marcações',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(boxes.nth(1)).toBeChecked();
 await page.getByRole('button',{name:'Limpar marcações',exact:true}).click();await page.getByRole('button',{name:'Confirmar limpeza',exact:true}).click();await expect(boxes.nth(0)).not.toBeChecked();await expect(boxes.nth(1)).not.toBeChecked();await expect(page.getByRole('button',{name:'Limpar marcações',exact:true})).toBeFocused();
 await boxes.nth(0).check();await page.getByTitle('Opções do perfil demonstrativo').click();await page.getByRole('button',{name:'Restaurar demonstração',exact:true}).click();await page.getByRole('button',{name:'Restaurar dados sintéticos',exact:true}).click();await expect(boxes.nth(0)).not.toBeChecked();
 await boxes.nth(0).check();await page.reload();await ready(page);await expect(boxes.nth(0)).not.toBeChecked();
});

test('native history/reload and keyboard tab navigation retain validated location; flow controls are genuine',async({page})=>{
 await page.goto(protocolHref(demoProtocols[0].slug));await ready(page);await page.getByRole('tab',{name:'Visão geral',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Fluxograma',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('heading',{name:'Fluxograma original • fonte em revisão',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:/13. Fluxograma • digital 22/})).toBeVisible();await expect(page.getByRole('button',{name:'Aumentar zoom do esquema'})).toHaveCount(0);
 await page.getByRole('tab',{name:'Documento original',exact:true}).click();await expect(page.getByRole('button',{name:'Abrir PDF',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Baixar PDF',exact:true})).toBeDisabled();await page.goBack();await expect(page.getByRole('tab',{name:'Fluxograma',exact:true})).toHaveAttribute('aria-selected','true');await page.goForward();await page.reload();await expect(page.getByRole('heading',{name:'PDF original indisponível'})).toBeVisible();
});

test('paused items are noninteractive and direct HTML/RSC routes never mount old chat or course player',async({page,request})=>{
 await library(page);
 for(const id of ['chat','cursos']){const item=page.locator('[data-tour-coming-soon="'+id+'"]');await expect(item).toContainText('Em breve');await expect(item.locator('a,button,[tabindex],[onclick]')).toHaveCount(0);expect(await item.getAttribute('tabindex')).toBeNull();await item.click();await expect(page).toHaveURL(/\/vitrine\/protocolos$/)}
 for(const path of ['/vitrine/chat','/vitrine/cursos','/vitrine/aprender/pre-natal']){
  await page.goto(path);await expect(page.locator('[data-showcase-unavailable]')).toContainText('Em breve');await expect(page.getByPlaceholder('Digite sua mensagem...')).toHaveCount(0);await expect(page.getByRole('button',{name:'Enviar mensagem',exact:true})).toHaveCount(0);
  const rsc=await request.get(path,{headers:{RSC:'1'}});expect(rsc.status()).toBe(200);const body=await rsc.text();expect(body).toContain('data-showcase-unavailable');expect(body).toContain('Em breve');expect(body).not.toContain('Digite sua mensagem...');expect(body).not.toContain('DemoLearning');
 }
 for(const path of ['/vitrine/protocolos?protocolo=unknown','/vitrine/protocolos?protocolo=sepse-obstetrica&aba=invalid','/vitrine/protocolos?protocolo=sepse-obstetrica&protocolo=hemorragia-pos-parto','/vitrine/chat?role=COMMERCIAL','/vitrine/unknown'])expect((await request.get(path)).status()).toBe(404);
});

test('presentation loading/empty/error states give truthful feedback',async({page})=>{
 for(const [state,text]of [['empty','Nenhum documento em preparação'],['loading','Carregando biblioteca de protocolos…'],['error','Catálogo indisponível']]){await page.goto('/states/'+state);await expect(page.getByText(text,{exact:true})).toBeVisible()}
});

test('responsive library/detail, dark mode and keyboard focus avoid horizontal overflow',async({page})=>{
 for(const width of [320,375,390,430,768,1440]){
  await page.setViewportSize({width,height:900});await library(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('link',{name:'Visualizar',exact:true}).first().click();await page.getByRole('tab',{name:'Documento original',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width<768){await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(page.getByRole('navigation',{name:'Módulos'}).getByRole('link',{name:'Protocolos',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toBeFocused()}
 }
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await axe(page);await page.screenshot({path:file('documento-dark-1440'),fullPage:false});await page.getByRole('tab',{name:'Visão geral',exact:true}).focus();await expect(page.getByRole('tab',{name:'Visão geral',exact:true})).toBeFocused();
});

for(const width of [1440,375])test('six-step help tour avoids paused routes and resumes from detail query at '+width,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(protocolHref(demoProtocols[0].slug,'checklist'));await ready(page);
 if(width<768)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.locator('[data-tour-help]').click();await page.getByRole('button',{name:'Iniciar tutorial guiado',exact:true}).click();
 for(let n=1;n<=6;n++){const panel=page.locator('[data-tour-step]');await expect(panel).toHaveAttribute('data-tour-ready','true');await expect(panel).toContainText(`Etapa ${n} de 6`);expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).pathname).not.toMatch(/\/vitrine\/(chat|cursos)/);await panel.getByRole('button',{name:n===6?'Concluir':'Próximo',exact:true}).click()}
 await expect(page.locator('[data-tour-step]')).toHaveCount(0);
});
