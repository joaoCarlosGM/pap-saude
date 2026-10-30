import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import SectionHero from '../../src/components/premium/SectionHero';
import HelpCard from '../../src/components/premium/HelpCard';
test('hero renders escaped DOM title, decorative local image and distinct heading level',()=>{
 const html=renderToStaticMarkup(<SectionHero title={'<script>alert(1)</script>'} subtitle="Autorizado" visual="dashboard"/>);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|<h1/);assert.match(html,/<h2/);assert.match(html,/aria-hidden="true"/);assert.match(html,/alt=""/);
});
test('support without backend is unavailable, never claims delivery',()=>{
 const html=renderToStaticMarkup(<HelpCard onTutorial={()=>{}}/>);assert.match(html,/disabled/);assert.match(html,/Integração de suporte em preparação/);assert.doesNotMatch(html,/chamado enviado/i);
});
test('all supplied hero assets contain only passive abstract SVG primitives',()=>{
 const files=readdirSync('public/brand/banners');assert.equal(files.length,15);
 for(const f of files){const svg=readFileSync('public/brand/banners/'+f,'utf8');assert.doesNotMatch(svg,/<(?:script|image|foreignObject|use|iframe)\b|onload=|href=|https?:\/\/(?!www.w3.org\/2000\/svg)/i);}
});
test('approved operational dashboard and synthetic KPI engine remain byte-identical',()=>{
 for(const p of ['src/server/clinical-dashboard/clinical-dashboard.service.ts','src/components/dashboard/ClinicalDashboardView.tsx','src/features/vitrine-premium/lib/demo/meows.ts']){
  const baseline=execFileSync('git',['show',`c7b1d755:${p}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});assert.equal(readFileSync(p,'utf8'),baseline,p);
 }
});

test('layout hero preserves a unique original page heading for navigation and screen readers',()=>{
 const h=renderToStaticMarkup(<><SectionHero title="Pacientes" subtitle="Escopo autorizado" visual="pacientes" headingAs="p"/><h1>Pacientes</h1></>);
 assert.equal((h.match(/<h[1-6]\b/g)||[]).length,1);assert.match(h,/aria-labelledby/);
});
