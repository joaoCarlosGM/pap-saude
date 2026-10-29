export async function fillToVitals(page,{cpf='32165498701',name='Pessoa Sintética MEOWS'}={}){
 await page.locator('#cpf').fill(cpf);await page.locator('#patient-name').fill(name);await page.locator('#birth-date').fill('1995-03-05');await page.getByRole('button',{name:'Próximo →'}).click();await page.getByLabel('DUM desconhecida').check();await page.getByRole('button',{name:'Próximo →'}).click()
}
export async function fillVitals(page,{pressure='120',heart='80',mode='air',flow=''}={}){
 for(const [id,value]of Object.entries({'pa-sistolica':pressure,'pa-diastolica':'70','frequencia-cardiaca':heart,'frequencia-respiratoria':'14',temperatura:'37.0','saturacao-o2':'98'}))await page.locator('#'+id).fill(value)
 await page.locator('#nivel-consciencia').selectOption('alerta');await page.locator('#oxygen-mode').selectOption(mode);if(mode==='supplemental')await page.locator('#oxygen-flow').fill(flow)
}
export async function toResult(page){await page.getByRole('button',{name:'Próximo →'}).click();await page.getByRole('button',{name:'Ver Resultado →'}).click()}
