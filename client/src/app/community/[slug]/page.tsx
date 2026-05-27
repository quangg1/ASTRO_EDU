'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, Grid2X2, List, Search, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import {
  fetchForum,
  fetchForumPosts,
  fetchNewsCategories,
  createPost,
  type Forum,
  type Post,
} from '@/lib/communityApi'
import { plainTextExcerpt, postThumbnailUrl, isHtmlFragmentEmpty } from '@/lib/postContent'
import { CornerBrackets } from '@/components/landing/CornerBrackets'

const RichTextEditor = dynamic(() => import('@/components/studio/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[180px] rounded-xl border border-white/15 bg-black/30 animate-pulse" aria-hidden />
  ),
})
import { NewsCardLink } from '@/components/community/NewsCardLink'
import { NewsHeroSlider } from '@/components/community/NewsHeroSlider'

function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN')
}

function ForumPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const { user, checked } = useAuthStore()
  const [forum, setForum] = useState<Forum | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'newest' | 'top' | 'hot'>('newest')
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newsCategories, setNewsCategories] = useState<string[]>([])
  const [newsCategoryFilter, setNewsCategoryFilter] = useState('')
  const [titleQ, setTitleQ] = useState('')
  const [debouncedTitleQ, setDebouncedTitleQ] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const newsFiltersRef = useRef({ q: '', cat: '' })
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!slug) return
    fetchForum(slug).then((f) => setForum(f))
    setNewsCategoryFilter('')
    setTitleQ('')
    setDebouncedTitleQ('')
    newsFiltersRef.current = { q: '', cat: '' }
  }, [slug])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitleQ(titleQ.trim()), 400)
    return () => clearTimeout(t)
  }, [titleQ])

  useEffect(() => {
    if (!forum || (forum.slug !== 'tin-thien-van' && !forum.isNews)) return
    fetchNewsCategories().then(setNewsCategories)
  }, [forum])

  useEffect(() => {
    const c = searchParams.get('category')
    if (typeof c === 'string' && c.trim()) setNewsCategoryFilter(c)
  }, [searchParams])

  useEffect(() => {
    if (!slug || !forum) return
    const isNews = forum.slug === 'tin-thien-van' || forum.isNews
    setLoading(true)
    let effPage = page
    if (isNews) {
      const prev = newsFiltersRef.current
      const qChanged = prev.q !== debouncedTitleQ
      const catChanged = prev.cat !== newsCategoryFilter
      if (qChanged || catChanged) {
        effPage = 1
        newsFiltersRef.current = { q: debouncedTitleQ, cat: newsCategoryFilter }
        if (page !== 1) setPage(1)
      }
    }
    const opts: Parameters<typeof fetchForumPosts>[1] = { page: effPage, limit: 20, sort }
    if (isNews) {
      if (newsCategoryFilter) opts.category = newsCategoryFilter
      if (debouncedTitleQ.length >= 2) opts.q = debouncedTitleQ
    }
    fetchForumPosts(slug, opts).then((r) => {
      setPosts(r.data)
      setTotal(r.total)
      setLoading(false)
    })
  }, [slug, page, sort, newsCategoryFilter, debouncedTitleQ, forum])

  useEffect(() => {
    if (checked && !user && forum && !forum.isNews) {
      router.replace('/login?redirect=/community/' + slug)
    }
  }, [checked, user, forum, slug, router])

  /* ⌘K / Ctrl+K → focus search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCreatePost = async () => {
    if (!forum || !user || !newTitle.trim()) return
    setSubmitting(true)
    const contentPayload = isHtmlFragmentEmpty(newContent) ? '' : newContent.trim()
    const res = await createPost(slug, { title: newTitle.trim().slice(0, 300), content: contentPayload })
    setSubmitting(false)
    if (res.success && res.data) {
      setShowNewPost(false)
      setNewTitle('')
      setNewContent('')
      setPosts((p) => [res.data!, ...p])
      setTotal((t) => t + 1)
    } else {
      alert(res.error || 'Error')
    }
  }

  if (!forum && !loading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">Forum not found</p>
      </div>
    )
  }

  const isNewsForum = forum?.slug === 'tin-thien-van' || forum?.isNews
  const showNewsSlider =
    isNewsForum &&
    page === 1 &&
    !newsCategoryFilter &&
    debouncedTitleQ.length < 2 &&
    posts.length > 0
  const sliderPosts = showNewsSlider ? posts.slice(0, 10) : []
  const restNewsPosts = showNewsSlider ? posts.slice(10) : posts
  const sortLabel = sort === 'newest' ? 'MỚI NHẤT' : sort === 'hot' ? 'ĐANG ĐƯỢC XEM' : 'NHIỀU TƯƠNG TÁC'

  /* ── News Forum (Tin thiên văn) ── HUD redesign ── */
  if (isNewsForum) {
    return (
      <div className="min-h-screen relative" style={{ background: 'var(--hud-bg)' }}>
        {/* Atmosphere */}
        <div className="hud-grid-overlay" aria-hidden />
        <div className="hud-scan" aria-hidden />
        <span className="hud-edge-label left hidden lg:block" aria-hidden>
          CosmoLearn · Community · news-feed · category
        </span>
        <span className="hud-edge-label right hidden lg:block" aria-hidden>
          Channel: TIN-THIÊN-VĂN · Filter: {newsCategoryFilter || 'ALL'} · Sort: {sortLabel}
        </span>

        <div className="relative z-10 pt-20 px-4 pb-28 max-w-6xl mx-auto">

          {/* Back link */}
          <Link
            href="/community"
            className="group inline-flex items-center gap-2 mb-6 hud-chamfer-sm px-4 py-2 transition-all hover:shadow-[0_0_16px_rgba(126,231,255,0.25)] hover:-translate-x-0.5"
            style={{
              background: 'rgba(126,231,255,0.05)',
              border: '1px solid rgba(126,231,255,0.2)',
              color: 'var(--hud-ink-2)',
            }}
          >
            <span
              className="transition-transform group-hover:-translate-x-1"
              style={{ color: 'var(--hud-plasma)' }}
              aria-hidden
            >
              ←
            </span>
            <span className="hud-mono hud-mono-md">QUAY LẠI CỘNG ĐỒNG</span>
          </Link>

          {/* Header panel */}
          <section className="relative mb-8">
            <div
              className="relative hud-chamfer-lg overflow-hidden p-6 md:p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(10,16,36,0.92) 0%, rgba(3,6,15,0.80) 100%)',
                border: '1px solid rgba(245,165,36,0.25)',
                boxShadow: '0 0 60px rgba(245,165,36,0.06), inset 0 0 40px rgba(245,165,36,0.03)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-3 hud-chamfer-md"
                style={{ border: '1px dashed rgba(245,165,36,0.1)' }}
                aria-hidden
              />
              <CornerBrackets />

              {/* Eyebrow amber */}
              <span
                className="hud-mono hud-mono-md hud-chamfer-sm inline-flex items-center gap-2 px-3 py-1.5 mb-5"
                style={{
                  background: 'rgba(245,165,36,0.1)',
                  border: '1px solid rgba(245,165,36,0.35)',
                  color: 'var(--hud-amber)',
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: 'var(--hud-amber)', boxShadow: '0 0 8px var(--hud-amber)' }}
                  aria-hidden
                />
                BẢN TIN THIÊN VĂN · CHANNEL 01
              </span>

              {/* Title row */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="flex items-center justify-center w-16 h-16 shrink-0 hud-chamfer-sm"
                  style={{
                    background: 'rgba(245,165,36,0.12)',
                    border: '1px solid rgba(245,165,36,0.35)',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--hud-amber)' }} aria-hidden>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h1
                  className="hud-em font-heading text-3xl md:text-4xl font-medium leading-tight tracking-tight text-white"
                  dangerouslySetInnerHTML={{ __html: `Tin <em>${forum?.title?.replace('Tin ', '') || 'thiên văn'}</em>` }}
                />
              </div>

              {/* Lede */}
              <p className="text-sm md:text-base leading-relaxed mb-5" style={{ color: 'var(--hud-ink-2)', maxWidth: '64ch' }}>
                Tóm tắt và ảnh từ nguồn uy tín — nhấn vào từng tin để đọc bài gốc trên website của họ. Cập nhật tự động qua RSS từ NASA, ESA, JPL.
              </p>

              {/* Readout mono strip */}
              <div
                className="hud-mono hud-mono-sm flex flex-wrap items-center gap-x-4 gap-y-1 mb-5"
                style={{ color: 'var(--hud-ink-2)' }}
              >
                <span>CHANNEL · <span style={{ color: 'var(--hud-amber)' }}>TIN-THIEN-VAN</span></span>
                <span style={{ color: 'var(--hud-line)' }}>——</span>
                <span>POSTS · <span style={{ color: 'var(--hud-plasma)' }}>{total}</span></span>
                <span style={{ color: 'var(--hud-line)' }}>——</span>
                {newsCategoryFilter && (
                  <>
                    <span>FILTER · <span style={{ color: 'var(--hud-plasma)' }}>{newsCategoryFilter.slice(0, 24)}{newsCategoryFilter.length > 24 ? '…' : ''}</span></span>
                    <span style={{ color: 'var(--hud-line)' }}>——</span>
                  </>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: '#6dffb0', boxShadow: '0 0 6px #6dffb0' }}
                    aria-hidden
                  />
                  <span style={{ color: '#6dffb0' }}>RSS · SYNC</span>
                </span>
              </div>

              {/* Ruler bar */}
              <div className="flex items-center gap-3" aria-hidden>
                <span style={{ color: 'rgba(126,231,255,0.4)', fontSize: 10 }}>◇</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(126,231,255,0.3) 0%, rgba(126,231,255,0.05) 100%)' }} />
                <span style={{ color: 'rgba(126,231,255,0.4)', fontSize: 10 }}>◇</span>
              </div>
            </div>
          </section>

          {/* Sort tabs */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="hud-mono hud-mono-sm shrink-0" style={{ color: 'var(--hud-ink-3)' }}>
              // SORT BY
            </span>
            {(
              [
                { value: 'newest' as const, label: 'Mới nhất' },
                { value: 'hot' as const, label: 'Đang được xem' },
                { value: 'top' as const, label: 'Nhiều tương tác' },
              ]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSort(option.value)
                  setPage(1)
                }}
                className="hud-mono hud-mono-md hud-chamfer-sm px-4 py-2 transition-all"
                style={
                  sort === option.value
                    ? {
                        background: 'var(--hud-plasma)',
                        color: '#03060f',
                        boxShadow: '0 0 16px rgba(126,231,255,0.4)',
                      }
                    : {
                        background: 'rgba(126,231,255,0.05)',
                        border: '1px solid rgba(126,231,255,0.2)',
                        color: 'var(--hud-ink-2)',
                      }
                }
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-2"
                  style={{
                    background: sort === option.value ? '#03060f' : 'rgba(126,231,255,0.4)',
                  }}
                  aria-hidden
                />
                {option.label}
              </button>
            ))}
          </div>

          {/* Filter section */}
          <div
            className="relative hud-chamfer-md mb-6 p-5"
            style={{
              background: 'rgba(6,9,26,0.7)',
              border: '1px solid rgba(126,231,255,0.15)',
            }}
          >
            {/* Filter header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-px" style={{ background: 'var(--hud-plasma)' }} aria-hidden />
              <span className="hud-mono hud-mono-md" style={{ color: 'var(--hud-ink-2)' }}>
                LỌC THEO METADATA <span style={{ color: 'var(--hud-plasma)' }}>(RSS)</span>
              </span>
              {newsCategoryFilter && (
                <span
                  className="hud-mono hud-mono-sm hud-chamfer-sm px-2 py-0.5 ml-auto"
                  style={{
                    background: 'rgba(126,231,255,0.1)',
                    border: '1px solid rgba(126,231,255,0.3)',
                    color: 'var(--hud-plasma)',
                  }}
                >
                  1 SELECTED
                </span>
              )}
            </div>

            {/* Chips grid */}
            <div className="flex flex-wrap gap-2">
              {/* Tất cả — amber accent */}
              <button
                type="button"
                onClick={() => {
                  setNewsCategoryFilter('')
                  setPage(1)
                }}
                className="hud-chamfer-sm hud-mono hud-mono-sm px-3 py-1.5 transition-all"
                style={
                  !newsCategoryFilter
                    ? {
                        background: 'rgba(245,165,36,0.18)',
                        border: '1px solid rgba(245,165,36,0.5)',
                        color: 'var(--hud-amber)',
                        boxShadow: '0 0 8px rgba(245,165,36,0.2)',
                      }
                    : {
                        background: 'rgba(245,165,36,0.06)',
                        border: '1px solid rgba(245,165,36,0.2)',
                        color: 'var(--hud-amber)',
                      }
                }
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ background: 'var(--hud-amber)' }}
                  aria-hidden
                />
                Tất cả
              </button>

              {newsCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setNewsCategoryFilter(c)
                    setPage(1)
                  }}
                  className="hud-chamfer-sm hud-mono hud-mono-sm px-3 py-1.5 transition-all"
                  style={
                    newsCategoryFilter === c
                      ? {
                          background: 'rgba(126,231,255,0.12)',
                          border: '1px solid rgba(126,231,255,0.5)',
                          color: 'var(--hud-plasma)',
                          boxShadow: '0 0 10px rgba(126,231,255,0.2)',
                          textShadow: '0 0 8px rgba(126,231,255,0.5)',
                        }
                      : {
                          background: 'rgba(126,231,255,0.03)',
                          border: '1px solid rgba(126,231,255,0.12)',
                          color: 'var(--hud-ink-2)',
                        }
                  }
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                    style={{
                      background: newsCategoryFilter === c ? 'var(--hud-plasma)' : 'rgba(126,231,255,0.3)',
                      boxShadow: newsCategoryFilter === c ? '0 0 6px var(--hud-plasma)' : 'none',
                    }}
                    aria-hidden
                  />
                  {c}
                </button>
              ))}
            </div>

            {/* Search field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5 pt-4" style={{ borderTop: '1px solid rgba(126,231,255,0.08)' }}>
              <span className="hud-mono hud-mono-sm shrink-0" style={{ color: 'var(--hud-ink-3)' }}>
                // TITLE SEARCH
              </span>
              <div className="relative flex-1 max-w-xl">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--hud-ink-3)' }}
                  aria-hidden
                />
                <input
                  id="news-title-q"
                  ref={searchInputRef}
                  type="search"
                  value={titleQ}
                  onChange={(e) => setTitleQ(e.target.value)}
                  placeholder="Tối thiểu 2 ký tự — nhập tiêu đề bài viết"
                  className="w-full hud-chamfer-sm pl-9 pr-16 py-2.5 text-sm text-white placeholder-[var(--hud-ink-3)] bg-transparent transition-all focus-visible:outline-none"
                  style={{
                    border: '1px solid rgba(126,231,255,0.2)',
                    background: 'rgba(3,6,15,0.6)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(126,231,255,0.6)'
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(126,231,255,0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(126,231,255,0.2)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 hud-mono hud-mono-sm pointer-events-none"
                  style={{ color: 'var(--hud-ink-3)' }}
                  aria-hidden
                >
                  ⌘ K
                </span>
              </div>
            </div>
          </div>

          {/* Results bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="hud-chamfer-sm hud-mono hud-mono-md inline-flex items-center gap-2 px-3 py-1.5"
                style={{
                  background: 'var(--hud-plasma)',
                  color: '#03060f',
                  boxShadow: '0 0 12px rgba(126,231,255,0.3)',
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#03060f' }}
                  aria-hidden
                />
                // 01 · KẾT QUẢ
              </div>
              <span className="hud-mono hud-mono-sm" style={{ color: 'var(--hud-ink-2)' }}>
                HIỂN THỊ{' '}
                <span style={{ color: 'var(--hud-plasma)' }}>{posts.length}</span>{' '}
                BÀI
                {newsCategoryFilter && (
                  <>
                    {' · '}LỌC{' '}
                    <span
                      className="hud-chamfer-sm px-1.5 py-0.5"
                      style={{
                        background: 'rgba(126,231,255,0.1)',
                        border: '1px solid rgba(126,231,255,0.3)',
                        color: 'var(--hud-plasma)',
                      }}
                    >
                      [{newsCategoryFilter.slice(0, 20)}{newsCategoryFilter.length > 20 ? '…' : ''}]
                    </span>
                  </>
                )}
                {' · '}SẮP XẾP{' '}
                <span
                  className="hud-chamfer-sm px-1.5 py-0.5"
                  style={{
                    background: 'rgba(126,231,255,0.1)',
                    border: '1px solid rgba(126,231,255,0.3)',
                    color: 'var(--hud-plasma)',
                  }}
                >
                  [{sortLabel}]
                </span>
              </span>
            </div>

            {/* View toggle */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="hud-chamfer-sm p-2 transition-all"
                style={
                  viewMode === 'grid'
                    ? { background: 'rgba(126,231,255,0.15)', border: '1px solid rgba(126,231,255,0.4)', color: 'var(--hud-plasma)' }
                    : { background: 'rgba(126,231,255,0.03)', border: '1px solid rgba(126,231,255,0.1)', color: 'var(--hud-ink-3)' }
                }
                aria-label="Grid view"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="hud-chamfer-sm p-2 transition-all"
                style={
                  viewMode === 'list'
                    ? { background: 'rgba(126,231,255,0.15)', border: '1px solid rgba(126,231,255,0.4)', color: 'var(--hud-plasma)' }
                    : { background: 'rgba(126,231,255,0.03)', border: '1px solid rgba(126,231,255,0.1)', color: 'var(--hud-ink-3)' }
                }
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ruler */}
          <div className="flex items-center gap-2 mb-6" aria-hidden>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(126,231,255,0.3) 0%, rgba(126,231,255,0.04) 100%)' }} />
          </div>

          {/* Content */}
          {loading ? (
            <div
              className={viewMode === 'grid'
                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="hud-chamfer-sm overflow-hidden animate-pulse"
                  style={{ background: 'rgba(126,231,255,0.04)', border: '1px solid rgba(126,231,255,0.08)' }}
                >
                  <div className="aspect-[16/10] bg-white/5" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-full rounded bg-white/10" />
                    <div className="h-3 w-2/3 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Slider (only first page, no filter) */}
              {showNewsSlider && sliderPosts.length > 0 && (
                <NewsHeroSlider
                  posts={sliderPosts}
                  title="Tin mới trong chuyên mục"
                  subtitle="Mười bài gần nhất — dùng lọc / tìm kiếm phía trên để thu hẹp"
                />
              )}

              {/* Grid / list of cards */}
              {(() => {
                const displayPosts = showNewsSlider ? restNewsPosts : posts
                if (displayPosts.length === 0) return null

                if (viewMode === 'list') {
                  return (
                    <div className="space-y-3">
                      {displayPosts.map((p) => {
                        const thumb = postThumbnailUrl(p.imageUrl, p.content)
                        return (
                          <NewsCardLink
                            key={p._id}
                            post={p}
                            className="group relative flex items-start gap-4 hud-chamfer-sm overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(126,231,255,0.12)] hover:-translate-y-0.5"
                            style={{
                              background: 'rgba(6,9,26,0.8)',
                              border: '1px solid rgba(126,231,255,0.12)',
                            }}
                          >
                            <CornerBrackets />
                            {thumb && (
                              <div className="relative w-32 h-20 shrink-0 overflow-hidden">
                                <img
                                  src={thumb}
                                  alt={p.title}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 py-3 pr-4">
                              <h3 className="text-sm font-medium leading-snug text-white group-hover:text-cyan-100 line-clamp-2 mb-1">
                                {p.title}
                              </h3>
                              {plainTextExcerpt(p.content, 80) && (
                                <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--hud-ink-3)' }}>
                                  {plainTextExcerpt(p.content, 80)}
                                </p>
                              )}
                              <div className="hud-mono hud-mono-sm flex items-center gap-3" style={{ color: 'var(--hud-ink-3)' }}>
                                <span style={{ color: 'var(--hud-amber)' }}>{p.sourceName || p.authorName}</span>
                                <span>{formatDate(p.publishedAt || p.createdAt)}</span>
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="w-3 h-3" style={{ color: 'var(--hud-plasma)' }} />
                                  {p.viewCount ?? 0}
                                </span>
                              </div>
                            </div>
                          </NewsCardLink>
                        )
                      })}
                    </div>
                  )
                }

                return (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayPosts.map((p) => {
                      const thumb = postThumbnailUrl(p.imageUrl, p.content)
                      return (
                        <NewsCardLink
                          key={p._id}
                          post={p}
                          className="group relative flex flex-col hud-chamfer-sm overflow-hidden transition-all hover:shadow-[0_0_24px_rgba(126,231,255,0.15)] hover:-translate-y-1"
                          style={{
                            background: 'rgba(6,9,26,0.8)',
                            border: '1px solid rgba(126,231,255,0.12)',
                          }}
                        >
                          <CornerBrackets />
                          {/* Thumb */}
                          <div className="relative overflow-hidden bg-[#0c1829]" style={{ aspectRatio: '16/11' }}>
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={p.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-3xl opacity-50">✦</div>
                            )}
                            {/* Scan-line overlay */}
                            <div
                              className="pointer-events-none absolute inset-0"
                              style={{
                                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                              }}
                              aria-hidden
                            />
                            {/* Source badge top-right */}
                            {(p.sourceName || p.authorName) && (
                              <span
                                className="absolute top-2 right-2 hud-mono hud-mono-sm hud-chamfer-sm px-2 py-0.5 inline-flex items-center gap-1"
                                style={{
                                  background: 'rgba(245,165,36,0.85)',
                                  color: '#1a0e00',
                                }}
                              >
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1a0e00]/60" aria-hidden />
                                {(p.sourceName || p.authorName || '').toUpperCase()}
                              </span>
                            )}
                            {/* NEW flag bottom-left */}
                            <span
                              className="absolute bottom-2 left-2 hud-mono hud-mono-sm hud-chamfer-sm px-2 py-0.5"
                              style={{
                                background: 'var(--hud-plasma)',
                                color: '#03060f',
                              }}
                            >
                              ● MỚI
                            </span>
                          </div>

                          {/* Body */}
                          <div className="flex flex-1 flex-col p-4">
                            <h3 className="line-clamp-3 text-sm font-medium leading-snug text-white group-hover:text-cyan-100 mb-2">
                              {p.title}
                            </h3>
                            {plainTextExcerpt(p.content, 80) && (
                              <p className="line-clamp-2 text-xs mb-3" style={{ color: 'var(--hud-ink-3)' }}>
                                {plainTextExcerpt(p.content, 80)}
                              </p>
                            )}
                            <div
                              className="hud-mono hud-mono-sm mt-auto flex items-center gap-3"
                              style={{ color: 'var(--hud-ink-3)' }}
                            >
                              <span style={{ color: 'var(--hud-amber)' }}>{p.sourceName || p.authorName}</span>
                              <span>·</span>
                              <span>{formatDate(p.publishedAt || p.createdAt)}</span>
                              <span className="ml-auto inline-flex items-center gap-1">
                                <Eye className="w-3 h-3" style={{ color: 'var(--hud-plasma)' }} />
                                <span style={{ color: 'var(--hud-plasma)' }}>{p.viewCount ?? 0}</span>
                              </span>
                            </div>
                          </div>
                        </NewsCardLink>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Empty state */}
              {posts.length === 0 && (
                <div
                  className="relative hud-chamfer-md p-8 flex flex-col items-center gap-4 text-center"
                  style={{
                    border: '1px dashed rgba(126,231,255,0.2)',
                    background: 'rgba(6,9,26,0.4)',
                  }}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: 'rgba(126,231,255,0.08)', border: '1px solid rgba(126,231,255,0.2)', color: 'var(--hud-plasma)' }}
                    aria-hidden
                  >
                    ℹ
                  </span>
                  <p className="text-sm" style={{ color: 'var(--hud-ink-2)' }}>
                    Bộ lọc{' '}
                    {newsCategoryFilter && (
                      <span style={{ color: 'var(--hud-plasma)' }}>[{newsCategoryFilter}]</span>
                    )}{' '}
                    hiện chỉ có <strong className="text-white">{total} bài</strong>. Thử{' '}
                    <strong className="text-white">Tất cả</strong> hoặc chọn metadata khác để xem thêm.
                  </p>
                  {newsCategoryFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewsCategoryFilter('')
                        setPage(1)
                      }}
                      className="hud-chamfer-sm hud-mono hud-mono-md px-5 py-2.5 transition-all hover:shadow-[0_0_16px_rgba(245,165,36,0.3)]"
                      style={{
                        background: 'rgba(245,165,36,0.12)',
                        border: '1px solid rgba(245,165,36,0.4)',
                        color: 'var(--hud-amber)',
                      }}
                    >
                      XOÁ LỌC
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="hud-chamfer-sm hud-mono hud-mono-md px-5 py-2.5 transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(126,231,255,0.06)',
                  border: '1px solid rgba(126,231,255,0.2)',
                  color: 'var(--hud-plasma)',
                }}
              >
                ← TRANG TRƯỚC
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="hud-chamfer-sm hud-mono hud-mono-md px-5 py-2.5 transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(126,231,255,0.06)',
                  border: '1px solid rgba(126,231,255,0.2)',
                  color: 'var(--hud-plasma)',
                }}
              >
                TRANG SAU →
              </button>
            </div>
          )}
        </div>

        {/* FAB */}
        <button
          type="button"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full transition-all hover:scale-110"
          style={{
            background: 'radial-gradient(circle at 40% 40%, #7ee7ff 0%, #4dd2ff 100%)',
            boxShadow: '0 0 0 2px rgba(126,231,255,0.3), 0 0 32px rgba(126,231,255,0.55)',
            color: '#03060f',
          }}
          aria-label="Tạo bài mới"
        >
          <Sparkles className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>
    )
  }

  /* ── Non-news forum ── unchanged layout ── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      <div className="pt-20 px-4 pb-12 mx-auto max-w-4xl">
        <Link
          href="/community"
          className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded-md px-1"
        >
          <span aria-hidden>←</span> Quay lại cộng đồng
        </Link>

        {forum && (
          <>
            <div className="mb-6 rounded-2xl border border-white/10 bg-[#08111f]/70 p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2 md:text-3xl">
                    <span className="text-3xl md:text-4xl" aria-hidden>{forum.icon || '💬'}</span>
                    {forum.title}
                  </h1>
                  <p className="text-gray-400 mt-2 max-w-2xl leading-relaxed">{forum.description}</p>
                  <p className="text-xs text-gray-500 mt-3">{total} bài</p>
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={() => setShowNewPost(!showNewPost)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                  >
                    {showNewPost ? 'Đóng' : 'Tạo bài viết'}
                  </button>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                <span className="text-xs uppercase tracking-wide text-gray-500">Sắp xếp:</span>
                {(
                  [
                    { value: 'newest' as const, label: 'Mới nhất' },
                    { value: 'hot' as const, label: 'Nổi bật' },
                    { value: 'top' as const, label: 'Top vote' },
                  ]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSort(option.value)
                      setPage(1)
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      sort === option.value
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-300/40'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {showNewPost && (
              <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-[#060e1c]/90 p-5">
                <h2 className="text-white font-semibold mb-3">Tạo bài viết mới</h2>
                <div className="mb-3">
                  <div className="flex items-end justify-between gap-2 mb-1.5">
                    <label className="text-xs text-slate-400">Tiêu đề</label>
                    <span className="text-[11px] text-slate-500 tabular-nums">{newTitle.length}/300</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Tiêu đề bài viết"
                    value={newTitle}
                    maxLength={300}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  />
                </div>
                <p className="text-xs text-slate-500 mb-2">Nội dung — soạn có định dạng</p>
                <RichTextEditor
                  value={newContent}
                  onChange={setNewContent}
                  placeholder="Nội dung bài viết (tùy chọn)"
                />
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewPost(false)}
                    className="px-4 py-2 rounded-lg border border-white/20 text-gray-200 hover:bg-white/10"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePost}
                    disabled={submitting || !newTitle.trim()}
                    className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Đang đăng...' : 'Đăng bài'}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <Link
                    key={p._id}
                    href={`/community/post/${p._id}`}
                    className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-cyan-300/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium text-white leading-snug">{p.title}</h3>
                      {p.isPinned && (
                        <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300 border border-amber-300/30">
                          Ghim
                        </span>
                      )}
                    </div>
                    {p.content && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.content}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                      <span>{p.authorName}</span>
                      <span>{p.commentCount} bình luận</span>
                      <span>{p.voteCount} vote</span>
                      {p.sourceName && <span>{p.sourceName}</span>}
                      <span>{formatDate(p.createdAt)}</span>
                    </div>
                  </Link>
                ))}
                {!posts.length && (
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-8 text-center text-gray-400">
                    Chưa có bài viết nào trong chuyên mục này.
                  </div>
                )}
              </div>
            )}

            {total > 20 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
          <p className="text-gray-500">Đang tải chuyên mục…</p>
        </div>
      }
    >
      <ForumPageContent />
    </Suspense>
  )
}
