'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchCourses, type Course } from '@/features/courses/public'
import { SkeletonList } from '@/components/ui/Skeleton'

// ─── design primitives ───────────────────────────────────────────────────────

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 14, o = 8 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.9, pointerEvents: 'none', ...ex,
  })
  return (
    <>
      <span style={b({ top: o, left: o, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ top: o, right: o, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, left: o, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, right: o, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
    </>
  )
}

// ─── SVG cover art ────────────────────────────────────────────────────────────

function MilkyWayCover() {
  return (
    <svg viewBox="0 0 480 280" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mw-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0a1832" />
          <stop offset="100%" stopColor="#020509" />
        </radialGradient>
        <radialGradient id="mw-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ee7ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="480" height="280" fill="url(#mw-bg)" />
      {/* star field */}
      {[
        [40,20],[80,60],[120,15],[200,45],[300,25],[400,55],[440,30],
        [60,100],[150,80],[250,90],[350,70],[420,110],[30,150],[100,170],
        [200,160],[310,140],[380,155],[460,170],[50,220],[130,240],[220,230],
        [320,245],[410,225],[460,250],[10,260],[160,265],[280,255],[430,275],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.2 : 0.7}
          fill={i % 7 === 0 ? '#7ee7ff' : i % 5 === 0 ? '#f5a524' : '#eaf6ff'}
          opacity={0.4 + (i % 5) * 0.12} />
      ))}
      {/* galaxy core glow */}
      <ellipse cx="240" cy="140" rx="60" ry="60" fill="url(#mw-glow)" />
      {/* orbital rings tilted */}
      <ellipse cx="240" cy="140" rx="180" ry="55" fill="none" stroke="#7ee7ff" strokeWidth="0.8" strokeOpacity="0.4" transform="rotate(-15 240 140)" />
      <ellipse cx="240" cy="140" rx="130" ry="38" fill="none" stroke="#7ee7ff" strokeWidth="0.6" strokeOpacity="0.3" transform="rotate(-15 240 140)" />
      <ellipse cx="240" cy="140" rx="80" ry="22" fill="none" stroke="#4dd2ff" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(-15 240 140)" />
      <ellipse cx="240" cy="140" rx="35" ry="10" fill="none" stroke="#7ee7ff" strokeWidth="1" strokeOpacity="0.6" transform="rotate(-15 240 140)" />
      {/* center orb */}
      <circle cx="240" cy="140" r="10" fill="rgba(126,231,255,0.25)" stroke="#7ee7ff" strokeWidth="1" />
      <circle cx="240" cy="140" r="5" fill="#7ee7ff" opacity="0.9" />
      {/* crosshair */}
      <line x1="220" y1="140" x2="235" y2="140" stroke="#7ee7ff" strokeWidth="0.6" strokeOpacity="0.5" />
      <line x1="245" y1="140" x2="260" y2="140" stroke="#7ee7ff" strokeWidth="0.6" strokeOpacity="0.5" />
      <line x1="240" y1="120" x2="240" y2="134" stroke="#7ee7ff" strokeWidth="0.6" strokeOpacity="0.5" />
      <line x1="240" y1="146" x2="240" y2="162" stroke="#7ee7ff" strokeWidth="0.6" strokeOpacity="0.5" />
    </svg>
  )
}

function SolarSystemCover() {
  return (
    <svg viewBox="0 0 480 280" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ss-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d0e06" />
          <stop offset="100%" stopColor="#030404" />
        </radialGradient>
        <radialGradient id="ss-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3a0" />
          <stop offset="40%" stopColor="#f5a524" />
          <stop offset="100%" stopColor="#b35000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ss-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5a524" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="480" height="280" fill="url(#ss-bg)" />
      {[
        [30,25],[90,15],[180,40],[290,20],[380,40],[450,18],
        [55,90],[140,75],[260,100],[370,85],[440,120],
        [20,160],[110,175],[220,155],[330,170],[460,150],
        [40,235],[130,250],[230,240],[350,230],[440,255],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1 : 0.6}
          fill={i % 6 === 0 ? '#f5a524' : '#eaf6ff'} opacity={0.3 + (i % 4) * 0.1} />
      ))}
      {/* sun glow */}
      <circle cx="200" cy="140" r="70" fill="url(#ss-glow)" />
      {/* orbit rings */}
      <circle cx="200" cy="140" r="55" fill="none" stroke="#f5a524" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="3 4" />
      <circle cx="200" cy="140" r="90" fill="none" stroke="#f5a524" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="3 5" />
      <circle cx="200" cy="140" r="128" fill="none" stroke="#7ee7ff" strokeWidth="0.6" strokeOpacity="0.3" />
      <circle cx="200" cy="140" r="168" fill="none" stroke="#7ee7ff" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 6" />
      {/* sun */}
      <circle cx="200" cy="140" r="28" fill="url(#ss-sun)" />
      {/* mercury */}
      <circle cx="255" cy="140" r="5" fill="#9aa8c4" opacity="0.85" />
      {/* venus */}
      <circle cx="290" cy="100" r="7" fill="#f5a524" opacity="0.75" />
      {/* earth */}
      <circle cx="200" cy="12" r="8" fill="#7ee7ff" opacity="0.8" />
      {/* mars */}
      <circle cx="368" cy="148" r="6" fill="#ff7c5c" opacity="0.75" />
      {/* planet dot indicators */}
      <circle cx="200" cy="12" r="2.5" fill="#7ee7ff" />
    </svg>
  )
}

