'use client'

// Seeded LCG so SSR + client render identical star positions (no hydration mismatch)
function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

type Star = {
  cx: number
  cy: number
  r: number
  color: string
  opacity: number
  dur: number
}

function generateStars(count = 180, width = 1600, height = 1000): Star[] {
  const rnd = lcg(7793)
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const roll = rnd()
    let color = '#ffffff'
    if (roll < 0.1) color = '#7ee7ff'
    else if (roll < 0.2) color = '#f5a524'
    const r = 0.4 + rnd() * 1.2
    stars.push({
      cx: rnd() * width,
      cy: rnd() * height,
      r,
      color,
      opacity: 0.2 + rnd() * 0.7,
      dur: 2 + rnd() * 4,
    })
  }
  return stars
}

const STARS = generateStars()

export function HudAtmosphere() {
  return (
    <>
      {/* Layer 1 — starfield SVG */}
      <svg
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {STARS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.color} opacity={s.opacity}>
            <animate
              attributeName="opacity"
              values={`${s.opacity};${Math.min(s.opacity + 0.3, 1)};${s.opacity}`}
              dur={`${s.dur}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* Layer 2 — grid overlay */}
      <div className="hud-grid-overlay" aria-hidden />

      {/* Layer 3 — scanline */}
      <div className="hud-scan" aria-hidden />

      {/* Layer 4 — edge labels */}
      <span className="hud-edge-label left">
        CosmoLearn · v2.6 · Hanoi observatory link
      </span>
      <span className="hud-edge-label right">
        Lat 21.0285° N — Lon 105.8542° E — Alt 12m
      </span>

      {/* Subtle corner radial glows */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 10% 10%, rgba(245,165,36,0.06), transparent 35%), radial-gradient(circle at 90% 90%, rgba(126,231,255,0.06), transparent 40%)',
        }}
      />
    </>
  )
}
