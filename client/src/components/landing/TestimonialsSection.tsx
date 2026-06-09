'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { SectionEyebrow } from './SectionEyebrow'
import { useT } from '@/i18n/public'

const AVATAR_GRADIENTS = {
  a: 'linear-gradient(135deg, #ffd27a 0%, var(--color-brand-amber) 100%)',
  b: 'linear-gradient(135deg, var(--color-accent) 0%, #4dd2ff 100%)',
  c: 'linear-gradient(135deg, #ff5cd4 0%, #b04bff 100%)',
} as const

const TESTIMONIAL_KEYS = [
  {
    nameKey: 'landing.testimonial1Name',
    roleKey: 'landing.testimonial1Role',
    contentKey: 'landing.testimonial1Content',
    avatar: 'M',
    grad: AVATAR_GRADIENTS.a,
  },
  {
    nameKey: 'landing.testimonial2Name',
    roleKey: 'landing.testimonial2Role',
    contentKey: 'landing.testimonial2Content',
    avatar: 'Đ',
    grad: AVATAR_GRADIENTS.b,
  },
  {
    nameKey: 'landing.testimonial3Name',
    roleKey: 'landing.testimonial3Role',
    contentKey: 'landing.testimonial3Content',
    avatar: 'A',
    grad: AVATAR_GRADIENTS.c,
  },
] as const

const container = { hidden: {}, show: { transition: { staggerChildren: 0.14 } } }
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function TestimonialsSection() {
  const { t } = useT()

  return (
    <section className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 flex flex-col items-center gap-4"
        >
          <SectionEyebrow text={t('landing.testimonialsEyebrow')} align="center" />
          <h2
            className="hud-em font-heading text-4xl md:text-5xl lg:text-[clamp(42px,5vw,68px)] font-medium text-white tracking-[-0.03em] leading-[1]"
            dangerouslySetInnerHTML={{ __html: t('landing.testimonialsTitleHtml') }}
          />
          <p className="text-white/50 max-w-md text-[15px] leading-[1.6]">{t('landing.testimonialsDesc')}</p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {TESTIMONIAL_KEYS.map((entry) => (
            <motion.div
              key={entry.nameKey}
              variants={item}
              whileHover={{ y: -4 }}
              className="cosmo-dark-panel rounded-2xl flex flex-col p-7 transition-all duration-300"
              style={{
                background: 'var(--color-panel-muted)',
                border: '1px solid rgba(126,231,255,0.16)',
              }}
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-[color:var(--color-brand-amber)] text-[color:var(--color-brand-amber)]"
                  />
                ))}
              </div>

              <p className="text-white/75 leading-[1.65] text-[15px] flex-1 mb-6">
                &ldquo;{t(entry.contentKey)}&rdquo;
              </p>

              <div
                className="flex items-center gap-3 pt-5"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: entry.grad }}
                >
                  {entry.avatar}
                </div>
                <div>
                  <div className="font-heading font-semibold text-white text-sm">{t(entry.nameKey)}</div>
                  <div className="hud-mono hud-mono-sm text-white/45 mt-1">{t(entry.roleKey)}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
