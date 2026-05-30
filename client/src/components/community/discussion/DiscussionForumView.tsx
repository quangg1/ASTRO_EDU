'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createPost,
  fetchForumPosts,
  fetchPopularTags,
  type Forum,
  type Post,
} from '@/features/community/api/communityApi'
import { getToken } from '@/features/auth/public'
import {
  createPostBodyFromContext,
  parseComposeContext,
  suggestPostTitle,
} from '@/features/community/lib/composeContext'
import { isHtmlFragmentEmpty } from '@/features/community/lib/postContent'
import { syncCommunityGemReward } from '@/features/community/lib/communityGemReward'
import { LearningComposeBanner } from '@/components/community/learning/LearningComposeBanner'
import { CommunitySearchBar } from '@/components/community/shared/CommunitySearchBar'
import { PostSortBar } from '@/components/community/shared/PostSortBar'
import { TagChips } from '@/components/community/shared/TagChips'
import { DiscussionPostList } from '@/components/community/discussion/DiscussionPostList'
import { readRouteCache, writeRouteCache } from '@/lib/clientRouteCache'

const RichTextEditor = dynamic(() => import('@/components/studio/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[180px] rounded-xl border border-white/15 bg-black/30 animate-pulse" aria-hidden />
  ),
})

type Props = {
  forum: Forum
  slug: string
  user: { id: string } | null
}

