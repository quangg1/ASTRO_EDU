'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { copyCohortScheduleFrom, type CohortSummary } from '@/features/courses/api/cohortApi'
import { Button } from '@/design-system'

export function CohortScheduleCopyPanel({
  courseSlug,
  targetCohortId,
  cohorts,
  onCopied,
}: {
  courseSlug: string
  targetCohortId: string
  cohorts: CohortSummary[]
  onCopied: () => void
}) {
  const sources = cohorts.filter((c) => String(c.id || c._id) !== targetCohortId)
  const [sourceId, setSourceId] = useState(sources[0] ? String(sources[0].id || sources[0]._id) : '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (sources.length === 0) {
    return (
      <p className="text-[11px] text-ds-subtle rounded-lg border border-ds-border px-3 py-2">
        Cần ít nhất 2 lớp để sao chép lịch.
      </p>
    )
  }

  const onCopy = async () => {
    if (!sourceId) return
    const src = sources.find((c) => String(c.id || c._id) === sourceId)
    if (
      !confirm(
        `Sao chép toàn bộ lịch từ «${src?.title || sourceId}» sang lớp hiện tại? Lịch cũ của lớp đích sẽ bị ghi đè.`,
      )
    ) {
      return
    }
    setBusy(true)
    setMsg(null)
    const res = await copyCohortScheduleFrom(courseSlug, targetCohortId, sourceId)
    setBusy(false)
    if (res.success) {
      setMsg(res.message || 'Đã sao chép')
      onCopied()
    } else {
      setMsg(res.error || 'Lỗi sao chép')
    }
  }

  return (
    <section className="rounded-xl border border-ds-border bg-ds-overlay/60 p-3 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 text-ds-muted min-w-[120px]">
        <Copy className="w-4 h-4 shrink-0" aria-hidden />
        <span className="text-xs font-medium text-gray-300">Sao chép lịch</span>
      </div>
      <label className="text-[11px] text-ds-muted flex-1 min-w-[180px]">
        Từ lớp
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="studio-field mt-1 w-full text-xs"
        >
          {sources.map((c) => {
            const id = String(c.id || c._id)
            return (
              <option key={id} value={id}>
                {c.title}
              </option>
            )
          })}
        </select>
      </label>
      <Button
        type="button"
        disabled={busy || !sourceId}
        variant="secondary"
        size="sm"
        onClick={() => void onCopy()}
      >
        {busy ? 'Đang copy…' : 'Copy lịch → lớp này'}
      </Button>
      {msg && <p className="text-[11px] text-ds-muted w-full">{msg}</p>}
    </section>
  )
}
