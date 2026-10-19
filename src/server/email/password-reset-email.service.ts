// Never include reset tokens in logs, telemetry or HTTP responses.
export async function sendPasswordResetEmail(to:string,token:string):Promise<void>{
  const apiKey=process.env.RESEND_API_KEY?.trim();
  const from=process.env.PAP_EMAIL_FROM?.trim();
  const configured=process.env.PAP_PUBLIC_URL?.trim();
  if(process.env.PAP_EMAIL_PROVIDER?.toLowerCase()!=="resend" || !apiKey || !from || !configured) throw new Error("MAIL_NOT_CONFIGURED");
  const base=new URL(configured);
  if(base.protocol!=="https:" && process.env.NODE_ENV==="production") throw new Error("UNSAFE_PUBLIC_URL");
  if(!["https:","http:"].includes(base.protocol)) throw new Error("INVALID_PUBLIC_URL");
  const url=new URL("/redefinir-senha",base);
  // Fragment not sent by browsers in HTTP request, Referer, or proxy access logs.
  url.hash=`token=${encodeURIComponent(token)}`;
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({from,to:[to],subject:"Redefinição de senha - PAP Saúde",
      text:`Foi solicitada uma redefinição de senha da sua conta PAP Saúde. Se foi você, acesse este link temporário (30 minutos): ${url.toString()} . Caso contrário, ignore esta mensagem.`}),
  });
  if(!response.ok) throw new Error("MAIL_DELIVERY_FAILED");
}
