'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Activity, Users } from 'lucide-react'
import {
  fetchCohortAnalytics,
  type CohortAnalyticsData,
  type CohortAtRiskReason,
  type LessonCellStatus,
} from '@/features/courses/api/cohortApi'

const RISK_LABEL: Record<CohortAtRiskReason, string> = {
  inactive: 'Không hoạt động 7+ ngày',
  low_quiz: 'Điểm quiz thấp',
  behind_week: 'Chậm tuần hiện tại',
  overdue_assignment: 'Quá hạn bài tập',
}

const CELL_CLASS: Record<LessonCellStatus, string> = {
  completed: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40',
  open: 'bg-white/5 text-ds-muted border-ds-border/60',
  locked: 'bg-black/30 text-ds-subtle border-ds-border/30',
  missed: 'bg-amber-950/40 text-amber-200 border-amber-500/45',
}

function cellTitle(status: LessonCellStatus) {
  switch (status) {
    case 'completed':
      return 'Đã hoàn thành'
    case 'missed':
      return 'Đã mở, chưa học (chậm)'
    case 'locked':
      return 'Chưa mở lịch'
    default:
      return 'Đang mở'
  }
}

export function CohortStudioGradebook({
  courseSlug,
  cohortId,
}: {
  courseSlug: string
  cohortId: string
}) {
  const [data, setData] = useState<CohortAnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetchCohortAnalytics(courseSlug, cohortId)
    if (res.success && res.data) {
      setData(res.data)
      setError(null)
    } else {
      setError(res.error || 'Không tải được bảng điểm')
    }
  }, [courseSlug, cohortId])

  useEffect(() => {
    void load()
  }, [load])

  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!data) return <p className="text-sm text-ds-muted">Đang tải bảng điểm…</p>

  const { summary, students, lessonColumns = [], behavior } = data
  const cols = lessonColumns.slice(0, 24)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Học viên', value: summary.studentCount },
          { label: 'TB hoàn thành', value: `${summary.avgCompletionPct}%` },
          { label: 'Chờ chấm', value: summary.pendingSubmissions },
          { label: 'Cần chú ý', value: summary.atRiskCount, warn: summary.atRiskCount > 0 },
          {
            label: 'Tuần lịch hiện tại',
            value: summary.currentDeliveryWeek ? `T${summary.currentDeliveryWeek}` : '—',
          },
        ].map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border px-3 py-2 ${
              c.warn ? 'border-amber-500/40 bg-amber-950/20' : 'border-ds-border bg-ds-overlay'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-ds-subtle">{c.label}</p>
            <p className="text-lg font-semibold text-white tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
      {summary.avgQuizScore != null && (
        <p className="text-xs text-ds-muted">Điểm TB kiểm tra lớp: {summary.avgQuizScore}</p>
      )}

      {cols.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide">Ma trận tiến độ theo bài</h3>
          <p className="text-[11px] text-ds-muted">
            Ô vàng = bài đã mở lịch nhưng chưa hoàn thành (chậm). At-risk theo tuần giao hiện tại (T
            {summary.currentDeliveryWeek || '—'}).
          </p>
          <div className="rounded-xl border border-ds-border overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-[10px] min-w-[640px]">
              <thead className="sticky top-0 bg-[#0a0f17] z-10">
                <tr className="text-ds-subtle border-b border-ds-border">
                  <th className="text-left px-2 py-2 font-medium sticky left-0 bg-[#0a0f17] min-w-[120px]">
                    Học viên
                  </th>
                  {cols.map((col) => (
                    <th
                      key={col.slug}
                      className="px-1 py-2 font-medium max-w-[72px] truncate text-center"
                      title={col.title}
                    >
                      {col.title.length > 10 ? `${col.title.slice(0, 9)}…` : col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.userId} className={`border-b border-ds-border/40 ${s.atRisk ? 'bg-amber-950/10' : ''}`}>
                    <td className="px-2 py-1.5 text-white sticky left-0 bg-inherit min-w-[120px]">
                      <span className="flex items-center gap-1 truncate">
                        {s.atRisk && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" aria-hidden />}
                        {s.displayName}
                      </span>
                    </td>
                    {cols.map((col) => {
                      const st = s.lessonStatus?.[col.slug] || 'open'
                      return (
                        <td key={col.slug} className="px-0.5 py-1 text-center">
                          <span
                            className={`inline-block w-6 h-6 rounded border ${CELL_CLASS[st]}`}
                            title={cellTitle(st)}
                          >
                            {st === 'completed' ? '✓' : st === 'missed' ? '!' : st === 'locked' ? '·' : ''}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lessonColumns.length > 24 && (
            <p className="text-[10px] text-ds-subtle">Hiển thị 24/{lessonColumns.length} bài — cuộn ngang trên bảng.</p>
          )}
        </section>
      )}

      <div className="rounded-xl border border-ds-border overflow-hidden">
        <div className="px-3 py-2 border-b border-ds-border bg-white/5 flex items-center gap-2">
          <Users className="w-4 h-4 text-ds-accent" aria-hidden />
          <span className="text-xs font-medium text-white">Từng học viên</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ds-subtle text-left border-b border-ds-border">
                <th className="px-3 py-2 font-medium">Học viên</th>
                <th className="px-3 py-2 font-medium">Tiến độ</th>
                <th className="px-3 py-2 font-medium">Quiz TB</th>
                <th className="px-3 py-2 font-medium">Chờ chấm</th>
                <th className="px-3 py-2 font-medium">Hoạt động</th>
                <th className="px-3 py-2 font-medium">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.userId}
                  className={`border-b border-ds-border/50 ${s.atRisk ? 'bg-amber-950/10' : ''}`}
                >
                  <td className="px-3 py-2.5 text-white">{s.displayName}</td>
                  <td className="px-3 py-2.5 text-ds-muted tabular-nums">
                    {s.completedLessons}/{s.totalLessons}
                  </td>
                  <td className="px-3 py-2.5 text-ds-muted">{s.avgQuizScore ?? '—'}</td>
                  <td className="px-3 py-2.5 text-ds-muted">{s.pendingAssignments || '—'}</td>
                  <td className="px-3 py-2.5 text-ds-subtle">
                    {s.lastActiveAt
                      ? new Date(s.lastActiveAt).toLocaleDateString('vi-VN')
                      : 'Chưa có'}
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-amber-200/90">
                    {(s.atRiskReasons || []).map((r) => RISK_LABEL[r]).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <p className="p-4 text-sm text-ds-muted text-center">Chưa có học viên trong lớp.</p>
        )}
      </div>

      {behavior && (behavior.lessonEngagement.length > 0 || behavior.studentActivity.length > 0) && (
        <section className="rounded-xl border border-cyan-500/25 bg-cyan-950/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-300" aria-hidden />
            <h3 className="text-sm font-semibold text-white">
              Hành vi học ({behavior.windowDays} ngày gần nhất)
            </h3>
          </div>
          {behavior.lessonEngagement.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-ds-subtle mb-2">Bài được mở nhiều</p>
              <ul className="text-xs space-y-1 text-ds-muted">
                {behavior.lessonEngagement.slice(0, 8).map((row) => (
                  <li key={row.lessonSlug} className="flex justify-between gap-2">
                    <span className="truncate text-white/80">{row.lessonSlug}</span>
                    <span className="shrink-0 tabular-nums">
                      {row.opens} mở · {row.completions} xong · ~{row.avgDwellSec}s
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {behavior.studentActivity.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-ds-subtle border-b border-ds-border/50">
                    <th className="text-left py-1.5">Học viên</th>
                    <th className="text-right py-1.5">Sự kiện</th>
                    <th className="text-right py-1.5">Bài đã mở</th>
                    <th className="text-right py-1.5">Phút học</th>
                  </tr>
                </thead>
                <tbody>
                  {behavior.studentActivity.slice(0, 15).map((row) => (
                    <tr key={row.userId} className="border-b border-ds-border/30">
                      <td className="py-1.5 text-white">{row.displayName}</td>
                      <td className="py-1.5 text-right tabular-nums text-ds-muted">{row.eventCount}</td>
                      <td className="py-1.5 text-right tabular-nums text-ds-muted">{row.lessonsOpened}</td>
                      <td className="py-1.5 text-right tabular-nums text-ds-muted">{row.dwellMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
