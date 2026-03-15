'use client'

import { useEffect } from 'react'
import { useSimulatorStore } from '@/store/useSimulatorStore'
import { clsx } from 'clsx'

export function Controls() {
  const { 
    currentStageIndex,
    isPlaying,
    playSpeed,
    setStage,
    nextStage,
    prevStage,
    togglePlay,
    setPlaySpeed
  } = useSimulatorStore()

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      nextStage()
    }, playSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, playSpeed, nextStage])

  const stages = useSimulatorStore((s) => s.stages)
  const totalStages = stages.length

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 animate-fade-in">
      <div className="glass rounded-full px-6 py-3 flex items-center gap-4">
        {/* Previous button */}
        <button
          onClick={prevStage}
          disabled={currentStageIndex === 0}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            currentStageIndex === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          )}
        >
          ◀
        </button>

        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors text-xl',
            isPlaying
              ? 'bg-yellow-600 hover:bg-yellow-500'
              : 'bg-green-600 hover:bg-green-500'
          )}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Next button */}
        <button
          onClick={nextStage}
          className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center transition-colors"
        >
          ▶
        </button>

        {/* Slider */}
        <div className="flex items-center gap-2 px-4 border-l border-cyan-400/30">
          <input
            type="range"
            min={0}
            max={totalStages - 1}
            value={currentStageIndex}
            onChange={(e) => setStage(parseInt(e.target.value))}
            className="w-32 accent-cyan-400"
          />
          <span className="text-sm text-gray-400 w-16">
            {currentStageIndex + 1}/{totalStages}
          </span>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2 px-4 border-l border-cyan-400/30">
          <span className="text-sm text-gray-400">Speed:</span>
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
            className="bg-transparent text-white text-sm border border-cyan-400/30 rounded px-2 py-1"
          >
            <option value={5000}>0.5x</option>
            <option value={3000}>1x</option>
            <option value={1500}>2x</option>
            <option value={750}>4x</option>
          </select>
        </div>
      </div>
    </div>
  )
}
