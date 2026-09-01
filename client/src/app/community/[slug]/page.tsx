'use client'

import { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, Grid2X2, List, Search } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchForum,
  fetchForumPosts,
  fetchNewsCategories,
  createPost,
  syncCommunityGemReward,
  type Forum,
  type Post,
  plainTextExcerpt,
  postThumbnailUrl,
  isHtmlFragmentEmpty,
} from '@/features/community/public'
import { CornerBrackets } from '@/components/landing/CornerBrackets'
import { OnboardingWelcomeBanner } from '@/features/onboarding/public'
import { parseOnboardingLanding } from '@/lib/onboardingLanding'

const RichTextEditor = dynamic(() => import('@/components/studio/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[180px] rounded-xl border border-ds-border bg-ds-surface/70 animate-pulse" aria-hidden />
  ),
})
import {
  NewsCardLink,
  NewsHeroSlider,
  DiscussionPostList,
  PostSortBar,
} from '@/features/community/public'

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
  const landing = parseOnboardingLanding(searchParams)

  useEffect(() => {
    if (landing.sortOverride) setSort(landing.sortOverride)
  }, [landing.sortOverride])

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

  const displayPosts = useMemo(() => {
    if (!landing.fromOnboarding || !landing.topics.length) return posts
    const needles = landing.topics.map((t) => t.toLowerCase())
    const filtered = posts.filter((p) => {
      const tags = (p.tags ?? []).map((t) => t.toLowerCase())
      if (tags.some((t) => needles.some((n) => t.includes(n) || n.includes(t)))) return true
      const title = p.title.toLowerCase()
      return needles.some((n) => title.includes(n.replace(/-/g, ' ')))
    })
    return filtered.length ? filtered : posts
  }, [posts, landing.fromOnboarding, landing.topics])

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
      void syncCommunityGemReward(res.gemReward)
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
      <div className="relative z-10 flex min-h-[40vh] items-center justify-center px-4 pt-6">
        <p className="text-ds-subtle">Không tìm thấy chuyên mục.</p>
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
      <div className="relative z-10 pt-2 px-4 pb-28 max-w-6xl mx-auto">

          {/* Back link */}
          <Link
            href="/community"
            className="group inline-flex items-center gap-2 mb-6 cosmo-dark-panel rounded-xl px-4 py-2 transition-all hover:shadow-[0_0_16px_var(--color-accent-soft)] hover:-translate-x-0.5"
            style={{
              background: 'var(--color-accent-soft)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span
              className="transition-transform group-hover:-translate-x-1"
              style={{ color: 'var(--color-accent)' }}
              aria-hidden
            >
              ←
            </span>
            <span className="hud-mono hud-mono-md">QUAY LẠI CỘNG ĐỒNG</span>
          </Link>

          {/* Header panel */}
          <section className="relative mb-8">
            <div
              className="relative cosmo-dark-panel rounded-2xl overflow-hidden p-6 md:p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(10,16,36,0.92) 0%, rgba(3,6,15,0.80) 100%)',
                border: '1px solid rgba(245,165,36,0.25)',
                boxShadow: '0 0 60px rgba(245,165,36,0.06), inset 0 0 40px rgba(245,165,36,0.03)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-3 cosmo-dark-panel rounded-2xl"
                style={{ border: '1px dashed rgba(245,165,36,0.1)' }}
                aria-hidden
              />
              <CornerBrackets />

              {/* Eyebrow amber */}
              <span
                className="hud-mono hud-mono-md cosmo-dark-panel rounded-xl inline-flex items-center gap-2 px-3 py-1.5 mb-5"
                style={{
                  background: 'rgba(245,165,36,0.1)',
                  border: '1px solid rgba(245,165,36,0.35)',
                  color: 'var(--color-brand-amber)',
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: 'var(--color-brand-amber)', boxShadow: '0 0 8px var(--color-brand-amber)' }}
                  aria-hidden
                />
                BẢN TIN THIÊN VĂN · CHANNEL 01
              </span>

              {/* Title row */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="flex items-center justify-center w-16 h-16 shrink-0 cosmo-dark-panel rounded-xl"
                  style={{
                    background: 'rgba(245,165,36,0.12)',
                    border: '1px solid rgba(245,165,36,0.35)',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-brand-amber)' }} aria-hidden>
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
              <p className="text-sm md:text-base leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)', maxWidth: '64ch' }}>
                Tóm tắt và ảnh từ nguồn uy tín — nhấn vào từng tin để đọc bài gốc trên website của họ. Cập nhật tự động qua RSS từ NASA, ESA, JPL.
              </p>

              {/* Readout mono strip */}
              <div
                className="hud-mono hud-mono-sm flex flex-wrap items-center gap-x-4 gap-y-1 mb-5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span>CHANNEL · <span style={{ color: 'var(--color-brand-amber)' }}>TIN-THIEN-VAN</span></span>
                <span style={{ color: 'var(--color-border)' }}>——</span>
                <span>POSTS · <span style={{ color: 'var(--color-accent)' }}>{total}</span></span>
                <span style={{ color: 'var(--color-border)' }}>——</span>
                {newsCategoryFilter && (
                  <>
                    <span>FILTER · <span style={{ color: 'var(--color-accent)' }}>{newsCategoryFilter.slice(0, 24)}{newsCategoryFilter.length > 24 ? '…' : ''}</span></span>
                    <span style={{ color: 'var(--color-border)' }}>——</span>
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
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(126,231,255,0.3) 0%, var(--color-accent-soft) 100%)' }} />
                <span style={{ color: 'rgba(126,231,255,0.4)', fontSize: 10 }}>◇</span>
              </div>
            </div>
          </section>

          {/* Sort tabs */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="hud-mono hud-mono-sm shrink-0" style={{ color: 'var(--color-text-subtle)' }}>
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
                className="hud-mono hud-mono-md cosmo-dark-panel rounded-xl px-4 py-2 transition-all"
                style={
                  sort === option.value
                    ? {
                        background: 'var(--color-accent)',
                        color: 'var(--color-bg-base)',
                        boxShadow: '0 0 16px rgba(126,231,255,0.4)',
                      }
                    : {
                        background: 'var(--color-accent-soft)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }
                }
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-2"
                  style={{
                    background: sort === option.value ? 'var(--color-bg-base)' : 'rgba(126,231,255,0.4)',
                  }}
                  aria-hidden
                />
                {option.label}
              </button>
            ))}
          </div>

          {/* Filter section */}
          <div
            className="relative cosmo-dark-panel rounded-2xl mb-6 p-5"
            style={{
              background: 'var(--color-panel-muted)',
              border: '1px solid var(--color-accent-soft)',
            }}
          >
            {/* Filter header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-px" style={{ background: 'var(--color-accent)' }} aria-hidden />
              <span className="hud-mono hud-mono-md" style={{ color: 'var(--color-text-muted)' }}>
                LỌC THEO METADATA <span style={{ color: 'var(--color-accent)' }}>(RSS)</span>
              </span>
              {newsCategoryFilter && (
                <span
                  className="hud-mono hud-mono-sm cosmo-dark-panel rounded-xl px-2 py-0.5 ml-auto"
                  style={{
                    background: 'rgba(126,231,255,0.1)',
                    border: '1px solid rgba(126,231,255,0.3)',
                    color: 'var(--color-accent)',
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
                className="cosmo-dark-panel rounded-xl hud-mono hud-mono-sm px-3 py-1.5 transition-all"
                style={
                  !newsCategoryFilter
                    ? {
                        background: 'rgba(245,165,36,0.18)',
                        border: '1px solid rgba(245,165,36,0.5)',
                        color: 'var(--color-brand-amber)',
                        boxShadow: '0 0 8px rgba(245,165,36,0.2)',
                      }
                    : {
                        background: 'rgba(245,165,36,0.06)',
                        border: '1px solid rgba(245,165,36,0.2)',
                        color: 'var(--color-brand-amber)',
                      }
                }
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ background: 'var(--color-brand-amber)' }}
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
                  className="cosmo-dark-panel rounded-xl hud-mono hud-mono-sm px-3 py-1.5 transition-all"
                  style={
                    newsCategoryFilter === c
                      ? {
                          background: 'rgba(126,231,255,0.12)',
                          border: '1px solid var(--color-accent-strong)',
                          color: 'var(--color-accent)',
                          boxShadow: '0 0 10px rgba(126,231,255,0.2)',
                          textShadow: '0 0 8px var(--color-accent-strong)',
                        }
                      : {
                          background: 'rgba(126,231,255,0.03)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-muted)',
                        }
                  }
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                    style={{
                      background: newsCategoryFilter === c ? 'var(--color-accent)' : 'rgba(126,231,255,0.3)',
                      boxShadow: newsCategoryFilter === c ? '0 0 6px var(--color-accent)' : 'none',
                    }}
                    aria-hidden
                  />
                  {c}
                </button>
              ))}
            </div>

            {/* Search field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5 pt-4" style={{ borderTop: '1px solid rgba(126,231,255,0.08)' }}>
              <span className="hud-mono hud-mono-sm shrink-0" style={{ color: 'var(--color-text-subtle)' }}>
                // TITLE SEARCH
              </span>
              <div className="relative flex-1 max-w-xl">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--color-text-subtle)' }}
                  aria-hidden
                />
                <input
                  id="news-title-q"
                  ref={searchInputRef}
                  type="search"
                  value={titleQ}
                  onChange={(e) => setTitleQ(e.target.value)}
                  placeholder="Tối thiểu 2 ký tự — nhập tiêu đề bài viết"
                  className="w-full cosmo-dark-panel rounded-xl pl-9 pr-16 py-2.5 text-sm text-white placeholder-[var(--color-text-subtle)] bg-transparent transition-all focus-visible:outline-none"
                  style={{
                    border: '1px solid var(--color-border)',
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
                  style={{ color: 'var(--color-text-subtle)' }}
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
                className="cosmo-dark-panel rounded-xl hud-mono hud-mono-md inline-flex items-center gap-2 px-3 py-1.5"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg-base)',
                  boxShadow: '0 0 12px rgba(126,231,255,0.3)',
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ background: 'var(--color-bg-base)' }}
                  aria-hidden
                />
                // 01 · KẾT QUẢ
              </div>
              <span className="hud-mono hud-mono-sm" style={{ color: 'var(--color-text-muted)' }}>
                HIỂN THỊ{' '}
                <span style={{ color: 'var(--color-accent)' }}>{posts.length}</span>{' '}
                BÀI
                {newsCategoryFilter && (
                  <>
                    {' · '}LỌC{' '}
                    <span
                      className="cosmo-dark-panel rounded-xl px-1.5 py-0.5"
                      style={{
                        background: 'rgba(126,231,255,0.1)',
                        border: '1px solid rgba(126,231,255,0.3)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      [{newsCategoryFilter.slice(0, 20)}{newsCategoryFilter.length > 20 ? '…' : ''}]
                    </span>
                  </>
                )}
                {' · '}SẮP XẾP{' '}
                <span
                  className="cosmo-dark-panel rounded-xl px-1.5 py-0.5"
                  style={{
                    background: 'rgba(126,231,255,0.1)',
                    border: '1px solid rgba(126,231,255,0.3)',
                    color: 'var(--color-accent)',
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
                className="cosmo-dark-panel rounded-xl p-2 transition-all"
                style={
                  viewMode === 'grid'
                    ? { background: 'var(--color-accent-soft)', border: '1px solid rgba(126,231,255,0.4)', color: 'var(--color-accent)' }
                    : { background: 'rgba(126,231,255,0.03)', border: '1px solid rgba(126,231,255,0.1)', color: 'var(--color-text-subtle)' }
                }
                aria-label="Grid view"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="cosmo-dark-panel rounded-xl p-2 transition-all"
                style={
                  viewMode === 'list'
                    ? { background: 'var(--color-accent-soft)', border: '1px solid rgba(126,231,255,0.4)', color: 'var(--color-accent)' }
                    : { background: 'rgba(126,231,255,0.03)', border: '1px solid rgba(126,231,255,0.1)', color: 'var(--color-text-subtle)' }
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
                  className="cosmo-dark-panel rounded-xl overflow-hidden animate-pulse"
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
                            className="group relative flex items-start gap-4 cosmo-dark-panel rounded-xl overflow-hidden transition-all hover:shadow-[0_0_20px_var(--color-accent-soft)] hover:-translate-y-0.5"
                            style={{
                              background: 'var(--color-panel-glass)',
                              border: '1px solid var(--color-border)',
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
                              <h3 className="text-sm font-medium leading-snug text-white group-hover:text-ds-text line-clamp-2 mb-1">
                                {p.title}
                              </h3>
                              {plainTextExcerpt(p.content, 80) && (
                                <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--color-text-subtle)' }}>
                                  {plainTextExcerpt(p.content, 80)}
                                </p>
                              )}
                              <div className="hud-mono hud-mono-sm flex items-center gap-3" style={{ color: 'var(--color-text-subtle)' }}>
                                <span style={{ color: 'var(--color-brand-amber)' }}>{p.sourceName || p.authorName}</span>
                                <span>{formatDate(p.publishedAt || p.createdAt)}</span>
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
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
                          className="group relative flex flex-col cosmo-dark-panel rounded-xl overflow-hidden transition-all hover:shadow-[0_0_24px_var(--color-accent-soft)] hover:-translate-y-1"
                          style={{
                            background: 'var(--color-panel-glass)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <CornerBrackets />
                          {/* Thumb */}
                          <div className="relative overflow-hidden bg-ds-surface" style={{ aspectRatio: '16/11' }}>
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
                                className="absolute top-2 right-2 hud-mono hud-mono-sm cosmo-dark-panel rounded-xl px-2 py-0.5 inline-flex items-center gap-1"
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
                              className="absolute bottom-2 left-2 hud-mono hud-mono-sm cosmo-dark-panel rounded-xl px-2 py-0.5"
                              style={{
                                background: 'var(--color-accent)',
                                color: 'var(--color-bg-base)',
                              }}
                            >
                              ● MỚI
                            </span>
                          </div>

                          {/* Body */}
                          <div className="flex flex-1 flex-col p-4">
                            <h3 className="line-clamp-3 text-sm font-medium leading-snug text-white group-hover:text-ds-text mb-2">
                              {p.title}
                            </h3>
                            {plainTextExcerpt(p.content, 80) && (
                              <p className="line-clamp-2 text-xs mb-3" style={{ color: 'var(--color-text-subtle)' }}>
                                {plainTextExcerpt(p.content, 80)}
                              </p>
                            )}
                            <div
                              className="hud-mono hud-mono-sm mt-auto flex items-center gap-3"
                              style={{ color: 'var(--color-text-subtle)' }}
                            >
                              <span style={{ color: 'var(--color-brand-amber)' }}>{p.sourceName || p.authorName}</span>
                              <span>·</span>
                              <span>{formatDate(p.publishedAt || p.createdAt)}</span>
                              <span className="ml-auto inline-flex items-center gap-1">
                                <Eye className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
                                <span style={{ color: 'var(--color-accent)' }}>{p.viewCount ?? 0}</span>
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
                  className="relative cosmo-dark-panel rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
                  style={{
                    border: '1px dashed rgba(126,231,255,0.2)',
                    background: 'var(--color-panel-muted)',
                  }}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: 'rgba(126,231,255,0.08)', border: '1px solid var(--color-border)', color: 'var(--color-accent)' }}
                    aria-hidden
                  >
                    ℹ
                  </span>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Bộ lọc{' '}
                    {newsCategoryFilter && (
                      <span style={{ color: 'var(--color-accent)' }}>[{newsCategoryFilter}]</span>
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
                      className="cosmo-dark-panel rounded-xl hud-mono hud-mono-md px-5 py-2.5 transition-all hover:shadow-[0_0_16px_rgba(245,165,36,0.3)]"
                      style={{
                        background: 'rgba(245,165,36,0.12)',
                        border: '1px solid rgba(245,165,36,0.4)',
                        color: 'var(--color-brand-amber)',
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
                className="cosmo-dark-panel rounded-xl hud-mono hud-mono-md px-5 py-2.5 transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(126,231,255,0.06)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-accent)',
                }}
              >
                ← TRANG TRƯỚC
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="cosmo-dark-panel rounded-xl hud-mono hud-mono-md px-5 py-2.5 transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(126,231,255,0.06)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-accent)',
                }}
              >
                TRANG SAU →
              </button>
            </div>
          )}
      </div>
    )
  }

  /* ── Non-news forum ── unchanged layout ── */
  return (
    <div className="relative z-10 pt-2 px-4 pb-12 mx-auto max-w-4xl">
        <Link
          href="/community"
          className="text-sm text-ds-accent hover:text-ds-text mb-4 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent/50 rounded-md px-1"
        >
          <span aria-hidden>←</span> Quay lại cộng đồng
        </Link>

        {forum && (
          <>
            <div className="cosmo-dark-panel mb-6 rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2 md:text-3xl">
                    <span className="text-3xl md:text-4xl" aria-hidden>{forum.icon || '💬'}</span>
                    {forum.title}
                  </h1>
                  <p className="text-ds-muted mt-2 max-w-2xl leading-relaxed">{forum.description}</p>
                  <p className="text-xs text-ds-subtle mt-3">{total} bài</p>
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={() => setShowNewPost(!showNewPost)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                  >
                    {showNewPost ? 'Đóng' : 'Tạo bài viết'}
                  </button>
                )}
              </div>

              <div className="mt-5 border-t border-ds-border pt-4">
                <PostSortBar
                  sort={sort}
                  onSortChange={(s) => {
                    setSort(s)
                    setPage(1)
                  }}
                />
              </div>
            </div>

            {landing.fromOnboarding ? (
              <OnboardingWelcomeBanner
                dismissKey={`onboarding-forum-${slug}`}
                title="Diễn đàn được ghép theo chủ đề onboarding"
                description={
                  landing.pinNewbie
                    ? 'Bắt đầu với Q&A cho người mới — đừng ngại hỏi bất cứ điều gì!'
                    : landing.sortOverride === 'hot'
                      ? 'Đang ưu tiên thảo luận sôi nổi và nội dung chuyên sâu.'
                      : 'Feed được lọc nhẹ theo chủ đề bạn đã chọn.'
                }
              />
            ) : null}

            {landing.pinNewbie ? (
              <div
                className="mb-6 p-4 border border-amber-400/30 bg-amber-500/5 rounded-xl"
              >
                <p className="text-xs uppercase tracking-wider text-amber-300 mb-1">Gợi ý cho người mới</p>
                <p className="text-sm text-white font-medium">Q&A — Đừng ngại hỏi bất cứ gì!</p>
                <p className="text-xs text-ds-muted mt-1">
                  Bấm «Tạo bài viết» và mô tả thắc mắc — cộng đồng CosmoLearn sẽ giúp bạn.
                </p>
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPost(true)
                      setNewTitle('Câu hỏi cho người mới: ')
                    }}
                    className="mt-3 text-xs text-amber-300 hover:text-amber-100"
                  >
                    Viết câu hỏi đầu tiên →
                  </button>
                ) : null}
              </div>
            ) : null}

            {showNewPost && (
              <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-ds-surface/90 p-5">
                <h2 className="text-white font-semibold mb-3">Tạo bài viết mới</h2>
                <div className="mb-3">
                  <div className="flex items-end justify-between gap-2 mb-1.5">
                    <label className="text-xs text-ds-muted">Tiêu đề</label>
                    <span className="text-[11px] text-ds-subtle tabular-nums">{newTitle.length}/300</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Tiêu đề bài viết"
                    value={newTitle}
                    maxLength={300}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent/50"
                  />
                </div>
                <p className="text-xs text-ds-subtle mb-2">Nội dung — soạn có định dạng</p>
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
                  <div className="h-24 rounded-xl border border-ds-border bg-white/5 animate-pulse" />
                  <div className="h-24 rounded-xl border border-ds-border bg-white/5 animate-pulse" />
                  <div className="h-24 rounded-xl border border-ds-border bg-white/5 animate-pulse" />
              </div>
            ) : (
              <DiscussionPostList
                posts={displayPosts}
                user={user}
                onVoteChange={(postId, voteCount, myVote) => {
                  setPosts((prev) =>
                    prev.map((p) =>
                      p._id === postId ? { ...p, voteCount, myVote: myVote ?? undefined } : p,
                    ),
                  )
                }}
              />
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
  )
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="relative z-10 text-ds-text w-full pt-24 flex items-center justify-center">
          <p className="text-ds-subtle">Đang tải chuyên mục…</p>
        </div>
      }
    >
      <ForumPageContent />
    </Suspense>
  )
}
