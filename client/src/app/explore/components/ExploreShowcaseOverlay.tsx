'use client'

import { useCallback, useMemo, useState } from 'react'
import { ShowcaseEntityPanel } from '@/components/3d/showcase/ShowcaseEntityPanel'
import {
  listShowcaseSatellitesForPlanet,
  resolveExplorePanelConfig,
  resolveShowcaseHostPlanetName,
  getShowcaseStoryById,
} from '@/features/content3d/showcase/public'
import { entityNeedsOrbitUnlock } from '@/features/content3d/showcase/lib/filterShowcaseOrbits'
import { useToast } from '@/design-system'
import type { ExplorePageModel } from '../hooks/useExplorePage'
import { useExplorePanelLearning } from '../hooks/useExplorePanelLearning'
import { ExploreShowcaseMenu } from './ExploreShowcaseMenu'
import { ExploreViewToggle } from './ExploreViewToggle'
import { isSkyOnlyTarget, mergeExplorePreservedParams } from '@/features/explore/public'
import { ExploreBridgeQuiz } from './ExploreBridgeQuiz'
import { ExploreLearningSteps } from './ExploreLearningSteps'
import { ExploreConceptChips } from './ExploreConceptChips'
import { ExploreStoryTourOverlay } from './ExploreStoryTourOverlay'
import { ExploreStoryTourPicker } from './ExploreStoryTourPicker'
import { ExplorePassportOverlay } from './ExplorePassportOverlay'
import { completeStoryTour } from '@/features/explore/lib/explorePassportActions'
import { resolveStoryUnlockEntityId } from '@/features/content3d/showcase/lib/filterShowcaseOrbits'

type Props = Pick<
  ExplorePageModel,
  | 'user'
  | 'gemBalance'
  | 'bridgeDebugOn'
  | 'bridgeDebugEntries'
  | 'showcaseActiveItemId'
  | 'effectiveLessonLinks'
  | 'bridgeVisitedLessonsForEntity'
  | 'activeResolved'
  | 'activeEntityHasDeepHistory'
  | 'openPlanetHistory'
  | 'showcaseMenuOpen'
  | 'setShowcaseMenuOpen'
  | 'resolvedCatalog'
  | 'showcaseContent'
  | 'handleShowcaseEntityClicked'
  | 'syncSelectedPlanetFromItem'
  | 'activeOrbitEntity'
  | 'museumLabelVi'
  | 'effectiveConceptCards'
  | 'activeContentRow'
  | 'gamificationStrip'
  | 'storyViewModels'
  | 'unlockStory'
  | 'unlockOrbit'
  | 'isOrbitUnlocked'
  | 'unlockPending'
  | 'orbitCost'
  | 'storyCost'
  | 'refreshGemBalance'
  | 'visibleOrbitEntities'
  | 'summary'
  | 'router'
  | 'pathname'
  | 'searchParams'
  | 'bridgeQuizPromptOpen'
  | 'setBridgeQuizPromptOpen'
  | 'bridgeQuizQuestions'
  | 'handleQuizComplete'
  | 'mergedOrbitEntities'
  | 'modules'
  | 'panelReadComplete'
  | 'markPanelReadComplete'
  | 'openBridgeQuiz'
  | 'entityQuizCompleted'
  | 'exploreView'
  | 'navigateExploreView'
  | 'openSkyForEntity'
  | 'skyActiveTargetId'
> & {
  tourOpen: boolean
  onOpenTour?: () => void
}

