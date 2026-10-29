"use client"

import {
  useMemo,
  useState,
} from "react"

import { pregnancyFrom, DEMO_DATE } from "@/features/vitrine-premium/lib/demo/validation"
import Modal from "@/features/vitrine-premium/components/ui/Modal"
import { Button } from "@/features/vitrine-premium/components/ui/button"

type GestationalCalculatorModalProps = {
  open: boolean
  onClose: () => void
}

function formatDate(date:Date){return date.toLocaleDateString('pt-BR',{timeZone:'UTC'})}
export default function GestationalCalculatorModal({
  open,
  onClose,
}: GestationalCalculatorModalProps) {
  const [dum, setDum] =
    useState("")

  const calculation=useMemo(()=>{const g=pregnancyFrom(dum);return g?{...g,dpp:new Date(g.dueDate+'T12:00:00Z')}:null},[dum])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calculadora Gestacional"
      description="Preencha a DUM para calcular automaticamente"
      maxWidth="sm"
      footer={
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Fechar
        </Button>
      }
    >
      <div className="space-y-5">
        {!calculation && <p role="status" className="text-sm text-slate-500">Informe DUM válida até 28/10/2026 (referência demonstrativa), de até 45 semanas. DUM ausente ou inválida não gera IG/DPP.</p>}
        <div>
          <label
            htmlFor="dum"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Data da Última Menstruação (DUM)
          </label>

          <input
            id="dum"
            type="date"
            value={dum}
            onChange={(event) =>
              setDum(
                event.target.value,
              )
            }
            max={DEMO_DATE}
            className="
              h-11
              w-full
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-sm
              text-slate-700
              outline-none
              transition
              focus:border-pink-300
              focus:ring-2
              focus:ring-pink-100
            "
          />
        </div>

        <section
          className="
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            p-4
            sm:p-5
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div>
              <p className="text-sm text-slate-500">
                Idade Gestacional
              </p>

              <p
                className="
                  mt-2
                  text-xl
                  font-semibold
                  text-slate-900
                  sm:text-2xl
                "
              >
                {calculation
                  ? `${calculation.weeks} semanas e ${calculation.days} dias`
                  : "—"}
              </p>
            </div>

            {calculation && (
              <span
                className="
                  w-fit
                  rounded-full
                  bg-blue-600
                  px-3
                  py-1
                  text-xs
                  font-semibold
                  text-white
                "
              >
                {
                  calculation.trimester
                }
              </span>
            )}
          </div>
        </section>

        <section
          className="
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            p-4
            sm:p-5
          "
        >
          <p className="text-sm text-slate-500">
            Data Provável do Parto (DPP)
          </p>

          <p
            className="
              mt-2
              text-lg
              font-semibold
              text-emerald-600
              sm:text-xl
            "
          >
            {calculation
              ? formatDate(
                  calculation.dpp,
                )
              : "—"}
          </p>
        </section>
      </div>
    </Modal>
  )
}