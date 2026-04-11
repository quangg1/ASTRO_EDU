'use client'

import { useState } from 'react'
import { getLegArrivingAtPlanet } from '@/lib/solarJourneyData'
import type { JourneyMilestone } from '@/lib/solarJourneyData'
import { useSolarJourneyProgress } from '@/hooks/useSolarJourneyProgress'
import { resolveMediaUrl } from '@/lib/apiConfig'

type Props = {
  dockedAtPlanet: boolean
  destinationIndex: number | null
}

export default function CockpitJourneyMilestones({ dockedAtPlanet, destinationIndex }: Props) {
  const { markComplete, isComplete, progressForLeg } = useSolarJourneyProgress()
  const [openId, setOpenId] = useState<string | null>(null)

  if (!dockedAtPlanet || destinationIndex === null) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[10px] text-slate-500">
        Neo đích một hành tinh để xem <span className="text-emerald-500/90">chặng khám phá</span> tương ứng.
      </div>
    )
  }

  const leg = getLegArrivingAtPlanet(destinationIndex)
  if (!leg) return null

  const ids = leg.milestones.map((m) => m.id)
  const { done, total } = progressForLeg(ids)

  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-emerald-500/25 bg-black/50 px-2 py-2">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-1.5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-500/90">Chặng · Journey</p>
          <p className="text-[11px] font-medium leading-tight text-emerald-100/95">{leg.titleVi}</p>
        </div>
        <span className="shrink-0 rounded border border-emerald-500/30 bg-emerald-950/50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300/90">
          {done}/{total}
        </span>
      </div>
      <ul className="max-h-[min(28vh,220px)] space-y-1 overflow-y-auto pr-0.5">
        {leg.milestones
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((m) => (
            <MilestoneRow
              key={m.id}
              m={m}
              expanded={openId === m.id}
              onToggle={() => setOpenId((x) => (x === m.id ? null : m.id))}
              complete={isComplete(m.id)}
              onComplete={() => markComplete(m.id)}
            />
          ))}
      </ul>
    </div>
  )
}

function MilestoneRow({
  m,
  expanded,
  onToggle,
  complete,
  onComplete,
}: {
  m: JourneyMilestone
  expanded: boolean
  onToggle: () => void
  complete: boolean
  onComplete: () => void
}) {
  const hero = m.media?.heroImage ? resolveMediaUrl(m.media.heroImage) : ''

  return (
    <li className="rounded-md border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
            complete ? 'border-emerald-500/60 bg-emerald-600/30 text-emerald-200' : 'border-white/20 text-slate-500'
          }`}
          aria-label={complete ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
        >
          {complete ? '✓' : m.order}
        </span>
        <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-slate-200">{m.titleVi}</span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-white/10 px-2 pb-2 pt-1.5">
          {hero ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL từ CDN động */}
              <img src={hero} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <p className="text-[10px] leading-relaxed text-slate-400">{m.summaryVi}</p>
          {!complete ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onComplete()
              }}
              className="rounded-md border border-emerald-500/40 bg-emerald-900/40 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-800/50"
            >
              Đánh dấu đã tìm hiểu
            </button>
          ) : (
            <p className="text-[10px] text-emerald-500/80">Đã hoàn thành mốc này.</p>
          )}
        </div>
      )}
    </li>
  )
}
