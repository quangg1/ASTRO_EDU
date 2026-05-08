'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchCourse, type Course, type CourseLessonOutline, type CourseModule, type Lesson } from '@/features/courses/api/coursesApi'

function isOutlineEntry(l: Lesson | CourseLessonOutline): l is CourseLessonOutline {
  return !('content' in l)
}

function groupLessons(
  courseModules: CourseModule[],
  lessons: (Lesson | CourseLessonOutline)[]
): { key: string; label: string; index: number; lessons: (Lesson | CourseLessonOutline)[] }[] {
  const sorted = [...lessons].sort((a, b) => a.order - b.order)
  if (courseModules.length === 0) {
    return Object.entries(
      sorted.reduce((acc: Record<string, (Lesson | CourseLessonOutline)[]>, l) => {
        const k = l.week != null ? `w-${l.week}` : 'none'
        if (!acc[k]) acc[k] = []
        acc[k].push(l)
        return acc
      }, {})
    )
      .sort(([a], [b]) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)))
      .map(([k, ls], i) => ({
        key: k,
        label: k === 'none' ? 'Bài học' : `Tuần ${k.replace('w-', '')}`,
        index: i,
        lessons: ls,
      }))
  }
  const map: Record<string, (Lesson | CourseLessonOutline)[]> = {}
  courseModules.forEach((m) => {
    map[m._id || m.slug] = []
  })
  map._unassigned = []
  sorted.forEach((l) => {
    const key = l.moduleId && map[l.moduleId] ? l.moduleId : '_unassigned'
    map[key].push(l)
  })
  const groups = courseModules.map((m, mi) => ({
    key: m._id || m.slug,
    label: m.title,
    index: mi,
    lessons: map[m._id || m.slug] ?? [],
  }))
  if ((map._unassigned?.length ?? 0) > 0) {
    groups.push({ key: '_unassigned', label: 'Chưa gán module', index: groups.length, lessons: map._unassigned })
  }
  return groups
}

export function CourseLandingClient({
  slug,
  initialCourse,
  enrolledFlash,
}: {
  slug: string
  initialCourse: Course
  enrolledFlash?: boolean
}) {
  const [course, setCourse] = useState(initialCourse)

  useEffect(() => setCourse(initialCourse), [initialCourse])

  useEffect(() => {
    let cancelled = false
    fetchCourse(slug).then((c) => {
      if (!cancelled && c) setCourse(c)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const isEnrolled = course.enrollment != null
  const lessons = course.lessons ?? []
  const courseModules = (course.modules ?? []).sort((a, b) => a.order - b.order)
  const groups = useMemo(() => groupLessons(courseModules, lessons), [courseModules, lessons])

  const firstLessonSlug = lessons.length ? [...lessons].sort((a, b) => a.order - b.order)[0]?.slug : null

  const learnHref = firstLessonSlug ? `/courses/${slug}/learn/${encodeURIComponent(firstLessonSlug)}` : null

  const crossHref = course.crossSellTutorialHref?.trim() || '/tutorial'

  const levelLabel =
    course.level === 'beginner'
      ? 'Cơ bản'
      : course.level === 'intermediate'
        ? 'Trung cấp'
        : course.level === 'advanced'
          ? 'Nâng cao'
          : course.level

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      {enrolledFlash && (
        <div className="pt-14 px-4">
          <div className="max-w-3xl mx-auto rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Ghi danh / thanh toán thành công. Chọn bài học bên dưới để tiếp tục.
          </div>
        </div>
      )}
      <main className={`px-4 pb-16 max-w-3xl mx-auto ${enrolledFlash ? 'pt-4' : 'pt-20'}`}>
        <Link href="/courses" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">
          ← Danh sách khóa học
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#0a0f17]/90 overflow-hidden mb-8">
          {course.thumbnail && (
            <div className="relative h-44 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={course.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f17] to-transparent" />
            </div>
          )}
          <div className="p-6 -mt-6 relative">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">{levelLabel}</span>
              {course.durationWeeks != null && <span>{course.durationWeeks} tuần</span>}
              <span>·</span>
              <span>{lessons.length} bài</span>
              {course.isPaid && (course.price ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-200/90">
                    {course.currency === 'USD' ? `$${course.price}` : `${(course.price ?? 0).toLocaleString('en-US')} ₫`}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{course.title}</h1>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{course.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              {learnHref && (
                <Link
                  href={learnHref}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 transition-colors"
                >
                  {isEnrolled ? 'Vào học' : 'Xem nội dung khóa học'}
                </Link>
              )}
              <Link
                href="/tutorial"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-white/15 text-gray-200 text-sm hover:bg-white/5 transition-colors"
              >
                Lộ trình miễn phí
              </Link>
            </div>
            {!isEnrolled && course.isPaid && (course.price ?? 0) > 0 && (
              <p className="mt-4 text-xs text-gray-500">
                Nội dung chi tiết từng bài có thể bị ẩn cho tới khi bạn mua khóa. Đăng nhập trên trang học để thanh toán và mở khóa.
              </p>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#070c14] p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-1">Chương trình (syllabus)</h2>
          <p className="text-xs text-gray-500 mb-5">Xem trước cấu trúc bài học trước khi ghi danh.</p>
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key} className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                  <p className="text-[10px] text-cyan-500/80 font-semibold uppercase tracking-wider">Module {g.index + 1}</p>
                  <p className="text-sm text-white font-medium">{g.label}</p>
                </div>
                <ul className="divide-y divide-white/5">
                  {g.lessons.map((lesson) => {
                    const ol = isOutlineEntry(lesson)
                    const meta = ol
                      ? lesson.type === 'quiz'
                        ? `${lesson.quizQuestionCount ?? 0} câu hỏi`
                        : `${lesson.sectionCount ?? 0} block`
                      : lesson.type === 'quiz'
                        ? 'Quiz'
                        : lesson.type === 'visualization'
                          ? '3D'
                          : lesson.videoUrl
                            ? 'Video'
                            : 'Đọc'
                    return (
                      <li key={lesson.slug} className="px-4 py-3 flex items-start gap-3">
                        <span className="text-[10px] text-gray-600 w-6 shrink-0 pt-0.5">{lesson.order + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-200">{lesson.title}</p>
                          {lesson.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{lesson.description}</p>}
                          <p className="text-[10px] text-gray-600 mt-1">{meta}</p>
                        </div>
                        {learnHref && (
                          <Link
                            href={`/courses/${slug}/learn/${encodeURIComponent(lesson.slug)}`}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 shrink-0"
                          >
                            Mở →
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-6">
          <h2 className="text-sm font-semibold text-cyan-200 mb-2">{course.crossSellTutorialLabelVi || 'Học thêm miễn phí · Lộ trình'}</h2>
          {course.crossSellTutorialBodyVi && <p className="text-sm text-gray-400 mb-4 leading-relaxed">{course.crossSellTutorialBodyVi}</p>}
          <Link
            href={crossHref}
            className="inline-flex px-4 py-2 rounded-lg bg-white/10 text-sm text-white hover:bg-cyan-600/40 border border-white/10 transition-colors"
          >
            Mở lộ trình →
          </Link>
        </section>
      </main>
    </div>
  )
}