function EarthHistoryCover() {
  return (
    <svg viewBox="0 0 480 280" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="eh-bg" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#12062a" />
          <stop offset="100%" stopColor="#050208" />
        </radialGradient>
        <radialGradient id="eh-earth" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#6dffb0" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#0e4a6e" />
          <stop offset="100%" stopColor="#061828" />
        </radialGradient>
        <radialGradient id="eh-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5cd4" stopOpacity="0.22" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="480" height="280" fill="url(#eh-bg)" />
      {[
        [25,18],[75,45],[170,22],[280,35],[390,18],[455,42],
        [50,110],[145,90],[265,105],[375,88],[460,115],
        [15,195],[110,180],[230,195],[340,175],[470,200],
        [35,258],[130,245],[245,262],[360,248],[455,268],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1.1 : 0.65}
          fill={i % 5 === 0 ? '#ff5cd4' : '#eaf6ff'} opacity={0.3 + (i % 5) * 0.1} />
      ))}
      {/* earth glow */}
      <circle cx="240" cy="140" r="80" fill="url(#eh-glow)" />
      {/* orbital rings */}
      <circle cx="240" cy="140" r="75" fill="none" stroke="#ff5cd4" strokeWidth="0.6" strokeOpacity="0.3" strokeDasharray="3 5" />
      <circle cx="240" cy="140" r="108" fill="none" stroke="#b76dff" strokeWidth="0.5" strokeOpacity="0.25" />
      <circle cx="240" cy="140" r="145" fill="none" stroke="#7ee7ff" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 6" />
      {/* earth */}
      <circle cx="240" cy="140" r="48" fill="url(#eh-earth)" stroke="rgba(109,255,176,0.3)" strokeWidth="1" />
      {/* earth surface detail */}
      <path d="M220 118 Q230 110 240 115 Q250 108 258 116 Q265 125 255 132 Q248 138 238 135 Q228 140 218 132 Q210 123 220 118Z"
        fill="rgba(109,255,176,0.25)" />
      <path d="M228 148 Q238 143 248 148 Q255 158 245 162 Q234 167 224 160 Q217 152 228 148Z"
        fill="rgba(109,255,176,0.2)" />
      {/* crosshair */}
      <line x1="200" y1="140" x2="225" y2="140" stroke="#7ee7ff" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="255" y1="140" x2="280" y2="140" stroke="#7ee7ff" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="240" y1="100" x2="240" y2="124" stroke="#7ee7ff" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="240" y1="156" x2="240" y2="180" stroke="#7ee7ff" strokeWidth="0.7" strokeOpacity="0.5" />
      {/* satellite dot on orbit */}
      <circle cx="348" cy="140" r="4" fill="#ff5cd4" opacity="0.8" />
      <circle cx="240" cy="32" r="3" fill="#b76dff" opacity="0.7" />
    </svg>
  )
}

// ─── static course metadata (visual / display overrides) ────────────────────

const COURSE_META: Record<string, {
  dot: string
  badge: string
  badgeColor: string
  cover: React.ReactNode
  titleHead: string
  titleEm: string
  accent: string
}> = {
  'milky-way': {
    dot: '#7ee7ff',
    badge: '3D · LIVE',
    badgeColor: '#7ee7ff',
    cover: <MilkyWayCover />,
    titleHead: 'Thiên hà ',
    titleEm: 'Milky Way',
    accent: '#7ee7ff',
  },
  'solar-system': {
    dot: '#f5a524',
    badge: 'BEGINNER',
    badgeColor: '#6dffb0',
    cover: <SolarSystemCover />,
    titleHead: 'Hệ ',
    titleEm: 'Mặt Trời',
    accent: '#f5a524',
  },
  'earth-history': {
    dot: '#ff5cd4',
    badge: '36 LESSONS',
    badgeColor: '#ff5cd4',
    cover: <EarthHistoryCover />,
    titleHead: 'Lịch sử ',
    titleEm: 'Trái Đất',
    accent: '#ff5cd4',
  },
}

