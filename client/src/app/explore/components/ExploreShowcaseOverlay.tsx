'use client'

import { ShowcaseEntityPanel } from '@/components/3d/showcase/ShowcaseEntityPanel'
import {
  entityHasFossilsTab,
} from '@/app/studio/showcase-entities/entityHistoryCapability'
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
  | 'closePlanetHistory'
  | 'setEarthHistoryOpen'
  | 'showcaseMenuOpen'
  | 'setShowcaseMenuOpen'
  | 'catalogByGroup'
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
  | 'bridgeQuizAnswers'
  | 'setBridgeQuizAnswers'
  | 'bridgeQuizScore'
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
    closePlanetHistory,
    setEarthHistoryOpen,
    showcaseMenuOpen,
    setShowcaseMenuOpen,
    catalogByGroup,
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
    bridgeQuizAnswers,
    setBridgeQuizAnswers,
    bridgeQuizScore,
  } = props

  const onMenuSelect = (entityId: string, source: string, syncPlanet?: boolean) => {
    handleShowcaseEntityClicked(entityId, source)
    if (syncPlanet) syncSelectedPlanetFromItem(entityId)
  }

  return (
    <>
      <div className="fixed top-14 left-0 right-0 z-[22] border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 py-2 flex items-center justify-end text-[11px]">
          <div className="flex items-center gap-2">
            {user ? (
              <span className="rounded border border-cyan-400/35 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-100 bg-cyan-950/45 tabular-nums">
                {gemBalance} gem
              </span>
            ) : null}
            {effectiveLessonLinks.length > 0 ? (
              <span className="rounded border border-emerald-300/35 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-100 bg-emerald-500/10">
                Progress {bridgeVisitedLessonsForEntity}/{effectiveLessonLinks.length}
              </span>
            ) : null}
            {activeResolved && activeEntityHasDeepHistory ? (
              <button
                type="button"
                onClick={() => openPlanetHistory(activeResolved.id)}
                className="rounded border border-violet-400/45 px-2 py-1 text-[10px] uppercase tracking-wider text-violet-50 hover:bg-violet-600/25"
              >
                Deep History
              </button>
            ) : null}
            {activeResolved && entityHasFossilsTab(activeResolved.id) ? (
              <button
                type="button"
                onClick={() => {
                  closePlanetHistory()
                  setEarthHistoryOpen(true)
                }}
                className="rounded border border-emerald-300/40 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-100 hover:bg-emerald-500/15"
              >
                Hóa thạch
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowcaseMenuOpen((v) => !v)}
              className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wider ${
                showcaseMenuOpen
                  ? 'border-cyan-300/45 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/15 text-slate-300 hover:bg-white/10'
              }`}
            >
              {showcaseMenuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
      </div>

      <ExploreShowcaseMenu
        open={showcaseMenuOpen}
        planetsMoons={catalogByGroup.planetsMoons}
        dwarfPlanets={catalogByGroup.dwarfPlanets}
        comets={catalogByGroup.comets}
        spacecraft={catalogByGroup.spacecraft}
        onSelect={onMenuSelect}
        onClose={() => setShowcaseMenuOpen(false)}
      />

      {bridgeDebugOn ? (
        <aside className="fixed right-4 top-24 z-[24] w-[21rem] rounded-xl border border-white/15 bg-black/55 p-2.5 backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300">Bridge debug</p>
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
          panelConfig={activeContentRow?.panelConfig ?? null}
          gamification={gamificationStrip}
        />
      ) : null}

      <ExploreBridgeQuiz
        open={bridgeQuizPromptOpen}
        entityLabel={activeResolved?.displayName ?? ''}
        entityId={showcaseActiveItemId}
        questions={bridgeQuizQuestions}
        answers={bridgeQuizAnswers}
        onAnswer={(questionId, optionIndex) =>
          setBridgeQuizAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
        }
        onClose={() => setBridgeQuizPromptOpen(false)}
        score={bridgeQuizScore}
      />
    </>
  )
}
