'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/design-system'
import {
  fetchCohortSchedules,
  isoToDatetimeLocalInTz,
  patchCohort,
  saveCohortSchedules,
  type CohortSummary,
  type ScheduleLessonRow,
  type ScheduleModuleRow,
} from '@/features/courses/api/cohortApi'
import { CatalogLearnerPreviewDialog } from '@/features/courses/cohort/CatalogLearnerPreviewDialog'
import { CohortModuleWeekMapPanel } from '@/features/courses/cohort/CohortModuleWeekMapPanel'
import { CohortScheduleCopyPanel } from '@/features/courses/cohort/CohortScheduleCopyPanel'
import { CohortScheduleTimeline } from '@/features/courses/cohort/CohortScheduleTimeline'
import { CohortScheduleWeeklyWizard } from '@/features/courses/cohort/CohortScheduleWeeklyWizard'

export function CohortSchedulePanel({
  courseSlug,
  lessonCount,
  selectedId,
  cohorts,
  cohortStatus,
  cohortStartLocal,
  cohortEndLocal,
  cohortTimezone,
  onCohortMetaChange,
  onMsg,
}: {
  courseSlug: string
  lessonCount: number
  selectedId: string | null
  cohorts: CohortSummary[]
  cohortStatus: string
  cohortStartLocal: string
  cohortEndLocal: string
  cohortTimezone: string
  onCohortMetaChange: (patch: {
    status?: string
    startLocal?: string
    endLocal?: string
    timezone?: string
  }) => void
  onMsg: (msg: string | null) => void
}) {
  const [scheduleRows, setScheduleRows] = useState<ScheduleLessonRow[]>([])
  const [scheduleModules, setScheduleModules] = useState<ScheduleModuleRow[]>([])
  const [moduleWeekMap, setModuleWeekMap] = useState<Record<string, number>>({})
  const [coursePublished, setCoursePublished] = useState(true)
  const [catalogEnabled, setCatalogEnabled] = useState(true)
  const [catalogPreviewOpen, setCatalogPreviewOpen] = useState(false)
  const [cohortMeta, setCohortMeta] = useState<{
    title: string
    inviteCode?: string
    timezone?: string
    startAt?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const cohortTz = cohortMeta?.timezone || cohortTimezone || 'Asia/Ho_Chi_Minh'
  const selectedCohort = cohorts.find((c) => String(c.id || c._id) === selectedId)

  const loadSchedule = async (cohortId: string) => {
    setLoading(true)
    const res = await fetchCohortSchedules(courseSlug, cohortId)
    setLoading(false)
    if (res.success && res.data) {
      setScheduleRows(res.data.lessons || [])
      setScheduleModules(res.data.modules || [])
      setModuleWeekMap(res.data.moduleWeekMap || {})
      setCohortMeta(res.data.cohort)
      setCoursePublished(res.data.coursePublished !== false)
      setCatalogEnabled(res.data.catalogEnabled !== false)
      onMsg(null)
    } else {
      onMsg(res.error || 'Không tải được lịch lớp')
    }
  }

  useEffect(() => {
    if (selectedId) void loadSchedule(selectedId)
  }, [selectedId, courseSlug])

  const scheduleLocalValue = (v: string | Date | null | undefined) => {
    if (!v) return ''
    if (typeof v === 'string' && v.length === 16 && !v.endsWith('Z')) return v
    return isoToDatetimeLocalInTz(v, cohortTz)
  }

  const onPatchLocal = (slug: string, field: 'openAt' | 'dueAt' | 'closeAt', local: string) => {
    setScheduleRows((rows) =>
      rows.map((r) => {
        if (r.slug !== slug) return r
        const schedule = { ...r.schedule, [field]: local || null }
        const scheduledOpen = Boolean(schedule.openAt)
        const issues = r.visibilityIssues || []
        const scheduleWarning =
          scheduledOpen && issues.length > 0
            ? issues.includes('course_draft')
              ? 'course_draft'
              : issues[0]
            : null
        return { ...r, schedule, scheduleWarning }
      }),
    )
  }

  const onBulkWeekPatch = (
    slugs: string[],
    patch: {
      openAtLocal: string
      dueAtLocal: string
      closeAtLocal: string
      applyDue: boolean
      applyClose: boolean
    },
  ) => {
    const slugSet = new Set(slugs)
    setScheduleRows((rows) =>
      rows.map((r) => {
        if (!slugSet.has(r.slug)) return r
        const schedule = {
          ...r.schedule,
          openAt: patch.openAtLocal || r.schedule.openAt,
        }
        if (patch.applyDue && r.type === 'assignment' && patch.dueAtLocal) {
          schedule.dueAt = patch.dueAtLocal
        }
        if (patch.applyClose && r.type === 'quiz' && patch.closeAtLocal) {
          schedule.closeAt = patch.closeAtLocal
        }
        const issues = r.visibilityIssues || []
        const scheduleWarning =
          schedule.openAt && issues.length > 0
            ? issues.includes('course_draft')
              ? 'course_draft'
              : issues[0]
            : null
        return { ...r, schedule, scheduleWarning }
      }),
    )
    onMsg(`Đã áp dụng lịch cho ${slugs.length} bài — nhớ bấm Lưu chỉnh sửa lịch`)
  }

  const handleSaveCohortMeta = async () => {
    if (!selectedId) return
    const res = await patchCohort(courseSlug, selectedId, {
      status: cohortStatus,
      timezone: cohortTimezone,
      startAt: cohortStartLocal || null,
      endAt: cohortEndLocal || null,
    })
    if (res.success) {
      onMsg('Đã lưu thông tin lớp')
      if (selectedId) void loadSchedule(selectedId)
    } else {
      onMsg(res.error || 'Lỗi lưu lớp')
    }
  }

  const handleSaveSchedules = async () => {
    if (!selectedId) return
    const toLocal = (v: string | Date | null | undefined) => {
      if (!v) return null
      if (typeof v === 'string' && v.length === 16 && !v.endsWith('Z')) return v
      return isoToDatetimeLocalInTz(v, cohortTz) || null
    }
    const schedules = scheduleRows.map((r) => ({
      lessonSlug: r.slug,
      openAtLocal: toLocal(r.schedule.openAt),
      dueAtLocal: toLocal(r.schedule.dueAt),
      closeAtLocal: toLocal(r.schedule.closeAt),
    }))
    const res = await saveCohortSchedules(courseSlug, selectedId, schedules)
    onMsg(res.success ? `Đã lưu lịch (${cohortTz})` : res.error || 'Lỗi lưu')
  }

  if (!selectedId) {
    return (
      <p className="text-ds-muted text-sm rounded-xl border border-ds-border p-4">
        Chọn lớp ở thanh trên hoặc tab <strong>Danh sách lớp</strong>.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-ds-border bg-ds-overlay p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Thông tin lớp</h2>
        {cohortMeta && (
          <p className="text-xs text-ds-muted">
            {cohortMeta.title} · Mã <span className="font-mono text-ds-accent">{cohortMeta.inviteCode}</span>
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[11px] text-ds-muted">
            Trạng thái
            <select
              value={cohortStatus}
              onChange={(e) => onCohortMetaChange({ status: e.target.value })}
              className="studio-field text-xs mt-1 w-full"
            >
              <option value="draft">Nháp</option>
              <option value="open">Mở đăng ký</option>
              <option value="closed">Đóng</option>
            </select>
          </label>
          <label className="text-[11px] text-ds-muted">
            Múi giờ
            <input
              value={cohortTimezone}
              onChange={(e) => onCohortMetaChange({ timezone: e.target.value })}
              className="studio-field text-xs mt-1 w-full"
            />
          </label>
          <label className="text-[11px] text-ds-muted">
            Bắt đầu lớp
            <input
              type="datetime-local"
              value={cohortStartLocal}
              onChange={(e) => onCohortMetaChange({ startLocal: e.target.value })}
              className="studio-field text-xs mt-1 w-full"
            />
          </label>
          <label className="text-[11px] text-ds-muted">
            Kết thúc lớp
            <input
              type="datetime-local"
              value={cohortEndLocal}
              onChange={(e) => onCohortMetaChange({ endLocal: e.target.value })}
              className="studio-field text-xs mt-1 w-full"
            />
          </label>
        </div>
        <Button type="button" onClick={() => void handleSaveCohortMeta()} variant="secondary" size="sm">
          Lưu thông tin lớp
        </Button>
      </section>

      {lessonCount === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Chưa có bài trong khóa —{' '}
          <Link href={`/studio/${courseSlug}`} className="text-ds-accent underline">
            thêm bài trong Studio
          </Link>{' '}
          và gán số <strong>Tuần</strong> cho từng bài.
        </div>
      ) : (
        <>
          <CohortScheduleWeeklyWizard
            courseSlug={courseSlug}
            cohortId={selectedId}
            timezone={cohortTz}
            cohortStartAt={cohortMeta?.startAt || selectedCohort?.startAt}
            onApplied={() => void loadSchedule(selectedId)}
          />

          <CohortScheduleCopyPanel
            courseSlug={courseSlug}
            targetCohortId={selectedId}
            cohorts={cohorts}
            onCopied={() => void loadSchedule(selectedId)}
          />

          <CohortModuleWeekMapPanel
            courseSlug={courseSlug}
            cohortId={selectedId}
            modules={scheduleModules}
            initialMap={moduleWeekMap}
            onSaved={() => void loadSchedule(selectedId)}
            onMsg={onMsg}
          />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Timeline theo tuần</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCatalogPreviewOpen(true)}
                >
                  Xem trước Catalog
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveSchedules()}
                  className="bg-cyan-600 text-white hover:opacity-90"
                  size="sm"
                >
                  Lưu chỉnh sửa lịch
                </Button>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-ds-muted">Đang tải lịch…</p>
            ) : (
              <CohortScheduleTimeline
                rows={scheduleRows}
                timezone={cohortTz}
                coursePublished={coursePublished}
                scheduleLocalValue={scheduleLocalValue}
                onPatchLocal={onPatchLocal}
                onBulkWeekPatch={onBulkWeekPatch}
              />
            )}
          </section>

          <CatalogLearnerPreviewDialog
            open={catalogPreviewOpen}
            onClose={() => setCatalogPreviewOpen(false)}
            courseSlug={courseSlug}
            coursePublished={coursePublished}
            catalogEnabled={catalogEnabled}
            rows={scheduleRows}
          />
        </>
      )}
    </div>
  )
}
