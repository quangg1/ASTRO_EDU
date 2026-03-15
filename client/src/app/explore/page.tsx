'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Timeline } from '@/components/ui/Timeline'
import { InfoPanel } from '@/components/ui/InfoPanel'
import { FossilPanel } from '@/components/ui/FossilPanel'
import { Controls } from '@/components/ui/Controls'
import { Loading } from '@/components/ui/Loading'
import { useSimulatorStore } from '@/store/useSimulatorStore'

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

const EARTH_PLANET_INDEX = 2

export default function ExplorePage() {
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')
  const stageTime = stageParam != null ? parseFloat(stageParam) : null
  const [viewMode, setViewMode] = useState<ViewMode>('solar')
  const [selectedSolarPlanetIndex, setSelectedSolarPlanetIndex] = useState<number | null>(null)
  const [earthHistoryOpen, setEarthHistoryOpen] = useState(!!stageTime)
  const appliedStageRef = useRef<number | null>(null)
  const loadStages = useSimulatorStore((s) => s.loadStages)
  const stages = useSimulatorStore((s) => s.stages)
  const stagesLoading = useSimulatorStore((s) => s.stagesLoading)
  const setStage = useSimulatorStore((s) => s.setStage)

  const showEarthHistory = earthHistoryOpen
  const isEarthSelected = viewMode === 'solar' && selectedSolarPlanetIndex === EARTH_PLANET_INDEX

  // Khi mở Earth History: load stages từ API (có majorEvents, life, climate), fallback static
  useEffect(() => {
    if (showEarthHistory) loadStages()
  }, [showEarthHistory, loadStages])

  // ?stage=540: mở Earth History và chọn đúng giai đoạn sau khi stages đã load
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black min-h-screen min-w-[320px]">
      <div className="canvas-container">
        <Suspense fallback={<Loading />}>
          {showEarthHistory && <EarthScene />}
          {!showEarthHistory && viewMode === 'solar' && (
            <SolarSystemScene onPlanetSelect={setSelectedSolarPlanetIndex} />
          )}
          {!showEarthHistory && viewMode === 'milkyway' && <MilkyWayScene />}
        </Suspense>
      </div>

      <div className="ui-overlay">
        <div className="fixed top-14 left-0 right-0 p-4 flex items-center justify-between gap-4 z-10">
          <div className="glass rounded-lg px-4 py-2 flex items-center gap-2">
            {showEarthHistory ? (
              <button
                type="button"
                onClick={() => setEarthHistoryOpen(false)}
                className="px-3 py-1.5 rounded text-sm font-medium bg-cyan-500/40 text-cyan-300"
              >
                ← Quay lại Hệ Mặt Trời
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setViewMode('solar')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'solar'
                      ? 'bg-cyan-500/40 text-cyan-300'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  ☀️ Hệ Mặt Trời
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('milkyway')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'milkyway'
                      ? 'bg-cyan-500/40 text-cyan-300'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🌌 Milky Way
                </button>
              </>
            )}
          </div>
          {!showEarthHistory && isEarthSelected && (
            <button
              type="button"
              onClick={() => setEarthHistoryOpen(true)}
              className="glass rounded-lg px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/30 transition-colors"
            >
              🌍 Khám phá lịch sử Trái Đất
            </button>
          )}
        </div>

        {showEarthHistory && (
          <>
            <Timeline />
            <InfoPanel />
            <FossilPanel />
            <Controls />
          </>
        )}

        {!showEarthHistory && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 glass rounded-lg px-4 py-2 text-sm text-gray-400 text-center max-w-md">
            {viewMode === 'solar' && (
              <>Kéo để xoay • Scroll để zoom • <span className="text-cyan-300">Click vào hành tinh để chuyển tâm nhìn</span> • Chọn Trái Đất để khám phá lịch sử</>
            )}
            {viewMode === 'milkyway' && 'Bầu trời Milky Way. Kéo để xoay, scroll để zoom.'}
          </div>
        )}
      </div>
    </main>
  )
}
