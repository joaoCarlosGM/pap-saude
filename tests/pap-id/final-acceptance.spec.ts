import {test,expect} from '@playwright/test';import {randomBytes,createHash} from 'node:crypto';import {syntheticPdf} from './synthetic-pdf'
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex')
async function authorize(page: import('@playwright/test').Page, path: string) {
 await page.goto('/vitrine/configuracoes')
 await page.locator('[data-private-review]>summary').click()
 const grant=page.waitForResponse(response=>response.url().endsWith('/homologacao/sessao')&&response.request().method()==='POST')
 await page.getByRole('button',{name:'Autorizar consulta local dos PDFs',exact:true}).click()
 expect((await grant).status()).toBe(200)
 await expect(page.locator('[data-private-review]>summary')).toContainText('consulta autorizada')
 await page.goto(path)
}
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem('pap.vitrine.premium.welcome.v2','seen'));await page.emulateMedia({reducedMotion:'reduce'})})
test('new synthetic patient persists, issues a recoverable card and versions/downloads private PDFs without crossing patient scope',async({page,context})=>{
 test.setTimeout(120000)
 expect(process.env.PAP_ID_REVIEW_PROFILE,'owned PostgreSQL profile required').toBeTruthy();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));await authorize(page,'/vitrine/pacientes');await page.getByRole('button',{name:'Cadastrar nova gestante',exact:true}).click();const name='Gestante Sintética Browser '+randomBytes(3).toString('hex');await page.getByLabel('Nome sintético',{exact:true}).fill(name);await page.getByLabel('Confirmo que são dados inteiramente sintéticos.',{exact:true}).check();await page.getByRole('button',{name:'Salvar gestante sintética',exact:true}).click();await expect(page.getByText('Cadastro confirmado no PostgreSQL exclusivo.',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Abrir prontuário e Documentos',exact:true}).click();await expect(page).toHaveURL(/\/vitrine\/pacientes\/review-[a-f0-9-]{36}\?aba=documentos$/);await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();const patientId=new URL(page.url()).pathname.split('/').at(-1)!;
 await page.getByRole('button',{name:'Emitir carteirinha PAP-ID',exact:true}).click();await page.getByRole('button',{name:'Confirmar emissão',exact:true}).click();
 const openCard=()=>page.getByRole('button',{name:'Visualizar carteirinha',exact:true}).click()
 await openCard();const card=page.getByRole('img',{name:'Frente da carteirinha PAP-ID',exact:true});await expect(card).toBeVisible();const cardURL=await card.getAttribute('src');expect((await context.request.get(cardURL!)).status()).toBe(200);expect((await context.request.get(cardURL!.replace(patientId,'maria-gracas'))).status()).toBe(404);
 const viewer=page.getByRole('dialog',{name:'Carteirinha PAP-ID',exact:true})
 for(const format of ['Colorida','Preto e branco']){
  await viewer.getByRole('combobox',{name:/Formato/}).selectOption({label:format})
  await viewer.getByRole('button',{name:'Verso',exact:true}).click()
  await expect(viewer.getByRole('img',{name:'Verso da carteirinha PAP-ID'})).toBeVisible()
  for(const type of ['PDF','PNG']){
   const href=(await viewer.getByRole('link',{name:'Baixar '+type,exact:true}).getAttribute('href'))!
   const response=await context.request.get(href)
   expect(response.status()).toBe(200)
   expect(response.headers()['content-type']).toBe(type==='PDF'?'application/pdf':'image/png')
   if(type==='PNG'){
    const [{PNG}, {default:jsQR}]=await Promise.all([import('pngjs'),import('jsqr')])
    const image=PNG.sync.read(await response.body())
    expect(image.height).toBe(1200)
    expect(jsQR(new Uint8ClampedArray(image.data),image.width,image.height)?.data.startsWith('PAP-ID-DEMO-1.')).toBe(true)
   }
   if(type==='PDF')expect((await response.body()).subarray(0,5).toString()).toBe('%PDF-')
   expect((await page.request.get(href.replace(patientId,'maria-gracas'))).status()).toBe(404)
  }
 }
 await page.emulateMedia({media:'print'})
 await expect(page.locator('[data-pap-card-print]')).toBeVisible()
 await expect(page.getByRole('navigation',{name:'Módulos'})).toBeHidden()
 await page.emulateMedia({media:'screen'})
 await page.keyboard.press('Escape')
 const noticeTrigger=page.getByRole('button',{name:'Avisos',exact:true})
 await noticeTrigger.click()
 const inbox=page.getByRole('dialog',{name:'Caixa de entrada'})
 await inbox.getByRole('button',{name:'Documentos',exact:true}).click()
 await expect(inbox.getByRole('heading',{name:'Carteirinha emitida',exact:true}).first()).toBeVisible()
 await inbox.getByRole('button',{name:'Marcar todos como lidos',exact:true}).click()
 await expect(inbox.getByText('0 não lido(s)',{exact:true})).toBeVisible()
 await inbox.getByRole('button',{name:'Protocolos',exact:true}).click()
 await expect(inbox.getByText('Nenhum aviso nesta categoria.',{exact:true})).toBeVisible()
 await page.keyboard.press('Escape')
 await expect(noticeTrigger).toBeFocused()
 const pdf=syntheticPdf();await page.getByLabel('PDF sintético da paciente',{exact:true}).setInputFiles({name:'teste-sintetico.pdf',mimeType:'application/pdf',buffer:pdf});await page.getByLabel('Confirmo que o PDF não contém identificação pessoal ou dados clínicos reais.',{exact:true}).check();const upload=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/documentos'));await page.getByRole('button',{name:'Enviar PDF privado',exact:true}).click();const uploaded=await upload;expect(uploaded.status()).toBe(201);const article=page.getByRole('article').filter({has:page.getByRole('heading',{name:'teste-sintetico.pdf',exact:true})});await expect(article).toBeVisible();const link=article.getByRole('link',{name:'Baixar PDF privado',exact:true}),url=await link.getAttribute('href');const response=await context.request.get(url!);expect(response.status()).toBe(200);expect(sha(await response.body())).toBe(sha(pdf));expect((await context.request.get(url!.replace(patientId,'maria-gracas'))).status()).toBe(404);
 await article.getByRole('button',{name:'Visualizar PDF privado',exact:true}).click();await expect(page.locator('canvas[data-pdf-rendered=true]')).toBeVisible();await page.getByRole('button',{name:'Texto extraído da página',exact:true}).click();await expect(page.getByRole('region',{name:'Texto original da página, rolável',exact:true})).toContainText('Documento sintetico');await page.keyboard.press('Escape');
 await page.reload();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await page.getByRole('button',{name:'Documentos',exact:true}).click();await expect(page.getByRole('button',{name:'Visualizar carteirinha',exact:true})).toBeVisible();await expect(article).toBeVisible();expect(sha(await (await context.request.get(url!)).body())).toBe(sha(pdf));
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:process.env.PAP_PROTOCOLS_EVIDENCE+'/documents-'+width+'.png',mask:[card]})}
 await article.getByRole('button',{name:'Arquivar',exact:true}).click();await page.getByRole('button',{name:'Confirmar arquivamento',exact:true}).click();await expect(article).toContainText('Arquivado');expect((await context.request.get(url!)).status()).toBe(404);expect(errors).toEqual([]);
});
test('camera decodes a real opaque QR from a simulated local video stream, ignores duplicates and stops every track',async({page,context})=>{
 await authorize(page,'/vitrine/registro');await expect(page.getByRole('button',{name:'Escanear carteirinha',exact:true})).toBeEnabled();const token='PAP-ID-DEMO-1.'+randomBytes(32).toString('base64url');const r=await context.request.post('/homologacao/carteirinhas',{headers:{origin:process.env.PAP_PROTOCOLS_BASE_URL!,'x-pap-local-review':'cards'},data:{action:'issue',patientId:'maria-gracas',operationId:crypto.randomUUID(),token}});expect(r.status()).toBe(200);const {png}=await r.json()
 await page.evaluate(async png=>{const w=window as typeof window&{__cameraTracks?:MediaStreamTrack[];__cameraCanvas?:HTMLCanvasElement;__cameraStop?:()=>void};w.__cameraTracks=[];const canvas=document.createElement('canvas');w.__cameraCanvas=canvas;canvas.width=1050;canvas.height=1200;const image=new Image();image.src=png;await image.decode();canvas.getContext('2d')!.drawImage(image,0,0);const ticker=setInterval(()=>canvas.getContext('2d')!.drawImage(image,0,0),100);w.__cameraStop=()=>clearInterval(ticker);Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const stream=canvas.captureStream(8);w.__cameraTracks!.push(...stream.getTracks());return stream}});Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{configurable:true,value:async()=>[{kind:'videoinput',deviceId:'fake-back',label:'Câmera de teste'}]})},png)
 const reader=page.getByRole('dialog',{name:'Escanear carteirinha PAP-ID'})
 const candidates=page.getByRole('region',{name:'Carteirinhas detectadas'})
 await page.getByRole('button',{name:'Escanear carteirinha',exact:true}).click()
 await expect(reader.getByLabel('Prévia ao vivo da câmera')).toBeHidden()
 await reader.getByRole('button',{name:'Ativar câmera',exact:true}).click()
 await expect(reader).toHaveCount(0)
 await expect(candidates.getByRole('heading')).toBeFocused()
 await expect(candidates.getByRole('listitem')).toHaveCount(1)
 await expect(page.getByLabel('Documento sintético da carteirinha')).toHaveCount(0)
 await expect(candidates.getByRole('article',{name:'Prévia da carteirinha PAP-ID'})).toBeVisible()
 await page.screenshot({path:process.env.PAP_PROTOCOLS_EVIDENCE+'/camera-auto-close.png',mask:[candidates.getByRole('article')]})
 await candidates.getByRole('button',{name:'Adicionar mais carteirinhas',exact:true}).click()
 await reader.getByRole('button',{name:'Ativar câmera',exact:true}).click()
 await expect(reader).toHaveCount(0)
 await expect(candidates.getByRole('listitem')).toHaveCount(1)
 const second = await context.request.post('/homologacao/carteirinhas',{headers:{origin:process.env.PAP_PROTOCOLS_BASE_URL!,'x-pap-local-review':'cards'},data:{action:'issue',patientId:'fernanda-costa',operationId:crypto.randomUUID(),token:'PAP-ID-DEMO-1.'+randomBytes(32).toString('base64url')}})
 expect(second.status()).toBe(200)
 const next = await second.json()
 await page.evaluate(async source=>{
  const image=new Image();image.src=source;await image.decode()
  const w=window as typeof window&{__cameraCanvas:HTMLCanvasElement;__cameraStop:()=>void}
  w.__cameraStop()
  const context=w.__cameraCanvas.getContext('2d')!
  const timer=setInterval(()=>context.drawImage(image,0,0),100)
  w.__cameraStop=()=>clearInterval(timer)
 },next.png)
 await candidates.getByRole('button',{name:'Adicionar mais carteirinhas',exact:true}).click()
 await reader.getByRole('button',{name:'Ativar câmera',exact:true}).click()
 await expect(reader).toHaveCount(0)
 await expect(candidates.getByRole('listitem')).toHaveCount(2)
 const tracks=await page.evaluate(()=>(window as typeof window&{__cameraTracks:MediaStreamTrack[]}).__cameraTracks.map(t=>t.readyState))
 expect(tracks).toEqual(['ended','ended','ended'])
 await page.evaluate(()=>(window as typeof window&{__cameraStop:()=>void}).__cameraStop())
 await candidates.getByRole('button',{name:'Continuar com Maria das Graças Silva',exact:true}).click()
 await expect(page.getByLabel('Documento sintético da carteirinha',{exact:true})).toBeVisible()

});
test('camera permission denial offers a safe PNG/code fallback without releasing any identity',async({page})=>{
 await authorize(page,'/vitrine/registro');await page.evaluate(()=>Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>Promise.reject(new DOMException('denied','NotAllowedError'))}));await page.getByRole('button',{name:'Escanear carteirinha',exact:true}).click();await page.getByRole('button',{name:'Ativar câmera',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Câmera indisponível.'})).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click();await expect(page.getByRole('button',{name:'Ler carteirinha PNG',exact:true})).toBeEnabled();await expect(page.getByRole('link',{name:'Abrir prontuário',exact:true})).toHaveCount(0)
});
