'use client'

import { useCallback, useMemo } from 'react'
import { ShowcaseEntityPanel } from '@/components/3d/showcase/ShowcaseEntityPanel'
import {
  listShowcaseSatellitesForPlanet,
  resolveExplorePanelConfig,
  resolveShowcaseHostPlanetName,
} from '@/features/content3d/showcase/public'
import { useToast } from '@/design-system'
import type { ExplorePageModel } from '../hooks/useExplorePage'
import { useExplorePanelLearning } from '../hooks/useExplorePanelLearning'
import { ExploreShowcaseMenu } from './ExploreShowcaseMenu'
import { ExploreViewToggle } from './ExploreViewToggle'
import { isSkyOnlyTarget } from '@/features/explore/public'
import { ExploreBridgeQuiz } from './ExploreBridgeQuiz'
import { ExploreLearningSteps } from './ExploreLearningSteps'
import { ExploreConceptChips } from './ExploreConceptChips'

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
  | 'bridgeQuizPromptOpen'
  | 'setBridgeQuizPromptOpen'
  | 'bridgeQuizQuestions'
  | 'handleQuizComplete'
  | 'mergedOrbitEntities'
  | 'modules'
  | 'exploreFocusReady'
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
    bridgeQuizPromptOpen,
    setBridgeQuizPromptOpen,
    bridgeQuizQuestions,
    handleQuizComplete,
    mergedOrbitEntities,
    tourOpen,
    onOpenTour,
    modules,
    exploreFocusReady,
    entityQuizCompleted,
    exploreView,
    navigateExploreView,
    openSkyForEntity,
    skyActiveTargetId,
  } = props

  const toast = useToast()

  const onOpenBridgeQuiz = useCallback(() => {
    if (bridgeQuizQuestions.length > 0) {
      setBridgeQuizPromptOpen(true)
      return
    }
    toast.show('Giữ focus trên thiên thể vài giây để mở quiz ngữ cảnh', { tone: 'info' })
  }, [bridgeQuizQuestions.length, setBridgeQuizPromptOpen, toast])

  const panelLearning = useExplorePanelLearning({
    userId: user?.id,
    entityDisplayName: activeResolved?.displayName ?? showcaseActiveItemId,
    conceptChips: effectiveConceptCards,
    lessonLinks: effectiveLessonLinks,
    modules,
    exploreFocusReady,
    entityQuizCompleted,
    bridgeQuizOpen: bridgeQuizPromptOpen,
    onOpenBridgeQuiz,
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
    handleShowcaseEntityClicked(entityId, source)
    if (syncPlanet) syncSelectedPlanetFromItem(entityId)
  }

  const hostPlanetName = useMemo(
    () => resolveShowcaseHostPlanetName(activeResolved, activeOrbitEntity),
    [activeResolved, activeOrbitEntity],
  )

  const satelliteChildren = useMemo(() => {
    if (!hostPlanetName) return []
    return listShowcaseSatellitesForPlanet(mergedOrbitEntities, hostPlanetName).map((e) => ({
      id: e.id,
      name: e.name,
      active: showcaseActiveItemId === e.id,
    }))
  }, [hostPlanetName, mergedOrbitEntities, showcaseActiveItemId])

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
          gamification={gamificationStrip}
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
    </>
  )
}
