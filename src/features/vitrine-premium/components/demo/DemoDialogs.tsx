'use client'
import Modal from '@/features/vitrine-premium/components/ui/Modal'
import { Button } from '@/features/vitrine-premium/components/ui/button'
import NoticeInbox from './NoticeInbox'
import { useDemo } from './DemoProvider'
export default function DemoDialogs() {
  const demo = useDemo()
  return <>
    <Modal open={demo.resetRequested} onClose={() => demo.requestReset(false)} title="Restaurar demonstração"
      footer={<><Button variant="outline" onClick={() => demo.requestReset(false)}>Cancelar</Button><Button onClick={() => { demo.reset(); demo.requestReset(false) }}>Restaurar dados sintéticos</Button></>}>
      <p>Restaurar pacientes, atendimentos e perfil institucional demonstrativos? As alterações desta navegação serão descartadas. Nenhum banco real será acessado.</p>
    </Modal>
    <NoticeInbox/>
  </>
}
