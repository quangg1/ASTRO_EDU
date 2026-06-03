import { ReactNode } from 'react'
import { CornerBrackets } from './CornerBrackets'

type HudOrbitalFrameProps = {
  children: ReactNode
  className?: string
}

export function HudOrbitalFrame({ children, className = '' }: HudOrbitalFrameProps) {
  return (
    <div className={`relative aspect-square w-full ${className}`}>
      {/* Outer chamfered panel */}
      <div
        className="relative h-full w-full cosmo-dark-panel rounded-2xl"
        style={{
          background:
            'linear-gradient(135deg, var(--color-panel-muted) 0%, rgba(3,6,15,0.4) 100%)',
          border: '2px solid rgba(126,231,255,0.25)',
          boxShadow: '0 0 60px rgba(126,231,255,0.08), inset 0 0 40px var(--color-accent-soft)',
        }}
      >
        {/* Dashed inner frame */}
        <div
          className="pointer-events-none absolute inset-3 cosmo-dark-panel rounded-2xl"
          style={{
            border: '1px dashed var(--color-accent-soft)',
          }}
          aria-hidden
        />

        {/* Mono labels */}
        <span className="hud-mono hud-mono-sm pointer-events-none absolute left-4 top-3 text-[color:var(--color-accent)]/70">
          // solar.system.live
        </span>
        <span className="hud-mono hud-mono-sm pointer-events-none absolute bottom-3 right-4 text-[color:var(--color-accent)]/70">
          tracking · 8 bodies
        </span>

        {/* Children (SolarSystemVisual) */}
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>

        {/* Corner brackets */}
        <CornerBrackets />
      </div>

      {/* Float labels (planet tags) — purely decorative */}
      <span className="hud-mono hud-mono-sm pointer-events-none absolute -right-1 top-[22%] hidden md:inline-block rounded-sm bg-[var(--color-bg-base)]/80 px-2 py-1 text-[color:var(--color-accent)] backdrop-blur-sm">
        Trái Đất · 1 AU
      </span>
      <span className="hud-mono hud-mono-sm pointer-events-none absolute -left-2 top-[55%] hidden md:inline-block rounded-sm bg-[var(--color-bg-base)]/80 px-2 py-1 text-[color:var(--color-accent)] backdrop-blur-sm">
        Sao Mộc · 5.2 AU
      </span>
      <span className="hud-mono hud-mono-sm pointer-events-none absolute -right-2 bottom-[14%] hidden md:inline-block rounded-sm bg-[var(--color-bg-base)]/80 px-2 py-1 text-[color:var(--color-accent)] backdrop-blur-sm">
        Sao Thổ · 9.5 AU
      </span>
    </div>
  )
}
