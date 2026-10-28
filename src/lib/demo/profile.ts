import type { UserProfileSettings } from '../../types/configuracao'

export type DemoProfile = UserProfileSettings & {
  municipality: string
  uf: string
  unit: string
}

export const DEFAULT_DEMO_PROFILE: Readonly<DemoProfile> = {
  initials: 'AP', name: 'Ana Paula', profession: 'Profissional de saúde',
  municipality: 'Belém', uf: 'PA', unit: 'UBS Demonstrativa',
  email: 'ana.paula@demo.invalid', professionalRegistration: 'DEMONSTRATIVO', phone: '',
}

export function editDemoProfile(current: DemoProfile, patch: Partial<DemoProfile>): DemoProfile {
  const next = { ...current }
  for (const key of Object.keys(DEFAULT_DEMO_PROFILE) as Array<keyof DemoProfile>) {
    if (typeof patch[key] === 'string') next[key] = patch[key]!.slice(0, key === 'unit' ? 160 : 100)
  }
  next.uf = next.uf.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase()
  next.initials = next.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'DE'
  return next
}
