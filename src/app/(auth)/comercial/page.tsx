import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { accessDestination } from "@/lib/auth/access-destination";
import NotificationInbox from "@/components/access/NotificationInbox";
import "@/components/access/access.css";
export const dynamic = "force-dynamic";
export default async function CommercialPage() {
  const { user } = await requireOwnPageSession();
  const profile = await getEffectiveAccessProfile(user.id);
  if (accessDestination(profile) !== "/comercial") redirect("/login");
  return (
    <main className="access-page">
      <section className="access-card access-single">
        <p className="access-eyebrow">PAP Saúde · Comercial</p>
        <h1>Seu perfil comercial está autorizado</h1>
        <p>
          Bem-vindo, {user.displayName}. Os recursos comerciais e a vitrine
          demonstrativa estão em construção.
        </p>
        <p>
          Este perfil não concede acesso a prontuários, dados privados de UBS ou
          funções administrativas.
        </p>
        <NotificationInbox />
        <nav aria-label="Conta">
          <Link href="/minha-seguranca">Minha segurança</Link>
          <Link href="/notificacoes">Minhas notificações</Link>
        </nav>
      </section>
    </main>
  );
}