// ─── background layers ────────────────────────────────────────────────────────

function BackgroundLayers() {
  return (
    <>
      {/* starfield */}
      <svg
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from({ length: 180 }, (_, i) => {
          const x = ((i * 137 + i * i * 7) % 10000) / 100
          const y = ((i * 223 + i * 31) % 10000) / 100
          const r = i % 8 === 0 ? 1.4 : i % 4 === 0 ? 1 : 0.65
          const color = i % 10 === 0 ? '#7ee7ff' : i % 7 === 0 ? '#f5a524' : '#eaf6ff'
          const op = 0.2 + (i % 7) * 0.1
          const dur = 2 + (i % 5)
          return (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill={color} opacity={op}>
              <animate attributeName="opacity" values={`${op};${op * 0.3};${op}`}
                dur={`${dur}s`} repeatCount="indefinite" />
            </circle>
          )
        })}
      </svg>
      {/* grid overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />
      {/* scanline */}
      <style>{`
        @keyframes scan { from { transform: translateY(-10px) } to { transform: translateY(100vh) } }
        @keyframes cursorblink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .course-card-hover:hover { box-shadow: 0 0 32px rgba(126,231,255,0.18), inset 0 0 20px rgba(126,231,255,0.04) !important; border-color: rgba(126,231,255,0.5) !important; transform: translateY(-3px); transition: all 0.22s ease; }
        .enter-btn:hover { background: rgba(126,231,255,0.14) !important; box-shadow: 0 0 16px rgba(126,231,255,0.3) !important; }
      `}</style>
      <div
        style={{
          position: 'fixed', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(126,231,255,0.25), transparent)',
          pointerEvents: 'none', zIndex: 2,
          animation: 'scan 9s linear infinite',
        }}
      />
      {/* edge labels */}
      <div
        style={{
          position: 'fixed', left: 7, top: '50%', transform: 'translateX(-50%) translateY(-50%) rotate(-90deg)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em',
          color: 'rgba(92,104,134,0.5)', pointerEvents: 'none', zIndex: 3,
          whiteSpace: 'nowrap',
          display: 'none',
        }}
        className="edge-label-left"
      >
        CosmoLearn · v2.6 · Hanoi observatory link
      </div>
      <div
        style={{
          position: 'fixed', right: 7, top: '50%', transform: 'translateX(50%) translateY(-50%) rotate(90deg)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em',
          color: 'rgba(92,104,134,0.5)', pointerEvents: 'none', zIndex: 3,
          whiteSpace: 'nowrap',
          display: 'none',
        }}
        className="edge-label-right"
      >
        Lat 21.0285° N — Lon 105.8542° E — Alt 12m
      </div>
      <style>{`
        @media (min-width: 1500px) {
          .edge-label-left, .edge-label-right { display: block !important; }
        }
      `}</style>
    </>
  )
}

// ─── course card ──────────────────────────────────────────────────────────────

