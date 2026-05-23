'use client'

import { useEarthHistoryStore } from '@/features/content3d/earth/public'
import { clsx } from 'clsx'

export function Timeline() {
  const stages = useEarthHistoryStore((s) => s.stages)
  const currentStageIndex = useEarthHistoryStore((s) => s.currentStageIndex)
  const setStageIndex = useEarthHistoryStore((s) => s.setStageIndex)
  const showTimeline = useEarthHistoryStore((s) => s.showTimeline)

  if (!showTimeline) return null

  return (
    <div className="fixed left-2 top-24 bottom-28 z-30 flex w-80 max-w-[calc(100vw-2rem)] min-h-0 flex-col overflow-hidden">
      <div className="glass flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-r-xl shadow-xl">
        {/* Header */}
        <div className="shrink-0 border-b border-cyan-400/30 p-4">
          <div className="flex text-xs text-gray-400 font-medium">
            <span className="w-12">EON</span>
            <span className="w-16">ERA</span>
            <span className="flex-1">PERIOD</span>
            <span className="w-16 text-right">MYA</span>
          </div>
        </div>

        {/* Timeline list — không đặt transform/animation trên ancestor của vùng cuộn (Safari / wheel) */}
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 [scrollbar-gutter:stable]">
          {stages.map((stage, index) => (
            <button
              key={stage.id}
              onClick={() => setStageIndex(index)}
              className={clsx(
                'w-full text-left px-3 py-3 rounded-lg mb-1 transition-all',
                'hover:bg-cyan-400/20',
                currentStageIndex === index
                  ? 'bg-cyan-400/30 border border-cyan-400/50'
                  : 'bg-transparent'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{stage.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {stage.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {stage.eon}
                    {stage.era && ` | ${stage.era}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className={clsx(
                    'text-sm font-mono',
                    stage.isExtinction ? 'text-red-400' : 'text-cyan-400'
                  )}>
                    {formatTime(stage.time)}
                  </div>
                </div>
              </div>
              
              {/* Extinction indicator */}
              {stage.isExtinction && (
                <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <span>💀</span>
                  <span>Mass Extinction</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatTime(time: number): string {
  if (time === 0) return 'Now'
  if (time < 0.001) return `${(time * 1000).toFixed(0)} Ka`
  if (time < 1) return `${(time * 1000).toFixed(0)} Ka`
  if (time >= 1000) return `${(time / 1000).toFixed(1)} Ga`
  return `${time.toFixed(0)} Ma`
}
