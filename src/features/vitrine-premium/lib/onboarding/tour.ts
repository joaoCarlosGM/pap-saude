import type {TourStep,TourRect} from "../../types/tour"
// Presentation filtering only. The host must provide server-derived authorization,
// preserve backend IAM/MFA and never treat this list as an access-control decision.
export function authorizedTourSteps(steps:readonly TourStep[], input:{securityReady:boolean;routes:ReadonlySet<string>;capabilities:ReadonlySet<string>}) {
 if(!input.securityReady)return []
 return steps.filter(s=>s.path.startsWith('/')&&!s.path.startsWith('//')&&!s.path.includes('://')&&input.routes.has(s.path)&&(s.requiredCapabilities||[]).every(c=>input.capabilities.has(c)))
}
export function placeTour(rect:TourRect, viewport:{width:number;height:number}) {
 const margin=12,gap=12,width=Math.min(360,viewport.width-2*margin)
 const below=viewport.height-margin-(rect.top+rect.height+gap),above=rect.top-gap-margin
 const useBelow=below>=180||below>=above
 const height=Math.min(250,Math.max(60,useBelow?below:above))
 return {left:Math.max(margin,Math.min(rect.left,viewport.width-width-margin)),top:useBelow?rect.top+rect.height+gap:Math.max(margin,rect.top-gap-height),maxHeight:height,width}
}
