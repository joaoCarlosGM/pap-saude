import QRCode from 'qrcode';import sharp from 'sharp';import type {DemoLedger} from '../../src/features/vitrine-premium/lib/pap-id';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
export async function cardImage(ledger:DemoLedger,token:string){
 const p=ledger.patient,qr=await QRCode.toBuffer(token,{width:400,margin:4,errorCorrectionLevel:'M'})
 const svg=Buffer.from(`<svg width="1050" height="600"><rect width="1050" height="600" rx="24" fill="white"/><g font-family="sans-serif" fill="#172033"><text x="30" y="55" font-size="28" fill="#be186a">PAP-ID • CARTÃO SINTÉTICO DE TESTE</text><text x="30" y="145" font-size="23">${escape(p.name)}</text><text x="30" y="195" font-size="19">Documento fictício: ${p.document}</text><text x="30" y="245" font-size="19">Nascimento fictício: ${p.birthDate}</text><text x="30" y="295" font-size="19">RG fictício: ${escape(p.rg?.number||'Não informado')} / PA / DEMO</text><text x="30" y="530" font-size="18">QR opaco. Não autoriza acesso clínico real.</text><text x="30" y="565" font-size="18">Validade: ${escape(ledger.cards.find(c=>!c.revoked)?.expiresAt||'Revogado')}</text></g></svg>`)
 return sharp(svg).composite([{input:qr,left:620,top:100}]).png().toBuffer()
}
