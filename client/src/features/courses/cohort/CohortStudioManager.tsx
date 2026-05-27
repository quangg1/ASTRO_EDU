'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/design-system'
import {
  createCohort,
  fetchCohortSchedules,
  fetchCohortSubmissions,
  fetchCohortQuizAttempts,
  fetchCohortsManage,
  gradeSubmission,
  isoToDatetimeLocalInTz,
  patchCohort,
  saveCohortSchedules,
  type AssignmentSubmissionRow,
  type CohortSummary,
  type ScheduleLessonRow,
} from '@/features/courses/api/cohortApi'

type Tab = 'cohorts' | 'schedule' | 'inbox'

export function CohortStudioManager({
  courseSlug,
  courseTitle,
  lessonCount = 0,
}: {
  courseSlug: string
  courseTitle: string
  lessonCount?: number
}) {
  const [tab, setTab] = useState<Tab>('cohorts')
  const [cohorts, setCohorts] = useState<CohortSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cohortStatus, setCohortStatus] = useState('open')
  const [cohortStartLocal, setCohortStartLocal] = useState('')
  const [cohortEndLocal, setCohortEndLocal] = useState('')
  const [cohortTimezone, setCohortTimezone] = useState('Asia/Ho_Chi_Minh')
  const [newTitle, setNewTitle] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [scheduleRows, setScheduleRows] = useState<ScheduleLessonRow[]>([])
  const [cohortMeta, setCohortMeta] = useState<{ title: string; inviteCode?: string; timezone?: string } | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentSubmissionRow[]>([])
  const [quizAttempts, setQuizAttempts] = useState<
    { id: string; userId: string; lessonTitle: string; score?: number; submittedAt?: string }[]
  >([])

  const cohortsLoadedRef = useRef('')

  const loadCohorts = useCallback(async () => {
    const res = await fetchCohortsManage(courseSlug)
    if (res.success) setCohorts(res.data || [])
  }, [courseSlug])

  useEffect(() => {
    if (cohortsLoadedRef.current === courseSlug) return
    cohortsLoadedRef.current = courseSlug
    void loadCohorts()
  }, [courseSlug, loadCohorts])

  useEffect(() => {
    if (selectedId || cohorts.length === 0) return
    const id = String(cohorts[0].id || cohorts[0]._id)
    setSelectedId(id)
  }, [cohorts, selectedId])

  const selected = cohorts.find((c) => (c.id || c._id) === selectedId)

  useEffect(() => {
    if (!selected) return
    const tz = selected.timezone || 'Asia/Ho_Chi_Minh'
    setCohortTimezone(tz)
    setCohortStatus(selected.status || 'draft')
    setCohortStartLocal(isoToDatetimeLocalInTz(selected.startAt, tz))
    setCohortEndLocal(isoToDatetimeLocalInTz(selected.endAt, tz))
  }, [selected])

  useEffect(() => {
    if (tab === 'schedule' && selectedId) void loadSchedule(selectedId)
  }, [tab, selectedId, courseSlug])

  const loadSchedule = async (cohortId: string) => {
    const res = await fetchCohortSchedules(courseSlug, cohortId)
    if (res.success && res.data) {
      setScheduleRows(res.data.lessons || [])
      setCohortMeta(res.data.cohort)
      setMsg(null)
    } else {
      setMsg(res.error || 'Không tải được lịch lớp')
    }
  }

  const handleSaveCohortMeta = async () => {
    if (!selectedId) return
    const res = await patchCohort(courseSlug, selectedId, {
      status: cohortStatus,
      timezone: cohortTimezone,
      startAt: cohortStartLocal || null,
      endAt: cohortEndLocal || null,
    })
    if (res.success) {
      setMsg('Đã lưu thông tin lớp')
      await loadCohorts()
    } else {
      setMsg(res.error || 'Lỗi lưu lớp')
    }
  }

  const loadInbox = async (cohortId: string) => {
    const [sub, quiz] = await Promise.all([
      fetchCohortSubmissions(courseSlug, cohortId, 'submitted'),
      fetchCohortQuizAttempts(courseSlug, cohortId),
    ])
    if (sub.success) setSubmissions(sub.data || [])
    if (quiz.success) setQuizAttempts(quiz.data || [])
  }

  const handleCreate = async () => {
    const title = newTitle.trim() || `${courseTitle} — Lớp mới`
    const res = await createCohort(courseSlug, { title, status: 'open' })
    if (res.success) {
      setNewTitle('')
      setMsg('Đã tạo lớp · mã: ' + (res.data?.inviteCode || ''))
      await loadCohorts()
      const id = res.data?._id || res.data?.id
      if (id) {
        setSelectedId(String(id))
        setTab('schedule')
        void loadSchedule(String(id))
      }
    } else {
      setMsg(res.error || 'Lỗi tạo lớp')
    }
  }

  const cohortTz = cohortMeta?.timezone || 'Asia/Ho_Chi_Minh'

  const scheduleLocalValue = (v: string | Date | null | undefined) => {
    if (!v) return ''
    if (typeof v === 'string' && v.length === 16 && !v.endsWith('Z')) return v
    return isoToDatetimeLocalInTz(v, cohortTz)
  }

  const handleSaveSchedules = async () => {
    if (!selectedId) return
    const toLocal = (v: string | Date | null | undefined) => {
      if (!v) return null
      if (typeof v === 'string' && v.length === 16 && !v.endsWith('Z')) return v
      return isoToDatetimeLocalInTz(v, cohortTz) || null
    }
    const schedules = scheduleRows.map((r) => ({
      lessonSlug: r.slug,
      openAtLocal: toLocal(r.schedule.openAt),
      dueAtLocal: toLocal(r.schedule.dueAt),
      closeAtLocal: toLocal(r.schedule.closeAt),
    }))
    const res = await saveCohortSchedules(courseSlug, selectedId, schedules)
    setMsg(res.success ? `Đã lưu lịch (${cohortTz} → UTC)` : res.error || 'Lỗi lưu')
  }

  const patchScheduleLocal = (idx: number, field: 'openAt' | 'dueAt' | 'closeAt', local: string) => {
    setScheduleRows((rows) => {
      const next = [...rows]
      next[idx] = {
        ...next[idx],
        schedule: {
          ...next[idx].schedule,
          [field]: local || null,
        },
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-ds-base pt-16 pb-10">
      <div className="max-w-4xl mx-auto px-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/studio/${courseSlug}`} className="text-xs text-ds-accent">
            ← Soạn khóa học
          </Link>
          <h1 className="text-lg font-semibold text-white">Lớp học theo kỳ · {courseTitle}</h1>
        </div>

        <div className="flex gap-1 border-b border-ds-border pb-1">
          {(['cohorts', 'schedule', 'inbox'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                if (t === 'schedule' && selectedId) void loadSchedule(selectedId)
                if (t === 'inbox' && selectedId) void loadInbox(selectedId)
              }}
              className={`px-3 py-1.5 text-xs rounded-lg ${
                tab === t ? 'bg-cyan-600 text-white' : 'text-ds-subtle hover:bg-white/5'
              }`}
            >
              {t === 'cohorts' ? 'Danh sách lớp' : t === 'schedule' ? 'Lịch mở bài' : 'Chấm bài'}
            </button>
          ))}
        </div>

        {msg && <p className="text-sm text-amber-200">{msg}</p>}

        {tab === 'cohorts' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Tên lớp mới (vd. HK2 2026)"
                className="studio-field flex-1"
              />
              <Button type="button" onClick={() => void handleCreate()} className="bg-cyan-600 text-white shrink-0">
                + Tạo lớp
              </Button>
            </div>
            <p className="text-[11px] text-ds-subtle mb-3">
              <strong className="text-ds-muted">Bấm vào thẻ lớp</strong> (viền xanh) hoặc{' '}
              <strong className="text-ds-muted">Chỉnh lịch →</strong>, rồi tab{' '}
              <strong className="text-ds-muted">Lịch mở bài</strong> để đặt ngày mở từng bài.
              {lessonCount === 0 && (
                <>
                  {' '}
                  Khóa đang <strong className="text-amber-200">0 bài</strong> —{' '}
                  <Link href={`/studio/${courseSlug}`} className="text-ds-accent hover:underline">
                    thêm bài trong Studio
                  </Link>{' '}
                  trước khi chỉnh lịch.
                </>
              )}
            </p>
            <ul className="space-y-2">
              {cohorts.map((c) => {
                const id = String(c.id || c._id)
                return (
                  <li
                    key={id}
                    className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                      selectedId === id ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-ds-border bg-ds-overlay'
                    }`}
                    onClick={() => {
                      setSelectedId(id)
                      setMsg(null)
                    }}
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-white font-medium">{c.title}</p>
                        <p className="text-[11px] text-ds-subtle mt-1">
                          Mã lớp: <span className="font-mono text-ds-accent">{c.inviteCode}</span> ·{' '}
                          {c.studentCount ?? 0} học sinh · {c.status}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0 items-end">
                        <button
                          type="button"
                          className="text-[11px] text-ds-accent hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(id)
                            setTab('schedule')
                            void loadSchedule(id)
                          }}
                        >
                          Chỉnh lịch →
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-ds-muted hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(id)
                            setTab('inbox')
                            void loadInbox(id)
                          }}
                        >
                          Chấm bài
                        </button>
                        <Link
                          href={`/courses/${courseSlug}/cohort/${id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-ds-subtle hover:text-ds-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Xem như HV ↗
                        </Link>
                        {c.status !== 'open' && (
                          <button
                            type="button"
                            className="text-[10px] text-emerald-400"
                            title="Cho phép học viên tham gia bằng mã lớp"
                            onClick={(e) => {
                              e.stopPropagation()
                              void patchCohort(courseSlug, id, { status: 'open' }).then(() => loadCohorts())
                            }}
                          >
                            Cho HV vào lớp
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-4">
            {!selectedId && (
              <p className="text-ds-muted text-sm rounded-xl border border-ds-border p-4">
                Chưa chọn lớp — quay lại tab <strong>Danh sách lớp</strong> và bấm vào một lớp (hoặc{' '}
                <strong>Chỉnh lịch →</strong>).
              </p>
            )}
            {selectedId && (
              <>
            <section className="rounded-xl border border-ds-border bg-ds-overlay p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Thông tin lớp</h2>
              <p className="text-[11px] text-ds-subtle">
                <strong className="text-ds-muted">Trạng thái open</strong> = học viên được nhập mã tham gia.{' '}
                <strong className="text-ds-muted">Lịch từng bài</strong> (bảng bên dưới) = thời điểm mở quiz / hạn nộp bài.
              </p>
              {cohortMeta && (
                <p className="text-xs text-ds-muted">
                  {cohortMeta.title} · Mã <span className="font-mono text-ds-accent">{cohortMeta.inviteCode}</span>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-[11px] text-ds-muted">
                  Trạng thái lớp
                  <select
                    value={cohortStatus}
                    onChange={(e) => setCohortStatus(e.target.value)}
                    className="studio-field text-xs mt-1 w-full"
                  >
                    <option value="draft">Nháp (chưa cho vào)</option>
                    <option value="open">Mở — HV được tham gia</option>
                    <option value="closed">Đóng</option>
                  </select>
                </label>
                <label className="text-[11px] text-ds-muted">
                  Múi giờ
                  <input
                    value={cohortTimezone}
                    onChange={(e) => setCohortTimezone(e.target.value)}
                    className="studio-field text-xs mt-1 w-full"
                    placeholder="Asia/Ho_Chi_Minh"
                  />
                </label>
                <label className="text-[11px] text-ds-muted">
                  Bắt đầu lớp (tuỳ chọn)
                  <input
                    type="datetime-local"
                    value={cohortStartLocal}
                    onChange={(e) => setCohortStartLocal(e.target.value)}
                    className="studio-field text-xs mt-1 w-full"
                  />
                </label>
                <label className="text-[11px] text-ds-muted">
                  Kết thúc lớp (tuỳ chọn)
                  <input
                    type="datetime-local"
                    value={cohortEndLocal}
                    onChange={(e) => setCohortEndLocal(e.target.value)}
                    className="studio-field text-xs mt-1 w-full"
                  />
                </label>
              </div>
              <Button type="button" onClick={() => void handleSaveCohortMeta()} variant="secondary" size="sm">
                Lưu thông tin lớp
              </Button>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">Lịch mở từng bài ({lessonCount} bài trong khóa)</h2>
              {lessonCount === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Chưa có bài học trong khóa — không thể chỉnh lịch mở bài.{' '}
                  <Link href={`/studio/${courseSlug}`} className="text-ds-accent underline">
                    Thêm bài ở Studio
                  </Link>
                  , lưu khóa, rồi quay lại đây.
                </div>
              ) : scheduleRows.length === 0 ? (
                <p className="text-ds-subtle text-sm">Đang tải danh sách bài…</p>
              ) : null}
            {lessonCount > 0 && scheduleRows.length > 0 && (
            <div className="rounded-xl border border-ds-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-white/5 text-ds-subtle">
                  <tr>
                    <th className="text-left p-2">Bài</th>
                    <th className="text-left p-2">Loại</th>
                    <th className="text-left p-2">Mở</th>
                    <th className="text-left p-2">Hạn (assignment)</th>
                    <th className="text-left p-2">Đóng (quiz)</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.map((row, idx) => (
                    <tr key={row.slug} className="border-t border-ds-border">
                      <td className="p-2 text-gray-200">{row.title}</td>
                      <td className="p-2 text-ds-subtle">{row.type}</td>
                      <td className="p-2">
                        <input
                          type="datetime-local"
                          className="studio-field text-[10px] w-full min-w-[140px]"
                          value={scheduleLocalValue(row.schedule.openAt)}
                          onChange={(e) => patchScheduleLocal(idx, 'openAt', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="datetime-local"
                          className="studio-field text-[10px] w-full min-w-[140px]"
                          value={scheduleLocalValue(row.schedule.dueAt)}
                          onChange={(e) => patchScheduleLocal(idx, 'dueAt', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="datetime-local"
                          className="studio-field text-[10px] w-full min-w-[140px]"
                          value={scheduleLocalValue(row.schedule.closeAt)}
                          onChange={(e) => patchScheduleLocal(idx, 'closeAt', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            {lessonCount > 0 && scheduleRows.length > 0 && (
              <Button type="button" onClick={() => void handleSaveSchedules()} className="bg-cyan-600 text-white">
                Lưu lịch từng bài
              </Button>
            )}
            </section>
              </>
            )}
          </div>
        )}

        {tab === 'inbox' && (
          <div className="space-y-6">
            {!selectedId && (
              <p className="text-ds-muted text-sm">Chọn một lớp ở tab Danh sách lớp trước.</p>
            )}
            {selectedId && (
              <>
            <section>
              <h2 className="text-sm font-semibold text-white mb-2">Bài tập đã nộp</h2>
              {submissions.length === 0 ? (
                <p className="text-ds-subtle text-sm">Chưa có bài nộp.</p>
              ) : (
                <ul className="space-y-3">
                  {submissions.map((s) => (
                    <SubmissionGradeCard
                      key={s.id}
                      row={s}
                      onGrade={async (grade, feedback) => {
                        const res = await gradeSubmission(courseSlug, selectedId, s.id, { grade, feedback })
                        if (res.success) void loadInbox(selectedId)
                        else setMsg(res.error)
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-sm font-semibold text-white mb-2">Bài kiểm tra</h2>
              {quizAttempts.length === 0 ? (
                <p className="text-ds-subtle text-sm">Chưa có lượt làm bài.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {quizAttempts.map((a) => (
                    <li key={a.id} className="rounded-lg border border-ds-border px-3 py-2 flex justify-between">
                      <span className="text-gray-200">
                        {a.lessonTitle} · <span className="text-ds-subtle font-mono text-xs">{a.userId.slice(0, 8)}…</span>
                      </span>
                      <span className="text-ds-accent">{a.score ?? '—'}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SubmissionGradeCard({
  row,
  onGrade,
}: {
  row: AssignmentSubmissionRow
  onGrade: (grade: number, feedback: string) => Promise<void>
}) {
  const [grade, setGrade] = useState(row.grade != null ? String(row.grade) : '')
  const [feedback, setFeedback] = useState(row.feedback || '')
  const [busy, setBusy] = useState(false)

  return (
    <li className="rounded-xl border border-ds-border bg-ds-overlay p-4 space-y-2">
      <div className="flex justify-between gap-2">
        <div>
          <p className="text-white font-medium">{row.lessonTitle}</p>
          <p className="text-[11px] text-ds-subtle">
            HS {row.userId.slice(0, 12)}… · {row.submittedAt ? new Date(row.submittedAt).toLocaleString('vi-VN') : ''}
            {row.isLate ? ' · Muộn' : ''}
          </p>
        </div>
        <span className="text-[10px] text-ds-subtle">{row.status}</span>
      </div>
      {row.files?.length > 0 && (
        <ul className="text-xs space-y-1">
          {row.files.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noreferrer" className="text-ds-accent hover:underline">
                {f.name || 'File'}
              </a>
            </li>
          ))}
        </ul>
      )}
      {row.note && <p className="text-xs text-ds-muted italic">{row.note}</p>}
      <div className="flex gap-2 items-end">
        <label className="text-xs text-ds-muted">
          Điểm
          <input
            type="number"
            min={0}
            max={100}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="studio-field mt-1 w-20"
          />
        </label>
        <label className="text-xs text-ds-muted flex-1">
          Nhận xét
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="studio-field mt-1 w-full"
          />
        </label>
        <Button
          type="button"
          disabled={busy}
          className="bg-cyan-600 text-white shrink-0"
          onClick={() => {
            setBusy(true)
            void onGrade(Number(grade) || 0, feedback).finally(() => setBusy(false))
          }}
        >
          Chấm
        </Button>
      </div>
    </li>
  )
}
