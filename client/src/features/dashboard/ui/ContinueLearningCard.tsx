'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Props = {
  title: string
  description: string
  tags?: string[]
  progress: number
  href: string
  ctaLabel?: string
  moduleId?: string
}

const chamfer = (cut = 12) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = 'var(--color-accent)', s = 12, o = 6 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties) => ({
    position: 'absolute' as const,
    width: s,
    height: s,
    opacity: 0.85,
    pointerEvents: 'none' as const,
    ...ex,
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

export function ContinueLearningCard({
  title,
  description,
  tags = [],
  progress,
  href,
  ctaLabel = 'Tiếp tục học',
  moduleId,
}: Props) {
  return (
    <div
      className="relative cosmo-dark-panel rounded-2xl overflow-hidden"
      style={{ padding: 24 }}
    >
      <Brackets c="var(--color-accent)" s={12} o={6} />

      {/* Header */}
      <p
        className="dash-mono text-[10px] uppercase mb-4"
        style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
      >
        // đang học
      </p>

      {/* Module Badge (First Letter) */}
      {moduleId ? (
        <div
          className="inline-flex items-center justify-center mb-4 font-bold text-lg"
          style={{
            width: 48,
            height: 48,
            border: '1.5px solid rgba(126,231,255,0.4)',
            background: 'linear-gradient(135deg, rgba(126,231,255,0.12) 0%, rgba(77,210,255,0.08) 100%)',
            color: 'var(--color-accent)',
            ...chamfer(10),
          }}
        >
          {title.slice(0, 1).toUpperCase()}
        </div>
      ) : null}

      {/* Tags */}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="dash-mono text-[9px] uppercase px-2 py-1"
              style={{
                border: '1px solid rgba(126,231,255,0.25)',
                background: 'rgba(126,231,255,0.08)',
                color: 'var(--color-accent)',
                letterSpacing: '0.12em',
                ...chamfer(6),
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Title & Description */}
      <h3
        className="text-xl font-semibold leading-tight mb-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed mb-5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {description}
      </p>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span
            className="dash-mono text-[10px] uppercase"
            style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.12em' }}
          >
            Tiến độ hiện tại
          </span>
          <span
            className="dash-mono text-[11px] font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {progress}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: 'rgba(126,231,255,0.08)',
            border: '1px solid rgba(126,231,255,0.12)',
            position: 'relative',
            overflow: 'hidden',
            ...chamfer(3),
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--color-accent) 0%, #4dd2ff 100%)',
              boxShadow: '0 0 8px rgba(126,231,255,0.6)',
              transition: 'width 0.5s ease',
              ...chamfer(3),
            }}
          />
        </div>
      </div>

      {/* CTA */}
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-5 py-3 font-medium transition-all"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-amber) 0%, #ffa726 100%)',
          color: '#0a0f17',
          border: 'none',
          boxShadow: '0 0 16px rgba(245,165,36,0.35)',
          ...chamfer(10),
        }}
      >
        {ctaLabel}
        <ArrowRight size={18} strokeWidth={2} />
      </Link>

      {/* Optional Orbit Visual */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -40,
          right: -40,
          width: 180,
          height: 180,
          opacity: 0.08,
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
