'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Trash2 } from 'lucide-react'
import {
  createCohortAnnouncement,
  deleteCohortAnnouncement,
  fetchCohortAnnouncements,
  type CohortAnnouncementRow,
} from '@/features/courses/api/cohortApi'
import { Button } from '@/design-system'

export function CohortStudioAnnouncements({
  courseSlug,
  cohortId,
}: {
  courseSlug: string
  cohortId: string
}) {
  const [rows, setRows] = useState<CohortAnnouncementRow[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetchCohortAnnouncements(courseSlug, cohortId)
    if (res.success) setRows(res.data || [])
  }, [courseSlug, cohortId])

  useEffect(() => {
    void load()
  }, [load])

  const onCreate = async () => {
    if (!title.trim()) {
      setMsg('Nhập tiêu đề thông báo')
      return
    }
    setBusy(true)
    setMsg(null)
    const res = await createCohortAnnouncement(courseSlug, cohortId, {
      title: title.trim(),
      body: body.trim(),
      pinned,
      notifyEmail,
    })
    setBusy(false)
    if (res.success) {
      setTitle('')
      setBody('')
      setPinned(false)
      setNotifyEmail(false)
      setMsg('Đã đăng thông báo')
      await load()
    } else {
      setMsg(res.error || 'Lỗi đăng thông báo')
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Xóa thông báo này?')) return
    const res = await deleteCohortAnnouncement(courseSlug, cohortId, id)
    if (res.success) await load()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-violet-200">
          <Megaphone className="w-4 h-4" aria-hidden />
          <h3 className="text-sm font-semibold">Đăng thông báo lớp</h3>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề (vd: Buổi live Q&A tối thứ 6)"
          className="studio-field w-full"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Nội dung (markdown) — deadline, link Zoom, nhắc bài…"
          className="studio-field w-full"
        />
        <div className="flex flex-wrap gap-4 text-xs text-ds-muted">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Ghim lên đầu
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
            Gửi email cho học viên
          </label>
        </div>
        <Button
          type="button"
          disabled={busy}
          className="bg-violet-600 text-white hover:bg-violet-500"
          onClick={() => void onCreate()}
        >
          {busy ? 'Đang đăng…' : 'Đăng thông báo'}
        </Button>
        {msg && <p className="text-xs text-ds-muted">{msg}</p>}
      </div>

      <ul className="space-y-2">
        {rows.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-ds-border bg-ds-overlay px-4 py-3 flex justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-white font-medium text-sm">
                {a.pinned ? '📌 ' : ''}
                {a.title}
              </p>
              <p className="text-[11px] text-ds-subtle mt-0.5">
                {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : ''}
              </p>
              {a.body && <p className="text-xs text-ds-muted mt-2 line-clamp-3 whitespace-pre-wrap">{a.body}</p>}
            </div>
            <button
              type="button"
              className="text-ds-subtle hover:text-red-400 shrink-0 p-1"
              aria-label="Xóa thông báo"
              onClick={() => void onDelete(a.id)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-ds-muted">Chưa có thông báo.</p>}
      </ul>
    </div>
  )
}
