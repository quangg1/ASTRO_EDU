'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { fetchPostsByTag, type Post } from '@/features/community/public'
import { DiscussionPostList } from '@/components/community/discussion/DiscussionPostList'

function TagPageContent() {
  const params = useParams()
  const tag = decodeURIComponent(String(params.tag || ''))
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tag) return
    setLoading(true)
    fetchPostsByTag(tag, { limit: 40 }).then((r) => {
      setPosts(r.data)
      setTotal(r.total)
      setLoading(false)
    })
  }, [tag])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#03060d] via-black to-[#040810]">
      <div className="pt-20 px-4 pb-16 max-w-4xl mx-auto">
        <Link href="/community" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">
          ← Cộng đồng
        </Link>
        <h1 className="text-2xl font-bold text-white">
          <span className="text-violet-300">#{tag}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2">{total} bài thảo luận</p>
        {loading ? (
          <p className="mt-8 text-slate-500">Đang tải…</p>
        ) : (
          <div className="mt-8">
            <DiscussionPostList posts={posts} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function TagPostsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black pt-24 text-center text-slate-500">Đang tải…</div>}>
      <TagPageContent />
    </Suspense>
  )
}
