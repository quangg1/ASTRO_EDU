'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Layers } from 'lucide-react'
import type { ScheduleLessonRow } from '@/features/courses/api/cohortApi'
import { CohortWeekBulkEditDialog } from '@/features/courses/cohort/CohortWeekBulkEditDialog'
import { LessonTypeIcon, lessonTypeIconKey } from '@/features/courses/cohort/LessonTypeIcon'
import { visibilityIssueLabel, visibilityIssueShort } from '@/features/courses/cohort/lessonVisibilityLabels'

function formatShort(iso: string | Date | null | undefined, tz: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      timeZone: tz,
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function deliveryWeekOf(row: ScheduleLessonRow) {
  const w = row.deliveryWeek ?? row.week
  return w != null && w > 0 ? w : 0
}

function groupByWeek(rows: ScheduleLessonRow[]) {
  const map = new Map<number, ScheduleLessonRow[]>()
  for (const row of rows) {
    const w = deliveryWeekOf(row)
    if (!map.has(w)) map.set(w, [])
    map.get(w)!.push(row)
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === 0) return 1
    if (b === 0) return -1
    return a - b
  })
  return keys.map((week) => ({ week, lessons: map.get(week)! }))
}

function defaultExpandedState(groups: { week: number }[]) {
  const many = groups.length > 4
  return Object.fromEntries(
    groups.map((g, i) => [g.week, many ? i < 2 : true]),
  )
}