export function ExploreShowcaseOverlay(props: Props) {
  const {
    user,
    gemBalance,
    bridgeDebugOn,
    bridgeDebugEntries,
    showcaseActiveItemId,
    effectiveLessonLinks,
    bridgeVisitedLessonsForEntity,
    activeResolved,
    activeEntityHasDeepHistory,
    openPlanetHistory,
    showcaseMenuOpen,
    setShowcaseMenuOpen,
    resolvedCatalog,
    showcaseContent,
    handleShowcaseEntityClicked,
    syncSelectedPlanetFromItem,
    activeOrbitEntity,
    museumLabelVi,
    effectiveConceptCards,
    activeContentRow,
    gamificationStrip,
    storyViewModels,
    unlockStory,
    unlockOrbit,
    isOrbitUnlocked,
    unlockPending,
    orbitCost,
    storyCost,
    refreshGemBalance,
    visibleOrbitEntities,
    summary,
    router,
    pathname,
    searchParams,
    bridgeQuizPromptOpen,
    setBridgeQuizPromptOpen,
    bridgeQuizQuestions,
    handleQuizComplete,
    mergedOrbitEntities,
    tourOpen,
    onOpenTour,
    modules,
    panelReadComplete,
    markPanelReadComplete,
    openBridgeQuiz,
    entityQuizCompleted,
    exploreView,
    navigateExploreView,
    openSkyForEntity,
    skyActiveTargetId,
  } = props

  const toast = useToast()
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null)
  const [storyPickerOpen, setStoryPickerOpen] = useState(false)
  const [passportOpen, setPassportOpen] = useState(false)

  const activeStory = useMemo(
    () => (activeStoryId ? getShowcaseStoryById(activeStoryId) : null),
    [activeStoryId],
  )

  const onOpenBridgeQuiz = useCallback(() => {
    if (!panelReadComplete) {
      toast.show('Đọc panel và bấm «Xong» ở bước «Đọc panel» trước', { tone: 'info' })
      return
    }
    if (openBridgeQuiz()) return
    toast.show('Giữ focus trên thiên thể vài giây để tải quiz ngữ cảnh', { tone: 'info' })
  }, [panelReadComplete, openBridgeQuiz, toast])

  const onMarkPanelRead = useCallback(() => {
    if (panelReadComplete) return
    markPanelReadComplete()
    toast.show('Đã ghi nhận — bạn có thể làm quiz ngữ cảnh', { tone: 'success' })
  }, [panelReadComplete, markPanelReadComplete, toast])

  const panelLearning = useExplorePanelLearning({
    userId: user?.id,
    entityDisplayName: activeResolved?.displayName ?? showcaseActiveItemId,
    conceptChips: effectiveConceptCards,
    lessonLinks: effectiveLessonLinks,
    modules,
    panelReadComplete,
    entityQuizCompleted,
    bridgeQuizOpen: bridgeQuizPromptOpen,
    onOpenBridgeQuiz,
    onMarkPanelRead,
    visitedLessonCount: bridgeVisitedLessonsForEntity,
  })

  const onBridgeQuizComplete = useCallback(
    (result: { correct: number; total: number; allCorrect: boolean }) => {
      handleQuizComplete(result)
      panelLearning.refreshConceptStates()
    },
    [handleQuizComplete, panelLearning],
  )

  const onMenuSelect = (entityId: string, source: string, syncPlanet?: boolean) => {
    const orbitLocked =
      Boolean(user) &&
      source !== 'story-tour' &&
      entityNeedsOrbitUnlock(entityId) &&
      !isOrbitUnlocked(entityId)

    handleShowcaseEntityClicked(entityId, source)
    if (syncPlanet) syncSelectedPlanetFromItem(entityId)

    if (orbitLocked) {
      toast.show(
        'Đã mở panel — bấm Mở quỹ đạo (gem) bên dưới để xem thiên thể này trong scene 3D.',
        { tone: 'info' },
      )
    }
  }

  const hostPlanetName = useMemo(
    () => resolveShowcaseHostPlanetName(activeResolved, activeOrbitEntity),
    [activeResolved, activeOrbitEntity],
  )

  const satelliteChildren = useMemo(() => {
    if (!hostPlanetName) return []
    return listShowcaseSatellitesForPlanet(visibleOrbitEntities, hostPlanetName).map((e) => ({
      id: e.id,
      name: e.name,
      active: showcaseActiveItemId === e.id,
    }))
  }, [hostPlanetName, visibleOrbitEntities, showcaseActiveItemId])

  const effectivePanelConfig = useMemo(
    () =>
      resolveExplorePanelConfig(
        activeResolved,
        activeOrbitEntity,
        activeContentRow?.panelConfig ?? null,
        museumLabelVi,
      ),
    [activeResolved, activeOrbitEntity, activeContentRow?.panelConfig, museumLabelVi],
  )

  const planetStories = useMemo(() => {
    if (!hostPlanetName) return []
    const key = hostPlanetName.toLowerCase()
    return storyViewModels.filter((s) => s.targetPlanetName.toLowerCase() === key)
  }, [hostPlanetName, storyViewModels])

  const enrichedGamification = useMemo(() => {
    if (!gamificationStrip || !activeResolved) return gamificationStrip
    return {
      ...gamificationStrip,
      storyCost,
      orbitCost,
      orbitUnlocked: isOrbitUnlocked(activeResolved.id),
      showOrbitUnlock: entityNeedsOrbitUnlock(activeResolved.id),
      planetStories,
      unlockPending,
      onUnlockStory: async (unlockEntityId: string) => {
        const res = await unlockStory(unlockEntityId)
        if (res.ok) {
          refreshGemBalance()
          toast.show('Đã mở story tour — bấm Phát tour để xem', { tone: 'success' })
        } else {
          toast.show(res.error || 'Không mở được story', { tone: 'danger' })
        }
      },
      onUnlockOrbit: async (entityId: string) => {
        const res = await unlockOrbit(entityId)
        if (res.ok) {
          refreshGemBalance()
          toast.show('Đã mở quỹ đạo trong scene 3D', { tone: 'success' })
          handleShowcaseEntityClicked(entityId, 'post-orbit-unlock')
          syncSelectedPlanetFromItem(entityId)
        } else {
          toast.show(res.error || 'Không mở được quỹ đạo', { tone: 'danger' })
        }
      },
      onPlayStory: (storyId: string) => setActiveStoryId(storyId),
    }
  }, [
    gamificationStrip,
    activeResolved,
    storyCost,
    orbitCost,
    isOrbitUnlocked,
    planetStories,
    unlockPending,
    unlockStory,
    unlockOrbit,
    refreshGemBalance,
    toast,
    handleShowcaseEntityClicked,
    syncSelectedPlanetFromItem,
  ])

  const navigateExploreHref = useCallback(
    (href: string) => {
      router.replace(mergeExplorePreservedParams(href, searchParams), { scroll: false })
      setPassportOpen(false)
    },
    [router, searchParams],
  )

  const handleStoryPickerUnlock = useCallback(
    async (unlockEntityId: string) => {
      const res = await unlockStory(unlockEntityId)
      if (res.ok) {
        refreshGemBalance()
        toast.show('Đã mở story — bấm Phát tour', { tone: 'success' })
      } else {
        toast.show(res.error || 'Không mở được story', { tone: 'danger' })
      }
    },
    [unlockStory, refreshGemBalance, toast],
  )

  return (
    <>
      <div
        className={`fixed top-14 left-0 right-0 border-b border-white/10 bg-black/35 backdrop-blur-sm pointer-events-auto ${
          showcaseMenuOpen ? 'z-[40]' : 'z-[22]'
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2 px-4 py-2 text-[11px]">
          <ExploreViewToggle
            exploreView={exploreView}
            onSelectView={(v) =>
              navigateExploreView(
                v,
                v === 'sky'
                  ? isSkyOnlyTarget(showcaseActiveItemId)
                    ? 'constellation-western-orion'
                    : showcaseActiveItemId
                  : skyActiveTargetId,
              )
            }
          />
          <div className="flex items-center gap-2">
            {(user || effectiveLessonLinks.length > 0) && (
              <div
                data-explore-tour="explore-progress-strip"
                className="flex items-center gap-2"
              >
                {user ? (
                  <span className="rounded border border-cyan-400/35 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-100 bg-cyan-950/45 tabular-nums">
                    {gemBalance} Gem
                  </span>
                ) : null}
                {effectiveLessonLinks.length > 0 ? (
                  <span className="rounded border border-emerald-300/35 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-100 bg-emerald-500/10">
                    Tiến độ {bridgeVisitedLessonsForEntity}/{effectiveLessonLinks.length}
                  </span>
                ) : null}
              </div>
            )}
            {!tourOpen && onOpenTour ? (
              <button
                type="button"
                onClick={onOpenTour}
                className="rounded border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-300 hover:bg-white/10 hover:text-cyan-100"
              >
                Hướng dẫn
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setStoryPickerOpen(true)}
              className="rounded border border-violet-400/30 px-2 py-1 text-[10px] uppercase tracking-wider text-violet-100 hover:bg-violet-500/15"
            >
              Story tour
            </button>
            <button
              type="button"
              onClick={() => setPassportOpen(true)}
              className="rounded border border-amber-400/30 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-100 hover:bg-amber-500/10 tabular-nums"
            >
              Sổ thám hiểm · {summary.counts.total}
            </button>
            <button
              type="button"
              data-explore-tour="explore-catalog-btn"
              onClick={() => setShowcaseMenuOpen((open) => !open)}
              className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wider ${
                showcaseMenuOpen
                  ? 'border-cyan-300/45 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/15 text-slate-300 hover:bg-white/10'
              }`}
            >
              {showcaseMenuOpen ? 'Đóng' : 'Danh mục'}
            </button>
          </div>
        </div>
      </div>

      <ExploreShowcaseMenu
        open={showcaseMenuOpen}
        activeEntityId={showcaseActiveItemId}
        resolvedCatalog={resolvedCatalog}
        showcaseContent={showcaseContent}
        onSelect={onMenuSelect}
        onClose={() => setShowcaseMenuOpen(false)}
      />

      {bridgeDebugOn ? (
        <aside className="fixed right-4 top-24 z-[24] w-[21rem] rounded-xl border border-white/15 bg-black/55 p-2.5 backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300">Gỡ lỗi cầu nối</p>
          <p className="mt-1 text-[10px] text-slate-500">
            entity={showcaseActiveItemId} | lessons={effectiveLessonLinks.length}
          </p>
          <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
            {bridgeDebugEntries.length > 0 ? (
              bridgeDebugEntries.map((line, idx) => (
                <p key={`${line}-${idx}`} className="text-[10px] text-slate-300">
                  {line}
                </p>
              ))
            ) : (
              <p className="text-[10px] text-slate-500">Chưa có event runtime.</p>
            )}
          </div>
        </aside>
      ) : null}

      {!bridgeDebugOn ? (
        <ShowcaseEntityPanel
          item={activeResolved}
          orbit={activeOrbitEntity}
          museumLabelVi={museumLabelVi}
          conceptChips={effectiveConceptCards}
          learningLinks={effectiveLessonLinks}
          panelConfig={effectivePanelConfig ?? undefined}
          gamification={enrichedGamification}
          hasDeepHistory={Boolean(activeResolved && activeEntityHasDeepHistory)}
          onOpenDeepHistory={
            activeResolved && activeEntityHasDeepHistory
              ? () => openPlanetHistory(activeResolved.id)
              : undefined
          }
          hostPlanetName={hostPlanetName}
          satelliteChildren={satelliteChildren}
          activeEntityId={showcaseActiveItemId}
          onSelectSatellite={(entityId) => onMenuSelect(entityId, 'panel-satellite', false)}
          crossViewSlot={
            activeResolved && !isSkyOnlyTarget(showcaseActiveItemId) ? (
              <button
                type="button"
                onClick={() => openSkyForEntity(showcaseActiveItemId)}
                className="mt-2 w-full rounded border border-violet-400/30 bg-violet-950/35 px-3 py-2 text-left text-[11px] text-violet-100 hover:bg-violet-900/40"
              >
                Xem trên bầu trời đêm (La bàn chòm sao) →
              </button>
            ) : null
          }
          learningStepsSlot={
            <ExploreLearningSteps
              steps={panelLearning.steps}
              onStepAction={panelLearning.onStepAction}
              loggedIn={Boolean(user)}
            />
          }
          conceptChipsSlot={
            <ExploreConceptChips
              chips={panelLearning.chipViews}
              loading={panelLearning.conceptsLoading}
              quizLoadingId={panelLearning.conceptQuizLoadingId}
              loggedIn={Boolean(user)}
              onChipClick={panelLearning.onConceptChipClick}
            />
          }
        />
      ) : null}

      <div
        data-explore-tour="explore-quiz-zone"
        className="pointer-events-none fixed bottom-6 right-4 z-[23] h-44 w-[min(20rem,calc(100vw-2rem))]"
        aria-hidden
      />

      <ExploreBridgeQuiz
        open={bridgeQuizPromptOpen}
        entityLabel={activeResolved?.displayName ?? ''}
        entityId={showcaseActiveItemId}
        questions={bridgeQuizQuestions}
        loggedIn={Boolean(user)}
        onDismiss={() => setBridgeQuizPromptOpen(false)}
        onComplete={onBridgeQuizComplete}
      />

      {activeStory && activeStory.waypoints && activeStory.waypoints.length > 0 ? (
        <ExploreStoryTourOverlay
          story={activeStory}
          orbitEntities={mergedOrbitEntities}
          onClose={() => setActiveStoryId(null)}
          onFocusEntity={(entityId) => onMenuSelect(entityId, 'story-tour', true)}
          onFinished={() => {
            completeStoryTour({
              userId: user?.id ?? null,
              storyId: activeStory.id,
              storyTitle: activeStory.title,
              unlockEntityId: resolveStoryUnlockEntityId(activeStory),
            })
            toast.show('Đã thêm stamp story tour vào sổ thám hiểm', { tone: 'success' })
          }}
        />
      ) : null}

      <ExploreStoryTourPicker
        open={storyPickerOpen}
        stories={storyViewModels}
        loggedIn={Boolean(user)}
        unlockPending={unlockPending}
        onClose={() => setStoryPickerOpen(false)}
        onPlay={setActiveStoryId}
        onUnlock={(id) => void handleStoryPickerUnlock(id)}
        onFocusPlanet={(entityId) => {
          onMenuSelect(entityId, 'story-picker', true)
          setStoryPickerOpen(false)
        }}
      />

      <ExplorePassportOverlay
        open={passportOpen}
        summary={summary}
        loggedIn={Boolean(user)}
        userDisplayName={user?.displayName}
        userId={user?.id}
        onClose={() => setPassportOpen(false)}
        onNavigate={navigateExploreHref}
      />
    </>
  )
}
