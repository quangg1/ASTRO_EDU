'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Layers } from 'lucide-react'
import { ModuleVisualArt, resolveModuleVisual } from './moduleVisuals'

export type SpaceMissionCardProps = {
  title: string
  metaPrimary?: string
  metaSecondary?: string
  badge?: string
  progressLabel?: string
  href: string
  moduleId?: string
  emoji?: string
  featured?: boolean
  /** @deprecated use moduleId */
  accentOrb?: 'sphere' | 'gear' | 'rock'
}

export function SpaceMissionCard({
  title,
  metaPrimary,
  metaSecondary,
  badge = 'Explorer',
  progressLabel,
  href,
  moduleId = 'intro-scale',
  emoji,
  featured,
}: SpaceMissionCardProps) {
  const visual = resolveModuleVisual(moduleId)

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className="h-full">
      <Link
        href={href}
        className="group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-[var(--sp-card-shadow)]"
        style={{
          background: 'linear-gradient(155deg, var(--sp-card-elevated) 0%, var(--sp-card) 55%)',
          color: 'var(--sp-card-ink)',
          borderColor: featured ? `rgba(${visual.accentRgb},0.55)` : 'var(--sp-card-border)',
          boxShadow: featured
            ? `var(--sp-card-shadow), 0 0 0 1px rgba(${visual.accentRgb},0.2)`
            : 'var(--sp-card-shadow)',
        }}
      >
        <span
          className="pointer-events-none absolute left-0 top-[72%] h-4 w-2 -translate-x-1/2 rounded-full"
          style={{ background: 'var(--sp-bg)' }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute right-0 top-[72%] h-4 w-2 translate-x-1/2 rounded-full"
          style={{ background: 'var(--sp-bg)' }}
          aria-hidden
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            background: `linear-gradient(120deg, transparent 40%, rgba(${visual.accentRgb},0.5) 100%)`,
          }}
          aria-hidden
        />

        <div className="relative flex flex-1 flex-col p-6 sm:p-7">
          <div className="pr-[118px]">
            <p
              className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{ color: visual.accent }}
            >
              {visual.label}
            </p>
            <h3 className="text-xl font-semibold leading-snug tracking-tight text-[var(--sp-card-ink)]">
              {title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--sp-card-muted)]">
              {metaPrimary ? (
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  {metaPrimary}
                </span>
              ) : null}
              {metaSecondary ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  {metaSecondary}
                </span>
              ) : null}
            </div>
            {badge ? (
              <span
                className="mt-4 inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white"
                style={{ background: `rgba(${visual.accentRgb},0.92)` }}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <ModuleVisualArt moduleId={moduleId} emoji={emoji} />
        </div>

        <div
          className="relative flex items-center justify-between px-6 py-4 sm:px-7"
          style={{ borderTop: '1px solid var(--sp-card-border)' }}
        >
          <span className="text-sm font-medium tabular-nums text-[var(--sp-card-muted)] group-hover:text-[var(--sp-card-ink)] transition-colors">
            {progressLabel ?? 'Bắt đầu'}
          </span>
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover:scale-105"
            style={{ background: `rgb(${visual.accentRgb})` }}
            aria-hidden
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
