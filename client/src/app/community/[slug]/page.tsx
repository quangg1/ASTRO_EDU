'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchForum, fetchForumPosts, createPost, type Forum, type Post } from '@/lib/communityApi'

export default function ForumPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, checked } = useAuthStore()
  const [forum, setForum] = useState<Forum | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetchForum(slug).then((f) => setForum(f))
  }, [slug])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetchForumPosts(slug, { page, limit: 20, sort: 'newest' }).then((r) => {
      setPosts(r.data)
      setTotal(r.total)
      setLoading(false)
    })
  }, [slug, page])

  useEffect(() => {
    if (checked && !user && forum && !forum.isNews) {
      router.replace('/login?redirect=/community/' + slug)
    }
  }, [checked, user, forum, slug, router])

  const handleCreatePost = async () => {
    if (!forum || !user || !newTitle.trim()) return
    setSubmitting(true)
    const res = await createPost(slug, { title: newTitle.trim(), content: newContent.trim() })
    setSubmitting(false)
    if (res.success && res.data) {
      setShowNewPost(false)
      setNewTitle('')
      setNewContent('')
      setPosts((p) => [res.data!, ...p])
      setTotal((t) => t + 1)
    } else {
      alert(res.error || 'Lỗi')
    }
  }

  if (!forum && !loading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy diễn đàn</p>
      </div>
    )
  }

  const isNewsForum = forum?.slug === 'tin-thien-van' || forum?.isNews

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      <div className="pt-20 px-4 pb-12 max-w-4xl mx-auto">
        <Link href="/community" className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
          ← Cộng đồng
        </Link>

        {forum && (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>{forum.icon || '💬'}</span>
                  {forum.title}
                </h1>
                <p className="text-gray-400 mt-1">{forum.description}</p>
                <p className="text-xs text-gray-500 mt-2">{total} bài viết</p>
              </div>
              {!isNewsForum && user && (
                <button
                  type="button"
                  onClick={() => setShowNewPost(!showNewPost)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
                >
                  {showNewPost ? 'Hủy' : 'Đăng bài'}
                </button>
              )}
            </div>

            {showNewPost && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-black/40 p-5">
                <input
                  type="text"
                  placeholder="Tiêu đề"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 mb-3"
                />
                <textarea
                  placeholder="Nội dung (tùy chọn)"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 mb-3 resize-none"
                />
                <button
                  type="button"
                  onClick={handleCreatePost}
                  disabled={submitting || !newTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Đang đăng...' : 'Đăng'}
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-gray-500">Đang tải...</div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <Link
                    key={p._id}
                    href={`/community/post/${p._id}`}
                    className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                  >
                    <h3 className="font-medium text-white">{p.title}</h3>
                    {p.content && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.content}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{p.authorName}</span>
                      <span>{p.commentCount} bình luận</span>
                      <span>{p.voteCount} vote</span>
                      {p.sourceName && <span>{p.sourceName}</span>}
                      <span>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </Link>
                ))}
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
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
