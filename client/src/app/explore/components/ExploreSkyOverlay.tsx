'use client'

import { useMemo, useState } from 'react'
import {
  Cloud,
  Compass,
  GraduationCap,
  MapPin,
  Sparkles,
  Sun,
  Telescope,
} from 'lucide-react'
import {
  countSkyHudEvents,
  ExploreSkyCalendarPanel,
} from '@/features/astronomy-calendar/public'
import { useUpcomingAstronomyCalendar } from '@/features/astronomy-calendar/hooks/useAstronomyCalendar'
import { computeSunSkyState } from '@/features/explore/lib/skyAstronomy'
import { showScreenWeatherLayers } from '@/features/explore/lib/skyTimeMode'
import { getSkyTargetLabel, resolveSolarEntityIdForTarget } from '@/features/explore/public'
import { SkyHudSheet } from '@/components/explore/SkyHudSheet'
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
  | 'jumpToSkyEvent'
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
  | 'skyWeather'
  | 'skyWeatherLoading'
>

type HudTab = 'none' | 'objects' | 'learn' | 'events'

export function ExploreSkyOverlay(props: Props) {
  const {
    user,
    gemBalance,
    exploreView,
    navigateExploreView,
    openSolarForTarget,
    selectSkyTarget,
    jumpToSkyEvent,
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
    skyWeather,
    skyWeatherLoading,
  } = props

  const [hudTab, setHudTab] = useState<HudTab>('none')
  const sunSky = computeSunSkyState(observer)
  const showWeatherClouds = showScreenWeatherLayers(sunSky)
  const label = getSkyTargetLabel(activeSkyTarget, skyActiveTargetId)
  const solarId = resolveSolarEntityIdForTarget(activeSkyTarget)

  const calendarQuery = useMemo(
    () => ({
      lat: observer.latDeg,
      lon: observer.lonDeg,
      tzOffsetMinutes: -observer.at.getTimezoneOffset(),
    }),
    [observer.latDeg, observer.lonDeg, observer.at],
  )

  const { data: eventsData, loading: eventsLoading } = useUpcomingAstronomyCalendar({
    days: 30,
    ...calendarQuery,
  })
  const eventBadge = countSkyHudEvents(eventsData)

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

  const toggleTab = (tab: HudTab) => setHudTab((t) => (t === tab ? 'none' : tab))

  return (
    <>
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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[24] pb-3 pt-20">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
          aria-hidden
        />

        <ExploreSkyCalendarPanel
          open={hudTab === 'events'}
          onClose={() => setHudTab('none')}
          query={calendarQuery}
          data={eventsData}
          loading={eventsLoading}
          onJumpToEvent={jumpToSkyEvent}
        />

        <SkyHudSheet
          open={hudTab === 'objects'}
          onClose={() => setHudTab('none')}
          subtitle="La bàn"
          title={label}
          maxHeightClass="max-h-[min(34vh,300px)]"
        >
          <div className="space-y-3">
            <section>
              <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Chòm sao
              </p>
              <div className="flex flex-wrap gap-1.5">
                {constellationTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectSkyTarget(t.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                      t.id === skyActiveTargetId
                        ? 'bg-sky-500/25 text-sky-100 ring-1 ring-sky-400/40'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {t.nameVi.replace(/^Chòm sao /, '')}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Hành tinh
              </p>
              <div className="flex flex-wrap gap-1.5">
                {bodyTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectSkyTarget(t.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                      t.id === skyActiveTargetId
                        ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {t.nameVi}
                  </button>
                ))}
              </div>
            </section>
            {solarId && activeResolved ? (
              <button
                type="button"
                onClick={() => openSolarForTarget(skyActiveTargetId, solarId)}
                className="w-full rounded-xl border border-cyan-400/25 bg-cyan-950/25 px-3 py-2 text-left text-xs text-cyan-100 hover:bg-cyan-900/35"
              >
                Mở {activeResolved.displayName ?? solarId} trong hệ Mặt Trời 3D →
              </button>
            ) : null}
          </div>
        </SkyHudSheet>

        <div className="pointer-events-auto relative mx-auto flex w-[min(40rem,calc(100vw-0.75rem))] items-end justify-between gap-2 px-1">
          <div className="flex min-w-0 max-w-[42%] flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-black/60 px-2.5 py-2 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0 text-sky-300/70" />
              <span className="truncate text-[11px] text-slate-200">{locationLabel}</span>
            </div>
            {skyWeatherLoading ? (
              <span className="text-[10px] text-slate-600">Thời tiết…</span>
            ) : skyWeather ? (
              <span className="flex items-center gap-1 truncate text-[10px] text-slate-500">
                <Cloud className="h-3 w-3 shrink-0" />
                {skyWeather.labelVi}
                {showWeatherClouds ? ` · ${skyWeather.cloudCoverPct}% mây` : ' · đêm'}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-0.5 rounded-2xl border border-white/[0.08] bg-black/65 p-1 backdrop-blur-md">
            {(
              [
                { id: 'events' as const, icon: Telescope, title: 'Sự kiện quan sát', badge: eventBadge },
                { id: 'objects' as const, icon: Sparkles, title: 'Chòm & hành tinh', badge: 0 },
                { id: 'learn' as const, icon: GraduationCap, title: 'Bài học', badge: 0 },
              ] as const
            ).map(({ id, icon: Icon, title, badge }) => (
              <button
                key={id}
                type="button"
                title={title}
                onClick={() => toggleTab(id)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  hudTab === id
                    ? 'bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/30'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {badge > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </button>
            ))}
            {user ? (
              <span className="ml-0.5 hidden items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-100/90 sm:flex">
                <Sun className="h-3 w-3" />
                {gemBalance}
              </span>
            ) : null}
          </div>

          <div className="shrink-0 rounded-xl border border-white/[0.08] bg-black/60 px-2.5 py-1.5 backdrop-blur-md">
            <ExploreSkyHudClock observer={observer} />
          </div>
        </div>

        <p className="pointer-events-none relative mt-2 text-center text-[10px] text-slate-600 px-4">
          <Compass className="mr-1 inline h-3 w-3 opacity-50" />
          Kéo để xoay · Cuộn để zoom
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
          className="pointer-events-auto fixed bottom-[4.75rem] right-[max(0.75rem,calc(50%-20rem))] z-[23] flex items-center gap-1 rounded-full border border-violet-400/20 bg-[#100e18]/80 px-3 py-1.5 text-[10px] text-violet-100 backdrop-blur-md hover:bg-[#161228]/90"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Bài học · {bridgeVisitedLessonsForEntity}/{effectiveLessonLinks.length}
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
