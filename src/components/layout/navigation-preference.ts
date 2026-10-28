export type NavigationMode='expanded'|'compact'|'hidden';
export function navigationMode(value:unknown):NavigationMode{return value==='compact'||value==='hidden'?value:'expanded';}
export function navigationKey(userId?:string,demo=false){return `pap:clinical-navigation:${userId??'anonymous'}:${demo?'demo':'real'}`;}
