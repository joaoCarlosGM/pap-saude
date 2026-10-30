import {execFileSync,spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';
const images=process.argv.slice(2);if(images.length!==3||images.some(x=>!/^pap-admin-beta-(?:web|migrator|tools):[a-f0-9]{40}$/.test(x)))throw Error('Three explicit Beta images required');
const owner=randomUUID(),dir=mkdtempSync('/tmp/pap-admin-beta-scan-'),cache='pap-admin-beta-trivy-'+owner,scanner='aquasec/trivy:0.76.0@sha256:2416d1f74045b57274df1a340eee6b510cacd73c66a6ccb8da092b117eb7d222';let made=false,cid;
const d=(args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const labels=['--label','pap.disposable=admin-beta-scan','--label',`pap.owner=${owner}`];
try{
 d(['volume','create',...labels,cache]);made=true;let failed=false;
 for(const image of images){
  d(['save','-o',join(dir,'image.tar'),image]);
  const extra=[];if(process.env.F04_DOCKER_PROXY_HOST&&process.env.F04_DOCKER_PROXY_IP)extra.push('--add-host',process.env.F04_DOCKER_PROXY_HOST+':'+process.env.F04_DOCKER_PROXY_IP);
  const cert=process.env.NODE_EXTRA_CA_CERTS?['-e','SSL_CERT_FILE=/tmp/ca.crt']:[];
  cid=d(['create',...labels,...extra,'--entrypoint','trivy','-e','HTTP_PROXY','-e','HTTPS_PROXY',...cert,'-v',cache+':/root/.cache/trivy',scanner,'image','--input','/tmp/image.tar','--db-repository','ghcr.io/aquasecurity/trivy-db:2','--java-db-repository','ghcr.io/aquasecurity/trivy-java-db:1','--scanners','vuln','--severity','HIGH,CRITICAL','--exit-code','1','--no-progress']);
  d(['cp',join(dir,'image.tar'),cid+':/tmp/image.tar']);if(process.env.NODE_EXTRA_CA_CERTS)d(['cp',process.env.NODE_EXTRA_CA_CERTS,cid+':/tmp/ca.crt']);spawnSync('docker',['start','-a',cid],{stdio:'inherit'});const x=JSON.parse(d(['inspect',cid]))[0];if(x.Config.Labels['pap.owner']!==owner)throw Error('OWNERSHIP_MISMATCH');console.log('Trivy '+image+': '+x.State.ExitCode);if(x.State.ExitCode!==0)failed=true;d(['rm',cid]);cid=undefined;
 }if(failed)process.exitCode=1;
}finally{if(cid){const x=JSON.parse(d(['inspect',cid]))[0];if(x.Config.Labels['pap.owner']!==owner)throw Error('OWNERSHIP_MISMATCH');d(['rm','-f',cid]);}if(made){const x=JSON.parse(d(['volume','inspect',cache]))[0];if(x.Labels['pap.owner']!==owner)throw Error('OWNERSHIP_MISMATCH');d(['volume','rm',cache]);}rmSync(dir,{recursive:true,force:true});}
