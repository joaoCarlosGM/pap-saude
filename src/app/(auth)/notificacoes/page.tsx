import SectionHero from "@/components/premium/SectionHero";
import "@/components/premium/premium.css";
import Link from "next/link";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
import NotificationInbox from "@/components/access/NotificationInbox";
import "@/components/access/access.css";
export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  await requireOwnPageSession();
  return (
    <main className="access-page">
      <section className="access-card access-single">
        <SectionHero title="Avisos" headingAs="p" subtitle="Sua caixa de entrada e atualizações de acesso." visual="avisos"/><p className="access-eyebrow">PAP Saúde · Sua conta</p>
        <h1>Minhas notificações</h1>
        <NotificationInbox />
        <nav aria-label="Conta">
          <Link href="/login">Continuar para meu acesso</Link>
          <Link href="/minha-seguranca">Minha segurança</Link>
        </nav>
      </section>
    </main>
  );
}
