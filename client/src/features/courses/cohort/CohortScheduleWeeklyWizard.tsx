'use client'

import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { applyCohortWeeklySchedule, isoToDatetimeLocalInTz } from '@/features/courses/api/cohortApi'
import { Button } from '@/design-system'

export function CohortScheduleWeeklyWizard({
  courseSlug,
  cohortId,
  timezone,
  cohortStartAt,
  onApplied,
}: {
  courseSlug: string
  cohortId: string
  timezone: string
  cohortStartAt?: string | null
  onApplied: () => void
}) {
  const defaultWeek1 =
    isoToDatetimeLocalInTz(cohortStartAt, timezone) ||
    isoToDatetimeLocalInTz(new Date().toISOString(), timezone)
  const [week1Local, setWeek1Local] = useState(defaultWeek1)
  const [daysPerWeek, setDaysPerWeek] = useState(7)
  const [setDueAndClose, setSetDueAndClose] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onApply = async () => {
    if (!week1Local.trim()) {
      setMsg('Chọn ngày giờ mở tuần 1')
      return
    }
    if (!confirm('Áp lịch theo tuần sẽ ghi đè open/due/close cho mọi bài (theo ánh xạ Chương → Tuần của lớp). Tiếp tục?')) {
      return
    }
    setBusy(true)
    setMsg(null)
    const res = await applyCohortWeeklySchedule(courseSlug, cohortId, {
      week1OpenAtLocal: week1Local,
      daysPerWeek,
      setDueAndClose,
    })
    setBusy(false)
    if (res.success) {
      setMsg(res.message || 'Đã áp lịch theo tuần')
      onApplied()
    } else {
      setMsg(res.error || 'Lỗi áp lịch')
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/25 to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-emerald-400" aria-hidden />
        <h3 className="text-sm font-semibold text-white">Wizard — Lịch theo tuần</h3>
      </div>
      <p className="text-[11px] text-ds-muted leading-relaxed">
        Dùng <strong className="text-white/90">ánh xạ Chương → Tuần</strong> ở trên. Tuần 1 mở vào ngày bạn chọn; tuần 2 = +
        {daysPerWeek} ngày, v.v.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[11px] text-ds-muted sm:col-span-2">
          Tuần 1 mở lúc ({timezone})
          <input
            type="datetime-local"
            value={week1Local}
            onChange={(e) => setWeek1Local(e.target.value)}
            className="studio-field mt-1 w-full text-xs"
          />
        </label>
        <label className="text-[11px] text-ds-muted">
          Số ngày / tuần
          <input
            type="number"
            min={1}
            max={28}
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(Math.max(1, Math.min(28, Number(e.target.value) || 7)))}
            className="studio-field mt-1 w-full text-xs"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-ds-muted cursor-pointer">
        <input type="checkbox" checked={setDueAndClose} onChange={(e) => setSetDueAndClose(e.target.checked)} />
        Tự đặt hạn nộp (assignment) và đóng quiz = cuối mỗi tuần
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={busy}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
          onClick={() => void onApply()}
        >
          {busy ? 'Đang áp dụng…' : 'Áp lịch theo tuần'}
        </Button>
        {msg && <p className="text-xs text-ds-muted">{msg}</p>}
      </div>
    </section>
  )
}
