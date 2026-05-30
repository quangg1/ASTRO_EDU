'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogFooter } from '@/design-system'
import { Button } from '@/design-system'
import type { ScheduleLessonRow } from '@/features/courses/api/cohortApi'

export function CohortWeekBulkEditDialog({
  open,
  onClose,
  week,
  lessons,
  scheduleLocalValue,
  onApply,
}: {
  open: boolean
  onClose: () => void
  week: number
  lessons: ScheduleLessonRow[]
  scheduleLocalValue: (v: string | Date | null | undefined) => string
  onApply: (patch: {
    openAtLocal: string
    dueAtLocal: string
    closeAtLocal: string
    applyDue: boolean
    applyClose: boolean
  }) => void
}) {
  const [openAt, setOpenAt] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  const [applyDue, setApplyDue] = useState(true)
  const [applyClose, setApplyClose] = useState(true)

  useEffect(() => {
    if (!open) return
    const first = lessons.find((l) => l.schedule.openAt)
    setOpenAt(first?.schedule.openAt ? scheduleLocalValue(first.schedule.openAt) : '')
    setDueAt('')
    setCloseAt('')
    setApplyDue(lessons.some((l) => l.type === 'assignment'))
    setApplyClose(lessons.some((l) => l.type === 'quiz'))
  }, [open, lessons])

  const weekLabel = week === 0 ? 'Chưa gán tuần' : `Tuần ${week}`

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Sửa nhanh hàng loạt · ${weekLabel}`}
      description={`Áp dụng cho ${lessons.length} bài trong tuần này. Bạn vẫn cần bấm &quot;Lưu chỉnh sửa lịch&quot; sau đó.`}
      size="md"
    >
      <div className="space-y-3">
        <label className="block text-[11px] text-ds-muted">
          Giờ mở (tất cả bài)
          <input
            type="datetime-local"
            className="studio-field mt-1 w-full text-xs"
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-ds-muted">
          <input type="checkbox" checked={applyDue} onChange={(e) => setApplyDue(e.target.checked)} />
          Gán hạn nộp (chỉ bài tập)
        </label>
        {applyDue && (
          <label className="block text-[11px] text-ds-muted">
            Hạn nộp
            <input
              type="datetime-local"
              className="studio-field mt-1 w-full text-xs"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-ds-muted">
          <input type="checkbox" checked={applyClose} onChange={(e) => setApplyClose(e.target.checked)} />
          Gán đóng quiz (chỉ bài kiểm tra)
        </label>
        {applyClose && (
          <label className="block text-[11px] text-ds-muted">
            Đóng quiz
            <input
              type="datetime-local"
              className="studio-field mt-1 w-full text-xs"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
            />
          </label>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Hủy
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-cyan-600 text-white hover:bg-cyan-500"
          disabled={!openAt.trim()}
          onClick={() => {
            onApply({
              openAtLocal: openAt,
              dueAtLocal: dueAt,
              closeAtLocal: closeAt,
              applyDue,
              applyClose,
            })
            onClose()
          }}
        >
          Áp dụng vào {lessons.length} bài
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
