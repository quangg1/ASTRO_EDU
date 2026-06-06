'use client'

import { useState } from 'react'
import {
  Compass,
  GraduationCap,
  MapPin,
  Sparkles,
  Sun,
  ChevronDown,
} from 'lucide-react'
import { getSkyTargetLabel, resolveSolarEntityIdForTarget } from '@/features/explore/public'
import type { ExplorePageModel } from '../hooks/useExplorePage'
import { ExploreViewToggle } from './ExploreViewToggle'
import { ExploreBridgeQuiz } from './ExploreBridgeQuiz'
import { useExplorePanelLearning } from '../hooks/useExplorePanelLearning'
import { ExploreSkyHudClock } from './ExploreSkyHudClock'
import { ExploreSkyLearnPanel } from './ExploreSkyLearnPanel'

type Props = Pick<
  ExplorePageModel,
  | 'user'
  | 'gemBalance'
  | 'exploreView'
  | 'navigateExploreView'
  | 'openSolarForTarget'
  | 'selectSkyTarget'
  | 'skyActiveTargetId'
  | 'activeSkyTarget'
  | 'constellationTargets'
  | 'bodyTargets'
  | 'effectiveConceptCards'
  | 'effectiveLessonLinks'
  | 'bridgeVisitedLessonsForEntity'
  | 'museumLabelVi'
  | 'modules'
  | 'panelReadComplete'
  | 'markPanelReadComplete'
  | 'openBridgeQuiz'
  | 'entityQuizCompleted'
  | 'bridgeQuizPromptOpen'
  | 'setBridgeQuizPromptOpen'
  | 'bridgeQuizQuestions'
  | 'handleQuizComplete'
  | 'activeResolved'
  | 'bridgeEntityId'
  | 'locationLabel'
  | 'observer'
>

type HudTab = 'none' | 'objects' | 'learn'

