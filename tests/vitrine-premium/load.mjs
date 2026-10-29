import fs from 'node:fs';import ts from 'typescript';import Module from 'node:module';
const compile=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,file);

Module._extensions[".ts"]=compile;Module._extensions[".tsx"]=compile;
