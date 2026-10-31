"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, BookOpen, CircleCheck, Compass, HeartPulse, LogOut, Menu, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import CommercialProfile from "./CommercialProfile";
import "./commercial-workspace.css";
import NotificationInbox from "@/components/access/NotificationInbox";
import ThemeToggle from "@/components/demo/ThemeToggle";
function useCommercialLogout() {
    const router = useRouter();
    const [error, setError] = useState(""), [busy,setBusy]=useState(false);
    const lock=useRef(false);
    async function logout() {
        if(lock.current)return;lock.current=true;setBusy(true);setError("");
        try {
            const r = await fetch("/api/auth/logout", { method: "POST" });
            if (!r.ok) throw new Error();
            router.replace("/login"); router.refresh();
        } catch { setError("Não foi possível sair. Tente novamente."); } finally {lock.current=false;setBusy(false);}
    }
    return { logout, error, busy };
}
export function CommercialMfaNotice() {
    const { logout, error, busy } = useCommercialLogout();
    return <div className="pap-commercial commercial-verification"><main className="workspace-card">
        <ShieldCheck size={36} aria-hidden="true" />
        <p className="workspace-eyebrow">Segurança do acesso</p>
        <h1>Confirme a segurança desta sessão</h1>
        <p>Para continuar, encerre esta sessão e entre novamente com sua senha e o código do autenticador já cadastrado. Você também pode usar um código de recuperação disponível.</p>
        <p>Se ainda precisa configurar o autenticador, consulte a segurança da sua conta.</p>
        <button type="button" className="workspace-primary" disabled={busy} onClick={() => void logout()}>{busy?"Encerrando sessão…":"Encerrar esta sessão e validar MFA"}</button>
        <Link href="/minha-seguranca" prefetch={false} className="workspace-secondary">Segurança da minha conta</Link>
        {error && <p role="alert">{error}</p>}
    </main></div>;
}
export default function CommercialWorkspace({ name }: {
    name: string;
}) {
    const { logout, error, busy } = useCommercialLogout();
    const [open, setOpen] = useState(false);
    const toggle = useRef<HTMLButtonElement>(null),sidebar=useRef<HTMLElement>(null);
    function closeMenu(){setOpen(false);requestAnimationFrame(()=>toggle.current?.focus());}
    useEffect(()=>{const query=matchMedia('(max-width:767px)');const changed=()=>{if(!query.matches)setOpen(false);};query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed);},[]);
    useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';sidebar.current?.querySelector<HTMLElement>('button,a[href]')?.focus();return()=>{document.body.style.overflow=previous;};},[open]);
    function trap(event:KeyboardEvent<HTMLElement>){
      if(!open)return;
      if(event.key==='Escape'){event.preventDefault();closeMenu();return;}
      if(event.key!=='Tab')return;
      const elements=Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')||[]).filter(e=>e.getClientRects().length>0),first=elements[0],last=elements.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    return <div className="pap-commercial" data-commercial-workspace>
    <a className="workspace-skip" tabIndex={open?-1:0} href="#commercial-main">Ir para o conteúdo</a>
    {open&&<button type="button" className="commercial-backdrop" aria-label="Fechar navegação comercial" tabIndex={-1} onClick={closeMenu}/>}
    <aside ref={sidebar} className="commercial-sidebar" data-open={open} role={open?"dialog":undefined} aria-modal={open?true:undefined} aria-label="Menu comercial" onKeyDown={trap}>
      <div className="commercial-brand"><HeartPulse aria-hidden="true"/><span>PAP Saúde<small>Espaço comercial</small></span>
        <button type="button" className="commercial-drawer-close" aria-label="Fechar menu comercial" onClick={closeMenu}><X aria-hidden="true"/></button>
      </div>
      <nav id="commercial-navigation" aria-label="Navegação comercial" data-open={open}>
        <Link href="/comercial" aria-current="page" onClick={closeMenu}><Compass size={19} aria-hidden="true"/>Visão geral</Link>
        <Link href="/vitrine" prefetch={false} onClick={closeMenu}><Sparkles size={19} aria-hidden="true"/>Vitrine demonstrativa</Link>
        <a href="#roteiro" onClick={closeMenu}><BookOpen size={19} aria-hidden="true"/>Roteiro de apresentação</a>
        <a href="#notificacoes" onClick={closeMenu}><CircleCheck size={19} aria-hidden="true"/>Minhas notificações</a>
        <a href="#perfil" onClick={closeMenu}><UserRound size={19} aria-hidden="true"/>Meu perfil</a>
        <Link href="/minha-seguranca" prefetch={false}><ShieldCheck size={19} aria-hidden="true"/>Minha segurança</Link>
        <button type="button" disabled={busy} onClick={() => void logout()}><LogOut size={19} aria-hidden="true"/>{busy?"Encerrando sessão…":"Sair da conta"}</button>
      </nav>
      <p className="commercial-sidebar-note">Conexões que aproximam<br /><strong>tecnologia e cuidado.</strong></p>
    </aside>
    <div className="commercial-content" inert={open}>
      <header className="commercial-topbar"><div><button ref={toggle} type="button" className="commercial-mobile-open" aria-label="Abrir menu comercial" aria-expanded={open} aria-controls="commercial-navigation" onClick={()=>setOpen(true)}><Menu aria-hidden="true"/></button><span>Painel Comercial</span></div><div><span className="commercial-badge">Perfil autorizado</span><ThemeToggle /></div></header>
      <main id="commercial-main" tabIndex={-1}>
        <div className="commercial-welcome"><p className="workspace-eyebrow">Seu espaço de trabalho</p><h1>Olá, <span data-sensitive>{name}</span>.</h1><p>Uma boa conversa começa com uma experiência de cuidado.</p></div>
        <section className="commercial-hero" aria-labelledby="commercial-hero-title">
          <div><span className="commercial-badge">Conheça a experiência PAP Saúde</span><h2 id="commercial-hero-title">Mostre o cuidado.<br />Inspire novas conexões.</h2><p>Apresente a jornada clínica em um ambiente demonstrativo, com personagens e conteúdos fictícios. Explore com tranquilidade, sem acessar dados reais.</p>
            <Link className="workspace-primary" href="/vitrine" prefetch={false}>Abrir vitrine demonstrativa <ArrowRight size={19} aria-hidden="true"/></Link>
            <small>Demonstração independente do atendimento real.</small>
          </div>
          <Image src="/illustrations/pap-login-care.svg" width={560} height={430} alt="" priority className="commercial-art"/>
        </section>
        <div className="commercial-grid">
          <section className="workspace-card" id="roteiro"><p className="workspace-eyebrow">Uma apresentação com propósito</p><h2>Um roteiro para sua próxima conversa</h2><ol className="commercial-steps"><li><strong>Conheça a jornada</strong><span>Abra o dashboard rosa e os exemplos de acompanhamento.</span></li><li><strong>Explore na prática</strong><span>Visite pacientes, registros, protocolos, ferramentas e cursos simulados.</span></li><li><strong>Converse sobre possibilidades</strong><span>Apresente a experiência sem inserir informações pessoais ou clínicas reais.</span></li></ol></section>
          <section className="workspace-card"><span className="commercial-badge">Apresentação segura</span><h2>Explore a experiência, com responsabilidade</h2><p>Esta versão permite apresentar a plataforma e administrar a própria conta. Não há CRM, propostas ou indicadores comerciais homologados.</p><ul className="commercial-guidelines"><li>Use somente personagens e informações fictícias na Vitrine.</li><li>Apresente recursos sem prometer condutas clínicas ou IA real.</li><li>Consulte seu perfil e suas notificações nesta área autenticada.</li></ul><a className="workspace-secondary" href="#perfil">Consultar meu perfil</a></section>
        </div>
        <section className="workspace-card commercial-account"><ShieldCheck size={28} aria-hidden="true"/><div><h2>Seu perfil comercial está autorizado</h2><p>Este acesso permite apresentar a vitrine. Não libera prontuários, dados privados de UBS ou funções administrativas.</p><Link href="/minha-seguranca" prefetch={false}>Gerenciar a segurança da minha conta</Link></div></section>
        <CommercialProfile/>
        <section className="workspace-card" id="notificacoes"><NotificationInbox /></section>
        {error && <p role="alert">{error}</p>}
        <footer className="workspace-footer">PAP Saúde · Cuidado conectado, com responsabilidade.</footer>
      </main>
    </div>
  </div>;
}
