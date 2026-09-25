"use client"

import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Play,
} from "lucide-react"

import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/button"

import type { Course } from "@/types/curso"

type Props = {
  course: Course | null
  open: boolean
  onClose: () => void
}

export default function CourseDetailsModal({
  course,
  open,
  onClose,
}: Props) {
  if (!course) {
    return null
  }

  const completed =
    course.status === "COMPLETED"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course.title}
      description="Capacitação profissional"
      maxWidth="lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Fechar
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
          >
            {completed ? (
              <>
                <CheckCircle2 size={16} />
                Revisar curso
              </>
            ) : (
              <>
                <Play size={16} />
                {course.progress > 0
                  ? "Continuar curso"
                  : "Iniciar curso"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div
          className="
            flex
            min-h-[190px]
            items-center
            justify-center
            rounded-xl
            bg-slate-900
            p-6
            text-center
          "
        >
          <div>
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-white/10
                text-white
              "
            >
              <Play
                size={23}
                className="ml-1"
              />
            </div>

            <p className="mt-3 text-sm font-medium text-white">
              Conteúdo do curso
            </p>

            <p className="mt-1 text-xs text-slate-400">
              O player será conectado na camada de dados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Clock3
              size={17}
              className="text-pink-500"
            />

            <p className="mt-2 text-xs text-slate-400">
              Duração
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              {course.durationMinutes} minutos
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <BookOpen
              size={17}
              className="text-pink-500"
            />

            <p className="mt-2 text-xs text-slate-400">
              Conteúdo
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              {course.lessons} aulas
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">
              Seu progresso
            </span>

            <span className="font-semibold text-pink-600">
              {course.progress}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-pink-500 transition-[width] duration-700"
              style={{
                width: `${course.progress}%`,
              }}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Sobre este curso
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {course.description}
          </p>
        </div>
      </div>
    </Modal>
  )
}