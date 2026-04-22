'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { Post } from '@/lib/communityApi'
import { NewsCardLink } from '@/components/community/NewsCardLink'
import { plainTextExcerpt, postThumbnailUrl } from '@/lib/postContent'

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
  /** Tiêu đề khu vực */
  title?: string
  subtitle?: string
}

/** Slider toàn chiều rộng: 10 bài mới nhất, auto-play, nút + chấm, tạm dừng khi hover. */
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

  if (!n || !current) {
    return null
  }

  const thumb = postThumbnailUrl(current.imageUrl, current.content)
  const excerpt = plainTextExcerpt(current.content, 160)

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-[#050a14] shadow-[0_24px_80px_-32px_rgba(6,182,212,0.35)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 px-4 pt-5 pb-3 md:px-6 md:pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-200"
              aria-label={paused ? 'Phát tự động' : 'Tạm dừng'}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? 'Phát' : 'Dừng'}
            </button>
            <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-400">
              {safeIndex + 1} / {n}
            </span>
          </div>
        </div>
      </div>

      <div className="relative aspect-[16/11] min-h-[280px] w-full md:aspect-[21/9] md:min-h-[320px]">
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
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0c1a2e] via-[#060d18] to-black text-7xl opacity-90">
                🌌
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20 md:bg-gradient-to-r md:from-black/90 md:via-black/45 md:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 z-[15] flex flex-col justify-end p-5 md:p-8 md:pb-10 md:pr-[28%]">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/95">
              Mới
            </span>
            <h3 className="mt-3 text-xl font-semibold leading-snug text-white drop-shadow-sm md:text-2xl lg:text-3xl">
              {current.title}
            </h3>
            {excerpt ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-300/95 md:line-clamp-3 md:text-[0.95rem]">
                {excerpt}
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="text-cyan-200/90">{current.sourceName || 'Nguồn'}</span>
              <span className="text-slate-600">·</span>
              <time dateTime={current.publishedAt || current.createdAt}>
                {formatDate(current.publishedAt || current.createdAt)}
              </time>
              {current.viewCount != null && current.viewCount > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span>{current.viewCount.toLocaleString('vi-VN')} lượt xem</span>
                </>
              )}
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition group-hover:bg-cyan-500/20">
                Đọc bài →
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

        <div className="pointer-events-none absolute inset-y-0 left-0 z-[35] flex w-14 items-center justify-start bg-gradient-to-r from-black/50 to-transparent md:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[35] flex w-14 items-center justify-end bg-gradient-to-l from-black/50 to-transparent md:w-20" />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            go(-1)
          }}
          className="absolute left-2 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-black/65 md:left-4 md:h-12 md:w-12"
          aria-label="Bài trước"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            go(1)
          }}
          className="absolute right-2 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-black/65 md:right-4 md:h-12 md:w-12"
          aria-label="Bài sau"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-4 left-0 right-0 z-40 flex justify-center gap-1.5 px-4">
          {slides.map((p, i) => (
            <button
              key={p._id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIndex(i)
              }}
              className={`h-2 rounded-full transition-all ${
                i === safeIndex ? 'w-8 bg-cyan-400' : 'w-2 bg-white/35 hover:bg-white/55'
              }`}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === safeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
