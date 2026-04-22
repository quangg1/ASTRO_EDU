'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { fetchPost, addComment, votePost, pinPost, deletePost, type Post, type Comment } from '@/lib/communityApi'
import { canModerate } from '@/lib/roles'
import { firstImageSrcFromHtml, looksLikeHtml, stripFirstImgTag } from '@/lib/postContent'
import { recordPostDetailView, recordPostSourceOpen } from '@/lib/postEngagement'
import { PostMarkdown } from '@/components/community/PostMarkdown'

function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN')
}

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { user } = useAuthStore()
  const [data, setData] = useState<{ post: Post & { comments: Comment[]; myVote?: number | null } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modAction, setModAction] = useState<'pin' | 'delete' | null>(null)
  const detailViewRecorded = useRef(false)

  useEffect(() => {
    if (!id) return
    detailViewRecorded.current = false
    fetchPost(id).then(setData).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || loading || !data?.post?._id) return
    if (String(data.post._id) !== id) return
    if (detailViewRecorded.current) return
    detailViewRecorded.current = true
    void recordPostDetailView(id).then((viewCount) => {
      if (viewCount == null) return
      setData((d) =>
        d ? { ...d, post: { ...d.post, viewCount } } : null
      )
    })
  }, [id, data?.post?._id, loading])

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
      alert(res.error || 'Error')
    }
  }

  const handleVote = async (value: 1 | -1) => {
    if (!data || !user) {
      alert('Log in to vote')
      return
    }
    const res = await votePost(data.post._id, value)
    if (res.success && res.voteCount != null) {
      setData((d) =>
        d ? { ...d, post: { ...d.post, voteCount: res.voteCount!, myVote: res.myVote } } : null
      )
    }
  }

  const handlePin = async () => {
    if (!data || !canModerate(user || null)) return
    setModAction('pin')
    const res = await pinPost(data.post._id, !data.post.isPinned)
    setModAction(null)
    if (res.success && res.data) {
      setData((d) => d ? { ...d, post: { ...d.post, isPinned: res.data!.isPinned } } : null)
    } else {
      alert(res.error || 'Error')
    }
  }

  const handleDelete = async () => {
    if (!data || !canModerate(user || null)) return
    if (!confirm('Delete this post? This cannot be undone.')) return
    setModAction('delete')
    const res = await deletePost(data.post._id)
    setModAction(null)
    if (res.success) router.replace('/community')
    else alert(res.error || 'Delete failed')
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">{loading ? 'Đang tải...' : 'Không tìm thấy bài viết'}</p>
      </div>
    )
  }

  const { post } = data
  const isNewsArticle = Boolean(post.isCrawled || (post.sourceUrl && post.sourceName))
  /** Tin chỉ tóm tắt trong app; nội dung đầy đủ ở sourceUrl */
  const isLinkOutNews = Boolean(post.isExternalArticle && post.sourceUrl)
  const newsDate = post.publishedAt || post.createdAt

  const coverFromContent = firstImageSrcFromHtml(post.content)
  const coverUrl = post.imageUrl || coverFromContent
  const contentIsHtml = looksLikeHtml(post.content)
  /** Tránh trùng ảnh: đã dùng ảnh đầu làm bìa thì bỏ <img> đầu trong body HTML. */
  const bodyHtml =
    contentIsHtml && post.content
      ? !post.imageUrl && coverFromContent
        ? stripFirstImgTag(post.content)
        : post.content
      : null

  const htmlBodyClassName =
    'mt-6 text-slate-200/95 leading-[1.75] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4 [&_a]:text-cyan-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      <div
        className="pt-20 px-4 pb-12 mx-auto max-w-4xl"
      >
        <nav className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400" aria-label="Breadcrumb">
          <Link
            href="/community"
            className="text-cyan-400 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded px-0.5"
          >
            Cộng đồng
          </Link>
          {isNewsArticle && (
            <>
              <span aria-hidden className="text-slate-600">
                /
              </span>
              <Link
                href="/community/tin-thien-van"
                className="text-cyan-400/90 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded px-0.5"
              >
                Tin thiên văn
              </Link>
            </>
          )}
        </nav>

        <article
          className={`rounded-2xl overflow-hidden shadow-[0_16px_50px_-24px_rgba(0,0,0,0.8)] ${
            isNewsArticle
              ? 'border border-cyan-400/20 bg-gradient-to-b from-[#0a1628]/95 to-[#060d16]'
              : 'border border-white/10 bg-[#08111f]/80'
          }`}
        >
          {coverUrl && (
            <div className={`w-full overflow-hidden ${isNewsArticle ? 'aspect-[21/9] max-h-[360px]' : 'aspect-video'}`}>
              <img
                src={coverUrl}
                alt={post.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className={`p-6 md:p-8 ${isNewsArticle ? 'px-5 sm:px-10' : ''}`}>
            {isNewsArticle && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/85 mb-3">
                Tin thiên văn
              </p>
            )}
            <div className="flex items-start justify-between gap-4">
              <h1
                className={`font-bold text-white leading-tight ${
                  isNewsArticle ? 'text-2xl md:text-[1.75rem] font-semibold tracking-tight' : 'text-2xl md:text-3xl'
                }`}
              >
                {post.title}
              </h1>
              {post.isPinned && (
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-300/35">
                  Ghim
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-400 flex-wrap">
              {isNewsArticle ? (
                <>
                  {post.sourceName && <span className="text-cyan-200/90">{post.sourceName}</span>}
                  <span className="text-slate-500">·</span>
                  <time dateTime={newsDate}>{formatDate(newsDate)}</time>
                  <span className="text-slate-500">·</span>
                  <span>{post.viewCount} lượt xem</span>
                  {isLinkOutNews && (
                    <span className="text-slate-500 w-full sm:w-auto text-xs mt-1 sm:mt-0">
                      Bản đầy đủ nằm trên trang của nguồn tin.
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>{post.authorName}</span>
                  {post.sourceName && <span>{post.sourceName}</span>}
                  <span>{formatDate(post.createdAt)}</span>
                  <span>{post.viewCount} lượt xem</span>
                </>
              )}
            </div>

            {isLinkOutNews && post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void recordPostSourceOpen(post._id).then((viewCount) => {
                    if (viewCount != null) {
                      setData((d) => (d ? { ...d, post: { ...d.post, viewCount } } : null))
                    }
                  })
                }}
                className="mt-6 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-cyan-500/25 px-6 py-3.5 text-base font-semibold text-cyan-100 border border-cyan-400/35 hover:bg-cyan-500/35 transition-colors"
              >
                Đọc bài gốc <span aria-hidden>↗</span>
              </a>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              {user && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVote(1)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${post.myVote === 1 ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-300/40' : 'bg-white/10 text-gray-300 hover:text-white border border-white/10'}`}
                  >
                    ▲ {post.voteCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(-1)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${post.myVote === -1 ? 'bg-red-500/30 text-red-300 border border-red-300/40' : 'bg-white/10 text-gray-300 hover:text-white border border-white/10'}`}
                  >
                    ▼
                  </button>
                </div>
              )}
              {!user && <span className="text-gray-400">{post.voteCount} vote</span>}
              <span className="text-gray-400">{post.commentCount} bình luận</span>
              {canModerate(user || null) && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePin}
                    disabled={modAction !== null}
                    className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 border border-amber-300/30"
                  >
                    {modAction === 'pin' ? '...' : post.isPinned ? 'Bỏ ghim' : 'Ghim'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={modAction !== null}
                    className="text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 border border-red-300/30"
                  >
                    {modAction === 'delete' ? '...' : 'Xóa'}
                  </button>
                </div>
              )}
            </div>

            {contentIsHtml && bodyHtml ? (
              <div
                className={`${htmlBodyClassName} ${isNewsArticle ? 'text-[1.05rem]' : ''}`}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : post.content ? (
              <div className={isNewsArticle ? 'mt-6 text-[1.05rem]' : 'mt-6'}>
                <PostMarkdown
                  source={post.content}
                  className={isNewsArticle ? 'text-slate-200/95 leading-[1.75]' : undefined}
                />
              </div>
            ) : null}

            {post.sourceUrl && !isLinkOutNews && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void recordPostSourceOpen(post._id).then((viewCount) => {
                    if (viewCount != null) {
                      setData((d) => (d ? { ...d, post: { ...d.post, viewCount } } : null))
                    }
                  })
                }}
                className="inline-block mt-5 px-4 py-2 rounded-lg bg-cyan-600/25 text-cyan-300 hover:bg-cyan-600/40 border border-cyan-300/25"
              >
                Xem nguồn →
              </a>
            )}
          </div>
        </article>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Bình luận</h2>

          {user && (
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <textarea
                placeholder="Bình luận (Markdown được hỗ trợ)..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 resize-y min-h-[80px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={submitting || !commentText.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
                </button>
              </div>
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
                  <span className="text-gray-500">{formatDate(c.createdAt)}</span>
                </div>
                <div className="mt-2 text-gray-200 text-sm">
                  <PostMarkdown source={c.content} />
                </div>
              </div>
            ))}
            {!post.comments.length && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-gray-400">
                Chưa có bình luận nào. Hãy là người mở đầu cuộc thảo luận.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
