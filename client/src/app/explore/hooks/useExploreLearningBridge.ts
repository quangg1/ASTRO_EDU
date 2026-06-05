'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildExploreContextualQuiz,
  fetchExploreContextualQuiz,
  getShowcaseMuseumLabelVi,
  guessEntityRarity,
  loadBridgeVisitedEntityMap,
  loadDiscoveryMap,
  resolveAllLessonsForEntity,
  resolveMappedConcepts,
  saveBridgeVisitedEntityMap,
  saveDiscoveryMap,
} from '@/features/content3d/showcase/public'
import type { ExploreView, SkyExploreTarget } from '@/features/explore/public'
import { getSkyTargetLabel } from '@/features/explore/public'
import {
  loadLessonVisited3D,
  pushVisited3DLessonIdsMerge,
  saveLessonVisited3D,
  setLessonVisited3D,
  syncLearningPathCompletion,
  trackLearningPathBehavior,
  type LessonVisited3DMap,
} from '@/features/learning-path/public'
import type { LearningConcept } from '@/data/learningPathCurriculum'
import type { LearningModule } from '@/data/learningPathCurriculum'
import type { ShowcaseEntityContentDTO } from '@/features/content3d/showcase/public'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import type { QuizQuestion } from '@/shared/types/quizQuestion'
import { postExploreLearningStateEvent } from '@/features/learning-state/public'
import {
  loadExploreContextualQuizDoneToday,
  saveExploreContextualQuizDoneToday,
} from '../lib/exploreQuizProgress'
import { useToast } from '@/design-system'

const FOCUS_DELAY_SEC = 3

type BridgeArgs = {
  userId: string | undefined
  bridgeDebugOn: boolean
  earthHistoryOpen: boolean
  planetHistoryOpen: boolean
  exploreView: ExploreView
  activeTargetId: string
  bridgeEntityId: string
  activeSkyTarget: SkyExploreTarget | null
  skyTargets: SkyExploreTarget[]
  modules: LearningModule[]
  concepts: LearningConcept[]
  activeContentRow: ShowcaseEntityContentDTO | null
  activeResolved: ResolvedNasaCatalogItem | null
  activeOrbitEntity: ShowcaseOrbitEntity | null
  resolvedCatalog: ResolvedNasaCatalogItem[]
}

