import {test,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import {writeFile} from 'node:fs/promises';import {protocolHref,demoProtocols} from '../../src/features/vitrine-premium/lib/protocol-catalog'
const capture=(name:string)=>process.env.PAP_PROTOCOLS_EVIDENCE+'/'+name+'.png';
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem('pap.vitrine.premium.welcome.v2','seen'))});
test('approved Premium runtime motion, native navigation and reduced motion remain equivalent to the reference source',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/vitrine/dashboard');await page.locator('[data-demo-ready=true]').waitFor({state:'attached'});await expect(page.locator('[data-motion-kpis]>article')).toHaveCount(8);
 const motion=await page.evaluate(()=>{const css=(s:string)=>{const el=document.querySelector(s)!;const c=getComputedStyle(el);return {duration:c.animationDuration,delay:c.animationDelay,name:c.animationName}};return {page:css('[data-motion-page]'),title:css('main h1'),kpi:css('[data-motion-kpis]>article'),lastKpi:css('[data-motion-kpis]>article:nth-child(8)'),chart:css('[data-demo-total]'),measuredAnimations:document.getAnimations().length}});expect(motion.page.duration).toBe('0.26s');expect(motion.title.duration).toBe('0.26s');expect(motion.kpi.duration).toBe('0.36s');expect(motion.lastKpi.delay).toBe('0.455s');expect(motion.chart.duration).toBe('0.85s');expect(motion.measuredAnimations).toBeGreaterThan(0);
 await page.screenshot({path:capture('premium-dashboard-1440')});await page.getByRole('link',{name:'Pacientes',exact:true}).click();await expect(page).toHaveURL(/\/vitrine\/pacientes$/);await page.locator('[data-patient-id]').first().click();await expect(page).toHaveURL(/\/vitrine\/pacientes\/[^/]+$/);await page.goBack();await expect(page).toHaveURL(/\/vitrine\/pacientes$/);await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('[data-motion-page]').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');expect(errors).toEqual([]);await writeFile(process.env.PAP_PROTOCOLS_EVIDENCE+'/motion-runtime.json',JSON.stringify({status:'PASS',...motion,reducedMotion:'none',navigationErrors:0},null,2));
});
test('source-backed protocol layouts fit seven widths, light/dark and accessible checklist',async({page})=>{
 test.setTimeout(240000); // Seven widths × two themes and three checklists, with fixture navigation.
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/vitrine/configuracoes');await page.locator('[data-private-review]>summary').click();await page.getByRole('button',{name:'Autorizar consulta local dos PDFs',exact:true}).click();await expect(page.locator('[data-private-review]>summary')).toContainText('consulta autorizada');
 for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:1000});for(const colorScheme of ['light','dark'] as const){await page.emulateMedia({colorScheme});await page.goto(protocolHref(demoProtocols[0].slug));await expect(page.getByRole('tab',{name:'Visão geral',exact:true})).toHaveAttribute('aria-selected','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:capture('protocol-overview-'+width+'-'+colorScheme),fullPage:true});if(width===390||width===1440){await page.getByRole('heading',{name:'Objetivo e contexto de origem',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:capture('protocol-sourced-cards-'+width+'-'+colorScheme)})};if(width===320||width===1440){const a=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(a.violations.map(v=>({id:v.id,target:v.nodes.map(n=>n.target)}))).toEqual([])}}}
 for(const protocol of demoProtocols){for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:'light'});await page.goto(protocolHref(protocol.slug,'checklist'));await page.getByRole('button',{name:'Recolher grupos',exact:true}).click();await expect(page.locator('details:has(input[type=checkbox])[open]')).toHaveCount(0);await page.getByRole('button',{name:'Expandir grupos',exact:true}).click();expect(await page.getByRole('checkbox').count()).toBeGreaterThan(0);await page.getByRole('checkbox').first().check();expect(await page.getByRole('checkbox').first().isChecked()).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:capture('protocol-'+protocol.slug+'-checklist-'+width),fullPage:true})}}
 expect(errors).toEqual([])
});
test('structured protocol map navigates, zooms, enters fullscreen and alternates to the authorized original',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/vitrine/configuracoes')
 await page.locator('[data-private-review]>summary').click()
 await page.getByRole('button',{name:'Autorizar consulta local dos PDFs',exact:true}).click()
 await expect(page.locator('[data-private-review]>summary')).toContainText('consulta autorizada')
 await page.setViewportSize({width:1440,height:1000});await page.goto(protocolHref(demoProtocols[0].slug,'fluxograma'));const map=page.getByRole('region',{name:'Mapa navegável do fluxograma'})
 await expect(map).toBeVisible()
 await page.getByRole('button',{name:'Ampliar zoom',exact:true}).click()
 await expect(page.getByLabel('Zoom do mapa')).toHaveText('125%')
 await page.getByRole('button',{name:'Ajustar',exact:true}).click()
 await expect(page.getByLabel('Zoom do mapa')).toHaveText('100%')
 await map.getByRole('button',{name:'Critérios indicados na figura',exact:true}).click()
 await expect(map.locator('[data-focused=true]')).toBeFocused()
 await page.screenshot({path:capture('protocol-map-1440')})
 await page.getByRole('button',{name:'Tela cheia',exact:true}).click()
 expect(await page.evaluate(()=>!!document.fullscreenElement)).toBe(true)
 await page.getByRole('button',{name:'Tela cheia',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false)
 await page.getByRole('button',{name:'Figura original',exact:true}).click()
 await expect(page.locator('canvas[data-pdf-rendered=true]')).toBeVisible()
 await page.screenshot({path:capture('protocol-flow-original-1440'),mask:[page.locator('canvas[data-pdf-rendered]')],fullPage:true});
 await page.getByRole('link',{name:'Abrir PDF original',exact:true}).click();const download=await page.getByRole('link',{name:'Baixar PDF original',exact:true}).getAttribute('href');const response=await context.request.get(download!);expect(response.status()).toBe(200);expect(response.headers()['content-disposition']).toMatch(/^attachment/);expect(errors).toEqual([]);
});

