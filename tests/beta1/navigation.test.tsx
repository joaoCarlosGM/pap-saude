import React from 'react';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import NetworkDirectory from '../../src/components/admin/NetworkDirectory';
import {accessDestination} from '../../src/lib/auth/access-destination';
import type {EffectiveAccessProfile} from '../../src/lib/admin/types';
const profile:EffectiveAccessProfile={user:{id:'synthetic',displayName:'Synthetic',email:'synthetic@synthetic.invalid'},roles:[{key:'PAP_MANAGER',name:'Gerente',scope:'GLOBAL',organization:null,permissions:['organization.read']}],permissions:['organization.read'],organizations:[],canAccessAdmin:true};
test('Manager uses delegated workbench; bare role without effective admin grants never loops to it',()=>{assert.equal(accessDestination(profile),'/admin/manager');assert.equal(accessDestination({...profile,canAccessAdmin:false,permissions:[],roles:[{...profile.roles[0],permissions:[]}]}),'/login');assert.equal(accessDestination(null),'/login');assert.equal(accessDestination({...profile,roles:[{...profile.roles[0],key:'PAP_ADMIN'}]}),'/admin');});
test('directory renders scoped hierarchy and real empty state without clinical counters',()=>{const html=renderToStaticMarkup(<NetworkDirectory organizations={[{id:'city',name:'Município <script>',type:'MUNICIPALITY',parentId:null,status:'ACTIVE'},{id:'unit',name:'UBS autorizada',type:'HEALTH_UNIT',parentId:'city',status:'ACTIVE'}]}/>);assert.match(html,/Município &lt;script&gt;/);assert.match(html,/\/admin\/rede\/unit/);assert.doesNotMatch(html,/data-motion-kpis|paciente|prontuário/i);assert.match(renderToStaticMarkup(<NetworkDirectory organizations={[]}/>),/Nenhuma organização/);});
