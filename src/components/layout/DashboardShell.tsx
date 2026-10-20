"use client";

import { useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <nav
            aria-label="Ajuda e segurança"
            className="mb-4 flex gap-4 text-sm"
          >
            <a href="/primeiros-passos?ajuda=1">Primeiros passos / Ajuda</a>
            <a href="/minha-seguranca">Segurança da minha conta</a>
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