export function DiscussionForumView({ forum, slug, user }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const composeContext = useMemo(() => parseComposeContext(searchParams), [searchParams])

  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'newest' | 'hot' | 'top'>('newest')
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([])

  const contextFilterActive = Boolean(
    composeContext &&
      (composeContext.lessonSlug || composeContext.learningLessonId || composeContext.courseSlug),
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ.trim()), 400)
    return () => clearTimeout(t)
  }, [searchQ])

  useEffect(() => {
    if (searchParams.get('compose') === '1') setShowNewPost(true)
    if (composeContext && searchParams.get('prefill') === '1') {
      const suggested = suggestPostTitle(composeContext)
      if (suggested) setNewTitle((t) => t || suggested)
    }
  }, [searchParams, composeContext])

  useEffect(() => {
    fetchPopularTags(24).then(setPopularTags)
  }, [])

  useEffect(() => {
    const opts: Parameters<typeof fetchForumPosts>[1] = { page, limit: 20, sort }
    if (tagFilter) opts.tag = tagFilter
    if (debouncedQ.length >= 2) opts.q = debouncedQ
    if (composeContext?.pathSource) opts.pathSource = composeContext.pathSource
    if (composeContext?.courseSlug) {
      opts.courseSlug = composeContext.courseSlug
      if (composeContext.lessonSlug) opts.lessonSlug = composeContext.lessonSlug
    }
    if (composeContext?.learningLessonId) {
      opts.learningLessonId = composeContext.learningLessonId
    }
    const listKey = `forum-posts:${slug}:${JSON.stringify(opts)}`
    const cached = readRouteCache<{ data: Post[]; total: number }>(listKey)
    if (cached) {
      setPosts(cached.data)
      setTotal(cached.total)
      setLoading(false)
    } else if (!posts.length) {
      setLoading(true)
    }
    fetchForumPosts(slug, opts).then((r) => {
      writeRouteCache(listKey, { data: r.data, total: r.total })
      setPosts(r.data)
      setTotal(r.total)
      setLoading(false)
    })
  }, [slug, page, sort, tagFilter, debouncedQ, composeContext, contextFilterActive])

  const handleCreatePost = async () => {
    if (!newTitle.trim()) return
    if (!user || !getToken()) {
      const qs = typeof window !== 'undefined' ? window.location.search : ''
      router.push(`/login?redirect=${encodeURIComponent(`/community/${slug}${qs}`)}`)
      return
    }
    setSubmitting(true)
    const learningFields = composeContext ? createPostBodyFromContext(composeContext) : {}
    const res = await createPost(slug, {
      title: newTitle.trim().slice(0, 300),
      content: isHtmlFragmentEmpty(newContent) ? '' : newContent.trim(),
      ...learningFields,
    })
    setSubmitting(false)
    if (res.success && res.data) {
      void syncCommunityGemReward(res.gemReward)
      setShowNewPost(false)
      setNewTitle('')
      setNewContent('')
      setPosts((p) => [res.data!, ...p])
      setTotal((t) => t + 1)
      if (composeContext) {
        const next = new URLSearchParams(searchParams.toString())
        next.delete('compose')
        next.delete('prefill')
        const qs = next.toString()
        router.replace(`/community/${slug}${qs ? `?${qs}` : ''}`, { scroll: false })
      }
    } else if (res.code === 'AUTH_REQUIRED') {
      const qs = typeof window !== 'undefined' ? window.location.search : ''
      router.push(`/login?redirect=${encodeURIComponent(`/community/${slug}${qs}`)}`)
    } else {
      alert(res.error || 'Không đăng được bài')
    }
  }

  const titlePlaceholder = composeContext?.lessonTitle
    ? `Ví dụ: Không hiểu phần "${composeContext.lessonTitle}"…`
    : composeContext?.courseTitle
      ? `Ví dụ: Câu hỏi về "${composeContext.courseTitle}"…`
      : 'Tiêu đề câu hỏi'

  return (
    <>
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#08111f]/70 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 md:text-3xl">
              <span className="text-3xl" aria-hidden>
                {forum.icon || '💬'}
              </span>
              {forum.title}
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl leading-relaxed">{forum.description}</p>
            <p className="text-xs text-gray-500 mt-3">{total} bài · Dùng #hashtag trong bài để gắn chủ đề</p>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => setShowNewPost(!showNewPost)}
              className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
            >
              {showNewPost ? 'Đóng' : composeContext ? 'Đặt câu hỏi' : 'Tạo bài viết'}
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
          <CommunitySearchBar
            global={false}
            scope="discussion"
            initialQuery={searchQ}
            onLocalSearch={(q) => {
              setSearchQ(q)
              setPage(1)
            }}
            placeholder="Tìm trong tiêu đề và nội dung…"
          />
          <PostSortBar sort={sort} onSortChange={(s) => { setSort(s); setPage(1) }} variant="discussion" />
          <TagChips tags={popularTags} activeTag={tagFilter} onSelect={(t) => { setTagFilter(t); setPage(1) }} />
        </div>
      </div>

      {composeContext && contextFilterActive && !showNewPost && (
        <p className="mb-4 text-sm text-violet-200/90 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2.5">
          Đang hiển thị câu hỏi liên quan tới bài học này.{' '}
          <Link href={`/community/${slug}`} className="underline text-cyan-300">
            Xem tất cả trong {forum.title}
          </Link>
        </p>
      )}

      {!user && (
        <p className="mb-4 text-sm text-amber-200/80">
          <button type="button" className="underline" onClick={() => router.push(`/login?redirect=/community/${slug}`)}>
            Đăng nhập
          </button>{' '}
          để đăng bài và bình luận.
        </p>
      )}

      {showNewPost && user && (
        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-[#060e1c]/90 p-5">
          <h2 className="text-white font-semibold mb-3">
            {composeContext ? 'Đặt câu hỏi học tập' : 'Tạo bài viết mới'}
          </h2>
          {composeContext && <LearningComposeBanner context={composeContext} />}
          <p className="text-xs text-slate-500 mb-3">Gõ #tên-chủ-đề trong nội dung để thêm hashtag (vd. #sao-hỏa).</p>
          <div className="mb-3">
            <label className="text-xs text-slate-400">Tiêu đề</label>
            <input
              type="text"
              value={newTitle}
              maxLength={300}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white"
              placeholder={titlePlaceholder}
            />
          </div>
          <RichTextEditor
            value={newContent}
            onChange={setNewContent}
            placeholder={composeContext ? 'Mô tả thắc mắc, đính kèm ảnh nếu cần…' : 'Nội dung (tùy chọn)'}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowNewPost(false)} className="px-4 py-2 rounded-lg border border-white/20 text-gray-200">
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleCreatePost()}
              disabled={submitting || !newTitle.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm disabled:opacity-50"
            >
              {submitting ? 'Đang đăng…' : 'Đăng bài'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
          <div className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
        </div>
      ) : (
        <DiscussionPostList posts={posts} />
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
