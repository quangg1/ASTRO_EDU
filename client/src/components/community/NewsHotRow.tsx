'use client'

import type { Post } from '@/lib/communityApi'
import { NewsCardLink } from '@/components/community/NewsCardLink'
import { CornerBrackets } from '@/components/landing/CornerBrackets'
import { plainTextExcerpt, postThumbnailUrl } from '@/lib/postContent'

function formatDate(date?: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  })
}

type Props = {
  posts: Post[]
  title?: string
  subtitle?: string
}

export function NewsHotRow({
  posts,
}: Props) {
  const list = posts.slice(0, 10)
  if (!list.length) return null

  return (
    <div
      className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3 pt-1 snap-x snap-mandatory"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(126,231,255,0.2) transparent' }}
    >
      {list.map((p) => {
        const thumb = postThumbnailUrl(p.imageUrl, p.content)
        return (
          <NewsCardLink
            key={p._id}
            post={p}
            className="group relative flex w-[min(100%,280px)] shrink-0 snap-start flex-col overflow-hidden hud-chamfer-sm transition-all hover:shadow-[0_0_24px_rgba(126,231,255,0.15)]"
            style={{
              background: 'rgba(6,9,26,0.9)',
              border: '1px solid rgba(126,231,255,0.12)',
            }}
          >
            <CornerBrackets />
            {/* Thumbnail */}
            <div className="relative aspect-[16/10] overflow-hidden" style={{ background: '#0a1024' }}>
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-full items-center justify-center text-3xl"
                  style={{ background: 'linear-gradient(135deg, rgba(126,231,255,0.08), #000)' }}
                >
                  ✦
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {/* View chip */}
              {p.viewCount != null && p.viewCount > 0 && (
                <span
                  className="absolute right-2 top-2 hud-mono hud-mono-sm px-2 py-0.5 hud-chamfer-sm backdrop-blur-sm"
                  style={{
                    background: 'rgba(6,9,26,0.75)',
                    border: '1px solid rgba(126,231,255,0.25)',
                    color: 'var(--hud-plasma)',
                  }}
                >
                  👁 {p.viewCount.toLocaleString('vi-VN')}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-3.5">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white group-hover:text-cyan-100 transition-colors">
                {p.title}
              </h3>
              {plainTextExcerpt(p.content, 72) ? (
                <p className="mt-1.5 line-clamp-2 text-xs" style={{ color: 'var(--hud-ink-3)' }}>
                  {plainTextExcerpt(p.content, 72)}
                </p>
              ) : null}
              <p className="hud-mono hud-mono-sm mt-auto pt-2" style={{ color: 'var(--hud-ink-3)' }}>
                <span style={{ color: 'var(--hud-plasma)' }}>{p.sourceName || 'Tổng hợp'}</span>
                {' · '}
                {formatDate(p.publishedAt || p.createdAt)}
              </p>
            </div>
          </NewsCardLink>
        )
      })}
    </div>
  )
}
