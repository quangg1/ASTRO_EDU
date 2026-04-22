'use client'

import type { Post } from '@/lib/communityApi'
import { NewsCardLink } from '@/components/community/NewsCardLink'
import { plainTextExcerpt, postThumbnailUrl } from '@/lib/postContent'
import { Flame } from 'lucide-react'

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

/** Hàng cuộn ngang: tin “hot” (lượt xem / tương tác). */
export function NewsHotRow({
  posts,
  title = 'Đang được xem',
  subtitle = 'Nhiều lượt xem và tương tác gần đây',
}: Props) {
  const list = posts.slice(0, 10)
  if (!list.length) return null

  return (
    <section className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#1a1008]/95 via-[#0d0a08] to-[#050304] p-5 shadow-[0_20px_60px_-28px_rgba(245,158,11,0.2)] md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/85">
            <Flame className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 pt-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
        {list.map((p) => {
          const thumb = postThumbnailUrl(p.imageUrl, p.content)
          return (
            <NewsCardLink
              key={p._id}
              post={p}
              className="group flex w-[min(100%,280px)] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-amber-400/35 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#120a08]">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-950/50 to-black text-3xl">
                    ✦
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {p.viewCount != null && p.viewCount > 0 && (
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-amber-100/95 backdrop-blur-sm">
                    {p.viewCount.toLocaleString('vi-VN')} xem
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3.5">
                <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white group-hover:text-amber-50">
                  {p.title}
                </h3>
                {plainTextExcerpt(p.content, 72) ? (
                  <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{plainTextExcerpt(p.content, 72)}</p>
                ) : null}
                <p className="mt-auto pt-2 text-[11px] text-slate-500">
                  <span className="text-amber-200/80">{p.sourceName || 'Tổng hợp'}</span>
                  {' · '}
                  {formatDate(p.publishedAt || p.createdAt)}
                </p>
              </div>
            </NewsCardLink>
          )
        })}
      </div>
    </section>
  )
}
