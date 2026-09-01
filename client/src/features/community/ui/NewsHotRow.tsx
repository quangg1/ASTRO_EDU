'use client'

import type { Post } from '@/features/community/api/communityApi'
import { plainTextExcerpt, postThumbnailUrl } from '@/features/community/lib/postContent'
import { NewsCardLink } from '@/features/community/ui/NewsCardLink'
import { CornerBrackets } from '@/components/landing/CornerBrackets'

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
            className="group relative flex w-[min(100%,280px)] shrink-0 snap-start flex-col overflow-hidden cosmo-dark-panel rounded-xl transition-all hover:shadow-[0_0_24px_var(--color-accent-soft)]"
            style={{
              background: 'var(--color-panel-solid)',
              border: '1px solid var(--color-border)',
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
                  className="absolute right-2 top-2 hud-mono hud-mono-sm px-2 py-0.5 cosmo-dark-panel rounded-xl backdrop-blur-sm"
                  style={{
                    background: 'var(--color-panel-muted)',
                    border: '1px solid rgba(126,231,255,0.25)',
                    color: 'var(--color-accent)',
                  }}
                >
                  👁 {p.viewCount.toLocaleString('vi-VN')}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-3.5">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white group-hover:text-ds-text transition-colors">
                {p.title}
              </h3>
              {plainTextExcerpt(p.content, 72) ? (
                <p className="mt-1.5 line-clamp-2 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                  {plainTextExcerpt(p.content, 72)}
                </p>
              ) : null}
              <p className="hud-mono hud-mono-sm mt-auto pt-2" style={{ color: 'var(--color-text-subtle)' }}>
                <span style={{ color: 'var(--color-accent)' }}>{p.sourceName || 'Tổng hợp'}</span>
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