export function ExploreSkyOverlay(props: Props) {
  const {
    user,
    gemBalance,
    exploreView,
    navigateExploreView,
    openSolarForTarget,
    selectSkyTarget,
    skyActiveTargetId,
    activeSkyTarget,
    constellationTargets,
    bodyTargets,
    effectiveConceptCards,
    effectiveLessonLinks,
    bridgeVisitedLessonsForEntity,
    museumLabelVi,
    modules,
    panelReadComplete,
    markPanelReadComplete,
    openBridgeQuiz,
    entityQuizCompleted,
    bridgeQuizPromptOpen,
    setBridgeQuizPromptOpen,
    bridgeQuizQuestions,
    handleQuizComplete,
    activeResolved,
    bridgeEntityId,
    locationLabel,
    observer,
  } = props

  const [hudTab, setHudTab] = useState<HudTab>('none')
  const label = getSkyTargetLabel(activeSkyTarget, skyActiveTargetId)
  const solarId = resolveSolarEntityIdForTarget(activeSkyTarget)

  const panelLearning = useExplorePanelLearning({
    userId: user?.id,
    entityDisplayName: label,
    conceptChips: effectiveConceptCards,
    lessonLinks: effectiveLessonLinks,
    modules,
    panelReadComplete,
    entityQuizCompleted,
    bridgeQuizOpen: bridgeQuizPromptOpen,
    onOpenBridgeQuiz: () => {
      if (!panelReadComplete) return
      openBridgeQuiz()
    },
    onMarkPanelRead: markPanelReadComplete,
    visitedLessonCount: bridgeVisitedLessonsForEntity,
  })

  return (
    <>
      {/* Top: chỉ toggle view — sky chiếm tối đa (Stellarium pattern) */}
      <div className="pointer-events-none fixed left-0 right-0 top-14 z-[22] flex justify-center px-3 pt-2">
        <div className="pointer-events-auto">
          <ExploreViewToggle
            exploreView={exploreView}
            className="border-white/10 bg-black/50 shadow-lg shadow-black/40"
            onSelectView={(v) => {
              if (v === 'solar') {
                navigateExploreView('solar', solarId || 'planet-earth')
                return
              }
              navigateExploreView('sky', skyActiveTargetId)
            }}
          />
        </div>
      </div>

      {/* Bottom HUD bar — location | toolbar | time */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[24] pb-3 pt-16">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
          aria-hidden
        />

        {hudTab === 'objects' ? (
          <div className="pointer-events-auto relative mx-auto mb-2 w-[min(36rem,calc(100vw-1.5rem))] rounded-xl border border-white/12 bg-[#0a1220]/92 p-3 shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Danh mục bầu trời
                </p>
                <h2 className="text-base font-semibold text-white">{label}</h2>
              </div>
              <button
                type="button"
                onClick={() => setHudTab('none')}
                className="rounded-md border border-white/10 p-1 text-slate-400 hover:bg-white/5"
                aria-label="Đóng danh mục"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[32vh] space-y-3 overflow-y-auto">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Chòm sao (phương Tây / IAU)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {constellationTargets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectSkyTarget(t.id)}
                      className={`rounded-full px-3 py-1 text-[11px] transition ${
                        t.id === skyActiveTargetId
                          ? 'bg-sky-500/25 text-sky-100 ring-1 ring-sky-400/40'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {t.nameVi.replace(/^Chòm sao /, '')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Hành tinh</p>
                <div className="flex flex-wrap gap-1.5">
                  {bodyTargets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectSkyTarget(t.id)}
                      className={`rounded-full px-3 py-1 text-[11px] transition ${
                        t.id === skyActiveTargetId
                          ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {t.nameVi}
                    </button>
                  ))}
                </div>
              </div>
              {solarId && activeResolved ? (
                <button
                  type="button"
                  onClick={() => openSolarForTarget(skyActiveTargetId, solarId)}
                  className="w-full rounded-lg border border-cyan-400/30 bg-cyan-950/30 px-3 py-2 text-left text-xs text-cyan-100 hover:bg-cyan-900/40"
                >
                  Mở {activeResolved.displayName ?? solarId} trong hệ Mặt Trời 3D →
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-auto relative mx-auto flex w-[min(56rem,calc(100vw-1rem))] items-end justify-between gap-2 px-2">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-300/80" />
            <span className="truncate text-[11px] text-slate-200">{locationLabel}</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur-md">
            {(
              [
                { id: 'objects' as const, icon: Sparkles, title: 'Chòm & hành tinh' },
                { id: 'learn' as const, icon: GraduationCap, title: 'Bài học' },
              ] as const
            ).map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                type="button"
                title={title}
                onClick={() => setHudTab((t) => (t === id ? 'none' : id))}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                  hudTab === id
                    ? 'bg-sky-500/25 text-sky-100'
                    : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            {user ? (
              <span className="hidden items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px] text-cyan-100 sm:flex">
                <Sun className="h-3 w-3" />
                {gemBalance}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end rounded-lg border border-white/10 bg-black/55 px-3 py-1.5 backdrop-blur-md">
            <ExploreSkyHudClock observer={observer} />
          </div>
        </div>

        <p className="pointer-events-none relative mt-2 max-w-md mx-auto text-center text-[10px] leading-relaxed text-slate-500/90 px-4">
          <Compass className="mr-1 inline h-3 w-3 opacity-60" />
          Kéo để quay tầm nhìn · Vuốt dọc nhìn lên/xuống chân trời
        </p>
      </div>

      <ExploreSkyLearnPanel
        open={hudTab === 'learn'}
        onClose={() => setHudTab('none')}
        target={activeSkyTarget}
        title={label}
        museumLabelVi={museumLabelVi}
        panelLearning={panelLearning}
        loggedIn={Boolean(user)}
        lessonProgress={
          effectiveLessonLinks.length > 0
            ? {
                done: bridgeVisitedLessonsForEntity,
                total: effectiveLessonLinks.length,
              }
            : undefined
        }
        solarLink={
          solarId && activeResolved
            ? {
                label: `Mở ${activeResolved.displayName ?? solarId} trong hệ Mặt Trời 3D →`,
                onOpen: () => openSolarForTarget(skyActiveTargetId, solarId),
              }
            : null
        }
      />

      {hudTab !== 'learn' && effectiveLessonLinks.length > 0 ? (
        <button
          type="button"
          onClick={() => setHudTab('learn')}
          className="pointer-events-auto fixed bottom-[5.5rem] right-[max(1rem,calc(50%-28rem))] z-[23] flex items-center gap-1 rounded-full border border-violet-400/20 bg-[#12101f]/75 px-3 py-1.5 text-[10px] text-violet-100 backdrop-blur-md hover:bg-[#1a1628]/85"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Học · {bridgeVisitedLessonsForEntity}/{effectiveLessonLinks.length}
        </button>
      ) : null}

      <ExploreBridgeQuiz
        open={bridgeQuizPromptOpen}
        entityLabel={label}
        entityId={bridgeEntityId}
        questions={bridgeQuizQuestions}
        loggedIn={Boolean(user)}
        onDismiss={() => setBridgeQuizPromptOpen(false)}
        onComplete={(result) => {
          handleQuizComplete(result)
          panelLearning.refreshConceptStates()
        }}
      />
    </>
  )
}
