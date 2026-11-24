'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardPlus, ClipboardList, Users, BookOpen, Wrench, LayoutDashboard, Settings, X, GraduationCap, HelpCircle, Bell, CalendarDays, ChevronDown, RotateCcw } from 'lucide-react'
import AnimatedChatIcon from '@/features/vitrine-premium/components/chat/AnimatedChatIcon'
import { useDemo } from '@/features/vitrine-premium/components/demo/DemoProvider'
import ProfileAvatar from '../configuracoes/ProfileAvatar'
import HelpCard from '@/components/premium/HelpCard'

const menuItems = [
 {label:'Dashboard',href:'/vitrine/dashboard',icon:LayoutDashboard},
 {label:'Registro',href:'/vitrine/registro',icon:ClipboardPlus},
 {label:'Atendimentos',href:'/vitrine/atendimentos',icon:ClipboardList},
 {label:'Agenda',href:'/vitrine/agenda',icon:CalendarDays},
 {label:'Pacientes',href:'/vitrine/pacientes',icon:Users},
 {label:'Protocolos',href:'/vitrine/protocolos',icon:BookOpen},
 {label:'Ferramentas',href:'/vitrine/ferramentas',icon:Wrench},
 {label:'Chat IA',id:'chat',icon:AnimatedChatIcon,comingSoon:true},
 {label:'Cursos',id:'cursos',icon:GraduationCap,comingSoon:true},
] as const
export default function Sidebar({open,onClose}:{open:boolean;onClose:()=>void}) {
  const pathname = usePathname(), drawer = useRef<HTMLElement>(null)
  const {state:{profile},requestHelp,requestNotices,requestReset,tourIndex} = useDemo()
  const [profileMenu,setProfileMenu] = useState(false)
  const activePath=pathname==='/vitrine'?'/vitrine/dashboard':pathname
  const activeIndex = menuItems.findIndex(item => 'href' in item && (activePath === item.href || activePath.startsWith(item.href + '/')))
  useEffect(() => {
    if (!open || tourIndex!==null) return
    const previous = document.activeElement as HTMLElement | null
    drawer.current?.querySelector<HTMLElement>('button')?.focus()
    return () => previous?.focus()
  },[open,tourIndex])
  useEffect(()=>{
    const desktop=matchMedia('(min-width:768px)')
    const closeOnDesktop=()=>{if(desktop.matches&&open)onClose()}
    closeOnDesktop();desktop.addEventListener('change',closeOnDesktop)
    return()=>desktop.removeEventListener('change',closeOnDesktop)
  },[open,onClose])
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
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 motion-reduce:transition-none md:static md:z-auto md:w-64 md:translate-x-0 ${open?'translate-x-0 visible':'-translate-x-full invisible md:visible'}`}>
      <div className="flex h-12 shrink-0 items-center justify-between px-5">
        <span className="text-xl font-semibold text-pink-500">PAP Saúde</span>
        <button type="button" aria-label="Fechar menu" onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 md:hidden"><X size={20}/></button>
      </div>
      <div className="relative mx-3 shrink-0 rounded-xl border border-slate-200 p-2" data-tour="profile">
        <button type="button" aria-expanded={profileMenu} onClick={()=>setProfileMenu(value=>!value)} className="flex min-h-11 w-full items-center gap-2 rounded-md text-left">
          <ProfileAvatar initials={profile.initials}/>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold text-slate-900">{profile.name||'Profissional'}</span>
            <span className="block break-words text-xs text-slate-600">{profile.profession||'Profissional de saúde'}</span>
          </span><ChevronDown size={16} aria-hidden className="shrink-0"/>
        </button>
        {profileMenu && <div className="absolute inset-x-2 top-14 z-20 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <Link href="/vitrine/configuracoes" className="flex min-h-11 items-center gap-2 rounded px-2 text-sm" onClick={()=>{setProfileMenu(false);onClose()}}><Settings size={16}/>Editar perfil</Link>
          <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded px-2 text-sm" onClick={()=>{setProfileMenu(false);requestReset(true)}}><RotateCcw size={16}/>Restaurar demonstração</button>
        </div>}
        <div className="mt-2 break-words text-xs leading-5 text-slate-600"><p>{profile.unit||'UBS Demonstrativa'}</p><p>{profile.municipality||'Município demonstrativo'} — {profile.uf||'UF'}</p></div>
        <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <button type="button" data-tour-help onClick={()=>{onClose();requestHelp(true)}} className="flex min-h-11 items-center justify-center gap-1 rounded hover:bg-pink-50"><HelpCircle size={15}/>Ajuda</button>
          <button type="button" onClick={()=>{onClose();requestNotices(true)}} className="flex min-h-11 items-center justify-center gap-1 rounded hover:bg-pink-50"><Bell size={15}/>Avisos</button>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2" aria-label="Módulos">
        <div className="relative flex flex-col gap-1" >

          {menuItems.map((item,index)=>{const Icon=item.icon;const sectionHeading=[0,1,5].includes(index)&&<p className="px-3 pt-2 text-xs text-slate-600">{index===0?'VISÃO GERAL':index===1?'CLÍNICA':'CONHECIMENTO E APOIO'}</p>;return <div key={'href' in item?item.href:item.id}>{sectionHeading}{!('href' in item)
            ? <div data-tour-coming-soon={item.id} className="flex min-h-10 shrink-0 items-center gap-3 px-3 text-sm text-slate-600" title="Em breve"><Icon size={18} strokeWidth={1.8} className="shrink-0"/><span>{item.label}</span><span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">Em breve</span></div>
            : <Link href={item.href} prefetch={false} data-tour-nav={item.href} aria-current={activeIndex===index?'page':undefined} onClick={onClose}
            className={`relative flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-pink-500 ${activeIndex===index?'bg-pink-50 font-medium text-pink-600':'text-gray-600 hover:bg-gray-50'}`}><Icon size={18} strokeWidth={1.8} className="shrink-0"/><span>{item.label}</span></Link>}</div>})}
        </div>
      </nav>
      <div className="shrink-0 px-3 py-2"><Link href="/comercial" prefetch={false} onClick={onClose} className="block rounded px-3 py-2 text-xs text-slate-600 underline">Voltar ao Comercial</Link><Link href="/vitrine/configuracoes" prefetch={false} aria-current={pathname==='/vitrine/configuracoes'?'page':undefined} onClick={onClose} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-pink-500 ${pathname==='/vitrine/configuracoes'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}`}><Settings size={18}/><span>Configurações</span></Link><HelpCard onTutorial={()=>{onClose();requestHelp(true)}}/></div>
    </aside>
  </>
}
