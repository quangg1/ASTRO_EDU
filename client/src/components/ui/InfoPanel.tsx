'use client'

import { useSimulatorStore } from '@/store/useSimulatorStore'
import { clsx } from 'clsx'
import { FeaturedOrganisms } from './FeaturedOrganisms'
import type { MajorEvent } from '@/types'

const EVENT_TYPE_LABELS: Record<string, string> = {
  volcanic: '🌋 Núi lửa',
  impact: '💥 Va chạm',
  climate: '🌡️ Khí hậu',
  biological: '🧬 Sinh học',
  tectonic: '🌐 Kiến tạo',
  extinction: '💀 Tuyệt chủng',
  evolution: '🦎 Tiến hóa',
}

export function InfoPanel() {
  const { currentStage, showInfoPanel } = useSimulatorStore()

  if (!showInfoPanel) return null

  const o2Color = getO2Color(currentStage.o2)
  const co2Color = getCO2Color(currentStage.co2)
  const hasMajorEvents = currentStage.majorEvents && currentStage.majorEvents.length > 0
  const hasLife = currentStage.life && (currentStage.life.exists || (currentStage.life.dominantLifeforms?.length ?? 0) > 0)
  const hasClimate = currentStage.climate && (
    currentStage.climate.globalTemp != null ||
    currentStage.climate.seaLevel != null ||
    currentStage.climate.iceCoverage != null
  )

  return (
    <div className="fixed right-0 top-16 w-80 h-[min(50vh,calc(100vh-10rem))] min-h-[280px] animate-slide-right flex flex-col">
      <div className="glass rounded-l-xl p-4 m-4 flex-1 min-h-0 overflow-y-scroll overflow-x-hidden shadow-xl" style={{ scrollbarGutter: 'stable' }}>
        {/* Time display */}
        <div className="text-right mb-4">
          <div className="text-sm text-gray-400">TIME =</div>
          <div className={clsx(
            'text-3xl font-bold font-mono',
            currentStage.isExtinction ? 'text-red-400' : 'text-cyan-400'
          )}>
            {formatTimeDisplay(currentStage.time)}
          </div>
        </div>

        {/* Day length */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <span className="text-gray-400">Day length</span>
          <span className="text-white font-mono">
            <span className="text-yellow-400 text-lg">{currentStage.dayLength}</span> hours
          </span>
        </div>

        {/* Atmosphere */}
        <div className="mb-4">
          <h3 className="text-gray-400 text-sm mb-2">ATMOSPHERE</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">O₂</span>
              <span className="font-mono">
                <span className={clsx('text-lg', o2Color)}>{currentStage.o2.toFixed(1)}</span>
                <span className="text-gray-400 ml-1">%</span>
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400">CO₂</span>
              <span className="font-mono">
                <span className={clsx('text-lg', co2Color)}>{currentStage.co2.toFixed(0)}</span>
                <span className="text-gray-400 ml-1">ppm</span>
              </span>
            </div>
          </div>
        </div>

        {/* Climate (từ API) */}
        {hasClimate && currentStage.climate && (
          <div className="mb-4">
            <h3 className="text-gray-400 text-sm mb-2">CLIMATE</h3>
            <div className="space-y-1 text-sm">
              {currentStage.climate.globalTemp != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Nhiệt độ TB</span>
                  <span className="text-amber-300 font-mono">{currentStage.climate.globalTemp} °C</span>
                </div>
              )}
              {currentStage.climate.seaLevel != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Mực nước biển</span>
                  <span className="text-sky-300 font-mono">{formatSeaLevel(currentStage.climate.seaLevel)}</span>
                </div>
              )}
              {currentStage.climate.iceCoverage != null && currentStage.climate.iceCoverage > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Băng phủ</span>
                  <span className="text-blue-200 font-mono">{currentStage.climate.iceCoverage}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Major Events (từ API) */}
        {hasMajorEvents && (
          <div className="mb-4">
            <h3 className="text-cyan-400 text-sm font-semibold mb-2">SỰ KIỆN LỚN</h3>
            <div className="space-y-3">
              {currentStage.majorEvents!.map((event: MajorEvent, i: number) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-white">{event.name}</span>
                    {event.type && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {EVENT_TYPE_LABELS[event.type] ?? event.type}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-gray-400 leading-relaxed">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Life (từ API) */}
        {hasLife && currentStage.life && (
          <div className="mb-4">
            <h3 className="text-green-400 text-sm font-semibold mb-2">SỰ SỐNG</h3>
            <div className="space-y-1 text-sm">
              {currentStage.life.complexity && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Độ phức tạp</span>
                  <span className="text-green-300 capitalize">{currentStage.life.complexity.replace(/_/g, ' ')}</span>
                </div>
              )}
              {currentStage.life.biodiversityIndex != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Đa dạng sinh học</span>
                  <span className="text-green-300 font-mono">{currentStage.life.biodiversityIndex}/100</span>
                </div>
              )}
              {currentStage.life.dominantLifeforms && currentStage.life.dominantLifeforms.length > 0 && (
                <div className="mt-1">
                  <p className="text-gray-400 text-xs mb-1">Sinh vật thống trị</p>
                  <div className="flex flex-wrap gap-1">
                    {currentStage.life.dominantLifeforms.slice(0, 6).map((lf, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300"
                      >
                        {lf.name}
                      </span>
                    ))}
                    {currentStage.life.dominantLifeforms.length > 6 && (
                      <span className="text-xs text-gray-500">+{currentStage.life.dominantLifeforms.length - 6}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage info + mô tả thời kỳ (luôn hiển thị, cuộn nếu dài) */}
        <div className="border-t border-cyan-400/30 pt-4 pb-2">
          <h3 className={clsx(
            'text-lg font-bold mb-1',
            currentStage.isExtinction ? 'text-red-400' : 'text-cyan-400'
          )}>
            {currentStage.icon} {currentStage.name}
          </h3>
          <p className="text-sm text-gray-400 mb-2">{currentStage.timeDisplay}</p>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {currentStage.description}
          </p>
          {currentStage.resources?.wikipediaUrl && (
            <a
              href={currentStage.resources.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-cyan-400 hover:text-cyan-300"
            >
              Wikipedia →
            </a>
          )}
          <div className="mt-4 border-t border-white/10 pt-4">
            <FeaturedOrganisms stageId={currentStage.id} variant="compact" />
          </div>
        </div>

        {/* Extinction warning */}
        {currentStage.isExtinction && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <span className="text-xl">💀</span>
              <span className="font-bold">MASS EXTINCTION EVENT</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatSeaLevel(m: number): string {
  if (m === 0) return '0 m'
  if (m > 0) return `+${m} m`
  return `${m} m`
}

function formatTimeDisplay(time: number): string {
  if (time === 0) return 'NOW'
  if (time < 0.001) return `${(time * 1000000).toFixed(0)} YA`
  if (time < 1) return `${(time * 1000).toFixed(0)} KA`
  return `${time.toFixed(0)} MYA`
}

function getO2Color(o2: number): string {
  if (o2 < 5) return 'text-red-400'
  if (o2 < 15) return 'text-yellow-400'
  return 'text-green-400'
}

function getCO2Color(co2: number): string {
  if (co2 > 5000) return 'text-red-400'
  if (co2 > 1000) return 'text-yellow-400'
  return 'text-green-400'
}
