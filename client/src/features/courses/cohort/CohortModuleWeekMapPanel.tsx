'use client'

import { useEffect, useState } from 'react'
import { BookMarked } from 'lucide-react'
import { patchCohort, type ScheduleModuleRow } from '@/features/courses/api/cohortApi'
import { Button } from '@/design-system'

export function CohortModuleWeekMapPanel({
  courseSlug,
  cohortId,
  modules,
  initialMap,
  onSaved,
  onMsg,
}: {
  courseSlug: string
  cohortId: string
  modules: ScheduleModuleRow[]
  initialMap: Record<string, number>
  onSaved: () => void
  onMsg: (msg: string | null) => void
}) {
  const [weekByModule, setWeekByModule] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next: Record<string, number> = { ...initialMap }
    modules.forEach((m, idx) => {
      if (m.id && next[m.id] == null) {
        next[m.id] = m.deliveryWeek ?? idx + 1
      }
    })
    setWeekByModule(next)
  }, [cohortId, modules, initialMap])

  if (modules.length === 0) {
    return (
      <p className="text-[11px] text-ds-muted rounded-lg border border-ds-border/80 px-3 py-2">
        Chưa có <strong className="text-white/80">Chương</strong> trong Studio — tạo chương và gán bài trước khi ánh xạ
        tuần giao.
      </p>
    )
  }

  const onSave = async () => {
    setBusy(true)
    const res = await patchCohort(courseSlug, cohortId, { moduleWeekMap: weekByModule })
    setBusy(false)
    if (res.success) {
      onMsg('Đã lưu ánh xạ Chương → Tuần')
      onSaved()
    } else {
      onMsg(res.error || 'Lỗi lưu ánh xạ')
    }
  }

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/20 to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookMarked className="w-4 h-4 text-violet-300" aria-hidden />
        <h3 className="text-sm font-semibold text-white">Ánh xạ Chương → Tuần giao</h3>
      </div>
      <p className="text-[11px] text-ds-muted leading-relaxed">
        Nội dung khóa học theo <strong className="text-white/90">Chương</strong> (Studio). Ở lớp này, bạn chọn{' '}
        <strong className="text-white/90">tuần lịch</strong> mỗi chương được mở — ví dụ Chương 1 → Tuần 1.
      </p>
      <ul className="divide-y divide-ds-border/50 rounded-xl border border-ds-border/80 overflow-hidden">
        {modules.map((mod) => (
          <li key={mod.id} className="flex flex-wrap items-center gap-3 px-3 py-2 bg-white/[0.02]">
            <span className="text-sm text-white flex-1 min-w-[120px] truncate">{mod.title}</span>
            <label className="flex items-center gap-2 text-[11px] text-ds-muted shrink-0">
              Tuần
              <input
                type="number"
                min={1}
                max={52}
                value={weekByModule[mod.id] ?? mod.deliveryWeek ?? 1}
                onChange={(e) =>
                  setWeekByModule((p) => ({
                    ...p,
                    [mod.id]: Math.max(1, Math.min(52, Number(e.target.value) || 1)),
                  }))
                }
                className="studio-field w-16 text-xs py-1"
              />
            </label>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void onSave()}>
        {busy ? 'Đang lưu…' : 'Lưu ánh xạ chương'}
      </Button>
    </section>
  )
}
