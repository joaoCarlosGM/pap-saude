// Public diagnostics use an allowlist. Raw Playwright call logs can contain
// passwords, cookies, invitation URLs and rendered patient data.
const prefix = 'PAP_UNIFIED_DIAGNOSTIC ';
const matchers = ['toBe', 'toEqual', 'toHaveCount', 'toBeVisible', 'toBeFocused', 'toBeDisabled', 'toHaveURL'];
const statuses = ['failed', 'timedOut', 'interrupted'];
const safeScalar = /^(?:true|false|null|\d{1,3})$/;
const stripAnsi = value => String(value || '').replace(/\x1b\[[0-9;]*m/g, '');

export function summarizeBrowserError(error, testLine, status) {
 const message = stripAnsi(error.message);
 const stack = stripAnsi(error.stack);
 const matcher = matchers.find(name => new RegExp(`\\b${name}\\(`).test(message));
 const locations = [...new Set([...`${message}\n${stack}`.matchAll(/\b(?:operational\.spec\.ts|fixtures\.ts|browser-login-verification\.ts):\d+:\d+/g)].map(m => m[0]))].slice(0, 4);
 const result = {testLine: Number.isSafeInteger(testLine) && testLine > 0 ? testLine : null, status: statuses.includes(status) ? status : 'failed', kind: matcher ? 'assertion' : /timeout|timed out/i.test(message) ? 'timeout' : 'runner', locations};
 if (matcher) result.matcher = matcher;
 for (const [label, key] of [['Expected', 'expected'], ['Received', 'received']]) {
  const value = message.match(new RegExp(`^\\s*${label}:\\s*([^\\n]+)\\s*$`, 'm'))?.[1]?.trim();
  if (value && safeScalar.test(value)) result[key] = value;
 }
 return result;
}

export function diagnosticLine(error, testLine, status) {
 return prefix + JSON.stringify(summarizeBrowserError(error, testLine, status));
}

export function publicBrowserDiagnostics(output) {
 const records = [];
 for (const line of stripAnsi(output).split('\n')) {
  const start = line.indexOf(prefix);
  if (start < 0) continue;
  try {
   const item = JSON.parse(line.slice(start + prefix.length));
   // Revalidate the child record; never forward arbitrary child-process text.
   const clean = summarizeBrowserError({}, item.testLine, item.status);
   if (['assertion', 'timeout', 'runner'].includes(item.kind)) clean.kind = item.kind;
   if (matchers.includes(item.matcher)) clean.matcher = item.matcher;
   clean.locations = Array.isArray(item.locations) ? item.locations.filter(s => /^(?:operational\.spec\.ts|fixtures\.ts|browser-login-verification\.ts):\d+:\d+$/.test(s)).slice(0, 4) : [];
   for (const key of ['expected', 'received']) if (typeof item[key] === 'string' && safeScalar.test(item[key])) clean[key] = item[key];
   records.push(clean);
  } catch { /* Malformed diagnostics remain private. */ }
  if (records.length === 8) break;
 }
 if (records.length) return records;
 const text = stripAnsi(output);
 return [{kind: /Executable doesn't exist|browserType\.launch/.test(text) ? 'browser-launch' : /waiting.*(?:webServer|config\.webServer)|(?:webServer|config\.webServer).*timed out/i.test(text) ? 'web-server-startup' : 'runner', detail: 'No test diagnostic emitted; raw output retained privately'}];
}
