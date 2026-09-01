'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { LearningModule } from '@/features/learning-path/data/learningPathCurriculum'
import { DEPTH_ORDER } from '@/features/learning-path/data/learningPathCurriculum'
import {
  loadLessonCompletion,
  moduleProgressPercent,
  syncLearningPathCompletion,
} from '@/features/learning-path/lib/learningPathProgress'
import { trackLearningPathBehavior } from '@/features/learning-path/lib/learningPathBehavior'
import { useLearningPath } from '@/features/learning-path/hooks/useLearningPath'
import { useAuthStore } from '@/features/auth/public'

type Props = { module: LearningModule }

function lessonCountForNode(node: LearningModule['nodes'][0]) {
  return DEPTH_ORDER.reduce((acc, d) => acc + (node.depths[d]?.length ?? 0), 0)
}

// ── Design tokens ──────────────────────────────────────────────
const AMBER = 'var(--color-brand-amber)'
const CYAN = 'var(--color-accent)'
const AMBER_ORDERS = new Set([1, 4, 5])

function getAccent(order: number) { return AMBER_ORDERS.has(order) ? AMBER : CYAN }
function getAccentRgb(order: number) { return AMBER_ORDERS.has(order) ? '245,165,36' : '126,231,255' }

function pr(seed: number) { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x) }
const STARS = Array.from({ length: 140 }, (_, i) => ({
  x: pr(i * 7 + 1) * 100, y: pr(i * 7 + 2) * 100,
  r: pr(i * 7 + 3) * 1.2 + 0.4,
  o: pr(i * 7 + 4) * 0.55 + 0.18,
  d: pr(i * 7 + 5) * 4 + 2.2,
  c: pr(i * 7 + 6) > 0.9 ? CYAN : pr(i * 7 + 1) > 0.88 ? AMBER : '#ffffff',
}))

// ── Module SVG icons ────────────────────────────────────────────
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

// ── Corner bracket decorations ──────────────────────────────────
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

// ── Title with italic key word after " & " ──────────────────────
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

