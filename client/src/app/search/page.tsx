'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { fetchCourses, type Course } from '@/features/courses/public'
import { DEPTH_ORDER, LEARNING_MODULES } from '@/data/learningPathCurriculum'

function searchLearningPath(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: { href: string; title: string; subtitle: string }[] = []
  for (const m of LEARNING_MODULES) {
    const hay = `${m.title} ${m.titleVi} ${m.goal} ${m.goalVi}`.toLowerCase()
    if (hay.includes(q)) {
      hits.push({
        href: `/tutorial/${m.id}`,
        title: `${m.emoji} ${m.titleVi}`,
        subtitle: m.goalVi,
      })
    }
    for (const n of m.nodes) {
      const nh = `${n.title} ${n.titleVi}`.toLowerCase()
      if (nh.includes(q)) {
        hits.push({
          href: `/tutorial/${m.id}/${n.id}`,
          title: n.titleVi,
          subtitle: `Bài học · ${n.titleVi}`,
        })
      }
      for (const d of DEPTH_ORDER) {
        for (const le of n.depths[d] ?? []) {
          const lh = `${le.titleVi} ${le.title}`.toLowerCase()
          if (lh.includes(q)) {
            hits.push({
              href: `/tutorial/${m.id}/${n.id}/${encodeURIComponent(le.id)}`,
              title: le.titleVi,
              subtitle: `Bài học · ${n.titleVi}`,
            })
          }
        }
      }
    }
  }
  const seen = new Set<string>()
  return hits.filter((h) => (seen.has(h.href) ? false : (seen.add(h.href), true)))
}

// ── Design tokens ──────────────────────────────────────────────
const CYAN = '#7ee7ff'
const AMBER = '#f5a524'

