'use client'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { useDemo } from './DemoProvider'
export default function DemoDialogs() {
  const demo = useDemo()
  return <>
    <Modal open={demo.resetRequested} onClose={() => demo.requestReset(false)} title="Restaurar demonstração"
      footer={<><Button variant="outline" onClick={() => demo.requestReset(false)}>Cancelar</Button><Button onClick={() => { demo.reset(); demo.requestReset(false) }}>Restaurar dados sintéticos</Button></>}>
      <p>Restaurar pacientes, atendimentos e perfil institucional demonstrativos? As alterações desta navegação serão descartadas. Nenhum banco real será acessado.</p>
    </Modal>
    <Modal open={demo.helpRequested} onClose={() => demo.requestHelp(false)} title="Ajuda da demonstração">
      <p>Explore Registro, Pacientes, Atendimentos, Dashboard e recursos de apoio. Use somente dados sintéticos. As alterações são descartadas ao recarregar.</p>
    </Modal>
    <Modal open={demo.noticesRequested} onClose={() => demo.requestNotices(false)} title="Avisos demonstrativos">
      <p>Ambiente demonstrativo, sem notificações clínicas reais ou avisos não lidos.</p>
      <p className="mt-3">Os dados têm referência em 28/10/2026. Chat IA simulado; nenhum serviço externo é consultado.</p>
    </Modal>
  </>
}
