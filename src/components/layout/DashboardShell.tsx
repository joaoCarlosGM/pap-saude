'use client'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { DemoProvider, useDemo } from '@/components/demo/DemoProvider'
import DemoDialogs from '@/components/demo/DemoDialogs'
function Workspace({children}:{children:React.ReactNode}) {
  const demo=useDemo()
  return <div className="flex h-dvh overflow-hidden bg-gray-50">
    <Sidebar open={demo.mainMenuOpen} onClose={demo.closeMainMenu}/>
    <button type="button" aria-label="Abrir menu" aria-expanded={demo.mainMenuOpen} onClick={demo.openMainMenu} className="fixed left-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus-visible:outline-2 focus-visible:outline-pink-500 md:hidden"><Menu size={21}/></button>
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pt-12 sm:p-5 sm:pt-12 md:pt-5 lg:p-6">{children}</main>
    <DemoDialogs/>
  </div>
}
export default function DashboardShell({children}:{children:React.ReactNode}) {
  return <DemoProvider><Workspace>{children}</Workspace></DemoProvider>
}
