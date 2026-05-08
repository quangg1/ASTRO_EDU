'use client'

import { useEffect } from 'react'
import { clsx } from 'clsx'
import { useNarrativeStore } from '@/features/content3d/narrative/public'
import { usePlaybackStore, useSceneCommandStore } from '@/features/content3d/earth/public'

export function Controls() {
  const beats = useNarrativeStore((s) => s.beats)
  const currentBeatIndex = useNarrativeStore((s) => s.currentBeatIndex)
  const setBeat = useNarrativeStore((s) => s.setBeat)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const playSpeed = usePlaybackStore((s) => s.playSpeed)
  const togglePlay = usePlaybackStore((s) => s.togglePlay)
  const setPlaySpeed = usePlaybackStore((s) => s.setPlaySpeed)
  const showHotspots = useSceneCommandStore((s) => s.showHotspots)
  const effectTags = useSceneCommandStore((s) => s.effectTags)
  const toggleHotspots = useSceneCommandStore((s) => s.toggleHotspots)
  const toggleEffectTag = useSceneCommandStore((s) => s.toggleEffectTag)

  const totalStages = beats.length
  const accent = beats[currentBeatIndex]?.atmosphereColor || '#06b6d4'
  const nextStage = () => setBeat(currentBeatIndex < totalStages - 1 ? currentBeatIndex + 1 : 0)
  const prevStage = () => setBeat(Math.max(0, currentBeatIndex - 1))

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      nextStage()
    }, playSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, playSpeed, nextStage])

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 animate-fade-in">
      <div className="glass rounded-full px-6 py-3 flex items-center gap-4 border" style={{ borderColor: `${accent}55` }}>
        {/* Previous button */}
        <button
          onClick={prevStage}
          disabled={currentBeatIndex === 0}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            currentBeatIndex === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'text-white'
          )}
          style={currentBeatIndex === 0 ? undefined : { backgroundColor: accent }}
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
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: accent }}
        >
          ▶
        </button>

        {/* Slider */}
        <div className="flex items-center gap-2 px-4 border-l" style={{ borderColor: `${accent}55` }}>
          <input
            type="range"
            min={0}
            max={totalStages - 1}
            value={currentBeatIndex}
            onChange={(e) => setBeat(parseInt(e.target.value))}
            className="w-32 accent-cyan-400"
          />
          <span className="text-sm text-gray-400 w-16">
            {currentBeatIndex + 1}/{totalStages}
          </span>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2 px-4 border-l" style={{ borderColor: `${accent}55` }}>
          <span className="text-sm text-gray-400">Speed:</span>
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
            className="bg-transparent text-white text-sm border rounded px-2 py-1"
            style={{ borderColor: `${accent}66` }}
          >
            <option value={5000}>0.5x</option>
            <option value={3000}>1x</option>
            <option value={1500}>2x</option>
            <option value={750}>4x</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 px-4 border-l" style={{ borderColor: `${accent}55` }}>
          <button
            type="button"
            onClick={toggleHotspots}
            className="text-[10px] rounded px-2 py-1 border text-white"
            style={{
              borderColor: `${accent}66`,
              background: showHotspots ? `${accent}33` : 'transparent',
            }}
          >
            📍
          </button>
          <button
            type="button"
            onClick={() => toggleEffectTag('meteorShower')}
            className="text-[10px] rounded px-2 py-1 border text-white"
            style={{
              borderColor: `${accent}66`,
              background: effectTags.meteorShower ? `${accent}33` : 'transparent',
            }}
          >
            ☄
          </button>
          <button
            type="button"
            onClick={() => toggleEffectTag('debrisField')}
            className="text-[10px] rounded px-2 py-1 border text-white"
            style={{
              borderColor: `${accent}66`,
              background: effectTags.debrisField ? `${accent}33` : 'transparent',
            }}
          >
            🪨
          </button>
          <button
            type="button"
            onClick={() => toggleEffectTag('dustHaze')}
            className="text-[10px] rounded px-2 py-1 border text-white"
            style={{
              borderColor: `${accent}66`,
              background: effectTags.dustHaze ? `${accent}33` : 'transparent',
            }}
          >
            🌫
          </button>
        </div>
      </div>
    </div>
  )
}
