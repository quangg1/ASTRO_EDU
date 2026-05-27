'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { fetchCohortSyllabus, type SyllabusLesson } from '@/features/courses/api/cohortApi'
import { ModuleMaterialsList } from '@/features/courses/cohort/ModuleMaterialsList'
import { Button } from '@/design-system'

function formatSchedule(iso?: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function lessonHref(courseSlug: string, cohortId: string, lesson: SyllabusLesson) {
  if (lesson.type === 'quiz') {
    return `/courses/${courseSlug}/cohort/${cohortId}/exam/${lesson.slug}`
  }
  if (lesson.type === 'assignment') {
    return `/courses/${courseSlug}/cohort/${cohortId}/assignment/${lesson.slug}`
  }
  if (lesson.type === 'live_session') {
    return null
  }
  return `/courses/${courseSlug}/learn/${lesson.slug}`
}

function typeLabel(type: string) {
  switch (type) {
    case 'quiz':
      return 'Kiểm tra'
    case 'assignment':
      return 'Bài tập'
    case 'live_session':
      return 'Học online'
    default:
      return 'Bài học'
  }
}

export function CohortHub({ courseSlug, cohortId }: { courseSlug: string; cohortId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCohortSyllabus>>['data'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadedKeyRef = useRef('')

  useEffect(() => {
    const key = `${courseSlug}:${cohortId}`
    if (loadedKeyRef.current === key) return
    loadedKeyRef.current = key
    setError(null)
    void fetchCohortSyllabus(courseSlug, cohortId).then((res) => {
      if (res.success) {
        setData(res.data)
        setError(null)
      } else setError(res.error || 'Không tải được lớp học')
    })
  }, [courseSlug, cohortId])

  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto space-y-4">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-ds-muted">
          Chưa vào được lớp này. Đăng ký trên trang khóa học — mã lớp chỉ gửi qua email, không nhập trên web.
        </p>
        <Link href={`/courses/${courseSlug}`}>
          <Button type="button" variant="secondary">
            Chọn lớp / đăng ký
          </Button>
        </Link>
      </div>
    )
  }

  if (!data) return <p className="p-8 text-ds-muted">Đang tải…</p>

  const { cohort, course, modules, lessons } = data
  const byModule = new Map<string | null, SyllabusLesson[]>()
  for (const l of lessons) {
    const key = l.moduleId ?? null
    if (!byModule.has(key)) byModule.set(key, [])
    byModule.get(key)!.push(l)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <Link href={`/courses/${course.slug}`} className="text-xs text-ds-accent">← {course.title}</Link>
        <h1 className="text-2xl font-semibold text-white mt-2">{cohort.title}</h1>
        <p className="text-sm text-ds-muted mt-1">Lớp học theo kỳ · {cohort.timezone}</p>
      </div>

      {modules.map((mod: any) => {
        const modLessons = byModule.get(mod._id ?? null) ?? []
        if (modLessons.length === 0) return null
        return (
          <section key={mod._id} className="rounded-2xl border border-ds-border bg-ds-overlay overflow-hidden">
            <div className="px-4 py-3 border-b border-ds-border bg-white/5">
              <h2 className="text-sm font-semibold text-white">
                {mod.icon ? `${mod.icon} ` : ''}{mod.title}
              </h2>
              <ModuleMaterialsList materials={mod.materials} timeZone={cohort.timezone} />
            </div>
            <ul className="divide-y divide-ds-border">
              {modLessons.map((lesson) => {
                const href = lessonHref(courseSlug, cohortId, lesson)
                const open = lesson.access === 'open'
                const meta = [
                  lesson.schedule.openAt && `Mở: ${formatSchedule(lesson.schedule.openAt)}`,
                  lesson.schedule.dueAt && `Hạn: ${formatSchedule(lesson.schedule.dueAt)}`,
                  lesson.schedule.closeAt && `Đóng: ${formatSchedule(lesson.schedule.closeAt)}`,
                ].filter(Boolean)
                return (
                  <li key={lesson.slug} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-ds-accent font-medium">
                          {typeLabel(lesson.type)}
                        </span>
                        {href && open ? (
                          <Link href={href} className="block text-white font-medium hover:text-ds-accent mt-0.5">
                            {lesson.title}
                          </Link>
                        ) : (
                          <p className="text-white font-medium mt-0.5">{lesson.title}</p>
                        )}
                        {meta.length > 0 && (
                          <p className="text-[11px] text-ds-subtle mt-1">{meta.join(' · ')}</p>
                        )}
                        {lesson.type === 'live_session' && lesson.meetingUrl && open && (
                          <a
                            href={lesson.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-ds-accent mt-1 inline-block"
                          >
                            Vào phòng học →
                          </a>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                          open
                            ? 'border-emerald-500/40 text-emerald-300'
                            : lesson.access === 'closed'
                              ? 'border-red-500/30 text-red-300'
                              : 'border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {open ? 'Mở' : lesson.access === 'closed' ? 'Đã đóng' : 'Chưa mở'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
