'use client'

import { BookOpen, GraduationCap } from 'lucide-react'
import {
  DISTRIBUTION_STRATEGY_LABELS,
  type DistributionStrategy,
  patchForDistributionStrategy,
} from '@/features/courses/lib/distributionStrategy'

const OPTIONS: {
  id: DistributionStrategy
  icon: typeof BookOpen
  accent: string
  borderActive: string
  bgActive: string
}[] = [
  {
    id: 'self_paced',
    icon: BookOpen,
    accent: 'text-cyan-300',
    borderActive: 'border-cyan-500/50',
    bgActive: 'bg-cyan-950/25',
  },
  {
    id: 'instructor_led',
    icon: GraduationCap,
    accent: 'text-violet-300',
    borderActive: 'border-violet-500/50',
    bgActive: 'bg-violet-950/25',
  },
]

export function DistributionStrategySection({
  value,
  onChange,
}: {
  value: DistributionStrategy
  onChange: (patch: ReturnType<typeof patchForDistributionStrategy>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-200">Chế độ phân phối</p>
        <p className="text-[10px] text-ds-subtle mt-1 leading-relaxed">
          Mỗi khóa chỉ một trong hai: tự học catalog hoặc lớp có giáo viên — không kết hợp.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Chế độ phân phối">
        {OPTIONS.map((opt) => {
          const meta = DISTRIBUTION_STRATEGY_LABELS[opt.id]
          const selected = value === opt.id
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(patchForDistributionStrategy(opt.id))}
              className={`text-left rounded-xl border p-3 transition-all ${
                selected
                  ? `${opt.borderActive} ${opt.bgActive} ring-1 ring-white/10`
                  : 'border-ds-border/70 bg-black/20 hover:border-white/20 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4 shrink-0 ${selected ? opt.accent : 'text-ds-subtle'}`} aria-hidden />
                <span className={`text-xs font-semibold ${selected ? 'text-white' : 'text-gray-300'}`}>
                  {meta.title}
                </span>
              </div>
              <p className="text-[10px] text-ds-muted leading-snug">{meta.subtitle}</p>
              {selected && (
                <p className="text-[10px] text-ds-subtle mt-2 leading-relaxed border-t border-white/10 pt-2">
                  {meta.hint}
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
