"use client";

import { useCallback, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardShell({
  children,
  demo = false,
  identity,
}: {
  children: React.ReactNode;
  demo?: boolean;
  identity?: {id:string;displayName:string};
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className={`${demo ? "pap-demo" : ""} flex min-h-screen bg-gray-50`}>
      {demo && <a className="workspace-skip" href="#demo-main">Ir para o conteúdo</a>}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} demo={demo} displayName={identity?.displayName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} demo={demo} displayName={identity?.displayName} />

        <main id={demo ? "demo-main" : undefined} tabIndex={demo ? -1 : undefined} className="min-h-0 flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <nav
            aria-label="Ajuda e segurança"
            className="mb-4 flex gap-4 text-sm"
          >
            <a href={demo ? "/vitrine/ajuda" : "/ajuda/seguranca"}>{demo ? "Sobre a demonstração" : "Ajuda de segurança"}</a>
            <a href={demo ? "/comercial" : "/minha-seguranca"}>{demo ? "Voltar ao Comercial" : "Segurança da minha conta"}</a>
          </nav>
          {demo && <div className="demo-banner" role="note"><strong>DEMONSTRAÇÃO · Dados simulados</strong><span>Personagens e conteúdos fictícios. Nenhuma leitura ou gravação clínica real.</span></div>}
          {children}
        </main>
      </div>
    </div>
  );
}