function pr(seed: number) { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x) }
const STARS = Array.from({ length: 160 }, (_, i) => ({
  x: pr(i * 7 + 1) * 100, y: pr(i * 7 + 2) * 100,
  r: pr(i * 7 + 3) * 1.2 + 0.4,
  o: pr(i * 7 + 4) * 0.55 + 0.18,
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

function highlight(text: string, q: string) {
  if (!q.trim()) return <>{text}</>
  const lower = text.toLowerCase()
  const qLower = q.trim().toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(126,231,255,0.22)', color: '#7ee7ff', borderRadius: 2, padding: '0 2px', fontStyle: 'normal' }}>
        {text.slice(idx, idx + qLower.length)}
      </mark>
      {text.slice(idx + qLower.length)}
    </>
  )
}

function highlightAmber(text: string, q: string) {
  if (!q.trim()) return <>{text}</>
  const lower = text.toLowerCase()
  const qLower = q.trim().toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(245,165,36,0.22)', color: '#ffd27a', borderRadius: 2, padding: '0 2px', fontStyle: 'normal' }}>
        {text.slice(idx, idx + qLower.length)}
      </mark>
      {text.slice(idx + qLower.length)}
    </>
  )
}

function SectionHeader({ num, label, count, accent, accentRgb }: {
  num: string; label: string; count: number; accent: string; accentRgb: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 22px 5px 14px',
        clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)',
        background: `rgba(${accentRgb},0.10)`,
        border: `1px solid rgba(${accentRgb},0.38)`,
        fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const,
        color: accent, whiteSpace: 'nowrap' as const, flexShrink: 0,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block', boxShadow: `0 0 5px ${accent}`, animation: 'srch-pulse 2.2s ease-in-out infinite' }} />
        {num} · {label}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#5c6886', letterSpacing: '0.12em', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
        / <b style={{ color: '#9aa8c4' }}>{count}</b> kết quả
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,rgba(${accentRgb},0.22),transparent)` }} />
    </div>
  )
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pathHits = useMemo(() => searchLearningPath(debouncedQ), [debouncedQ])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!debouncedQ.trim()) { setCourses([]); return }
    setLoading(true)
    fetchCourses(debouncedQ).then((c) => setCourses(c)).finally(() => setLoading(false))
  }, [debouncedQ])

  // ⌘K shortcut
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  const totalHits = courses.length + pathHits.length

  return (
    <div style={{ minHeight: '100vh', background: '#03060f', position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Keyframes + hover CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        @keyframes srch-scan  { from { transform: translateY(-4px) } to { transform: translateY(100vh) } }
        @keyframes srch-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes srch-glow  { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }

        .srch-card { transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.25s ease; cursor: pointer; }
        .srch-card:hover { transform: translateX(2px); border-color: rgba(var(--c-rgb),0.52) !important; box-shadow: 0 0 20px rgba(var(--c-rgb),0.14) !important; }
        .srch-card:hover .srch-rail { opacity: 1 !important; box-shadow: 0 0 10px rgba(var(--c-rgb),0.65) !important; }
        .srch-card:hover .srch-bk span { opacity: 0.82 !important; }
        .srch-card:hover .srch-ibox { border-color: rgba(var(--c-rgb),0.5) !important; box-shadow: 0 0 14px rgba(var(--c-rgb),0.22) !important; }
        .srch-card:hover .srch-arrow { background: rgba(var(--c-rgb),0.82) !important; color: #001e24 !important; }
        .srch-card:hover .srch-arrowicon { transform: translateX(2px) !important; }
        .srch-rail { transition: opacity 0.2s ease, box-shadow 0.2s ease; }
        .srch-bk span { transition: opacity 0.2s ease; opacity: 0; }
        .srch-ibox { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .srch-arrow { transition: background 0.2s ease, color 0.2s ease; }
        .srch-arrowicon { display: inline-block; transition: transform 0.2s ease; }
        .srch-input:focus { border-color: rgba(126,231,255,0.55) !important; box-shadow: 0 0 0 1px rgba(126,231,255,0.15), 0 0 22px rgba(126,231,255,0.07) !important; outline: none; }

        @media (max-width: 1100px) { .srch-edge { display: none !important; } }
        @media (max-width: 980px)  { .srch-hero { grid-template-columns: 1fr !important; } .srch-scope { min-height: 260px !important; } }
        @media (max-width: 760px)  {
          .srch-shell { padding-left: 16px !important; padding-right: 16px !important; }
          .srch-h1 { font-size: 34px !important; }
          .srch-cmdK { display: none !important; }
        }
      `}</style>

      {/* ── Starfield ── */}
      <svg aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill={s.c} opacity={s.o}>
            <animate attributeName="opacity" values={`${s.o.toFixed(2)};${(s.o * 0.18).toFixed(2)};${s.o.toFixed(2)}`} dur={`${s.d.toFixed(1)}s`} repeatCount="indefinite" />
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
        animation: 'srch-scan 9s linear infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── Ambient glow ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 55% 35% at 6% 68%,rgba(245,165,36,0.05) 0%,transparent 60%),radial-gradient(ellipse 55% 35% at 94% 32%,rgba(126,231,255,0.06) 0%,transparent 60%)',
      }} />

      {/* ── Edge labels ── */}
      <div className="srch-edge" style={{ position: 'fixed', left: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#1e2d44', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          CosmoLearn · v2.6 · Catalog · Search
        </span>
      </div>
      <div className="srch-edge" style={{ position: 'fixed', right: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#1e2d44', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Lat 21.0285° N — Lon 105.8542° E — Alt 12m
        </span>
      </div>

      {/* ── Main ── */}
      <main className="srch-shell" style={{ position: 'relative', zIndex: 10, paddingTop: 88, paddingBottom: 80, paddingLeft: 'clamp(24px,4vw,64px)', paddingRight: 'clamp(24px,4vw,64px)', maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Hero: HUD frame + Scope ── */}
        <div className="srch-hero" style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 28, marginBottom: 48, alignItems: 'start' }}>

          {/* Left — HUD frame */}
          <div style={{
            position: 'relative', padding: '30px 32px 28px',
            background: 'rgba(6,9,26,0.80)',
            border: '1px solid rgba(126,231,255,0.18)',
            clipPath: 'polygon(18px 0%,100% 0%,100% calc(100% - 18px),calc(100% - 18px) 100%,0% 100%,0% 18px)',
            boxShadow: 'inset 0 0 40px rgba(126,231,255,0.025)',
          }}>
            <CornerBrackets color={CYAN} size={16} thickness={1.5} />

            {/* Diagonal tab + eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '5px 22px 5px 14px',
                clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)',
                background: 'rgba(126,231,255,0.09)',
                border: '1px solid rgba(126,231,255,0.35)',
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: CYAN, flexShrink: 0,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: CYAN, display: 'inline-block', boxShadow: `0 0 6px ${CYAN}`, animation: 'srch-pulse 2s ease-in-out infinite' }} />
                Catalog · Search
              </div>
            </div>

            {/* H1 */}
            <h1 className="srch-h1" style={{
              fontSize: 'clamp(40px,5.5vw,72px)',
              fontFamily: "'Space Grotesk',sans-serif",
              fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.032em',
              margin: '0 0 18px',
              background: `linear-gradient(135deg, #dff7ff 30%, ${CYAN})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Tìm{' '}<em style={{ fontStyle: 'italic', fontWeight: 300 }}>kiếm</em>
            </h1>

            {/* Readout strip */}
            <div style={{
              display: 'flex', gap: 20, flexWrap: 'wrap',
              marginBottom: 22,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a9bb8',
            }}>
              <span>// scope · catalog</span>
              <span>· depth · all</span>
              <span>· <span style={{ color: '#6dffb0' }}>●</span> live</span>
              {totalHits > 0 && <span style={{ color: '#9aa8c4' }}>· {totalHits} hits</span>}
            </div>

            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              {/* Magnifier icon */}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="1.8" strokeLinecap="round" style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', opacity: 0.6, pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                ref={inputRef}
                id="q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm khoá học, lộ trình, bài học…"
                autoFocus
                className="srch-input"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '16px 52px 16px 48px',
                  background: 'rgba(3,6,15,0.6)',
                  border: '1px solid rgba(126,231,255,0.2)',
                  clipPath: 'polygon(14px 0%,100% 0%,100% calc(100% - 14px),calc(100% - 14px) 100%,0% 100%,0% 14px)',
                  color: '#eaf6ff', fontSize: 16, fontFamily: "'Space Grotesk',sans-serif",
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              />

              {/* Clear button */}
              {q && (
                <button
                  aria-label="Clear search"
                  onClick={() => setQ('')}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(126,231,255,0.08)', border: '1px solid rgba(126,231,255,0.2)',
                    color: CYAN, width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 14, fontFamily: 'monospace',
                    transition: 'background 0.2s ease',
                  }}
                >×</button>
              )}
            </div>

            {/* Meta strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#8a9bb8' }}>
                {debouncedQ.trim()
                  ? <span>Đang lọc theo từ khoá <span style={{ color: '#eaf6ff' }}>"{debouncedQ}"</span></span>
                  : 'Nhập từ khoá để bắt đầu tìm kiếm'}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#8a9bb8' }}>
                <span style={{ color: '#6dffb0' }}>●</span> Index · synced
              </span>
            </div>
          </div>

          {/* Right — Scope visualizer */}
          <div className="srch-scope" style={{
            position: 'relative',
            background: 'rgba(6,9,26,0.65)',
            border: '1px solid rgba(126,231,255,0.15)',
            clipPath: 'polygon(18px 0%,100% 0%,100% calc(100% - 18px),calc(100% - 18px) 100%,0% 100%,0% 18px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 20px 20px',
            minHeight: 320,
          }}>
            <CornerBrackets color={CYAN} size={14} thickness={1} />

            {/* Scope top label */}
            <div style={{ position: 'absolute', top: 12, left: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3a4560' }}>
              // solar.system.live
            </div>
            <div style={{ position: 'absolute', top: 12, right: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3a4560' }}>
              scope · catalog
            </div>

            {/* Orbital SVG */}
            <svg viewBox="0 0 200 200" width="200" height="200" style={{ display: 'block', overflow: 'visible' }}>
              {/* Orbit rings */}
              {[28, 42, 57, 72, 86].map((r, i) => (
                <circle key={r} cx="100" cy="100" r={r} fill="none"
                  stroke={i === 2 ? CYAN : 'rgba(126,231,255,0.2)'}
                  strokeWidth={i === 2 ? 1 : 0.8}
                  strokeDasharray={i === 2 ? '6 3' : '3 4'}
                  opacity={i === 2 ? 0.6 : 0.35}
                />
              ))}

              {/* Animated result ring */}
              <circle cx="100" cy="100" r="72" fill="none" stroke={CYAN} strokeWidth="1.2" strokeDasharray="12 6" opacity="0.5">
                <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="6s" repeatCount="indefinite" />
              </circle>

              {/* Crosshair */}
              <line x1="100" y1="12" x2="100" y2="188" stroke={CYAN} strokeWidth="0.5" opacity="0.15" />
              <line x1="12" y1="100" x2="188" y2="100" stroke={CYAN} strokeWidth="0.5" opacity="0.15" />
              <line x1="82" y1="100" x2="118" y2="100" stroke={CYAN} strokeWidth="0.8" opacity="0.4" />
              <line x1="100" y1="82" x2="100" y2="118" stroke={CYAN} strokeWidth="0.8" opacity="0.4" />

              {/* Sun */}
              <circle cx="100" cy="100" r="9" fill={AMBER} opacity="0.9">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
              </circle>
              <circle cx="100" cy="100" r="15" fill="none" stroke={AMBER} strokeWidth="1" opacity="0.25">
                <animate attributeName="r" values="13;17;13" dur="4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
              </circle>

              {/* Planet dots */}
              <circle cx="121" cy="79" r="2.5" fill="#9aa8c4" opacity="0.7" />
              <circle cx="143" cy="100" r="3" fill={CYAN} opacity="0.85" />
              <circle cx="58" cy="128" r="3.5" fill="#b48fff" opacity="0.65" />
              <circle cx="100" cy="14" r="2" fill="#9aa8c4" opacity="0.45" />

              {/* Highlighted dot — result position */}
              {debouncedQ.trim() && (
                <circle cx="172" cy="100" r="4" fill={CYAN} opacity="0.9">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
            </svg>

            {/* Scope foot pill */}
            <div style={{
              marginTop: 16,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 14px',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              background: 'rgba(6,9,26,0.7)',
              border: '1px solid rgba(126,231,255,0.18)',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#5c6886',
            }}>
              <span style={{ color: '#9aa8c4' }}>{totalHits} hits</span>
              {debouncedQ.trim() && <><span style={{ color: '#3a4560' }}>·</span><span>q: "{debouncedQ}"</span></>}
              {courses.length > 0 && <><span style={{ color: '#3a4560' }}>·</span><span style={{ color: AMBER }}>{courses.length} course</span></>}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CYAN, display: 'inline-block', animation: 'srch-pulse 1s ease-in-out infinite' }} />
            Đang tìm kiếm…
          </div>
        )}

        {!loading && debouncedQ.trim() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

            {/* Section 01 — Courses */}
            {courses.length > 0 && (
              <section>
                <SectionHeader num="01" label="Khoá học" count={courses.length} accent={AMBER} accentRgb="245,165,36" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {courses.map((c) => (
                    <Link key={c.id} href={`/courses/${c.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div
                        className="srch-card r-course"
                        style={{
                          '--c-rgb': '245,165,36',
                          position: 'relative',
                          display: 'flex', alignItems: 'center',
                          background: 'linear-gradient(135deg,rgba(245,165,36,0.04) 0%,rgba(6,9,26,0.82) 55%)',
                          border: '1px solid rgba(245,165,36,0.15)',
                          clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                          overflow: 'hidden',
                        } as React.CSSProperties}
                      >
                        {/* Rail */}
                        <div className="srch-rail" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: AMBER, opacity: 0.2, boxShadow: '0 0 6px rgba(245,165,36,0.3)', zIndex: 1 }} />

                        {/* Brackets */}
                        <div className="srch-bk" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
                          <CornerBrackets color={AMBER} size={10} thickness={1} />
                        </div>

                        {/* Icon box */}
                        <div style={{ position: 'relative', flexShrink: 0, margin: '14px 0 14px 18px' }}>
                          <div className="srch-ibox" style={{
                            width: 54, height: 54,
                            clipPath: 'polygon(9px 0%,100% 0%,100% calc(100% - 9px),calc(100% - 9px) 100%,0% 100%,0% 9px)',
                            background: 'rgba(245,165,36,0.08)',
                            border: '1px dashed rgba(245,165,36,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke={AMBER} strokeWidth="1.6" strokeLinecap="round">
                              <circle cx="24" cy="24" r="4" />
                              <circle cx="24" cy="24" r="11" strokeOpacity="0.6" />
                              <circle cx="24" cy="24" r="18" strokeOpacity="0.3" />
                            </svg>
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                          <p style={{ margin: '0 0 5px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 17, color: '#eaf6ff', lineHeight: 1.3 }}>
                            {highlightAmber(c.title, debouncedQ)}
                          </p>
                          <p style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: '#9aa8c4', lineHeight: 1.5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {c.description}
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                              clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                              background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.22)',
                              fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: AMBER,
                            }}>
                              {c.lessonCount ?? 0} lessons
                            </span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                              clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                              background: 'rgba(126,231,255,0.06)', border: '1px solid rgba(126,231,255,0.18)',
                              fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9aa8c4',
                            }}>
                              {c.level}
                            </span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                              clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                              background: 'rgba(245,165,36,0.06)', border: '1px solid rgba(245,165,36,0.16)',
                              fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5c6886',
                            }}>
                              // astronomy.observatory
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div style={{ flexShrink: 0, paddingRight: 16 }}>
                          <div className="srch-arrow" style={{
                            width: 38, height: 38,
                            clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)',
                            background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: AMBER, fontSize: 22,
                          }}>
                            <span className="srch-arrowicon">›</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Section 02 — Learning Path */}
            {pathHits.length > 0 && (
              <section>
                <SectionHeader num="02" label="Lộ trình học" count={pathHits.length} accent={CYAN} accentRgb="126,231,255" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pathHits.map((h) => (
                    <Link key={h.href} href={h.href} style={{ textDecoration: 'none', display: 'block' }}>
                      <div
                        className="srch-card"
                        style={{
                          '--c-rgb': '126,231,255',
                          position: 'relative',
                          display: 'flex', alignItems: 'center',
                          background: 'linear-gradient(135deg,rgba(126,231,255,0.04) 0%,rgba(6,9,26,0.82) 55%)',
                          border: '1px solid rgba(126,231,255,0.14)',
                          clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                          overflow: 'hidden',
                        } as React.CSSProperties}
                      >
                        {/* Rail */}
                        <div className="srch-rail" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: CYAN, opacity: 0.18, boxShadow: '0 0 6px rgba(126,231,255,0.3)', zIndex: 1 }} />

                        {/* Brackets */}
                        <div className="srch-bk" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
                          <CornerBrackets color={CYAN} size={10} thickness={1} />
                        </div>

                        {/* Icon box */}
                        <div style={{ position: 'relative', flexShrink: 0, margin: '14px 0 14px 18px' }}>
                          <div className="srch-ibox" style={{
                            width: 54, height: 54,
                            clipPath: 'polygon(9px 0%,100% 0%,100% calc(100% - 9px),calc(100% - 9px) 100%,0% 100%,0% 9px)',
                            background: 'rgba(126,231,255,0.07)',
                            border: '1px dashed rgba(126,231,255,0.28)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke={CYAN} strokeWidth="1.6" strokeLinecap="round">
                              <path d="M12 36 L24 12 L36 36" />
                              <line x1="9" y1="36" x2="39" y2="36" />
                              <circle cx="24" cy="27" r="4" />
                            </svg>
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                          <p style={{ margin: '0 0 5px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 17, color: '#eaf6ff', lineHeight: 1.3 }}>
                            {highlight(h.title, debouncedQ)}
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                              clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                              background: 'rgba(126,231,255,0.07)', border: '1px solid rgba(126,231,255,0.22)',
                              fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN,
                            }}>
                              Lộ trình
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c6886' }}>
                              · {h.subtitle}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div style={{ flexShrink: 0, paddingRight: 16 }}>
                          <div className="srch-arrow" style={{
                            width: 38, height: 38,
                            clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)',
                            background: 'rgba(126,231,255,0.07)', border: '1px solid rgba(126,231,255,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: CYAN, fontSize: 22,
                          }}>
                            <span className="srch-arrowicon">›</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {!loading && courses.length === 0 && pathHits.length === 0 && (
              <div style={{
                padding: '40px 32px',
                clipPath: 'polygon(14px 0%,100% 0%,100% calc(100% - 14px),calc(100% - 14px) 100%,0% 100%,0% 14px)',
                background: 'rgba(6,9,26,0.5)',
                border: '1px dashed rgba(126,231,255,0.14)',
                textAlign: 'center',
              }}>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886', margin: 0 }}>
                  // Không tìm thấy kết quả cho <span style={{ color: '#9aa8c4' }}>"{debouncedQ}"</span>
                </p>
              </div>
            )}

            {/* Hint bar */}
            {totalHits > 0 && (
              <div style={{
                padding: '11px 18px',
                clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                background: 'rgba(6,9,26,0.45)',
                border: '1px dashed rgba(126,231,255,0.15)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: '50%',
                  border: '1px solid rgba(126,231,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: CYAN, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700,
                }}>i</div>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9aa8c4' }}>
                  <span style={{ padding: '2px 9px', border: '1px solid rgba(126,231,255,0.28)', clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)', color: CYAN }}>↵ Enter</span>
                  <span>mở bài đầu</span>
                  <span style={{ color: '#3a4560', margin: '0 2px' }}>—</span>
                  <span style={{ padding: '2px 9px', border: '1px solid rgba(126,231,255,0.28)', clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)', color: CYAN }}>↑ ↓</span>
                  <span>duyệt kết quả</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#3a4560', letterSpacing: '0.12em', flexShrink: 0 }}>
                  // {totalHits} kết quả · {loading ? '…' : '0.18'}s
                </span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
