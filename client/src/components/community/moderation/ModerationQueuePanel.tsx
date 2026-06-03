'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  deleteCommentAsMod,
  fetchModerationQueue,
  issueModerationWarning,
  resolveModerationReport,
  setCommentHidden,
  setPostHidden,
  type ModerationQueueItem,
} from '@/features/community/api/moderationApi'
import { REPORT_REASON_LABELS, type ReportReason } from '@/features/community/api/moderationApi'
import { plainTextExcerpt } from '@/features/community/lib/postContent'
import { pinPost, deletePost } from '@/features/community/public'

export function ModerationQueuePanel() {
  const [items, setItems] = useState<ModerationQueueItem[]>([])
  const [stats, setStats] = useState({ openReports: 0, hiddenPosts: 0, hiddenComments: 0 })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    fetchModerationQueue({ status: 'open', limit: 50 }).then((r) => {
      setItems(r.items)
      setStats(r.stats)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const dismiss = async (reportId: string) => {
    setBusyId(reportId)
    await resolveModerationReport(reportId, 'dismissed', 'Không vi phạm')
    reload()
    setBusyId(null)
  }

  const resolve = async (reportId: string) => {
    setBusyId(reportId)
    await resolveModerationReport(reportId, 'resolved', 'Đã xử lý')
    reload()
    setBusyId(null)
  }

  const warnAuthor = async (item: ModerationQueueItem) => {
    const msg = window.prompt('Nội dung cảnh báo gửi tới tác giả:', 'Nội dung của bạn vi phạm nội quy cộng đồng.')
    if (!msg?.trim()) return
    setBusyId(item.report._id)
    await issueModerationWarning({
      userId: item.target.authorId,
      message: msg.trim(),
      relatedReportId: item.report._id,
      postId: item.post?._id,
    })
    setBusyId(null)
    alert('Đã ghi cảnh báo')
  }

  const hideTarget = async (item: ModerationQueueItem) => {
    setBusyId(item.report._id)
    if (item.targetType === 'post') {
      await setPostHidden(item.target._id, true)
    } else {
      await setCommentHidden(item.target._id, true)
    }
    await resolveModerationReport(item.report._id, 'resolved', 'Đã ẩn nội dung')
    reload()
    setBusyId(null)
  }

  const deleteTarget = async (item: ModerationQueueItem) => {
    if (!confirm('Xóa vĩnh viễn nội dung này?')) return
    setBusyId(item.report._id)
    if (item.targetType === 'post') {
      await deletePost(item.target._id)
    } else {
      await deleteCommentAsMod(item.target._id)
    }
    await resolveModerationReport(item.report._id, 'resolved', 'Đã xóa')
    reload()
    setBusyId(null)
  }

  const pinTargetPost = async (postId: string, isPinned: boolean) => {
    setBusyId(postId)
    await pinPost(postId, isPinned)
    reload()
    setBusyId(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-4">
          <p className="text-xs text-violet-200/80 uppercase tracking-wide">Báo cáo mở</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats.openReports}</p>
        </div>
        <div className="rounded-xl border border-ds-border bg-white/5 p-4">
          <p className="text-xs text-ds-subtle uppercase tracking-wide">Bài đã ẩn</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats.hiddenPosts}</p>
        </div>
        <div className="rounded-xl border border-ds-border bg-white/5 p-4">
          <p className="text-xs text-ds-subtle uppercase tracking-wide">BL đã ẩn</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats.hiddenComments}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-ds-subtle text-sm">Đang tải hàng đợi…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 p-8 text-center text-ds-muted">
          Không có báo cáo đang chờ. Bạn vẫn có thể duyệt bài trực tiếp trên diễn đàn.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const busy = busyId === item.report._id
            const reasonLabel =
              REPORT_REASON_LABELS[item.report.reason as ReportReason] || item.report.reason
            const excerpt =
              item.targetType === 'post'
                ? plainTextExcerpt((item.target as { content?: string }).content, 200)
                : plainTextExcerpt(item.target.content, 160)
            const title =
              item.targetType === 'post'
                ? (item.target as { title?: string }).title
                : `Bình luận · ${item.target.authorName}`

            return (
              <li
                key={item.report._id}
                className="rounded-2xl border border-ds-border bg-ds-surface p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-amber-300/90">
                      {item.targetType === 'post' ? 'Bài viết' : 'Bình luận'} · {reasonLabel}
                    </span>
                    <h3 className="text-white font-medium mt-1">{title}</h3>
                    {item.post?.forumTitle && (
                      <p className="text-xs text-ds-subtle mt-0.5">
                        {item.post.forumTitle}
                        {item.post.forumSlug && (
                          <>
                            {' '}
                            ·{' '}
                            <Link href={`/community/${item.post.forumSlug}`} className="text-cyan-400 hover:underline">
                              mở diễn đàn
                            </Link>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-ds-subtle">
                    {new Date(item.report.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                {excerpt && <p className="text-sm text-ds-muted line-clamp-3">{excerpt}</p>}
                {item.report.details && (
                  <p className="text-xs text-amber-200/80 border-l-2 border-amber-500/40 pl-3">
                    {item.report.details}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.post?._id && (
                    <Link
                      href={`/community/post/${item.post._id}`}
                      className="px-3 py-1.5 rounded-lg border border-ds-border text-xs text-slate-200 hover:bg-white/5"
                    >
                      Xem bài
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void warnAuthor(item)}
                    className="px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    Cảnh báo
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void hideTarget(item)}
                    className="px-3 py-1.5 rounded-lg border border-violet-500/30 text-xs text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
                  >
                    Ẩn
                  </button>
                  {item.targetType === 'post' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void pinTargetPost(item.target._id, true)}
                      className="px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs text-cyan-200 hover:opacity-90/10 disabled:opacity-50"
                    >
                      Ghim
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteTarget(item)}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Xóa
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void dismiss(item.report._id)}
                    className="px-3 py-1.5 rounded-lg text-xs text-ds-muted hover:bg-white/5 disabled:opacity-50"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void resolve(item.report._id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/80 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Đã xử lý
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
