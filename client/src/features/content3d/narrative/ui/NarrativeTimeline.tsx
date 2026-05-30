'use client'

import { clsx } from 'clsx'
import type { NarrativeConfidence } from '@/features/content3d/narrative/types'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'

function ConfidencePill({ confidence }: { confidence: NarrativeConfidence }) {
  const label =
    confidence === 'consensus'
      ? 'Đồng thuận rộng'
      : confidence === 'model'
        ? 'Mô hình / giả lập'
        : 'Giả thuyết'
  const cls =
    confidence === 'consensus'
      ? 'bg-emerald-500/20 text-emerald-200'
      : confidence === 'model'
        ? 'bg-amber-500/20 text-amber-100'
        : 'bg-violet-500/20 text-violet-100'
  return <span className={clsx('mt-1 inline-block rounded px-1.5 py-0.5 text-[9px]', cls)}>{label}</span>
}

type NarrativeTimelinePlacement = 'floating' | 'rail'

export function NarrativeTimeline({
  entityLabel,
  placement = 'floating',
}: {
  entityLabel: string
  placement?: NarrativeTimelinePlacement
}) {
  const beats = usePlanetNarrativeStore((s) => s.beats)
  const currentBeatIndex = usePlanetNarrativeStore((s) => s.currentBeatIndex)
  const setBeatIndex = usePlanetNarrativeStore((s) => s.setBeatIndex)
  const showTimeline = usePlanetNarrativeStore((s) => s.showTimeline)

  if (!showTimeline) return null

  const shellClass =
    placement === 'rail'
      ? 'flex h-full min-h-0 w-full min-w-0 max-w-[21rem] flex-col overflow-hidden rounded-xl border border-violet-500/30 bg-black/50 shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur-md'
      : 'pointer-events-auto fixed left-3 top-[5.75rem] z-30 flex w-[21rem] min-w-0 max-w-[21rem] max-h-[min(68vh,34rem)] flex-col overflow-hidden rounded-xl border border-violet-500/30 bg-black/55 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md'

  return (
    <aside className={shellClass} aria-label={`${entityLabel} · dòng thời gian`}>
      <div className="shrink-0 border-b border-violet-400/25 px-3.5 py-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-violet-200/90">{entityLabel} · dòng thời gian</p>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-400">
          Giai đoạn địa chất và thử thách không gian — diễn đạt học đường, tránh khô như báo khoa học.
        </p>
      </div>
      <div className="min-h-0 min-w-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-2 [scrollbar-gutter:stable]">
        {beats.map((beat, index) => (
          <button
            key={beat.id}
            type="button"
            onClick={() => setBeatIndex(index)}
            className={clsx(
              'mb-1 w-full min-w-0 rounded-lg px-3 py-2.5 text-left transition-all',
              'hover:bg-violet-500/15',
              currentBeatIndex === index
                ? 'border border-violet-400/55 bg-violet-500/22'
                : 'border border-transparent bg-transparent'
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="shrink-0 text-lg">{beat.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{beat.name}</div>
                <div className="line-clamp-2 text-[11px] leading-snug text-slate-400">{beat.ageLabelVi}</div>
                <ConfidencePill confidence={beat.environment.confidence} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
