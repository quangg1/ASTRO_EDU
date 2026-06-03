'use client'

import { useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import type { NarrativeBeat } from '@/features/content3d/narrative/types'
import { usePlaybackStore } from '@/features/content3d/earth/public'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'

function isTypingTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true
  return el.isContentEditable
}

/** Nhãn mốc timeline — chỉ thời gian, không tên giai đoạn. */
function milestoneTimeLabel(beat: NarrativeBeat): string {
  const ma = beat.timeMa
  if (Number.isFinite(ma)) {
    if (ma >= 1000) return `${(ma / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Ga`
    if (ma >= 1) return `${ma.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} Ma`
    return `${ma.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Ma`
  }
  const raw = beat.ageLabelVi.trim()
  const dash = raw.indexOf('·')
  if (dash > 0) return raw.slice(dash + 1).trim()
  if (raw.length > 14) return `${raw.slice(0, 12)}…`
  return raw
}

const SPEED_OPTIONS = [
  { value: 0, label: 'Dừng' },
  { value: 5000, label: '0.5×' },
  { value: 3000, label: '1×' },
  { value: 1500, label: '2×' },
  { value: 750, label: '4×' },
] as const

/** Dock dưới: điều khiển gọn + thanh trượt mốc thời gian (không icon/mô tả beat). */
export function NarrativeBottomDock() {
  const beats = usePlanetNarrativeStore((s) => s.beats)
  const currentBeatIndex = usePlanetNarrativeStore((s) => s.currentBeatIndex)
  const setBeatIndex = usePlanetNarrativeStore((s) => s.setBeatIndex)
  const showTimeline = usePlanetNarrativeStore((s) => s.showTimeline)
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
  const cur = beats[currentBeatIndex]
  const accent = cur?.accentColor || '#ea580c'
  const speedLabel = SPEED_OPTIONS.find((o) => o.value === playSpeed)?.label ?? '1×'

  const milestones = useMemo(() => beats.map((b) => milestoneTimeLabel(b)), [beats])

  const nextStage = () => setBeatIndex(currentBeatIndex < totalBeats - 1 ? currentBeatIndex + 1 : 0)
  const prevStage = () => setBeatIndex(Math.max(0, currentBeatIndex - 1))

  useEffect(() => {
    if (!isPlaying || playSpeed <= 0) return
    const id = setInterval(() => {
      const { beats: st, currentBeatIndex: idx, setBeatIndex: setIdx } = usePlanetNarrativeStore.getState()
      const n = st.length
      if (n === 0) return
      setIdx(idx < n - 1 ? idx + 1 : 0)
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

  if (!showTimeline || totalBeats === 0) return null

  const progressPct = totalBeats <= 1 ? 0 : (currentBeatIndex / (totalBeats - 1)) * 100
  const trackPad = '1.25rem'

  return (
    <div
      className="pointer-events-auto w-full rounded-2xl border border-ds-border bg-black/75 px-3 py-2 shadow-[0_-6px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-4"
    >
      {/* Hàng điều khiển — gọn, không lặp tên giai đoạn (đã có ở panel) */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-ds-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={prevStage}
            disabled={currentBeatIndex === 0}
            aria-label="Mốc trước"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ds-muted hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={playSpeed <= 0}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-md text-white',
              playSpeed <= 0 && 'opacity-40',
            )}
            style={{ backgroundColor: `${accent}cc` }}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={nextStage}
            disabled={currentBeatIndex >= totalBeats - 1}
            aria-label="Mốc sau"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ds-muted hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        <label className="hidden items-center gap-1.5 rounded-lg border border-ds-border bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-wider text-ds-subtle sm:flex">
          Tốc độ
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="cursor-pointer border-0 bg-transparent text-[11px] font-medium text-slate-200 outline-none"
          >
            {SPEED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div
          className="min-w-0 flex-1 truncate rounded-lg border px-3 py-1.5 text-right text-[11px] font-medium tabular-nums text-slate-100 sm:text-xs"
          style={{ borderColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}22` }}
          title={cur?.name}
        >
          {milestones[currentBeatIndex]}
          <span className="ml-2 hidden font-normal text-ds-subtle sm:inline">{speedLabel}</span>
        </div>

        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <button
            type="button"
            onClick={() => toggleGlobeRotationPaused()}
            className="rounded border border-ds-border px-1.5 py-1 text-[10px] text-ds-subtle hover:text-ds-muted"
            title="Space"
          >
            {globeRotationPaused ? '▶' : '⏸'}
          </button>
          <button
            type="button"
            aria-pressed={effectDustDemo}
            onClick={() => toggleEffectDustDemo()}
            className="rounded border border-ds-border px-1.5 py-1 text-[10px] text-ds-subtle hover:text-ds-muted"
          >
            🌫
          </button>
          <button
            type="button"
            aria-pressed={effectFloodDemo}
            onClick={() => toggleEffectFloodDemo()}
            className="rounded border border-ds-border px-1.5 py-1 text-[10px] text-ds-subtle hover:text-ds-muted"
          >
            🌊
          </button>
        </div>
      </div>

      {/* Thanh trượt — chỉ mốc thời gian */}
      <div className="relative" style={{ paddingLeft: trackPad, paddingRight: trackPad }}>
        <div className="relative mb-1 flex justify-between gap-0.5">
          {milestones.map((label, index) => {
            const active = index === currentBeatIndex
            return (
              <button
                key={beats[index].id}
                type="button"
                onClick={() => setBeatIndex(index)}
                aria-current={active ? 'step' : undefined}
                aria-label={beats[index].name}
                className={clsx(
                  'min-w-0 flex-1 truncate text-center text-[9px] tabular-nums transition-colors sm:text-[10px]',
                  active ? 'font-medium text-white' : 'text-slate-600 hover:text-ds-muted',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" aria-hidden />
          <div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 transition-[width] duration-200"
            style={{
              width: `${progressPct}%`,
              backgroundColor: accent,
              boxShadow: `0 0 8px ${accent}99`,
            }}
            aria-hidden
          />

          <div className="relative flex h-full items-center justify-between">
            {beats.map((beat, index) => {
              const active = index === currentBeatIndex
              const passed = index < currentBeatIndex
              return (
                <button
                  key={beat.id}
                  type="button"
                  onClick={() => setBeatIndex(index)}
                  aria-label={beat.name}
                  className="relative z-[1] flex h-full flex-1 items-center justify-center"
                >
                  <span
                    className={clsx(
                      'rounded-full transition-all',
                      active ? 'h-3 w-3 border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'h-1.5 w-1.5',
                      !active && (passed ? 'bg-white/50' : 'bg-white/25'),
                    )}
                    style={
                      active
                        ? { backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }
                        : passed
                          ? { backgroundColor: `${accent}99` }
                          : undefined
                    }
                  />
                </button>
              )
            })}
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, totalBeats - 1)}
            value={currentBeatIndex}
            onChange={(e) => setBeatIndex(parseInt(e.target.value, 10))}
            className="absolute inset-0 z-[2] h-full w-full cursor-pointer opacity-0"
            aria-label="Chọn mốc thời gian"
          />
        </div>
      </div>
    </div>
  )
}
