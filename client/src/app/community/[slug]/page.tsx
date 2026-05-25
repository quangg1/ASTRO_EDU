'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { fetchForum, type Forum } from '@/features/community/public'
import { isNewsForum } from '@/features/community/lib/forumKinds'
import { DiscussionForumView } from '@/components/community/discussion/DiscussionForumView'
import { NewsForumView } from '@/components/community/news/NewsForumView'
import { readRouteCache, writeRouteCache } from '@/lib/clientRouteCache'

function ForumPageContent() {
  const params = useParams()
  const slug = params.slug as string
  const { user } = useAuthStore()
  const cacheKey = `forum:${slug}`
  const cachedForum = slug ? readRouteCache<Forum>(cacheKey) : null
  const [forum, setForum] = useState<Forum | null>(cachedForum)
  const [loading, setLoading] = useState(!cachedForum)

  useEffect(() => {
    if (!slug) return
    const hit = readRouteCache<Forum>(cacheKey)
    if (hit) {
      setForum(hit)
      setLoading(false)
    } else if (!forum) {
      setLoading(true)
    }
    fetchForum(slug).then((f) => {
      if (f) writeRouteCache(cacheKey, f)
      setForum(f)
      setLoading(false)
    })
  }, [slug, cacheKey])

  if (loading && !forum) {
    return (
      <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
        <p className="text-gray-500">Đang tải chuyên mục…</p>
      </div>
    )
  }

  if (!forum) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy chuyên mục</p>
      </div>
    )
  }

  const news = isNewsForum(forum)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      <div className={`pt-20 px-4 pb-12 mx-auto ${news ? 'max-w-6xl' : 'max-w-4xl'}`}>
        <Link href="/community" className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-flex items-center gap-2">
          <span aria-hidden>←</span> Quay lại cộng đồng
        </Link>
        {news ? <NewsForumView forum={forum} slug={slug} /> : <DiscussionForumView forum={forum} slug={slug} user={user} />}
      </div>
    </div>
  )
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
          <p className="text-gray-500">Đang tải…</p>
        </div>
      }
    >
      <ForumPageContent />
    </Suspense>
  )
}
