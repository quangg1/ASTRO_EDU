'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Play, ArrowRight, ChevronDown, Search } from 'lucide-react'
import { SolarSystemVisual } from './SolarSystemVisual'
import { HudOrbitalFrame } from './HudOrbitalFrame'

function formatUTC(d: Date) {
  return d.toISOString().slice(11, 19) // HH:MM:SS
}

export function HeroSection() {
  const [utc, setUtc] = useState<string>('')

  useEffect(() => {
    const tick = () => setUtc(formatUTC(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="relative min-h-[100dvh] md:min-h-screen flex items-center overflow-hidden">
      {/* Content — two-column on md+ */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-28 pb-28 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center">
        {/* Left column: text content */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="hud-mono hud-mono-md hud-chamfer-sm inline-flex items-center gap-2 px-3.5 py-2 mb-6 text-[color:var(--hud-plasma)]"
            style={{
              background: 'rgba(126,231,255,0.06)',
              border: '1px solid rgba(126,231,255,0.25)',
            }}
          >
            <span className="hud-pulse-dot" aria-hidden />
            Nền tảng học thiên văn lớn nhất tại Việt Nam
          </motion.span>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="hud-em font-heading text-5xl sm:text-6xl lg:text-7xl xl:text-[clamp(56px,7vw,104px)] font-medium leading-[0.96] tracking-[-0.035em] text-white mb-6"
            dangerouslySetInnerHTML={{ __html: 'Khám phá <em>vũ trụ</em> qua từng <em>bài học</em>' }}
          />

          {/* Sub-text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="text-base md:text-[16px] text-white/55 mb-6 max-w-xl leading-[1.6]"
          >
            Hàng trăm khóa học từ cơ bản đến nâng cao về thiên văn học, vật lý thiên thể và khám phá không gian.
          </motion.p>

          {/* Readout strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="hud-mono hud-mono-sm flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 mb-6 text-[color:var(--hud-ink-2)]"
          >
            <span>MISSION COS-LRN/04</span>
            <span aria-hidden className="text-[color:var(--hud-plasma)]/40">·</span>
            <span className="text-[color:var(--hud-plasma)] tabular-nums">{utc || '--:--:--'} UTC</span>
            <span aria-hidden className="text-[color:var(--hud-plasma)]/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              STATUS <span className="hud-status-dot-cyan" aria-hidden /> ONLINE
            </span>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="w-full max-w-xl mb-5"
          >
            <Link
              href="/search"
              className="hud-chamfer-md flex items-center gap-3 w-full px-5 py-4 text-left text-sm text-white/45 transition-all"
              style={{
                background: 'rgba(6,9,26,0.7)',
                border: '1px solid rgba(126,231,255,0.2)',
              }}
            >
              <Search className="w-4 h-4 text-[color:var(--hud-plasma)]/70 shrink-0" aria-hidden />
              <span className="truncate flex-1">Tìm khóa học, chủ đề, hoặc bài trong lộ trình…</span>
            </Link>
          </motion.div>

          {/* Quick chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap justify-center lg:justify-start gap-2 mb-8"
          >
            {[
              { href: '/tutorial', label: 'Lộ trình học' },
              { href: '/courses', label: 'Khóa học' },
              { href: '/explore', label: 'Khám phá 3D' },
            ].map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="hud-chamfer-sm inline-flex items-center px-3.5 py-1.5 text-xs text-white/70 transition-all hover:text-white"
                style={{
                  background: 'rgba(126,231,255,0.04)',
                  border: '1px solid rgba(126,231,255,0.16)',
                }}
              >
                {chip.label}
              </Link>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 mb-10"
          >
            <Link
              href="/courses"
              className="hud-chamfer group inline-flex items-center justify-center gap-2 px-7 py-4 text-sm font-semibold transition-all"
              style={{
                background: 'var(--hud-amber)',
                color: '#1a0e00',
                boxShadow: '0 0 24px rgba(245,165,36,0.35)',
              }}
            >
              Bắt đầu học ngay
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/explore"
              className="hud-chamfer group inline-flex items-center justify-center gap-3 px-7 py-4 text-sm font-semibold text-white transition-all"
              style={{
                background: 'rgba(126,231,255,0.06)',
                border: '1px solid rgba(126,231,255,0.3)',
              }}
            >
              <Play className="h-4 w-4 text-[color:var(--hud-plasma)]" />
              Trải nghiệm 3D
            </Link>
          </motion.div>

          {/* Mini stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-3 text-sm"
          >
            {[
              { value: '50,000+', label: 'học viên' },
              { value: '4.9★', label: 'đánh giá tb' },
              { value: '120+', label: 'giảng viên' },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                <div className="font-heading font-bold text-[color:var(--hud-amber)] text-lg leading-none">
                  {item.value}
                </div>
                <div className="hud-mono hud-mono-sm text-white/45">{item.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column: HUD orbital frame */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
          className="hidden lg:flex items-center justify-center w-full"
        >
          <div className="w-full max-w-[640px]">
            <HudOrbitalFrame>
              <div className="absolute inset-0">
                <SolarSystemVisual />
              </div>
            </HudOrbitalFrame>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10"
      >
        <span className="hud-mono hud-mono-sm text-white/30">Cuộn xuống</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          <ChevronDown className="h-4 w-4 text-white/25" />
        </motion.div>
      </motion.div>
    </section>
  )
}
