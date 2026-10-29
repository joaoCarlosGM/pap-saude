"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, BookOpen, CircleCheck, Compass, HeartPulse, LogOut, Menu, ShieldCheck, Sparkles } from "lucide-react";
import NotificationInbox from "@/components/access/NotificationInbox";
import ThemeToggle from "@/components/demo/ThemeToggle";
function useCommercialLogout() {
    const router = useRouter();
    const [error, setError] = useState("");
    async function logout() {
        setError("");
        try {
            const r = await fetch("/api/auth/logout", { method: "POST" });
            if (!r.ok) throw new Error();
            router.replace("/login"); router.refresh();
        } catch { setError("Não foi possível sair. Tente novamente."); }
    }
    return { logout, error };
}
export function CommercialMfaNotice() {
    const { logout, error } = useCommercialLogout();
    return <div className="pap-commercial commercial-verification"><main className="workspace-card">
        <ShieldCheck size={36} aria-hidden="true" />
        <p className="workspace-eyebrow">Segurança do acesso</p>
        <h1>Confirme a segurança desta sessão</h1>
        <p>Para continuar, encerre esta sessão e entre novamente com sua senha e o código do autenticador já cadastrado. Você também pode usar um código de recuperação disponível.</p>
        <p>Se ainda precisa configurar o autenticador, consulte a segurança da sua conta.</p>
        <button type="button" className="workspace-primary" onClick={() => void logout()}>Encerrar esta sessão e validar MFA</button>
        <Link href="/minha-seguranca" prefetch={false} className="workspace-secondary">Segurança da minha conta</Link>
        {error && <p role="alert">{error}</p>}
    </main></div>;
}
export default function CommercialWorkspace({ name }: {
    name: string;
}) {
    const { logout, error } = useCommercialLogout();
    const [open, setOpen] = useState(false);
    const toggle = useRef<HTMLButtonElement>(null);
    return <div className="pap-commercial" onKeyDown={e => { if (e.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
    } }}>
    <a className="workspace-skip" href="#commercial-main">Ir para o conteúdo</a>
    <aside className="commercial-sidebar">
      <div className="commercial-brand"><HeartPulse aria-hidden="true"/><span>PAP Saúde<small>Espaço comercial</small></span>
        <button ref={toggle} type="button" className="commercial-menu" aria-label="Alternar navegação comercial" aria-expanded={open} aria-controls="commercial-navigation" onClick={() => setOpen(!open)}><Menu aria-hidden="true"/></button>
      </div>
      <nav id="commercial-navigation" aria-label="Navegação comercial" data-open={open}>
        <Link href="/comercial" aria-current="page" onClick={() => setOpen(false)}><Compass size={19} aria-hidden="true"/>Visão geral</Link>
        <Link href="/vitrine" prefetch={false}><Sparkles size={19} aria-hidden="true"/>Vitrine demonstrativa</Link>
        <a href="#roteiro" onClick={() => setOpen(false)}><BookOpen size={19} aria-hidden="true"/>Roteiro de apresentação</a>
        <a href="#notificacoes" onClick={() => setOpen(false)}><CircleCheck size={19} aria-hidden="true"/>Minhas notificações</a>
        <Link href="/login" prefetch={false}>Início da minha conta</Link>
        <Link href="/minha-seguranca" prefetch={false}><ShieldCheck size={19} aria-hidden="true"/>Minha segurança</Link>
        <button type="button" onClick={() => void logout()}><LogOut size={19} aria-hidden="true"/>Sair da conta</button>
      </nav>
      <p className="commercial-sidebar-note">Conexões que aproximam<br /><strong>tecnologia e cuidado.</strong></p>
    </aside>
    <div className="commercial-content">
      <header className="commercial-topbar"><span>Painel Comercial</span><div><span className="commercial-badge">Perfil autorizado</span><ThemeToggle /></div></header>
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
          <section className="workspace-card"><span className="commercial-badge">Em construção</span><h2>Leads e propostas</h2><p>O cadastro e a gestão comercial ainda não estão disponíveis nesta versão. Nenhum indicador ou oportunidade fictícia é apresentado como resultado real.</p><div className="commercial-empty"><BookOpen size={30} aria-hidden="true"/><p>Seu trabalho começa pela apresentação da plataforma.</p></div></section>
        </div>
        <section className="workspace-card commercial-account"><ShieldCheck size={28} aria-hidden="true"/><div><h2>Seu perfil comercial está autorizado</h2><p>Este acesso permite apresentar a vitrine. Não libera prontuários, dados privados de UBS ou funções administrativas.</p><Link href="/minha-seguranca" prefetch={false}>Gerenciar a segurança da minha conta</Link></div></section>
        <section className="workspace-card" id="notificacoes"><NotificationInbox /></section>
        {error && <p role="alert">{error}</p>}
        <footer className="workspace-footer">PAP Saúde · Cuidado conectado, com responsabilidade.</footer>
      </main>
    </div>
  </div>;
}
