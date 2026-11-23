import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash, randomBytes} from 'node:crypto'
import {PNG} from 'pngjs'
import jsQR from 'jsqr'
import {cardImage, cardPdf, detailedCard, monochromeCard} from '../../scripts/private-review/card-image'
import {validatePdf} from '../../scripts/private-review/registry-store'
import type {DemoLedger} from '../../src/features/vitrine-premium/lib/pap-id'

test('the two faces keep an opaque QR in color and monochrome and export a valid PDF', async () => {
  const token = 'PAP-ID-DEMO-1.' + randomBytes(32).toString('base64url')
  const ledger: DemoLedger = {
    kind: 'PAP_ID_DEMO_V1',
    revision: 1,
    patient: {
      subject: crypto.randomUUID(), patientId: 'maria-gracas', name: 'Gestante Sintética Modelo de Teste',
      birthDate: '1996-11-30', document: '98000000000',
    },
    cards: [{hash: createHash('sha256').update(token).digest('hex'), expiresAt: '2026-11-24T16:00:00.000Z', revoked: false}],
  }
  const original = await cardImage(ledger, token)
  const detail = await detailedCard(original, 'maria-gracas')
  assert.notDeepEqual(original, detail)
  const mono = await monochromeCard(detail)
  for (const bytes of [original, detail, mono]) {
    const pixels = PNG.sync.read(bytes)
    assert.equal(pixels.width, 1050)
    assert.equal(pixels.height, 1200)
    const corner = (50 * pixels.width + 50) * 4
    const fill = Array.from(pixels.data.subarray(corner, corner + 3))
    assert.deepEqual(fill, bytes === mono ? [255, 255, 255] : [196, 20, 105])
    const code = jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)
    assert.ok(code && code.data === token, 'same credential decodes')
    assert.ok(code.location.topLeftCorner.y > 600)
    const pdf = await cardPdf(bytes)
    assert.equal(await validatePdf(pdf), 1)
    assert.ok(!pdf.includes(Buffer.from(token)), 'no clear token in PDF')
  }
})
