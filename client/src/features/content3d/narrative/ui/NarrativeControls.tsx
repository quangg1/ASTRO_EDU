'use client'

import { useEffect } from 'react'
import { clsx } from 'clsx'
import { usePlaybackStore } from '@/features/content3d/earth/public'
import {
  resolveDustEffectIntensity,
  resolveFloodGlowVisible,
} from '@/features/content3d/narrative/lib/effectHelpers'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'

function isTypingTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true
  return el.isContentEditable
}

export function NarrativeControls() {
  const beats = usePlanetNarrativeStore((s) => s.beats)
  const currentBeatIndex = usePlanetNarrativeStore((s) => s.currentBeatIndex)
  const setBeatIndex = usePlanetNarrativeStore((s) => s.setBeatIndex)
  const globeRotationPaused = usePlanetNarrativeStore((s) => s.globeRotationPaused)
  const toggleGlobeRotationPaused = usePlanetNarrativeStore((s) => s.toggleGlobeRotationPaused)
  const effectDustDemo = usePlanetNarrativeStore((s) => s.effectDustDemo)
  const effectFloodDemo = usePlanetNarrativeStore((s) => s.effectFloodDemo)
  const toggleEffectDustDemo = usePlanetNarrativeStore((s) => s.toggleEffectDustDemo)
  const toggleEffectFloodDemo = usePlanetNarrativeStore((s) => s.toggleEffectFloodDemo)

  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const playSpeed = usePlaybackStore((s) => s.playSpeed)
  const togglePlay = usePlaybackStore((s) => s.togglePlay)
  const setPlaySpeed = usePlaybackStore((s) => s.setPlaySpeed)

  const totalBeats = beats.length
  const accent = beats[currentBeatIndex]?.accentColor || '#ea580c'
  const cur = beats[currentBeatIndex]
  const dustLive = cur ? resolveDustEffectIntensity(cur, effectDustDemo) : 0
  const floodLive = cur ? resolveFloodGlowVisible(cur, effectFloodDemo) : false

  const nextStage = () => setBeatIndex(currentBeatIndex < totalBeats - 1 ? currentBeatIndex + 1 : 0)
  const prevStage = () => setBeatIndex(Math.max(0, currentBeatIndex - 1))

  useEffect(() => {
    if (!isPlaying || playSpeed <= 0) return
    const id = setInterval(() => {
      const { beats: st, currentBeatIndex: idx, setBeatIndex: setIdx } = usePlanetNarrativeStore.getState()
      const n = st.length
      if (n === 0) return
      const next = idx < n - 1 ? idx + 1 : 0
      setIdx(next)
    }, playSpeed)
    return () => clearInterval(id)
  }, [isPlaying, playSpeed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      toggleGlobeRotationPaused()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleGlobeRotationPaused])

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 animate-fade-in">
      <div
        className="flex items-center gap-4 rounded-full border bg-ds-overlay px-6 py-3 backdrop-blur-md"
        style={{ borderColor: `${accent}55` }}
      >
        <button
          type="button"
          onClick={prevStage}
          disabled={currentBeatIndex === 0}
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            currentBeatIndex === 0 ? 'cursor-not-allowed bg-gray-700 text-gray-500' : 'text-white',
          )}
          style={currentBeatIndex === 0 ? undefined : { backgroundColor: accent }}
        >
          ◀
        </button>

        <button
          type="button"
          onClick={togglePlay}
          disabled={playSpeed <= 0}
          title={playSpeed <= 0 ? 'Chọn tốc độ &gt; 0 để tự chạy' : undefined}
          className={clsx(
            'flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors',
            playSpeed <= 0 && 'cursor-not-allowed opacity-45',
            isPlaying ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500',
          )}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          type="button"
          onClick={nextStage}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors"
          style={{ backgroundColor: accent }}
        >
          ▶
        </button>

        <div className="flex items-center gap-2 border-l px-4" style={{ borderColor: `${accent}55` }}>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalBeats - 1)}
            value={currentBeatIndex}
            onChange={(e) => setBeatIndex(parseInt(e.target.value, 10))}
            className="w-32 accent-orange-400"
          />
          <span className="w-14 text-sm text-gray-400">
            {currentBeatIndex + 1}/{totalBeats}
          </span>
        </div>

        <div className="flex items-center gap-2 border-l px-4" style={{ borderColor: `${accent}55` }}>
          <span className="whitespace-nowrap text-sm text-gray-400">Tốc độ:</span>
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="rounded border bg-black/40 px-2 py-1 text-sm text-white"
            style={{ borderColor: `${accent}66` }}
          >
            <option value={0}>0x — đứng yên</option>
            <option value={5000}>0.5x (~5s)</option>
            <option value={3000}>1x (~3s)</option>
            <option value={1500}>2x (~1.5s)</option>
            <option value={750}>4x (~0.75s)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 border-l px-3" style={{ borderColor: `${accent}55` }}>
          <span className="hidden max-w-[6rem] text-[9px] leading-tight text-gray-400 sm:inline" title="Phím Space">
            Space: {globeRotationPaused ? '▶ quay cầu' : '⏸ dừng quay'}
          </span>
          <button
            type="button"
            className="text-[10px] rounded px-2 py-1 border text-white"
            style={{
              borderColor: `${accent}66`,
              background: globeRotationPaused ? 'transparent' : `${accent}33`,
            }}
            onClick={() => toggleGlobeRotationPaused()}
          >
            {globeRotationPaused ? '▶' : '⏸'} quả cầu
          </button>
          <button
            type="button"
            title="Bật/tắt thử bão bụi (minh họa sư phạm)"
            aria-pressed={effectDustDemo}
            aria-label="Bật hoặc tắt thử bão bụi trên globe"
            className="text-[10px] rounded px-2 py-1 border text-white"
            style={{
              borderColor: `${accent}66`,
              background: effectDustDemo ? `${accent}42` : dustLive > 0 ? `${accent}18` : 'transparent',
            }}
            onClick={() => toggleEffectDustDemo()}
          >
            🌫{dustLive > 0 ? ` ${dustLive}` : ''}
          </button>
          <button
            type="button"
            title="Bật/tắt thử kênh lũ Hesperian (minh họa)"
            aria-pressed={effectFloodDemo}
            aria-label="Bật hoặc tắt vệt sáng kênh lũ"
            className="text-[10px] rounded px-2 py-1 border text-white"
            style={{
              borderColor: `${accent}66`,
              background: effectFloodDemo ? `${accent}48` : floodLive ? `${accent}20` : 'transparent',
            }}
            onClick={() => toggleEffectFloodDemo()}
          >
            🌊
          </button>
        </div>
      </div>
    </div>
  )
}
