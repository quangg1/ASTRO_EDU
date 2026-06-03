'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  computeProgressPercent,
  loadLessonCompletion,
  moduleProgressPercent,
  syncLearningPathCompletion,
  useLearningPath,
} from '@/features/learning-path/public'
import { useAuthStore } from '@/features/auth/public'
import { Network } from 'lucide-react'
import { SpaceMissionCard, SpaceStar } from '@/components/space-premium'

const MISSION_BADGES = ['Beginner', 'Explorer', 'Researcher', 'Beginner', 'Explorer', 'Advanced']

// ── Design tokens ──────────────────────────────────────
const AMBER = 'var(--color-brand-amber)'
const CYAN = 'var(--color-accent)'
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
    <div
      className="space-premium"
      style={{ minHeight: '100vh', background: 'var(--sp-bg)', position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 sp-glow-crimson z-[1]" aria-hidden />

      {/* ── Keyframes + hover CSS ── */}
      <style>{`
        @keyframes lp-scan   { from { transform: translateY(-4px) } to { transform: translateY(100vh) } }
        @keyframes lp-ping   { 0%   { transform: scale(1); opacity: 0.9 } 100% { transform: scale(2.6); opacity: 0 } }
        @keyframes lp-pulse  { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }

        .lp-card { transition: transform 0.25s ease, box-shadow 0.28s ease !important; }
        .lp-card:hover { transform: translateY(-3px) !important; }

        .lp-btn { transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease !important; }
        .lp-card:hover .lp-btn-amber {
          background: var(--color-brand-amber) !important; color: #1a0e00 !important;
          box-shadow: 0 0 14px rgba(245,165,36,0.55) !important;
        }
        .lp-card:hover .lp-btn-cyan {
          background: var(--color-accent) !important; color: #001e24 !important;
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
        background: 'radial-gradient(ellipse 55% 35% at 6% 68%,rgba(245,165,36,0.05) 0%,transparent 60%),radial-gradient(ellipse 55% 35% at 94% 32%,var(--color-accent-soft) 0%,transparent 60%)',
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

        {/* ── Page header (Space reference) ── */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 56 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
            <div>
              <p className="sp-display-thin" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                Lộ trình · {modules.length} module
              </p>
              <h1
                className="lp-h1 sp-title-massive"
                style={{
                  fontSize: 'clamp(36px,6vw,72px)',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: 0.95,
                  color: '#fff',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                Lộ trình học
              </h1>
            </div>
            <SpaceStar className="text-white/60 shrink-0 mt-2 hidden sm:block" size={28} />
          </div>

          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, maxWidth: 640, fontWeight: 300 }}>
            Mỗi chủ đề có ba tầng Beginner → Explorer → Researcher. Tiến độ theo từng bài học.
          </p>

          {/* Total progress strip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
              <span>Tổng tiến độ</span>
              <span style={{ color: CYAN, fontWeight: 500, fontSize: 13 }}>{mounted ? pct : '—'}%</span>
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 520, height: 8, background: 'rgba(255,255,255,0.04)', clipPath: 'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)', border: '1px solid rgba(126,231,255,0.1)' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ position: 'absolute', left: `${(i / 6) * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--color-accent-soft)', zIndex: 1 }} />
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.45 }}
            style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}
          >
            <Link
              href="/tutorial/knowledge-map"
              style={{
                display: 'inline-flex',
                maxWidth: 560,
                alignItems: 'center',
                gap: 14,
                padding: '14px 22px',
                textDecoration: 'none',
                clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)',
                background: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(126,231,255,0.08))',
                border: '1px solid rgba(139,92,246,0.35)',
                boxShadow: '0 0 28px rgba(139,92,246,0.12)',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                  background: 'rgba(139,92,246,0.18)',
                  border: '1px solid rgba(167,139,250,0.35)',
                  color: '#c4b5fd',
                }}
              >
                <Network size={20} aria-hidden />
              </span>
              <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Bản đồ tri thức (star map)
                </span>
                <span style={{ display: 'block', marginTop: 4, fontSize: 12, lineHeight: 1.55, color: 'var(--color-text-muted)' }}>
                  Xem toàn bộ graph concept — prerequisite như các vì sao nối nhau; tiến độ bài học làm sáng các điểm đã gặp.
                </span>
              </span>
            </Link>
          </motion.div>
        </motion.header>

        {/* ── Module tickets (Space reference) ── */}
        <motion.ul
          className="lp-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
            padding: 0,
            margin: 0,
            listStyle: 'none',
          }}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {modules.map((m, i) => {
            const mp = modulePcts[m.id] ?? 0
            return (
              <motion.li
                key={m.id}
                variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.42 } } }}
              >
                <SpaceMissionCard
                  title={m.titleVi}
                  metaPrimary={`${m.nodes.length} chủ đề`}
                  metaSecondary={`Module ${m.order}`}
                  badge={MISSION_BADGES[i % MISSION_BADGES.length]}
                  progressLabel={mp > 0 ? `${mp}% hoàn thành` : 'Bắt đầu'}
                  href={`/tutorial/${m.id}`}
                  moduleId={m.id}
                  emoji={m.emoji}
                  featured={mp > 0 && mp < 100}
                />
              </motion.li>
            )
          })}
        </motion.ul>
      </main>
    </div>
  )
}
