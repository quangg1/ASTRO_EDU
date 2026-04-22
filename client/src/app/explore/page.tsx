'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Timeline } from '@/components/ui/Timeline'
import { InfoPanel } from '@/components/ui/InfoPanel'
import { FossilPanel } from '@/components/ui/FossilPanel'
import { Controls } from '@/components/ui/Controls'
import { Loading } from '@/components/ui/Loading'
import { useSimulatorStore } from '@/store/useSimulatorStore'
import { planetsData } from '@/lib/solarSystemData'
import CockpitInterior from '@/components/ui/CockpitInterior'
import { CockpitHudTargetProvider, useCockpitHudTarget } from '@/contexts/CockpitHudTargetContext'
import { CockpitEngineController, loadCockpitEngineVolume, saveCockpitEngineVolume } from '@/lib/cockpitEngineAudio'
import { useLearningPath } from '@/hooks/useLearningPath'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), {
  ssr: false,
  loading: () => <Loading />
})
const SolarSystemScene = dynamic(() => import('@/components/3d/SolarSystemScene'), {
  ssr: false,
  loading: () => <Loading />
})
const MilkyWayScene = dynamic(() => import('@/components/3d/MilkyWayScene'), {
  ssr: false,
  loading: () => <Loading />
})

export type ViewMode = 'solar' | 'milkyway'
type SolarControlMode = 'observer' | 'cockpit'
type RecommendedLessonCard = {
  id: string
  title: string
  href: string
  reason: string
}
type QuickQuizQuestion = {
  id: string
  question: string
  options: string[]
  correctIndex: number
}
type SceneEntity = {
  id: string
  label: string
  summary: string
  mission: string
  lessonKeywords: string[]
  conceptKeywords: string[]
}
type SceneAnchorConfig = {
  sceneKey: string
  label: string
  intro: string
  entities: SceneEntity[]
  planetKeywords: string[]
}

const EARTH_PLANET_INDEX = 2
const VENUS_PLANET_INDEX = 1

