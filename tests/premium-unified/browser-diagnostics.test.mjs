import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticLine, publicBrowserDiagnostics} from './browser-diagnostics.mjs';

test('failed browser assertions expose source and scalar status without private call logs', () => {
 const secret = 'synthetic-secret-not-for-publication';
 const error = {message: `Error: expect(received).toBe(expected)\n\u001b[32mExpected: 200\u001b[39m\nReceived: 403\nCall log: password=${secret}; cookie=${secret}; https://private.invalid/invite?token=${secret}`, stack: `Error ${secret}\n at /private/path/operational.spec.ts:54:9`};
 const output = `raw body ${secret}\n${diagnosticLine(error, 28, 'failed')}\nraw cookie ${secret}`;
 const result = publicBrowserDiagnostics(output);
 assert.deepEqual(result, [{testLine: 28, status: 'failed', kind: 'assertion', locations: ['operational.spec.ts:54:9'], matcher: 'toBe', expected: '200', received: '403'}]);
 assert.ok(!JSON.stringify(result).includes(secret));
});

test('string diffs, six-digit codes and untrusted diagnostic fields remain private', () => {
 const error = {message: 'expect(received).toEqual(expected)\nExpected: 123456\nReceived: "patient-private-name"', stack: ' at operational.spec.ts:40:5'};
 const line = diagnosticLine(error, 30, 'timedOut');
 const payload = JSON.parse(line.slice(line.indexOf('{')));
 const hostile = 'PAP_UNIFIED_DIAGNOSTIC ' + JSON.stringify({...payload, received: 'secret-token', password: 'private-password', locations: ['https://private.invalid/token', 'operational.spec.ts:40:5']});
 const result = publicBrowserDiagnostics(hostile);
 assert.deepEqual(result, [{testLine: 30, status: 'timedOut', kind: 'assertion', locations: ['operational.spec.ts:40:5'], matcher: 'toEqual'}]);
});

test('browser setup failures are classified without exposing environment or raw errors', () => {
 assert.equal(publicBrowserDiagnostics("browserType.launch: Executable doesn't exist /private/secret")[0].kind, 'browser-launch');
 assert.equal(publicBrowserDiagnostics('Timed out waiting 30000ms from config.webServer. cookie=private')[0].kind, 'web-server-startup');
 assert.equal(publicBrowserDiagnostics('PAP_UNIFIED_DIAGNOSTIC invalid-json private')[0].kind, 'runner');
});
