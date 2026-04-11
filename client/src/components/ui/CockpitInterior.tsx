'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { planetsData } from '@/lib/solarSystemData'
import { useCockpitHudTarget } from '@/contexts/CockpitHudTargetContext'
import CockpitJourneyMilestones from '@/components/ui/CockpitJourneyMilestones'

/**
 * Bridge layout (không phải dashboard web — chỉ HUD mô phỏng):
 * ┌────────────────────────────────────────────┐
 * │ VIEWPORT (SPACE) — forward window only    │
 * ├───────────┬────────────────┬───────────────┤
 * │ NAV       │ MAIN CONTROLS  │ TELEMETRY     │
 * ├───────────┴────────────────┴───────────────┤
 * │ SYSTEM STATUS + âm lượng động cơ          │
 * └────────────────────────────────────────────┘
 */
export default function CockpitInterior({
  targetLabel,
  distance,
  speed,
  distToNavTarget,
  dockedAtPlanet,
  selectedIndex,
  onSelectDestination,
  onEarthHistory,
  earthHistoryEnabled,
  engineVolume,
  onEngineVolumeChange,
}: {
  targetLabel: string
  distance: number
  speed: number
  distToNavTarget: number
  /** Neo đích — hiển thị thông tin khám phá + khung “chọn nhân vật”. */
  dockedAtPlanet: boolean
  selectedIndex: number | null
  onSelectDestination: (index: number | null) => void
  onEarthHistory: () => void
  earthHistoryEnabled: boolean
  engineVolume: number
  onEngineVolumeChange: (volume: number) => void
}) {
  const explorePlanet = dockedAtPlanet && selectedIndex !== null ? planetsData[selectedIndex] : null
  const hudTarget = useCockpitHudTarget()
  const travelStartDistRef = useRef(0)
  const travelTargetRef = useRef<number | null>(null)

  useEffect(() => {
    if (selectedIndex === null) {
      travelStartDistRef.current = 0
      travelTargetRef.current = null
      return
    }
    if (travelTargetRef.current !== selectedIndex) {
      travelTargetRef.current = selectedIndex
      travelStartDistRef.current = Math.max(distToNavTarget, 0.01)
      return
    }
    if (distToNavTarget > travelStartDistRef.current) {
      travelStartDistRef.current = distToNavTarget
    }
  }, [selectedIndex, distToNavTarget])

  const travelProgress = useMemo(() => {
    if (selectedIndex === null) return 0
    if (dockedAtPlanet) return 100
    const start = Math.max(travelStartDistRef.current, 0.01)
    const ratio = 1 - distToNavTarget / start
    return Math.max(0, Math.min(99, Math.round(ratio * 100)))
  }, [selectedIndex, dockedAtPlanet, distToNavTarget])

  /** setTarget ổn định — không dùng cả object hudTarget trong deps (mỗi lần target đổi là object mới → vòng lặp). */
  const setHudTarget = hudTarget?.setTarget
  /** Toàn bộ vùng Target lock (hàng trên Nav / Main / Telemetry) — canvas khớp rect này; không có khung con */
  const planetViewFrameRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!setHudTarget) return
    if (!explorePlanet) {
      setHudTarget({ valid: false, planetFrameRect: null })
      return
    }
    const el = planetViewFrameRef.current
    if (!el) {
      setHudTarget({ valid: false, planetFrameRect: null })
      return
    }
    const update = () => {
      const canvas = document.querySelector('.canvas-container canvas') as HTMLCanvasElement | null
      if (!canvas) {
        setHudTarget({ valid: false, planetFrameRect: null })
        return
      }
      const r = el.getBoundingClientRect()
      const c = canvas.getBoundingClientRect()
      const cx = (r.left + r.right) / 2 - c.left
      const cy = (r.top + r.bottom) / 2 - c.top
      setHudTarget({
        canvasCenterX: cx / c.width,
        canvasCenterY: cy / c.height,
        valid: true,
        planetFrameRect: {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        },
      })
    }
    update()
    const ro = new ResizeObserver(() => requestAnimationFrame(update))
    ro.observe(el)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      setHudTarget({ valid: false, planetFrameRect: null })
    }
  }, [explorePlanet, setHudTarget])

  return (
    <div
      className="fixed inset-0 z-[15] flex flex-col pointer-events-none select-none h-[100dvh] max-h-[100dvh] min-h-0 bg-transparent"
      aria-hidden
    >
      {/* ROW 1: Target lock — chỉ viền viewport; toàn bộ ô phía trên 3 cột = vùng 3D (không khung giữa) */}
      <div className="relative flex flex-[2.85] flex-col min-h-[min(40vh,360px)] max-h-[min(68vh,72svh)] shrink-0 mx-2 sm:mx-3 mt-2 mb-1 rounded-xl border border-emerald-400/50 bg-transparent shadow-[0_0_0_1px_rgba(16,185,129,0.12)] overflow-hidden">
        <div className="pointer-events-none absolute top-2 left-3 right-3 z-[2] flex items-start justify-between gap-2">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-emerald-300/95 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">
            {explorePlanet ? 'Target lock' : 'Viewport'}
          </span>
          <span className="text-[9px] text-emerald-500/70 font-mono hidden sm:inline">
            {explorePlanet ? 'EXPLORATION READY' : 'FORWARD · CAM A'}
          </span>
        </div>
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            background:
              'radial-gradient(ellipse 88% 82% at 50% 42%, transparent 38%, rgba(0, 8, 16, 0.04) 70%, rgba(0, 0, 0, 0.1) 100%)',
          }}
        />
        {explorePlanet ? (
          <div ref={planetViewFrameRef} className="relative z-[1] min-h-0 w-full flex-1 bg-transparent pt-9 pb-1" />
        ) : (
          <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center pt-9 pb-2">
            <svg
              width="100"
              height="100"
              viewBox="0 0 120 120"
              className="mx-auto text-emerald-400/85 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)] sm:h-[112px] sm:w-[112px]"
            >
              <circle cx="60" cy="60" r="26" fill="none" stroke="currentColor" strokeWidth="0.75" opacity={0.45} />
              <circle cx="60" cy="60" r="3.5" fill="currentColor" opacity={0.9} />
              <line x1="60" y1="14" x2="60" y2="38" stroke="currentColor" strokeWidth="1.1" opacity={0.85} />
              <line x1="60" y1="82" x2="60" y2="106" stroke="currentColor" strokeWidth="1.1" opacity={0.85} />
              <line x1="14" y1="60" x2="38" y2="60" stroke="currentColor" strokeWidth="1.1" opacity={0.85} />
              <line x1="82" y1="60" x2="106" y2="60" stroke="currentColor" strokeWidth="1.1" opacity={0.85} />
            </svg>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.035]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)',
          }}
        />
      </div>

      {/* ROW 2: three panels */}
      <div className="flex flex-1 min-h-[120px] gap-1.5 px-2 sm:gap-2 sm:px-3 shrink-0">
        <PanelColumn title="Chọn hành tinh" className="flex-[1.05]">
          <div className="pointer-events-auto flex flex-col gap-1.5 overflow-y-auto max-h-[min(36vh,280px)] pr-0.5">
            {explorePlanet && (
              <div className="rounded-lg border border-cyan-500/35 bg-cyan-950/35 p-2.5 mb-0.5 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
                <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/90 mb-1">Đích khám phá</p>
                <p className="text-sm font-semibold text-white leading-tight">{explorePlanet.name}</p>
                <p className="text-[11px] text-cyan-200/90 mt-0.5">{explorePlanet.nameVi}</p>
                <p className="text-[10px] text-slate-400 leading-snug mt-2 border-t border-white/10 pt-2">
                  {explorePlanet.explorerBlurb}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-mono text-slate-500">
                  <div>
                    <dt className="text-slate-600">Quỹ đạo (sim)</dt>
                    <dd className="text-emerald-200/90">{explorePlanet.distance}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Bán kính (sim)</dt>
                    <dd className="text-emerald-200/90">{explorePlanet.radius.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Chu kỳ quỹ</dt>
                    <dd className="text-emerald-200/90">{explorePlanet.period}s</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Tự quay</dt>
                    <dd className="text-emerald-200/90">{explorePlanet.spinPeriod}s</dd>
                  </div>
                </dl>
              </div>
            )}
            <ConsoleBtn active={selectedIndex === null} onClick={() => onSelectDestination(null)}>
              Staging / Sun
            </ConsoleBtn>
            <div className="grid grid-cols-1 gap-1">
              {planetsData.map((p, i) => (
                <ConsoleBtn key={p.name} active={selectedIndex === i} onClick={() => onSelectDestination(i)}>
                  {p.name}
                </ConsoleBtn>
              ))}
            </div>
          </div>
        </PanelColumn>

        <PanelColumn title="Pilot controls" className="flex-[1.15]">
          <div className="pointer-events-auto flex flex-col gap-3 h-full min-h-0 justify-start overflow-hidden">
            <CockpitJourneyMilestones dockedAtPlanet={dockedAtPlanet} destinationIndex={selectedIndex} />
            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed shrink-0">
              Chọn hành tinh để khám phá ở cột <span className="text-emerald-400/90">Chọn hành tinh</span>.
              Hệ thống luôn tính quãng bay từ vị trí hiện tại của bạn.
            </p>
            <div className="rounded-lg border border-emerald-500/25 bg-black/35 p-2.5">
              <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>Tiến trình hành trình</span>
                <span className="font-mono text-emerald-300">{travelProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-[width] duration-500"
                  style={{ width: `${travelProgress}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center shrink-0">
              <ConsoleBtn
                active={false}
                disabled={selectedIndex === null}
                onClick={() => selectedIndex !== null && onSelectDestination(selectedIndex)}
                title={selectedIndex !== null ? `Đang bay tới ${targetLabel}` : 'Hãy chọn một hành tinh'}
              >
                {selectedIndex !== null ? `Travel → ${targetLabel}` : 'Travel'}
              </ConsoleBtn>
              <ConsoleBtn
                variant="earth"
                active={false}
                disabled={!earthHistoryEnabled}
                onClick={() => earthHistoryEnabled && onEarthHistory()}
                title={earthHistoryEnabled ? 'Mở Earth History' : 'Hãy chọn Trái Đất trước'}
              >
                Earth History
              </ConsoleBtn>
              <span className="text-[10px] text-slate-500">
                Mục tiêu hiện tại: <span className="text-emerald-300">{targetLabel}</span>
              </span>
            </div>
            {selectedIndex !== null && !dockedAtPlanet && (
              <p className="text-[11px] text-emerald-300/90">Đang bay tới {targetLabel}...</p>
            )}
          </div>
        </PanelColumn>

        <PanelColumn title="Thông tin bay" className="flex-[0.95]">
          <div className="pointer-events-auto font-mono text-[10px] sm:text-[11px] text-emerald-100/95 space-y-2">
            <Row k="TARGET" v={targetLabel} />
            <Row
              k="RANGE"
              v={
                dockedAtPlanet
                  ? 'Neo đích (điểm tiếp cận)'
                  : `${distance.toFixed(1)} sim (tới tâm)`
              }
            />
            <Row k="DTM" v={`${distToNavTarget.toFixed(2)}`} hint="to nav target" />
            <Row k="VEL" v={`${(speed * 3.6).toFixed(1)} km/h (sim)`} />
            <Row k="ORIGIN" v="Vị trí hiện tại" />
          </div>
        </PanelColumn>
      </div>

      {/* ROW 3: System status + engine volume */}
      <div className="pointer-events-auto shrink-0 mt-1 mx-2 sm:mx-4 mb-[max(0.5rem,env(safe-area-inset-bottom))] rounded-xl border border-emerald-500/35 bg-[#03060a]/95 px-3 py-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2 gap-y-2 shadow-[inset_0_1px_0_rgba(16,185,129,0.12)]">
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
          System status
        </div>
        <div className="font-mono text-[10px] sm:text-xs text-emerald-200/95 hidden sm:block">
          NAV · OK · PROP · OK · HULL · SEALED
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="whitespace-nowrap">Động cơ</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(engineVolume * 100)}
              onChange={(e) => onEngineVolumeChange(Number(e.target.value) / 100)}
              className="w-[72px] sm:w-[100px] h-1 accent-emerald-500"
              aria-label="Âm lượng tiếng động cơ"
            />
            <span className="font-mono text-emerald-400/90 w-7 tabular-nums">{Math.round(engineVolume * 100)}</span>
          </label>
          <button
            type="button"
            onClick={() => onEngineVolumeChange(engineVolume < 0.02 ? 0.7 : 0)}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
          >
            {engineVolume < 0.02 ? 'Bật' : 'Tắt'}
          </button>
        </div>
        <div className="text-[9px] sm:text-[10px] text-slate-500 w-full text-center sm:text-right sm:w-auto">
          Cosmo Learn · bridge · sim
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0">
      <span className="text-emerald-600/90 shrink-0" title={hint}>
        {k}
      </span>
      <span className="text-right text-emerald-100/95 truncate">{v}</span>
    </div>
  )
}

function PanelColumn({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-emerald-500/25 bg-[#020508] flex flex-col min-h-0 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(16,185,129,0.08)] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(165deg, rgba(16,185,129,0.07) 0%, transparent 42%), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 12px)',
      }}
    >
      <div className="px-2 py-1.5 border-b border-emerald-500/15 text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-emerald-400/90 shrink-0 bg-[#0a1210]/80">
        {title}
      </div>
      <div className="p-2 flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

function ConsoleBtn({
  children,
  onClick,
  active,
  disabled,
  variant = 'default',
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  variant?: 'default' | 'earth'
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-full min-h-8 px-2 py-1.5 rounded-md text-left text-[11px] sm:text-xs font-medium transition border ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-white/10 text-slate-500'
          : active
            ? 'border-emerald-400/70 bg-emerald-600/35 text-emerald-50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            : variant === 'earth'
              ? 'border-cyan-500/35 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-900/50'
              : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-emerald-500/30'
      }`}
    >
      {children}
    </button>
  )
}
