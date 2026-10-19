import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { join,relative } from 'node:path';
import ts from 'typescript';
const root='src/app/api/admin';
const methods=new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):e.name==='route.ts'?[join(dir,e.name)]:[]);}
function verify(path,source){
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
 const handlers=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)&&methods.has(n.name?.text));
 assert.ok(handlers.length,`${path}: every administrative handler must be inventoried`);
 if(relative(root,path)==='context/route.ts'){
  assert.deepEqual(handlers.map(n=>n.name.text),['GET'],'only own access context is exempt, never mutations');return;
 }
 for(const handler of handlers){
  let guarded=false;
  function walk(node){if(ts.isAwaitExpression(node)&&ts.isCallExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&['requireAdminSession','requireBetaSession'].includes(node.expression.expression.text))guarded=true;ts.forEachChild(node,walk);}
  walk(handler.body);
  assert.ok(guarded,`${path} ${handler.name.text}: missing mandatory administrative MFA guard`);
 }
}
test('every administrative route handler uses the shared MFA gate; own context is the only explicit exception',()=>{
 const routes=files(root);assert.ok(routes.length>=17);
 for(const path of routes)verify(path,readFileSync(path,'utf8'));
});
test('inventory rejects a forgotten legacy or Beta MFA check even if its import remains',()=>{
 for(const path of ['organizations/route.ts','beta/requests/route.ts']){
  const file=join(root,path),source=readFileSync(file,'utf8');
  const broken=source.replaceAll(/await require(?:Admin|Beta)Session\(/g,'await validateSession(');
  assert.notEqual(broken,source);assert.throws(()=>verify(file,broken),/missing mandatory/);
 }
});
