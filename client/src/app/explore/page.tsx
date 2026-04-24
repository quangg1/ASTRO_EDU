'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Timeline } from '@/components/ui/Timeline'
import { InfoPanel } from '@/components/ui/InfoPanel'
import { FossilPanel } from '@/components/ui/FossilPanel'
import { Controls } from '@/components/ui/Controls'
import { Loading } from '@/components/ui/Loading'
import { useSimulatorStore } from '@/store/useSimulatorStore'
import { planetsData } from '@/lib/solarSystemData'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { NASA_SHOWCASE_ITEMS, NASA_SHOWCASE_STORIES } from '@/lib/nasaShowcaseCatalog'
import { useLearningPath } from '@/hooks/useLearningPath'
import type { LearningPathBridgeRule } from '@/lib/learningPathApi'
import { useShowcaseStore } from '@/store/showcaseStore'
import {
  buildContextualQuizFromLessons,
  guessEntityRarity,
  loadBridgeVisitedEntityMap,
  loadDiscoveryMap,
  resolveMappedConcepts,
  resolveMappedLessons,
  saveBridgeVisitedEntityMap,
  saveDiscoveryMap,
} from '@/lib/showcaseLearningBridge'
import {
  loadLessonVisited3D,
  saveLessonVisited3D,
  setLessonVisited3D,
  type LessonVisited3DMap,
} from '@/lib/learningPathProgress'
import { trackLearningPathBehavior } from '@/lib/learningPathBehavior'
import type { ShowcaseCameraSpherical } from '@/components/3d/showcase/ShowcaseCameraManager'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), {
  ssr: false,
  loading: () => <Loading />,
})
const ShowcaseScene = dynamic(() => import('@/components/3d/showcase/ShowcaseScene'), {
  ssr: false,
  loading: () => <Loading />,
})

