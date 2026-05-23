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

export function NarrativeTimeline({ entityLabel }: { entityLabel: string }) {
  const beats = usePlanetNarrativeStore((s) => s.beats)
  const currentBeatIndex = usePlanetNarrativeStore((s) => s.currentBeatIndex)
  const setBeatIndex = usePlanetNarrativeStore((s) => s.setBeatIndex)
  const showTimeline = usePlanetNarrativeStore((s) => s.showTimeline)

  if (!showTimeline) return null

  return (
    <div className="fixed left-2 top-24 bottom-28 z-30 flex w-80 max-w-[calc(100vw-2rem)] min-h-0 flex-col overflow-hidden">
      <div className="glass flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-r-xl shadow-xl border border-violet-500/25">
        <div className="shrink-0 border-b border-violet-400/30 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-200/90">{entityLabel} · dòng thời gian</p>
          <p className="mt-1 text-xs text-slate-400">
            Giai đoạn địa chất và thử thách không gian — diễn đạt học đường, tránh khô như báo khoa học.
          </p>
        </div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 [scrollbar-gutter:stable]">
          {beats.map((beat, index) => (
            <button
              key={beat.id}
              type="button"
              onClick={() => setBeatIndex(index)}
              className={clsx(
                'mb-1 w-full rounded-lg px-3 py-3 text-left transition-all',
                'hover:bg-violet-500/15',
                currentBeatIndex === index
                  ? 'border border-violet-400/55 bg-violet-500/22'
                  : 'border border-transparent bg-transparent'
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{beat.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white">{beat.name}</div>
                  <div className="text-[11px] leading-snug text-slate-400">{beat.ageLabelVi}</div>
                  <ConfidencePill confidence={beat.environment.confidence} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
