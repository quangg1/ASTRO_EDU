'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Timeline } from '@/features/content3d/earth/ui/Timeline'
import { InfoPanel } from '@/features/content3d/earth/ui/InfoPanel'
import { FossilPanel } from '@/features/content3d/earth/ui/FossilPanel'
import { FossilDetailDock } from '@/features/content3d/earth/ui/FossilDetailOverlay'
import { Controls } from '@/features/content3d/earth/ui/Controls'
import { Loading } from '@/components/ui/Loading'
import { useEarthHistoryStore, usePlaybackStore, useSceneCommandStore } from '@/features/content3d/earth/public'
import {
  NarrativeControls,
  NarrativeInfoPanel,
  NarrativeTimeline,
  usePlanetNarrativeStore,
} from '@/features/content3d/narrative/public'
import { planetsData } from '@/lib/solarSystemData'
import { getNasaCatalogItemById, NASA_SHOWCASE_ITEMS, SHOWCASE_ORBIT_ENTITIES } from '@/lib/showcaseEntities'
import {
  buildPlanetGlobeEntity,
  mergeNasaCatalog,
  mergeOrbitEntities,
  mergeOrbitalElementsPreferUsable,
} from '@/lib/mergeShowcaseCatalog'
import {
  fetchPublicShowcaseEntityContents,
  type ShowcaseEntityContentDTO,
} from '@/features/content3d/showcase/api/showcaseEntitiesApi'
import { SHOWCASE_CATALOG_CHANGED_EVENT } from '@/lib/showcaseCatalogRefresh'
import { fetchJplShowcaseOrbits, type ShowcaseJplOrbitDTO } from '@/features/content3d/showcase/api/showcaseOrbitsApi'
import {
  buildContextualQuizFromLessons,
  getShowcaseMuseumLabelVi,
  guessEntityRarity,
  loadBridgeVisitedEntityMap,
  loadDiscoveryMap,
  resolveAllLessonsForEntity,
  resolveLessonsForNarrativeEntity,
  resolveMappedConcepts,
  resolvePlanetAccent,
  saveBridgeVisitedEntityMap,
  saveDiscoveryMap,
  useShowcaseStore,
} from '@/features/content3d/showcase/public'
import {
  loadLessonVisited3D,
  pushVisited3DLessonIdsMerge,
  saveLessonVisited3D,
  setLessonVisited3D,
  syncLearningPathCompletion,
  trackLearningPathBehavior,
  useLearningPath,
  type LessonVisited3DMap,
} from '@/features/learning-path/public'
import {
  fetchShowcaseGamificationCatalog,
  postShowcaseUnlock,
  syncGemWallet,
  type ShowcaseCatalogEntryWithUnlocks,
} from '@/features/rewards/public'
import { useAuthStore } from '@/features/auth/public'
import {
  entityHasExploreHistoryViewer,
  entityHasFossilsTab,
} from '@/app/studio/showcase-entities/entityHistoryCapability'
import { Tooltip, useToast } from '@/design-system'
import type { ShowcaseGamificationStrip } from '@/components/3d/showcase/ShowcaseEntityPanel'
import type { ShowcaseCameraSpherical } from '@/components/3d/showcase/ShowcaseCameraManager'
import { useShowcaseCatalogGen } from '@/components/showcase/ShowcaseCatalogProvider'
import { ShowcaseEntityPanel } from '@/components/3d/showcase/ShowcaseEntityPanel'
import type { QuizQuestion } from '@/shared/types/quizQuestion'
import { mcqAnswerIndex, mcqOptionTexts } from '@/shared/types/quizQuestion'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), {
  ssr: false,
  loading: () => <Loading />,
})
const PlanetHistoryScene = dynamic(() => import('@/components/3d/PlanetHistoryScene'), {
  ssr: false,
  loading: () => <Loading />,
})
const ShowcaseScene = dynamic(() => import('@/components/3d/showcase/ShowcaseScene'), {
  ssr: false,
  loading: () => <Loading />,
})

function ExplorePageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')
  const stageTime = stageParam != null ? parseFloat(stageParam) : null
  const bridgeDebugOn = searchParams.get('bridgeDebug') === '1'

  const [earthHistoryOpen, setEarthHistoryOpen] = useState(!!stageTime)
  const historyEntityFromUrl = useMemo(() => {
    const e = searchParams.get('entity')?.trim()
    if (searchParams.get('history') === '1' && e) return e
    return null
  }, [searchParams])
  const [planetHistoryEntityId, setPlanetHistoryEntityId] = useState<string | null>(historyEntityFromUrl)
  const [planetHistoryOpen, setPlanetHistoryOpen] = useState(!!historyEntityFromUrl)
  const [showcaseMenuOpen, setShowcaseMenuOpen] = useState(false)
  const [showcaseActiveItemId, setShowcaseActiveItemId] = useState('planet-earth')
  const [selectedSolarPlanetIndex, setSelectedSolarPlanetIndex] = useState<number | null>(2)
  const [bridgeOverlayOpen, setBridgeOverlayOpen] = useState(false)
  const [bridgeOverlayEntityId, setBridgeOverlayEntityId] = useState<string | null>(null)
  const [bridgeQuizPromptOpen, setBridgeQuizPromptOpen] = useState(false)
  const [bridgeQuizQuestions, setBridgeQuizQuestions] = useState<QuizQuestion[]>([])
  const [bridgeQuizAnswers, setBridgeQuizAnswers] = useState<Record<string, number>>({})
  const [bridgeDebugEntries, setBridgeDebugEntries] = useState<string[]>([])
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const [gemBalance, setGemBalance] = useState(0)
  const [gamificationCatalog, setGamificationCatalog] = useState<{
    catalog: ShowcaseCatalogEntryWithUnlocks[]
  } | null>(null)
  const [visited3DMap, setVisited3DMap] = useState<LessonVisited3DMap>({})
  const bridgeFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bridgeQuizTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showcaseCameraUrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCameraQueryRef = useRef<string>('')
  const appliedStageRef = useRef<number | null>(null)
  const appliedHistoryFocusRef = useRef<string | null>(null)

  const loadStages = useEarthHistoryStore((s) => s.loadStages)
  const loadPlanetNarrative = usePlanetNarrativeStore((s) => s.loadForEntity)
  const narrativeLoading = usePlanetNarrativeStore((s) => s.loading)
  const narrativeBeats = usePlanetNarrativeStore((s) => s.beats)
  const linkedLessonIds = usePlanetNarrativeStore((s) => s.linkedLessonIds)
  const currentBeatId = usePlanetNarrativeStore((s) => s.currentBeat.id)
  const focusBeatAndSite = usePlanetNarrativeStore((s) => s.focusBeatAndSite)
  const planetBeatAccent = usePlanetNarrativeStore((s) => s.currentBeat.accentColor)
  const stages = useEarthHistoryStore((s) => s.stages)
  const stagesLoading = useEarthHistoryStore((s) => s.loading)
  const setStage = useEarthHistoryStore((s) => s.setStageIndex)
  const { modules, concepts } = useLearningPath()

  /** Độ trễ trước khi bật overlay / quiz sau khi entity ổn định (Learning Bridge cố định). */
  const FOCUS_DELAY_SEC = 3
  const showcaseCatalogGen = useShowcaseCatalogGen()

  const [showcaseContent, setShowcaseContent] = useState<ShowcaseEntityContentDTO[]>([])
  const [jplOrbits, setJplOrbits] = useState<ShowcaseJplOrbitDTO[]>([])
  useEffect(() => {
    let cancelled = false
    const debounceRef = { current: null as ReturnType<typeof setTimeout> | null }

    const load = () => {
      fetchPublicShowcaseEntityContents().then((rows) => {
        if (!cancelled) setShowcaseContent(rows)
      })
    }

    load()

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        load()
      }, 350)
    }

    window.addEventListener(SHOWCASE_CATALOG_CHANGED_EVENT, schedule)
    const onVis = () => {
      if (document.visibilityState === 'visible') schedule()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      window.removeEventListener(SHOWCASE_CATALOG_CHANGED_EVENT, schedule)
      document.removeEventListener('visibilitychange', onVis)
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

  const planetGlobeEntity = useMemo(() => {
    if (!planetHistoryEntityId) return null
    return buildPlanetGlobeEntity(planetHistoryEntityId, mergedOrbitEntities, showcaseContent)
  }, [planetHistoryEntityId, mergedOrbitEntities, showcaseContent])

  const planetHistoryLabel = useMemo(() => {
    if (!planetHistoryEntityId) return 'Deep History'
    const cat = getNasaCatalogItemById(planetHistoryEntityId)
    return cat?.name || planetHistoryEntityId
  }, [planetHistoryEntityId])

  const openPlanetHistory = useCallback(
    (entityId: string, focus?: { beatId?: number; pinId?: string }) => {
      setPlanetHistoryEntityId(entityId)
      setPlanetHistoryOpen(true)
      setEarthHistoryOpen(false)
      setShowcaseActiveItemId(entityId)
      const next = new URLSearchParams(searchParams.toString())
      next.set('mode', 'showcase')
      next.set('entity', entityId)
      next.set('history', '1')
      next.delete('stage')
      if (focus?.beatId != null && Number.isFinite(focus.beatId)) {
        next.set('beat', String(Math.round(focus.beatId)))
      } else {
        next.delete('beat')
      }
      if (focus?.pinId?.trim()) next.set('pin', focus.pinId.trim())
      else next.delete('pin')
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const closePlanetHistory = useCallback(() => {
    setPlanetHistoryOpen(false)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('history')
    next.delete('beat')
    next.delete('pin')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

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
    setVisited3DMap(loadLessonVisited3D(user?.id ?? null))
    if (!user?.id) return
    void syncLearningPathCompletion(user.id).then(() => {
      setVisited3DMap(loadLessonVisited3D(user.id))
    })
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setGemBalance(0)
      setGamificationCatalog(null)
      return
    }
    void syncGemWallet(user.id).then((w) => setGemBalance(w.balance))
    void fetchShowcaseGamificationCatalog().then((c) => setGamificationCatalog(c))
  }, [user?.id])

  useEffect(() => {
    const onRewards = (ev: Event) => {
      const ce = ev as CustomEvent<{ gemsEarned?: number; labels?: string[] }>
      const d = ce.detail
      if (!d?.gemsEarned) return
      const tail = Array.isArray(d.labels) && d.labels.length ? ` (${d.labels.join(' · ')})` : ''
      toast.show(`+${d.gemsEarned} gem${tail}`, { tone: 'success' })
      void syncGemWallet(user?.id).then((w) => setGemBalance(w.balance))
    }
    window.addEventListener('learning-path-rewards', onRewards as EventListener)
    return () => window.removeEventListener('learning-path-rewards', onRewards as EventListener)
  }, [user?.id])

  useEffect(() => {
    if (!earthHistoryOpen) return
    void loadStages()
  }, [earthHistoryOpen, loadStages])

  useEffect(() => {
    if (!planetHistoryOpen || !planetHistoryEntityId) return
    appliedHistoryFocusRef.current = null
    void loadPlanetNarrative(planetHistoryEntityId)
  }, [planetHistoryOpen, planetHistoryEntityId, loadPlanetNarrative])

  useEffect(() => {
    if (!planetHistoryOpen || narrativeLoading || narrativeBeats.length === 0) return
    const beatRaw = searchParams.get('beat')
    const pinRaw = searchParams.get('pin')?.trim() || null
    const key = `${planetHistoryEntityId}:${beatRaw ?? ''}:${pinRaw ?? ''}`
    if (appliedHistoryFocusRef.current === key) return
    if (beatRaw == null) {
      appliedHistoryFocusRef.current = key
      return
    }
    const beatId = parseInt(beatRaw, 10)
    if (!Number.isFinite(beatId)) return
    focusBeatAndSite(beatId, pinRaw)
    appliedHistoryFocusRef.current = key
  }, [
    planetHistoryOpen,
    planetHistoryEntityId,
    narrativeLoading,
    narrativeBeats.length,
    searchParams,
    focusBeatAndSite,
  ])

  /** Tránh autoplay timeline dính sang Deep History từ lần mở Trái Đất trước đó. */
  useEffect(() => {
    if (!planetHistoryOpen) return
    usePlaybackStore.setState({ isPlaying: false })
  }, [planetHistoryOpen])

  useEffect(() => {
    if (earthHistoryOpen) return
    useSceneCommandStore.getState().clearAllGlobeFossilUi()
  }, [earthHistoryOpen])

  useEffect(() => {
    if (!planetHistoryOpen) return
    useSceneCommandStore.getState().clearAllGlobeFossilUi()
  }, [planetHistoryOpen])

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

  const gamificationStrip = useMemo((): ShowcaseGamificationStrip | null => {
    if (!user?.id || !gamificationCatalog?.catalog?.length || !showcaseActiveItemId) return null
    const row = gamificationCatalog.catalog.find((r) => String(r.id) === String(showcaseActiveItemId))
    if (!row) return null
    return {
      gemBalance,
      storyUnlocked: !!row.storyUnlocked,
      orbitUnlocked: !!row.orbitUnlocked,
      storyCost: Number(row.storyCost ?? 40),
      orbitCost: Number(row.orbitCost ?? 55),
      onUnlock: async (t) => {
        const r = await postShowcaseUnlock(showcaseActiveItemId, t)
        if (r.ok) {
          if (typeof r.gemBalance === 'number') setGemBalance(r.gemBalance)
          const next = await fetchShowcaseGamificationCatalog()
          if (next) setGamificationCatalog(next)
          toast.show(t === 'story' ? 'Đã mở khóa story' : 'Đã mở orbit nâng cao', {
            tone: 'info',
          })
          window.dispatchEvent(new CustomEvent('gem-wallet-changed'))
        } else {
          toast.show(r.error || 'Không mở được', { tone: 'danger' })
        }
      },
    }
  }, [user?.id, gamificationCatalog, showcaseActiveItemId, gemBalance])

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
  const planetHistoryLessonLinks = useMemo(() => {
    if (!planetHistoryEntityId) return []
    return resolveLessonsForNarrativeEntity(modules, concepts, planetHistoryEntityId, {
      linkedLessonIds,
      beatId: currentBeatId,
    })
  }, [planetHistoryEntityId, modules, concepts, linkedLessonIds, currentBeatId])
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

  const pushBridgeDebug = useCallback(
    (msg: string) => {
      if (!bridgeDebugOn) return
      const stamp = new Date().toLocaleTimeString('vi-VN', { hour12: false })
      setBridgeDebugEntries((prev) => [`${stamp} ${msg}`, ...prev].slice(0, 8))
    },
    [bridgeDebugOn],
  )

  const syncSelectedPlanetFromItem = useCallback(
    (entityId: string) => {
      const item = NASA_SHOWCASE_ITEMS.find((x) => x.id === entityId)
      const planetName = item?.linkedPlanetName
      if (!planetName) return
      const idx = planetsData.findIndex((p) => p.name === planetName)
      if (idx >= 0) setSelectedSolarPlanetIndex(idx)
    },
    [],
  )

  // Drive `--planet-accent` for the surface-scene wrapper. When a planet is
  // focused via solar selection we use that name; otherwise fall back to the
  // active showcase entity's linked planet so e.g. focusing a moon still
  // tints the HUD with its parent planet's accent. Default is showcase gold.
  const planetAccent = useMemo(() => {
    if (planetHistoryOpen) return planetBeatAccent
    const focusedPlanet =
      selectedSolarPlanetIndex != null ? planetsData[selectedSolarPlanetIndex]?.name : null
    return resolvePlanetAccent(focusedPlanet ?? activeResolved?.linkedPlanetName ?? null)
  }, [planetHistoryOpen, planetBeatAccent, selectedSolarPlanetIndex, activeResolved?.linkedPlanetName])

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

      const visitedEntities = loadBridgeVisitedEntityMap(user?.id ?? null)
      if (!visitedEntities[showcaseActiveItemId]) {
        const nextVisited = { ...visitedEntities, [showcaseActiveItemId]: true }
        saveBridgeVisitedEntityMap(nextVisited, user?.id ?? null)
        const discovered = loadDiscoveryMap(user?.id ?? null)
        if (!discovered[showcaseActiveItemId]) {
          const nextDiscovered = { ...discovered, [showcaseActiveItemId]: true }
          saveDiscoveryMap(nextDiscovered, user?.id ?? null)
          const rarity = guessEntityRarity(showcaseActiveItemId)
          toast.show(`Unlock: ${showcaseActiveItemId} • rarity: ${rarity}`, { tone: 'info' })
          trackLearningPathBehavior({
            eventName: 'scene_entity_discovered',
            metadata: { schemaVersion: 'scene_event_v2', entityId: showcaseActiveItemId, rarity },
          })
        }
      }

      if (effectiveLessonLinks.length > 0) {
        const uid = user?.id ?? null
        let nextVisited3D = loadLessonVisited3D(uid)
        for (const row of effectiveLessonLinks) nextVisited3D = setLessonVisited3D(nextVisited3D, row.lessonId, true)
        saveLessonVisited3D(nextVisited3D, uid)
        setVisited3DMap(nextVisited3D)
        void pushVisited3DLessonIdsMerge(uid)
        window.dispatchEvent(new Event('lp-progress-changed'))
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
  }, [
    earthHistoryOpen,
    planetHistoryOpen,
    showcaseActiveItemId,
    effectiveConceptCards,
    effectiveLessonLinks,
    modules,
    user?.id,
  ])

  return (
    <main
      className="surface-scene relative w-screen h-screen overflow-hidden bg-black min-h-screen min-w-[320px]"
      style={{ ['--planet-accent' as string]: planetAccent }}
    >
      <div className="canvas-container">
        <Suspense fallback={<Loading />}>
          {earthHistoryOpen ? (
            <EarthScene />
          ) : planetHistoryOpen && planetGlobeEntity ? (
            <PlanetHistoryScene globeEntity={planetGlobeEntity} />
          ) : (
            <ShowcaseScene
              orbitEntities={mergedOrbitEntities}
              showcaseActiveItemId={showcaseActiveItemId}
              onShowcaseItemSelect={(id) => {
                handleShowcaseEntityClicked(id, 'scene')
                syncSelectedPlanetFromItem(id)
              }}
              flightTargetIndex={selectedSolarPlanetIndex}
              onPlanetSelect={(idx) => {
                setSelectedSolarPlanetIndex(idx)
                if (idx === null) return
                const planetName = planetsData[idx]?.name
                if (!planetName) return
                const planetId = `planet-${planetName.toLowerCase()}`
                const planetItem = NASA_SHOWCASE_ITEMS.find(
                  (item) =>
                    item.group === 'planets_moons' &&
                    (item.id === planetId || item.linkedPlanetName === planetName || item.name === planetName),
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
                <span className="tracking-[0.14em] uppercase text-slate-200/90">Hóa thạch · Trái Đất</span>
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
            {/* Một cột phải: Info + Hóa thạch xếp dọc — tránh hai panel fixed chồng lên nhau */}
            <div className="pointer-events-auto fixed right-3 top-24 bottom-28 z-30 flex w-[min(22rem,calc(100vw-1.25rem))] min-h-0 flex-col gap-2">
              <div className="flex min-h-0 min-w-0 flex-[1.15] basis-0 flex-col overflow-hidden">
                <InfoPanel layout="dock" />
              </div>
              <FossilDetailDock />
              <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
                <FossilPanel layout="dock" />
              </div>
            </div>
            <Controls />
          </>
        ) : planetHistoryOpen ? (
          <>
            <div className="fixed top-14 left-0 right-0 z-[22] border-b border-violet-400/25 bg-black/40 backdrop-blur-sm">
              <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px]">
                <span className="tracking-[0.14em] uppercase text-violet-100/95 shrink-0">
                  Deep History · {planetHistoryLabel}
                </span>
                {planetHistoryLessonLinks.length > 0 ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-violet-200/80 shrink-0">Bài LP:</span>
                    {planetHistoryLessonLinks.slice(0, 4).map((row) => (
                      <Link
                        key={row.lessonId}
                        href={row.href}
                        className="max-w-[10rem] truncate rounded border border-violet-400/35 bg-violet-950/50 px-2 py-0.5 text-[10px] text-violet-50 hover:bg-violet-600/30"
                      >
                        {row.title}
                      </Link>
                    ))}
                    {planetHistoryLessonLinks.length > 4 ? (
                      <span className="text-[10px] text-violet-300/70">+{planetHistoryLessonLinks.length - 4}</span>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={closePlanetHistory}
                  className="rounded border border-violet-300/45 px-2 py-1 text-[10px] uppercase tracking-wider text-violet-50 hover:bg-violet-600/25 shrink-0"
                >
                  Quay lại Showcase
                </button>
              </div>
            </div>
            <NarrativeTimeline entityLabel={planetHistoryLabel} />
            <div className="pointer-events-auto fixed right-3 top-24 bottom-28 z-30 flex w-[min(22rem,calc(100vw-1.25rem))] min-h-0 flex-col gap-2">
              <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
                <NarrativeInfoPanel layout="dock" entityLabel={planetHistoryLabel} />
              </div>
            </div>
            <NarrativeControls />
          </>
        ) : (
          <>
            <div className="fixed top-14 left-0 right-0 z-[22] border-b border-white/10 bg-black/35 backdrop-blur-sm">
              <div className="mx-auto max-w-[1400px] px-4 py-2 flex items-center justify-end text-[11px]">
                <div className="flex items-center gap-2">
                  <Tooltip
                    label="Layer 1: nhãn museum. Layer 2: map entity→concept. Layer 3: sceneContext trên bài."
                    side="bottom"
                  >
                    <span className="rounded border border-slate-400/35 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-200 bg-white/5">
                      Learning Bridge v2
                    </span>
                  </Tooltip>
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
                  {activeResolved && entityHasExploreHistoryViewer(activeResolved.id) ? (
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
                        setEarthHistoryOpen(true)
                        setPlanetHistoryOpen(false)
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
                            syncSelectedPlanetFromItem(item.id)
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
                gamification={gamificationStrip}
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
                        {mcqOptionTexts(q).map((opt, oi) => {
                          const picked = bridgeQuizAnswers[q.id] === oi
                          const reveal = bridgeQuizAnswers[q.id] !== undefined
                          const correct = oi === mcqAnswerIndex(q)
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

            {/* discovery / reward / unlock-hint notifications now flow through
                the global ToastProvider — see toast.show(...) above. */}
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
