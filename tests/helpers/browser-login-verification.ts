import { expect, type Page } from '@playwright/test';
/** Solve the actual accessible route as a test user; no secret or test-mode API. */
export async function solveLoginVerification(page:Page){
 await page.getByRole('button',{name:'Alternativa textual acessível',exact:true}).click();
 const question=page.locator('#verification-question');await expect(question).toBeVisible();
 const numbers=(await question.textContent())?.match(/\d+/g)?.map(Number);if(numbers?.length!==2)throw Error('Challenge unavailable');
 await page.getByLabel('Resposta da verificação',{exact:true}).fill(String(numbers[0]*numbers[1]));
}
