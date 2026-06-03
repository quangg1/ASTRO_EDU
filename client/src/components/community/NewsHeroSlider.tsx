'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { Post } from '@/features/community/public'
import { plainTextExcerpt, postThumbnailUrl } from '@/features/community/public'
import { NewsCardLink } from '@/components/community/NewsCardLink'
import { CornerBrackets } from '@/components/landing/CornerBrackets'

function formatDate(date?: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const AUTO_MS = 6500

type Props = {
  posts: Post[]
  title?: string
  subtitle?: string
}

export function NewsHeroSlider({
  posts,
  title = 'Tin mới nhất',
  subtitle = 'Mười bài gần đây — vuốt hoặc dùng nút để xem',
}: Props) {
  const slides = posts.slice(0, 10)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()

  const n = slides.length
  const safeIndex = n ? index % n : 0
  const current = slides[safeIndex]

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!n) return
      setIndex((i) => (i + dir + n) % n)
    },
    [n]
  )

  useEffect(() => {
    if (n <= 1 || paused || reduceMotion) return
    const t = setInterval(() => go(1), AUTO_MS)
    return () => clearInterval(t)
  }, [n, paused, reduceMotion, go])

  useEffect(() => {
    setIndex(0)
  }, [posts])

  if (!n || !current) return null

  const thumb = postThumbnailUrl(current.imageUrl, current.content)
  const excerpt = plainTextExcerpt(current.content, 160)

  return (
    <section
      className="relative overflow-hidden cosmo-dark-panel rounded-2xl"
      style={{
        background: '#050a14',
        border: '1px solid var(--color-border)',
        boxShadow: '0 24px 80px -32px rgba(6,182,212,0.2)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <CornerBrackets />

      {/* Dashed inner frame accent */}
      <div
        className="pointer-events-none absolute inset-[6px] cosmo-dark-panel rounded-2xl z-0"
        style={{ border: '1px dashed rgba(126,231,255,0.1)' }}
        aria-hidden
      />

      {/* Progress bar */}
      {!paused && !reduceMotion && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-50" style={{ background: 'rgba(126,231,255,0.1)' }}>
          <div
            key={`progress-${safeIndex}`}
            className="h-full"
            style={{
              background: 'var(--color-accent)',
              boxShadow: '0 0 8px var(--color-accent)',
              animation: `sliderProgress ${AUTO_MS}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Header bar */}
      <div className="relative z-10 px-4 pt-4 pb-3 md:px-6 md:pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="hud-mono hud-mono-md" style={{ color: 'var(--color-accent)' }}>{title.toUpperCase()}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-subtle)' }}>{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="cosmo-dark-panel rounded-xl inline-flex h-9 items-center gap-1.5 px-3 hud-mono hud-mono-sm transition-all hover:shadow-[0_0_12px_rgba(126,231,255,0.2)]"
              style={{
                background: 'rgba(126,231,255,0.06)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
              aria-label={paused ? 'Phát tự động' : 'Tạm dừng'}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? 'PHÁT' : 'DỪNG'}
            </button>
            <span
              className="cosmo-dark-panel rounded-xl px-2.5 py-1 hud-mono hud-mono-sm tabular-nums"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--color-accent-soft)',
                color: 'var(--color-text-muted)',
              }}
            >
              {safeIndex + 1} / {n}
            </span>
          </div>
        </div>
      </div>

      {/* Slide area */}
      <div className="relative aspect-[16/9] min-h-[260px] w-full md:aspect-[21/9] md:min-h-[300px]">
        {/* Scan-line overlay on slide */}
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
          }}
          aria-hidden
        />

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={current._id}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-7xl opacity-90"
                style={{ background: 'linear-gradient(135deg, #0c1a2e, #060d18, #000)' }}>
                🌌
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20 md:bg-gradient-to-r md:from-black/90 md:via-black/45 md:to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Content overlay */}
        <div className="absolute inset-0 z-[15] flex flex-col justify-end p-5 md:p-8 md:pb-10 md:pr-[28%]">
          <div className="max-w-2xl">
            <span
              className="cosmo-dark-panel rounded-xl hud-mono hud-mono-sm inline-flex items-center gap-1.5 px-2.5 py-1"
              style={{
                background: 'var(--color-brand-amber)',
                color: '#1a0e00',
              }}
            >
              ● MỚI
            </span>
            <h3 className="mt-3 text-xl font-semibold leading-snug text-white drop-shadow-sm md:text-2xl lg:text-3xl">
              {current.title}
            </h3>
            {excerpt ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed md:line-clamp-3 md:text-[0.95rem]"
                style={{ color: 'rgba(234,246,255,0.8)' }}>
                {excerpt}
              </p>
            ) : null}
            <p className="hud-mono hud-mono-sm mt-3 flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: 'var(--color-text-subtle)' }}>
              <span style={{ color: 'var(--color-accent)' }}>{current.sourceName || 'Nguồn'}</span>
              <span>·</span>
              <time dateTime={current.publishedAt || current.createdAt}>
                {formatDate(current.publishedAt || current.createdAt)}
              </time>
              {current.viewCount != null && current.viewCount > 0 && (
                <>
                  <span>·</span>
                  <span>{current.viewCount.toLocaleString('vi-VN')} lượt xem</span>
                </>
              )}
            </p>
            <div className="mt-4">
              <span
                className="cosmo-dark-panel rounded-xl hud-mono hud-mono-md inline-flex items-center px-4 py-2"
                style={{
                  background: 'var(--color-brand-amber)',
                  color: '#1a0e00',
                  boxShadow: '0 0 20px rgba(245,165,36,0.3)',
                }}
              >
                ĐỌC BÀI →
              </span>
            </div>
          </div>
        </div>

        <NewsCardLink
          post={current}
          className="absolute inset-0 z-[20] cursor-pointer"
          aria-label={`Đọc: ${current.title}`}
        >
          <span className="sr-only">{current.title}</span>
        </NewsCardLink>

        {/* Prev/next fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[35] w-14 bg-gradient-to-r from-black/50 to-transparent md:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[35] w-14 bg-gradient-to-l from-black/50 to-transparent md:w-20" />

        {/* Prev button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(-1) }}
          className="absolute left-2 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center cosmo-dark-panel rounded-xl text-white backdrop-blur-md transition-all hover:shadow-[0_0_12px_rgba(126,231,255,0.3)] md:left-4 md:h-12 md:w-12"
          style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Bài trước"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Next button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(1) }}
          className="absolute right-2 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center cosmo-dark-panel rounded-xl text-white backdrop-blur-md transition-all hover:shadow-[0_0_12px_rgba(126,231,255,0.3)] md:right-4 md:h-12 md:w-12"
          style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Bài sau"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-0 right-0 z-40 flex justify-center gap-1.5 px-4">
          {slides.map((p, i) => (
            <button
              key={p._id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setIndex(i) }}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIndex ? 'w-8' : 'w-2 hover:opacity-75'
              }`}
              style={{
                background: i === safeIndex ? 'var(--color-accent)' : 'rgba(255,255,255,0.3)',
                boxShadow: i === safeIndex ? '0 0 8px var(--color-accent)' : 'none',
              }}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === safeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes sliderProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  )
}
