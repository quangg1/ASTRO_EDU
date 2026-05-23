'use client'

import { useEffect } from 'react'
import { clsx } from 'clsx'
import { useEarthHistoryStore, usePlaybackStore, useSceneCommandStore } from '@/features/content3d/earth/public'

function isTypingTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true
  return el.isContentEditable
}

export function Controls() {
  const stages = useEarthHistoryStore((s) => s.stages)
  const currentStageIndex = useEarthHistoryStore((s) => s.currentStageIndex)
  const setStageIndex = useEarthHistoryStore((s) => s.setStageIndex)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const playSpeed = usePlaybackStore((s) => s.playSpeed)
  const togglePlay = usePlaybackStore((s) => s.togglePlay)
  const setPlaySpeed = usePlaybackStore((s) => s.setPlaySpeed)
  const showHotspots = useSceneCommandStore((s) => s.showHotspots)
  const effectTags = useSceneCommandStore((s) => s.effectTags)
  const toggleHotspots = useSceneCommandStore((s) => s.toggleHotspots)
  const toggleEffectTag = useSceneCommandStore((s) => s.toggleEffectTag)
  const earthRotationPaused = useSceneCommandStore((s) => s.earthRotationPaused)
  const setEarthRotationPaused = useSceneCommandStore((s) => s.setEarthRotationPaused)

  const totalStages = stages.length
  const accent = stages[currentStageIndex]?.atmosphereColor || '#06b6d4'
  const nextStage = () => setStageIndex(currentStageIndex < totalStages - 1 ? currentStageIndex + 1 : 0)
  const prevStage = () => setStageIndex(Math.max(0, currentStageIndex - 1))

  /** Đọc index mới nhất mỗi tick — tránh closure stale làm speed / bước kỳ sai. */
  useEffect(() => {
    if (!isPlaying || playSpeed <= 0) return

    const id = setInterval(() => {
      const { stages: st, currentStageIndex: idx, setStageIndex: setIdx } = useEarthHistoryStore.getState()
      const n = st.length
      if (n === 0) return
      const next = idx < n - 1 ? idx + 1 : 0
      setIdx(next)
    }, playSpeed)

    return () => clearInterval(id)
  }, [isPlaying, playSpeed])

  /** Space: tạm dừng / tiếp tục quay Trái Đất (cùng state với panel Hóa thạch). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      setEarthRotationPaused(!useSceneCommandStore.getState().earthRotationPaused)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setEarthRotationPaused])

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 animate-fade-in">
      {/*
       * Shell uses scene-surface tokens (bg-ds-overlay, backdrop-blur). The
       * dynamic border color is the geological era accent — domain-driven, not
       * a surface token. Slider/select accents follow the same beat color.
       */}
      <div
        className="bg-ds-overlay backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-4 border"
        style={{ borderColor: `${accent}55` }}
      >
        {/* Previous button */}
        <button
          onClick={prevStage}
          disabled={currentStageIndex === 0}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            currentStageIndex === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'text-white'
          )}
          style={currentStageIndex === 0 ? undefined : { backgroundColor: accent }}
        >
          ◀
        </button>

        {/* Play/Pause — tắt khi 0x (không có chu kỳ tự chạy). */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={playSpeed <= 0}
          title={playSpeed <= 0 ? 'Chọn tốc độ > 0x để tự chạy qua các kỳ' : undefined}
          className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors text-xl',
            playSpeed <= 0 && 'cursor-not-allowed opacity-45',
            isPlaying ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500',
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
            value={currentStageIndex}
            onChange={(e) => setStageIndex(parseInt(e.target.value))}
            className="w-32 accent-cyan-400"
          />
          <span className="text-sm text-gray-400 w-16">
            {currentStageIndex + 1}/{totalStages}
          </span>
        </div>

        {/* Speed = khoảng cách ms giữa hai kỳ; 0 = đứng yên (không tự chuyển kỳ). */}
        <div className="flex items-center gap-2 px-4 border-l" style={{ borderColor: `${accent}55` }}>
          <span className="text-sm text-gray-400 whitespace-nowrap">Tốc độ:</span>
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

        <div className="flex items-center gap-1.5 border-l px-4" style={{ borderColor: `${accent}55` }}>
          <span
            className="hidden max-w-[5.5rem] text-[9px] leading-tight text-gray-400 sm:inline"
            title="Phím Space — tạm dừng / tiếp tục quay Trái Đất (khác tốc độ timeline)"
          >
            Space: {earthRotationPaused ? '▶ quay' : '⏸ dừng'}
          </span>
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
