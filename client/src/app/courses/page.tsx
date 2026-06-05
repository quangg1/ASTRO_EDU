'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { fetchCourses, type Course } from '@/features/courses/public'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { SkeletonList } from '@/components/ui/Skeleton'
import { CosmoPageBackdrop } from '@/components/layout/CosmoPageBackdrop'
import { useLiveClock } from '@/hooks/useLiveClock'

// ─── design primitives ───────────────────────────────────────────────────────

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = 'var(--color-accent)', s = 14, o = 8 }: { c?: string; s?: number; o?: number }) {
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
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
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
          fill={i % 7 === 0 ? 'var(--color-accent)' : i % 5 === 0 ? 'var(--color-brand-amber)' : 'var(--color-text-primary)'}
          opacity={0.4 + (i % 5) * 0.12} />
      ))}
      {/* galaxy core glow */}
      <ellipse cx="240" cy="140" rx="60" ry="60" fill="url(#mw-glow)" />
      {/* orbital rings tilted */}
      <ellipse cx="240" cy="140" rx="180" ry="55" fill="none" stroke="var(--color-accent)" strokeWidth="0.8" strokeOpacity="0.4" transform="rotate(-15 240 140)" />
      <ellipse cx="240" cy="140" rx="130" ry="38" fill="none" stroke="var(--color-accent)" strokeWidth="0.6" strokeOpacity="0.3" transform="rotate(-15 240 140)" />
      <ellipse cx="240" cy="140" rx="80" ry="22" fill="none" stroke="#4dd2ff" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(-15 240 140)" />
      <ellipse cx="240" cy="140" rx="35" ry="10" fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.6" transform="rotate(-15 240 140)" />
      {/* center orb */}
      <circle cx="240" cy="140" r="10" fill="rgba(126,231,255,0.25)" stroke="var(--color-accent)" strokeWidth="1" />
      <circle cx="240" cy="140" r="5" fill="var(--color-accent)" opacity="0.9" />
      {/* crosshair */}
      <line x1="220" y1="140" x2="235" y2="140" stroke="var(--color-accent)" strokeWidth="0.6" strokeOpacity="0.5" />
      <line x1="245" y1="140" x2="260" y2="140" stroke="var(--color-accent)" strokeWidth="0.6" strokeOpacity="0.5" />
      <line x1="240" y1="120" x2="240" y2="134" stroke="var(--color-accent)" strokeWidth="0.6" strokeOpacity="0.5" />
      <line x1="240" y1="146" x2="240" y2="162" stroke="var(--color-accent)" strokeWidth="0.6" strokeOpacity="0.5" />
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
          <stop offset="40%" stopColor="var(--color-brand-amber)" />
          <stop offset="100%" stopColor="#b35000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ss-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-brand-amber)" stopOpacity="0.3" />
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
          fill={i % 6 === 0 ? 'var(--color-brand-amber)' : 'var(--color-text-primary)'} opacity={0.3 + (i % 4) * 0.1} />
      ))}
      {/* sun glow */}
      <circle cx="200" cy="140" r="70" fill="url(#ss-glow)" />
      {/* orbit rings */}
      <circle cx="200" cy="140" r="55" fill="none" stroke="var(--color-brand-amber)" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="3 4" />
      <circle cx="200" cy="140" r="90" fill="none" stroke="var(--color-brand-amber)" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="3 5" />
      <circle cx="200" cy="140" r="128" fill="none" stroke="var(--color-accent)" strokeWidth="0.6" strokeOpacity="0.3" />
      <circle cx="200" cy="140" r="168" fill="none" stroke="var(--color-accent)" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 6" />
      {/* sun */}
      <circle cx="200" cy="140" r="28" fill="url(#ss-sun)" />
      {/* mercury */}
      <circle cx="255" cy="140" r="5" fill="var(--color-text-muted)" opacity="0.85" />
      {/* venus */}
      <circle cx="290" cy="100" r="7" fill="var(--color-brand-amber)" opacity="0.75" />
      {/* earth */}
      <circle cx="200" cy="12" r="8" fill="var(--color-accent)" opacity="0.8" />
      {/* mars */}
      <circle cx="368" cy="148" r="6" fill="#ff7c5c" opacity="0.75" />
      {/* planet dot indicators */}
      <circle cx="200" cy="12" r="2.5" fill="var(--color-accent)" />
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
          fill={i % 5 === 0 ? '#ff5cd4' : 'var(--color-text-primary)'} opacity={0.3 + (i % 5) * 0.1} />
      ))}
      {/* earth glow */}
      <circle cx="240" cy="140" r="80" fill="url(#eh-glow)" />
      {/* orbital rings */}
      <circle cx="240" cy="140" r="75" fill="none" stroke="#ff5cd4" strokeWidth="0.6" strokeOpacity="0.3" strokeDasharray="3 5" />
      <circle cx="240" cy="140" r="108" fill="none" stroke="#b76dff" strokeWidth="0.5" strokeOpacity="0.25" />
      <circle cx="240" cy="140" r="145" fill="none" stroke="var(--color-accent)" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 6" />
      {/* earth */}
      <circle cx="240" cy="140" r="48" fill="url(#eh-earth)" stroke="rgba(109,255,176,0.3)" strokeWidth="1" />
      {/* earth surface detail */}
      <path d="M220 118 Q230 110 240 115 Q250 108 258 116 Q265 125 255 132 Q248 138 238 135 Q228 140 218 132 Q210 123 220 118Z"
        fill="rgba(109,255,176,0.25)" />
      <path d="M228 148 Q238 143 248 148 Q255 158 245 162 Q234 167 224 160 Q217 152 228 148Z"
        fill="rgba(109,255,176,0.2)" />
      {/* crosshair */}
      <line x1="200" y1="140" x2="225" y2="140" stroke="var(--color-accent)" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="255" y1="140" x2="280" y2="140" stroke="var(--color-accent)" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="240" y1="100" x2="240" y2="124" stroke="var(--color-accent)" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="240" y1="156" x2="240" y2="180" stroke="var(--color-accent)" strokeWidth="0.7" strokeOpacity="0.5" />
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
    dot: 'var(--color-accent)',
    badge: '3D · LIVE',
    badgeColor: 'var(--color-accent)',
    cover: <MilkyWayCover />,
    titleHead: 'Thiên hà ',
    titleEm: 'Milky Way',
    accent: 'var(--color-accent)',
  },
  'solar-system': {
    dot: 'var(--color-brand-amber)',
    badge: 'BEGINNER',
    badgeColor: '#6dffb0',
    cover: <SolarSystemCover />,
    titleHead: 'Hệ ',
    titleEm: 'Mặt Trời',
    accent: 'var(--color-brand-amber)',
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

function CoursePageStyles() {
  return (
    <style>{`
      .course-card-hover:hover {
        border-color: var(--color-accent-strong) !important;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--color-accent-soft) !important;
        transform: translateY(-4px);
      }
      .course-card-hover .enter-btn:hover {
        filter: brightness(1.08);
        box-shadow: 0 0 20px var(--color-accent-strong);
      }
    `}</style>
  )
}

// ─── course card ──────────────────────────────────────────────────────────────

function CourseCard({ course, index }: { course: Course; index: number }) {
  const meta = COURSE_META[course.slug] ?? {
    dot: 'var(--color-accent)',
    badge: course.level?.toUpperCase() ?? 'COURSE',
    badgeColor: 'var(--color-accent)',
    cover: <MilkyWayCover />,
    titleHead: '',
    titleEm: course.title,
    accent: 'var(--color-accent)',
  }

  const thumbSrc = course.thumbnail ? resolveMediaUrl(course.thumbnail) : null
  const lessonCount = course.lessonCount ?? 0
  const level = course.level ?? 'intermediate'
  const cardNum = String(index + 1).padStart(2, '0')

  return (
    <Link href={`/courses/${course.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        className="course-card-hover overflow-hidden rounded-2xl border transition-all duration-200"
        style={{
          position: 'relative',
          background: 'linear-gradient(168deg, var(--color-bg-elevated) 0%, var(--color-bg-surface) 100%)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* cover area */}
        <div
          style={{
            position: 'relative',
            aspectRatio: '16/10',
            overflow: 'hidden',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            meta.cover
          )}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to top, var(--color-bg-surface) 0%, transparent 42%)',
            }}
            aria-hidden
          />

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
              color: 'rgba(255, 255, 255, 0.72)',
              paddingLeft: 4,
              textShadow: '0 1px 8px rgba(0,0,0,0.6)',
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
        <div style={{ padding: '18px 20px 20px' }}>
          <p
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: meta.accent,
              marginBottom: 8,
            }}
          >
            Khóa {cardNum}
          </p>
          <h2
            style={{
              fontSize: 'clamp(17px, 2vw, 21px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 10,
              lineHeight: 1.25,
            }}
          >
            {meta.titleHead}
            <span style={{ color: 'var(--color-brand-amber)', fontWeight: 500 }}>{meta.titleEm}</span>
          </h2>

          <p
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              lineHeight: 1.55,
              marginBottom: 16,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {course.description || 'Khám phá nội dung khóa học qua hình ảnh và mô phỏng.'}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 14,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
              }}
            >
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {String(lessonCount).padStart(2, '0')}
              </span>{' '}
              bài · {level}
            </span>

            <span
              className="enter-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Vào khóa
              <span aria-hidden>→</span>
            </span>
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
  const [searchInput, setSearchInput] = useState('')
  const { time: localTime, zoneLabel } = useLiveClock()

  const loadCourses = useCallback((q: string) => {
    setLoading(true)
    fetchCourses(q.trim() ? { search: q.trim() } : undefined)
      .then(setCourses)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const delay = searchInput.trim() ? 300 : 0
    const t = window.setTimeout(() => loadCourses(searchInput), delay)
    return () => window.clearTimeout(t)
  }, [searchInput, loadCourses])

  const totalCourses = courses.length
  const totalStr = String(totalCourses).padStart(2, '0')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        fontFamily: 'Space Grotesk, sans-serif',
        color: 'var(--color-text-primary)',
        position: 'relative',
      }}
    >
      <CosmoPageBackdrop />
      <CoursePageStyles />

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
                color: 'var(--color-text-subtle)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--color-accent)',
                  boxShadow: '0 0 6px var(--color-accent)',
                  display: 'inline-block',
                }}
              />
              // 01 · course catalog · live
            </p>

            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, color: 'var(--color-text-subtle)',
              }}
            >
              <span style={{ color: 'var(--color-accent)' }}>
                {zoneLabel} {localTime}
              </span>
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
              <span style={{ color: 'var(--color-text-muted)' }}>{loading ? '--' : totalStr}/03</span>
            </div>
          </div>

          {/* cyan accent line */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, var(--color-accent) 0%, rgba(126,231,255,0.1) 60%, transparent 100%)',
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
              color: 'var(--color-text-primary)',
              marginBottom: 16,
            }}
          >
            Courses
            <span style={{ color: 'var(--color-brand-amber)', marginLeft: 6 }}>.</span>
          </h1>

          <p
            style={{
              fontSize: 15, color: 'var(--color-text-muted)', lineHeight: 1.6,
              maxWidth: 520,
            }}
          >
            Tham gia các khóa học và tương tác với mô phỏng 3D: Lịch sử Trái Đất, Hệ Mặt Trời và Thiên hà Milky Way.
          </p>

          <label className="mt-6 block max-w-md" style={{ marginTop: 24 }}>
            <span className="sr-only">Tìm khóa học</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên hoặc mô tả…"
              aria-label="Tìm khóa học"
              className="w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </label>
        </header>

        {/* ② course grid ───────────────────────────────────────────────────── */}
        {loading ? (
          <SkeletonList count={3} />
        ) : courses.length === 0 ? (
          <div
            style={{
              padding: '40px 32px', textAlign: 'center',
              border: '1px dashed var(--color-accent-soft)',
              background: 'rgba(126,231,255,0.02)',
              ...chamfer(16),
            }}
          >
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13, color: 'var(--color-text-subtle)',
              }}
            >
              {searchInput.trim() ? '// no courses match your search' : '// no courses found'}
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
