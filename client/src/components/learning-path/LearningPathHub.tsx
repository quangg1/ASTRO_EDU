'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  computeProgressPercent,
  loadLessonCompletion,
  moduleProgressPercent,
  syncLearningPathCompletion,
} from '@/lib/learningPathProgress'
import { useLearningPath } from '@/hooks/useLearningPath'
import { useAuthStore } from '@/store/useAuthStore'

// ── Design tokens ──────────────────────────────────────
const AMBER = '#f5a524'
const CYAN = '#7ee7ff'
const AMBER_ORDERS = new Set([1, 4, 5])

function isAmberMod(order: number) { return AMBER_ORDERS.has(order) }
function getAccent(order: number) { return AMBER_ORDERS.has(order) ? AMBER : CYAN }
function getAccentRgb(order: number) { return AMBER_ORDERS.has(order) ? '245,165,36' : '126,231,255' }

// Deterministic pseudo-random (avoids hydration mismatch)
function pr(seed: number) { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x) }
const STARS = Array.from({ length: 160 }, (_, i) => ({
  x: pr(i * 7 + 1) * 100,
  y: pr(i * 7 + 2) * 100,
  r: pr(i * 7 + 3) * 1.2 + 0.4,
  o: pr(i * 7 + 4) * 0.55 + 0.18,
  d: pr(i * 7 + 5) * 4 + 2.2,
  c: pr(i * 7 + 6) > 0.9 ? CYAN : pr(i * 7 + 1) > 0.88 ? AMBER : '#ffffff',
}))

// ── Module SVG icons ────────────────────────────────────
function ModuleIcon({ order, color }: { order: number; color: string }) {
  const p = { stroke: color, fill: 'none', strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (order === 1) return (
    <svg viewBox="0 0 48 48" width="42" height="42" style={{ display: 'block' }}>
      <circle cx="24" cy="24" r="4" {...p} />
      <circle cx="24" cy="24" r="10" strokeOpacity="0.7" {...p} />
      <circle cx="24" cy="24" r="17" strokeOpacity="0.35" {...p} />
      <line x1="24" y1="3" x2="24" y2="7" {...p} />
      <line x1="45" y1="24" x2="41" y2="24" {...p} />
    </svg>
  )
  if (order === 2) return (
    <svg viewBox="0 0 48 48" width="42" height="42" style={{ display: 'block' }}>
      <ellipse cx="24" cy="24" rx="19" ry="7" transform="rotate(-35 24 24)" {...p} />
      <ellipse cx="24" cy="24" rx="19" ry="7" transform="rotate(85 24 24)" strokeOpacity="0.45" {...p} />
      <circle cx="24" cy="24" r="4" fill={color} stroke="none" />
      <circle cx="24" cy="5" r="2" fill={color} stroke="none" />
    </svg>
  )
  if (order === 3) return (
    <svg viewBox="0 0 48 48" width="42" height="42" style={{ display: 'block' }}>
      <path d="M18 34 L24 16 L30 34" {...p} />
      <line x1="15" y1="34" x2="33" y2="34" {...p} />
      <circle cx="24" cy="27" r="4" {...p} />
      <line x1="24" y1="8" x2="24" y2="14" strokeDasharray="2 2" {...p} />
    </svg>
  )
  if (order === 4) return (
    <svg viewBox="0 0 48 48" width="42" height="42" style={{ display: 'block' }}>
      <circle cx="24" cy="24" r="5" {...p} fill={color} fillOpacity="0.25" />
      <circle cx="24" cy="24" r="13" {...p} />
      <circle cx="37" cy="24" r="2.5" fill={color} stroke="none" />
      <ellipse cx="24" cy="24" rx="19" ry="6" strokeOpacity="0.4" strokeDasharray="3 2" {...p} />
    </svg>
  )
  if (order === 5) return (
    <svg viewBox="0 0 48 48" width="42" height="42" style={{ display: 'block' }}>
      <path d="M24 5 L26.8 21.2 L43 24 L26.8 26.8 L24 43 L21.2 26.8 L5 24 L21.2 21.2 Z" {...p} />
      <circle cx="24" cy="24" r="3.5" fill={color} stroke="none" />
    </svg>
  )
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" style={{ display: 'block' }}>
      <line x1="24" y1="4" x2="24" y2="44" strokeOpacity="0.35" {...p} />
      <line x1="4" y1="24" x2="44" y2="24" strokeOpacity="0.35" {...p} />
      <circle cx="24" cy="24" r="10" {...p} />
      <circle cx="24" cy="24" r="19" strokeOpacity="0.35" strokeDasharray="3 3" {...p} />
      <circle cx="24" cy="24" r="3" fill={color} stroke="none" />
    </svg>
  )
}