function CourseCard({ course, index }: { course: Course; index: number }) {
  const meta = COURSE_META[course.slug] ?? {
    dot: '#7ee7ff',
    badge: course.level?.toUpperCase() ?? 'COURSE',
    badgeColor: '#7ee7ff',
    cover: <MilkyWayCover />,
    titleHead: '',
    titleEm: course.title,
    accent: '#7ee7ff',
  }

  const lessonCount = course.lessonCount ?? 0
  const level = course.level ?? 'intermediate'
  const cardNum = String(index + 1).padStart(2, '0')

  return (
    <Link href={`/courses/${course.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        className="course-card-hover"
        style={{
          background: 'rgba(6,9,26,0.92)',
          border: '1px solid rgba(126,231,255,0.16)',
          boxShadow: 'inset 0 0 28px rgba(126,231,255,0.03), 0 4px 32px rgba(0,0,0,0.5)',
          transition: 'all 0.22s ease',
          position: 'relative',
          ...chamfer(18),
        }}
      >
        {/* cover area */}
        <div
          style={{
            position: 'relative',
            aspectRatio: '16/10',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(126,231,255,0.1)',
            ...chamfer(18),
          }}
        >
          {meta.cover}
          <Brackets c={meta.accent} s={16} o={10} />

          {/* dot + number top-left */}
          <div
            style={{
              position: 'absolute', top: 14, left: 16,
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: meta.dot,
                boxShadow: `0 0 8px ${meta.dot}`,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          </div>

          {/* card number */}
          <div
            style={{
              position: 'absolute', top: 10, left: 30,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, letterSpacing: '0.12em',
              color: 'rgba(126,231,255,0.45)',
              paddingLeft: 4,
            }}
          >
            {cardNum}
          </div>

          {/* badge top-right */}
          <div
            style={{
              position: 'absolute', top: 10, right: 12,
              padding: '3px 10px',
              border: `1px solid ${meta.badgeColor}55`,
              background: `${meta.badgeColor}12`,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, letterSpacing: '0.14em',
              color: meta.badgeColor,
              textTransform: 'uppercase' as const,
              ...chamfer(6),
            }}
          >
            {meta.badge}
          </div>
        </div>

        {/* body */}
        <div style={{ padding: '20px 22px 22px' }}>
          <h2
            style={{
              fontSize: 'clamp(18px,2vw,22px)',
              fontWeight: 500,
              letterSpacing: '-0.025em',
              color: '#eaf6ff',
              marginBottom: 10,
              lineHeight: 1.15,
            }}
          >
            {meta.titleHead}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>{meta.titleEm}</em>
          </h2>

          <p
            style={{
              fontSize: 13, color: '#9aa8c4', lineHeight: 1.6,
              marginBottom: 18,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {course.description || 'Khám phá nội dung khóa học qua hình ảnh và mô phỏng.'}
          </p>

          {/* footer row */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(126,231,255,0.08)',
              paddingTop: 14,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                color: '#5c6886',
              }}
            >
              <span style={{ color: meta.dot }}>{String(lessonCount).padStart(2, '0')}</span>
              {' '}LESSONS · {level.toUpperCase()}
            </span>

            <div
              className="enter-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px',
                border: '1px solid rgba(126,231,255,0.35)',
                background: 'rgba(126,231,255,0.07)',
                color: '#7ee7ff',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...chamfer(8),
              }}
            >
              ENTER →
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const h = String(now.getUTCHours()).padStart(2, '0')
      const m = String(now.getUTCMinutes()).padStart(2, '0')
      const s = String(now.getUTCSeconds()).padStart(2, '0')
      setUtcTime(`${h}:${m}:${s}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .finally(() => setLoading(false))
  }, [])

  const totalCourses = courses.length
  const totalStr = String(totalCourses).padStart(2, '0')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#03060f',
        fontFamily: 'Space Grotesk, sans-serif',
        color: '#eaf6ff',
        position: 'relative',
      }}
    >
      <BackgroundLayers />

      {/* radial atmosphere */}
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 50% 40% at 5% 95%, rgba(126,231,255,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 95% 5%, rgba(245,165,36,0.04) 0%, transparent 60%)
          `,
        }}
      />

      <main
        style={{
          position: 'relative', zIndex: 10,
          maxWidth: 1280, margin: '0 auto',
          padding: '96px 32px 80px',
        }}
      >

        {/* ① page head ─────────────────────────────────────────────────────── */}
        <header style={{ marginBottom: 52 }}>
          {/* eyebrow row */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
              marginBottom: 22,
            }}
          >
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#5c6886',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#7ee7ff',
                  boxShadow: '0 0 6px #7ee7ff',
                  display: 'inline-block',
                }}
              />
              // 01 · course catalog · live
            </p>

            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, color: '#5c6886',
              }}
            >
              <span style={{ color: '#7ee7ff' }}>UTC {utcTime}</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#6dffb0', boxShadow: '0 0 5px #6dffb0',
                    display: 'inline-block',
                  }}
                />
                Online
              </span>
              <span>·</span>
              <span style={{ color: '#9aa8c4' }}>{loading ? '--' : totalStr}/03</span>
            </div>
          </div>

          {/* cyan accent line */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, #7ee7ff 0%, rgba(126,231,255,0.1) 60%, transparent 100%)',
              marginBottom: 28,
            }}
          />

          {/* title */}
          <h1
            style={{
              fontSize: 'clamp(52px, 7vw, 96px)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 0.96,
              color: '#eaf6ff',
              marginBottom: 16,
            }}
          >
            Courses
            <span style={{ color: '#f5a524', marginLeft: 6 }}>.</span>
          </h1>

          <p
            style={{
              fontSize: 15, color: '#9aa8c4', lineHeight: 1.6,
              maxWidth: 520,
            }}
          >
            Tham gia các khóa học và tương tác với mô phỏng 3D: Lịch sử Trái Đất, Hệ Mặt Trời và Thiên hà Milky Way.
          </p>
        </header>

        {/* ② course grid ───────────────────────────────────────────────────── */}
        {loading ? (
          <SkeletonList count={3} />
        ) : courses.length === 0 ? (
          <div
            style={{
              padding: '40px 32px', textAlign: 'center',
              border: '1px dashed rgba(126,231,255,0.15)',
              background: 'rgba(126,231,255,0.02)',
              ...chamfer(16),
            }}
          >
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13, color: '#5c6886',
              }}
            >
              // no courses found
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
            }}
          >
            {courses.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
