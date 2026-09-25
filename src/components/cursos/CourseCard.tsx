"use client"

import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Play,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import type {
  Course,
  CourseCategory,
} from "@/types/curso"

type Props = {
  course: Course
  onOpen: (course: Course) => void
}

const categoryConfig: Record<
  CourseCategory,
  {
    label: string
    badge: string
    icon: string
  }
> = {
  URGENCIA: {
    label: "Urgência",
    badge:
      "bg-rose-50 text-rose-600 border-rose-100",
    icon: "bg-rose-50 text-rose-500",
  },

  PRE_NATAL: {
    label: "Pré-natal",
    badge:
      "bg-pink-50 text-pink-600 border-pink-100",
    icon: "bg-pink-50 text-pink-500",
  },

  SEGURANCA: {
    label: "Segurança",
    badge:
      "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: "bg-emerald-50 text-emerald-500",
  },

  PROTOCOLOS: {
    label: "Protocolos",
    badge:
      "bg-violet-50 text-violet-600 border-violet-100",
    icon: "bg-violet-50 text-violet-500",
  },
}

export default function CourseCard({
  course,
  onOpen,
}: Props) {
  const category =
    categoryConfig[course.category]

  const completed =
    course.status === "COMPLETED"

  const started =
    course.status === "IN_PROGRESS"

  return (
    <article
      className="
        flex
        min-h-[285px]
        flex-col
        rounded-xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition
        duration-200
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-md
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${category.icon}
          `}
        >
          <BookOpen size={20} />
        </div>

        <span
          className={`
            rounded-full
            border
            px-2.5
            py-1
            text-[11px]
            font-semibold
            ${category.badge}
          `}
        >
          {category.label}
        </span>
      </div>

      <div className="mt-4 flex-1">
        <h2 className="text-base font-semibold text-slate-900">
          {course.title}
        </h2>

        <p className="mt-2 text-sm leading-5 text-slate-500">
          {course.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} />

            {course.durationMinutes} min
          </span>

          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={14} />

            {course.lessons} aulas
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Progresso
          </span>

          <span className="font-semibold text-slate-700">
            {course.progress}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="
              h-full
              rounded-full
              bg-pink-500
              transition-[width]
              duration-700
              ease-out
            "
            style={{
              width: `${course.progress}%`,
            }}
          />
        </div>

        <Button
          type="button"
          variant={
            completed
              ? "outline"
              : "default"
          }
          size="sm"
          onClick={() => onOpen(course)}
          className="mt-4 w-full"
        >
          {completed ? (
            <>
              <CheckCircle2 size={15} />
              Revisar curso
            </>
          ) : started ? (
            <>
              <Play size={15} />
              Continuar
            </>
          ) : (
            <>
              <Play size={15} />
              Iniciar curso
            </>
          )}
        </Button>
      </div>
    </article>
  )
}