'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Orbit, Sun, Moon, Rocket, Globe, Sparkles, Star, Telescope, ArrowUpRight } from 'lucide-react'
import { SectionEyebrow } from './SectionEyebrow'

const categories = [
  { icon: Sun, name: 'Hệ Mặt Trời', count: 45, href: '/topics/solar-system', feature: true },
  { icon: Star, name: 'Ngôi sao & Chòm sao', count: 38, href: '/topics/stars-constellations' },
  { icon: Globe, name: 'Hành tinh ngoài', count: 27, href: '/topics/exoplanets' },
  { icon: Orbit, name: 'Vật lý thiên thể', count: 52, href: '/topics/astrophysics' },
  { icon: Rocket, name: 'Khám phá không gian', count: 33, href: '/topics/space-exploration' },
  { icon: Sparkles, name: 'Thiên hà & Tinh vân', count: 41, href: '/topics/galaxies-nebulae' },
  { icon: Moon, name: 'Quan sát bầu trời', count: 29, href: '/topics/stargazing' },
  { icon: Telescope, name: 'Kính thiên văn', count: 18, href: '/topics/telescopes' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function CategoriesSection() {
  return (
    <section id="categories" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1440px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <SectionEyebrow text="// 01 · catalog" className="mb-4" />
            <h2
              className="hud-em font-heading text-4xl md:text-5xl lg:text-[clamp(42px,5vw,68px)] font-medium text-white tracking-[-0.03em] leading-[1]"
              dangerouslySetInnerHTML={{ __html: 'Khám phá theo <em>chủ đề</em>' }}
            />
            <p className="text-white/50 max-w-md text-[15px] leading-[1.6] mt-4">
              Từ Hệ Mặt Trời đến những thiên hà xa xôi — chọn lĩnh vực bạn muốn tìm hiểu.
            </p>
          </div>
          <Link
            href="/topics"
            className="hud-mono hud-mono-md inline-flex items-center gap-2 text-[color:var(--hud-plasma)] hover:text-white transition-colors self-start md:self-end"
          >
            Xem toàn bộ chủ đề →
          </Link>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          {categories.map((cat, i) => {
            const num = String(i + 1).padStart(2, '0')
            const isFeature = cat.feature
            return (
              <Link key={cat.name} href={cat.href}>
                <motion.div
                  variants={item}
                  whileHover={{ y: -3 }}
                  className="hud-chamfer-md group relative flex flex-col gap-4 p-5 cursor-pointer transition-all duration-300 min-h-[170px]"
                  style={{
                    background: isFeature
                      ? 'linear-gradient(135deg, rgba(245,165,36,0.18) 0%, rgba(245,165,36,0.04) 100%)'
                      : 'rgba(6,9,26,0.55)',
                    border: isFeature
                      ? '1px solid rgba(245,165,36,0.4)'
                      : '1px solid rgba(126,231,255,0.14)',
                    boxShadow: isFeature ? '0 0 30px rgba(245,165,36,0.12)' : 'none',
                  }}
                >
                  {/* LED dot */}
                  <span
                    className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: isFeature ? 'var(--hud-amber)' : 'var(--hud-plasma)',
                      boxShadow: isFeature
                        ? '0 0 8px var(--hud-amber)'
                        : '0 0 8px var(--hud-plasma)',
                    }}
                    aria-hidden
                  />
                  {/* Number eyebrow */}
                  <span className="hud-mono hud-mono-sm absolute top-3 right-3 text-white/35">
                    {num}
                  </span>

                  {/* Icon */}
                  <div
                    className="hud-chamfer-sm flex h-[46px] w-[46px] items-center justify-center mt-4"
                    style={{
                      background: isFeature ? 'rgba(245,165,36,0.15)' : 'rgba(126,231,255,0.06)',
                      border: isFeature
                        ? '1px solid rgba(245,165,36,0.4)'
                        : '1px solid rgba(126,231,255,0.2)',
                    }}
                  >
                    <cat.icon
                      className="h-5 w-5"
                      style={{ color: isFeature ? 'var(--hud-amber)' : 'var(--hud-plasma)' }}
                    />
                  </div>

                  {/* Title + meta */}
                  <div className="mt-auto">
                    <h3 className="font-heading font-semibold text-white text-[15px] mb-1 leading-snug">
                      {cat.name}
                    </h3>
                    <p className="hud-mono hud-mono-sm text-white/40">{cat.count} khóa học</p>
                  </div>

                  {/* Arrow */}
                  <ArrowUpRight
                    className="absolute bottom-3 right-3 h-4 w-4 text-white/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[color:var(--hud-plasma)]"
                    aria-hidden
                  />
                </motion.div>
              </Link>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
