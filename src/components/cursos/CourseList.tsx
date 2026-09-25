"use client"

import {
  Search,
} from "lucide-react"

import {
  useMemo,
  useState,
} from "react"

import CourseCard from "./CourseCard"
import CourseDetailsModal from "./CourseDetailsModal"

import type {
  Course,
  CourseStatus,
} from "@/types/curso"

type Props = {
  courses: Course[]
}

type StatusFilter =
  | "ALL"
  | CourseStatus

export default function CourseList({
  courses,
}: Props) {
  const [search, setSearch] =
    useState("")

  const [status, setStatus] =
    useState<StatusFilter>("ALL")

  const [
    selectedCourse,
    setSelectedCourse,
  ] = useState<Course | null>(null)

  const filteredCourses =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase()

      return courses.filter(
        (course) => {
          const matchesSearch =
            !query ||
            course.title
              .toLowerCase()
              .includes(query) ||
            course.description
              .toLowerCase()
              .includes(query)

          const matchesStatus =
            status === "ALL" ||
            course.status === status

          return (
            matchesSearch &&
            matchesStatus
          )
        },
      )
    }, [courses, search, status])

  return (
    <>
      <div
        className="
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-[minmax(0,1fr)_190px]
        "
      >
        <div className="relative">
          <Search
            size={17}
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Buscar curso..."
            className="
              h-11
              w-full
              rounded-lg
              border
              border-slate-200
              bg-white
              pl-10
              pr-3
              text-sm
              text-slate-700
              shadow-sm
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-pink-300
              focus:ring-2
              focus:ring-pink-100
            "
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as StatusFilter,
            )
          }
          className="
            h-11
            rounded-lg
            border
            border-slate-200
            bg-white
            px-3
            text-sm
            text-slate-600
            shadow-sm
            outline-none
            transition
            focus:border-pink-300
            focus:ring-2
            focus:ring-pink-100
          "
        >
          <option value="ALL">
            Todos
          </option>

          <option value="IN_PROGRESS">
            Em andamento
          </option>

          <option value="NOT_STARTED">
            Não iniciados
          </option>

          <option value="COMPLETED">
            Concluídos
          </option>
        </select>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {filteredCourses.length}{" "}
          {filteredCourses.length === 1
            ? "curso encontrado"
            : "cursos encontrados"}
        </p>
      </div>

      {filteredCourses.length > 0 ? (
        <div
          className="
            mt-3
            grid
            grid-cols-1
            gap-4
            md:grid-cols-2
            xl:grid-cols-3
          "
        >
          {filteredCourses.map(
            (course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpen={
                  setSelectedCourse
                }
              />
            ),
          )}
        </div>
      ) : (
        <div
          className="
            mt-5
            flex
            min-h-64
            items-center
            justify-center
            rounded-xl
            border
            border-dashed
            border-slate-200
            bg-white
            p-6
            text-center
          "
        >
          <div>
            <Search
              size={28}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Nenhum curso encontrado
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Altere a busca ou o filtro.
            </p>
          </div>
        </div>
      )}

      <CourseDetailsModal
        course={selectedCourse}
        open={selectedCourse !== null}
        onClose={() =>
          setSelectedCourse(null)
        }
      />
    </>
  )
}