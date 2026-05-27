'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import {
  enrollCohort,
  fetchCourseCohorts,
  fetchMyCohorts,
  type CohortSummary,
  type MyCohortRow,
} from '@/features/courses/api/cohortApi'
import { Button } from '@/design-system'
import { courseRequiresPayment } from '@/components/courses/courseCatalogMeta'

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
  isPaid,
  price,
  currency,
  catalogEnrolled,
  catalogOpen = true,
  cohortPlacedFlash,
}: {
  courseSlug: string
  courseId?: string
  isPaid?: boolean
  price?: number
  currency?: string
  catalogEnrolled?: boolean
  /** false = khóa theo kỳ, chỉ đăng ký qua lớp */
  catalogOpen?: boolean
  cohortPlacedFlash?: boolean
}) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [openCohorts, setOpenCohorts] = useState<CohortSummary[]>([])
  const [myCohorts, setMyCohorts] = useState<MyCohortRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const cohortsListedRef = useRef('')
  const myCohortsKeyRef = useRef('')

  const termOnly = catalogOpen === false
  const paid = courseRequiresPayment({ isPaid, price, requiresPayment: undefined })

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

    if (paid && !catalogEnrolled) {
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

  const showCohortPicker = termOnly || paid || openCohorts.length > 0

  return (
    <section className="rounded-2xl border border-purple-500/25 bg-purple-950/15 p-6 mb-8">
      <h2 className="text-lg font-semibold text-white mb-1">Học theo lớp (theo kỳ)</h2>
      <p className="text-xs text-ds-subtle mb-4">
        Chọn lớp đang mở — chỉ đăng ký <strong className="text-ds-muted">trước ngày khai giảng</strong>.
        Mã lớp <strong className="text-ds-muted">không hiển thị trên web</strong>; sau khi đăng ký (và thanh toán nếu có phí),
        hệ thống gửi mã qua <strong className="text-ds-muted">email</strong> và thông báo trên tài khoản.
      </p>

      {cohortPlacedFlash && (
        <p className="text-xs text-emerald-200/95 mb-4 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2">
          Đăng ký thành công. Mã lớp đã được gửi tới email của bạn (kiểm tra cả hộp thư spam). Trên web chỉ có thông báo xác nhận — không hiển thị mã.
        </p>
      )}

      {myCohorts.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-ds-muted font-medium">Lớp của bạn</p>
          {myCohorts.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${courseSlug}/cohort/${c.id}`}
              className="block rounded-lg border border-ds-border bg-white/5 px-4 py-3 text-sm text-white hover:border-ds-accent-strong"
            >
              <span>{c.title}</span>
              {c.inviteEmailSent && (
                <span className="block text-[11px] text-emerald-300/90 mt-1">
                  Đã gửi mã lớp qua email — không hiển thị mã trên web.
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {showCohortPicker && (
        <>
          {openCohorts.length === 0 ? (
            <p className="text-sm text-ds-muted mb-2">Hiện chưa có lớp nào mở đăng ký.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {openCohorts.map((c) => {
                const id = cohortIdOf(c)
                const selected = selectedId === id
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
                      <span className="text-sm font-medium text-white">{c.title}</span>
                      <span className="block text-[11px] text-ds-subtle mt-1">
                        Khai giảng: {formatCohortStart(c.startAt, c.timezone)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              onClick={() => void handleEnroll()}
              disabled={busy || !selectedId || openCohorts.length === 0}
              className="bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
            >
              {busy
                ? 'Đang xử lý…'
                : paid && !catalogEnrolled
                  ? 'Thanh toán & đăng ký lớp'
                  : 'Đăng ký lớp'}
            </Button>
            {paid && !catalogEnrolled && price != null && price > 0 && (
              <span className="text-xs text-ds-subtle tabular-nums">
                {Math.round(price).toLocaleString('vi-VN')} {currency || 'VND'}
              </span>
            )}
          </div>
        </>
      )}

      {msg && <p className="text-sm text-amber-300 mt-3">{msg}</p>}
    </section>
  )
}
