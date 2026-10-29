'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardPlus, ClipboardList, Users, BookOpen, Wrench, LayoutDashboard, Settings, X, GraduationCap, HelpCircle, Bell, ChevronDown, RotateCcw } from 'lucide-react'
import AnimatedChatIcon from '@/components/chat/AnimatedChatIcon'
import { useDemo } from '@/components/demo/DemoProvider'
import styles from './sidebar.module.css'

const menuItems = [
  {label:'Registro',href:'/registro',icon:ClipboardPlus},
  {label:'Atendimentos',href:'/atendimentos',icon:ClipboardList},
  {label:'Pacientes',href:'/pacientes',icon:Users},
  {label:'Chat IA',href:'/chat',icon:AnimatedChatIcon},
  {label:'Protocolos',href:'/protocolos',icon:BookOpen},
  {label:'Ferramentas',href:'/ferramentas',icon:Wrench},
  {label:'Cursos',href:'/cursos',icon:GraduationCap},
  {label:'Dashboard',href:'/dashboard',icon:LayoutDashboard},
]
export default function Sidebar({open,onClose}:{open:boolean;onClose:()=>void}) {
  const pathname = usePathname(), drawer = useRef<HTMLElement>(null)
  const {state:{profile},requestHelp,requestNotices,requestReset,tourIndex} = useDemo()
  const [profileMenu,setProfileMenu] = useState(false)
  const activeIndex = menuItems.findIndex(item => pathname === item.href || pathname.startsWith(item.href + '/'))
  useEffect(() => {
    if (!open || tourIndex!==null) return
    const previous = document.activeElement as HTMLElement | null
    drawer.current?.querySelector<HTMLElement>('button')?.focus()
    return () => previous?.focus()
  },[open,tourIndex])
  return <>
    {open && <button type="button" aria-label="Fechar menu" onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" />}
    <aside ref={drawer} role={open&&tourIndex===null?'dialog':undefined} aria-modal={open&&tourIndex===null?true:undefined} aria-label="Navegação principal"
      onKeyDown={e => {
        if(e.key==='Escape'){setProfileMenu(false);if(open)onClose()}
        if(!open||tourIndex!==null||e.key!=='Tab')return
        const nodes=Array.from(drawer.current?.querySelectorAll<HTMLElement>('button,a[href]')||[]).filter(el=>el.getClientRects().length>0)
        if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus()}
        else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus()}
      }}
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 motion-reduce:transition-none md:static md:z-auto md:w-56 md:translate-x-0 ${open?'translate-x-0 visible':'-translate-x-full invisible md:visible'}`}>
      <div className="flex h-12 shrink-0 items-center justify-between px-5">
        <span className="text-xl font-semibold text-pink-500">PAP Saúde</span>
        <button type="button" aria-label="Fechar menu" onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 md:hidden"><X size={20}/></button>
      </div>
      <div className="relative shrink-0 px-4 pb-2" data-tour="profile">
        <button type="button" aria-label="Opções do perfil demonstrativo" aria-expanded={profileMenu} onClick={()=>setProfileMenu(v=>!v)} className="flex w-full items-center gap-2 rounded-md py-1 text-left focus-visible:outline-2 focus-visible:outline-pink-500">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-500 text-xs font-semibold text-white">{profile.initials}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{profile.name||'Profissional demonstrativo'}</span><span className="block text-[11px] text-slate-500">Profissional de saúde</span></span><ChevronDown size={14}/>
        </button>
        {profileMenu && <div className="absolute left-3 right-3 top-12 z-20 rounded-lg border bg-white p-1 shadow-lg"><button type="button" className="flex w-full items-center gap-2 rounded p-2 text-xs hover:bg-pink-50" onClick={()=>{setProfileMenu(false);requestReset(true)}}><RotateCcw size={14}/>Restaurar demonstração</button></div>}
        <div className="mt-1 min-w-0 text-[11px] leading-4 text-slate-500"><p className="break-words">{profile.municipality||'Município demonstrativo'} — {profile.uf||'UF'}</p><p className="break-words">{profile.unit||'UBS Demonstrativa'}</p></div>
        <p className="mt-1 text-[10px] font-medium text-pink-600">Modo demonstração · vínculo fictício</p>
        <div className="mt-1 flex gap-2 text-xs text-slate-600">
          <button type="button" data-tour-help onClick={()=>{onClose();requestHelp(true)}} className="flex items-center gap-1 rounded px-2 py-1.5 hover:bg-pink-50"><HelpCircle size={14}/>Ajuda</button>
          <button type="button" onClick={()=>{onClose();requestNotices(true)}} className="flex items-center gap-1 rounded px-2 py-1.5 hover:bg-pink-50"><Bell size={14}/>Avisos</button>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2" aria-label="Módulos">
        <div className="relative flex flex-col gap-1" style={{'--active-index':activeIndex} as CSSProperties}>
          {activeIndex>=0 && <span aria-hidden="true" data-sidebar-indicator className={styles.indicator}/>}
          {menuItems.map((item,index)=>{const Icon=item.icon;return <Link key={item.href} href={item.href} prefetch={false} data-tour-nav={item.href} aria-current={activeIndex===index?'page':undefined} onClick={onClose}
            className={`relative flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-pink-500 ${activeIndex===index?'font-medium text-pink-600':'text-gray-600 hover:bg-gray-50'}`}><Icon size={18} strokeWidth={1.8} className="shrink-0"/><span>{item.label}</span></Link>})}
        </div>
      </nav>
      <div className="shrink-0 px-3 py-2"><Link href="/configuracoes" prefetch={false} aria-current={pathname==='/configuracoes'?'page':undefined} onClick={onClose} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-pink-500 ${pathname==='/configuracoes'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}`}><Settings size={18}/><span>Configurações</span></Link></div>
    </aside>
  </>
}
