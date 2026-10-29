'use client'
import {useRouter,usePathname} from 'next/navigation'
import { useEffect, useState } from 'react'
import Modal from '@/features/vitrine-premium/components/ui/Modal'
import { Button } from '@/features/vitrine-premium/components/ui/button'
import GuidedTour from '@/features/vitrine-premium/components/onboarding/GuidedTour'
import { DEMO_TOUR_STEPS } from '@/features/vitrine-premium/lib/demo/tour'
import { welcomeSeen, markWelcomeSeen } from '@/features/vitrine-premium/lib/demo/welcome-session'
import { useDemo } from './DemoProvider'

export default function DemoOnboarding() {
  const demo=useDemo(),router=useRouter(),pathname=usePathname(),[welcomeOpen,setWelcomeOpen]=useState(false)
  const [pendingIndex,setPendingIndex]=useState<number|null>(null)
  useEffect(()=>{let active=true;Promise.resolve(welcomeSeen()).then(seen=>{if(active)setWelcomeOpen(!seen)});return()=>{active=false}},[])
  function dismiss(){markWelcomeSeen();setWelcomeOpen(false);demo.requestHelp(false);setPendingIndex(null)}
  function activate(index:number){markWelcomeSeen();setWelcomeOpen(false);demo.requestHelp(false);demo.setTourIndex(index);setPendingIndex(null);if(innerWidth<768)demo.openMainMenu();else demo.closeMainMenu()}
  function move(index:number){const step=DEMO_TOUR_STEPS[index];if(!step)return;if(pathname===step.path)activate(index);else {setPendingIndex(index);router.push(step.path)}}
  useEffect(()=>{if(pendingIndex===null||pathname!==DEMO_TOUR_STEPS[pendingIndex]?.path)return;const frame=requestAnimationFrame(()=>{markWelcomeSeen();setWelcomeOpen(false);demo.requestHelp(false);demo.setTourIndex(pendingIndex);setPendingIndex(null);if(innerWidth<768)demo.openMainMenu();else demo.closeMainMenu()});return()=>cancelAnimationFrame(frame)},[pendingIndex,pathname,demo])
  function finish(){setPendingIndex(null);demo.setTourIndex(null);demo.closeMainMenu();requestAnimationFrame(()=>{const target=Array.from(document.querySelectorAll<HTMLElement>('[data-tour-help],button[aria-label="Abrir menu"]')).find(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');target?.focus()})}
  return <><span hidden data-demo-onboarding/>
    <Modal open={demo.tourIndex===null&&(welcomeOpen||demo.helpRequested)} onClose={dismiss} title="Bem-vindo ao PAP Saúde" maxWidth="md"
      footer={<><Button variant="outline" onClick={dismiss}>Explorar a plataforma livremente</Button><Button onClick={()=>move(0)}>Iniciar tutorial guiado</Button></>}>
      {pendingIndex!==null&&<p role="status" className="mb-3 text-sm text-slate-500">Preparando a etapa. Você pode explorar livremente a qualquer momento.</p>}
      <p>Explore como o PAP Saúde conecta profissionais, pacientes e informações clínicas em uma única plataforma.</p>
      <div className="mt-4 rounded-xl border border-pink-100 bg-pink-50 p-4"><h3 className="font-semibold text-pink-700">Ambiente demonstrativo</h3><p className="mt-2 text-sm text-slate-700">Todos os pacientes, atendimentos, indicadores e informações apresentados nesta versão são fictícios e utilizados exclusivamente para demonstrar as funcionalidades da plataforma.</p></div>
      <p className="mt-4 text-sm text-slate-600">Nenhuma informação desta demonstração representa um atendimento clínico real. Não insira dados pessoais ou clínicos verdadeiros.</p>
    </Modal>
    {demo.tourIndex!==null&&<GuidedTour steps={DEMO_TOUR_STEPS} index={demo.tourIndex} onIndexChange={move} onClose={finish} menuOpen={demo.mainMenuOpen} onMenuToggle={()=>demo.mainMenuOpen?demo.closeMainMenu():demo.openMainMenu()}/>}
  </>
}
