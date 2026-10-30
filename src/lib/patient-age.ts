/** Calendar age from stored date-only UTC components; no gestational/clinical inference. */
export function patientAge(birthDate:string,now=new Date()):number|null{
 const birth=new Date(birthDate);if(!Number.isFinite(birth.getTime())||birth>now)return null;
 let age=now.getUTCFullYear()-birth.getUTCFullYear();
 if(now.getUTCMonth()<birth.getUTCMonth()||(now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()<birth.getUTCDate()))age--;
 return age>=0?age:null;
}