// ── Main component ──────────────────────────────────────────────
export default function LearningModuleView({ module }: Props) {
  const { modules } = useLearningPath()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const m = modules.find((x) => x.id === module.id) ?? module
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const refresh = () =>
      setPct(moduleProgressPercent(loadLessonCompletion(userId), m.id, modules))
    const refreshAndSync = () => {
      refresh()
      void syncLearningPathCompletion(userId).then((synced) => {
        setPct(moduleProgressPercent(synced, m.id, modules))
      })
    }
    refreshAndSync()
    window.addEventListener('focus', refreshAndSync)
    window.addEventListener('storage', refreshAndSync)
    window.addEventListener('lp-progress-changed', refreshAndSync)
    return () => {
      window.removeEventListener('focus', refreshAndSync)
      window.removeEventListener('storage', refreshAndSync)
      window.removeEventListener('lp-progress-changed', refreshAndSync)
    }
  }, [m.id, modules, userId])

  useEffect(() => {
    trackLearningPathBehavior({
      eventName: 'lp_module_viewed',
      moduleId: m.id,
      metadata: { moduleOrder: m.order },
    })
  }, [m.id, m.order])

  const ac = getAccent(m.order)
  const acRgb = getAccentRgb(m.order)
  const ord = String(m.order).padStart(2, '0')
  const prevMod = modules.find((x) => x.order === m.order - 1)
  const nextMod = modules.find((x) => x.order === m.order + 1)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Keyframes + hover CSS ── */}
      <style>{`
        @keyframes mv-scan  { from { transform: translateY(-4px) } to { transform: translateY(100vh) } }
        @keyframes mv-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.15); } }
        @keyframes mv-ping  { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }

        .mv-node { transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease, box-shadow 0.28s ease !important; }
        .mv-node:hover { transform: translateX(2px) !important; border-color: rgba(var(--n-rgb),0.5) !important; box-shadow: 0 0 22px rgba(var(--n-rgb),0.15), inset 0 0 14px rgba(var(--n-rgb),0.04) !important; }
        .mv-node:hover .mv-rail { opacity: 1 !important; box-shadow: 0 0 10px rgba(var(--n-rgb),0.7) !important; }
        .mv-node:hover .mv-brackets span { opacity: 0.85 !important; filter: drop-shadow(0 0 3px rgba(var(--n-rgb),0.8)) !important; }
        .mv-node:hover .mv-icon-box { border-color: rgba(var(--n-rgb),0.55) !important; box-shadow: 0 0 14px rgba(var(--n-rgb),0.25) !important; }
        .mv-node:hover .mv-arrow-tile { background: rgba(var(--n-rgb),0.82) !important; color: #001e24 !important; }
        .mv-node:hover .mv-arrow-icon { transform: translateX(2px) !important; }
        .mv-arrow-icon { transition: transform 0.2s ease !important; display: inline-block; }
        .mv-arrow-tile { transition: background 0.2s ease, color 0.2s ease !important; }
        .mv-rail { transition: opacity 0.22s ease, box-shadow 0.22s ease !important; }
        .mv-brackets span { transition: opacity 0.22s ease, filter 0.22s ease !important; opacity: 0; }
        .mv-icon-box { transition: border-color 0.22s ease, box-shadow 0.22s ease !important; }

        @media (max-width: 1100px) { .mv-edge { display: none !important; } }
        @media (max-width: 760px) {
          .mv-main { padding-left: 16px !important; padding-right: 16px !important; }
          .mv-title { font-size: 30px !important; }
          .mv-icon-tile { width: 60px !important; height: 60px !important; }
          .mv-node-num { display: none !important; }
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
        animation: 'mv-scan 12s linear infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── Ambient corner glow ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 55% 35% at 6% 68%,rgba(245,165,36,0.05) 0%,transparent 60%),radial-gradient(ellipse 55% 35% at 94% 32%,var(--color-accent-soft) 0%,transparent 60%)',
      }} />

      {/* ── Edge labels ── */}
      <div className="mv-edge" style={{ position: 'fixed', left: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#263042', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          COSMOLEARN · V2.6 · MODULE / {ord} IN
        </span>
      </div>
      <div className="mv-edge" style={{ position: 'fixed', right: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#263042', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Lat 21.0285° N — Lon 105.8542° E — Alt 12m
        </span>
      </div>

      {/* ── Main ── */}
      <main className="mv-main" style={{ position: 'relative', zIndex: 10, paddingTop: 96, paddingBottom: 80, paddingLeft: 'clamp(24px,4vw,64px)', paddingRight: 'clamp(24px,4vw,64px)', maxWidth: 960, margin: '0 auto' }}>

        {/* ── Breadcrumb ── */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          <Link
            href="/tutorial"
            style={{ color: '#8a9bb8', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
            onMouseLeave={e => (e.currentTarget.style.color = '#8a9bb8')}
          >
            Learning Path
          </Link>
          <span style={{ color: '#263042' }}>/</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: ac }}>
            <span style={{ width: 24, height: 1, background: ac, display: 'inline-block', boxShadow: `0 0 4px ${ac}` }} />
            {m.titleVi}
          </span>
        </motion.nav>

        {/* ── Module header ── */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          style={{ marginBottom: 36 }}
        >
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: ac }}>
            <span style={{ width: 22, height: 1, background: ac, display: 'inline-block', boxShadow: `0 0 4px ${ac}` }} />
            Module {ord}
          </div>

          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 26 }}>
            <div className="mv-icon-tile" style={{ position: 'relative', flexShrink: 0, width: 80, height: 80 }}>
              <div style={{
                width: '100%', height: '100%',
                clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)',
                background: `rgba(${acRgb},0.08)`,
                border: `1px solid rgba(${acRgb},0.42)`,
                boxShadow: `0 0 24px rgba(${acRgb},0.28),inset 0 0 14px rgba(${acRgb},0.08)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ModuleIcon order={m.order} color={ac} />
              </div>
              <CornerBrackets color={ac} size={7} thickness={1} />
            </div>

            <div style={{ flex: 1, paddingTop: 6 }}>
              <h1 className="mv-title" style={{
                fontSize: 'clamp(32px,5vw,54px)',
                fontFamily: "'Space Grotesk',sans-serif",
                fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.025em',
                color: 'var(--color-text-primary)', margin: '0 0 10px',
              }}>
                <TitleDisplay titleVi={m.titleVi} accentColor={ac} />
              </h1>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a9bb8' }}>
                // {m.title}
              </div>
            </div>
          </div>

          {/* Description band */}
          <div style={{
            borderLeft: `2px solid rgba(${acRgb},0.6)`,
            background: `linear-gradient(90deg,rgba(${acRgb},0.06),transparent 80%)`,
            padding: '12px 18px',
            marginBottom: 28,
          }}>
            <p style={{ margin: 0, fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1.7, fontFamily: "'Space Grotesk',sans-serif" }}>
              {m.goalVi}
            </p>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: m.connections.length > 0 ? 20 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a9bb8' }}>
                // Tiến độ module
              </span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: CYAN, fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.04)', clipPath: 'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)', border: 'rgba(126,231,255,0.12)' }}>
              {[1, 2, 3, 4].map(i => (
                <span key={i} style={{ position: 'absolute', left: `${i * 20}%`, top: 0, bottom: 0, width: 1, background: 'var(--color-accent-soft)', zIndex: 1 }} />
              ))}
              <motion.div
                style={{ height: '100%', background: `linear-gradient(90deg,rgba(126,231,255,0.3),${CYAN})`, position: 'relative' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {pct > 2 && (
                  <span style={{ position: 'absolute', right: 0, top: -1, bottom: -1, width: 4, background: CYAN, boxShadow: `0 0 6px ${CYAN},0 0 12px ${CYAN}` }} />
                )}
              </motion.div>
            </div>
          </div>

          {/* Connections / jump buttons */}
          {m.connections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
              {m.connections.map((c) => (
                <span key={c} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '7px 18px',
                  clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                  background: 'rgba(126,231,255,0.07)',
                  border: '1px solid var(--color-border-accent, var(--color-border))',
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: CYAN, fontWeight: 600,
                }}>
                  → {c}
                </span>
              ))}
            </div>
          )}
        </motion.header>

        {/* ── Section heading ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}
        >
          {/* Diagonal tab pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 22px 5px 14px',
            clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)',
            background: `rgba(${acRgb},0.10)`,
            border: `1px solid rgba(${acRgb},0.38)`,
            fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: ac, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <span style={{ position: 'relative', width: 6, height: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ac, display: 'inline-block', boxShadow: `0 0 6px ${ac}`, animation: 'mv-pulse 2s ease-in-out infinite' }} />
            </span>
            // Chủ đề
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--color-text-subtle)', letterSpacing: '0.12em', whiteSpace: 'nowrap', flexShrink: 0 }}>
            / <b style={{ color: 'var(--color-text-muted)' }}>{m.nodes.length}</b> chủ đề
          </span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,rgba(${acRgb},0.22),transparent)` }} />
        </motion.div>

        {/* ── Node list ── */}
        <motion.ul
          style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {m.nodes.map((node, i) => {
            const nLessons = lessonCountForNode(node)
            const nAc = CYAN
            const nRgb = '126,231,255'
            return (
              <motion.li
                key={node.id}
                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.38 } } }}
              >
                <Link href={`/tutorial/${m.id}/${node.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    className="mv-node"
                    style={{
                      '--n-rgb': nRgb,
                      position: 'relative',
                      display: 'flex', alignItems: 'center',
                      background: `linear-gradient(135deg, rgba(${nRgb},0.06) 0%, color-mix(in srgb, var(--color-bg-surface) 94%, transparent) 55%)`,
                      border: `1px solid rgba(${nRgb},0.15)`,
                      clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                      overflow: 'hidden',
                    } as React.CSSProperties}
                  >
                    {/* Left accent rail */}
                    <div
                      className="mv-rail"
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, flexShrink: 0,
                        background: nAc, opacity: 0.18,
                        boxShadow: `0 0 6px rgba(${nRgb},0.3)`,
                        zIndex: 1,
                      }}
                    />

                    {/* Corner brackets — hidden by default, revealed on hover via CSS */}
                    <div className="mv-brackets" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
                      <CornerBrackets color={nAc} size={10} thickness={1} />
                    </div>

                    {/* Icon box */}
                    <div
                      className="mv-node-num"
                      style={{ position: 'relative', flexShrink: 0, margin: '14px 0 14px 18px' }}
                    >
                      <div
                        className="mv-icon-box"
                        style={{
                          width: 54, height: 54,
                          clipPath: 'polygon(9px 0%,100% 0%,100% calc(100% - 9px),calc(100% - 9px) 100%,0% 100%,0% 9px)',
                          background: `rgba(${nRgb},0.07)`,
                          border: `1px dashed rgba(${nRgb},0.28)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `inset 0 0 10px rgba(${nRgb},0.04)`,
                        }}
                      >
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: nAc, lineHeight: 1, textShadow: `0 0 10px rgba(${nRgb},0.55)` }}>
                          {i + 1}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: '14px 18px', minWidth: 0 }}>
                      <p style={{ margin: '0 0 5px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 17, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                        {node.titleVi}
                      </p>
                      <p style={{ margin: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                        // {node.title}
                      </p>
                    </div>

                    {/* Right: meta chip + arrow tile */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '4px 12px',
                        clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                        background: `rgba(${nRgb},0.07)`,
                        border: `1px solid rgba(${nRgb},0.22)`,
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: nAc, whiteSpace: 'nowrap',
                      }}>
                        {nLessons} bài
                      </span>
                      <div
                        className="mv-arrow-tile"
                        style={{
                          width: 38, height: 38, flexShrink: 0,
                          clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)',
                          background: `rgba(${nRgb},0.08)`,
                          border: `1px solid rgba(${nRgb},0.32)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: nAc, fontSize: 22,
                        }}
                      >
                        <span className="mv-arrow-icon">›</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>

        {/* ── Hint bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{
            marginTop: 16,
            padding: '11px 18px',
            clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
            background: 'var(--color-panel-muted)',
            border: '1px dashed rgba(126,231,255,0.16)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{
            width: 28, height: 28, flexShrink: 0, borderRadius: '50%',
            border: '1px solid rgba(126,231,255,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: CYAN, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700,
          }}>i</div>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            <span style={{ padding: '2px 9px', border: '1px solid rgba(126,231,255,0.28)', clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)', color: CYAN }}>↵ Enter</span>
            <span>mở chủ đề đầu</span>
            <span style={{ color: '#3a4560', margin: '0 2px' }}>—</span>
            <span style={{ padding: '2px 9px', border: '1px solid rgba(126,231,255,0.28)', clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)', color: CYAN }}>↑ ↓</span>
            <span>duyệt chủ đề</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#3a4560', letterSpacing: '0.12em', flexShrink: 0 }}>
            // {m.nodes.length} nodes
          </span>
        </motion.div>

        {/* ── Bottom nav ── */}
        <div style={{ marginTop: 52, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {m.order > 1 ? (
            <Link
              href={`/tutorial/${prevMod?.id ?? ''}`}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a9bb8', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
              onMouseLeave={e => (e.currentTarget.style.color = '#8a9bb8')}
            >
              ← Module trước
            </Link>
          ) : (
            <span />
          )}
          {m.order < 6 ? (
            <Link
              href={`/tutorial/${nextMod?.id ?? ''}`}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: ac, textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = ac)}
            >
              Module tiếp theo →
            </Link>
          ) : (
            <Link
              href="/tutorial"
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: ac, textDecoration: 'none', fontWeight: 600 }}
            >
              Về tổng quan →
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
