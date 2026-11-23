'use client'

import {useEffect, useRef, useState} from 'react'
import jsQR from 'jsqr'
import {Camera} from 'lucide-react'
import Modal from '../ui/Modal'
import {Button} from '../ui/button'

type Phase = 'idle' | 'requesting-permission' | 'scanning' | 'resolving' | 'invalid' | 'denied' | 'offline'
const messages: Record<Phase, string> = {
  idle: 'Ative a câmera e aponte para o QR da carteirinha.',
  'requesting-permission': 'Aguardando permissão…',
  scanning: 'Aponte para o QR da carteirinha.',
  resolving: 'Verificando a carteirinha…',
  invalid: 'Carteirinha indisponível. Confira o código ou use outra carteirinha.',
  denied: 'Câmera indisponível. Confira a permissão ou use PNG/código.',
  offline: 'Consulta indisponível. Tente novamente ou use PNG/código.',
}

export default function CameraScanner({onScan, onDetected, onClose}: {
  onScan: (token: string, signal: AbortSignal) => Promise<boolean>
  onDetected: () => void
  onClose: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const frame = useRef(0)
  const pending = useRef<AbortController | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selected, setSelected] = useState('')

  function releaseStream() {
    cancelAnimationFrame(frame.current)
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }

  useEffect(() => {
    const element = video.current
    function cancel() {
      pending.current?.abort()
      pending.current = null
      cancelAnimationFrame(frame.current)
      stream.current?.getTracks().forEach(track => track.stop())
      stream.current = null
      if (element) element.srcObject = null
    }
    const suspend = () => { cancel(); setPhase('idle') }
    const visibilityChanged = () => { if (document.hidden) suspend() }
    document.addEventListener('visibilitychange', visibilityChanged)
    window.addEventListener('pagehide', suspend)
    return () => {
      cancel()
      document.removeEventListener('visibilitychange', visibilityChanged)
      window.removeEventListener('pagehide', suspend)
    }
  }, [])

  function close() {
    pending.current?.abort()
    releaseStream()
    onClose()
  }

  async function start(deviceId = selected) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setPhase('denied')
      return
    }
    pending.current?.abort()
    releaseStream()
    const request = new AbortController()
    pending.current = request
    setPhase('requesting-permission')

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? {deviceId: {exact: deviceId}} : {facingMode: {ideal: 'environment'}},
      })
      if (request.signal.aborted || !video.current) {
        media.getTracks().forEach(track => track.stop())
        return
      }
      const element = video.current
      stream.current = media
      element.srcObject = media
      await element.play()
      const inputs = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      if (request.signal.aborted) return
      setDevices(inputs.filter(device => device.kind === 'videoinput'))
      setSelected(media.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId)
      for (const track of media.getTracks()) track.addEventListener('ended', () => {
        if (request.signal.aborted || stream.current !== media) return
        request.abort()
        releaseStream()
        setPhase('denied')
      }, {once: true})

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', {willReadFrequently: true})
      if (!context) throw new Error('Camera canvas unavailable')
      setPhase('scanning')
      let last = 0

      async function scan(now: number) {
        if (request.signal.aborted) return
        if (now - last < 200 || !element.videoWidth) {
          frame.current = requestAnimationFrame(scan)
          return
        }
        last = now
        const scale = Math.min(1, 960 / element.videoWidth)
        canvas.width = Math.round(element.videoWidth * scale)
        canvas.height = Math.round(element.videoHeight * scale)
        context!.drawImage(element, 0, 0, canvas.width, canvas.height)
        const pixels = context!.getImageData(0, 0, canvas.width, canvas.height)
        const qr = jsQR(pixels.data, pixels.width, pixels.height, {inversionAttempts: 'dontInvert'})
        if (!qr) {
          frame.current = requestAnimationFrame(scan)
          return
        }
        releaseStream()
        setPhase('resolving')
        try {
          const accepted = await onScan(qr.data, request.signal)
          if (request.signal.aborted) return
          if (accepted) onDetected()
          else setPhase('invalid')
        } catch {
          if (!request.signal.aborted) setPhase('offline')
        }
      }
      frame.current = requestAnimationFrame(scan)
    } catch {
      if (!request.signal.aborted) {
        releaseStream()
        setPhase('denied')
      }
    }
  }

  const scanning = phase === 'scanning'
  return <Modal open onClose={close} title="Escanear carteirinha PAP-ID" maxWidth="md">
    <div className="grid gap-4">
      <div hidden={!scanning} className="relative">
        <video ref={video} muted playsInline autoPlay aria-label="Prévia ao vivo da câmera" className="max-h-[45dvh] w-full rounded-xl bg-slate-900 object-contain"/>
        <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white shadow"/>
      </div>
      <p role="status" className="text-sm">{messages[phase]}</p>
      {(phase === 'idle' || phase === 'invalid' || phase === 'offline' || phase === 'denied') &&
        <Button onClick={() => void start()}><Camera size={18} aria-hidden/>{phase === 'idle' ? 'Ativar câmera' : 'Tentar novamente'}</Button>}
      {scanning && devices.length > 1 && <label className="text-sm">Câmera
        <select className="ml-2 max-w-full rounded border p-2" value={selected} onChange={e => void start(e.target.value)}>
          {devices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Câmera ' + (i + 1)}</option>)}
        </select>
      </label>}
    </div>
  </Modal>
}
