import Link from "next/link";
export default function SecurityHelpPage() {
  return (
    <main className="ob account-security" data-theme="auto">
      <article className="ob-card mx-auto max-w-3xl ob-stack">
        <p className="ob-eyebrow">PAP SAÚDE · AJUDA</p>
        <h1 className="text-2xl font-semibold">
          Ajuda: configurar e usar o autenticador
        </h1>
        <p>
          Consultar esta ajuda não configura MFA, não gera chaves e não altera
          sua conta.
        </p>
        <ol className="list-decimal space-y-4 pl-5">
          <li>
            Se ainda não ativou MFA, abra a configuração inicial. O QR Code só é
            gerado após seu clique e reautenticação.
          </li>
          <li>
            Leia o QR Code com um app TOTP, confira a conta e confirme os seis
            dígitos. A chave é estável; o código muda normalmente a cada 30
            segundos.
          </li>
          <li>
            Guarde os códigos de recuperação fora do celular. Eles só aparecem
            uma vez e cada código serve para um único login.
          </li>
          <li>
            Após ativar, encerre a sessão e faça novo login com senha e segundo
            fator. Administradores continuam protegidos até concluir essa
            validação.
          </li>
        </ol>
        <p>
          Ative data e hora automáticas no celular e no computador. Os relógios
          devem refletir o mesmo instante; fusos diferentes não são problema. Se
          uma configuração pendente expirou ou foi substituída, retome-a na rota
          de configuração inicial.
        </p>
        <p>
          Um autenticador já ativo não é substituído por este tutorial. Se não
          guardou os códigos, gere um novo conjunto na gestão da conta, com
          senha e TOTP. Se perdeu o aparelho, use um código de recuperação no
          login ou o fluxo legítimo de recuperação.
        </p>
        <Link className="ob-primary" href="/minha-seguranca">
          Voltar à segurança da conta
        </Link>
        <Link className="ob-secondary" href="/primeiros-passos">
          Abrir configuração inicial
        </Link>
      </article>
    </main>
  );
}
