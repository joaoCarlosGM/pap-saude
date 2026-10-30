import SafeReporter from '../first-access/safe-reporter';
import type {TestError,TestCase,TestResult} from '@playwright/test/reporter';
import {appendFileSync} from 'node:fs';
import {join} from 'node:path';
export default class BetaReporter extends SafeReporter{
 private save(error:TestError){if(process.env.PAP_BETA1_ARTIFACTS)appendFileSync(join(process.env.PAP_BETA1_ARTIFACTS,'private-browser-errors.jsonl'),JSON.stringify({message:error.message,stack:error.stack})+'\n',{mode:0o600});}
 onError(error?:TestError){if(error)this.save(error);super.onError();}
 onTestEnd(test:TestCase,result:TestResult){for(const error of result.errors)this.save(error);super.onTestEnd(test,result);}
}
