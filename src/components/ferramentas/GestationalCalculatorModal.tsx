"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/button"

type GestationalCalculatorModalProps = {
  open: boolean
  onClose: () => void
}

function addDays(
  date: Date,
  days: number,
) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)

  return result
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(
    "pt-BR",
  ).format(date)
}

function getTrimester(weeks: number) {
  if (weeks <= 13) {
    return "1º Trimestre"
  }

  if (weeks <= 27) {
    return "2º Trimestre"
  }

  return "3º Trimestre"
}

export default function GestationalCalculatorModal({
  open,
  onClose,
}: GestationalCalculatorModalProps) {
  const [dum, setDum] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }

    const today = new Date()

    const yyyy =
      today.getFullYear()

    const mm = String(
      today.getMonth() + 1,
    ).padStart(2, "0")

    const dd = String(
      today.getDate(),
    ).padStart(2, "0")

    setDum(`${yyyy}-${mm}-${dd}`)
  }, [open])

  const calculation = useMemo(() => {
    if (!dum) {
      return null
    }

    const dumDate =
      startOfDay(
        new Date(`${dum}T12:00:00`),
      )

    const today =
      startOfDay(new Date())

    const difference =
      today.getTime() -
      dumDate.getTime()

    const totalDays =
      Math.max(
        0,
        Math.floor(
          difference /
            (1000 * 60 * 60 * 24),
        ),
      )

    const weeks =
      Math.floor(totalDays / 7)

    const days =
      totalDays % 7

    const estimatedDelivery =
      addDays(dumDate, 280)

    return {
      weeks,
      days,
      trimester:
        getTrimester(weeks),
      dpp: estimatedDelivery,
    }
  }, [dum])

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
            max={
              new Date()
                .toISOString()
                .split("T")[0]
            }
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