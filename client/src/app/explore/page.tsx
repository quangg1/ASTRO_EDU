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

const EARTH_PLANET_INDEX = 2

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

  const engineRef = useRef<CockpitEngineController | null>(null)
  const lastDestSyncedRef = useRef<number | null | undefined>(undefined)
  const arrivalSoundPlayedRef = useRef(false)
  const [cockpitVolume, setCockpitVolume] = useState(() =>
    typeof window !== 'undefined' ? loadCockpitEngineVolume() : 1
  )

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
  }, [selectedSolarPlanetIndex])

  useEffect(() => {
    if (solarControlMode !== 'observer') {
      setObserverTargetLock(false)
      setObserverLockPending(false)
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black min-h-screen min-w-[320px]">
      <div
        className={`canvas-container${dockCanvasInTargetFrame ? ' cockpit-canvas-target-lock' : ''}`}
        style={
          dockCanvasInTargetFrame && planetFrameRect
            ? {
                position: 'fixed',
                top: planetFrameRect.top,
                left: planetFrameRect.left,
                width: planetFrameRect.width,
                height: planetFrameRect.height,
                right: 'auto',
                bottom: 'auto',
                zIndex: 5,
              }
            : undefined
        }
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
            />
          )}
          {!showEarthHistory && viewMode === 'milkyway' && <MilkyWayScene />}
        </Suspense>
      </div>

      <div className="ui-overlay">
        {showExploreTopBar && (
          <div className="fixed top-14 left-0 right-0 p-3 sm:p-4 flex flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-4 z-10">
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
                        <button
                          type="button"
                          onClick={() => {
                            setObserverTargetLock(false)
                            setObserverLockPending(false)
                          }}
                          className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-gray-200 border border-white/20"
                        >
                          Thoát khóa
                        </button>
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
