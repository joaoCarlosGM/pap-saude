'use client'

import {useEffect, useRef, useState} from 'react'
import Image from 'next/image'
import {cropDemoPhoto, decodeDemoPhoto, useDemoPhoto, writeDemoPhoto} from '../../lib/demo-photo'
import {Button} from '../ui/button'
import Modal from '../ui/Modal'

export default function ProfilePhotoEditor() {
  const saved = useDemoPhoto()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState('')
  const [crop, setCrop] = useState({x: .5, y: .5, zoom: 1})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const image = useRef<ImageBitmap | null>(null)

  useEffect(() => () => image.current?.close(), [])

  function close() {
    if (busy || (preview && !window.confirm('Descartar o recorte da foto?'))) return
    clear()
  }
  function clear() {
    image.current?.close()
    image.current = null
    setPreview('')
    setError('')
    setOpen(false)
  }
  async function load(file?: File) {
    if (!file) return
    setBusy(true)
    setError('')
    let next: ImageBitmap | undefined
    try {
      next = await decodeDemoPhoto(file)
      const initial = {x: .5, y: .5, zoom: 1}
      const output = cropDemoPhoto(next, initial.x, initial.y, initial.zoom)
      image.current?.close()
      image.current = next
      setCrop(initial)
      setPreview(output)
    } catch (error) {
      next?.close()
      setError(error instanceof Error ? error.message : 'Não foi possível abrir a imagem.')
    } finally {setBusy(false)}
  }
  function adjust(field: keyof typeof crop, value: number) {
    const next = {...crop, [field]: value}
    if (!image.current) return
    setPreview(cropDemoPhoto(image.current, next.x, next.y, next.zoom))
    setCrop(next)
  }
  function save(value: string) {
    try {writeDemoPhoto(value); clear()}
    catch {setError('Não foi possível alterar a foto neste navegador.')}
  }
  return <>
    <Button variant="outline" type="button" onClick={() => setOpen(true)}>Alterar foto</Button>
    <Modal open={open} onClose={close} title="Foto do perfil" maxWidth="sm">
      <div className="grid gap-3">
        <label className="grid gap-2 text-sm">Imagem PNG, JPEG ou WebP de até 5 MB
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => void load(event.target.files?.[0])}/>
        </label>
        {busy && <p role="status">Processando imagem…</p>}
        {preview && <>
          <Image unoptimized src={preview} width={144} height={144} className="rounded-full" alt="Prévia do recorte"/>
          <label className="grid text-sm">Zoom<input type="range" min={1} max={3} step={.05} value={crop.zoom} onChange={event => adjust('zoom', Number(event.target.value))}/></label>
          <label className="grid text-sm">Posição horizontal<input type="range" min={0} max={1} step={.025} value={crop.x} onChange={event => adjust('x', Number(event.target.value))}/></label>
          <label className="grid text-sm">Posição vertical<input type="range" min={0} max={1} step={.025} value={crop.y} onChange={event => adjust('y', Number(event.target.value))}/></label>
        </>}
        <p className="text-xs text-slate-600">A foto fica neste navegador. Use uma imagem de teste.</p>
        {error && <p role="alert" className="text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {preview && <Button type="button" disabled={busy} onClick={() => save(preview)}>Salvar foto</Button>}
          {saved && <Button type="button" variant="outline" disabled={busy} onClick={() => {if (window.confirm('Remover a foto do perfil?')) save('')}}>Remover foto</Button>}
        </div>
      </div>
    </Modal>
  </>
}
