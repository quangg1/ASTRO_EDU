'use client'

import { useState } from 'react'
import {
  REPORT_REASON_LABELS,
  submitCommunityReport,
  type ReportReason,
} from '@/features/community/api/moderationApi'

type Props = {
  targetType: 'post' | 'comment'
  targetId: string
  className?: string
}

export function ReportContentButton({ targetType, targetId, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    const res = await submitCommunityReport({ targetType, targetId, reason, details })
    setSubmitting(false)
    if (res.success) {
      setDone(true)
      setOpen(false)
    } else {
      alert(res.error || 'Không gửi được báo cáo')
    }
  }

  if (done) {
    return <span className={`text-xs text-ds-subtle ${className}`}>Đã gửi báo cáo — cảm ơn bạn</span>
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-ds-muted hover:text-amber-200 underline"
      >
        Báo cáo vi phạm
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-sm text-amber-100/90 font-medium">Báo cáo nội dung</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="w-full rounded-lg bg-ds-elevated/80 border border-ds-border px-3 py-2 text-sm text-white"
          >
            {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((k) => (
              <option key={k} value={k}>
                {REPORT_REASON_LABELS[k]}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Mô tả thêm (tùy chọn)"
            rows={2}
            className="w-full rounded-lg bg-ds-elevated/80 border border-ds-border px-3 py-2 text-sm text-white resize-y"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-ds-muted">
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm disabled:opacity-50"
            >
              {submitting ? 'Đang gửi…' : 'Gửi báo cáo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
