import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth-access.module.css";

/** Shared presentation only. Authentication and authorization stay server-side. */
export default function AuthAccessShell({ children }: { children: ReactNode }) {
  return <main className={styles.page}>
    <div className={styles.shell}>
      <aside className={styles.brandPanel} aria-label="Apresentação PAP Saúde">
        <Image className={styles.art} src="/illustrations/pap-login-care.svg" alt="Ilustração de uma unidade de saúde conectada" width={1000} height={720} unoptimized />
        <div className={styles.brand}><span aria-hidden="true">✚</span><div>PAP Saúde<small>GESTÃO & INTELIGÊNCIA</small></div></div>
        <div className={styles.brandCopy}><p>CUIDADO CONECTADO</p><h2>Mais tempo para <em>cuidar.</em><br />Mais clareza para <em>decidir.</em></h2><p>Uma experiência simples e segura para conectar profissionais, instituições e pessoas.</p></div>
        <p className={styles.privacy}>Privacidade e segurança em cada acesso</p>
      </aside>
      <section className={styles.formPanel}>
        <Link className={styles.help} href="/ajuda/seguranca">Ajuda de segurança →</Link>
        <div className={styles.mobileBrand}>✚ PAP Saúde</div>
        <div className={styles.content}>{children}</div>
        <footer className={styles.footer}>PAP Saúde · Acesso protegido</footer>
      </section>
    </div>
  </main>;
}