export function useExploreLearningBridge({
  userId,
  bridgeDebugOn,
  earthHistoryOpen,
  planetHistoryOpen,
  exploreView,
  activeTargetId,
  bridgeEntityId,
  activeSkyTarget,
  skyTargets,
  modules,
  concepts,
  activeContentRow,
  activeResolved,
  activeOrbitEntity,
  resolvedCatalog,
}: BridgeArgs) {
  const toast = useToast()
  const [bridgeQuizPromptOpen, setBridgeQuizPromptOpen] = useState(false)
  const [bridgeQuizQuestions, setBridgeQuizQuestions] = useState<QuizQuestion[]>([])
  const [exploreFocusReady, setExploreFocusReady] = useState(false)
  const [entityQuizCompleted, setEntityQuizCompleted] = useState(false)
  const [bridgeDebugEntries, setBridgeDebugEntries] = useState<string[]>([])
  const [visited3DMap, setVisited3DMap] = useState<LessonVisited3DMap>({})
  const bridgeFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bridgeQuizTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeEntityRef = useRef(activeTargetId)
  activeEntityRef.current = activeTargetId
  const bridgeMode = exploreView === 'sky' ? 'sky' : 'showcase'

  const pushBridgeDebug = useCallback(
    (msg: string) => {
      if (!bridgeDebugOn) return
      const stamp = new Date().toLocaleTimeString('vi-VN', { hour12: false })
      setBridgeDebugEntries((prev) => [`${stamp} ${msg}`, ...prev].slice(0, 8))
    },
    [bridgeDebugOn],
  )

  useEffect(() => {
    setVisited3DMap(loadLessonVisited3D(userId ?? null))
    if (!userId) return
    void syncLearningPathCompletion(userId).then(() => {
      setVisited3DMap(loadLessonVisited3D(userId))
    })
  }, [userId])

  const skyConceptExtraHints = useMemo(() => {
    if (exploreView !== 'sky') return null
    return activeSkyTarget?.conceptHints ?? null
  }, [exploreView, activeSkyTarget?.conceptHints])

  const bridgeConceptCards = useMemo(
    () => resolveMappedConcepts(concepts, bridgeEntityId, skyConceptExtraHints).slice(0, 6),
    [concepts, bridgeEntityId, skyConceptExtraHints],
  )

  const skyPeerTargets = useMemo(
    () =>
      skyTargets.filter(
        (t) => t.kind === 'constellation' && t.id !== activeSkyTarget?.id,
      ),
    [skyTargets, activeSkyTarget?.id],
  )

  const bridgeLessonLinks = useMemo(() => {
    const rows = resolveAllLessonsForEntity(
      modules,
      concepts,
      bridgeEntityId,
      skyConceptExtraHints,
    )
    return rows.map(({ lessonId, title, href }) => ({ lessonId, title, href }))
  }, [modules, concepts, bridgeEntityId, skyConceptExtraHints])

  const lessonLinkById = useMemo(() => {
    const m = new Map<string, { lessonId: string; title: string; href: string }>()
    for (const mod of modules) {
      for (const node of mod.nodes) {
        for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
          for (const lesson of node.depths[depth] || []) {
            const lessonId = lesson.id
            if (!lessonId || m.has(lessonId)) continue
            m.set(lessonId, {
              lessonId,
              title: lesson.titleVi || lesson.title || lessonId,
              href: `/tutorial/${mod.id}/${node.id}/${encodeURIComponent(lessonId)}`,
            })
          }
        }
      }
    }
    return m
  }, [modules])

  const skyPanelConfig = exploreView === 'sky' ? activeSkyTarget?.panelConfig ?? null : null

  const effectiveConceptCards = useMemo(() => {
    const ids =
      exploreView === 'sky'
        ? skyPanelConfig?.conceptTagIds || []
        : activeContentRow?.panelConfig?.conceptTagIds || []
    if (!ids.length) return bridgeConceptCards
    const set = new Set(ids.map((x) => String(x || '').trim()))
    const picked = concepts.filter((c) => set.has(c.id))
    return picked.length ? picked.slice(0, 12) : bridgeConceptCards
  }, [
    exploreView,
    skyPanelConfig?.conceptTagIds,
    activeContentRow?.panelConfig?.conceptTagIds,
    bridgeConceptCards,
    concepts,
  ])

  const effectiveLessonLinks = useMemo(() => {
    const ids =
      exploreView === 'sky'
        ? skyPanelConfig?.lessonIds || []
        : activeContentRow?.panelConfig?.lessonIds || []
    if (!ids.length) return bridgeLessonLinks
    const out = ids
      .map((id) => lessonLinkById.get(String(id || '').trim()))
      .filter((x): x is { lessonId: string; title: string; href: string } => Boolean(x))
    return out.length ? out : bridgeLessonLinks
  }, [
    exploreView,
    skyPanelConfig?.lessonIds,
    activeContentRow?.panelConfig?.lessonIds,
    bridgeLessonLinks,
    lessonLinkById,
  ])

  const bridgeVisitedLessonsForEntity = useMemo(
    () => effectiveLessonLinks.filter((row) => visited3DMap[row.lessonId]).length,
    [effectiveLessonLinks, visited3DMap],
  )

  const museumLabelVi = useMemo(() => {
    if (exploreView === 'sky') {
      const id = activeSkyTarget?.id ?? activeTargetId
      const name = getSkyTargetLabel(activeSkyTarget, activeTargetId)
      const skyBlurb = activeSkyTarget?.museumBlurbVi
      if (skyBlurb?.trim()) {
        return getShowcaseMuseumLabelVi(id, name, skyBlurb)
      }
      if (activeSkyTarget?.kind === 'body' && activeResolved) {
        return getShowcaseMuseumLabelVi(
          bridgeEntityId,
          activeResolved.displayName ?? name,
          activeResolved.museumBlurbVi,
        )
      }
      return getShowcaseMuseumLabelVi(id, name, null)
    }
    return getShowcaseMuseumLabelVi(
      bridgeEntityId,
      activeResolved?.displayName ?? '',
      activeResolved?.museumBlurbVi,
    )
  }, [
    exploreView,
    activeSkyTarget,
    activeTargetId,
    bridgeEntityId,
    activeResolved?.displayName,
    activeResolved?.museumBlurbVi,
  ])

  const focusDisplayName = useMemo(() => {
    if (exploreView === 'sky') return getSkyTargetLabel(activeSkyTarget, activeTargetId)
    return activeResolved?.displayName ?? activeTargetId
  }, [exploreView, activeSkyTarget, activeTargetId, activeResolved?.displayName])

  useEffect(() => {
    setExploreFocusReady(false)
    setEntityQuizCompleted(loadExploreContextualQuizDoneToday(activeTargetId, userId ?? null))
  }, [activeTargetId, userId])

  useEffect(() => {
    if (bridgeFocusTimerRef.current) clearTimeout(bridgeFocusTimerRef.current)
    if (bridgeQuizTimerRef.current) clearTimeout(bridgeQuizTimerRef.current)
    setBridgeQuizPromptOpen(false)
    if (earthHistoryOpen || planetHistoryOpen || !activeTargetId) return

    bridgeFocusTimerRef.current = setTimeout(() => {
      setExploreFocusReady(true)
      const focusEntityId = activeTargetId
      const conceptIds = effectiveConceptCards.map((c) => c.id)
      const lessonIds = effectiveLessonLinks.map((l) => l.lessonId)
      const focusLsId = `explore_focus_${focusEntityId}_${Date.now()}`
      trackLearningPathBehavior({
        eventName: 'scene_entity_focus_duration',
        metadata: {
          schemaVersion: 'scene_event_v2',
          entityId: activeTargetId,
          durationSec: FOCUS_DELAY_SEC,
          mode: bridgeMode,
          exploreView,
          conceptIds,
          lessonIds,
          learningStateEventId: focusLsId,
        },
      })
      void postExploreLearningStateEvent(
        'explore_entity_focus',
        {
          entityId: focusEntityId,
          dwellSec: FOCUS_DELAY_SEC,
          conceptIds,
          lessonIds,
        },
        focusLsId,
      )
      trackLearningPathBehavior({
        eventName: 'scene_concept_overlay_shown',
        metadata: {
          schemaVersion: 'scene_event_v2',
          entityId: activeTargetId,
          conceptIds,
          exploreView,
        },
      })

      const visitedEntities = loadBridgeVisitedEntityMap(userId ?? null)
      if (!visitedEntities[activeTargetId]) {
        const nextVisited = { ...visitedEntities, [activeTargetId]: true }
        saveBridgeVisitedEntityMap(nextVisited, userId ?? null)
        const discovered = loadDiscoveryMap(userId ?? null)
        if (!discovered[activeTargetId]) {
          const nextDiscovered = { ...discovered, [activeTargetId]: true }
          saveDiscoveryMap(nextDiscovered, userId ?? null)
          const rarity = guessEntityRarity(activeTargetId)
          toast.show(`Khám phá mới: ${focusDisplayName}`, { tone: 'info' })
          const discLsId = `explore_disc_${activeTargetId}_${Date.now()}`
          trackLearningPathBehavior({
            eventName: 'scene_entity_discovered',
            metadata: {
              schemaVersion: 'scene_event_v2',
              entityId: activeTargetId,
              exploreView,
              rarity,
              conceptIds,
              lessonIds,
              learningStateEventId: discLsId,
            },
          })
          void postExploreLearningStateEvent(
            'explore_entity_discovered',
            {
              entityId: activeTargetId,
              conceptIds,
              lessonIds,
              exploreView,
            },
            discLsId,
          )
        }
      }

      const contextualFallback = () =>
        buildExploreContextualQuiz({
          entityId: bridgeEntityId,
          item: activeResolved,
          orbit: activeOrbitEntity,
          concepts: effectiveConceptCards,
          catalog: resolvedCatalog,
          limit: 2,
          skyTarget: exploreView === 'sky' ? activeSkyTarget : null,
          skyPeerTargets: exploreView === 'sky' ? skyPeerTargets : undefined,
        })

      bridgeQuizTimerRef.current = setTimeout(() => {
        void (async () => {
          if (loadExploreContextualQuizDoneToday(focusEntityId, userId ?? null)) return

          let contextual = contextualFallback()
          try {
            const pool = await fetchExploreContextualQuiz(bridgeEntityId)
            if (pool?.completedToday) {
              saveExploreContextualQuizDoneToday(focusEntityId, userId ?? null)
              setEntityQuizCompleted(true)
              return
            }
            if (pool?.questions?.length) contextual = pool.questions
          } catch {
            /* offline / API lỗi → template client */
          }
          if (focusEntityId !== activeEntityRef.current || contextual.length < 1) return
          setBridgeQuizQuestions(contextual)
          setBridgeQuizPromptOpen(true)
          trackLearningPathBehavior({
            eventName: 'scene_contextual_quiz_prompted',
            metadata: {
              schemaVersion: 'scene_event_v2',
              entityId: focusEntityId,
              questionCount: contextual.length,
            },
          })
        })()
      }, 3000)
    }, FOCUS_DELAY_SEC * 1000)

    return () => {
      if (bridgeFocusTimerRef.current) clearTimeout(bridgeFocusTimerRef.current)
      if (bridgeQuizTimerRef.current) clearTimeout(bridgeQuizTimerRef.current)
    }
  }, [
    earthHistoryOpen,
    planetHistoryOpen,
    activeTargetId,
    bridgeEntityId,
    bridgeMode,
    exploreView,
    effectiveConceptCards,
    effectiveLessonLinks,
    resolvedCatalog,
    activeOrbitEntity,
    activeResolved,
    activeSkyTarget,
    skyPeerTargets,
    userId,
    toast,
    focusDisplayName,
  ])

  const handleQuizComplete = useCallback(
    (result: { correct: number; total: number; allCorrect: boolean }) => {
      if (!activeTargetId) return

      setEntityQuizCompleted(true)
      saveExploreContextualQuizDoneToday(activeTargetId, userId ?? null)

      if (!userId) return

      const conceptIds = effectiveConceptCards.map((c) => c.id)
      const lessonIds = effectiveLessonLinks.map((l) => l.lessonId)
      const score =
        result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0

      const quizLsId = `explore_quiz_${activeTargetId}_${Date.now()}`
      void postExploreLearningStateEvent(
        'explore_quiz_submitted',
        {
          entityId: activeTargetId,
          exploreView,
          conceptIds,
          lessonIds,
          allCorrect: result.allCorrect,
          correctCount: result.correct,
          totalCount: result.total,
          score,
        },
        quizLsId,
      )

      if (result.allCorrect) {
        trackLearningPathBehavior({
          eventName: 'scene_contextual_quiz_passed',
          metadata: {
            schemaVersion: 'scene_event_v2',
            entityId: activeTargetId,
            exploreView,
            correctCount: result.correct,
            totalCount: result.total,
            conceptIds,
            lessonIds,
            learningStateEventId: quizLsId,
          },
        })
        if (lessonIds.length > 0) {
          const uid = userId
          let nextVisited3D = loadLessonVisited3D(uid)
          for (const lid of lessonIds) {
            nextVisited3D = setLessonVisited3D(nextVisited3D, lid, true)
          }
          saveLessonVisited3D(nextVisited3D, uid)
          setVisited3DMap(nextVisited3D)
          void pushVisited3DLessonIdsMerge(uid)
          window.dispatchEvent(new Event('lp-progress-changed'))
        }
      }
    },
    [userId, activeTargetId, exploreView, effectiveConceptCards, effectiveLessonLinks],
  )

  return {
    bridgeQuizPromptOpen,
    setBridgeQuizPromptOpen,
    bridgeQuizQuestions,
    bridgeDebugEntries,
    pushBridgeDebug,
    effectiveConceptCards,
    effectiveLessonLinks,
    bridgeVisitedLessonsForEntity,
    museumLabelVi,
    handleQuizComplete,
    exploreFocusReady,
    entityQuizCompleted,
  }
}
