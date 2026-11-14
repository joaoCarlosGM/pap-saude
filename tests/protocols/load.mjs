import '../vitrine-premium/load.mjs';
import Module from 'node:module';
import path from 'node:path';
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.resolve('src',request.slice(2)):request,...args)};
Module._extensions['.css']=module=>{module.exports={__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})}};
