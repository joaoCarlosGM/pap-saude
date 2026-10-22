"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Heart, Moon, Sun, ArrowRight, Check } from "lucide-react";
import TotpSetupStep from "./TotpSetupStep";
import RecoveryCodesStep from "./RecoveryCodesStep";
import OnboardingTour from "./OnboardingTour";
import {
  securityRequest,
  type Enrollment,
  type SecurityPosture,
} from "./security-client";
const titles = [
  "Seu cuidado começa com segurança",
  "Uma camada a mais de proteção",
  "Conecte seu autenticador",
  "Leia o QR Code no aplicativo",
  "Confirme seu primeiro código",
  "Guarde sua forma de recuperação",
  "Tudo pronto para entrar com segurança",
  "Seu acesso está protegido",
];
const hints = [
  "Conheça as etapas e continue para proteger sua conta.",
  "O autenticador funciona sem ligação com APIs do Google. Continue para configurar.",
  "Use sua senha atual para autorizar o vínculo. Nenhuma chave é criada antes do seu clique.",
  "Abra o app no celular e leia o QR Code. Depois, continue para confirmar.",
  "Digite ou cole o código atual de seis dígitos do aplicativo, não sua senha.",
  "Salve os códigos e marque a confirmação de armazenamento seguro.",
  "Encerre esta sessão e faça login com senha e o autenticador. Isso valida seu segundo fator.",
  "Continue para sua área de trabalho. O tutorial estará disponível na segurança da conta.",
];
const targets = [
  "welcome-next",
  "why-next",
  "setup-password",
  "scan-next",
  "totp-code",
  "recovery-ack",
  "new-login",
  "finish-onboarding",
];
export default function FirstAccessWizard() {
  const router = useRouter();
  const [data, setData] = useState<SecurityPosture | null>(null),
    [step, setStep] = useState(0),
    [error, setError] = useState("");
  const [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [enrollment, setEnrollment] = useState<Enrollment | null>(null),
    [codes, setCodes] = useState<string[]>([]);
  const [paused, setPaused] = useState(false),
    [busy, setBusy] = useState(false),
    [restart, setRestart] = useState(false),
    [theme, setTheme] = useState("auto");
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    const posture = (await securityRequest()) as SecurityPosture;
    setData(posture);
    return posture;
  }, []);
  useEffect(() => {
    let live = true;
    void securityRequest()
      .then((posture: SecurityPosture) => {
        if (!live) return;
        setData(posture);
        const progress = posture.onboarding.progress;
        if (
          progress?.status === "COMPLETED" &&
          (!posture.onboarding.mfaRequired || posture.onboarding.verified)
        ) {
          router.replace(
            posture.onboarding.profile?.canAccessAdmin
              ? "/admin"
              : "/dashboard",
          );
          setPaused(true);
          return;
        }
        setPaused(progress?.status === "SKIPPED");
        setStep(
          posture.onboarding.active
            ? (progress?.currentStep ?? 0) >= 6
              ? posture.onboarding.verified
                ? 7
                : 6
              : 5
            : Math.min(progress?.currentStep ?? 0, 2),
        );
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    const focus = () => {
      void refresh().catch((e) => setError(e.message));
    };
    window.addEventListener("focus", focus);
    return () => {
      live = false;
      window.removeEventListener("focus", focus);
    };
  }, [refresh, router]);
  async function perform(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function navigate(next: number) {
    await securityRequest("ONBOARDING_STEP", { step: Math.min(next, 4) });
    setStep(next);
  }
  const pause = () =>
    perform(async () => {
      if (codes.length) {
        setError("Guarde os códigos e confirme o armazenamento antes de sair.");
        return;
      }
      await securityRequest("PAUSE_ONBOARDING", { step: Math.min(step, 4) });
      setEnrollment(null);
      setPassword("");
      setCode("");
      setPaused(true);
    });
  const pending = data?.factors.find((f) => f.status === "PENDING");
  const currentEnrollment =
    enrollment &&
    data?.factors.some(
      (f) => f.id === enrollment.factorId && f.status === "PENDING",
    )
      ? enrollment
      : null;
  const completed = !!(
    data &&
    data.onboarding.progress?.status === "COMPLETED" &&
    (!data.onboarding.mfaRequired || data.onboarding.verified)
  );
  const destination = data?.onboarding.profile?.canAccessAdmin
    ? "/admin"
    : "/dashboard";
  function resume() {
    setPaused(false);
    setStep(
      data?.onboarding.active
        ? (data.onboarding.progress?.currentStep ?? 0) >= 6
          ? data.onboarding.verified
            ? 7
            : 6
          : 5
        : 2,
    );
  }
  return (
    <main
      className="ob"
      data-theme={theme}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !paused && !busy) {
          e.preventDefault();
          void pause();
        }
      }}
    >
      <header className="ob-header">
        <a href="/primeiros-passos" className="ob-brand">
          <Heart aria-hidden="true" size={22} /> PAP Saúde
        </a>
        <button
          aria-label="Alternar modo claro e escuro"
          className="ob-icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      <div className="ob-layout">
        <aside className="ob-intro">
          <span className="ob-eyebrow">PRIMEIROS PASSOS</span>
          <h1>
            Mais tranquilidade.
            <br />
            Em cada acesso.
          </h1>
          <p>
            Vamos cuidar da segurança da sua conta para você cuidar do que
            importa.
          </p>
          <div className="ob-seal">
            <ShieldCheck aria-hidden="true" />
            <span>
              Proteção da sua identidade
              <br />
              <strong>Privacidade por padrão</strong>
            </span>
          </div>
          <p className="ob-muted">
            Sem alteração de papéis ou permissões. Seu acesso continua limitado
            ao escopo autorizado.
          </p>
        </aside>
        <section
          className="ob-card"
          aria-label="Assistente de primeiro acesso"
          aria-busy={busy}
        >
          {error && (
            <div role="alert" className="ob-error">
              {error}{" "}
              {error.startsWith("Sessão expirou") && (
                <a href="/login">Entrar novamente</a>
              )}
            </div>
          )}
          {!data ? (
            <p role="status">
              {error
                ? "Não foi possível carregar sua conta."
                : "Preparando seu acesso…"}
            </p>
          ) : (
            <>
              <div className="ob-identity">
                <strong>{data.onboarding.profile?.user.displayName}</strong>
                <span>
                  {data.onboarding.profile?.roles
                    .map(
                      (r) =>
                        `${r.name} (${r.key}) · ${r.organization?.name ?? "PAP Saúde — âmbito global"}`,
                    )
                    .join("; ") || "Conta sem papel efetivo"}
                </span>
              </div>
              {paused ? (
                <div className="ob-stack">
                  <ShieldCheck size={40} aria-hidden="true" />
                  <h2>
                    {completed
                      ? "Seu tutorial está concluído"
                      : "Continue de onde parou"}
                  </h2>
                  <p>
                    {completed
                      ? "Você pode consultar as orientações novamente, sem alterar suas credenciais."
                      : "Seu progresso está salvo. Nenhuma chave será criada ao retomar."}
                  </p>
                  {!completed && (
                    <button className="ob-primary" onClick={resume}>
                      Retomar configuração
                    </button>
                  )}
                  <a className="ob-secondary" href="/ajuda/seguranca">
                    Ajuda / Refazer tutorial
                  </a>
                  {(!data.onboarding.mfaRequired ||
                    data.onboarding.verified) && (
                    <a className="ob-primary" href={destination}>
                      Ir para minha área
                    </a>
                  )}
                  <a href="/minha-seguranca">Segurança da minha conta</a>
                </div>
              ) : (
                <>
                  <div className="ob-progress" aria-live="polite">
                    <span>Etapa {step + 1} de 8</span>
                    <span>
                      {data.onboarding.mfaRequired
                        ? "MFA obrigatório"
                        : "MFA recomendado"}
                    </span>
                  </div>
                  <progress
                    max={8}
                    value={step + 1}
                    aria-label="Progresso dos primeiros passos"
                  />
                  <h2>{titles[step]}</h2>
                  <OnboardingTour target={targets[step]}>
                    {hints[step]}
                  </OnboardingTour>
                  {step === 0 && (
                    <div className="ob-stack">
                      <p>
                        Bem-vindo! Seu papel e organização estão identificados
                        acima. Vamos conectar um aplicativo autenticador,
                        guardar a recuperação e validar seu próximo login.
                      </p>
                      <button
                        id="welcome-next"
                        className="ob-primary"
                        disabled={busy}
                        onClick={() => void perform(() => navigate(1))}
                      >
                        Começar <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  {step === 1 && (
                    <div className="ob-stack">
                      <p>
                        Além da senha, seu aplicativo gera um código temporário.
                        Ele ajuda a impedir acessos indevidos mesmo quando uma
                        senha é descoberta.
                      </p>
                      <p>
                        {data.onboarding.mfaRequired
                          ? "As funções administrativas só ficam disponíveis após login com MFA verificado."
                          : "Para seu papel, configurar MFA é opcional. Ao ativar, os próximos logins exigirão o segundo fator."}
                      </p>
                      <button
                        id="why-next"
                        className="ob-primary"
                        disabled={busy}
                        onClick={() => void perform(() => navigate(2))}
                      >
                        Continuar
                      </button>
                      {!data.onboarding.mfaRequired &&
                        !data.onboarding.active && (
                          <button
                            className="ob-secondary"
                            disabled={busy}
                            onClick={() =>
                              void perform(async () => {
                                await securityRequest("DEFER_OPTIONAL_MFA");
                                router.replace(destination);
                              })
                            }
                          >
                            Configurar depois e continuar
                          </button>
                        )}
                    </div>
                  )}
                  {step === 2 && (
                    <div className="ob-stack">
                      <p>
                        Abra seu aplicativo autenticador no celular. Confirme a
                        senha atual para autorizar este vínculo, conforme a
                        política de reautenticação.
                      </p>
                      {currentEnrollment && (
                        <button
                          className="ob-secondary"
                          disabled={busy}
                          onClick={() => setStep(3)}
                        >
                          Continuar com a chave atual
                        </button>
                      )}
                      {pending && !currentEnrollment && (
                        <div className="ob-panel">
                          <strong>Cadastro pendente encontrado</strong>
                          <p>
                            {pending.expired
                              ? "A configuração expirou."
                              : "A chave não é recuperada após recarregar a página."}{" "}
                            Para continuar, confirme explicitamente uma nova
                            chave. A anterior deixará de funcionar.
                          </p>
                        </div>
                      )}
                      <label>
                        Senha atual
                        <input
                          type="password"
                          id="setup-password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </label>
                      {(restart || pending) && (
                        <label className="ob-check">
                          <input
                            type="checkbox"
                            checked={restart}
                            onChange={(e) => setRestart(e.target.checked)}
                          />
                          Confirmo que a nova chave substituirá a configuração
                          pendente anterior.
                        </label>
                      )}
                      <button
                        id="setup-start"
                        className="ob-primary"
                        disabled={busy || !password || (!!pending && !restart)}
                        onClick={() =>
                          void perform(async () => {
                            const value = await securityRequest("START_MFA", {
                              password,
                              restart,
                            });
                            setEnrollment(value);
                            setRestart(false);
                            await refresh();
                            await navigate(3);
                          })
                        }
                      >
                        {pending ? "Gerar nova chave" : "Gerar QR Code"}
                      </button>
                    </div>
                  )}
                  {(step === 3 || step === 4) &&
                    (currentEnrollment ? (
                      <div className="ob-stack">
                        {step === 3 ? (
                          <>
                            <TotpSetupStep enrollment={currentEnrollment} />
                            <button
                              id="scan-next"
                              className="ob-primary"
                              disabled={busy}
                              onClick={() => void perform(() => navigate(4))}
                            >
                              Já cadastrei no aplicativo
                            </button>
                          </>
                        ) : (
                          <form
                            className="ob-stack"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void perform(async () => {
                                const value = await securityRequest(
                                  "CONFIRM_MFA",
                                  {
                                    password,
                                    code,
                                    factorId: currentEnrollment.factorId,
                                  },
                                );
                                setCodes(value.codes);
                                setEnrollment(null);
                                setPassword("");
                                setCode("");
                                await refresh();
                                setStep(5);
                              });
                            }}
                          >
                            <p>
                              Use o código da conta PAP Saúde que acabou de
                              cadastrar no app.
                            </p>
                            <label>
                              Código de seis dígitos
                              <input
                                id="totp-code"
                                data-sensitive="true"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                value={code}
                                onChange={(e) =>
                                  setCode(
                                    e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6),
                                  )
                                }
                                required
                              />
                            </label>
                            <button
                              className="ob-primary"
                              disabled={busy || code.length !== 6}
                            >
                              Confirmar código
                            </button>
                          </form>
                        )}
                        <button
                          className="ob-link"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Gerar nova chave invalidará a configuração anterior. Deseja continuar?",
                              )
                            ) {
                              setEnrollment(null);
                              setCode("");
                              setRestart(true);
                              setStep(2);
                            }
                          }}
                        >
                          Gerar nova chave
                        </button>
                      </div>
                    ) : (
                      <div className="ob-stack">
                        <p>
                          Esta configuração foi substituída, expirou ou não está
                          mais disponível nesta tela. Retome sem gerar outra
                          chave automaticamente.
                        </p>
                        <button
                          className="ob-primary"
                          onClick={() => {
                            setEnrollment(null);
                            setStep(2);
                          }}
                        >
                          Retomar cadastro pendente
                        </button>
                      </div>
                    ))}
                  {step === 5 &&
                    (codes.length ? (
                      <RecoveryCodesStep
                        codes={codes}
                        busy={busy}
                        onAcknowledge={() =>
                          void perform(async () => {
                            await securityRequest("ACK_RECOVERY");
                            setCodes([]);
                            await refresh();
                            setStep(6);
                          })
                        }
                      />
                    ) : (
                      <div className="ob-stack">
                        <p>
                          Seu MFA está ativo. Os códigos de recuperação
                          anteriores não podem ser exibidos novamente. Para
                          gerar um novo conjunto, confirme senha e um código
                          atual do autenticador. Os anteriores serão revogados.
                        </p>
                        <label>
                          Senha atual
                          <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </label>
                        <label>
                          Código atual do autenticador
                          <input
                            id="recovery-ack"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                          />
                        </label>
                        <button
                          className="ob-primary"
                          disabled={busy || !password || !code}
                          onClick={() =>
                            void perform(async () => {
                              const value = await securityRequest(
                                "GENERATE_RECOVERY_CODES",
                                { password, code },
                              );
                              setCodes(value.codes);
                              setPassword("");
                              setCode("");
                            })
                          }
                        >
                          Gerar novos códigos de recuperação
                        </button>
                      </div>
                    ))}
                  {step === 6 && (
                    <div className="ob-stack">
                      <p>
                        <Check aria-hidden="true" /> MFA ativado e recuperação
                        confirmada.
                      </p>
                      <p>
                        Agora encerre esta sessão. Entre novamente com sua senha
                        e depois informe o código do autenticador ou um código
                        de recuperação. Não há verificação artificial desta
                        sessão.
                      </p>
                      <button
                        id="new-login"
                        className="ob-primary"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            const current = data.sessions.find(
                              (s) => s.current,
                            );
                            await securityRequest("REVOKE_SESSION", {
                              targetSessionId: current?.id,
                            });
                            router.replace("/login");
                          })
                        }
                      >
                        Encerrar sessão e fazer novo login
                      </button>
                    </div>
                  )}
                  {step === 7 && (
                    <div className="ob-stack">
                      <ShieldCheck size={40} aria-hidden="true" />
                      <p>
                        Segundo fator validado no login. Suas permissões e seu
                        escopo permanecem os mesmos.
                      </p>
                      <button
                        id="finish-onboarding"
                        className="ob-primary"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            await securityRequest("COMPLETE_ONBOARDING");
                            router.replace(destination);
                          })
                        }
                      >
                        Concluir e acessar minha área
                      </button>
                    </div>
                  )}
                  <footer className="ob-actions">
                    {step > 0 && step < 5 && (
                      <button
                        className="ob-link"
                        disabled={busy}
                        onClick={() => setStep(step - 1)}
                      >
                        Voltar
                      </button>
                    )}
                    <button
                      className="ob-link"
                      disabled={busy || codes.length > 0}
                      onClick={() => void pause()}
                    >
                      Sair do tutorial
                    </button>
                  </footer>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
