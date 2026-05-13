'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/apiConfig'
import type { Course } from '@/lib/coursesApi'
import { SectionEyebrow } from './SectionEyebrow'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const item = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const BADGES = ['BESTSELLER', 'NEW', 'STREAMING · LIVE'] as const

export function CoursesSection({ courses, loading }: { courses: Course[]; loading: boolean }) {
  const featured = courses.slice(0, 3)

  return (
    <section id="courses" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1440px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4"
        >
          <div>
            <SectionEyebrow text="// 02 · trending" className="mb-4" />
            <h2
              className="hud-em font-heading text-4xl md:text-5xl lg:text-[clamp(42px,5vw,68px)] font-medium text-white tracking-[-0.03em] leading-[1]"
              dangerouslySetInnerHTML={{ __html: 'Khóa học <em>nổi bật</em>' }}
            />
            <p className="text-white/50 text-[15px] max-w-md leading-[1.6] mt-4">
              Những khóa học được yêu thích nhất bởi cộng đồng thiên văn học.
            </p>
          </div>
          <Link
            href="/courses"
            className="hud-mono hud-mono-md inline-flex items-center gap-2 text-[color:var(--hud-plasma)] hover:text-white transition-colors self-start md:self-end"
          >
            Xem tất cả khóa học →
          </Link>
        </motion.div>

        {/* Course grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="hud-chamfer-md h-96 animate-pulse"
                style={{ background: 'rgba(6,9,26,0.6)', border: '1px solid rgba(126,231,255,0.12)' }}
              />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-white/40 text-sm">Chưa có khóa học. Bạn có thể khám phá Tutorial.</p>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {featured.map((course, idx) => {
              const badge = BADGES[idx % BADGES.length]
              const badgeIsLive = badge === 'STREAMING · LIVE'
              return (
                <Link key={course.id} href={`/courses/${course.slug}`} className="h-full block">
                  <motion.div
                    variants={item}
                    whileHover={{ y: -4 }}
                    className="hud-chamfer-md group relative cursor-pointer transition-all duration-400 overflow-hidden h-full flex flex-col"
                    style={{
                      background: 'rgba(6,9,26,0.7)',
                      border: '1px solid rgba(126,231,255,0.18)',
                    }}
                  >
                    {/* Cover 16:10 */}
                    <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
                      {course.thumbnail ? (
                        <Image
                          src={resolveMediaUrl(course.thumbnail)}
                          alt={course.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1024] to-[#03060f] flex items-center justify-center text-5xl opacity-60">
                          🌌
                        </div>
                      )}
                      {/* Grid pattern overlay */}
                      <div
                        className="pointer-events-none absolute inset-0 opacity-30"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(126,231,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(126,231,255,0.15) 1px, transparent 1px)',
                          backgroundSize: '24px 24px',
                          mixBlendMode: 'screen',
                        }}
                        aria-hidden
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#03060f] via-transparent to-transparent" />
                      {/* Badge */}
                      <span
                        className="hud-mono hud-mono-sm hud-chamfer-sm absolute top-3 right-3 px-2.5 py-1"
                        style={{
                          background: badgeIsLive ? 'rgba(255,92,212,0.18)' : 'rgba(126,231,255,0.14)',
                          border: badgeIsLive
                            ? '1px solid rgba(255,92,212,0.5)'
                            : '1px solid rgba(126,231,255,0.4)',
                          color: badgeIsLive ? 'var(--hud-magenta)' : 'var(--hud-plasma)',
                        }}
                      >
                        {badgeIsLive && <span className="hud-pulse-dot mr-1.5" aria-hidden style={{ background: 'var(--hud-magenta)', boxShadow: '0 0 8px var(--hud-magenta)' }} />}
                        {badge}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-heading font-semibold text-white mb-2 line-clamp-2 transition-colors text-[16px] leading-snug">
                        {course.title}
                      </h3>
                      <p className="text-[13px] text-white/45 mb-4 line-clamp-2 leading-relaxed min-h-[40px]">
                        {course.description || 'Khám phá kiến thức thiên văn cùng CosmoLearn.'}
                      </p>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-4 mt-auto">
                        <span className="hud-mono hud-mono-md text-[color:var(--hud-amber)] font-semibold">4.9</span>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, j) => (
                            <Star
                              key={j}
                              className="h-3 w-3 fill-[color:var(--hud-amber)] text-[color:var(--hud-amber)]"
                            />
                          ))}
                        </div>
                        <span className="hud-mono hud-mono-sm text-white/40">
                          ({course.lessonCount ?? 0} bài)
                        </span>
                      </div>

                      {/* Price + level */}
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(126,231,255,0.1)' }}>
                        <span className="hud-mono hud-mono-sm text-white/45">{course.level}</span>
                        {course.isPaid && (course.price ?? 0) > 0 ? (
                          <span className="font-heading font-bold text-[color:var(--hud-amber)] text-base">
                            {course.currency === 'USD'
                              ? `$${course.price}`
                              : `${(course.price ?? 0).toLocaleString('vi-VN')} ₫`}
                          </span>
                        ) : (
                          <span className="font-heading font-bold text-[color:var(--hud-amber)] text-base">
                            Miễn phí
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </motion.div>
        )}
      </div>
    </section>
  )
}
