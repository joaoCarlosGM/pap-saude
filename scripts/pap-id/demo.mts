import {parseArgs} from 'node:util';import {randomBytes,randomUUID,createHash} from 'node:crypto';import {mkdir,mkdtemp,writeFile,readFile,rename,lstat,open,unlink} from 'node:fs/promises';import path from 'node:path';
import QRCode from 'qrcode';import sharp from 'sharp';
import {demoLedgerSchema,DEMO_CARD_PREFIX,type DemoLedger} from '../../src/features/vitrine-premium/lib/pap-id';
if(process.env.NODE_ENV==='production'||process.env.PAP_ADMIN_BETA_ONLY==='1')throw new Error('PAP-ID de teste indisponível em produção/Beta deployment.');
const {values}=parseArgs({options:{'create-patient':{type:'boolean'},'issue-card':{type:'boolean'},directory:{type:'string'},revoke:{type:'boolean'},expire:{type:'boolean'},scenario:{type:'string',default:'valid'}}});
const creating=values['create-patient'];if(!['valid','expired','revoked'].includes(values.scenario!))throw new Error('Cenário inválido.');
if(creating&&values.directory)throw new Error('Novo cadastro exige diretório novo gerado pela ferramenta.');
if(!creating&&!values.directory)throw new Error('Informe --create-patient --issue-card ou --directory <diretório próprio>.');
if(creating&&(!values['issue-card']||values.revoke||values.expire))throw new Error('Criação exige apenas --issue-card e cenário opcional.');
if(!creating&&[values['issue-card'],values.revoke,values.expire].filter(Boolean).length!==1)throw new Error('Selecione exatamente uma operação de cartão.');
let directory:string;
if(creating){await mkdir('.local',{recursive:true,mode:0o700});directory=await mkdtemp(path.resolve('.local/pap-id-demo-'));await writeFile(path.join(directory,'.owner'),'PAP_ID_DEMO_V1\n',{mode:0o600});}
else{directory=path.resolve(values.directory!);if((await lstat(directory)).isSymbolicLink()||(await readFile(path.join(directory,'.owner'),'utf8'))!=='PAP_ID_DEMO_V1\n')throw new Error('Propriedade do diretório não comprovada.');}
const lock=path.join(directory,'.lock');const handle=await open(lock,'wx',0o600);
try{
 const file=path.join(directory,'base-sintetica.json');
 if(!creating&&(await lstat(file)).isSymbolicLink())throw new Error('Arquivo de base inválido.');
 const id=randomUUID();let ledger:DemoLedger=creating?{kind:'PAP_ID_DEMO_V1',revision:1,patient:{subject:id,name:'Gestante Sintética '+id.replaceAll('-','').slice(0,6).toUpperCase(),birthDate:'1998-08-14',rg:{number:'DEMO-'+id.replaceAll('-','').slice(0,6).toUpperCase(),uf:'PA',issuer:'DEMO'},document:'98'+String(randomBytes(4).readUInt32BE()%1000000000).padStart(9,'0')},cards:[]}:demoLedgerSchema.parse(JSON.parse(await readFile(file,'utf8')));
 if(!creating)ledger={...ledger,revision:ledger.revision+1,cards:ledger.cards.map(c=>({...c}))};
 if(values['issue-card']){
  ledger.cards=ledger.cards.map(c=>({...c,revoked:true}));const token=DEMO_CARD_PREFIX+randomBytes(32).toString('base64url');
  ledger.cards.push({hash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+(values.scenario==='expired'?-60000:86400000)).toISOString(),revoked:values.scenario==='revoked'});
  if(creating){const first=ledger.patient.document.slice(0,9),sum=[...first].reduce((s,d,i)=>s+Number(d)*(10-i),0),check=(sum*10)%11%10;ledger.patient.document=first+String((check+1)%10)+'0';}
  const qr=await QRCode.toBuffer(token,{type:'png',width:480,margin:4,errorCorrectionLevel:'M'});
  const card=Buffer.from(`<svg width="1100" height="740"><rect width="1100" height="740" rx="24" fill="white"/><rect width="1100" height="95" fill="#be186a"/><g font-family="sans-serif"><text x="36" y="60" fill="white" font-size="34">PAP Saúde — CARTÃO DE TESTE</text><text x="36" y="160" font-size="26">${ledger.patient.name}</text><text x="36" y="210" font-size="21">Nascimento fictício: 14/08/1998</text><text x="36" y="255" font-size="21">Documento de teste: ${ledger.patient.document}</text><text x="36" y="295" font-size="18">RG fictício: ${ledger.patient.rg?.number||'Indisponível'} / PA / DEMO</text><text x="36" y="345" font-size="19">Somente demonstração sintética.</text><text x="36" y="385" font-size="19">Não autoriza acesso clínico real.</text><text x="36" y="660" font-size="20">QR opaco; sem CPF, CNS ou informação clínica.</text><text x="36" y="700" font-size="18">Reimporte a base após expirar/revogar. Não publique este cartão.</text></g></svg>`);
  // Write-only own directory. Raw code exists only in the private card, never in the ledger/log.
  await writeFile(path.join(directory,'carteirinha.png.tmp'),await sharp(card).composite([{input:qr,left:590,top:125}]).png().toBuffer(),{mode:0o600,flag:'wx'});await rename(path.join(directory,'carteirinha.png.tmp'),path.join(directory,'carteirinha.png'));
 }else ledger.cards=ledger.cards.map(c=>({...c,...(values.revoke?{revoked:true}:{expiresAt:new Date(Date.now()-60000).toISOString()})}));
 ledger=demoLedgerSchema.parse(ledger);await writeFile(file+'.tmp',JSON.stringify(ledger,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(file+'.tmp',file);
 console.log(`PAP-ID DEMONSTRATIVO: ${directory}\nBase: base-sintetica.json; cartão: carteirinha.png.\nRevisão ${ledger.revision}. Importe a base novamente no navegador após qualquer mudança. Nenhum banco acessado.`);
}finally{await handle.close();await unlink(lock)}
