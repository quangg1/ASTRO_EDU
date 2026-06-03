'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { Megaphone, CalendarClock, TrendingUp, Pin } from 'lucide-react'
import type { CohortHomeData } from '@/features/courses/api/cohortApi'
import { formatSchedule, lessonHref, upcomingKindLabel } from '@/features/courses/cohort/cohortLessonUtils'

export function CohortHomePanel({
  courseSlug,
  cohortId,
  data,
}: {
  courseSlug: string
  cohortId: string
  data: CohortHomeData
}) {
  const { announcements, upcoming, progress } = data
  const completed = new Set(data.completedLessonSlugs || [])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ds-border/80 bg-gradient-to-br from-violet-950/40 via-ds-overlay to-ds-overlay overflow-hidden">
        <div className="px-4 py-3 border-b border-ds-border flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-ds-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-white">Thông báo lớp</h2>
        </div>
        <div className="p-4 space-y-3">
          {announcements.length === 0 ? (
            <p className="text-sm text-ds-muted">Chưa có thông báo — giáo viên sẽ cập nhật tại đây.</p>
          ) : (
            announcements.slice(0, 6).map((a) => (
              <article
                key={a.id}
                className={`rounded-xl border px-4 py-3 ${
                  a.pinned
                    ? 'border-amber-500/35 bg-amber-950/15'
                    : 'border-ds-border/60 bg-ds-surface/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {a.pinned && <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                    {a.createdAt && (
                      <p className="text-[10px] text-ds-subtle mt-0.5">
                        {new Date(a.createdAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                    {a.body && (
                      <div className="prose prose-invert prose-sm max-w-none mt-2 text-ds-muted [&_p]:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.body}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-ds-border/80 bg-ds-overlay/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-cyan-400" aria-hidden />
            <h2 className="text-sm font-semibold text-white">Sắp tới</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-ds-muted">Không có mốc lịch trong thời gian tới.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((u) => {
                const lesson = data.lessons.find((l) => l.slug === u.lessonSlug)
                const href = lesson ? lessonHref(courseSlug, cohortId, lesson) : null
                return (
                  <li key={`${u.kind}-${u.lessonSlug}-${u.at}`} className="text-xs">
                    <span className="text-ds-accent/90 font-medium">{upcomingKindLabel(u.kind)}</span>
                    <span className="text-ds-subtle"> · {formatSchedule(u.at)}</span>
                    {href ? (
                      <Link href={href} className="block text-white mt-0.5 hover:text-ds-text truncate">
                        {u.lessonTitle}
                      </Link>
                    ) : (
                      <p className="text-white/90 mt-0.5 truncate">{u.lessonTitle}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-ds-border/80 bg-ds-overlay/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden />
            <h2 className="text-sm font-semibold text-white">Tiến độ của tôi</h2>
          </div>
          <p className="text-2xl font-semibold text-white tabular-nums">
            {progress.completedLessons}
            <span className="text-ds-subtle text-base font-normal"> / {progress.totalLessons} bài</span>
          </p>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
              style={{ width: `${Math.min(100, progress.percent)}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1 text-[11px] text-ds-muted">
            <li>
              Bài tập: {progress.pendingAssignments > 0 ? `${progress.pendingAssignments} chờ chấm` : 'không chờ chấm'}
              {progress.gradedAssignments > 0 ? ` · ${progress.gradedAssignments} đã chấm` : ''}
            </li>
            {progress.avgQuizScore != null && <li>Điểm TB kiểm tra: {progress.avgQuizScore}</li>}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-ds-border/60 bg-ds-surface/50 p-4">
        <h2 className="text-xs uppercase tracking-wider text-ds-subtle mb-2">Tóm tắt chương trình</h2>
        <p className="text-sm text-ds-muted">
          {completed.size} bài đã hoàn thành · xem chi tiết trong tab <strong className="text-white/80">Chương trình</strong>
        </p>
      </section>
    </div>
  )
}
