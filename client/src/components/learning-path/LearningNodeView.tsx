'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { LearningModule, LearningNode } from '@/data/learningPathCurriculum'
import { getLearningPathNeighbors } from '@/data/learningPathCurriculum'
import NodeDepthPanel from '@/components/learning-path/NodeDepthPanel'
import { trackLearningPathBehavior, useLearningPath } from '@/features/learning-path/public'

type Props = {
  module: LearningModule
  node: LearningNode
}

// ── Design tokens ───────────────────────────────────────────────
const CYAN = 'var(--color-accent)'
const AMBER = 'var(--color-brand-amber)'

function pr(seed: number) { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x) }
const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: pr(i * 7 + 1) * 100, y: pr(i * 7 + 2) * 100,
  r: pr(i * 7 + 3) * 1.2 + 0.4,
  o: pr(i * 7 + 4) * 0.5 + 0.15,
  d: pr(i * 7 + 5) * 4 + 2.2,
  c: pr(i * 7 + 6) > 0.9 ? CYAN : pr(i * 7 + 1) > 0.88 ? AMBER : '#ffffff',
}))

function CornerBrackets({ color, size = 14, thickness = 1.5 }: { color: string; size?: number; thickness?: number }) {
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

export default function LearningNodeView({ module, node }: Props) {
  const { modules } = useLearningPath()
  const m = modules.find((x) => x.id === module.id) ?? module
  const n = m.nodes.find((x) => x.id === node.id) ?? node
  const { prev, next } = getLearningPathNeighbors(m.id, n.id, modules)
  const ord = String(m.order).padStart(2, '0')
  const [hoveredNav, setHoveredNav] = useState<'prev' | 'next' | null>(null)

  useEffect(() => {
    trackLearningPathBehavior({
      eventName: 'lp_node_viewed',
      moduleId: m.id,
      nodeId: n.id,
    })
  }, [m.id, n.id])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes lnv-scan { from { transform: translateY(-4px) } to { transform: translateY(100vh) } }
        @media (max-width: 1100px) { .lnv-edge { display: none !important; } }
        @media (max-width: 700px) {
          .lnv-main { padding-left: 16px !important; padding-right: 16px !important; }
          .lnv-h1 { font-size: 28px !important; }
          .lnv-nav-row { flex-direction: column !important; }
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
        boxShadow: `0 0 8px ${CYAN}`, opacity: 0.45,
        animation: 'lnv-scan 12s linear infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── Ambient glow ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 55% 35% at 6% 68%,rgba(245,165,36,0.04) 0%,transparent 60%),radial-gradient(ellipse 55% 35% at 94% 32%,var(--color-accent-soft) 0%,transparent 60%)',
      }} />

      {/* ── Edge labels ── */}
      <div className="lnv-edge" style={{ position: 'fixed', left: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#263042', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          COSMOLEARN · V2.6 · MODULE {ord} · NODE
        </span>
      </div>
      <div className="lnv-edge" style={{ position: 'fixed', right: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#263042', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Lat 21.0285° N — Lon 105.8542° E — Alt 12m
        </span>
      </div>

      {/* ── Main ── */}
      <main className="lnv-main" style={{ position: 'relative', zIndex: 10, paddingTop: 96, paddingBottom: 80, paddingLeft: 'clamp(24px,4vw,80px)', paddingRight: 'clamp(24px,4vw,80px)', maxWidth: 'clamp(560px, 70vw, 1400px)', margin: '0 auto' }}>

        {/* ── Breadcrumb ── */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 40, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          <Link
            href="/tutorial"
            style={{ color: '#8a9bb8', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
            onMouseLeave={e => (e.currentTarget.style.color = '#8a9bb8')}
          >
            Learning Path
          </Link>
          <span style={{ color: '#263042', margin: '0 2px' }}>—</span>
          <Link
            href={`/tutorial/${m.id}`}
            style={{ color: '#8a9bb8', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
            onMouseLeave={e => (e.currentTarget.style.color = '#8a9bb8')}
          >
            {m.titleVi}
          </Link>
          <span style={{ color: '#263042', margin: '0 2px' }}>—</span>
          <span style={{ color: CYAN }}>{n.titleVi}</span>
        </motion.nav>

        {/* ── Module header ── */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          style={{ marginBottom: 40 }}
        >
          {/* Eyebrow chip */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '5px 16px',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              background: 'rgba(126,231,255,0.07)',
              border: `1px solid rgba(126,231,255,0.3)`,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 10, letterSpacing: '0.2em', color: CYAN, textTransform: 'uppercase' as const,
            }}>
              Module {ord}
            </div>
            <span style={{ color: '#263042', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em' }}>—</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a9bb8' }}>
              Node · {n.title}
            </span>
          </div>

          {/* Title */}
          <h1 className="lnv-h1" style={{
            fontSize: 'clamp(30px,5vw,52px)',
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.025em',
            color: 'var(--color-text-primary)', margin: '0 0 14px',
          }}>
            {n.titleVi}
          </h1>

          {/* EN subtitle */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a9bb8' }}>
            // {n.title}
          </div>
        </motion.header>

        {/* ── Depth panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
        >
          <NodeDepthPanel module={m} node={n} />
        </motion.div>

        {/* ── Node navigation ── */}
        <div style={{ marginTop: 52 }}>
          {/* Section label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a9bb8', whiteSpace: 'nowrap' }}>
              // Điều hướng node
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(126,231,255,0.2),transparent)' }} />
          </div>

          <div className="lnv-nav-row" style={{ display: 'flex', gap: 14 }}>
            {prev ? (
              <Link
                href={`/tutorial/${prev.moduleId}/${prev.nodeId}`}
                onMouseEnter={() => setHoveredNav('prev')}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  flex: 1, textDecoration: 'none',
                  position: 'relative',
                  padding: '14px 18px',
                  clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                  background: hoveredNav === 'prev' ? 'var(--color-accent-soft)' : 'color-mix(in srgb, var(--color-bg-surface) 88%, transparent)',
                  border: hoveredNav === 'prev' ? '1px solid var(--color-accent-strong)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: hoveredNav === 'prev' ? '0 0 18px rgba(126,231,255,0.12)' : 'none',
                  transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
                }}
              >
                <span style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: hoveredNav === 'prev' ? CYAN : '#8a9bb8', marginBottom: 8, transition: 'color 0.22s ease' }}>
                  ← Trước
                </span>
                <span style={{ display: 'block', fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 500, color: hoveredNav === 'prev' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', lineHeight: 1.4, transition: 'color 0.22s ease' }}>
                  {prev.titleVi}
                </span>
              </Link>
            ) : (
              <div style={{ flex: 1 }} />
            )}

            {next ? (
              <Link
                href={`/tutorial/${next.moduleId}/${next.nodeId}`}
                onMouseEnter={() => setHoveredNav('next')}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  flex: 1, textDecoration: 'none',
                  position: 'relative',
                  padding: '14px 18px',
                  clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                  background: hoveredNav === 'next' ? 'var(--color-accent-soft)' : 'color-mix(in srgb, var(--color-bg-surface) 88%, transparent)',
                  border: hoveredNav === 'next' ? '1px solid var(--color-accent-strong)' : '1px solid var(--color-border)',
                  boxShadow: hoveredNav === 'next' ? '0 0 18px rgba(126,231,255,0.12)' : 'none',
                  textAlign: 'right',
                  transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
                }}
              >
                <span style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: CYAN, marginBottom: 8, opacity: 0.8 }}>
                  Tiếp →
                </span>
                <span style={{ display: 'block', fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 500, color: hoveredNav === 'next' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', lineHeight: 1.4, transition: 'color 0.22s ease' }}>
                  {next.titleVi}
                </span>
              </Link>
            ) : (
              <Link
                href="/tutorial"
                onMouseEnter={() => setHoveredNav('next')}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  flex: 1, textDecoration: 'none',
                  position: 'relative',
                  padding: '14px 18px',
                  clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                  background: hoveredNav === 'next' ? 'var(--color-accent-soft)' : 'color-mix(in srgb, var(--color-bg-surface) 88%, transparent)',
                  border: hoveredNav === 'next' ? '1px solid var(--color-accent-strong)' : '1px solid var(--color-border)',
                  boxShadow: hoveredNav === 'next' ? '0 0 18px rgba(126,231,255,0.12)' : 'none',
                  textAlign: 'right',
                  transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
                }}
              >
                <span style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: CYAN, marginBottom: 8, opacity: 0.8 }}>
                  Hoàn thành
                </span>
                <span style={{ display: 'block', fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 500, color: hoveredNav === 'next' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', lineHeight: 1.4, transition: 'color 0.22s ease' }}>
                  Về tổng quan →
                </span>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
