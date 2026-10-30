"use client";
export default function HelpCard({onTutorial}:{onTutorial:()=>void}){
 return <details className="premium-help"><summary>Precisa de ajuda?</summary><p>Acesse o suporte ou nossos tutoriais.</p><button type="button" onClick={onTutorial}>Iniciar tutorial guiado</button><button type="button" disabled aria-describedby="support-unavailable">Solicitar suporte de TI</button><small id="support-unavailable">Integração de suporte em preparação. Nenhuma solicitação será enviada.</small></details>;
}
