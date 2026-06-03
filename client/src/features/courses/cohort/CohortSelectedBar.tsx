'use client'

import type { CohortSummary } from '@/features/courses/api/cohortApi'

export function CohortSelectedBar({
  cohorts,
  selectedId,
  onSelect,
}: {
  cohorts: CohortSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (cohorts.length === 0) return null
  const selected = cohorts.find((c) => String(c.id || c._id) === selectedId)

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/15 px-3 py-2.5 flex flex-wrap items-center gap-3">
      <span className="text-[10px] uppercase tracking-wider text-ds-accent/80 font-medium">Đang quản lý</span>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="studio-field text-sm min-w-[200px] max-w-full flex-1"
        aria-label="Chọn lớp học"
      >
        {cohorts.map((c) => {
          const id = String(c.id || c._id)
          return (
            <option key={id} value={id}>
              {c.title}
              {c.status ? ` · ${c.status}` : ''}
              {c.studentCount != null ? ` · ${c.studentCount} HV` : ''}
            </option>
          )
        })}
      </select>
      {selected?.inviteCode && (
        <span className="text-[10px] text-ds-subtle font-mono">
          Mã: <span className="text-ds-accent">{selected.inviteCode}</span>
        </span>
      )}
    </div>
  )
}
