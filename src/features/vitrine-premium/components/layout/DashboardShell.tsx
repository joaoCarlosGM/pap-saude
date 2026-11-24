'use client'
import '@/features/vitrine-premium/accessibility.css'
import {useEffect,useRef} from 'react'
import {useRouter,usePathname} from 'next/navigation'
import PageMotion from '@/features/vitrine-premium/components/motion/PageMotion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import {CourseMemory} from '@/features/vitrine-premium/courses/CourseMemory'
import RouteHero from '@/components/premium/RouteHero'
import '@/components/premium/premium.css'
import { DemoProvider, useDemo } from '@/features/vitrine-premium/components/demo/DemoProvider'
import DemoOnboarding from '@/features/vitrine-premium/components/demo/DemoOnboarding'
import DemoDialogs from '@/features/vitrine-premium/components/demo/DemoDialogs'
function Workspace({children}:{children:React.ReactNode}) {
  const demo=useDemo(), router=useRouter(), pathname=usePathname()
  const workspace = useRef<HTMLDivElement>(null)
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null), main=useRef<HTMLElement>(null), navigating=useRef(false)
  useEffect(()=>{delete document.documentElement.dataset.vitrineLeaving;if(navigating.current){main.current?.scrollTo(0,0);navigating.current=false}},[pathname])
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);delete document.documentElement.dataset.vitrineLeaving},[])
  useEffect(() => {
    const viewport = window.visualViewport
    const element = workspace.current
    if (!viewport || !element) return
    function fitViewport() {
      if (!element || !viewport) return
      const compressed = window.innerWidth < 768 && viewport.scale === 1 && viewport.height < window.innerHeight - 60
      element.style.height = compressed ? `${Math.floor(viewport.height)}px` : ''
      const focused = document.activeElement
      if (!compressed || !(focused instanceof HTMLElement) || !main.current?.contains(focused)) return
      if (!focused.matches('input,select,textarea,[contenteditable="true"]')) return
      const bounds = focused.getBoundingClientRect()
      const scrollport = main.current.getBoundingClientRect()
      if (bounds.bottom > scrollport.bottom || bounds.top < scrollport.top) focused.scrollIntoView({block: 'nearest'})
    }
    viewport.addEventListener('resize', fitViewport)
    element.addEventListener('focusin', fitViewport)
    return () => {
      viewport.removeEventListener('resize', fitViewport)
      element.removeEventListener('focusin', fitViewport)
      element.style.height = ''
    }
  }, [])
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
  return <div ref={workspace} data-vitrine-premium onClickCapture={navigate} className="flex h-dvh overflow-hidden bg-gray-50">
    <Sidebar open={demo.mainMenuOpen} onClose={demo.closeMainMenu}/>
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white p-2 md:hidden">
        <button type="button" aria-label="Abrir menu" aria-expanded={demo.mainMenuOpen} onClick={demo.openMainMenu}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 focus-visible:outline-2 focus-visible:outline-pink-500"><Menu size={21}/></button>
      </div>
      <main ref={main} className="min-h-0 min-w-0 flex-1 overflow-y-auto scroll-py-4 p-4 sm:p-5 lg:p-6"><RouteHero demo/><PageMotion>{children}</PageMotion></main>
    </div>
    <DemoDialogs/>
    <DemoOnboarding/>
  </div>
}
export default function DashboardShell({children}:{children:React.ReactNode}) {
  return <DemoProvider><CourseMemory><Workspace>{children}</Workspace></CourseMemory></DemoProvider>
}
