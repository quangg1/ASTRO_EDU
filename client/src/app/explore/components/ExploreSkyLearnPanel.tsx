'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { X, Sparkles, Star, Orbit, Sun } from 'lucide-react'
import type { SkyExploreTarget } from '@/features/explore/public'
import {
  resolveSkyTargetIllustrationUrl,
  skyTargetStarStats,
  skyTargetSubtitle,
} from '@/features/explore/public'
import { ExploreLearningSteps } from './ExploreLearningSteps'
import { ExploreConceptChips } from './ExploreConceptChips'
import { ExploreSkyPanelBlocks } from './ExploreSkyPanelBlocks'
import type { useExplorePanelLearning } from '../hooks/useExplorePanelLearning'

type PanelLearning = ReturnType<typeof useExplorePanelLearning>

type Props = {
  open: boolean
  onClose: () => void
  target: SkyExploreTarget | null
  title: string
  museumLabelVi: string
  panelLearning: PanelLearning
  loggedIn: boolean
  solarLink?: { label: string; onOpen: () => void } | null
  lessonProgress?: { done: number; total: number }
}

export function ExploreSkyLearnPanel({
  open,
  onClose,
  target,
  title,
  museumLabelVi,
  panelLearning,
  loggedIn,
  solarLink,
  lessonProgress,
}: Props) {
  const illustration = resolveSkyTargetIllustrationUrl(target)
  const stats = skyTargetStarStats(target)
  const subtitle = skyTargetSubtitle(target)
  const isConstellation = target?.kind === 'constellation'
  const panelBlocks = [
    ...(target?.panelConfig?.overviewBlocks || []),
    ...(target?.panelConfig?.skyBlocks || []),
  ]
  const stateBadge = String(target?.panelConfig?.stateBadge || '').trim()

  return (
    <aside
      aria-hidden={!open}
      className={`pointer-events-none fixed right-0 top-14 z-[25] flex h-[calc(100vh-3.5rem)] w-[min(21rem,calc(100vw-1rem))] transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="pointer-events-auto flex h-full w-full flex-col border-l border-violet-500/15 bg-gradient-to-b from-[#14121f]/90 via-[#0a0f18]/94 to-[#06080f]/96 shadow-[-12px_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/80">
              Học tập
            </p>
            {lessonProgress && lessonProgress.total > 0 ? (
              <p className="mt-0.5 text-[10px] tabular-nums text-slate-500">
                Bài 3D · {lessonProgress.done}/{lessonProgress.total}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
            aria-label="Đóng panel học tập"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
          <div className="relative mt-1 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/40 to-black/60">
            {illustration ? (
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={illustration}
                  alt=""
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 21rem) 100vw"
                  priority
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-violet-300/30">
                {target?.kind === 'body' ? (
                  <Sun className="h-16 w-16" strokeWidth={1} />
                ) : (
                  <Sparkles className="h-16 w-16" strokeWidth={1} />
                )}
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-transparent to-transparent"
              aria-hidden
            />
          </div>

          <h2 className="mt-4 text-xl font-semibold leading-tight tracking-tight text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          ) : null}
          {stateBadge ? (
            <p className="mt-2 text-[11px] font-medium text-violet-200/90">{stateBadge}</p>
          ) : null}

          {isConstellation ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatPill
                icon={<Star className="h-3 w-3" />}
                label="Sao nối"
                value={String(stats.starCount)}
              />
              <StatPill
                icon={<Orbit className="h-3 w-3" />}
                label="Cạnh"
                value={String(stats.lineCount)}
              />
              <StatPill
                icon={<Sparkles className="h-3 w-3" />}
                label="Sáng nhất"
                value={
                  stats.brightestMag != null
                    ? `m=${stats.brightestMag.toFixed(1)}`
                    : '—'
                }
              />
            </div>
          ) : null}

          {target?.zodiac ? (
            <span className="mt-2 inline-block rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-100/90">
              Hoàng đạo
            </span>
          ) : null}

          <p className="mt-4 text-sm leading-relaxed text-slate-300/95">{museumLabelVi}</p>
          <ExploreSkyPanelBlocks blocks={panelBlocks} />

          <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-4">
            <ExploreLearningSteps
              steps={panelLearning.steps}
              onStepAction={panelLearning.onStepAction}
              loggedIn={loggedIn}
            />
            <ExploreConceptChips
              chips={panelLearning.chipViews}
              loading={panelLearning.conceptsLoading}
              quizLoadingId={panelLearning.conceptQuizLoadingId}
              loggedIn={loggedIn}
              onChipClick={panelLearning.onConceptChipClick}
            />
          </div>

          {solarLink ? (
            <button
              type="button"
              onClick={solarLink.onOpen}
              className="mt-4 w-full rounded-xl border border-cyan-400/25 bg-cyan-950/35 px-3 py-2.5 text-left text-xs text-cyan-100 transition hover:bg-cyan-900/45"
            >
              {solarLink.label}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2">
      <div className="flex items-center gap-1 text-violet-300/70">{icon}</div>
      <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}
