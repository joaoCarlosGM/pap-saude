"use client"

import { useState } from "react"

import NotificationsSettings from "./NotificationsSettings"
import PreferencesSettings from "./PreferencesSettings"
import ProfileSettings from "./ProfileSettings"
import SecuritySettings from "./SecuritySettings"
import SettingsTabs from "./SettingsTabs"

import type {
  SettingsTab,
  UserSettings,
  UserProfileSettings,
  UserPreferences,
  NotificationPreferences,
} from "@/types/configuracao"

type SettingsLayoutProps = {
  initialSettings: UserSettings
}

export default function SettingsLayout({
  initialSettings,
}: SettingsLayoutProps) {
  const [activeTab, setActiveTab] =
    useState<SettingsTab>("profile")

  const [settings, setSettings] =
    useState<UserSettings>(initialSettings)

  function handleProfileChange(
    profile: UserProfileSettings,
  ) {
    setSettings((current) => ({
      ...current,
      profile,
    }))
  }

  function handlePreferencesChange(
    preferences: UserPreferences,
  ) {
    setSettings((current) => ({
      ...current,
      preferences,
    }))
  }

  function handleNotificationsChange(
    notifications: NotificationPreferences,
  ) {
    setSettings((current) => ({
      ...current,
      notifications,
    }))
  }

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
      "
    >
      <SettingsTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div
        className="
          min-h-[500px]
          p-4
          sm:p-6
          lg:p-7
        "
      >
        <div className="mx-auto w-full max-w-5xl">
          {activeTab === "profile" && (
            <ProfileSettings
              profile={settings.profile}
              onChange={handleProfileChange}
            />
          )}

          {activeTab === "preferences" && (
            <PreferencesSettings
              preferences={settings.preferences}
              onChange={handlePreferencesChange}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsSettings
              notifications={settings.notifications}
              onChange={handleNotificationsChange}
            />
          )}

          {activeTab === "security" && (
            <SecuritySettings />
          )}
        </div>
      </div>
    </div>
  )
}