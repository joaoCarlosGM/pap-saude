'use client'

import {useState} from 'react'
import {useCardService} from '../demo/CardServiceContext'
import Modal from '../ui/Modal'
import {Button} from '../ui/button'

export default function PatientCardIssuer({patientId, active}: {patientId: string; active: boolean}) {
  const service = useCardService()
  const [action, setAction] = useState<'issue' | 'revoke' | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [operation, setOperation] = useState('')
  const ledger = service?.ledgers.find(row => 'patientId' in row.patient && row.patient.patientId === patientId)

  async function confirm() {
    if (!service || !action || busy) return
    setBusy(true)
    setError('')
    try {
      if (action === 'revoke' && ledger) {
        await service.revoke(ledger.patient.subject)
        setStatus('PAP-Gest revogada.')
      } else {
        const key = operation || crypto.randomUUID()
        setOperation(key)
        await service.issue(patientId, key)
        setOperation('')
        setStatus('PAP-Gest emitida.')
      }
      setAction(null)
    } catch {
      setError('Operação não confirmada. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="flex flex-wrap items-center gap-2">
    <Button variant={active ? 'outline' : 'default'} onClick={() => {setError(''); setAction('issue')}}>
      {active ? 'Reemitir PAP-Gest' : 'Emitir PAP-Gest'}
    </Button>
    {active && ledger && <Button variant="outline" onClick={() => {setError(''); setAction('revoke')}}>Revogar</Button>}
    {status && <p role="status" className="text-sm">{status}</p>}
    <Modal open={!!action} onClose={() => {if (!busy) setAction(null)}} maxWidth="sm"
      title={action === 'revoke' ? 'Revogar carteirinha?' : active ? 'Reemitir PAP-Gest?' : 'Emitir PAP-Gest?'}
      footer={<><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Cancelar</Button>
        <Button disabled={busy} onClick={() => void confirm()}>{action === 'revoke' ? 'Confirmar revogação' : 'Confirmar emissão'}</Button></>}>
      <p>{action === 'revoke' || active ? 'O QR vigente deixará de funcionar. O histórico será mantido.' : 'A carteirinha terá validade de 24 horas.'}</p>
      {error && <p role="alert">{error}</p>}
    </Modal>
  </div>
}
