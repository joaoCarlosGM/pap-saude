"use client"

import {
  Camera,
  Mail,
  Phone,
  UserRound,
} from "lucide-react"

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
      <p className="mt-2 text-xs text-slate-500">Metadados fictícios, sem vínculo oficial, CNES ou IAM. A sidebar é atualizada imediatamente.</p>
      <div
        className="
          mt-6
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-center
        "
      >
        <div className="relative w-fit">
          <div
            className="
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-full
              bg-pink-100
              text-xl
              font-semibold
              text-pink-600
            "
          >
            {profile.initials}
          </div>

          <button
            type="button" disabled title="Avatar demonstrativo"
            className="
              absolute
              bottom-0
              right-0
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              border-2
              border-white
              bg-pink-500
              text-white
              shadow-sm
              transition
              hover:bg-pink-600
            "
            aria-label="Alterar foto"
          >
            <Camera size={14} />
          </button>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {profile.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {profile.profession}
          </p>

          <Button
            type="button" disabled title="Avatar demonstrativo"
            variant="ghost"
            size="sm"
            className="mt-2 px-0 text-pink-600"
          >
            Alterar foto
          </Button>
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