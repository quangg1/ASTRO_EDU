'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SpaceCircleButton } from './SpaceCircleButton'
import { SpaceStar } from './SpaceStar'

export type SpacePillar = {
  id: string
  title: string
  body: string
  href?: string
  ctaLabel?: string
}

type Props = {
  sectionTitle?: string
  pillars: SpacePillar[]
  defaultActiveId?: string
}

export function SpaceAccordionPillars({
  sectionTitle = 'Về Cosmo Learn',
  pillars,
  defaultActiveId,
}: Props) {
  const [activeId, setActiveId] = useState(defaultActiveId ?? pillars[pillars.length - 1]?.id ?? '')

  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1440px]">
        <header className="flex items-start justify-between gap-6 mb-14 md:mb-20">
          <h2 className="sp-title-massive text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight">
            {sectionTitle}
          </h2>
          <SpaceStar className="text-white/80 shrink-0 mt-2" size={28} />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-0 md:min-h-[340px]">
          {pillars.map((pillar, i) => {
            const active = pillar.id === activeId

            if (active) {
              return (
                <motion.article
                  key={pillar.id}
                  layout
                  className="md:col-span-1 flex flex-col min-h-[300px] md:mx-2 border border-[var(--sp-card-border)]"
                  style={{
                    background: 'linear-gradient(155deg, var(--sp-card-elevated), var(--sp-card))',
                    color: 'var(--sp-card-ink)',
                  }}
                  initial={{ opacity: 0.92 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="p-6 sm:p-8 flex flex-col flex-1">
                    <h3 className="text-lg font-semibold mb-3">{pillar.title}</h3>
                    <p className="text-sm text-[var(--sp-card-muted)] leading-relaxed flex-1">{pillar.body}</p>
                    <div className="mt-8 flex items-end justify-between gap-4">
                      <span
                        className="inline-block h-20 w-20 rounded-full border border-black/12"
                        aria-hidden
                      />
                      {pillar.href ? (
                        <SpaceCircleButton href={pillar.href} dark label={pillar.ctaLabel} />
                      ) : null}
                    </div>
                  </div>
                </motion.article>
              )
            }

            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => setActiveId(pillar.id)}
                className={`relative text-left py-8 md:py-0 md:px-5 flex flex-col justify-between min-h-[100px] md:min-h-[340px] border-t md:border-t-0 md:border-l border-[var(--sp-divider)] ${
                  i === 0 ? 'md:border-l-0' : ''
                } text-white/38 hover:text-white/58 transition-colors`}
              >
                <p className="text-sm md:text-[15px] font-light tracking-wide max-w-[140px]">{pillar.title}</p>
                <span className="mt-6 md:mt-0 h-2 w-2 rounded-full border border-current opacity-50" aria-hidden />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
