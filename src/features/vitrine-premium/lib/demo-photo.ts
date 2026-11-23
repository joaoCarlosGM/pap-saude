'use client'

import {useSyncExternalStore} from 'react'
const key = 'pap.vitrine.profile-photo-v1'
const changed = 'pap:vitrine-photo'
const jpeg = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/

function subscribe(listener: () => void) {
  window.addEventListener(changed, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(changed, listener)
    window.removeEventListener('storage', listener)
  }
}

function readPhoto() {
  try {
    const value = localStorage.getItem(key)
    return value && value.length < 150_000 && jpeg.test(value) ? value : ''
  } catch {return ''}
}

export function writeDemoPhoto(value: string) {
  if (value) {
    if (!jpeg.test(value) || value.length >= 150_000) throw new Error('Foto inválida')
    localStorage.setItem(key, value)
  } else localStorage.removeItem(key)
  window.dispatchEvent(new Event(changed))
}
export function useDemoPhoto() {
  return useSyncExternalStore(subscribe, readPhoto, () => '')
}

export async function decodeDemoPhoto(file: File) {
  if (file.size > 5_000_000) throw new Error('Use uma imagem de até 5 MB.')
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const signature = new TextDecoder().decode(bytes)
  const png = file.type === 'image/png' && bytes[0] === 137 && signature.slice(1, 4) === 'PNG'
  const jpg = file.type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const webp = file.type === 'image/webp' && signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP'
  if (!png && !jpg && !webp) throw new Error('Escolha um arquivo PNG, JPEG ou WebP válido.')
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'})
  if (bitmap.width * bitmap.height > 16_000_000 || Math.min(bitmap.width, bitmap.height) < 96) {
    bitmap.close()
    throw new Error('A imagem precisa ter pelo menos 96 × 96 pixels e no máximo 16 megapixels.')
  }
  return bitmap
}

export function cropDemoPhoto(bitmap: ImageBitmap, x: number, y: number, zoom: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d', {alpha: false})
  if (!context) throw new Error('Recorte indisponível.')
  const edge = Math.min(bitmap.width, bitmap.height) / zoom
  context.fillStyle = 'white'
  context.fillRect(0, 0, 256, 256)
  context.drawImage(bitmap, x * (bitmap.width - edge), y * (bitmap.height - edge), edge, edge, 0, 0, 256, 256)
  return canvas.toDataURL('image/jpeg', 0.88)
}