export function CohortScheduleTimeline({
  rows,
  timezone,
  coursePublished,
  scheduleLocalValue,
  onPatchLocal,
  onBulkWeekPatch,
}: {
  rows: ScheduleLessonRow[]
  timezone: string
  coursePublished: boolean
  scheduleLocalValue: (v: string | Date | null | undefined) => string
  onPatchLocal: (slug: string, field: 'openAt' | 'dueAt' | 'closeAt', local: string) => void
  onBulkWeekPatch: (
    slugs: string[],
    patch: {
      openAtLocal: string
      dueAtLocal: string
      closeAtLocal: string
      applyDue: boolean
      applyClose: boolean
    },
  ) => void
}) {
  const groups = useMemo(() => groupByWeek(rows), [rows])
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => defaultExpandedState(groups))
  const [showTable, setShowTable] = useState(false)
  const [bulkWeek, setBulkWeek] = useState<{ week: number; lessons: ScheduleLessonRow[] } | null>(null)

  useEffect(() => {
    setExpanded(defaultExpandedState(groups))
  }, [groups.length])

  const warningCount = useMemo(
    () => rows.filter((r) => r.scheduleWarning && r.schedule.openAt).length,
    [rows],
  )

  const toggleWeek = (week: number) => {
    setExpanded((p) => ({ ...p, [week]: !p[week] }))
  }

  const expandAll = () => {
    setExpanded(Object.fromEntries(groups.map((g) => [g.week, true])))
  }

  const collapseAll = () => {
    setExpanded(Object.fromEntries(groups.map((g) => [g.week, false])))
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ds-muted">Chưa có bài trong khóa.</p>
  }

  const bulkLessons = bulkWeek?.lessons ?? []

  return (
    <div className="space-y-4">
      {!coursePublished && warningCount > 0 && (
        <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <p>
            <strong>{warningCount}</strong> bài đã đặt lịch mở nhưng khóa học vẫn ở <strong>bản nháp</strong> trong
            Studio. Đến giờ học viên có thể không thấy nội dung — hãy xuất bản khóa trước khi mở lớp.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <button type="button" onClick={expandAll} className="text-ds-accent hover:underline">
          Mở rộng tất cả tuần
        </button>
        <span className="text-ds-subtle">·</span>
        <button type="button" onClick={collapseAll} className="text-ds-accent hover:underline">
          Thu gọn tất cả
        </button>
        {groups.length > 4 && (
          <span className="text-ds-subtle ml-1">({groups.length} nhóm — mặc định mở 2 tuần đầu)</span>
        )}
      </div>

      <div className="space-y-3">
        {groups.map(({ week, lessons }) => {
          const open = expanded[week] !== false
          const firstOpen = lessons.find((l) => l.schedule.openAt)?.schedule.openAt
          const weekWarnings = lessons.filter((l) => l.scheduleWarning && l.schedule.openAt).length
          const weekLabel = week === 0 ? 'Chưa gán tuần (Studio)' : `Tuần ${week}`
          return (
            <section
              key={week}
              className="rounded-2xl border border-ds-border/80 overflow-hidden bg-gradient-to-r from-white/[0.02] to-transparent"
            >
              <div className="flex items-stretch bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => toggleWeek(week)}
                  className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors text-left min-w-0"
                >
                  {open ? (
                    <ChevronDown className="w-4 h-4 text-ds-accent shrink-0" aria-hidden />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-ds-subtle shrink-0" aria-hidden />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{weekLabel}</p>
                    <p className="text-[10px] text-ds-subtle mt-0.5">
                      {lessons.length} bài
                      {firstOpen ? ` · mở sớm nhất ${formatShort(firstOpen, timezone)}` : ''}
                      {weekWarnings > 0 ? ` · ${weekWarnings} cảnh báo` : ''}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  title="Sửa nhanh hàng loạt tuần này"
                  onClick={() => setBulkWeek({ week, lessons })}
                  className="shrink-0 px-3 border-l border-ds-border/50 text-[10px] uppercase tracking-wide text-cyan-300/90 hover:bg-cyan-950/30 flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" aria-hidden />
                  Sửa nhanh
                </button>
              </div>
              {open && (
                <ul className="divide-y divide-ds-border/40">
                  {lessons.map((lesson) => {
                    const slug = lesson.slug
                    const warn = lesson.scheduleWarning && lesson.schedule.openAt
                    return (
                      <li key={slug} className="px-4 py-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <LessonTypeIcon type={lessonTypeIconKey(lesson)} size="sm" />
                            {lesson.moduleTitle && (
                              <span className="text-[9px] text-ds-subtle truncate max-w-[140px]">{lesson.moduleTitle}</span>
                            )}
                            {warn && (
                              <span
                                className="text-[9px] uppercase px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-200 bg-amber-950/30"
                                title={visibilityIssueLabel(lesson.scheduleWarning!)}
                              >
                                {visibilityIssueShort(lesson.scheduleWarning!)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-white mt-1 truncate">{lesson.title}</p>
                          {warn && (
                            <p className="text-[11px] text-amber-200/80 mt-1 leading-snug">
                              {visibilityIssueLabel(lesson.scheduleWarning!)}
                            </p>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 min-w-0 lg:min-w-[420px]">
                          <label className="text-[10px] text-ds-subtle">
                            Mở
                            <input
                              type="datetime-local"
                              className="studio-field mt-0.5 w-full text-[10px]"
                              value={scheduleLocalValue(lesson.schedule.openAt)}
                              onChange={(e) => onPatchLocal(slug, 'openAt', e.target.value)}
                            />
                          </label>
                          <label className="text-[10px] text-ds-subtle">
                            Hạn (BT)
                            <input
                              type="datetime-local"
                              className="studio-field mt-0.5 w-full text-[10px]"
                              value={scheduleLocalValue(lesson.schedule.dueAt)}
                              onChange={(e) => onPatchLocal(slug, 'dueAt', e.target.value)}
                              disabled={lesson.type !== 'assignment'}
                            />
                          </label>
                          <label className="text-[10px] text-ds-subtle">
                            Đóng (quiz)
                            <input
                              type="datetime-local"
                              className="studio-field mt-0.5 w-full text-[10px]"
                              value={scheduleLocalValue(lesson.schedule.closeAt)}
                              onChange={(e) => onPatchLocal(slug, 'closeAt', e.target.value)}
                              disabled={lesson.type !== 'quiz'}
                            />
                          </label>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="text-[11px] text-ds-accent hover:underline"
      >
        {showTable ? 'Ẩn bảng chi tiết' : 'Hiện bảng chi tiết (tất cả bài)'}
      </button>

      {showTable && (
        <div className="rounded-xl border border-ds-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-white/5 text-ds-subtle">
              <tr>
                <th className="text-left p-2">Tuần</th>
                <th className="text-left p-2">Bài</th>
                <th className="text-left p-2">Loại</th>
                <th className="text-left p-2">Mở (UTC→local)</th>
                <th className="text-left p-2">Hạn</th>
                <th className="text-left p-2">Đóng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slug} className="border-t border-ds-border">
                  <td className="p-2 text-ds-muted">{row.week ?? '—'}</td>
                  <td className="p-2 text-gray-200">{row.title}</td>
                  <td className="p-2 text-ds-subtle">{row.type}</td>
                  <td className="p-2 text-ds-subtle whitespace-nowrap">
                    {formatShort(row.schedule.openAt, timezone)}
                  </td>
                  <td className="p-2 text-ds-subtle whitespace-nowrap">
                    {formatShort(row.schedule.dueAt, timezone)}
                  </td>
                  <td className="p-2 text-ds-subtle whitespace-nowrap">
                    {formatShort(row.schedule.closeAt, timezone)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CohortWeekBulkEditDialog
        open={bulkWeek != null}
        onClose={() => setBulkWeek(null)}
        week={bulkWeek?.week ?? 0}
        lessons={bulkLessons}
        scheduleLocalValue={scheduleLocalValue}
        onApply={(patch) => {
          if (!bulkWeek) return
          onBulkWeekPatch(
            bulkWeek.lessons.map((l) => l.slug),
            patch,
          )
        }}
      />
    </div>
  )
}
