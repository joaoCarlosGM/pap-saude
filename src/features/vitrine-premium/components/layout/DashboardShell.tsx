'use client'
import '@/features/vitrine-premium/accessibility.css'
import {useEffect,useRef} from 'react'
import {useRouter,usePathname} from 'next/navigation'
import PageMotion from '@/features/vitrine-premium/components/motion/PageMotion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import RouteHero from '@/components/premium/RouteHero'
import '@/components/premium/premium.css'
import { DemoProvider, useDemo } from '@/features/vitrine-premium/components/demo/DemoProvider'
import DemoOnboarding from '@/features/vitrine-premium/components/demo/DemoOnboarding'
import DemoDialogs from '@/features/vitrine-premium/components/demo/DemoDialogs'
function Workspace({children}:{children:React.ReactNode}) {
  const demo=useDemo(), router=useRouter(), pathname=usePathname()
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null), main=useRef<HTMLElement>(null), navigating=useRef(false)
  useEffect(()=>{delete document.documentElement.dataset.vitrineLeaving;if(navigating.current){main.current?.scrollTo(0,0);navigating.current=false}},[pathname])
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);delete document.documentElement.dataset.vitrineLeaving},[])
  function navigate(event:React.MouseEvent<HTMLDivElement>){
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
    const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]')
    if(!link||!event.currentTarget.contains(link)||link.target==='_blank'||link.hasAttribute('download'))return
    const next=new URL(link.href)
    if(next.origin!==location.origin||!next.pathname.startsWith('/vitrine/')||next.pathname===pathname)return
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    navigating.current=true
    // Native Link navigation stays immediate for keyboard and reduced motion.
    if(reduced||event.detail===0)return
    event.preventDefault();if(timer.current)clearTimeout(timer.current)
    document.documentElement.dataset.vitrineLeaving='true'
    timer.current=setTimeout(()=>{router.push(next.pathname+next.search+next.hash);timer.current=setTimeout(()=>{delete document.documentElement.dataset.vitrineLeaving},1600)},100)
  }
  return <div data-vitrine-premium onClickCapture={navigate} className="flex h-dvh overflow-hidden bg-gray-50">
    <Sidebar open={demo.mainMenuOpen} onClose={demo.closeMainMenu}/>
    <button type="button" aria-label="Abrir menu" aria-expanded={demo.mainMenuOpen} onClick={demo.openMainMenu} className={`fixed left-2 top-2 ${demo.conversationMenuOpen?'z-[60]':'z-30'} flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus-visible:outline-2 focus-visible:outline-pink-500 md:hidden`}><Menu size={21}/></button>
    <main ref={main} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pt-12 sm:p-5 sm:pt-12 md:pt-5 lg:p-6"><RouteHero demo/><PageMotion>{children}</PageMotion></main>
    <DemoDialogs/>
    <DemoOnboarding/>
  </div>
}
export default function DashboardShell({children}:{children:React.ReactNode}) {
  return <DemoProvider><Workspace>{children}</Workspace></DemoProvider>
}
