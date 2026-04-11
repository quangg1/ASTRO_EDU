'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Orbit, Sun, Moon, Rocket, Globe, Sparkles, Star, Telescope } from 'lucide-react'

/** Slug khớp LEARNING_TOPICS + map node trong Learning Path (Dual mapping). */
const categories = [
  { icon: Sun, name: 'Hệ Mặt Trời', count: 45, href: '/topics/solar-system', gradient: 'from-amber-500/20 to-orange-500/10' },
  { icon: Star, name: 'Ngôi sao & Chòm sao', count: 38, href: '/topics/stars-constellations', gradient: 'from-yellow-500/20 to-amber-500/10' },
  { icon: Globe, name: 'Hành tinh ngoài', count: 27, href: '/topics/exoplanets', gradient: 'from-cyan-500/20 to-blue-500/10' },
  { icon: Orbit, name: 'Vật lý thiên thể', count: 52, href: '/topics/astrophysics', gradient: 'from-violet-500/20 to-purple-500/10' },
  { icon: Rocket, name: 'Khám phá không gian', count: 33, href: '/topics/space-exploration', gradient: 'from-rose-500/20 to-pink-500/10' },
  { icon: Sparkles, name: 'Thiên hà & Tinh vân', count: 41, href: '/topics/galaxies-nebulae', gradient: 'from-indigo-500/20 to-violet-500/10' },
  { icon: Moon, name: 'Quan sát bầu trời', count: 29, href: '/topics/stargazing', gradient: 'from-sky-500/20 to-cyan-500/10' },
  { icon: Telescope, name: 'Kính thiên văn', count: 18, href: '/topics/telescopes', gradient: 'from-emerald-500/20 to-teal-500/10' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } }

export function CategoriesSection() {
  return (
    <section id="categories" className="py-16 md:py-28 relative overflow-hidden bg-cosmic">
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div className="absolute inset-0 star-field opacity-30" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4 block">Lĩnh vực học tập</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-5 text-foreground">
            Khám phá theo <span className="text-gradient-gold">chủ đề</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Từ Hệ Mặt Trời đến những thiên hà xa xôi — chọn lĩnh vực bạn muốn tìm hiểu
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5"
        >
          {categories.map((cat) => (
            <Link key={cat.name} href={cat.href}>
              <motion.div
                variants={item}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`group relative bg-gradient-to-br ${cat.gradient} border border-border/50 hover:border-primary/30 rounded-2xl p-4 sm:p-6 cursor-pointer transition-all duration-300 card-glow backdrop-blur-sm active:scale-[0.98] min-h-[5.5rem] sm:min-h-0 touch-manipulation`}
              >
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <cat.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-1 text-sm md:text-base">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{cat.count} khóa học</p>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
