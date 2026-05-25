'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildContextualQuizFromLessons,
  getShowcaseMuseumLabelVi,
  guessEntityRarity,
  loadBridgeVisitedEntityMap,
  loadDiscoveryMap,
  resolveAllLessonsForEntity,
  resolveMappedConcepts,
  saveBridgeVisitedEntityMap,
  saveDiscoveryMap,
} from '@/features/content3d/showcase/public'
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
import { mcqAnswerIndex } from '@/shared/types/quizQuestion'
import type { QuizQuestion } from '@/shared/types/quizQuestion'
import { useToast } from '@/design-system'

const FOCUS_DELAY_SEC = 3

type BridgeArgs = {
  userId: string | undefined
  bridgeDebugOn: boolean
  earthHistoryOpen: boolean
  planetHistoryOpen: boolean
  showcaseActiveItemId: string
  modules: LearningModule[]
  concepts: LearningConcept[]
  activeContentRow: ShowcaseEntityContentDTO | null
  activeResolved: ResolvedNasaCatalogItem | null
}

export function useExploreLearningBridge({
  userId,
  bridgeDebugOn,
  earthHistoryOpen,
  planetHistoryOpen,
  showcaseActiveItemId,
  modules,
  concepts,
  activeContentRow,
  activeResolved,
}: BridgeArgs) {
  const toast = useToast()
  const [bridgeOverlayOpen, setBridgeOverlayOpen] = useState(false)
  const [bridgeOverlayEntityId, setBridgeOverlayEntityId] = useState<string | null>(null)
  const [bridgeQuizPromptOpen, setBridgeQuizPromptOpen] = useState(false)
  const [bridgeQuizQuestions, setBridgeQuizQuestions] = useState<QuizQuestion[]>([])
  const [bridgeQuizAnswers, setBridgeQuizAnswers] = useState<Record<string, number>>({})
  const [bridgeDebugEntries, setBridgeDebugEntries] = useState<string[]>([])
  const [visited3DMap, setVisited3DMap] = useState<LessonVisited3DMap>({})
  const bridgeFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bridgeQuizTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const bridgeConceptCards = useMemo(
    () => resolveMappedConcepts(concepts, showcaseActiveItemId).slice(0, 6),
    [concepts, showcaseActiveItemId],
  )

  const bridgeLessonLinks = useMemo(() => {
    const rows = resolveAllLessonsForEntity(modules, concepts, showcaseActiveItemId)
    return rows.map(({ lessonId, title, href }) => ({ lessonId, title, href }))
  }, [modules, concepts, showcaseActiveItemId])

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

  const effectiveConceptCards = useMemo(() => {
    const ids = activeContentRow?.panelConfig?.conceptTagIds || []
    if (!ids.length) return bridgeConceptCards
    const set = new Set(ids.map((x) => String(x || '').trim()))
    const picked = concepts.filter((c) => set.has(c.id))
    return picked.length ? picked.slice(0, 12) : bridgeConceptCards
  }, [activeContentRow?.panelConfig?.conceptTagIds, bridgeConceptCards, concepts])

  const effectiveLessonLinks = useMemo(() => {
    const ids = activeContentRow?.panelConfig?.lessonIds || []
    if (!ids.length) return bridgeLessonLinks
    const out = ids
      .map((id) => lessonLinkById.get(String(id || '').trim()))
      .filter((x): x is { lessonId: string; title: string; href: string } => Boolean(x))
    return out.length ? out : bridgeLessonLinks
  }, [activeContentRow?.panelConfig?.lessonIds, bridgeLessonLinks, lessonLinkById])

  const bridgeVisitedLessonsForEntity = useMemo(
    () => effectiveLessonLinks.filter((row) => visited3DMap[row.lessonId]).length,
    [effectiveLessonLinks, visited3DMap],
  )

  const museumLabelVi = useMemo(
    () =>
      getShowcaseMuseumLabelVi(
        showcaseActiveItemId,
        activeResolved?.displayName ?? '',
        activeResolved?.museumBlurbVi,
      ),
    [showcaseActiveItemId, activeResolved?.displayName, activeResolved?.museumBlurbVi],
  )

  const bridgeQuizScore = useMemo(() => {
    const answered = bridgeQuizQuestions.filter((q) => bridgeQuizAnswers[q.id] !== undefined).length
    const correct = bridgeQuizQuestions.filter((q) => bridgeQuizAnswers[q.id] === mcqAnswerIndex(q)).length
    return { answered, correct, total: bridgeQuizQuestions.length }
  }, [bridgeQuizQuestions, bridgeQuizAnswers])

  useEffect(() => {
    if (bridgeFocusTimerRef.current) clearTimeout(bridgeFocusTimerRef.current)
    if (bridgeQuizTimerRef.current) clearTimeout(bridgeQuizTimerRef.current)
    setBridgeOverlayOpen(false)
    setBridgeQuizPromptOpen(false)
    if (earthHistoryOpen || planetHistoryOpen || !showcaseActiveItemId) return

    bridgeFocusTimerRef.current = setTimeout(() => {
      setBridgeOverlayEntityId(showcaseActiveItemId)
      setBridgeOverlayOpen(true)
      trackLearningPathBehavior({
        eventName: 'scene_entity_focus_duration',
        metadata: {
          schemaVersion: 'scene_event_v2',
          entityId: showcaseActiveItemId,
          durationSec: FOCUS_DELAY_SEC,
          mode: 'showcase',
        },
      })
      trackLearningPathBehavior({
        eventName: 'scene_concept_overlay_shown',
        metadata: {
          schemaVersion: 'scene_event_v2',
          entityId: showcaseActiveItemId,
          conceptIds: effectiveConceptCards.map((c) => c.id),
        },
      })

      const visitedEntities = loadBridgeVisitedEntityMap(userId ?? null)
      if (!visitedEntities[showcaseActiveItemId]) {
        const nextVisited = { ...visitedEntities, [showcaseActiveItemId]: true }
        saveBridgeVisitedEntityMap(nextVisited, userId ?? null)
        const discovered = loadDiscoveryMap(userId ?? null)
        if (!discovered[showcaseActiveItemId]) {
          const nextDiscovered = { ...discovered, [showcaseActiveItemId]: true }
          saveDiscoveryMap(nextDiscovered, userId ?? null)
          const rarity = guessEntityRarity(showcaseActiveItemId)
          toast.show(`Unlock: ${showcaseActiveItemId} • rarity: ${rarity}`, { tone: 'info' })
          trackLearningPathBehavior({
            eventName: 'scene_entity_discovered',
            metadata: { schemaVersion: 'scene_event_v2', entityId: showcaseActiveItemId, rarity },
          })
        }
      }

      if (effectiveLessonLinks.length > 0) {
        const uid = userId ?? null
        let nextVisited3D = loadLessonVisited3D(uid)
        for (const row of effectiveLessonLinks) {
          nextVisited3D = setLessonVisited3D(nextVisited3D, row.lessonId, true)
        }
        saveLessonVisited3D(nextVisited3D, uid)
        setVisited3DMap(nextVisited3D)
        void pushVisited3DLessonIdsMerge(uid)
        window.dispatchEvent(new Event('lp-progress-changed'))
      }

      const contextual = buildContextualQuizFromLessons(
        modules,
        effectiveLessonLinks.map((r) => r.lessonId),
        2,
      )
      if (contextual.length >= 1) {
        bridgeQuizTimerRef.current = setTimeout(() => {
          setBridgeQuizQuestions(contextual)
          setBridgeQuizAnswers({})
          setBridgeQuizPromptOpen(true)
          trackLearningPathBehavior({
            eventName: 'scene_contextual_quiz_prompted',
            metadata: {
              schemaVersion: 'scene_event_v2',
              entityId: showcaseActiveItemId,
              questionCount: contextual.length,
            },
          })
        }, 3000)
      }
    }, FOCUS_DELAY_SEC * 1000)

    return () => {
      if (bridgeFocusTimerRef.current) clearTimeout(bridgeFocusTimerRef.current)
      if (bridgeQuizTimerRef.current) clearTimeout(bridgeQuizTimerRef.current)
    }
  }, [
    earthHistoryOpen,
    planetHistoryOpen,
    showcaseActiveItemId,
    effectiveConceptCards,
    effectiveLessonLinks,
    modules,
    userId,
    toast,
  ])

  return {
    bridgeOverlayOpen,
    bridgeOverlayEntityId,
    bridgeQuizPromptOpen,
    setBridgeQuizPromptOpen,
    bridgeQuizQuestions,
    bridgeQuizAnswers,
    setBridgeQuizAnswers,
    bridgeDebugEntries,
    pushBridgeDebug,
    effectiveConceptCards,
    effectiveLessonLinks,
    bridgeVisitedLessonsForEntity,
    museumLabelVi,
    bridgeQuizScore,
  }
}
