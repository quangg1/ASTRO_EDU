'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/design-system'
import {
  attachStagingFile,
  fetchAssignmentDraft,
  submitAssignment,
  uploadAssignmentStagingFile,
  validateAssignmentFiles,
} from '@/features/courses/api/assignmentApi'

type StagingFile = {
  storageKey: string
  url: string
  name: string
  mime: string
  size: number
  status?: string
}

export function AssignmentSubmit({
  courseSlug,
  lessonSlug,
  cohortId = null,
  backHref,
}: {
  courseSlug: string
  lessonSlug: string
  cohortId?: string | null
  backHref: string
}) {
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [files, setFiles] = useState<StagingFile[]>([])
  const [note, setNote] = useState('')
  const [stagingExpired, setStagingExpired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchAssignmentDraft(courseSlug, lessonSlug, cohortId)
    if (res.success && res.data) {
      setTitle(res.data.lessonTitle || '')
      setBrief(res.data.brief || '')
      setSubmissionId(res.data.id)
      setFiles(res.data.stagingFiles || [])
      setNote(res.data.note || '')
      setStagingExpired(Boolean(res.data.stagingExpired))
      if (res.data.status === 'submitted') setSubmitted(true)
    } else {
      setMsg(res.error || 'Không tải được bài tập')
    }
    setLoading(false)
  }, [courseSlug, lessonSlug, cohortId])

  useEffect(() => {
    void load()
  }, [load])

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length || !submissionId) return
    setBusy(true)
    setMsg(null)
    for (let i = 0; i < list.length; i += 1) {
      const file = list[i]
      const up = await uploadAssignmentStagingFile(file, submissionId, `file-${Date.now()}-${i}`)
      if (!up.success || !up.url || !up.storageKey) {
        setMsg(up.error || 'Upload thất bại')
        continue
      }
      const att = await attachStagingFile(
        courseSlug,
        lessonSlug,
        {
          storageKey: up.storageKey,
          url: up.url,
          name: file.name,
          mime: file.type,
          size: file.size,
        },
        cohortId,
      )
      if (att.success) setFiles(att.data)
    }
    setBusy(false)
  }

  const onSubmit = async () => {
    setBusy(true)
    const check = await validateAssignmentFiles(courseSlug, lessonSlug, cohortId)
    if (check.success && check.data?.stagingExpired) {
      setStagingExpired(true)
      setFiles(check.data.files || [])
      setMsg('File nháp đã quá hạn, vui lòng tải lên lại')
      setBusy(false)
      return
    }
    if (stagingExpired || files.some((f) => f.status === 'expired')) {
      setMsg('File nháp đã quá hạn, vui lòng tải lên lại')
      setBusy(false)
      return
    }
    const res = await submitAssignment(courseSlug, lessonSlug, note, cohortId)
    setBusy(false)
    if (res.success) {
      setSubmitted(true)
      setMsg(res.data?.isLate ? 'Đã nộp (trễ hạn)' : 'Đã nộp bài thành công')
    } else {
      setMsg(res.error || 'Nộp bài thất bại')
    }
  }

  if (loading) return <p className="p-8 text-ds-muted">Đang tải…</p>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href={backHref} className="text-xs text-ds-accent">← Quay lại</Link>
      <h1 className="text-xl font-semibold text-white">{title || 'Bài tập'}</h1>
      {brief && <p className="text-sm text-ds-muted whitespace-pre-wrap">{brief}</p>}

      {stagingExpired && (
        <p className="text-amber-300 text-sm border border-amber-500/30 rounded-lg px-3 py-2 bg-amber-950/20">
          File nháp đã quá hạn, vui lòng tải lên lại.
        </p>
      )}

      {!submitted && (
        <>
          <div className="rounded-xl border border-dashed border-ds-border p-6 text-center">
            <input
              type="file"
              multiple
              className="text-sm text-ds-muted"
              disabled={busy}
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <p className="text-[11px] text-ds-subtle mt-2">PDF, Word, ảnh, ZIP</p>
          </div>
          {files.length > 0 && (
            <ul className="space-y-2 text-sm text-gray-300">
              {files.map((f) => (
                <li key={f.storageKey} className="flex justify-between border border-ds-border rounded-lg px-3 py-2">
                  <span>{f.name}</span>
                  <span className="text-ds-subtle text-xs">{f.status === 'expired' ? 'Hết hạn' : 'OK'}</span>
                </li>
              ))}
            </ul>
          )}
          <label className="block text-xs text-ds-muted">
            Ghi chú
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 studio-field w-full"
            />
          </label>
          <Button
            type="button"
            disabled={busy || files.length === 0}
            onClick={() => void onSubmit()}
            className="bg-cyan-600 text-white hover:bg-cyan-500"
          >
            {busy ? 'Đang xử lý…' : 'Nộp bài'}
          </Button>
        </>
      )}

      {msg && <p className="text-sm text-ds-muted">{msg}</p>}
    </div>
  )
}