function ExplorePageContent() {
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')
  const stageTime = stageParam != null ? parseFloat(stageParam) : null
  const [viewMode, setViewMode] = useState<ViewMode>('solar')
  const [selectedSolarPlanetIndex, setSelectedSolarPlanetIndex] = useState<number | null>(null)
  const [solarControlMode, setSolarControlMode] = useState<SolarControlMode>('observer')
  /** Observer: đang phóng camera tới hành tinh (chưa hiện Target lock / solo) */
  const [observerLockPending, setObserverLockPending] = useState(false)
  /** Observer: camera đã tới — mới solo + Target lock UI */
  const [observerTargetLock, setObserverTargetLock] = useState(false)
  const [telemetry, setTelemetry] = useState({
    speed: 0,
    distance: 0,
    distToNavTarget: 0,
    dockedAtPlanet: false,
  })
  const [earthHistoryOpen, setEarthHistoryOpen] = useState(!!stageTime)
  const [reducedMode, setReducedMode] = useState(false)
  const appliedStageRef = useRef<number | null>(null)
  const loadStages = useSimulatorStore((s) => s.loadStages)
  const stages = useSimulatorStore((s) => s.stages)
  const stagesLoading = useSimulatorStore((s) => s.stagesLoading)
  const setStage = useSimulatorStore((s) => s.setStage)
  const { modules } = useLearningPath()

  const engineRef = useRef<CockpitEngineController | null>(null)
  const lastDestSyncedRef = useRef<number | null | undefined>(undefined)
  const arrivalSoundPlayedRef = useRef(false)
  const [cockpitVolume, setCockpitVolume] = useState(() =>
    typeof window !== 'undefined' ? loadCockpitEngineVolume() : 1
  )
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [sceneExploreActive, setSceneExploreActive] = useState(false)
  const [deepDiveOpen, setDeepDiveOpen] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})

  const showEarthHistory = earthHistoryOpen
  const isEarthSelected = viewMode === 'solar' && selectedSolarPlanetIndex === EARTH_PLANET_INDEX

  const cockpitFullscreen =
    !showEarthHistory && viewMode === 'solar' && solarControlMode === 'cockpit'

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (cockpitFullscreen) {
      document.body.classList.add('explore-cockpit-fullscreen')
    } else {
      document.body.classList.remove('explore-cockpit-fullscreen')
    }
    return () => document.body.classList.remove('explore-cockpit-fullscreen')
  }, [cockpitFullscreen])

  useEffect(() => {
    if (viewMode !== 'solar' && solarControlMode === 'cockpit') {
      setSolarControlMode('observer')
    }
  }, [viewMode, solarControlMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)')
    const apply = () => setReducedMode(mediaQuery.matches)
    apply()
    mediaQuery.addEventListener('change', apply)
    return () => mediaQuery.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (reducedMode && viewMode === 'milkyway') {
      setViewMode('solar')
    }
  }, [reducedMode, viewMode])

  useEffect(() => {
    setObserverTargetLock(false)
    setObserverLockPending(false)
    setSceneExploreActive(false)
    setDeepDiveOpen(false)
    setQuizAnswers({})
  }, [selectedSolarPlanetIndex])

  useEffect(() => {
    if (solarControlMode !== 'observer') {
      setObserverTargetLock(false)
      setObserverLockPending(false)
      setSceneExploreActive(false)
      setDeepDiveOpen(false)
      setQuizAnswers({})
    }
  }, [solarControlMode])

  const onObserverLockArrived = useCallback(() => {
    setObserverTargetLock(true)
    setObserverLockPending(false)
  }, [])

  useEffect(() => {
    if (showEarthHistory) loadStages()
  }, [showEarthHistory, loadStages])

  useEffect(() => {
    if (stageTime == null) {
      appliedStageRef.current = null
      return
    }
    if (stagesLoading || stages.length === 0) return
    if (appliedStageRef.current === stageTime) return
    const idx = stages.findIndex((s) => s.time === stageTime)
    const index = idx >= 0 ? idx : stages.reduce((best, s, i) => (Math.abs(s.time - stageTime) < Math.abs(stages[best].time - stageTime) ? i : best), 0)
    setStage(index)
    appliedStageRef.current = stageTime
  }, [stageTime, stagesLoading, stages, setStage])

  useEffect(() => {
    if (!cockpitFullscreen) {
      engineRef.current?.dispose()
      engineRef.current = null
      lastDestSyncedRef.current = undefined
      arrivalSoundPlayedRef.current = false
      return
    }
    const vol = loadCockpitEngineVolume()
    setCockpitVolume(vol)
    engineRef.current = new CockpitEngineController(vol)
    lastDestSyncedRef.current = undefined
    arrivalSoundPlayedRef.current = false
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [cockpitFullscreen])

  useEffect(() => {
    if (!cockpitFullscreen) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const engine = engineRef.current
    if (!engine) return
    if (lastDestSyncedRef.current === undefined) {
      lastDestSyncedRef.current = selectedSolarPlanetIndex
      return
    }
    if (lastDestSyncedRef.current !== selectedSolarPlanetIndex) {
      lastDestSyncedRef.current = selectedSolarPlanetIndex
      arrivalSoundPlayedRef.current = false
      void engine.ensureRunning().then((ok) => {
        if (ok) engine.playStartup()
      })
    }
  }, [selectedSolarPlanetIndex, cockpitFullscreen])

  const handleCockpitVolumeChange = useCallback((v: number) => {
    const next = Math.max(0, Math.min(1, v))
    saveCockpitEngineVolume(next)
    setCockpitVolume(next)
    engineRef.current?.setUserVolume(next)
  }, [])

  const cockpitHud = useCockpitHudTarget()
  const planetFrameRect = cockpitHud?.target.planetFrameRect
  const dockCanvasInTargetFrame = Boolean(
    cockpitFullscreen &&
      telemetry.dockedAtPlanet &&
      planetFrameRect &&
      planetFrameRect.width > 4 &&
      planetFrameRect.height > 4
  )

  const onTelemetry = useCallback(
    (payload: {
      speed: number
      distance: number
      targetIndex: number | null
      distToNavTarget: number
      dockedAtPlanet: boolean
    }) => {
      setTelemetry({
        speed: payload.speed,
        distance: payload.distance,
        distToNavTarget: payload.distToNavTarget,
        dockedAtPlanet: payload.dockedAtPlanet,
      })
      if (!cockpitFullscreen) return
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const engine = engineRef.current
      if (!engine) return
      const { speed, distToNavTarget, dockedAtPlanet } = payload
      const atHold = distToNavTarget < 0.06
      if (atHold || dockedAtPlanet) {
        engine.stopRumble()
        if (!arrivalSoundPlayedRef.current && (atHold || dockedAtPlanet)) {
          arrivalSoundPlayedRef.current = true
          void engine.ensureRunning().then((ok) => {
            if (ok) engine.playShutdown()
          })
        }
      } else if (!arrivalSoundPlayedRef.current || speed > 0.2) {
        engine.updateRumble(Math.min(1, speed / 3.5))
      }
    },
    [cockpitFullscreen]
  )

  const showExploreTopBar = !(solarControlMode === 'cockpit' && viewMode === 'solar' && !showEarthHistory)
  const sceneAnchor: SceneAnchorConfig | null =
    !showEarthHistory && viewMode === 'solar' && selectedSolarPlanetIndex === VENUS_PLANET_INDEX
      ? {
          sceneKey: 'solar:venus',
          label: 'Sao Kim',
          intro:
            'Bạn đang ở Sao Kim: khí quyển dày đặc CO2, mây acid sulfuric và hiệu ứng nhà kính cực mạnh.',
          entities: [
            {
              id: 'venus-atmosphere',
              label: 'CO2 atmosphere',
              summary: 'Khí quyển Sao Kim chủ yếu là CO2, áp suất bề mặt cực lớn so với Trái Đất.',
              mission: 'So sánh khí quyển Sao Kim và Trái Đất: vì sao một bên khắc nghiệt hơn hẳn?',
              lessonKeywords: ['venus', 'sao kim', 'atmosphere', 'khí quyển', 'co2', 'planet'],
              conceptKeywords: ['venus', 'sao kim', 'atmosphere', 'khí quyển', 'co2'],
            },
            {
              id: 'venus-greenhouse',
              label: 'Greenhouse',
              summary: 'Nhiệt bị giữ lại mạnh khiến bề mặt nóng hơn nhiều hành tinh khác.',
              mission: 'Quan sát và giải thích vì sao Sao Kim nóng hơn dù không gần Mặt Trời nhất.',
              lessonKeywords: ['greenhouse', 'hiệu ứng nhà kính', 'radiation', 'nhiệt', 'venus', 'sao kim'],
              conceptKeywords: ['greenhouse', 'hiệu ứng nhà kính', 'radiation', 'nhiệt'],
            },
            {
              id: 'venus-clouds',
              label: 'Sulfuric clouds',
              summary: 'Lớp mây dày phản xạ ánh sáng mạnh, che phủ toàn bộ bề mặt hành tinh.',
              mission: 'Liên hệ màu sáng của Sao Kim với tính chất mây và phản xạ ánh sáng.',
              lessonKeywords: ['cloud', 'mây', 'sulfur', 'acid', 'reflect', 'phản xạ', 'venus'],
              conceptKeywords: ['mây', 'sulfur', 'acid', 'albedo', 'phản xạ'],
            },
            {
              id: 'venus-pressure',
              label: 'Pressure',
              summary: 'Áp suất bề mặt Sao Kim cực lớn, tạo môi trường khắc nghiệt cho thiết bị thăm dò.',
              mission: 'So sánh áp suất Venus và Earth, đánh giá tác động lên vật liệu tàu đổ bộ.',
              lessonKeywords: ['pressure', 'áp suất', 'venus', 'surface', 'planet'],
              conceptKeywords: ['pressure', 'áp suất', 'planetary atmosphere'],
            },
            {
              id: 'venus-rotation',
              label: 'Rotation',
              summary: 'Sao Kim có đặc điểm quay chậm và khác biệt, tạo bức tranh động lực học rất riêng.',
              mission: 'Đối chiếu quỹ đạo và tự quay để hiểu khác biệt ngày-đêm giữa các hành tinh đá.',
              lessonKeywords: ['orbit', 'quỹ đạo', 'rotation', 'tự quay', 'planet', 'venus'],
              conceptKeywords: ['orbit', 'quỹ đạo', 'rotation', 'tự quay', 'planet'],
            },
          ],
          planetKeywords: ['venus', 'sao kim'],
        }
      : null

  useEffect(() => {
    if (!sceneAnchor) {
      setSelectedEntityId(null)
      setSceneExploreActive(false)
      setDeepDiveOpen(false)
      setQuizAnswers({})
      return
    }
    setSelectedEntityId((prev) => {
      if (prev && sceneAnchor.entities.some((e) => e.id === prev)) return prev
      return sceneAnchor.entities[0]?.id ?? null
    })
  }, [sceneAnchor?.sceneKey])

  const activeEntity = sceneAnchor?.entities.find((e) => e.id === selectedEntityId) ?? sceneAnchor?.entities[0] ?? null
  const showExploreLearningDock = solarControlMode !== 'cockpit' && sceneExploreActive && sceneAnchor && activeEntity
  const dockWidthRem = showExploreLearningDock ? (deepDiveOpen ? 48 : 22) : 0
  const quickQuizQuestions: QuickQuizQuestion[] = [
    {
      id: 'q1',
      question: 'Vì sao Sao Kim nóng hơn Sao Thủy?',
      options: [
        'Vì Sao Kim gần Mặt Trời hơn',
        'Vì khí quyển CO2 dày gây hiệu ứng nhà kính mạnh',
        'Vì Sao Kim có lõi lớn hơn nhiều',
      ],
      correctIndex: 1,
    },
    {
      id: 'q2',
      question: 'Thành phần chính trong khí quyển Sao Kim là gì?',
      options: ['Nitơ', 'CO2', 'Oxy'],
      correctIndex: 1,
    },
    {
      id: 'q3',
      question: 'Nhiệt độ bề mặt điển hình của Sao Kim gần mức nào?',
      options: ['~120°C', '~260°C', '~464°C'],
      correctIndex: 2,
    },
  ]
  const answeredCount = quickQuizQuestions.filter((q) => quizAnswers[q.id] !== undefined).length
  const correctCount = quickQuizQuestions.filter((q) => quizAnswers[q.id] === q.correctIndex).length

  const recommendedLessons: RecommendedLessonCard[] = (() => {
    if (!sceneAnchor || !activeEntity) return []
    const scored: Array<{ card: RecommendedLessonCard; score: number }> = []
    for (const mod of modules) {
      for (const node of mod.nodes) {
        for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
          for (const lesson of node.depths[depth] || []) {
            const text = [
              lesson.titleVi,
              lesson.title,
              lesson.body || '',
              JSON.stringify(lesson.sections || []),
              (lesson.conceptIds || []).join(' '),
            ]
              .join(' ')
              .toLowerCase()
            const hasPlanetMatch = sceneAnchor.planetKeywords.some((kw) => text.includes(kw))
            if (!hasPlanetMatch) continue
            let score = 0
            for (const kw of activeEntity.lessonKeywords) {
              if (!text.includes(kw)) continue
              score += kw.length >= 7 ? 3 : 2
            }
            if (depth === 'beginner') score += 1
            if (score <= 0) continue
            scored.push({
              score,
              card: {
                id: lesson.id,
                title: lesson.titleVi || lesson.title || lesson.id,
                href: `/tutorial/${mod.id}/${node.id}/${encodeURIComponent(lesson.id)}`,
                reason:
                  score >= 10
                    ? `Khớp trực tiếp với "${activeEntity.label}"`
                    : `Liên quan "${activeEntity.label}" trong ngữ cảnh ${sceneAnchor.label}`,
              },
            })
          }
        }
      }
    }
    scored.sort((a, b) => b.score - a.score)
    const uniq = new Map<string, RecommendedLessonCard>()
    for (const row of scored) {
      if (!uniq.has(row.card.id)) uniq.set(row.card.id, row.card)
      if (uniq.size >= 3) break
    }
    return Array.from(uniq.values())
  })()

  const canvasInlineStyle =
    dockCanvasInTargetFrame && planetFrameRect
      ? {
          position: 'fixed' as const,
          top: planetFrameRect.top,
          left: planetFrameRect.left,
          width: planetFrameRect.width,
          height: planetFrameRect.height,
          right: 'auto',
          bottom: 'auto',
          zIndex: 5,
        }
      : showExploreLearningDock
        ? {
            right: `${dockWidthRem}rem`,
            width: `calc(100vw - ${dockWidthRem}rem)`,
          }
        : undefined

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black min-h-screen min-w-[320px]">
      <div
        className={`canvas-container${dockCanvasInTargetFrame ? ' cockpit-canvas-target-lock' : ''}`}
        style={canvasInlineStyle}
      >
        <Suspense fallback={<Loading />}>
          {showEarthHistory && <EarthScene />}
          {!showEarthHistory && viewMode === 'solar' && (
            <SolarSystemScene
              mode={solarControlMode}
              flightTargetIndex={selectedSolarPlanetIndex}
              sceneNavigationEnabled={solarControlMode !== 'cockpit'}
              onPlanetSelect={setSelectedSolarPlanetIndex}
              onTelemetry={onTelemetry}
              observerLockPending={solarControlMode === 'observer' && observerLockPending}
              observerTargetLock={solarControlMode === 'observer' && observerTargetLock}
              onObserverLockArrived={onObserverLockArrived}
              cockpitCanvasInTargetFrame={dockCanvasInTargetFrame}
              observerDisableAutoTarget={sceneExploreActive}
              observerExploreEntityId={sceneExploreActive ? activeEntity?.id ?? null : null}
            />
          )}
          {!showEarthHistory && viewMode === 'milkyway' && <MilkyWayScene />}
        </Suspense>
      </div>
      {showExploreLearningDock && sceneAnchor && activeEntity && (
        <>
        <aside className="fixed right-0 top-14 bottom-0 z-[18] w-[22rem] border-l border-white/10 bg-[#040a14]/96 p-3 backdrop-blur">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/90">Venus Entities</p>
            <p className="mt-1 text-xs text-slate-400">Mô tả ngắn để định hướng nhanh trước khi học sâu.</p>
            <div className="mt-2 space-y-1.5">
              {sceneAnchor.entities.map((entity) => {
                const isActive = activeEntity.id === entity.id
                return (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => {
                      setSelectedEntityId(entity.id)
                      setDeepDiveOpen(false)
                      setQuizAnswers({})
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      isActive
                        ? 'border-amber-300/65 bg-amber-500/25 text-amber-100'
                        : 'border-white/10 bg-black/30 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {entity.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/90">Khám phá {sceneAnchor.label}</p>
            <h3 className="mt-1 text-sm font-semibold text-white">{activeEntity.label}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-3">{activeEntity.summary}</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-200/95 line-clamp-2">{activeEntity.mission}</p>
            <button
              type="button"
              onClick={() => setDeepDiveOpen(true)}
              className="mt-3 w-full rounded-lg border border-cyan-300/40 bg-cyan-600/35 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/35"
            >
              Tìm hiểu chuyên sâu
            </button>
          </div>
          {recommendedLessons.length > 0 && (
            <div className="mt-3 grid gap-2">
              {recommendedLessons.map((lesson, idx) => (
                <a
                  key={lesson.id}
                  href={lesson.href}
                  className="block rounded-lg border border-white/10 bg-black/30 p-2.5 hover:bg-white/10"
                >
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {idx === 0 ? 'Bài nên học tiếp' : 'Bài tiếp theo'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-200">{lesson.title}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{lesson.reason}</p>
                </a>
              ))}
            </div>
          )}
        </aside>
        <aside
          className={`fixed top-14 bottom-0 z-[19] w-[26rem] border-l border-white/10 bg-[#06111f]/97 p-4 backdrop-blur transition-transform duration-300 ${
            deepDiveOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ right: '22rem' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/90">Bài học chuyên sâu</p>
            <button
              type="button"
              onClick={() => setDeepDiveOpen(false)}
              className="rounded border border-white/20 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
            >
              Đóng
            </button>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-white">{sceneAnchor.label} vs Trái Đất</h3>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/35 p-3">
            <p className="text-[11px] text-slate-300">So sánh nhanh (đơn vị tương đối)</p>
            <div className="mt-2 space-y-2 text-[11px] text-slate-300">
              <div>
                <p className="mb-1">Nhiệt độ bề mặt</p>
                <div className="h-2 rounded bg-white/10">
                  <div className="h-2 rounded bg-amber-400" style={{ width: '92%' }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Venus ~464°C</span><span>Earth ~15°C</span></div>
              </div>
              <div>
                <p className="mb-1">Áp suất khí quyển</p>
                <div className="h-2 rounded bg-white/10">
                  <div className="h-2 rounded bg-rose-400" style={{ width: '88%' }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Venus ~92 bar</span><span>Earth ~1 bar</span></div>
              </div>
              <div>
                <p className="mb-1">Kích thước</p>
                <div className="h-2 rounded bg-white/10">
                  <div className="h-2 rounded bg-cyan-400" style={{ width: '95%' }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Venus ~0.95 Earth</span><span>Earth = 1.0</span></div>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3">
            <p className="text-[11px] text-slate-300">Mô phỏng dòng khí CO2 dày đặc</p>
            <div className="relative mt-2 h-24 overflow-hidden rounded border border-amber-300/20 bg-gradient-to-b from-[#3a1e10] via-[#1d120d] to-[#0c0a0a]">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full w-1 rounded-full bg-gradient-to-b from-amber-200/60 via-orange-300/40 to-transparent"
                  style={{
                    left: `${10 + i * 11}%`,
                    transform: `translateY(${(i % 2 === 0 ? -10 : 8)}%)`,
                    opacity: 0.55,
                    animation: `pulse ${1.4 + i * 0.18}s ease-in-out infinite`,
                  }}
                />
              ))}
              <div className="absolute inset-x-2 bottom-2 h-2 rounded-full bg-rose-500/30 blur-sm" />
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3">
            <p className="text-[11px] text-slate-300">Quick Quiz</p>
            <div className="mt-2 space-y-2">
              {quickQuizQuestions.map((q, qIdx) => (
                <div key={q.id} className="rounded border border-white/10 bg-black/20 p-2">
                  <p className="text-[11px] text-slate-200">{qIdx + 1}. {q.question}</p>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, optIdx) => {
                      const picked = quizAnswers[q.id] === optIdx
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                          className={`w-full rounded border px-2 py-1 text-left text-[11px] ${
                            picked ? 'border-cyan-300/60 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
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
            <div className="mt-3 rounded border border-emerald-300/30 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-100">
              Kết quả: {answeredCount}/{quickQuizQuestions.length} câu đã trả lời • đúng {correctCount} câu
            </div>
          </div>
        </aside>
        </>
      )}

      <div className="ui-overlay">
        {!showEarthHistory &&
          viewMode === 'solar' &&
          solarControlMode === 'observer' &&
          observerTargetLock &&
          showExploreLearningDock && (
            <div className="fixed top-[4.25rem] z-[19] flex items-center gap-2" style={{ right: `${dockWidthRem + 0.75}rem` }}>
              <button
                type="button"
                onClick={() => setSceneExploreActive(false)}
                className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-gray-100 border border-white/20"
              >
                Đóng khám phá
              </button>
              <button
                type="button"
                onClick={() => {
                  setObserverTargetLock(false)
                  setObserverLockPending(false)
                  setSceneExploreActive(false)
                }}
                className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-gray-200 border border-white/20"
              >
                Thoát khóa
              </button>
            </div>
          )}
        {showExploreTopBar && (
          <div
            className={`fixed top-14 left-0 p-3 sm:p-4 flex flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-4 z-10 ${
              showExploreLearningDock ? (deepDiveOpen ? 'right-[48rem]' : 'right-[22rem]') : 'right-0'
            }`}
          >
            <div className="glass rounded-lg px-2.5 sm:px-4 py-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
              {showEarthHistory ? (
                <button
                  type="button"
                  onClick={() => setEarthHistoryOpen(false)}
                  className="px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium bg-cyan-500/40 text-cyan-300"
                >
                  ← Back to Solar System
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('solar')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                      viewMode === 'solar'
                        ? 'bg-cyan-500/40 text-cyan-300'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    ☀️ Solar System
                  </button>
                  {viewMode === 'solar' && (
                    <div className="flex rounded-lg overflow-hidden border border-white/10">
                      <button
                        type="button"
                        onClick={() => setSolarControlMode('observer')}
                        className={`px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-medium ${
                          solarControlMode === 'observer' ? 'bg-white/15 text-white' : 'text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        Học tập
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSolarControlMode((prev) => (prev === 'cockpit' ? 'observer' : 'cockpit'))
                        }
                        className={`px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-medium ${
                          solarControlMode === 'cockpit' ? 'bg-emerald-600/50 text-emerald-100' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        🚀 Pilot Mode
                      </button>
                    </div>
                  )}
                  {!reducedMode && (
                    <button
                      type="button"
                      onClick={() => setViewMode('milkyway')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                        viewMode === 'milkyway'
                          ? 'bg-cyan-500/40 text-cyan-300'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      🌌 Milky Way
                    </button>
                  )}
                </>
              )}
            </div>
            {!showEarthHistory && isEarthSelected && solarControlMode !== 'cockpit' && (
              <button
                type="button"
                onClick={() => setEarthHistoryOpen(true)}
                className="glass rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-cyan-300 hover:bg-cyan-500/30 transition-colors"
              >
                🌍 Explore Earth History
              </button>
            )}

            {!showEarthHistory &&
              viewMode === 'solar' &&
              selectedSolarPlanetIndex !== null &&
              !showExploreLearningDock &&
              solarControlMode !== 'cockpit' && (
                <div className="glass rounded-xl px-3 sm:px-4 py-3 max-w-[min(92vw,22rem)] text-left border border-cyan-500/25">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-400/90 mb-1">
                    {solarControlMode === 'observer' && observerLockPending
                      ? 'Đang phóng tới…'
                      : solarControlMode === 'observer' && observerTargetLock
                        ? 'Target lock'
                        : 'Destination'}
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-white">
                    {planetsData[selectedSolarPlanetIndex]?.name ?? 'Planet'}
                  </p>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    {planetsData[selectedSolarPlanetIndex]?.explorerBlurb}
                  </p>
                  {solarControlMode === 'observer' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!observerTargetLock && !observerLockPending && (
                        <button
                          type="button"
                          onClick={() => setObserverLockPending(true)}
                          className="rounded-lg bg-cyan-600/50 hover:bg-cyan-500/50 px-3 py-1.5 text-xs font-medium text-white border border-cyan-400/40"
                        >
                          Khóa mục tiêu · phóng to
                        </button>
                      )}
                      {observerLockPending && (
                        <span className="text-[11px] text-cyan-300/90 py-1.5">Đang tới đích…</span>
                      )}
                      {observerTargetLock && (
                        <>
                          {sceneAnchor && (
                            <button
                              type="button"
                              onClick={() => setSceneExploreActive(true)}
                              className="rounded-lg bg-cyan-600/55 hover:bg-cyan-500/55 px-3 py-1.5 text-xs font-medium text-white border border-cyan-300/40"
                            >
                              Khám phá {sceneAnchor.label}
                            </button>
                          )}
                          {sceneExploreActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setSceneExploreActive(false)
                              }}
                              className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-gray-100 border border-white/20"
                            >
                              Đóng khám phá
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setObserverTargetLock(false)
                              setObserverLockPending(false)
                              setSceneExploreActive(false)
                            }}
                            className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-gray-200 border border-white/20"
                          >
                            Thoát khóa
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {cockpitFullscreen && (
          <button
            type="button"
            className="fixed top-3 right-3 z-[40] pointer-events-auto rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-xs font-medium text-emerald-200 shadow-lg backdrop-blur hover:bg-white/10 sm:top-4 sm:right-4 sm:px-4 sm:text-sm"
            onClick={() => setSolarControlMode('observer')}
          >
            Tắt Pilot Mode
          </button>
        )}

        {showEarthHistory && (
          <>
            <Timeline />
            <InfoPanel />
            <FossilPanel />
            <Controls />
          </>
        )}

        {!showEarthHistory && (
          <div
            className={`fixed left-1/2 -translate-x-1/2 glass rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-400 text-center max-w-[95vw] sm:max-w-md ${
              viewMode === 'solar' && solarControlMode === 'cockpit'
                ? 'bottom-3 sm:bottom-4'
                : 'bottom-3 sm:bottom-4'
            }`}
            style={showExploreLearningDock ? { right: '22rem', width: 'calc(100vw - 22rem)' } : undefined}
            style={showExploreLearningDock ? { right: `${dockWidthRem}rem`, width: `calc(100vw - ${dockWidthRem}rem)` } : undefined}
          >
            {viewMode === 'solar' && solarControlMode === 'observer' && (
              <>
                Chọn đích → <span className="text-cyan-300">Khóa mục tiêu</span> để bay camera tới — Target lock chỉ hiện khi đã tới nơi
              </>
            )}
            {viewMode === 'solar' && solarControlMode === 'cockpit' && (
              <span className="text-emerald-300/90">
                {telemetry.dockedAtPlanet
                  ? 'Đã tới nơi — mở mục khám phá ở bảng điều khiển'
                  : 'Pilot Mode: chọn hành tinh, rồi nhấn Travel để bay'}
              </span>
            )}
            {viewMode === 'milkyway' && 'Milky Way sky. Drag to rotate, scroll to zoom.'}
          </div>
        )}

        {!showEarthHistory && viewMode === 'solar' && solarControlMode === 'cockpit' && (
          <CockpitInterior
            targetLabel={
              selectedSolarPlanetIndex !== null
                ? planetsData[selectedSolarPlanetIndex]?.name ?? 'Planet'
                : 'Staging / Sun'
            }
            distance={telemetry.distance}
            speed={telemetry.speed}
            distToNavTarget={telemetry.distToNavTarget}
            dockedAtPlanet={telemetry.dockedAtPlanet}
            selectedIndex={selectedSolarPlanetIndex}
            onSelectDestination={(idx) => {
              void engineRef.current?.ensureRunning()
              setSelectedSolarPlanetIndex(idx)
            }}
            onEarthHistory={() => setEarthHistoryOpen(true)}
            earthHistoryEnabled={selectedSolarPlanetIndex === EARTH_PLANET_INDEX}
            engineVolume={cockpitVolume}
            onEngineVolumeChange={handleCockpitVolumeChange}
          />
        )}

        {/* Explore mode now avoids 2D overlays to keep 3D interaction clean. */}
      </div>
    </main>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black pt-20"><Loading /></main>}>
      <CockpitHudTargetProvider>
        <ExplorePageContent />
      </CockpitHudTargetProvider>
    </Suspense>
  )
}
