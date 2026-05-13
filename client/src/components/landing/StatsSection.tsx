'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { CornerBrackets } from './CornerBrackets'

const stats = [
  { value: 50000, suffix: '+', label: 'Học viên đang học', code: '// 001' },
  { value: 500, suffix: '+', label: 'Khóa học chất lượng', code: '// 002' },
  { value: 120, suffix: '+', label: 'Giảng viên chuyên gia', code: '// 003' },
  { value: 98, suffix: '%', label: 'Hài lòng', code: '// 004' },
]

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 1500
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * value))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, value])

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  )
}

export function StatsSection() {
  return (
    <section className="py-20 md:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1440px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="relative flex flex-col items-start justify-between py-8 px-6 min-h-[180px]"
              style={{
                background: 'rgba(6,9,26,0.65)',
                border: '1px solid rgba(126,231,255,0.18)',
              }}
            >
              <CornerBrackets />
              <span className="hud-mono hud-mono-sm text-[color:var(--hud-plasma)]/80 mb-2">
                {stat.code}
              </span>
              <div className="flex flex-col gap-2 mt-auto">
                <div
                  className="font-heading text-5xl md:text-[clamp(48px,5vw,72px)] font-normal leading-none tabular-nums"
                  style={{
                    background: 'linear-gradient(135deg, var(--hud-amber-2) 0%, var(--hud-amber) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="hud-mono hud-mono-sm text-white/55 leading-snug">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
