import LoginSecurity from "@/components/auth/LoginSecurity";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLoginNavigation } from "@/server/auth/login-navigation.service";
import {
  MFA_CHALLENGE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/server/security/constants";

export default async function LoginPage() {
  const store = await cookies();
  const navigation = await resolveLoginNavigation(
    store.get(SESSION_COOKIE_NAME)?.value,
    store.get(MFA_CHALLENGE_COOKIE_NAME)?.value,
  );
  if (navigation.view === "REDIRECT") redirect(navigation.destination);
  if (navigation.view === "RESTRICTED") {
    return (
      <main className="ob account-security" data-theme="auto">
        <section className="ob-card mx-auto max-w-3xl ob-stack">
          <p className="ob-eyebrow">PAP SAÚDE · ACESSO</p>
          <h1 className="text-2xl font-semibold">Acesso restrito</h1>
          <p>
            Sua sessão foi reconhecida, mas não há um perfil operacional
            disponível. Solicite a revisão do seu acesso ao responsável.
          </p>
          <Link className="ob-primary" href="/minha-seguranca">
            Segurança da minha conta
          </Link>
          <Link className="ob-secondary" href="/ajuda/seguranca">
            Ajuda de segurança
          </Link>
        </section>
      </main>
    );
  }
  return <LoginSecurity initialMode={navigation.view} />;
}
