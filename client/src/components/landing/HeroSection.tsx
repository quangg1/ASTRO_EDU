'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Star, Users, ArrowRight, ChevronDown, Search } from 'lucide-react'
import { getStaticAssetUrl } from '@/lib/apiConfig'

const HERO_IMAGE = getStaticAssetUrl('/images/nebula-home.jpg')

export function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] md:min-h-screen flex items-center overflow-x-hidden overflow-y-visible bg-cosmic">
      {/* Lớp nền kiểu Redesign: radial violet + amber */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(245, 166, 35, 0.2), transparent), radial-gradient(ellipse 50% 30% at 0% 100%, rgba(255, 107, 53, 0.12), transparent)',
        }}
      />
      <div className="absolute inset-0 z-[1]">
        <Image src={HERO_IMAGE} alt="" fill className="object-cover scale-105 opacity-50" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--cosmic-background))] via-[hsl(var(--cosmic-background))]/75 to-[hsl(var(--cosmic-background))]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--cosmic-background))] via-transparent to-[hsl(var(--cosmic-background))]/45" />
      </div>

      <div className="absolute top-1/4 right-1/4 z-[2] w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/3 right-1/3 z-[2] w-64 h-64 bg-amber-500/15 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-24 md:pt-28 pb-28 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 md:mb-8 border border-primary/20"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Nền tảng #1 về Thiên Văn Học
            </motion.span>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-4 md:mb-6 tracking-tight text-foreground">
              Khám phá <span className="text-gradient-gold">vũ trụ</span>
              <br />
              qua từng bài học
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-lg leading-relaxed">
              Hàng trăm khóa học từ cơ bản đến nâng cao về thiên văn học, vật lý thiên thể và khám phá không gian — giảng dạy bởi các chuyên gia hàng đầu.
            </p>

            {/* Mobile-first: ô tìm kiếm + chip kiểu GFG */}
            <div className="mb-8 md:mb-10 space-y-3">
              <p className="text-sm text-muted-foreground">Bạn muốn học gì hôm nay?</p>
              <Link
                href="/search"
                className="flex items-center gap-3 w-full max-w-xl rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md px-4 py-3.5 text-left text-sm text-slate-400 hover:border-primary/40 hover:bg-black/50 transition-colors min-h-[3rem] shadow-lg"
              >
                <Search className="w-5 h-5 text-primary shrink-0" aria-hidden />
                <span className="truncate">Tìm khóa học, chủ đề, hoặc bài trong lộ trình…</span>
              </Link>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/tutorial', label: 'Lộ trình' },
                  { href: '/courses', label: 'Khóa học' },
                  { href: '/explore', label: 'Khám phá 3D' },
                ].map((chip) => (
                  <Link
                    key={chip.href}
                    href={chip.href}
                    className="inline-flex items-center rounded-full border border-border/60 bg-white/[0.06] px-4 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/10 transition-colors min-h-[2.75rem]"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <Link href="/courses">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-base hover:brightness-110 transition-all glow-gold"
                >
                  Bắt đầu học ngay
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </motion.span>
              </Link>
              <Link href="/explore">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex items-center justify-center gap-3 bg-muted/30 text-foreground px-8 py-4 rounded-xl font-semibold text-base hover:bg-muted/50 transition-all border border-border/50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Play className="h-4 w-4 text-primary ml-0.5" />
                  </div>
                  Trải nghiệm 3D
                </motion.span>
              </Link>
            </div>

            <div className="flex flex-wrap gap-8 text-sm">
              {[
                { icon: Users, value: '50,000+', label: 'học viên' },
                { icon: Star, value: '4.8', label: 'đánh giá' },
                { icon: Play, value: '500+', label: 'khóa học' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-foreground">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent rounded-3xl blur-2xl" />
              <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <div className="w-3 h-3 rounded-full bg-accent" />
                </div>
                <div className="aspect-video rounded-xl overflow-hidden relative">
                  <Image
                    src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=340&fit=crop"
                    alt="Nebula"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-semibold text-foreground">Nhập môn Thiên Văn Học</h3>
                  <p className="text-sm text-muted-foreground">Cosmo Learn</p>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 text-primary fill-primary" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">(12,500 học viên)</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-heading font-bold text-primary text-lg">499.000đ</span>
                    <Link
                      href="/courses"
                      className="bg-primary/10 text-primary text-sm px-4 py-1.5 rounded-lg font-medium border border-primary/20 hover:bg-primary/20"
                    >
                      Xem khóa học
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-muted-foreground/60">Cuộn xuống</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
        </motion.div>
      </motion.div>
    </section>
  )
}
