import base from '../protocols/playwright.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testDir:'..',testMatch:['**/pap-id/integrated.spec.ts','**/pap-id/final-acceptance.spec.ts','**/pap-id/final-visual.spec.ts','**/pap-id/post-homologation.spec.ts','**/protocols/journey.spec.ts'],timeout:60000});
