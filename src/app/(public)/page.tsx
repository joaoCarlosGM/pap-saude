import Link from "next/link";
import { Activity, ShieldCheck, Clock, ArrowRight, HeartPulse } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar Minimalista */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700">
            <HeartPulse size={28} strokeWidth={2.5} />
            <span className="text-xl font-bold tracking-tight">PAP Saúde</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <Link href="#recursos" className="hover:text-blue-600 transition-colors">Recursos</Link>
            <Link href="#protocolo" className="hover:text-blue-600 transition-colors">Protocolo MEOWS</Link>
            <Link href="#contato" className="hover:text-blue-600 transition-colors">Suporte</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-emerald-50 -z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              Acolhimento Obstétrico <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                Inteligente e Seguro
              </span>
            </h1>
            <p className="mt-4 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Sistema ágil para classificação de risco e monitoramento de sinais vitais utilizando o protocolo MEOWS, focado em agilidade e precisão clínica.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/triagem"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
              >
                Iniciar Triagem
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
              >
                Painel de Gestão
              </Link>
            </div>
          </div>
        </section>

        {/* Seção de Recursos (Features) */}
        <section id="recursos" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900">Projetado para a Rotina Hospitalar</h2>
              <p className="mt-4 text-slate-500">Foco na redução do tempo de espera e na precisão da auditoria clínica.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Score MEOWS Integrado</h3>
                <p className="text-slate-600 leading-relaxed">
                  Cálculo automático do escore de alerta precoce para morbidade obstétrica, garantindo intervenções no tempo exato.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 text-emerald-600">
                  <Clock size={24} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Acolhimento Ágil</h3>
                <p className="text-slate-600 leading-relaxed">
                  Fluxo otimizado (Wizard) que permite à equipe de enfermagem registrar sinais vitais em segundos.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Rastreabilidade</h3>
                <p className="text-slate-600 leading-relaxed">
                  Histórico imutável de avaliações, ideal para auditoria clínica e gestão de qualidade hospitalar.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Simples */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 text-white mb-4 md:mb-0">
            <HeartPulse size={24} />
            <span className="font-semibold text-lg">PAP Saúde</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} PAP Saúde. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}