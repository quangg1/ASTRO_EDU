'use client'

import { Timeline } from '@/features/content3d/earth/ui/Timeline'
import { InfoPanel } from '@/features/content3d/earth/ui/InfoPanel'
import { FossilPanel } from '@/features/content3d/earth/ui/FossilPanel'
import { FossilDetailDock } from '@/features/content3d/earth/ui/FossilDetailOverlay'
import { Controls } from '@/features/content3d/earth/ui/Controls'

type Props = {
  onBackToShowcase: () => void
}

export function ExploreEarthOverlay({ onBackToShowcase }: Props) {
  return (
    <>
      <div className="fixed top-14 left-0 right-0 z-[22] border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 py-2 flex items-center justify-between text-[11px]">
          <span className="tracking-[0.14em] uppercase text-slate-200/90">Hóa thạch · Trái Đất</span>
          <button
            type="button"
            onClick={onBackToShowcase}
            className="rounded border border-cyan-300/40 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-100 hover:bg-cyan-500/15"
          >
            Back to Showcase
          </button>
        </div>
      </div>
      <Timeline />
      <div className="pointer-events-auto fixed right-3 top-24 bottom-28 z-30 flex w-[min(22rem,calc(100vw-1.25rem))] min-h-0 flex-col gap-2">
        <div className="flex min-h-0 min-w-0 flex-[1.15] basis-0 flex-col overflow-hidden">
          <InfoPanel layout="dock" />
        </div>
        <FossilDetailDock />
        <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
          <FossilPanel layout="dock" />
        </div>
      </div>
      <Controls />
    </>
  )
}