test('profile photo validates, crops, persists across refresh and resets with the demo', async ({page}) => {
 const {PNG}=await import('pngjs')
 const photo=new PNG({width:192,height:128})
 for(let offset=0;offset<photo.data.length;offset+=4){
  photo.data[offset]=200
  photo.data[offset+1]=offset%251
  photo.data[offset+2]=139
  photo.data[offset+3]=255
 }
 await page.setViewportSize({width:375,height:900})
 await page.goto('/vitrine/configuracoes')
 await page.getByRole('button',{name:'Alterar foto',exact:true}).click()
 const modal=page.getByRole('dialog',{name:'Foto do perfil'})
 const upload=modal.locator('input[type=file]')
 await upload.setInputFiles({name:'falso.png',mimeType:'image/png',buffer:Buffer.from('invalid')})
 await expect(modal.getByRole('alert')).toContainText('PNG, JPEG ou WebP válido')
 await upload.setInputFiles({name:'perfil-sintetico.png',mimeType:'image/png',buffer:PNG.sync.write(photo)})
 await expect(modal.getByRole('img',{name:'Prévia do recorte'})).toBeVisible()
 await modal.getByLabel('Zoom').focus()
 await page.keyboard.press('ArrowRight')
 const keep=async()=>{page.once('dialog',dialog=>dialog.dismiss());await page.keyboard.press('Escape')}
 await keep()
 await expect(modal).toBeVisible()
 await modal.getByRole('button',{name:'Salvar foto',exact:true}).click()
 await expect(modal).toHaveCount(0)
 await page.reload()
 await expect(page.locator('main img[src^="data:image/jpeg;base64,"]')).toBeVisible()
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click()
 await expect(page.getByRole('button',{name:/Ana Paula Ferreira/}).locator('img')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:capture('profile-sidebar-375')})
 await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Restaurar demonstração',exact:true}).click()
 await page.getByRole('button',{name:'Restaurar dados sintéticos',exact:true}).click()
 await expect(page.locator('main img[src^="data:image/jpeg;base64,"]')).toHaveCount(0)
})

test('informative encounter dialog closes by backdrop and keyboard, retains focus and identifies historical gaps',async({page})=>{
 await page.setViewportSize({width:1440,height:900})
 await page.goto('/vitrine/atendimentos')
 const trigger=page.getByRole('button',{name:'Ver detalhes',exact:true}).first()
 await trigger.click()
 const dialog=page.getByRole('dialog',{name:'Detalhes do Atendimento'})
 await expect(dialog.getByText(/Sem histórico disponível/)).toBeVisible()
 await expect(dialog.getByText('Não registrado',{exact:true}).first()).toBeVisible()
 await expect(dialog.getByRole('button',{name:'Fechar',exact:true})).toHaveCount(1)
 await expect(dialog.locator('button a')).toHaveCount(0)
 const close=dialog.getByRole('button',{name:'Fechar',exact:true})
 await expect(close).toBeFocused()
 await page.keyboard.press('Shift+Tab')
 await expect(dialog.getByRole('link',{name:'Abrir ficha da paciente',exact:true})).toBeFocused()
 await page.keyboard.press('Tab')
 await expect(close).toBeFocused()
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden')
 await dialog.getByRole('heading',{name:'Cronologia'}).click()
 await expect(dialog).toBeVisible()
 await page.mouse.click(5,5)
 await expect(dialog).toHaveCount(0)
 await expect(trigger).toBeFocused()
 await trigger.click()
 await page.keyboard.press('Escape')
 await expect(trigger).toBeFocused()
 expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden')
})
