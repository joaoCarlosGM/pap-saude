import CourseList from "@/components/cursos/CourseList"

import { mockCursos } from "@/lib/mock-cursos"

export default function CursosPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Cursos
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Capacitação e educação continuada
        </p>
      </header>

      <CourseList
        courses={mockCursos}
      />
    </div>
  )
}