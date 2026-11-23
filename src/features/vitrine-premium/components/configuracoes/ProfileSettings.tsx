"use client"

import {
  Mail,
  Phone,
  UserRound,
} from "lucide-react"

import ProfileAvatar from "./ProfileAvatar"
import ProfilePhotoEditor from "./ProfilePhotoEditor"
import { useState } from "react"
import { useDemo } from "@/features/vitrine-premium/components/demo/DemoProvider"
import { Button } from "@/features/vitrine-premium/components/ui/button"
import Input from "@/features/vitrine-premium/components/ui/Input"

import type { UserProfileSettings } from "@/features/vitrine-premium/types/configuracao"

type Props = {
  profile: UserProfileSettings
  onChange: (
    profile: UserProfileSettings,
  ) => void
}

export default function ProfileSettings({
  profile,
  onChange,
}: Props) {
  const [saved,setSaved]=useState(false)
  const {state,updateProfile,requestReset}=useDemo()
  function updateField(
    field: keyof UserProfileSettings,
    value: string,
  ) {
    onChange({
      ...profile,
      [field]: value,
    })
  }

  return (
    <section>
      {saved&&<p role="status" className="mb-3 text-sm text-emerald-700">Preferências do perfil demonstrativo atualizadas na memória desta navegação.</p>}
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Informações do perfil
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Atualize seus dados profissionais e de contato.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2" data-tour="institution">
        <Input id="demo-municipality" label="Município demonstrativo" value={state.profile.municipality} onChange={e=>updateProfile({municipality:e.target.value})}/>
        <Input id="demo-uf" label="UF demonstrativa" maxLength={2} value={state.profile.uf} onChange={e=>updateProfile({uf:e.target.value})}/>
        <Input id="demo-unit" label="UBS demonstrativa" value={state.profile.unit} onChange={e=>updateProfile({unit:e.target.value})}/>
        <div className="flex items-end"><Button variant="outline" onClick={()=>requestReset(true)}>Restaurar demonstração</Button></div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <ProfileAvatar initials={profile.initials} size={80}/>
        <div>
          <p className="font-semibold">{profile.name}</p>
          <p className="mb-2 text-sm text-slate-600">{profile.profession}</p>
          <ProfilePhotoEditor/>
        </div>
      </div>

      <div
        className="
          mt-7
          grid
          grid-cols-1
          gap-4
          md:grid-cols-2
        "
      >
        <Input
          label="Nome completo"
          value={profile.name}
          onChange={(event) =>
            updateField(
              "name",
              event.target.value,
            )
          }
          icon={<UserRound size={16} />}
        />

        <Input
          label="E-mail"
          type="email"
          value={profile.email}
          onChange={(event) =>
            updateField(
              "email",
              event.target.value,
            )
          }
          icon={<Mail size={16} />}
        />

        <Input
          label="Profissão"
          value={profile.profession}
          onChange={(event) =>
            updateField(
              "profession",
              event.target.value,
            )
          }
        />

        <Input
          label="Registro profissional"
          value={
            profile.professionalRegistration
          }
          onChange={(event) =>
            updateField(
              "professionalRegistration",
              event.target.value,
            )
          }
        />

        <Input
          label="Telefone"
          value={profile.phone}
          onChange={(event) =>
            updateField(
              "phone",
              event.target.value,
            )
          }
          icon={<Phone size={16} />}
        />
      </div>

      <div
        className="
          mt-7
          flex
          justify-end
          border-t
          border-slate-100
          pt-5
        "
      >
        <Button
          type="button"
          onClick={()=>setSaved(true)}
          className="w-full sm:w-auto"
        >
          Salvar alterações demonstrativas
        </Button>
      </div>
    </section>
  )
}