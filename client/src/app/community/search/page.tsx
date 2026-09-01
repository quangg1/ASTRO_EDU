'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  searchCommunityPosts,
  type Post,
  CommunitySearchBar,
  DiscussionPostList,
  NewsCardLink,
  postThumbnailUrl,
} from '@/features/community/public'

function formatDate(date?: string) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN')
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') || ''
  const scope = (searchParams.get('scope') as 'all' | 'news' | 'discussion') || 'all'

  const [q, setQ] = useState(initialQ)
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setPosts([])
      setTotal(0)
      return
    }
    setLoading(true)
    searchCommunityPosts({ q: query, scope, limit: 40 }).then((r) => {
      setPosts(r.data)
      setTotal(r.total)
      setLoading(false)
    })
  }, [q, scope])

  const newsPosts = posts.filter((p) => p.forumIsNews)
  const discussionPosts = posts.filter((p) => !p.forumIsNews)

  return (
    <div className="relative z-10 px-4 pb-16 max-w-4xl mx-auto pt-6">
        <Link href="/community" className="text-sm text-ds-accent hover:text-ds-text mb-6 inline-block">
          ← Cộng đồng
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">Tìm bài viết</h1>
        <p className="text-sm text-ds-muted mb-6">Tìm trong tiêu đề và nội dung thảo luận; tin lọc theo tiêu đề.</p>

        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'discussion', 'news'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                const params = new URLSearchParams()
                if (q.trim().length >= 2) params.set('q', q.trim())
                params.set('scope', s)
                router.push(`/community/search?${params.toString()}`)
              }}
              className={`rounded-full px-3 py-1 text-xs border ${
                scope === s
                  ? 'border-ds-accent/50 bg-ds-accent/15 text-ds-text'
                  : 'border-ds-border text-ds-muted'
              }`}
            >
              {s === 'all' ? 'Tất cả' : s === 'news' ? 'Tin' : 'Thảo luận'}
            </button>
          ))}
        </div>

        <CommunitySearchBar
          global={false}
          scope={scope}
          initialQuery={q}
          onLocalSearch={(value) => {
            const params = new URLSearchParams()
            if (value.length >= 2) params.set('q', value)
            params.set('scope', scope)
            router.replace(`/community/search?${params.toString()}`)
          }}
        />

        {q.trim().length < 2 && (
          <p className="mt-8 text-sm text-ds-subtle">Nhập ít nhất 2 ký tự để tìm.</p>
        )}

        {loading && <p className="mt-8 text-sm text-ds-subtle">Đang tìm…</p>}

        {!loading && q.trim().length >= 2 && (
          <p className="mt-6 text-sm text-ds-muted">{total} kết quả</p>
        )}

        {!loading && discussionPosts.length > 0 && (scope === 'all' || scope === 'discussion') && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-violet-200 mb-3">Thảo luận</h2>
            <DiscussionPostList posts={discussionPosts} />
          </section>
        )}

        {!loading && newsPosts.length > 0 && (scope === 'all' || scope === 'news') && (
          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold text-cyan-200 mb-3">Tin thiên văn</h2>
            {newsPosts.map((p) => {
              const thumb = postThumbnailUrl(p.imageUrl, p.content)
              return (
                <NewsCardLink
                  key={p._id}
                  post={p}
                  className="flex gap-4 rounded-xl border border-ds-border bg-white/[0.03] p-3 hover:border-cyan-300/25"
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-24 h-16 object-cover rounded-lg shrink-0" referrerPolicy="no-referrer" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-2">{p.title}</p>
                    <p className="text-xs text-ds-subtle mt-1">
                      {p.forumTitle} · {formatDate(p.publishedAt || p.createdAt)}
                    </p>
                  </div>
                </NewsCardLink>
              )
            })}
          </section>
        )}
    </div>
  )
}

export default function CommunitySearchPage() {
  return (
    <Suspense fallback={<div className="relative z-10 text-ds-text w-full pt-24 text-center text-ds-subtle">Đang tải…</div>}>
      <SearchContent />
    </Suspense>
  )
}
