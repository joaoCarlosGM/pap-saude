// Stores one presentation flag only: never profile, measurements, patient data or credentials.
export const WELCOME_SESSION_KEY = 'pap.vitrine.premium.welcome.v2'
let memorySeen=false
export function welcomeSeen(){try{return memorySeen||sessionStorage.getItem(WELCOME_SESSION_KEY)==='seen'}catch{return memorySeen}}
export function markWelcomeSeen(){memorySeen=true;try{sessionStorage.setItem(WELCOME_SESSION_KEY,'seen')}catch{/* Memory fallback: dismissal must always remain possible. */}}
