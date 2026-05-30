'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { isHtmlFragmentEmpty } from '@/features/community/lib/postContent'

const CommentRichEditor = dynamic(
  () => import('@/components/community/comments/CommentRichEditor').then((m) => m.CommentRichEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100px] rounded-xl border border-white/15 bg-black/30 animate-pulse" aria-hidden />
    ),
  },
)

type Props = {
  onSubmit: (contentHtml: string) => Promise<boolean>
  placeholder?: string
  submitLabel?: string
  onCancel?: () => void
  autoFocus?: boolean
}

export function CommentComposer({
  onSubmit,
  placeholder = 'Viết bình luận…',
  submitLabel = 'Gửi',
  onCancel,
}: Props) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (isHtmlFragmentEmpty(content)) return
    setSubmitting(true)
    const ok = await onSubmit(content.trim())
    setSubmitting(false)
    if (ok) setContent('')
  }

  return (
    <div className="space-y-2">
      <CommentRichEditor
        value={content}
        onChange={setContent}
        placeholder={placeholder}
        disabled={submitting}
      />
      <p className="text-[11px] text-slate-500">
        Định dạng cơ bản, emoji, ảnh và link — giống Reddit. Markdown cũ vẫn hiển thị bình thường.
      </p>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/5"
          >
            Hủy
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || isHtmlFragmentEmpty(content)}
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-cyan-500"
        >
          {submitting ? 'Đang gửi…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