type QuickQuizQuestion = {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

function ExplorePageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')
  const stageTime = stageParam != null ? parseFloat(stageParam) : null
  const bridgeDebugOn = searchParams.get('bridgeDebug') === '1'

  const [earthHistoryOpen, setEarthHistoryOpen] = useState(!!stageTime)
  const [showcaseMenuOpen, setShowcaseMenuOpen] = useState(false)
  const [showcaseActiveStoryId, setShowcaseActiveStoryId] = useState('story-artemis')
  const [showcaseActiveItemId, setShowcaseActiveItemId] = useState('planet-earth')
  const [selectedSolarPlanetIndex, setSelectedSolarPlanetIndex] = useState<number | null>(2)
  const [bridgeOverlayOpen, setBridgeOverlayOpen] = useState(false)
  const [bridgeOverlayEntityId, setBridgeOverlayEntityId] = useState<string | null>(null)
  const [bridgeQuizPromptOpen, setBridgeQuizPromptOpen] = useState(false)
  const [bridgeQuizQuestions, setBridgeQuizQuestions] = useState<QuickQuizQuestion[]>([])
  const [bridgeQuizAnswers, setBridgeQuizAnswers] = useState<Record<string, number>>({})
  const [bridgeDebugEntries, setBridgeDebugEntries] = useState<string[]>([])
  const [bridgeRuntimeHint, setBridgeRuntimeHint] = useState<string | null>(null)
  const [discoveryToast, setDiscoveryToast] = useState<{ entityId: string; rarity: 'common' | 'rare' | 'epic' } | null>(
    null,
  )
  const [visited3DMap, setVisited3DMap] = useState<LessonVisited3DMap>({})
  const bridgeFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bridgeQuizTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showcaseCameraUrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appliedStageRef = useRef<number | null>(null)

  const loadStages = useSimulatorStore((s) => s.loadStages)
  const stages = useSimulatorStore((s) => s.stages)
  const stagesLoading = useSimulatorStore((s) => s.stagesLoading)
  const setStage = useSimulatorStore((s) => s.setStage)
  const { modules, concepts, bridgeRules } = useLearningPath()

  useEffect(() => {
    setVisited3DMap(loadLessonVisited3D())
  }, [])

  useEffect(() => {
    if (!earthHistoryOpen) return
    loadStages()
  }, [earthHistoryOpen, loadStages])

  useEffect(() => {
    if (stageTime == null) {
      appliedStageRef.current = null
      return
    }
    if (stagesLoading || stages.length === 0) return
    if (appliedStageRef.current === stageTime) return
    const idx = stages.findIndex((s) => s.time === stageTime)
    const index =
      idx >= 0
        ? idx
        : stages.reduce(
            (best, s, i) =>
              Math.abs(s.time - stageTime) < Math.abs(stages[best].time - stageTime) ? i : best,
            0,
          )
    setStage(index)
    appliedStageRef.current = stageTime
  }, [stageTime, stagesLoading, stages, setStage])

  const activeShowcaseItem = NASA_SHOWCASE_ITEMS.find((i) => i.id === showcaseActiveItemId) ?? null
  const showcasePlanetsMoons = NASA_SHOWCASE_ITEMS.filter((i) => i.group === 'planets_moons')
  const showcaseDwarfPlanets = NASA_SHOWCASE_ITEMS.filter((i) => i.group === 'dwarf_asteroids')
  const showcaseComets = NASA_SHOWCASE_ITEMS.filter((i) => i.group === 'comets')
  const showcaseSpacecraft = NASA_SHOWCASE_ITEMS.filter((i) => i.group === 'spacecraft')

  const activeBridgeRules = useMemo(
    () =>
      (bridgeRules || []).filter(
        (r) => r.active !== false && String(r.entityId || '').trim() === showcaseActiveItemId,
      ),
    [bridgeRules, showcaseActiveItemId],
  )
  const hasBridgeRulesForEntity = activeBridgeRules.length > 0
  const actionRules = useMemo(
    () =>
      activeBridgeRules.reduce<Record<string, LearningPathBridgeRule[]>>((acc, rule) => {
        const key = String(rule.action || '')
        if (!acc[key]) acc[key] = []
        acc[key].push(rule)
        return acc
      }, {}),
    [activeBridgeRules],
  )
  const focusRules = useMemo(
    () =>
      activeBridgeRules.filter((r) => r.event === 'entity_focus_stable' || r.event === 'entity_focus_duration'),
    [activeBridgeRules],
  )
  const focusDelaySec = useMemo(() => {
    const secs = focusRules
      .map((r) => (Number.isFinite(Number(r.thresholdSec)) ? Number(r.thresholdSec) : null))
      .filter((v): v is number => v !== null && v > 0)
    return secs.length ? Math.max(1, Math.min(...secs)) : 3
  }, [focusRules])
  const shouldRunOverlay = !hasBridgeRulesForEntity || (actionRules.show_concept_overlay?.length ?? 0) > 0
  const shouldRunVisited3d = !hasBridgeRulesForEntity || (actionRules.mark_lessons_visited3d?.length ?? 0) > 0
  const shouldRunDiscovery = !hasBridgeRulesForEntity || (actionRules.unlock_discovery_badge?.length ?? 0) > 0
  const shouldRunContextualQuiz = !hasBridgeRulesForEntity || (actionRules.trigger_contextual_quiz?.length ?? 0) > 0
  const overlayRuleConceptIds = useMemo(
    () =>
      (actionRules.show_concept_overlay || [])
        .map((r) => String(r.conceptId || '').trim())
        .filter(Boolean),
    [actionRules.show_concept_overlay],
  )
  const bridgeConceptCards = useMemo(() => {
    if (overlayRuleConceptIds.length > 0) {
      const set = new Set(overlayRuleConceptIds)
      return concepts.filter((c) => set.has(c.id)).slice(0, 6)
    }
    return resolveMappedConcepts(concepts, showcaseActiveItemId).slice(0, 6)
  }, [concepts, showcaseActiveItemId, overlayRuleConceptIds])
  const bridgeLessonLinks = useMemo(
    () => resolveMappedLessons(modules, bridgeConceptCards.map((c) => c.id)).slice(0, 5),
    [modules, bridgeConceptCards],
  )
  const bridgeVisitedLessonsForEntity = useMemo(
    () => bridgeLessonLinks.filter((row) => visited3DMap[row.lessonId]).length,
    [bridgeLessonLinks, visited3DMap],
  )
  const bridgeEnabledActions = useMemo(() => {
    const out: string[] = []
    if (shouldRunOverlay) out.push('Concept overlay')
    if (shouldRunVisited3d) out.push('Progress sync')
    if (shouldRunContextualQuiz) out.push('Contextual quiz')
    if (shouldRunDiscovery) out.push('Discovery badge')
    return out
  }, [shouldRunOverlay, shouldRunVisited3d, shouldRunContextualQuiz, shouldRunDiscovery])
  const bridgeQuizScore = useMemo(() => {
    const answered = bridgeQuizQuestions.filter((q) => bridgeQuizAnswers[q.id] !== undefined).length
    const correct = bridgeQuizQuestions.filter((q) => bridgeQuizAnswers[q.id] === q.correctIndex).length
    return { answered, correct, total: bridgeQuizQuestions.length }
  }, [bridgeQuizQuestions, bridgeQuizAnswers])

  const pushBridgeDebug = useCallback(
    (msg: string) => {
      if (!bridgeDebugOn) return
      const stamp = new Date().toLocaleTimeString('vi-VN', { hour12: false })
      setBridgeDebugEntries((prev) => [`${stamp} ${msg}`, ...prev].slice(0, 8))
    },
    [bridgeDebugOn],
  )

  const openEarthHistoryFromItem = useCallback(
    (entityId: string) => {
      const item = NASA_SHOWCASE_ITEMS.find((x) => x.id === entityId)
      const planetName = item?.linkedPlanetName
      if (!planetName) return
      const idx = planetsData.findIndex((p) => p.name === planetName)
      if (idx >= 0) setSelectedSolarPlanetIndex(idx)
      if (planetName === 'Earth') setEarthHistoryOpen(true)
    },
    [],
  )

  const handleShowcaseEntityClicked = useCallback(
    (entityId: string, source: string) => {
      setShowcaseActiveItemId(entityId)
      const clickedRules = (bridgeRules || []).filter(
        (r) => r.active !== false && String(r.entityId || '').trim() === entityId && r.event === 'entity_clicked',
      )
      const clickActionSet = new Set(clickedRules.map((r) => r.action))
      const hasClickRules = clickedRules.length > 0
      trackLearningPathBehavior({
        eventName: 'scene_entity_clicked',
        metadata: { schemaVersion: 'scene_event_v1', entityId, source, hasClickRules },
      })
      pushBridgeDebug(`click ${entityId} (${source})`)
      if (!hasClickRules) return

      const clickOverlayConceptIds = clickedRules
        .filter((r) => r.action === 'show_concept_overlay')
        .map((r) => String(r.conceptId || '').trim())
        .filter(Boolean)
      const clickConceptCards =
        clickOverlayConceptIds.length > 0
          ? concepts.filter((c) => clickOverlayConceptIds.includes(c.id))
          : resolveMappedConcepts(concepts, entityId)
      const clickLessonLinks = resolveMappedLessons(modules, clickConceptCards.map((c) => c.id))

      if (clickActionSet.has('show_concept_overlay')) {
        setBridgeOverlayEntityId(entityId)
        setBridgeOverlayOpen(true)
        setBridgeRuntimeHint('Đã mở concept overlay theo rule click.')
      }
      if (clickActionSet.has('mark_lessons_visited3d') && clickLessonLinks.length > 0) {
        let nextVisited3D = loadLessonVisited3D()
        for (const row of clickLessonLinks) nextVisited3D = setLessonVisited3D(nextVisited3D, row.lessonId, true)
        saveLessonVisited3D(nextVisited3D)
        setVisited3DMap(nextVisited3D)
        setBridgeRuntimeHint(`Đã sync tiến độ 3D cho ${clickLessonLinks.length} lesson.`)
      }
      if (clickActionSet.has('trigger_contextual_quiz')) {
        const contextual = buildContextualQuizFromLessons(modules, clickLessonLinks.map((r) => r.lessonId), 2)
        if (contextual.length > 0) {
          setBridgeQuizQuestions(contextual)
          setBridgeQuizAnswers({})
          setBridgeQuizPromptOpen(true)
          trackLearningPathBehavior({
            eventName: 'scene_contextual_quiz_prompted',
            metadata: { schemaVersion: 'scene_event_v1', entityId, questionCount: contextual.length, source: 'click-rule' },
          })
          setBridgeRuntimeHint(`Đã bật quiz ngữ cảnh (${contextual.length} câu).`)
        }
      }
      if (clickActionSet.has('unlock_discovery_badge')) {
        const discovered = loadDiscoveryMap()
        if (!discovered[entityId]) {
          const nextDiscovered = { ...discovered, [entityId]: true }
          saveDiscoveryMap(nextDiscovered)
          setDiscoveryToast({ entityId, rarity: guessEntityRarity(entityId) })
          setBridgeRuntimeHint('Đã unlock discovery badge.')
        }
      }
    },
    [bridgeRules, concepts, modules, pushBridgeDebug],
  )

  const distQ = searchParams.get('dist')
  const azQ = searchParams.get('az')
  const elQ = searchParams.get('el')
  const initialShowcaseSpherical = useMemo((): ShowcaseCameraSpherical | null => {
    if (distQ == null || azQ == null || elQ == null) return null
    const distance = parseFloat(distQ)
    const az = parseFloat(azQ)
    const el = parseFloat(elQ)
    if (!Number.isFinite(distance) || !Number.isFinite(az) || !Number.isFinite(el)) return null
    return { distance, az, el }
  }, [distQ, azQ, elQ])

  const handleShowcaseCameraSettled = useCallback(
    (sph: ShowcaseCameraSpherical) => {
      if (showcaseCameraUrlTimerRef.current) clearTimeout(showcaseCameraUrlTimerRef.current)
      showcaseCameraUrlTimerRef.current = setTimeout(() => {
        showcaseCameraUrlTimerRef.current = null
        const next = new URLSearchParams(searchParams.toString())
        next.set('dist', sph.distance.toFixed(2))
        next.set('az', sph.az.toFixed(1))
        next.set('el', sph.el.toFixed(1))
        const updated = next.toString()
        if (updated === searchParams.toString()) return
        router.replace(`${pathname}?${updated}`, { scroll: false })
      }, 280)
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    const entityParam = searchParams.get('entity') || ''
    if (!entityParam) return
    const exists = NASA_SHOWCASE_ITEMS.some((item) => item.id === entityParam)
    if (exists) setShowcaseActiveItemId(entityParam)
  }, [searchParams])

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('mode', 'showcase')
    if (showcaseActiveItemId) {
      next.set('entity', showcaseActiveItemId)
      const item = NASA_SHOWCASE_ITEMS.find((x) => x.id === showcaseActiveItemId)
      if (item?.group) next.set('group', item.group)
      if (item?.linkedPlanetName) next.set('target', item.linkedPlanetName.toLowerCase())
    }
    const updated = next.toString()
    if (updated === searchParams.toString()) return
    router.replace(`${pathname}?${updated}`, { scroll: false })
  }, [pathname, router, searchParams, showcaseActiveItemId])

  useEffect(() => {
    if (bridgeFocusTimerRef.current) clearTimeout(bridgeFocusTimerRef.current)
    if (bridgeQuizTimerRef.current) clearTimeout(bridgeQuizTimerRef.current)
    setBridgeOverlayOpen(false)
    setBridgeQuizPromptOpen(false)
    if (earthHistoryOpen || !showcaseActiveItemId) return

    bridgeFocusTimerRef.current = setTimeout(() => {
      if (shouldRunOverlay) {
        setBridgeOverlayEntityId(showcaseActiveItemId)
        setBridgeOverlayOpen(true)
      }
      trackLearningPathBehavior({
        eventName: 'scene_entity_focus_duration',
        metadata: { schemaVersion: 'scene_event_v1', entityId: showcaseActiveItemId, durationSec: focusDelaySec, mode: 'showcase' },
      })
      if (shouldRunOverlay) {
        trackLearningPathBehavior({
          eventName: 'scene_concept_overlay_shown',
          metadata: {
            schemaVersion: 'scene_event_v1',
            entityId: showcaseActiveItemId,
            conceptIds: bridgeConceptCards.map((c) => c.id),
          },
        })
      }

      const visitedEntities = loadBridgeVisitedEntityMap()
      if (shouldRunDiscovery && !visitedEntities[showcaseActiveItemId]) {
        const nextVisited = { ...visitedEntities, [showcaseActiveItemId]: true }
        saveBridgeVisitedEntityMap(nextVisited)
        const discovered = loadDiscoveryMap()
        if (!discovered[showcaseActiveItemId]) {
          const nextDiscovered = { ...discovered, [showcaseActiveItemId]: true }
          saveDiscoveryMap(nextDiscovered)
          const rarity = guessEntityRarity(showcaseActiveItemId)
          setDiscoveryToast({ entityId: showcaseActiveItemId, rarity })
          trackLearningPathBehavior({
            eventName: 'scene_entity_discovered',
            metadata: { schemaVersion: 'scene_event_v1', entityId: showcaseActiveItemId, rarity },
          })
        }
      }

      if (shouldRunVisited3d && bridgeLessonLinks.length > 0) {
        let nextVisited3D = loadLessonVisited3D()
        for (const row of bridgeLessonLinks) nextVisited3D = setLessonVisited3D(nextVisited3D, row.lessonId, true)
        saveLessonVisited3D(nextVisited3D)
        setVisited3DMap(nextVisited3D)
      }

      if (shouldRunContextualQuiz) {
        const contextual = buildContextualQuizFromLessons(modules, bridgeLessonLinks.map((r) => r.lessonId), 2)
        if (contextual.length >= 1) {
          bridgeQuizTimerRef.current = setTimeout(() => {
            setBridgeQuizQuestions(contextual)
            setBridgeQuizAnswers({})
            setBridgeQuizPromptOpen(true)
            trackLearningPathBehavior({
              eventName: 'scene_contextual_quiz_prompted',
              metadata: { schemaVersion: 'scene_event_v1', entityId: showcaseActiveItemId, questionCount: contextual.length },
            })
          }, 3000)
        }
      }
    }, focusDelaySec * 1000)

    return () => {
      if (bridgeFocusTimerRef.current) clearTimeout(bridgeFocusTimerRef.current)
      if (bridgeQuizTimerRef.current) clearTimeout(bridgeQuizTimerRef.current)
    }
  }, [
    earthHistoryOpen,
    showcaseActiveItemId,
    shouldRunOverlay,
    shouldRunDiscovery,
    shouldRunVisited3d,
    shouldRunContextualQuiz,
    focusDelaySec,
    bridgeConceptCards,
    bridgeLessonLinks,
    modules,
  ])

  useEffect(() => {
    if (!discoveryToast) return
    const t = setTimeout(() => setDiscoveryToast(null), 3200)
    return () => clearTimeout(t)
  }, [discoveryToast])
  useEffect(() => {
    if (!bridgeRuntimeHint) return
    const t = setTimeout(() => setBridgeRuntimeHint(null), 2600)
    return () => clearTimeout(t)
  }, [bridgeRuntimeHint])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black min-h-screen min-w-[320px]">
      <div className="canvas-container">
        <Suspense fallback={<Loading />}>
          {earthHistoryOpen ? (
            <EarthScene />
          ) : (
            <ShowcaseScene
              showcaseActiveItemId={showcaseActiveItemId}
              onShowcaseItemSelect={(id) => {
                handleShowcaseEntityClicked(id, 'scene')
                openEarthHistoryFromItem(id)
              }}
              flightTargetIndex={selectedSolarPlanetIndex}
              onPlanetSelect={(idx) => {
                setSelectedSolarPlanetIndex(idx)
                if (idx === null) return
                const planetName = planetsData[idx]?.name
                if (!planetName) return
                const planetItem = NASA_SHOWCASE_ITEMS.find(
                  (item) => item.group === 'planets_moons' && item.name === planetName,
                )
                if (planetItem) handleShowcaseEntityClicked(planetItem.id, 'planet-select')
              }}
              observerTargetLock
              observerDisableAutoTarget={false}
              observerExploreEntityId={null}
              initialSpherical={initialShowcaseSpherical}
              onCameraSettled={handleShowcaseCameraSettled}
            />
          )}
        </Suspense>
      </div>

      <div className="ui-overlay">
        {earthHistoryOpen ? (
          <>
            <div className="fixed top-14 left-0 right-0 z-[22] border-b border-white/10 bg-black/35 backdrop-blur-sm">
              <div className="mx-auto max-w-[1400px] px-4 py-2 flex items-center justify-between text-[11px]">
                <span className="tracking-[0.14em] uppercase text-slate-200/90">Earth History</span>
                <button
                  type="button"
                  onClick={() => setEarthHistoryOpen(false)}
                  className="rounded border border-cyan-300/40 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-100 hover:bg-cyan-500/15"
                >
                  Back to Showcase
                </button>
              </div>
            </div>
            <Timeline />
            <InfoPanel />
            <FossilPanel />
            <Controls />
          </>
        ) : (
          <>
            <div className="fixed top-14 left-0 right-0 z-[22] border-b border-white/10 bg-black/35 backdrop-blur-sm">
              <div className="mx-auto max-w-[1400px] px-4 py-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[9px] font-semibold">
                    NASA
                  </span>
                  <span className="tracking-[0.14em] uppercase text-slate-200/90">Showcase 3D</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wider ${
                      hasBridgeRulesForEntity
                        ? 'border-violet-300/40 text-violet-100 bg-violet-500/10'
                        : 'border-slate-400/35 text-slate-200 bg-white/5'
                    }`}
                    title={hasBridgeRulesForEntity ? 'Entity đang chạy theo rule editor cấu hình.' : 'Entity đang chạy theo fallback mặc định.'}
                  >
                    {hasBridgeRulesForEntity ? 'Rule Mode: Custom' : 'Rule Mode: Default'}
                  </span>
                  {bridgeLessonLinks.length > 0 ? (
                    <span className="rounded border border-emerald-300/35 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-100 bg-emerald-500/10">
                      Progress {bridgeVisitedLessonsForEntity}/{bridgeLessonLinks.length}
                    </span>
                  ) : null}
                  {activeShowcaseItem?.linkedPlanetName === 'Earth' ? (
                    <button
                      type="button"
                      onClick={() => setEarthHistoryOpen(true)}
                      className="rounded border border-emerald-300/40 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-100 hover:bg-emerald-500/15"
                    >
                      Earth History
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

            <aside className="fixed left-0 top-[5.5rem] bottom-0 z-[21] w-[288px] border-r border-white/10 bg-black/40 backdrop-blur-sm overflow-y-auto">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Featured Stories</p>
              </div>
              <div className="p-2 space-y-2">
                {NASA_SHOWCASE_STORIES.map((story) => {
                  const active = showcaseActiveStoryId === story.id
                  return (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => {
                        setShowcaseActiveStoryId(story.id)
                        const linked = NASA_SHOWCASE_ITEMS.find(
                          (item) => item.linkedPlanetName === story.targetPlanetName,
                        )
                        if (linked) {
                          handleShowcaseEntityClicked(linked.id, 'story-sidebar')
                          openEarthHistoryFromItem(linked.id)
                        }
                      }}
                      className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                        active
                          ? 'border-cyan-300/45 bg-cyan-500/15 text-cyan-50'
                          : 'border-white/10 bg-black/35 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <p className="text-sm leading-tight">{story.title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">{story.subtitle}</p>
                      <p className="mt-1 text-[11px] text-slate-300/90">{story.detail}</p>
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-white/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Catalog highlight</p>
                <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  <p className="text-xs text-slate-200">{activeShowcaseItem?.name ?? 'No selection'}</p>
                  {activeShowcaseItem?.texturePath ? (
                    <img
                      src={getStaticAssetUrl(activeShowcaseItem.texturePath)}
                      alt={activeShowcaseItem.name}
                      className="mt-2 h-20 w-full object-cover rounded border border-white/10"
                    />
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">No texture preview available</p>
                  )}
                </div>
              </div>
            </aside>

            {showcaseMenuOpen ? (
              <div className="fixed inset-0 z-[23] bg-black/45 backdrop-blur-[1px]">
                <div className="absolute left-1/2 top-[5.6rem] w-[min(1080px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#050a13]/96 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 text-sm">
                    <div className="space-y-2 border-r border-white/10 pr-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Stories</p>
                      {NASA_SHOWCASE_STORIES.map((story) => (
                        <button
                          key={`menu-${story.id}`}
                          type="button"
                          onClick={() => {
                            setShowcaseActiveStoryId(story.id)
                            const linked = NASA_SHOWCASE_ITEMS.find(
                              (item) => item.linkedPlanetName === story.targetPlanetName,
                            )
                            if (linked) {
                              handleShowcaseEntityClicked(linked.id, 'story-menu')
                              openEarthHistoryFromItem(linked.id)
                            }
                            setShowcaseMenuOpen(false)
                          }}
                          className="block w-full text-left rounded px-2 py-1.5 text-slate-200 hover:bg-white/10"
                        >
                          {story.title}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2 border-r border-white/10 pr-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Planets & Moons</p>
                      {showcasePlanetsMoons.map((item) => (
                        <button
                          key={`menu-planet-${item.id}`}
                          type="button"
                          onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                          onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                          onClick={() => {
                            handleShowcaseEntityClicked(item.id, 'menu-planets')
                            openEarthHistoryFromItem(item.id)
                            setShowcaseMenuOpen(false)
                          }}
                          className="block w-full text-left rounded px-2 py-1.5 text-slate-200 hover:bg-white/10"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2 border-r border-white/10 pr-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Dwarf Planets & Asteroids</p>
                      {showcaseDwarfPlanets.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                          onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                          onClick={() => {
                            handleShowcaseEntityClicked(item.id, 'menu-dwarf')
                            setShowcaseMenuOpen(false)
                          }}
                          className="block w-full text-left rounded px-2 py-1.5 text-slate-200/80 bg-white/[0.02] hover:bg-white/10"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2 border-r border-white/10 pr-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Comets</p>
                      {showcaseComets.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                          onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                          onClick={() => {
                            handleShowcaseEntityClicked(item.id, 'menu-comets')
                            setShowcaseMenuOpen(false)
                          }}
                          className="block w-full text-left rounded px-2 py-1.5 text-slate-200/80 bg-white/[0.02] hover:bg-white/10"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Spacecraft</p>
                      {showcaseSpacecraft.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                          onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                          onClick={() => {
                            handleShowcaseEntityClicked(item.id, 'menu-spacecraft')
                            setShowcaseMenuOpen(false)
                          }}
                          className="block w-full text-left rounded px-2 py-1.5 text-slate-200/80 bg-white/[0.02] hover:bg-white/10"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {bridgeDebugOn ? (
              <aside className="fixed right-4 top-24 z-[24] w-[21rem] rounded-xl border border-white/15 bg-black/55 p-2.5 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300">Bridge debug</p>
                <p className="mt-1 text-[10px] text-slate-500">entity={showcaseActiveItemId} | rules={activeBridgeRules.length}</p>
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
              <aside className="fixed right-4 top-24 z-[24] w-[20rem] rounded-xl border border-white/10 bg-black/45 p-2.5 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300">Learning Bridge</p>
                <p className="mt-1 text-[11px] text-slate-300">
                  {activeShowcaseItem?.name || showcaseActiveItemId} • focus {focusDelaySec}s
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Actions: {bridgeEnabledActions.length > 0 ? bridgeEnabledActions.join(' • ') : 'Không có'}
                </p>
              </aside>
            ) : null}

            {bridgeOverlayOpen && bridgeOverlayEntityId === showcaseActiveItemId ? (
              <aside className="fixed left-4 bottom-4 z-[20] w-[22rem] rounded-xl border border-cyan-400/30 bg-[#07111d]/95 p-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/90">Concept overlay</p>
                <p className="mt-1 text-xs text-slate-300">
                  Bạn vừa tập trung vào <span className="text-white font-medium">{activeShowcaseItem?.name || showcaseActiveItemId}</span> hơn {focusDelaySec} giây.
                </p>
                {bridgeConceptCards.length > 0 ? (
                  <div className="mt-2 grid gap-2">
                    {bridgeConceptCards.map((c) => (
                      <a
                        key={c.id}
                        href={`/search?q=${encodeURIComponent(c.id)}`}
                        className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 hover:bg-white/10"
                      >
                        <p className="text-xs font-medium text-cyan-100">{c.title || c.id}</p>
                        <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{c.short_description || c.explanation}</p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400">Chưa map concept cho entity này trong bridge v1.</p>
                )}
                {bridgeLessonLinks.length > 0 ? (
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-300/90">Learning path sync</p>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Đã đánh dấu <span className="text-emerald-200 font-medium">{bridgeLessonLinks.length}</span> mục liên quan là visited_3d.
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">Tổng visited_3d hiện có: {Object.keys(visited3DMap).length}</p>
                  </div>
                ) : null}
              </aside>
            ) : null}

            {bridgeQuizPromptOpen && bridgeQuizQuestions.length > 0 ? (
              <aside className="fixed right-4 bottom-4 z-[21] w-[23rem] rounded-xl border border-amber-400/35 bg-[#16100a]/95 p-3 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/90">Contextual quiz</p>
                  <button
                    type="button"
                    onClick={() => setBridgeQuizPromptOpen(false)}
                    className="rounded border border-white/20 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-white/10"
                  >
                    Đóng
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-200">
                  Bạn vừa khám phá <span className="font-medium text-white">{activeShowcaseItem?.name || showcaseActiveItemId}</span>. Thử nhanh {bridgeQuizQuestions.length} câu nhé?
                </p>
                <div className="mt-2 space-y-2">
                  {bridgeQuizQuestions.map((q, qIdx) => (
                    <div key={q.id} className="rounded border border-white/10 bg-black/25 p-2">
                      <p className="text-[11px] text-slate-100">{qIdx + 1}. {q.question}</p>
                      <div className="mt-1.5 grid gap-1">
                        {q.options.map((opt, oi) => {
                          const picked = bridgeQuizAnswers[q.id] === oi
                          const reveal = bridgeQuizAnswers[q.id] !== undefined
                          const correct = oi === q.correctIndex
                          return (
                            <button
                              key={`${q.id}-${oi}`}
                              type="button"
                              onClick={() => setBridgeQuizAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                              className={`rounded border px-2 py-1 text-left text-[11px] ${
                                reveal
                                  ? correct
                                    ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100'
                                    : picked
                                      ? 'border-rose-400/45 bg-rose-500/15 text-rose-100'
                                      : 'border-white/10 bg-white/5 text-slate-400'
                                  : picked
                                    ? 'border-cyan-300/55 bg-cyan-500/20 text-cyan-100'
                                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-amber-100/90">
                  Điểm nhanh: {bridgeQuizScore.correct}/{bridgeQuizScore.total} đúng ({bridgeQuizScore.answered} đã trả lời)
                </p>
              </aside>
            ) : null}

            {discoveryToast ? (
              <div className="fixed left-1/2 top-20 z-[25] -translate-x-1/2 rounded-xl border border-violet-400/40 bg-violet-900/85 px-4 py-2 text-sm text-violet-100 shadow-lg">
                Unlock: {discoveryToast.entityId} • rarity: {discoveryToast.rarity}
              </div>
            ) : null}
            {bridgeRuntimeHint ? (
              <div className="fixed left-1/2 top-32 z-[25] -translate-x-1/2 rounded-xl border border-cyan-400/35 bg-cyan-950/80 px-4 py-2 text-xs text-cyan-100 shadow-lg">
                {bridgeRuntimeHint}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black pt-20"><Loading /></main>}>
      <ExplorePageContent />
    </Suspense>
  )
}
