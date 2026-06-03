'use client'

import type { ExploreView } from '@/features/explore/public'

type Props = {
  exploreView: ExploreView
  onSelectView: (view: ExploreView) => void
  className?: string
}

export function ExploreViewToggle({ exploreView, onSelectView, className = '' }: Props) {
  return (
    <div
      className={`inline-flex rounded-lg border border-white/15 bg-black/45 p-0.5 backdrop-blur ${className}`}
      role="tablist"
      aria-label="Chế độ khám phá"
    >
      <button
        type="button"
        role="tab"
        aria-selected={exploreView === 'solar'}
        onClick={() => onSelectView('solar')}
        className={`rounded-md px-3 py-1.5 text-[10px] uppercase tracking-wider transition ${
          exploreView === 'solar'
            ? 'bg-cyan-500/25 text-cyan-100'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Hệ Mặt Trời
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={exploreView === 'sky'}
        onClick={() => onSelectView('sky')}
        className={`rounded-md px-3 py-1.5 text-[10px] uppercase tracking-wider transition ${
          exploreView === 'sky'
            ? 'bg-violet-500/25 text-violet-100'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        La bàn chòm sao
      </button>
    </div>
  )
}
