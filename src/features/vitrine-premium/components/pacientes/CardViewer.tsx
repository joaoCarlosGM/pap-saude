'use client'

import {useState} from 'react'
import Image from 'next/image'
import type {ReviewCard} from '../../lib/review-registry'
import {Button} from '../ui/button'
import Modal from '../ui/Modal'

export default function CardViewer({card, onClose}: {card: ReviewCard; onClose: () => void}) {
  const [mono, setMono] = useState(false)
  const [detailed, setDetailed] = useState(false)
  const [face, setFace] = useState('Frente')
  const [loadedURL, setLoadedURL] = useState('')
  const [twoSided, setTwoSided] = useState(true)
  const [errorURL, setErrorURL] = useState('')
  if (!card.url) return null

  function url(options: Record<string, string> = {}) {
    const query = new URLSearchParams({...options, ...(mono ? {tone: 'mono'} : {}), ...(detailed ? {detail: '1'} : {})}).toString()
    return card.url + (query ? '?' + query : '')
  }

  const imageURL = url()
  const loaded = loadedURL === imageURL
  const error = imageURL === errorURL

  return <Modal open onClose={onClose} title="Carteirinha PAP-ID" maxWidth="md">
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">Ativa • Emissão: {card.issuedAt ? new Date(card.issuedAt).toLocaleString('pt-BR') : 'Não registrada'}</p>
      <div className="flex flex-wrap items-center gap-2" aria-label="Face e formato da carteirinha">
        {twoSided && ['Frente', 'Verso'].map(label => <Button key={label} variant={face === label ? 'default' : 'outline'} aria-pressed={face === label} onClick={() => setFace(label)}>{label}</Button>)}
        <label className="ml-auto text-sm">Formato <select className="min-h-11 rounded border px-2" value={mono ? 'mono' : 'color'} onChange={event => setMono(event.target.value === 'mono')}><option value="color">Colorida</option><option value="mono">Preto e branco</option></select></label>
      </div>
      {twoSided && loadedURL && <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={detailed} onChange={event => {
          setDetailed(event.target.checked); setFace('Verso')
        }}/> Incluir dados sintéticos de referência no verso
      </label>}
      {error ? <p role="alert">Carteirinha indisponível. Confira a validade e a autorização da consulta.</p> :
        <div className="w-full overflow-hidden rounded-xl border border-slate-200" style={{aspectRatio: '1050/600'}}>
          <Image key={imageURL} unoptimized width={1050} height={1200} src={imageURL} alt={twoSided ? face + ' da carteirinha PAP-ID' : 'Carteirinha PAP-ID legada'} className="h-auto w-full"
            style={{transform: twoSided && face === 'Verso' ? 'translateY(-50%)' : undefined}}
            onLoad={event => {setTwoSided(event.currentTarget.naturalHeight === 1200); setLoadedURL(imageURL)}} onError={() => setErrorURL(imageURL)}/>
        </div>}
      {!twoSided && <p className="text-sm">Emissão legada com uma face. Reemita para usar o novo modelo.</p>}
      {loaded && !error && <>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Button type="button" variant="outline" onClick={() => window.print()}>Imprimir</Button>
          <a className="inline-flex min-h-11 items-center text-pink-700 underline" href={url({download: '1', format: 'pdf'})}>Baixar PDF</a>
          <a className="inline-flex min-h-11 items-center text-pink-700 underline" href={url({download: '1'})}>Baixar PNG</a>
        </div>
        <Image unoptimized width={1050} height={1200} src={url()} alt="" data-pap-card-print className="hidden"/>
        <style>{`@media print {
          @page { size: A4; margin: 16mm }
          body:has([data-pap-card-print]) > :not([data-vitrine-dialog]:has([data-pap-card-print])) { display: none !important }
          [data-vitrine-dialog]:has([data-pap-card-print]), [data-vitrine-dialog] :has([data-pap-card-print]) {
            position: static !important; display: block !important; overflow: visible !important; min-height: 0 !important;
            max-height: none !important; padding: 0 !important; border: 0 !important; box-shadow: none !important;
          }
          [data-vitrine-dialog]:has([data-pap-card-print]) :not(:has([data-pap-card-print])):not([data-pap-card-print]) { display: none !important }
          [data-pap-card-print] { display: block !important; width: 85.6mm !important; height: auto !important; print-color-adjust: exact }
        }`}</style>
      </>}
    </div>
  </Modal>
}
