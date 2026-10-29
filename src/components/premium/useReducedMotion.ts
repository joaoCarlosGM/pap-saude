'use client'
import { useSyncExternalStore } from 'react'
const query = '(prefers-reduced-motion: reduce)'
function subscribe(change: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', change)
  return () => media.removeEventListener('change', change)
}
function snapshot() { return window.matchMedia(query).matches }
export function useReducedMotion() { return useSyncExternalStore(subscribe, snapshot, () => true) }
