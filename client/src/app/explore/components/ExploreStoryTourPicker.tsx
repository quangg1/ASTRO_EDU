'use client'

import { clsx } from 'clsx'
import { BookOpen, Lock, Sparkles, X } from 'lucide-react'
import type { ShowcaseStoryViewModel } from '@/app/explore/hooks/useExploreShowcaseGamification'

type Props = {
  open: boolean
  stories: ShowcaseStoryViewModel[]
  loggedIn: boolean
  unlockPending: 'story' | 'orbit' | null
  onClose: () => void
  onPlay: (storyId: string) => void
  onUnlock: (unlockEntityId: string) => void
  onFocusPlanet: (entityId: string) => void
}

export function ExploreStoryTourPicker({
  open,
  stories,
  loggedIn,
  unlockPending,
  onClose,
  onPlay,
  onUnlock,
  onFocusPlanet,
}: Props) {
  if (!open) return null

  return (
    <div className="pointer-events-auto fixed inset-0 z-[35] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-labelledby="story-tour-picker-title"
        className="max-h-[min(80vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.12] bg-[rgba(8,10,16,0.95)] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ds-accent">Triển lãm cao cấp</p>
            <h2 id="story-tour-picker-title" className="mt-1 font-[family-name:var(--font-heading)] text-xl font-bold text-white">
              Story tour 3D
            </h2>
            <p className="mt-1 text-[12px] text-white/50">
              Campaign có kịch bản camera — mở bằng gem, xem như docent dẫn tour.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto px-5 py-4">
          {stories.length === 0 ? (
            <p className="text-sm text-white/50">Chưa có campaign trong catalog.</p>
          ) : (
            stories.map((story) => (
              <article
                key={story.id}
                className="rounded-xl border border-white/[0.08] bg-ds-surface/40 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                      {story.targetPlanetName}
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold text-white">{story.title}</h3>
                    <p className="mt-1 text-[11px] text-white/55">{story.detail}</p>
                  </div>
                  {!story.hasWaypoints ? (
                    <span className="shrink-0 rounded border border-white/10 px-2 py-0.5 text-[9px] uppercase text-white/40">
                      Sắp có
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onFocusPlanet(story.unlockEntityId)}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-white/65 hover:bg-white/10"
                  >
                    Bay tới {story.targetPlanetName}
                  </button>
                  {story.storyUnlocked ? (
                    <button
                      type="button"
                      disabled={!story.hasWaypoints}
                      onClick={() => {
                        onPlay(story.id)
                        onClose()
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ds-accent-strong bg-ds-accent-soft px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ds-accent hover:brightness-110 disabled:opacity-40"
                    >
                      <BookOpen className="h-3 w-3" />
                      Phát tour
                    </button>
                  ) : loggedIn ? (
                    <button
                      type="button"
                      disabled={unlockPending === 'story' || !story.hasWaypoints}
                      onClick={() => onUnlock(story.unlockEntityId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-950/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-100 hover:bg-amber-900/35 disabled:opacity-40"
                    >
                      <Sparkles className="h-3 w-3" />
                      Mở · {story.storyCost} gem
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                      <Lock className="h-3 w-3" />
                      Đăng nhập để mở
                    </span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
