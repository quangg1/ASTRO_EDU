'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import {
  enrollCohort,
  fetchCourseCohorts,
  fetchMyCohorts,
  resendCohortInviteEmail,
  type CohortSummary,
  type MyCohortRow,
} from '@/features/courses/api/cohortApi'
import { Button } from '@/design-system'
import { formatOrderAmount } from '@/lib/money'

function formatCohortStart(iso?: string, tz = 'Asia/Ho_Chi_Minh') {
  if (!iso) return 'Chưa có lịch khai giảng'
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    })
  } catch {
    return iso
  }
}

function cohortIdOf(c: CohortSummary) {
  return String(c.id ?? c._id ?? '')
}

export function CourseCohortsJoin({
  courseSlug,
  courseId,
  cohortPlacedFlash,
}: {
  courseSlug: string
  courseId?: string
  cohortPlacedFlash?: boolean
}) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [openCohorts, setOpenCohorts] = useState<CohortSummary[]>([])
  const [myCohorts, setMyCohorts] = useState<MyCohortRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendBusyId, setResendBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const cohortsListedRef = useRef('')
  const myCohortsKeyRef = useRef('')

  const myCohortIds = useMemo(() => new Set(myCohorts.map((c) => c.id)), [myCohorts])

  const enrollableCohorts = useMemo(
    () => openCohorts.filter((c) => !myCohortIds.has(cohortIdOf(c))),
    [openCohorts, myCohortIds],
  )

  const selectedCohort = useMemo(
    () => enrollableCohorts.find((c) => cohortIdOf(c) === selectedId) ?? null,
    [enrollableCohorts, selectedId],
  )

  const cohortRequiresPay = Boolean(
    selectedCohort?.requiresPayment ?? (selectedCohort?.price != null && selectedCohort.price > 0),
  )
  const cohortListPrice = selectedCohort?.price ?? 0
  const cohortCurrency = selectedCohort?.currency || 'VND'

  useEffect(() => {
    if (cohortsListedRef.current === courseSlug) return
    cohortsListedRef.current = courseSlug
    void fetchCourseCohorts(courseSlug).then((res) => {
      if (res.success) setOpenCohorts(res.data || [])
    })
  }, [courseSlug])

  useEffect(() => {
    if (!user?.id) return
    const key = `${courseSlug}:${user.id}`
    if (myCohortsKeyRef.current === key) return
    myCohortsKeyRef.current = key
    void fetchMyCohorts(courseSlug).then((res) => {
      if (res.success) setMyCohorts(res.data || [])
    })
  }, [courseSlug, user?.id])

  const refreshMyCohorts = () => {
    if (!user?.id) return
    void fetchMyCohorts(courseSlug).then((res) => {
      if (res.success) setMyCohorts(res.data || [])
    })
  }

  const handleResendEmail = async (cohortId: string) => {
    if (!user) return
    setResendBusyId(cohortId)
    setMsg(null)
    const res = await resendCohortInviteEmail(courseSlug, cohortId)
    setResendBusyId(null)
    if (res.success && res.data?.emailSent) {
      setMsg(res.data.message || 'Đã gửi lại email xác nhận.')
      refreshMyCohorts()
      return
    }
    setMsg(res.error || res.data?.message || 'Chưa gửi được email. Thử lại sau hoặc liên hệ giáo viên.')
  }

  const handleEnroll = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${courseSlug}`)
      return
    }
    const cohortId = selectedId
    if (!cohortId) {
      setMsg('Chọn một lớp đang mở đăng ký.')
      return
    }
    setBusy(true)
    setMsg(null)

    if (cohortRequiresPay) {
      const q = new URLSearchParams()
      if (courseId) q.set('courseId', courseId)
      q.set('cohortId', cohortId)
      router.push(`/courses/${courseSlug}/checkout?${q.toString()}`)
      setBusy(false)
      return
    }

    const res = await enrollCohort(courseSlug, cohortId)
    setBusy(false)
    if (res.success && res.data?.cohortId) {
      if (res.data.inviteEmailSent === false && res.data.message) {
        setMsg(res.data.message)
        refreshMyCohorts()
        return
      }
      router.push(`/courses/${courseSlug}/cohort/${res.data.cohortId}`)
      return
    }
    if (res.requiresPayment || res.code === 'payment_required') {
      const q = new URLSearchParams()
      if (courseId) q.set('courseId', courseId)
      q.set('cohortId', cohortId)
      router.push(`/courses/${courseSlug}/checkout?${q.toString()}`)
      return
    }
    setMsg(res.error || 'Không đăng ký được lớp')
  }

  return (
    <section className="rounded-2xl border border-purple-500/25 bg-purple-950/15 p-6 mb-8">
      <h2 className="text-lg font-semibold text-white mb-1">Đăng ký lớp học</h2>
      <p className="text-xs text-ds-subtle mb-4">
        Khóa theo lớp có giáo viên và lịch mở bài theo tuần. Chọn lớp trước ngày khai giảng — sau khi đăng
        ký, vào thẳng từ mục «Lớp của bạn» bên dưới.
      </p>

      {cohortPlacedFlash && (
        <p className="text-xs text-emerald-200/95 mb-4 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2">
          Đăng ký lớp thành công. Email xác nhận (nếu có) gửi tới hộp thư của bạn — hoặc vào «Lớp của bạn»
          để học ngay.
        </p>
      )}

      {myCohorts.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-ds-muted font-medium">Lớp của bạn</p>
          {myCohorts.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-ds-border bg-white/5 px-4 py-3 text-sm text-white"
            >
              <Link
                href={`/courses/${courseSlug}/cohort/${c.id}`}
                className="block font-medium hover:text-ds-accent-strong"
              >
                {c.title} → Vào lớp
              </Link>
              {!c.inviteEmailSent ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-amber-200/90">
                    Chưa gửi được email xác nhận — kiểm tra thông báo hoặc gửi lại.
                  </span>
                  <button
                    type="button"
                    disabled={resendBusyId === c.id}
                    onClick={() => void handleResendEmail(c.id)}
                    className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    {resendBusyId === c.id ? 'Đang gửi…' : 'Gửi lại email'}
                  </button>
                </div>
              ) : (
                <span className="block text-[11px] text-emerald-300/90 mt-1">
                  Email xác nhận đã gửi.
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {enrollableCohorts.length === 0 ? (
        myCohorts.length === 0 ? (
          <p className="text-sm text-ds-muted">Hiện chưa có lớp nào mở đăng ký.</p>
        ) : null
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {enrollableCohorts.map((c) => {
              const id = cohortIdOf(c)
              const selected = selectedId === id
              const rowPrice = c.price ?? 0
              const rowCurrency = c.currency || 'VND'
              const rowPaid = c.requiresPayment ?? rowPrice > 0
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                      selected
                        ? 'border-purple-400/60 bg-purple-500/15 ring-1 ring-purple-400/40'
                        : 'border-ds-border bg-white/5 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-sm font-medium text-white">{c.title}</span>
                      {rowPaid && rowPrice > 0 && (
                        <span className="text-sm font-semibold text-purple-200 tabular-nums shrink-0">
                          {formatOrderAmount(rowPrice, rowCurrency)}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-ds-subtle mt-1">
                      Khai giảng: {formatCohortStart(c.startAt, c.timezone)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              onClick={() => void handleEnroll()}
              disabled={busy || !selectedId}
              className="bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
            >
              {busy
                ? 'Đang xử lý…'
                : cohortRequiresPay
                  ? 'Thanh toán & đăng ký lớp'
                  : 'Đăng ký lớp'}
            </Button>
            {selectedCohort && cohortRequiresPay && cohortListPrice > 0 && (
              <span className="text-lg font-semibold text-white tabular-nums">
                {formatOrderAmount(cohortListPrice, cohortCurrency)}
              </span>
            )}
          </div>
        </>
      )}

      {msg && <p className="text-sm text-amber-300 mt-3">{msg}</p>}
    </section>
  )
}
