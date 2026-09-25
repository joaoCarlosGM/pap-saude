export type SettingsTab =
  | "profile"
  | "preferences"
  | "notifications"
  | "security"

export type UserProfileSettings = {
  initials: string
  name: string
  email: string
  profession: string
  professionalRegistration: string
  phone: string
}

export type UserPreferences = {
  compactMode: boolean
  reducedAnimations: boolean
  confirmBeforeLeavingForm: boolean
}

export type NotificationPreferences = {
  clinicalAlerts: boolean
  appointmentReminders: boolean
  protocolUpdates: boolean
  emailNotifications: boolean
}

export type UserSettings = {
  profile: UserProfileSettings
  preferences: UserPreferences
  notifications: NotificationPreferences
}