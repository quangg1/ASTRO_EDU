'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/design-system'
import {
  createCohort,
  fetchCohortSubmissions,
  fetchCohortQuizAttempts,
  fetchCohortsManage,
  gradeSubmission,
  isoToDatetimeLocalInTz,
  patchCohort,
  type AssignmentSubmissionRow,
  type CohortSummary,
  type QuizAttemptGroup,
} from '@/features/courses/api/cohortApi'
import { CohortStudioAnnouncements } from '@/features/courses/cohort/CohortStudioAnnouncements'
import { CohortStudioGradebook } from '@/features/courses/cohort/CohortStudioGradebook'
import { CohortSchedulePanel } from '@/features/courses/cohort/CohortSchedulePanel'
import { CohortSelectedBar } from '@/features/courses/cohort/CohortSelectedBar'
import { formatOrderAmount } from '@/lib/money'

type Tab = 'cohorts' | 'schedule' | 'announcements' | 'inbox' | 'gradebook'

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
  const [cohortPriceLocal, setCohortPriceLocal] = useState('')
  const [cohortCurrencyLocal, setCohortCurrencyLocal] = useState('VND')
  const [msg, setMsg] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentSubmissionRow[]>([])
  const [quizGroups, setQuizGroups] = useState<QuizAttemptGroup[]>([])

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
    setCohortPriceLocal(selected.price != null ? String(selected.price) : '')
    setCohortCurrencyLocal(selected.currency || 'VND')
  }, [selectedId, selected?.price, selected?.currency])

  useEffect(() => {
    if (!selected) return
    const tz = selected.timezone || 'Asia/Ho_Chi_Minh'
    setCohortTimezone(tz)
    setCohortStatus(selected.status || 'draft')
    setCohortStartLocal(isoToDatetimeLocalInTz(selected.startAt, tz))
    setCohortEndLocal(isoToDatetimeLocalInTz(selected.endAt, tz))
  }, [selected])

  const loadInbox = async (cohortId: string) => {
    const [sub, quiz] = await Promise.all([
      fetchCohortSubmissions(courseSlug, cohortId, 'submitted'),
      fetchCohortQuizAttempts(courseSlug, cohortId),
    ])
    if (sub.success) setSubmissions(sub.data || [])
    if (quiz.success) setQuizGroups(quiz.data || [])
  }

  const handleCreate = async () => {
    const title = newTitle.trim() || `${courseTitle} — Lớp mới`
    const res = await createCohort(courseSlug, { title, status: 'open' })
    if (res.success) {
      setNewTitle('')
      setMsg('Đã tạo lớp «' + (res.data?.title || title) + '»')
      await loadCohorts()
      const id = res.data?._id || res.data?.id
      if (id) {
        setSelectedId(String(id))
        setTab('schedule')
      }
    } else {
      setMsg(res.error || 'Lỗi tạo lớp')
    }
  }

  return (
    <div className="min-h-screen bg-ds-base pt-16 pb-10">
      <div className={`mx-auto px-4 space-y-4 ${tab === 'schedule' ? 'max-w-5xl' : 'max-w-4xl'}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/studio/${courseSlug}`} className="text-xs text-ds-accent">
            ← Soạn khóa học
          </Link>
          <h1 className="text-lg font-semibold text-white">Lớp học theo kỳ · {courseTitle}</h1>
        </div>

        <div className="flex gap-1 border-b border-ds-border pb-1 flex-wrap">
          {(
            [
              ['cohorts', 'Danh sách lớp'],
              ['schedule', 'Lịch mở bài'],
              ['announcements', 'Thông báo'],
              ['inbox', 'Chấm bài'],
              ['gradebook', 'Bảng điểm'],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                if (t === 'inbox' && selectedId) void loadInbox(selectedId)
              }}
              className={`px-3 py-1.5 text-xs rounded-lg ${
                tab === t ? 'bg-cyan-600 text-white' : 'text-ds-subtle hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && <p className="text-sm text-amber-200">{msg}</p>}

        {tab !== 'cohorts' && cohorts.length > 0 && (
          <CohortSelectedBar
            cohorts={cohorts}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              setMsg(null)
              if (tab === 'inbox') void loadInbox(id)
            }}
          />
        )}

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
                            title="Mở đăng ký — học viên chọn lớp trên trang khóa học"
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
            {selected && (
              <div className="mt-4 rounded-xl border border-purple-500/25 bg-purple-950/15 p-4 space-y-3">
                <p className="text-xs font-medium text-white">Giá lớp: {selected.title}</p>
                <p className="text-[10px] text-ds-subtle">
                  Để trống học phí = dùng giá lớp mặc định của khóa (Storefront). Có thể đặt riêng cho từng kỳ.
                </p>
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="text-[11px] text-ds-muted">
                    Học phí
                    <input
                      type="number"
                      min={0}
                      value={cohortPriceLocal}
                      onChange={(e) => setCohortPriceLocal(e.target.value)}
                      placeholder="Mặc định khóa"
                      className="studio-field mt-1 w-28 text-xs block"
                    />
                  </label>
                  <label className="text-[11px] text-ds-muted">
                    Tiền tệ
                    <select
                      value={cohortCurrencyLocal}
                      onChange={(e) => setCohortCurrencyLocal(e.target.value)}
                      className="studio-field mt-1 text-xs block"
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const id = String(selected.id || selected._id)
                      void patchCohort(courseSlug, id, {
                        price: cohortPriceLocal === '' ? null : Math.max(0, Number(cohortPriceLocal) || 0),
                        currency: cohortCurrencyLocal,
                      }).then((res) => {
                        if (res.success) {
                          setMsg('Đã lưu giá lớp')
                          void loadCohorts()
                        } else setMsg(res.error || 'Lỗi lưu giá')
                      })
                    }}
                  >
                    Lưu giá lớp
                  </Button>
                </div>
                {selected.price != null && selected.price > 0 && (
                  <p className="text-[10px] text-purple-200/90 tabular-nums">
                    Hiện tại: {formatOrderAmount(selected.price, selected.currency || 'VND')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'schedule' && (
          <CohortSchedulePanel
            courseSlug={courseSlug}
            lessonCount={lessonCount}
            selectedId={selectedId}
            cohorts={cohorts}
            cohortStatus={cohortStatus}
            cohortStartLocal={cohortStartLocal}
            cohortEndLocal={cohortEndLocal}
            cohortTimezone={cohortTimezone}
            onCohortMetaChange={(patch) => {
              if (patch.status != null) setCohortStatus(patch.status)
              if (patch.startLocal != null) setCohortStartLocal(patch.startLocal)
              if (patch.endLocal != null) setCohortEndLocal(patch.endLocal)
              if (patch.timezone != null) setCohortTimezone(patch.timezone)
            }}
            onMsg={setMsg}
          />
        )}

        {tab === 'announcements' && (
          <div>
            {!selectedId ? (
              <p className="text-ds-muted text-sm">Chọn một lớp ở tab Danh sách lớp trước.</p>
            ) : (
              <CohortStudioAnnouncements courseSlug={courseSlug} cohortId={selectedId} />
            )}
          </div>
        )}

        {tab === 'gradebook' && (
          <div>
            {!selectedId ? (
              <p className="text-ds-muted text-sm">Chọn một lớp ở tab Danh sách lớp trước.</p>
            ) : (
              <CohortStudioGradebook courseSlug={courseSlug} cohortId={selectedId} />
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
              <h2 className="text-sm font-semibold text-white mb-2">Bài tập chờ chấm</h2>
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
              {quizGroups.length === 0 ? (
                <p className="text-ds-subtle text-sm">Chưa có lượt làm bài.</p>
              ) : (
                <ul className="space-y-3">
                  {quizGroups.map((g) => (
                    <QuizAttemptGroupCard key={`${g.userId}-${g.lessonSlug}`} group={g} />
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

function QuizAttemptGroupCard({ group }: { group: QuizAttemptGroup }) {
  const [expanded, setExpanded] = useState(false)
  const latest = group.latestAttempt || group.attempts[0]
  const latestScore = latest?.score ?? group.bestScore
  const canExpand = group.attemptCount > 1

  const inner = (
    <>
      <div className="min-w-0">
        <p className="text-white font-medium truncate">{group.lessonTitle}</p>
        <p className="text-[11px] text-ds-subtle mt-0.5">
          {group.studentName}
          {group.attemptCount > 1 ? ` · ${group.attemptCount} lượt` : ''}
          {group.maxAttempts > 1 ? ` · tối đa ${group.maxAttempts}` : ''}
        </p>
        {latest?.submittedAt && (
          <p className="text-[10px] text-ds-subtle mt-0.5">
            {group.attemptCount > 1 ? 'Lần gần nhất: ' : ''}
            {new Date(latest.submittedAt).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-ds-accent font-semibold tabular-nums">{latestScore ?? '—'}%</p>
        {group.bestScore != null && group.attemptCount > 1 && group.bestScore !== latestScore && (
          <p className="text-[10px] text-emerald-300">Cao nhất {group.bestScore}%</p>
        )}
        {canExpand && (
          <p className="text-[10px] text-ds-subtle mt-0.5">{expanded ? 'Thu gọn' : 'Chi tiết'}</p>
        )}
      </div>
    </>
  )

  return (
    <li className="rounded-xl border border-ds-border bg-ds-overlay overflow-hidden">
      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
        >
          {inner}
        </button>
      ) : (
        <div className="w-full px-4 py-3 flex items-start justify-between gap-3">{inner}</div>
      )}
      {expanded && canExpand && (
        <ul className="border-t border-ds-border/60 divide-y divide-ds-border/40">
          {group.attempts.map((a) => (
            <li key={a.id} className="px-4 py-2 flex justify-between text-xs text-ds-muted">
              <span>
                Lần {a.attemptNumber}
                {a.submittedAt ? ` · ${new Date(a.submittedAt).toLocaleString('vi-VN')}` : ''}
              </span>
              <span className="text-ds-accent tabular-nums">{a.score ?? '—'}%</span>
            </li>
          ))}
        </ul>
      )}
    </li>
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
            {row.studentName || row.userId.slice(0, 12)} ·{' '}
            {row.submittedAt ? new Date(row.submittedAt).toLocaleString('vi-VN') : ''}
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
        <label className="text-xs text-ds-muted flex-1 block">
          Nhận xét
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            className="studio-field mt-1 w-full resize-y min-h-[52px]"
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
