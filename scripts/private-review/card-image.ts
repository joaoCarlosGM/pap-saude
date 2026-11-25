import {createHash} from 'node:crypto'
import QRCode from 'qrcode'
import sharp from 'sharp'
import {initialDemo} from '../../src/features/vitrine-premium/lib/demo/data'
import {DEMO_DATE, formatDemoDate} from '../../src/features/vitrine-premium/lib/demo/validation'
import type {DemoLedger} from '../../src/features/vitrine-premium/lib/pap-id'

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza',
}).format(new Date(value))

export async function cardImage(ledger: DemoLedger, token: string) {
  const patient = ledger.patient
  const fixture = 'patientId' in patient ? initialDemo().patients.find(entry => entry.id === patient.patientId) : undefined
  const pregnancy = fixture?.obstetricHistory.pregnancies
  const due = fixture?.pregnancy.dpp
  const credential = ledger.cards.find(card => card.hash === createHash('sha256').update(token).digest('hex'))
  if (!credential) throw new Error('CARD_NOT_FOUND')
  // The review issuer grants credentials for 24 hours, with both dates set by the same INSERT.
  const issuedAt = new Date(Date.parse(credential.expiresAt) - 86_400_000)
  const birth = new Date(patient.birthDate)
  const age = issuedAt.getUTCFullYear() - birth.getUTCFullYear() -
    Number(issuedAt.toISOString().slice(5, 10) < patient.birthDate.slice(5, 10))
  const nameLines: string[] = []
  for (const word of patient.name.split(/\s+/)) {
    const last = nameLines.at(-1)
    if (last && (last + ' ' + word).length <= 30) nameLines[nameLines.length - 1] += ' ' + word
    else nameLines.push(word)
  }
  const name = nameLines.map((line, index) =>
    `<text x="64" y="${205 + 52 * index}" font-size="${Math.min(50, Math.floor(880 / (line.length * 0.75)))}" font-weight="bold">${escape(line)}</text>`).join('')
  const shortId = patient.subject.slice(0, 8).toUpperCase()
  const svg = Buffer.from(`<svg width="1050" height="1200" xmlns="http://www.w3.org/2000/svg">
    <rect width="1050" height="600" rx="28" fill="#c41469"/>
    <rect y="600" width="1050" height="600" rx="28" fill="white"/>
    <g font-family="sans-serif" fill="white">
      <text x="64" y="90" font-size="33">PAP-Gest / Carteirinha da Gestante</text>
      ${name}
      <text x="64" y="430" font-size="24">IDADE</text>
      <text x="320" y="430" font-size="24">GESTAÇÃO</text>
      <text x="660" y="430" font-size="24">DPP</text>
      <text x="64" y="477" font-size="33">${age} anos</text>
      <text x="320" y="477" font-size="33">${pregnancy ? pregnancy + 'ª' : 'Não informada'}</text>
      <text x="660" y="477" font-size="33">${due ? formatDemoDate(due) : 'Não informada'}</text>
      <text x="64" y="550" font-size="24">${shortId}</text>
    </g>
    <g font-family="sans-serif" fill="#172033">
      <text x="64" y="709" font-size="36" fill="#c41469" font-weight="bold">PAP-Gest</text>
      <text x="64" y="815" font-size="28">Emissão: ${date(issuedAt.toISOString())}</text>
      <text x="64" y="875" font-size="28">Validade: ${date(credential.expiresAt)}</text>
      <text x="64" y="1090" font-size="24">Confira dados atualizados no sistema.</text>
      <text x="64" y="1138" font-size="24">Credencial demonstrativa</text>
    </g>
  </svg>`)
  const qr = await QRCode.toBuffer(token, {width: 420, margin: 4, errorCorrectionLevel: 'M'})
  return sharp(svg).composite([{input: qr, left: 587, top: 690}]).png().toBuffer()
}

export async function detailedCard(bytes: Buffer, patientId: string) {
  const {width, height} = await sharp(bytes).metadata()
  if (width !== 1050 || height !== 1200) throw new Error('CARD_DETAIL_REQUIRES_REISSUE')
  const fixture = initialDemo().patients.find(patient => patient.id === patientId)
  const dating = fixture?.pregnancy.gestationalAge
  const lines = [
    'Sem registro de alergias',
    dating ? 'IG em ' + formatDemoDate(DEMO_DATE) + ': ' + dating : 'IG: não registrada',
    dating ? 'Fonte da IG: cadastro sintético inicial' : 'Sem data de referência para IG',
    'Queixa e MEOWS: sem registro verificável',
    'UBS de referência: não registrada',
  ]
  const text = lines.map((line, index) => `<text x="0" y="${25 + 28 * index}">${escape(line)}</text>`).join('')
  const overlay = Buffer.from(`<svg width="510" height="150" xmlns="http://www.w3.org/2000/svg"><g font-family="sans-serif" font-size="22" fill="#172033">${text}</g></svg>`)
  return sharp(bytes).composite([{input: overlay, left: 64, top: 903}]).png().toBuffer()
}

export async function monochromeCard(bytes: Buffer) {
  const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject: true})
  if (info.width !== 1050 || info.height !== 1200) return sharp(bytes).grayscale().png().toBuffer()
  for (let pixel = 0; pixel < data.length; pixel += 4) {
    const green = data[pixel + 1]
    const gray = pixel < info.width * 600 * 4 ? Math.round((255 - green) * 255 / 235) : green
    data[pixel] = data[pixel + 1] = data[pixel + 2] = Math.min(255, gray)
  }
  return sharp(data, {raw: info}).png().toBuffer()
}

/** Place the original raster at 85.6 × 48.9 mm per face on a single A4 page. */
export async function cardPdf(bytes: Buffer) {
  const {data, info} = await sharp(bytes).flatten({background: '#fff'}).toColourspace('srgb').jpeg({quality: 100}).toBuffer({resolveWithObject: true})
  const height = (242.65 * info.height / info.width).toFixed(3)
  const stream = `q\n242.65 0 0 ${height} 48 500 cm\n/Card Do\nQ\n`
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Card 4 0 R >> >> /Contents 5 0 R >>'),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`), data, Buffer.from('\nendstream')]),
    Buffer.from(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`),
  ]
  const parts = [Buffer.from('%PDF-1.4\n')]
  let cursor = parts[0].length
  const offsets = ['0000000000 65535 f \n']
  for (const [i, object] of objects.entries()) {
    offsets.push(String(cursor).padStart(10, '0') + ' 00000 n \n')
    const part = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')])
    parts.push(part)
    cursor += part.length
  }
  parts.push(Buffer.from(`xref\n0 ${offsets.length}\n${offsets.join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`))
  return Buffer.concat(parts)
}
