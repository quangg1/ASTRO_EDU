'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { GraduationCap, BookOpen, Users, Award } from 'lucide-react'

const stats = [
  { value: 50000, suffix: '+', label: 'Học viên đang học', icon: Users },
  { value: 500, suffix: '+', label: 'Khóa học chất lượng', icon: BookOpen },
  { value: 120, suffix: '+', label: 'Giảng viên chuyên gia', icon: GraduationCap },
  { value: 98, suffix: '%', label: 'Hài lòng', icon: Award },
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
    <section className="py-16 md:py-24 relative overflow-hidden bg-cosmic">
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div className="absolute inset-0 star-field opacity-20" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center relative"
              >
                {i > 0 && (
                  <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-12 bg-border/40" />
                )}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-heading text-3xl md:text-4xl font-bold text-gradient-gold mb-2">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
