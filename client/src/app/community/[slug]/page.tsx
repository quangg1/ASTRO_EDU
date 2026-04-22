'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
  const newsFiltersRef = useRef({ q: '', cat: '' })

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      <div className={`pt-20 px-4 pb-12 mx-auto ${isNewsForum ? 'max-w-6xl' : 'max-w-4xl'}`}>
        <Link
          href="/community"
          className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded-md px-1"
        >
          <span aria-hidden>←</span> Quay lại cộng đồng
        </Link>

        {forum && (
          <>
            <div
              className={`mb-6 rounded-2xl border p-5 md:p-6 ${
                isNewsForum
                  ? 'border-cyan-400/25 bg-gradient-to-br from-[#0a1628]/95 via-[#061018] to-[#050a12]'
                  : 'border-white/10 bg-[#08111f]/70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {isNewsForum && (
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
                      Bản tin thiên văn
                    </p>
                  )}
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2 md:text-3xl">
                    <span className="text-3xl md:text-4xl" aria-hidden>
                      {forum.icon || (isNewsForum ? '🌌' : '💬')}
                    </span>
                    {forum.title}
                  </h1>
                  <p className="text-gray-400 mt-2 max-w-2xl leading-relaxed">
                    {isNewsForum
                      ? 'Tóm tắt và ảnh từ nguồn uy tín; nhấn vào từng tin để đọc bài gốc trên website của họ.'
                      : forum.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-3">{total} bài</p>
                </div>
                {!isNewsForum && user && (
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
                {(isNewsForum
                  ? [
                      { value: 'newest' as const, label: 'Mới nhất' },
                      { value: 'hot' as const, label: 'Đang được xem' },
                      { value: 'top' as const, label: 'Nhiều tương tác' },
                    ]
                  : [
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

              {isNewsForum && (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Lọc theo metadata (RSS)</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewsCategoryFilter('')
                        setPage(1)
                      }}
                      className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                        !newsCategoryFilter
                          ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                          : 'border-white/15 bg-white/5 text-gray-400 hover:border-white/25'
                      }`}
                    >
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
                        className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                          newsCategoryFilter === c
                            ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                            : 'border-white/15 bg-white/5 text-gray-400 hover:border-white/25'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <label htmlFor="news-title-q" className="text-xs text-gray-500 shrink-0">
                      Tìm trong tiêu đề
                    </label>
                    <input
                      id="news-title-q"
                      type="search"
                      value={titleQ}
                      onChange={(e) => setTitleQ(e.target.value)}
                      placeholder="Tối thiểu 2 ký tự"
                      className="max-w-md flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                    />
                  </div>
                </div>
              )}
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
                <p className="text-xs text-slate-500 mb-2">Nội dung — soạn có định dạng (kiểu Reddit: in đậm, link, danh sách, ảnh qua URL…)</p>
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
              isNewsForum ? (
                <div className="space-y-4">
                  <div className="h-56 rounded-2xl border border-white/10 bg-white/5 animate-pulse md:h-64" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <div className="aspect-[16/10] animate-pulse bg-white/10" />
                        <div className="space-y-2 p-4">
                          <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                          <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                  <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                  <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                </div>
              )
            ) : isNewsForum ? (
              <div className="space-y-8">
                {showNewsSlider && sliderPosts.length > 0 && (
                  <NewsHeroSlider
                    posts={sliderPosts}
                    title="Tin mới trong chuyên mục"
                    subtitle="Mười bài gần nhất — dùng lọc / tìm kiếm phía trên để thu hẹp"
                  />
                )}

                {showNewsSlider && restNewsPosts.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Tiếp theo
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {restNewsPosts.map((p) => {
                        const thumb = postThumbnailUrl(p.imageUrl, p.content)
                        return (
                          <NewsCardLink
                            key={p._id}
                            post={p}
                            className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all hover:border-cyan-300/25 hover:bg-white/[0.06]"
                          >
                            <div className="relative aspect-[16/10] overflow-hidden bg-[#0c1829]">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={p.title}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 to-[#0a1520] text-3xl opacity-90">
                                  ✦
                                </div>
                              )}
                              {p.isPinned && (
                                <span className="absolute left-2 top-2 rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] text-amber-200">
                                  Ghim
                                </span>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white group-hover:text-cyan-100">
                                {p.title}
                              </h3>
                              {plainTextExcerpt(p.content, 100) ? (
                                <p className="mt-2 line-clamp-2 text-xs text-slate-500">{plainTextExcerpt(p.content, 100)}</p>
                              ) : null}
                              <p className="mt-auto pt-3 text-[11px] text-slate-500">
                                {p.sourceName || p.authorName}
                                {' · '}
                                {formatDate(p.publishedAt || p.createdAt)}
                              </p>
                            </div>
                          </NewsCardLink>
                        )
                      })}
                    </div>
                  </div>
                )}

                {!showNewsSlider && posts.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((p) => {
                      const thumb = postThumbnailUrl(p.imageUrl, p.content)
                      return (
                        <NewsCardLink
                          key={p._id}
                          post={p}
                          className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all hover:border-cyan-300/25"
                        >
                          <div className="relative aspect-[16/10] overflow-hidden bg-[#0c1829]">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={p.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 to-[#0a1520] text-3xl">
                                ✦
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="line-clamp-2 text-sm font-medium text-white group-hover:text-cyan-100">{p.title}</h3>
                            <p className="mt-2 text-[11px] text-slate-500">
                              {p.sourceName || p.authorName} · {formatDate(p.publishedAt || p.createdAt)}
                            </p>
                          </div>
                        </NewsCardLink>
                      )
                    })}
                  </div>
                )}

                {posts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-8 text-center text-gray-400">
                    Chưa có tin nào.
                  </div>
                )}
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
