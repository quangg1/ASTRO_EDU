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
import { NASA_SHOWCASE_ITEMS } from '@/lib/nasaShowcaseCatalog'
import { SHOWCASE_ORBIT_ENTITIES } from '@/lib/showcaseEntities'
import {
  mergeNasaCatalog,
  mergeOrbitEntities,
  mergeOrbitalElementsPreferUsable,
} from '@/lib/mergeShowcaseCatalog'
import {
  fetchPublicShowcaseEntityContents,
  type ShowcaseEntityContentDTO,
} from '@/lib/showcaseEntitiesApi'
import { fetchJplShowcaseOrbits, type ShowcaseJplOrbitDTO } from '@/lib/showcaseOrbitsApi'
import { useLearningPath } from '@/hooks/useLearningPath'
import { useShowcaseStore } from '@/store/showcaseStore'
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
} from '@/lib/showcaseLearningBridge'
import {
  loadLessonVisited3D,
  saveLessonVisited3D,
  setLessonVisited3D,
  type LessonVisited3DMap,
} from '@/lib/learningPathProgress'
import { trackLearningPathBehavior } from '@/lib/learningPathBehavior'
import type { ShowcaseCameraSpherical } from '@/components/3d/showcase/ShowcaseCameraManager'
import { useShowcaseCatalogGen } from '@/components/showcase/ShowcaseCatalogProvider'
import { ShowcaseEntityPanel } from '@/components/3d/showcase/ShowcaseEntityPanel'

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
  const lastCameraQueryRef = useRef<string>('')
  const appliedStageRef = useRef<number | null>(null)

  const loadStages = useSimulatorStore((s) => s.loadStages)
  const stages = useSimulatorStore((s) => s.stages)
  const stagesLoading = useSimulatorStore((s) => s.stagesLoading)
  const setStage = useSimulatorStore((s) => s.setStage)
  const { modules, concepts } = useLearningPath()

  /** Độ trễ trước khi bật overlay / quiz sau khi entity ổn định (Learning Bridge cố định). */
  const FOCUS_DELAY_SEC = 3
  const showcaseCatalogGen = useShowcaseCatalogGen()

  const [showcaseContent, setShowcaseContent] = useState<ShowcaseEntityContentDTO[]>([])
  const [jplOrbits, setJplOrbits] = useState<ShowcaseJplOrbitDTO[]>([])
  useEffect(() => {
    let cancelled = false
    fetchPublicShowcaseEntityContents().then((rows) => {
      if (!cancelled) setShowcaseContent(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const resolvedCatalog = useMemo(
    () => mergeNasaCatalog(NASA_SHOWCASE_ITEMS, showcaseContent),
    [showcaseContent, showcaseCatalogGen],
  )
  const mergedOrbitEntities = useMemo(
    () => {
      const merged = mergeOrbitEntities(SHOWCASE_ORBIT_ENTITIES, showcaseContent)
      if (!jplOrbits.length) return merged
      const byId = new Map(jplOrbits.map((o) => [o.id, o] as const))
      return merged.map((e) => {
        const j = byId.get(e.id)
        if (!j) return e
        return {
          ...e,
          horizonsId: j.horizonsId || e.horizonsId,
          orbitAround: j.orbitAround || e.orbitAround,
          parentId: j.parentId || e.parentId,
          radiusKm: (j.radiusKm && j.radiusKm > 0 ? j.radiusKm : e.radiusKm) || e.radiusKm,
          massKg: j.massKg || e.massKg,
          rotRateRadS: j.rotRateRadS || e.rotRateRadS,
          vectorAu: j.vectorAu || e.vectorAu,
          vectorSim: j.vectorSim || e.vectorSim,
          orbitalElements: mergeOrbitalElementsPreferUsable(j, e),
          orbitEccentricity: j.orbitEccentricity,
          inclinationDeg: j.inclinationDeg,
          ascendingNodeDeg: j.ascendingNodeDeg,
          phaseDeg: j.phaseDeg,
          period: j.period,
          periodDays: j.periodDays ?? undefined,
          semiMajorAxisAu: j.semiMajorAxisAu ?? undefined,
          orbitSource: 'jpl-horizons' as const,
        }
      })
    },
    [showcaseContent, showcaseCatalogGen, jplOrbits],
  )

  useEffect(() => {
    let cancelled = false
    fetchJplShowcaseOrbits().then((items) => {
      if (!cancelled) setJplOrbits(items)
    })
    return () => {
      cancelled = true
    }
  }, [showcaseCatalogGen])

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

  const activeResolved = useMemo(
    () => resolvedCatalog.find((i) => i.id === showcaseActiveItemId) ?? null,
    [resolvedCatalog, showcaseActiveItemId],
  )
  const showcasePlanetsMoons = useMemo(
    () => resolvedCatalog.filter((i) => i.group === 'planets_moons'),
    [resolvedCatalog],
  )
  const showcaseDwarfPlanets = useMemo(
    () => resolvedCatalog.filter((i) => i.group === 'dwarf_asteroids'),
    [resolvedCatalog],
  )
  const showcaseComets = useMemo(() => resolvedCatalog.filter((i) => i.group === 'comets'), [resolvedCatalog])
  const showcaseSpacecraft = useMemo(
    () => resolvedCatalog.filter((i) => i.group === 'spacecraft'),
    [resolvedCatalog],
  )

  const bridgeConceptCards = useMemo(
    () => resolveMappedConcepts(concepts, showcaseActiveItemId).slice(0, 6),
    [concepts, showcaseActiveItemId],
  )
  const bridgeLessonLinks = useMemo(() => {
    const rows = resolveAllLessonsForEntity(modules, concepts, showcaseActiveItemId)
    return rows.map(({ lessonId, title, href }) => ({ lessonId, title, href }))
  }, [modules, concepts, showcaseActiveItemId])
  const bridgeEnabledActions = useMemo(
    () => ['Concept overlay', 'Progress sync', 'Contextual quiz', 'Discovery badge'],
    [],
  )
  const activeOrbitEntity = useMemo(
    () => mergedOrbitEntities.find((e) => e.id === showcaseActiveItemId) ?? null,
    [mergedOrbitEntities, showcaseActiveItemId],
  )
  const activeContentRow = useMemo(
    () => showcaseContent.find((r) => r.entityId === showcaseActiveItemId) ?? null,
    [showcaseContent, showcaseActiveItemId],
  )
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
      trackLearningPathBehavior({
        eventName: 'scene_entity_clicked',
        metadata: { schemaVersion: 'scene_event_v2', entityId, source },
      })
      pushBridgeDebug(`click ${entityId} (${source})`)
    },
    [pushBridgeDebug],
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
        if (typeof window === 'undefined') return
        const next = new URLSearchParams(window.location.search)
        const dist = sph.distance.toFixed(2)
        const az = sph.az.toFixed(1)
        const el = sph.el.toFixed(1)
        if (
          next.get('dist') === dist &&
          next.get('az') === az &&
          next.get('el') === el
        ) {
          return
        }
        next.set('dist', dist)
        next.set('az', az)
        next.set('el', el)
        const updated = next.toString()
        if (updated === lastCameraQueryRef.current) return
        lastCameraQueryRef.current = updated
        // Camera sync is high-frequency; avoid App Router navigation loop for query-only updates.
        window.history.replaceState(null, '', `${pathname}?${updated}`)
      }, 280)
    },
    [pathname],
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

      const visitedEntities = loadBridgeVisitedEntityMap()
      if (!visitedEntities[showcaseActiveItemId]) {
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
            metadata: { schemaVersion: 'scene_event_v2', entityId: showcaseActiveItemId, rarity },
          })
        }
      }

      if (effectiveLessonLinks.length > 0) {
        let nextVisited3D = loadLessonVisited3D()
        for (const row of effectiveLessonLinks) nextVisited3D = setLessonVisited3D(nextVisited3D, row.lessonId, true)
        saveLessonVisited3D(nextVisited3D)
        setVisited3DMap(nextVisited3D)
      }

      const contextual = buildContextualQuizFromLessons(modules, effectiveLessonLinks.map((r) => r.lessonId), 2)
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
  }, [earthHistoryOpen, showcaseActiveItemId, effectiveConceptCards, effectiveLessonLinks, modules])

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
              orbitEntities={mergedOrbitEntities}
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
                    className="rounded border border-slate-400/35 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-200 bg-white/5"
                    title="Layer 1: nhãn museum. Layer 2: map entity→concept. Layer 3: sceneContext trên bài."
                  >
                    Learning Bridge v2
                  </span>
                  {effectiveLessonLinks.length > 0 ? (
                    <span className="rounded border border-emerald-300/35 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-100 bg-emerald-500/10">
                      Progress {bridgeVisitedLessonsForEntity}/{effectiveLessonLinks.length}
                    </span>
                  ) : null}
                  {activeResolved?.linkedPlanetName === 'Earth' ? (
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

            {showcaseMenuOpen ? (
              <div className="fixed inset-0 z-[23] bg-black/45 backdrop-blur-[1px]">
                <div className="absolute left-1/2 top-[5.6rem] w-[min(1080px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#050a13]/96 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
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
                          {item.displayName}
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
                          {item.displayName}
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
                          {item.displayName}
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
                          {item.displayName}
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
              />
            ) : null}

            {null}

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
                  Bạn vừa khám phá{' '}
                  <span className="font-medium text-white">{activeResolved?.displayName || showcaseActiveItemId}</span>. Thử
                  nhanh {bridgeQuizQuestions.length} câu nhé?
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
