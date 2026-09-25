import type { UserSettings } from "@/types/configuracao"

export const mockUserSettings: UserSettings = {
  profile: {
    initials: "AP",
    name: "Ana Paula",
    email: "ana.paula@papsaude.com.br",
    profession: "Enfermeira",
    professionalRegistration: "COREN-PA 000000",
    phone: "(91) 99999-9999",
  },

  preferences: {
    compactMode: false,
    reducedAnimations: false,
    confirmBeforeLeavingForm: true,
  },

  notifications: {
    clinicalAlerts: true,
    appointmentReminders: true,
    protocolUpdates: true,
    emailNotifications: false,
  },
}