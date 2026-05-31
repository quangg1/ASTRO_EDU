'use client'

import { useMemo } from 'react'
import { ShowcaseEntityPanel } from '@/components/3d/showcase/ShowcaseEntityPanel'
import {
  listShowcaseSatellitesForPlanet,
  resolveExplorePanelConfig,
  resolveShowcaseHostPlanetName,
} from '@/features/content3d/showcase/public'
import type { ExplorePageModel } from '../hooks/useExplorePage'
import { ExploreShowcaseMenu } from './ExploreShowcaseMenu'
import { ExploreBridgeQuiz } from './ExploreBridgeQuiz'

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
>

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
  } = props

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
        <div className="mx-auto max-w-[1400px] px-4 py-2 flex items-center justify-end text-[11px]">
          <div className="flex items-center gap-2">
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
            <button
              type="button"
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
        />
      ) : null}

      <ExploreBridgeQuiz
        open={bridgeQuizPromptOpen}
        entityLabel={activeResolved?.displayName ?? ''}
        entityId={showcaseActiveItemId}
        questions={bridgeQuizQuestions}
        loggedIn={Boolean(user)}
        onDismiss={() => setBridgeQuizPromptOpen(false)}
        onComplete={handleQuizComplete}
      />
    </>
  )
}
