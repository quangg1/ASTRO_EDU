'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { SpaceNumberedNav } from '@/components/space-premium'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { CatalogSearchField } from '@/components/search/CatalogSearchField'

const SolarSystemVisual = dynamic(() => import('./SolarSystemVisual').then((m) => m.SolarSystemVisual), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-[70%] w-[70%] animate-pulse rounded-full bg-white/10" />
    </div>
  ),
})

const NAV = [
  { id: 'pillars', index: 1, label: 'Lộ trình', href: '#pillars' },
  { id: 'courses', index: 2, label: 'Khóa học', href: '#courses' },
  { id: 'explore', index: 3, label: 'Khám phá 3D', href: '/explore' },
  { id: 'community', index: 4, label: 'Cộng đồng', href: '/community' },
]

const ORB_SIZE =
  'w-full max-w-[min(420px,85vw)] sm:max-w-[400px] lg:w-[min(380px,32vw)] lg:max-w-[420px] shrink-0'

export function SpaceHeroSection() {
  return (
    <section
      className="space-premium relative z-20 flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ background: 'var(--sp-bg)' }}
    >
      <div className="pointer-events-none absolute inset-0 sp-glow-crimson" aria-hidden />

      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 pt-6 sm:pt-8">
        <SiteLogo className="text-white text-lg" />
        <nav className="hidden sm:flex items-center gap-8 text-sm text-white/55">
          <Link href="/tutorial" className="hover:text-white transition-colors">
            Lộ trình
          </Link>
          <Link href="/courses" className="hover:text-white transition-colors">
            Khóa học
          </Link>
          <Link href="/explore" className="hover:text-white transition-colors">
            Khám phá 3D
          </Link>
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-4 sm:px-8 pb-16 pt-6 lg:pt-0">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 lg:pt-4">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="sp-display-thin text-[11px] sm:text-xs text-white/50 mb-4"
            >
              Khám phá bí ẩn
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="sp-title-massive text-[clamp(3.5rem,12vw,7.5rem)] text-white uppercase"
            >
              Vũ trụ
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mt-6 max-w-md text-sm sm:text-base text-white/45 leading-relaxed font-light"
            >
              Học thiên văn qua lộ trình có cấu trúc, mô phỏng 3D và cộng đồng — nền tảng giáo dục vũ trụ tại Việt Nam.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}
              className="mt-8 w-full max-w-md"
            >
              <CatalogSearchField
                variant="hero"
                placeholder="Tìm khóa học, bài lộ trình, chủ đề…"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link
                href="/tutorial"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
              >
                Bắt đầu lộ trình
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-light border border-white/25 text-white hover:border-white/50 transition-colors"
              >
                Mở Khám phá 3D
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 1 }}
            className={`relative mx-auto aspect-square ${ORB_SIZE} lg:col-span-4 lg:mx-auto`}
          >
            <div className="sp-glass-orb absolute inset-3 overflow-hidden sm:inset-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <SolarSystemVisual />
              </div>
            </div>
          </motion.div>

          <div className="hidden lg:flex lg:col-span-3 lg:justify-end lg:pr-2">
            <SpaceNumberedNav items={NAV} activeId="explore" className="text-right" />
          </div>
        </div>
      </div>

      <p className="relative z-10 text-center pb-8 text-[10px] uppercase tracking-[0.2em] text-white/25">
        Cuộn để khám phá
      </p>
    </section>
  )
}
