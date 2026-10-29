import {expect,type Page} from '@playwright/test';
export async function welcome(page:Page,first:boolean){
 await page.locator('[data-demo-ready=true]').waitFor({state:'attached'});
 const dialog=page.getByRole('dialog',{name:'Bem-vindo ao PAP Saúde'});
 if(first){
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Ambiente demonstrativo',{exact:true})).toBeVisible();
  await expect(dialog).toContainText('Não insira dados pessoais ou clínicos verdadeiros.');
  await dialog.getByRole('button',{name:'Explorar a plataforma livremente',exact:true}).click();
 }
 await expect(dialog).not.toBeVisible();
}
export async function incompleteDraft(page:Page,name:string){
 await page.locator('#cpf').fill('32165498701');await page.locator('#patient-name').fill(name);await page.locator('#birth-date').fill('1995-03-05');
 await page.getByRole('button',{name:'Próximo →',exact:true}).click();await page.getByLabel('DUM desconhecida').check();
 await page.getByRole('button',{name:'Próximo →',exact:true}).click();await page.getByRole('button',{name:'Próximo →',exact:true}).click();
 await page.getByRole('button',{name:'Ver Resultado →',exact:true}).click();
}
