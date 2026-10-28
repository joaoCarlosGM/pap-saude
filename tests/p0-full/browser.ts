import {existsSync} from 'node:fs';
/** Reuse an installed browser. CI may use the Playwright-managed executable. */
export const browserExecutable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
