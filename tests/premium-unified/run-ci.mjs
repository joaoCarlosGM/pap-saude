import {spawnSync} from 'node:child_process';
import {existsSync,readdirSync} from 'node:fs';
if(!existsSync('.next/BUILD_ID'))throw Error('A real production build is required before the unified gate');
const commands=[
 ['node','--import','tsx','--test','tests/premium-unified/presentation.test.ts','tests/premium-unified/production-errors.test.ts'],
 ['node','--test','tests/premium-unified/fonts.test.mjs','tests/premium-unified/ci-policy.test.mjs','tests/premium-unified/release-artifact.test.mjs'],
 ['node','--test',...readdirSync('tests/vitrine-premium').filter(n=>n.endsWith('.test.mjs')).sort().map(n=>`tests/vitrine-premium/${n}`)],
 ['node','--test','tests/local/p0-profile.test.mjs','tests/local/unified-profile.test.mjs'],
 ['node','--import','tsx','--test','tests/local/p0-profile-services.test.ts','tests/local/unified-profile-services.test.ts'],
 ['node','tests/premium-unified/seed-isolated.mjs'],
 ['node','tests/premium-unified/run-isolated.mjs','browser'],
];
for(const [cmd,...args] of commands){const r=spawnSync(cmd,args,{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status||1);}
