'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchPost, addComment, votePost, type Post, type Comment } from '@/lib/communityApi'

export default function PostPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useAuthStore()
  const [data, setData] = useState<{ post: Post & { comments: Comment[]; myVote?: number | null } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchPost(id).then(setData).finally(() => setLoading(false))
  }, [id])

  const handleAddComment = async () => {
    if (!data || !user || !commentText.trim()) return
    setSubmitting(true)
    const res = await addComment(data.post._id, commentText.trim())
    setSubmitting(false)
    if (res.success && res.data) {
      setCommentText('')
      setData((d) =>
        d
          ? {
              ...d,
              post: {
                ...d.post,
                comments: [...d.post.comments, res.data!],
                commentCount: d.post.commentCount + 1,
              },
            }
          : null
      )
    } else {
      alert(res.error || 'Lỗi')
    }
  }

  const handleVote = async (value: 1 | -1) => {
    if (!data || !user) {
      alert('Đăng nhập để vote')
      return
    }
    const res = await votePost(data.post._id, value)
    if (res.success && res.voteCount != null) {
      setData((d) =>
        d ? { ...d, post: { ...d.post, voteCount: res.voteCount!, myVote: res.myVote } } : null
      )
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">{loading ? 'Đang tải...' : 'Không tìm thấy bài viết'}</p>
      </div>
    )
  }

  const { post } = data

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      <div className="pt-20 px-4 pb-12 max-w-4xl mx-auto">
        <Link href="/community" className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
          ← Cộng đồng
        </Link>

        <article className="rounded-2xl border border-white/10 bg-[#08111f]/80 overflow-hidden">
          {post.imageUrl && (
            <div className="aspect-video w-full overflow-hidden">
              <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white">{post.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{post.authorName}</span>
              {post.sourceName && <span>{post.sourceName}</span>}
              <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
              <span>{post.viewCount} lượt xem</span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVote(1)}
                    className={`px-2 py-1 rounded ${post.myVote === 1 ? 'bg-cyan-500/30 text-cyan-400' : 'bg-white/10 text-gray-400 hover:text-white'}`}
                  >
                    ▲ {post.voteCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(-1)}
                    className={`px-2 py-1 rounded ${post.myVote === -1 ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-gray-400 hover:text-white'}`}
                  >
                    ▼
                  </button>
                </div>
              )}
              {!user && <span className="text-gray-500">{post.voteCount} vote</span>}
              <span className="text-gray-500">{post.commentCount} bình luận</span>
            </div>

            <div className="mt-5 text-gray-200 whitespace-pre-wrap leading-relaxed">{post.content}</div>

            {post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 px-4 py-2 rounded-lg bg-cyan-600/30 text-cyan-400 hover:bg-cyan-600/50"
              >
                Xem nguồn gốc →
              </a>
            )}
          </div>
        </article>

        {/* Comments */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Bình luận</h2>

          {user && (
            <div className="mb-6 flex gap-2">
              <textarea
                placeholder="Viết bình luận..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 resize-none"
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={submitting || !commentText.trim()}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium self-end disabled:opacity-50"
              >
                Gửi
              </button>
            </div>
          )}

          <div className="space-y-4">
            {post.comments.map((c) => (
              <div
                key={c._id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-white">{c.authorName}</span>
                  <span className="text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="mt-2 text-gray-200">{c.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
