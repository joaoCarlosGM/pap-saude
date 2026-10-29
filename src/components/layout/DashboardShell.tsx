"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import Sidebar from "@/components/layout/Sidebar";
import PageMotion from "@/components/premium/PageMotion";
import ClinicalTour from "@/components/premium/ClinicalTour";
import type { EffectiveAccessProfile } from "@/lib/admin/types";
import "@/components/premium/premium.css";
import Topbar from "@/components/layout/Topbar";
import { navigationMode, navigationKey, type NavigationMode } from "./navigation-preference";
const subscribe = (callback:()=>void) => { window.addEventListener("storage",callback); window.addEventListener("pap:clinical-navigation",callback); return ()=>{window.removeEventListener("storage",callback);window.removeEventListener("pap:clinical-navigation",callback);}; };

export default function DashboardShell({
  children,
  demo = false,
  identity,
  profile,
}: {
  children: React.ReactNode;
  demo?: boolean;
  profile?: EffectiveAccessProfile;
  identity?: {id:string;displayName:string};
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fallback,setFallback]=useState<NavigationMode>("expanded");
  const key=navigationKey(identity?.id,demo);
  const mode=useSyncExternalStore(subscribe,()=>{try{return navigationMode(localStorage.getItem(key)??fallback);}catch{return fallback;}},()=>"expanded" as NavigationMode);
  const changeMode=(next:NavigationMode)=>{setFallback(next);try{localStorage.setItem(key,next);}catch{/* Browser preference remains optional. */}window.dispatchEvent(new Event("pap:clinical-navigation"));};

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className={`clinical-shell ${demo ? "pap-demo" : "premium-workspace"} flex min-h-screen bg-gray-50`}>
      {<a className="workspace-skip" href={demo?"#demo-main":"#clinical-main"}>Ir para o conteúdo</a>}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} demo={demo} displayName={identity?.displayName} profile={profile} mode={mode} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} demo={demo} displayName={identity?.displayName} mode={mode} onModeChange={changeMode} />

        <main id={demo ? "demo-main" : "clinical-main"} tabIndex={-1} className="min-h-0 flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <nav hidden
            aria-label="Ajuda e segurança"
            className="mb-4 flex gap-4 text-sm"
          >
            <a href={demo ? "/vitrine/ajuda" : "/ajuda/seguranca"}>{demo ? "Sobre a demonstração" : "Ajuda de segurança"}</a>
            <a href={demo ? "/comercial" : "/minha-seguranca"}>{demo ? "Voltar ao Comercial" : "Segurança da minha conta"}</a>
          </nav>
          {demo && <div className="demo-banner" role="note"><strong>DEMONSTRAÇÃO · Dados simulados</strong><span>Personagens e conteúdos fictícios. Nenhuma leitura ou gravação clínica real.</span></div>}
          <PageMotion>{children}</PageMotion>
        </main>
      </div>
      {profile && <ClinicalTour permissions={profile.permissions}/>}
    </div>
  );
}