// ── Corner bracket decorations ──────────────────────────
function CornerBrackets({ color, size = 14, thickness = 2 }: { color: string; size?: number; thickness?: number }) {
  const base: React.CSSProperties = { position: 'absolute', width: size, height: size, pointerEvents: 'none' }
  const b = `${thickness}px solid ${color}`
  return (
    <>
      <span style={{ ...base, top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <span style={{ ...base, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span style={{ ...base, bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  )
}

// ── Title with italic key word after " & " ──────────────
function TitleDisplay({ titleVi, accentColor }: { titleVi: string; accentColor: string }) {
  const idx = titleVi.indexOf(' & ')
  if (idx !== -1) {
    return (
      <>
        {titleVi.slice(0, idx)} &{' '}
        <em style={{ fontStyle: 'italic', fontWeight: 300, color: accentColor }}>{titleVi.slice(idx + 3)}</em>
      </>
    )
  }
  return <>{titleVi}</>
}

// ── Main component ──────────────────────────────────────
export default function LearningPathHub() {
  const { modules } = useLearningPath()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [pct, setPct] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [progressTick, setProgressTick] = useState(0)

  useEffect(() => {
    setMounted(true)
    const local = loadLessonCompletion(userId)
    setPct(computeProgressPercent(local, modules))
    void syncLearningPathCompletion(userId).then((synced) => {
      setPct(computeProgressPercent(synced, modules))
    })
  }, [progressTick, modules, userId])

  useEffect(() => {
    const bump = () => setProgressTick((t) => t + 1)
    const onVis = () => { if (document.visibilityState === 'visible') bump() }
    window.addEventListener('focus', bump)
    window.addEventListener('storage', bump)
    window.addEventListener('lp-progress-changed', bump)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', bump)
      window.removeEventListener('storage', bump)
      window.removeEventListener('lp-progress-changed', bump)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const modulePcts = useMemo(() => {
    if (!mounted) return {} as Record<string, number>
    const map = loadLessonCompletion(userId)
    const o: Record<string, number> = {}
    for (const m of modules) {
      o[m.id] = moduleProgressPercent(map, m.id, modules)
    }
    return o
  }, [mounted, progressTick, modules, userId, pct])

  return (
    <div style={{ minHeight: '100vh', background: '#03060f', position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Keyframes + hover CSS ── */}
      <style>{`
        @keyframes lp-scan   { from { transform: translateY(-4px) } to { transform: translateY(100vh) } }
        @keyframes lp-ping   { 0%   { transform: scale(1); opacity: 0.9 } 100% { transform: scale(2.6); opacity: 0 } }
        @keyframes lp-pulse  { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }

        .lp-card { transition: transform 0.25s ease, box-shadow 0.28s ease !important; }
        .lp-card:hover { transform: translateY(-3px) !important; }

        .lp-btn { transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease !important; }
        .lp-card:hover .lp-btn-amber {
          background: #f5a524 !important; color: #1a0e00 !important;
          box-shadow: 0 0 14px rgba(245,165,36,0.55) !important;
        }
        .lp-card:hover .lp-btn-cyan {
          background: #7ee7ff !important; color: #001e24 !important;
          box-shadow: 0 0 14px rgba(126,231,255,0.55) !important;
        }
        .lp-arrow { display: inline-block; transition: transform 0.2s ease; }
        .lp-card:hover .lp-arrow { transform: translateX(4px); }

        @media (max-width: 1180px) { .lp-grid { grid-template-columns: 1fr !important; } .lp-edge { display: none !important; } }
        @media (max-width: 860px)  {
          .lp-main { padding-left: 16px !important; padding-right: 16px !important; }
          .lp-h1   { font-size: 41px !important; }
          .lp-icon-tile { width: 68px !important; height: 68px !important; }
          .lp-card-footer { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>

      {/* ── Starfield ── */}
      <svg aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill={s.c} opacity={s.o}>
            <animate attributeName="opacity" values={`${s.o.toFixed(2)};${(s.o * 0.2).toFixed(2)};${s.o.toFixed(2)}`} dur={`${s.d.toFixed(1)}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* ── Grid overlay ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)',
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 10%,transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 10%,transparent 100%)',
      }} />

      {/* ── Scanline ── */}
      <div aria-hidden style={{
        position: 'fixed', left: 0, right: 0, top: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${CYAN},transparent)`,
        boxShadow: `0 0 8px ${CYAN}`, opacity: 0.5,
        animation: 'lp-scan 12s linear infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── Ambient corner glow ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 55% 35% at 6% 68%,rgba(245,165,36,0.05) 0%,transparent 60%),radial-gradient(ellipse 55% 35% at 94% 32%,rgba(126,231,255,0.05) 0%,transparent 60%)',
      }} />

      {/* ── Edge labels ── */}
      <div className="lp-edge" style={{ position: 'fixed', left: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#263042', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          COSMOLEARN · V2.0 · LEARNING PATH MATRIX
        </span>
      </div>
      <div className="lp-edge" style={{ position: 'fixed', right: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#263042', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Lat 21.0285° N — Lon 105.8542° E — Alt 12m
        </span>
      </div>

      {/* ── Main ── */}
      <main className="lp-main" style={{ position: 'relative', zIndex: 10, paddingTop: 88, paddingBottom: 80, paddingLeft: 'clamp(24px,4vw,64px)', paddingRight: 'clamp(24px,4vw,64px)', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 72 }}
        >
          {/* Eyebrow pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '7px 20px',
              clipPath: 'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
              background: 'rgba(126,231,255,0.07)',
              border: `1px solid rgba(126,231,255,0.38)`,
              boxShadow: '0 0 18px rgba(126,231,255,0.14)',
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11, letterSpacing: '0.2em', color: CYAN, textTransform: 'uppercase' as const,
            }}>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: CYAN, display: 'block', boxShadow: `0 0 8px ${CYAN}`, animation: 'lp-pulse 2s ease-in-out infinite' }} />
                <span style={{ position: 'absolute', width: 15, height: 15, borderRadius: '50%', border: `1px solid ${CYAN}`, top: -4, left: -4, animation: 'lp-ping 2.2s ease-out infinite', opacity: 0 }} />
              </span>
              Lộ trình 6 module
            </div>
          </div>

          {/* H1 */}
          <h1 className="lp-h1" style={{
            fontSize: 'clamp(41px,6vw,109px)',
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 0.96,
            marginBottom: 4,
            background: `linear-gradient(175deg,#eaf6ff 35%,${CYAN} 115%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Learning Path
          </h1>
          <div style={{ height: 2, maxWidth: 300, margin: '10px auto 22px', background: `linear-gradient(90deg,transparent,${CYAN},transparent)`, boxShadow: `0 0 10px ${CYAN}`, borderRadius: 1 }} />

          {/* Lead */}
          <p style={{ color: '#9aa8c4', fontSize: 15, lineHeight: 1.7, maxWidth: 600, margin: '0 auto 32px', fontFamily: "'Space Grotesk',sans-serif" }}>
            Mỗi chủ đề có ba tầng{' '}
            <span style={{ color: AMBER, fontWeight: 500 }}>Beginner</span> →{' '}
            <span style={{ color: CYAN, fontWeight: 500 }}>Explorer</span> →{' '}
            <span style={{ color: '#eaf6ff', fontWeight: 500 }}>Researcher</span>
            ; trong mỗi tầng, từng ý nhỏ là một <strong style={{ color: '#eaf6ff' }}>bài học riêng</strong>. Tiến độ theo từng bài, lưu trên trình duyệt.
          </p>

          {/* Total progress strip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886' }}>
              <span>Tổng tiến độ</span>
              <span style={{ color: CYAN, fontWeight: 500, fontSize: 13 }}>{mounted ? pct : '—'}%</span>
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 520, height: 8, background: 'rgba(255,255,255,0.04)', clipPath: 'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)', border: '1px solid rgba(126,231,255,0.1)' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ position: 'absolute', left: `${(i / 6) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(126,231,255,0.15)', zIndex: 1 }} />
              ))}
              <motion.div
                style={{ height: '100%', background: `linear-gradient(90deg,rgba(126,231,255,0.35),${CYAN})`, position: 'relative' }}
                initial={{ width: 0 }}
                animate={{ width: mounted ? `${pct}%` : '0%' }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                {mounted && pct > 1 && (
                  <span style={{ position: 'absolute', right: 0, top: -1, bottom: -1, width: 4, background: CYAN, boxShadow: `0 0 8px ${CYAN},0 0 16px ${CYAN}` }} />
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.header>

        {/* ── Module grid ── */}
        <motion.ul
          className="lp-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 24, padding: 0, margin: 0, listStyle: 'none' }}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {modules.map((m) => {
            const mp    = modulePcts[m.id] ?? 0
            const ac    = getAccent(m.order)
            const acRgb = getAccentRgb(m.order)
            const amber = isAmberMod(m.order)
            const inProg = mp > 0 && mp < 100
            const ord   = String(m.order).padStart(2, '0')

            return (
              <motion.li
                key={m.id}
                variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.42 } } }}
              >
                <Link href={`/tutorial/${m.id}`} style={{ display: 'block', height: '100%', textDecoration: 'none' }}>
                  <div
                    className="lp-card"
                    style={{
                      position: 'relative', height: '100%',
                      background: `linear-gradient(140deg,rgba(${acRgb},0.07) 0%,rgba(6,9,26,0.96) 55%,#03060f 100%)`,
                      border: inProg ? `2px solid rgba(${acRgb},0.72)` : `1px solid rgba(${acRgb},0.26)`,
                      boxShadow: inProg
                        ? `0 0 32px rgba(${acRgb},0.32),0 0 64px rgba(${acRgb},0.1),inset 0 0 24px rgba(${acRgb},0.04)`
                        : `0 0 16px rgba(${acRgb},0.12),0 0 32px rgba(${acRgb},0.05)`,
                      clipPath: 'polygon(18px 0%,100% 0%,100% calc(100% - 18px),calc(100% - 18px) 100%,0% 100%,0% 18px)',
                      padding: '28px 28px 24px',
                      overflow: 'hidden', cursor: 'pointer',
                    }}
                  >
                    <CornerBrackets color={ac} size={16} thickness={inProg ? 2 : 1.5} />

                    {/* Left accent bar */}
                    <span aria-hidden style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, pointerEvents: 'none',
                      background: `linear-gradient(180deg,transparent 0%,${ac} 38%,${ac} 62%,transparent 100%)`,
                      boxShadow: `2px 0 10px rgba(${acRgb},0.5)`,
                    }} />

                    {/* Watermark number */}
                    <span aria-hidden style={{
                      position: 'absolute', bottom: -28, right: 10, pointerEvents: 'none', userSelect: 'none',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 190, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em',
                      color: 'transparent',
                      WebkitTextStroke: `2px rgba(${acRgb},0.09)`,
                    }}>{ord}</span>

                    {/* Eyebrow row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: ac }}>
                        <span style={{ width: 22, height: 1, background: ac, display: 'inline-block', boxShadow: `0 0 4px ${ac}` }} />
                        Module {ord}
                      </div>
                      <span style={{
                        padding: '2px 10px',
                        clipPath: 'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)',
                        background: inProg ? `rgba(${acRgb},0.14)` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${inProg ? `rgba(${acRgb},0.6)` : 'rgba(255,255,255,0.1)'}`,
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em',
                        color: inProg ? ac : '#5c6886', fontWeight: 600,
                      }}>{mp}%</span>
                    </div>

                    {/* Icon + Title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
                      <div className="lp-icon-tile" style={{ position: 'relative', flexShrink: 0, width: 80, height: 80 }}>
                        <div style={{
                          width: '100%', height: '100%',
                          clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)',
                          background: `rgba(${acRgb},0.08)`,
                          border: `1px solid rgba(${acRgb},0.42)`,
                          boxShadow: `0 0 18px rgba(${acRgb},0.22),inset 0 0 12px rgba(${acRgb},0.06)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ModuleIcon order={m.order} color={ac} />
                        </div>
                        <CornerBrackets color={ac} size={7} thickness={1} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25, color: '#eaf6ff', margin: '0 0 8px', fontFamily: "'Space Grotesk',sans-serif" }}>
                          <TitleDisplay titleVi={m.titleVi} accentColor={ac} />
                        </h2>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3a4a6a' }}>
                          // {m.title}
                        </div>
                      </div>
                    </div>

                    {/* Description block */}
                    <div style={{ borderLeft: `2px solid rgba(${acRgb},0.55)`, background: `linear-gradient(90deg,rgba(${acRgb},0.05),transparent 80%)`, padding: '10px 14px', marginBottom: 22 }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#9aa8c4', lineHeight: 1.65, fontFamily: "'Space Grotesk',sans-serif" }}>
                        {m.goalVi}
                      </p>
                    </div>

                    {/* Progress */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3a4a6a' }}>// Tiến độ</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: ac, fontWeight: 500 }}>{mp}%</span>
                      </div>
                      <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.04)', clipPath: 'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {[1, 2, 3].map(i => (
                          <span key={i} style={{ position: 'absolute', left: `${i * 25}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />
                        ))}
                        <div style={{ width: `${mp}%`, height: '100%', background: `linear-gradient(90deg,rgba(${acRgb},0.3),${ac})`, position: 'relative', transition: 'width 0.6s ease' }}>
                          {mp > 2 && (
                            <span style={{ position: 'absolute', right: 0, top: -1, bottom: -1, width: 4, background: ac, boxShadow: `0 0 6px ${ac},0 0 12px ${ac}` }} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="lp-card-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{
                        padding: '5px 14px',
                        clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        background: 'rgba(255,255,255,0.03)',
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9aa8c4',
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ opacity: 0.45, fontSize: 13 }}>≡</span> {m.nodes.length} chủ đề
                      </span>
                      <span
                        className={`lp-btn ${amber ? 'lp-btn-amber' : 'lp-btn-cyan'}`}
                        style={{
                          padding: '7px 18px',
                          clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid rgba(${acRgb},0.4)`,
                          boxShadow: 'none',
                          fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                          color: ac,
                          fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        }}
                      >
                        Mở module <span className="lp-arrow">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>
      </main>
    </div>
  )
}
