'use client'

import Link from 'next/link'
import type { CohortHomeData } from '@/features/courses/api/cohortApi'
import { ModuleMaterialsList } from '@/features/courses/cohort/ModuleMaterialsList'
import {
  formatSchedule,
  isAssessmentLesson,
  isLearningLesson,
  lessonHref,
  typeLabel,
} from '@/features/courses/cohort/cohortLessonUtils'
import type { SyllabusLesson } from '@/features/courses/api/cohortApi'

function LessonRow({
  courseSlug,
  cohortId,
  lesson,
  done,
}: {
  courseSlug: string
  cohortId: string
  lesson: SyllabusLesson
  done: boolean
}) {
  const href = lessonHref(courseSlug, cohortId, lesson)
  const open = lesson.access === 'open'
  const meta = [
    lesson.schedule.openAt && `Mở: ${formatSchedule(lesson.schedule.openAt)}`,
    lesson.schedule.dueAt && `Hạn: ${formatSchedule(lesson.schedule.dueAt)}`,
    lesson.schedule.closeAt && `Đóng: ${formatSchedule(lesson.schedule.closeAt)}`,
  ].filter(Boolean)

  return (
    <li className="px-4 py-3 hover:bg-ds-surface/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400/90 font-medium">
            {typeLabel(lesson.type)}
          </span>
          {href && open ? (
            <Link
              href={href}
              className="block text-white font-medium hover:text-ds-text mt-0.5 truncate"
            >
              {done ? '✓ ' : ''}
              {lesson.title}
            </Link>
          ) : (
            <p className="text-white/90 font-medium mt-0.5">{lesson.title}</p>
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
          className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-medium ${
            open
              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
              : lesson.access === 'closed'
                ? 'border-red-500/30 text-red-300 bg-red-950/20'
                : 'border-amber-500/30 text-amber-200 bg-amber-950/20'
          }`}
        >
          {open ? 'Mở' : lesson.access === 'closed' ? 'Đã đóng' : 'Chưa mở'}
        </span>
      </div>
    </li>
  )
}

export function CohortSyllabusPanel({
  courseSlug,
  cohortId,
  data,
  completedSlugs = [],
}: {
  courseSlug: string
  cohortId: string
  data: Pick<CohortHomeData, 'cohort' | 'modules' | 'lessons'>
  completedSlugs?: string[]
}) {
  const completed = new Set(completedSlugs)
  const { cohort, modules, lessons } = data
  const byModule = new Map<string | null, SyllabusLesson[]>()
  for (const l of lessons) {
    const key = l.moduleId ?? null
    if (!byModule.has(key)) byModule.set(key, [])
    byModule.get(key)!.push(l)
  }

  return (
    <div className="space-y-5">
      {modules.map((mod) => {
        const modLessons = byModule.get(mod._id ?? null) ?? []
        if (modLessons.length === 0) return null
        const learning = modLessons.filter((l) => isLearningLesson(l.type))
        const assessment = modLessons.filter((l) => isAssessmentLesson(l.type))
        return (
          <section
            key={String(mod._id)}
            className="rounded-2xl border border-ds-border/80 bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden shadow-lg shadow-black/20"
          >
            <div className="px-4 py-3 border-b border-ds-border/60 bg-white/[0.03]">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {mod.icon ? `${mod.icon} ` : ''}
                {mod.title}
              </h2>
              <ModuleMaterialsList materials={mod.materials} timeZone={cohort.timezone} />
            </div>
            {learning.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-ds-subtle font-medium">
                  Học
                </p>
                <ul className="divide-y divide-ds-border/50">
                  {learning.map((lesson) => (
                    <LessonRow
                      key={lesson.slug}
                      courseSlug={courseSlug}
                      cohortId={cohortId}
                      lesson={lesson}
                      done={completed.has(lesson.slug)}
                    />
                  ))}
                </ul>
              </div>
            )}
            {assessment.length > 0 && (
              <div className={learning.length > 0 ? 'border-t border-ds-border/40' : ''}>
                <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-amber-400/80 font-medium">
                  Đánh giá
                </p>
                <ul className="divide-y divide-ds-border/50">
                  {assessment.map((lesson) => (
                    <LessonRow
                      key={lesson.slug}
                      courseSlug={courseSlug}
                      cohortId={cohortId}
                      lesson={lesson}
                      done={completed.has(lesson.slug)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
