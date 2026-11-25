'use client'

import {useEffect, useState, type ComponentProps, type ReactNode} from 'react'
import Modal from './Modal'
import {Button} from './button'

export default function FormDialog({onClose, dirty, busy, children, ...props}: Omit<ComponentProps<typeof Modal>,'children'> & {
  children: ReactNode | ((requestClose: () => void) => ReactNode)
  dirty: boolean
  busy?: boolean
}) {
  const [confirm,setConfirm] = useState(false)
  useEffect(() => {
    if (!dirty || !props.open) return
    const protect = (event: BeforeUnloadEvent) => {event.preventDefault();event.returnValue = ''}
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty, props.open])

  function close() {
    if (busy) return
    if (dirty) setConfirm(true)
    else onClose()
  }

  return <>
    <Modal {...props} onClose={close}>{typeof children === 'function' ? children(close) : children}</Modal>
    {confirm && props.open && <Modal open role="alertdialog" title="Descartar alterações?"
      description="Os dados deste formulário ainda não foram salvos." maxWidth="sm" onClose={() => setConfirm(false)}>
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" data-dialog-initial-focus onClick={() => setConfirm(false)}>Continuar editando</Button>
        <Button className="min-h-11" variant="outline" onClick={() => {setConfirm(false);onClose()}}>Descartar alterações</Button>
      </div>
    </Modal>}
  </>
}
