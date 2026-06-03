'use client'

import { useEffect, useRef, useState } from 'react'
import {
  fetchForumPosts,
  fetchNewsCategories,
  type Forum,
  type Post,
} from '@/features/community/api/communityApi'
import { plainTextExcerpt, postThumbnailUrl } from '@/features/community/lib/postContent'
import { CommunitySearchBar } from '@/components/community/shared/CommunitySearchBar'
import { PostSortBar } from '@/components/community/shared/PostSortBar'
import { NewsCardLink } from '@/components/community/NewsCardLink'
import { NewsHeroSlider } from '@/components/community/NewsHeroSlider'

function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN')
}

type Props = {
  forum: Forum
  slug: string
}

export function NewsForumView({ forum, slug }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'newest' | 'hot' | 'top'>('newest')
  const [loading, setLoading] = useState(true)
  const [newsCategories, setNewsCategories] = useState<string[]>([])
  const [newsCategoryFilter, setNewsCategoryFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const filtersRef = useRef({ q: '', cat: '' })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ.trim()), 400)
    return () => clearTimeout(t)
  }, [searchQ])

  useEffect(() => {
    fetchNewsCategories().then(setNewsCategories)
  }, [])

  useEffect(() => {
    setLoading(true)
    let effPage = page
    const prev = filtersRef.current
    if (prev.q !== debouncedQ || prev.cat !== newsCategoryFilter) {
      effPage = 1
      filtersRef.current = { q: debouncedQ, cat: newsCategoryFilter }
      if (page !== 1) setPage(1)
    }
    const opts: Parameters<typeof fetchForumPosts>[1] = { page: effPage, limit: 20, sort }
    if (newsCategoryFilter) opts.category = newsCategoryFilter
    if (debouncedQ.length >= 2) opts.q = debouncedQ
    fetchForumPosts(slug, opts).then((r) => {
      setPosts(r.data)
      setTotal(r.total)
      setLoading(false)
    })
  }, [slug, page, sort, newsCategoryFilter, debouncedQ])

  const showSlider =
    page === 1 && !newsCategoryFilter && debouncedQ.length < 2 && posts.length > 0
  const sliderPosts = showSlider ? posts.slice(0, 10) : []
  const restPosts = showSlider ? posts.slice(10) : posts

  return (
    <>
      <div className="mb-6 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#0a1628]/95 via-[#061018] to-[#050a12] p-5 md:p-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ds-accent/80">Bản tin thiên văn</p>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 md:text-3xl">
          <span className="text-3xl" aria-hidden>
            {forum.icon || '🌌'}
          </span>
          {forum.title}
        </h1>
        <p className="text-ds-muted mt-2 max-w-2xl leading-relaxed">
          Tóm tắt từ nguồn uy tín — nhấn tin để đọc bài gốc. Tự cập nhật hàng ngày.
        </p>
        <p className="text-xs text-ds-subtle mt-3">{total} bài</p>

        <div className="mt-5 space-y-4 border-t border-ds-border pt-4">
          <CommunitySearchBar
            global={false}
            scope="news"
            onLocalSearch={(q) => {
              setSearchQ(q)
              setPage(1)
            }}
            placeholder="Tìm trong tiêu đề tin…"
          />
          <PostSortBar sort={sort} onSortChange={(s) => { setSort(s); setPage(1) }} variant="news" />
          <div>
            <p className="text-xs uppercase tracking-wide text-ds-subtle mb-2">Chủ đề RSS</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setNewsCategoryFilter(''); setPage(1) }}
                className={`rounded-full px-3 py-1 text-xs border ${
                  !newsCategoryFilter
                    ? 'border-ds-accent/50 bg-ds-accent/15 text-ds-text'
                    : 'border-ds-border bg-white/5 text-ds-muted'
                }`}
              >
                Tất cả
              </button>
              {newsCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setNewsCategoryFilter(c); setPage(1) }}
                  className={`rounded-full px-3 py-1 text-xs border ${
                    newsCategoryFilter === c
                      ? 'border-ds-accent/50 bg-ds-accent/15 text-ds-text'
                      : 'border-ds-border bg-white/5 text-ds-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-56 rounded-2xl border border-ds-border bg-white/5 animate-pulse" />
      ) : (
        <div className="space-y-8">
          {showSlider && sliderPosts.length > 0 && (
            <NewsHeroSlider posts={sliderPosts} title="Tin mới" subtitle="Lọc hoặc tìm phía trên để thu hẹp" />
          )}
          {restPosts.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {restPosts.map((p) => {
                const thumb = postThumbnailUrl(p.imageUrl, p.content)
                return (
                  <NewsCardLink
                    key={p._id}
                    post={p}
                    className="group flex flex-col overflow-hidden rounded-xl border border-ds-border bg-white/[0.03] hover:border-cyan-300/25"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-ds-surface">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl opacity-90">✦</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-sm font-medium text-white">{p.title}</h3>
                      <p className="mt-2 text-[11px] text-ds-subtle">
                        {p.sourceName || p.authorName} · {formatDate(p.publishedAt || p.createdAt)}
                      </p>
                    </div>
                  </NewsCardLink>
                )
              })}
            </div>
          )}
          {posts.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/20 p-8 text-center text-ds-muted">
              Chưa có tin phù hợp. Hệ thống tự crawl mỗi ngày — thử lại sau.
            </div>
          )}
        </div>
      )}

      {total > 20 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50"
          >
            Trang trước
          </button>
          <button
            type="button"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50"
          >
            Trang sau
          </button>
        </div>
      )}
    </>
  )
}
