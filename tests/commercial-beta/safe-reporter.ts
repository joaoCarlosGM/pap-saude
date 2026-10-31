import type {Reporter,TestCase,TestResult,TestError} from '@playwright/test/reporter';
import {writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
export default class CommercialReporter implements Reporter{
 onStdErr(chunk:string|Buffer){const dir=process.env.PAP_COMMERCIAL_ARTIFACTS;if(dir)appendFileSync(join(dir,'private-browser-stderr.log'),chunk,{mode:0o600});}
 onStdOut(chunk:string|Buffer){const dir=process.env.PAP_COMMERCIAL_ARTIFACTS;if(dir)appendFileSync(join(dir,'private-browser-stdout.log'),chunk,{mode:0o600});}

 onError(error:TestError){
  const dir=process.env.PAP_COMMERCIAL_ARTIFACTS;
  if(dir)writeFileSync(join(dir,'private-browser-setup.log'),JSON.stringify(error,null,2),{mode:0o600});
  console.error('PAP_COMMERCIAL_DIAGNOSTIC '+JSON.stringify({kind:'setup',locations:error.stack?.match(/(?:config|workspace|showcase|fixtures)[\w.-]*\.ts:\d+:\d+/g)||[]}));
 }
 onTestEnd(test:TestCase,result:TestResult){
  console.log(`${result.status.toUpperCase()}: ${test.title}`);
  if(result.status!=='passed'&&process.env.PAP_COMMERCIAL_ARTIFACTS)writeFileSync(join(process.env.PAP_COMMERCIAL_ARTIFACTS,'private-browser-errors-'+test.location.line+'.json'),JSON.stringify(result.errors,null,2),{mode:0o600});
  if(result.status!=='passed')for(const error of result.errors)console.error('PAP_COMMERCIAL_DIAGNOSTIC '+JSON.stringify({kind:'test',testLine:test.location.line,locations:error.stack?.match(/(?:workspace|showcase)\.spec\.ts:\d+:\d+/g)||[],matcher:error.message?.match(/\b(?:toBeVisible|toBeFocused|toBe|toEqual|toHaveURL|toHaveValue|toHaveCount|toHaveAttribute|toContainText)\b/)?.[0]||'unknown'}));
 }
}
