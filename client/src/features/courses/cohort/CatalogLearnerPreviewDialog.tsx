'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Dialog, DialogFooter } from '@/design-system'
import { Button } from '@/design-system'
import type { ScheduleLessonRow } from '@/features/courses/api/cohortApi'
import { LessonTypeIcon, lessonTypeIconKey } from '@/features/courses/cohort/LessonTypeIcon'
import { visibilityIssueLabel, visibilityIssueShort } from '@/features/courses/cohort/lessonVisibilityLabels'

function groupByChapter(rows: ScheduleLessonRow[]) {
  const map = new Map<string, { title: string; lessons: ScheduleLessonRow[] }>()
  for (const row of rows) {
    const key = row.moduleId || '__none__'
    const title = row.moduleTitle || (key === '__none__' ? 'Chưa gán chương' : 'Chương')
    if (!map.has(key)) map.set(key, { title, lessons: [] })
    map.get(key)!.lessons.push(row)
  }
  for (const g of map.values()) {
    g.lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  return [...map.values()]
}

export function CatalogLearnerPreviewDialog({
  open,
  onClose,
  courseSlug,
  coursePublished,
  catalogEnabled,
  rows,
}: {
  open: boolean
  onClose: () => void
  courseSlug: string
  coursePublished: boolean
  catalogEnabled: boolean
  rows: ScheduleLessonRow[]
}) {
  const chapters = useMemo(() => groupByChapter(rows), [rows])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Xem trước — học viên Catalog (tự học)"
      description="Không áp dụng lịch lớp. Học viên tự học mở bài theo thứ tự khóa khi đã ghi danh và khóa đã xuất bản."
      size="lg"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {!catalogEnabled && (
          <p className="text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-2">
            Khóa này tắt catalog — học viên chỉ vào qua lớp, không có luồng tự học.
          </p>
        )}
        {!coursePublished && (
          <p className="text-sm rounded-lg border border-red-500/40 bg-red-500/10 text-red-100 px-3 py-2">
            Khóa đang <strong>bản nháp</strong>. Trên production, catalog sẽ không hiển thị cho học viên cho đến khi bạn
            xuất bản trong Studio.
          </p>
        )}

        <div className="space-y-4">
          {chapters.map((ch) => (
            <div key={ch.title} className="rounded-xl border border-ds-border/80 overflow-hidden">
              <p className="text-[10px] uppercase tracking-wider text-ds-subtle px-3 py-2 bg-ds-surface/50 border-b border-ds-border/50">
                {ch.title}
              </p>
              <ul className="divide-y divide-ds-border/40">
                {ch.lessons.map((lesson) => {
                  const issues = lesson.visibilityIssues || []
                  const catalogOpen = coursePublished && catalogEnabled && issues.length === 0
                  return (
                    <li key={lesson.slug} className="px-3 py-2 flex items-center gap-2.5">
                      <LessonTypeIcon type={lessonTypeIconKey(lesson)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{lesson.title}</p>
                        {issues.length > 0 && (
                          <p className="text-[11px] text-amber-200/90 mt-0.5">{visibilityIssueLabel(issues[0])}</p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] shrink-0 px-2 py-0.5 rounded border ${
                          catalogOpen
                            ? 'border-emerald-500/40 text-emerald-200 bg-emerald-950/30'
                            : 'border-amber-500/40 text-amber-200 bg-amber-950/20'
                        }`}
                      >
                        {catalogOpen ? 'Mở' : issues[0] ? visibilityIssueShort(issues[0]) : '—'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-ds-muted">
          So sánh: trong <strong>lớp</strong>, cùng bài này chỉ mở theo cột &quot;Mở&quot; trên timeline (và có thể đóng
          quiz theo hạn).
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Đóng
        </Button>
        <Link
          href={`/courses/${courseSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm hover:opacity-90"
        >
          Mở trang khóa (tab mới) →
        </Link>
      </DialogFooter>
    </Dialog>
  )
}
