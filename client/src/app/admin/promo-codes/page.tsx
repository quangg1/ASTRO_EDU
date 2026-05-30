'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import {
  createAdminPromoCode,
  deleteAdminPromoCode,
  fetchAdminPromoCodes,
  patchAdminPromoCode,
  type PromoCodeAdmin,
} from '@/features/admin/public'
import { fetchCoursesForEditor, type Course } from '@/features/courses/public'
import { Button, Card, Input } from '@/design-system'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronDown } from 'lucide-react'

type DiscountKind = 'percent' | 'fixed'
type CourseScope = 'all' | 'selected'

const PERCENT_PRESETS = [10, 15, 20, 30, 50]

const emptyForm = {
  code: '',
  discountKind: 'percent' as DiscountKind,
  discountAmount: '20',
  courseScope: 'all' as CourseScope,
  selectedCourseIds: [] as string[],
  hasExpiry: false,
  expiryDate: '',
  usageLimit: '',
  showBanner: true,
  bannerTitle: '',
  bannerBody: '',
}

function formatDiscount(p: PromoCodeAdmin): string {
  if (p.discountType === 'percent') return `Giảm ${p.discountValue}%`
  return `Giảm ${p.discountValue.toLocaleString('vi-VN')}đ`
}

function formatExpiry(endsAt: string | null): string {
  if (!endsAt) return 'Không hết hạn'
  const d = new Date(endsAt)
  if (Number.isNaN(d.getTime())) return '—'
  return `Hết hạn ${d.toLocaleDateString('vi-VN')}`
}

function promoStatus(p: PromoCodeAdmin): { label: string; tone: 'ok' | 'off' | 'expired' } {
  if (!p.active) return { label: 'Đã tắt', tone: 'off' }
  if (p.endsAt && new Date(p.endsAt) < new Date()) return { label: 'Hết hạn', tone: 'expired' }
  return { label: 'Đang chạy', tone: 'ok' }
}

function endOfDayIso(dateStr: string): string | null {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T23:59:59`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default function AdminPromoCodesPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [rows, setRows] = useState<PromoCodeAdmin[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [courseFilter, setCourseFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [promos, courseList] = await Promise.all([fetchAdminPromoCodes(), fetchCoursesForEditor()])
    setRows(promos)
    setCourses(courseList)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace('/login?redirect=/admin/promo-codes')
      return
    }
    if (!canAccessAdminPath(user, '/admin/promo-codes')) {
      router.replace('/')
      return
    }
    void load()
  }, [checked, user, router, load])

  const filteredCourses = useMemo(() => {
    const q = courseFilter.trim().toLowerCase()
    if (!q) return courses
    return courses.filter((c) => c.title.toLowerCase().includes(q))
  }, [courses, courseFilter])

  const toggleCourse = (courseId: string) => {
    setForm((f) => ({
      ...f,
      selectedCourseIds: f.selectedCourseIds.includes(courseId)
        ? f.selectedCourseIds.filter((id) => id !== courseId)
        : [...f.selectedCourseIds, courseId],
    }))
  }

  const onCreate = async () => {
    setMsg(null)
    const code = form.code.trim().toUpperCase()
    if (!code) {
      setMsg({ type: 'err', text: 'Vui lòng nhập mã giảm giá (ví dụ: HE2026).' })
      return
    }
    const discountValue = Number(form.discountAmount)
    if (!discountValue || discountValue <= 0) {
      setMsg({ type: 'err', text: 'Mức giảm phải lớn hơn 0.' })
      return
    }
    if (form.discountKind === 'percent' && discountValue > 100) {
      setMsg({ type: 'err', text: 'Giảm theo % tối đa là 100.' })
      return
    }
    if (form.courseScope === 'selected' && form.selectedCourseIds.length === 0) {
      setMsg({ type: 'err', text: 'Chọn ít nhất một khóa học, hoặc chuyển sang “Tất cả khóa”.' })
      return
    }
    if (form.hasExpiry && !form.expiryDate) {
      setMsg({ type: 'err', text: 'Chọn ngày hết hạn hoặc bỏ giới hạn thời gian.' })
      return
    }

    const discountLabel =
      form.discountKind === 'percent'
        ? `${discountValue}%`
        : `${discountValue.toLocaleString('vi-VN')}đ`
    const bannerTitle =
      form.bannerTitle.trim() || `Ưu đãi giảm ${discountLabel}`
    const bannerBody =
      form.bannerBody.trim() || `Nhập mã ${code} khi thanh toán. Hiển thị trên trang khóa học và thông báo.`

    setSubmitting(true)
    const r = await createAdminPromoCode({
      code,
      labelVi: code,
      discountType: form.discountKind,
      discountValue,
      courseIds: form.courseScope === 'all' ? [] : form.selectedCourseIds,
      endsAt: form.hasExpiry ? endOfDayIso(form.expiryDate) : null,
      maxRedemptions: form.usageLimit ? Number(form.usageLimit) : null,
      bannerTitleVi: bannerTitle,
      bannerBodyVi: bannerBody,
      bannerAccentColor: '#06b6d4',
      eventKey: code.toLowerCase(),
      active: true,
    })
    setSubmitting(false)

    if (!r.success) {
      setMsg({ type: 'err', text: r.error || 'Không tạo được mã. Thử mã khác.' })
      return
    }
    setForm(emptyForm)
    setAdvancedOpen(false)
    setCourseFilter('')
    setMsg({
      type: 'ok',
      text: `Đã tạo mã ${code}. Học viên sẽ thấy banner trên trang, thanh chuông thông báo và trang khóa học.`,
    })
    void load()
  }

  if (!checked || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner />
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 pb-16 pt-20 max-w-2xl mx-auto">
      <PageHeader
        title="Mã giảm giá"
        description="Tạo mã để học viên nhập lúc mua khóa học. Mỗi đơn chỉ dùng một mã; không cộng với voucher Gem."
      />
      <Link href="/admin" className="text-sm text-ds-accent hover:text-cyan-100 mb-6 inline-block">
        ← Quay lại quản trị
      </Link>

      <Card className="p-5 mb-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-ds-text">Tạo mã mới</h2>
          <p className="text-sm text-ds-muted mt-1">Chỉ cần vài thông tin cơ bản — phần còn lại là tùy chọn.</p>
        </div>

        {/* Mã */}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ds-text">Mã giảm giá</span>
          <span className="text-xs text-ds-muted block">Học viên gõ đúng mã này khi thanh toán (chữ in hoa, không dấu).</span>
          <Input
            className="uppercase text-lg tracking-wide font-semibold"
            placeholder="VD: HE2026"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
          />
        </label>

        {/* Mức giảm */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-ds-text block">Mức giảm</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, discountKind: 'percent' }))}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                form.discountKind === 'percent'
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                  : 'border-ds-border text-ds-muted hover:border-white/20'
              }`}
            >
              Theo %
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, discountKind: 'fixed' }))}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                form.discountKind === 'fixed'
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                  : 'border-ds-border text-ds-muted hover:border-white/20'
              }`}
            >
              Số tiền (VNĐ)
            </button>
          </div>

          {form.discountKind === 'percent' && (
            <div className="flex flex-wrap gap-2">
              {PERCENT_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, discountAmount: String(n) }))}
                  className={`min-w-[3rem] px-3 py-1.5 rounded-lg text-sm border ${
                    form.discountAmount === String(n)
                      ? 'bg-violet-500/25 border-violet-400/40 text-violet-100'
                      : 'border-ds-border text-ds-muted hover:bg-white/5'
                  }`}
                >
                  {n}%
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 max-w-xs">
            <Input
              type="number"
              min={1}
              max={form.discountKind === 'percent' ? 100 : undefined}
              value={form.discountAmount}
              onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
              className="text-lg"
            />
            <span className="text-sm text-ds-muted shrink-0">
              {form.discountKind === 'percent' ? '%' : 'VNĐ'}
            </span>
          </div>
        </div>

        {/* Phạm vi khóa */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-ds-text block">Áp dụng cho</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, courseScope: 'all', selectedCourseIds: [] }))}
              className={`text-left rounded-xl border p-4 transition-colors ${
                form.courseScope === 'all'
                  ? 'border-cyan-400/40 bg-cyan-500/10'
                  : 'border-ds-border hover:border-white/15'
              }`}
            >
              <p className="text-sm font-medium text-ds-text">Tất cả khóa học</p>
              <p className="text-xs text-ds-muted mt-1">Mã dùng được cho mọi khóa trả phí.</p>
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, courseScope: 'selected' }))}
              className={`text-left rounded-xl border p-4 transition-colors ${
                form.courseScope === 'selected'
                  ? 'border-cyan-400/40 bg-cyan-500/10'
                  : 'border-ds-border hover:border-white/15'
              }`}
            >
              <p className="text-sm font-medium text-ds-text">Một số khóa</p>
              <p className="text-xs text-ds-muted mt-1">
                {form.selectedCourseIds.length > 0
                  ? `Đã chọn ${form.selectedCourseIds.length} khóa.`
                  : 'Chọn danh sách bên dưới.'}
              </p>
            </button>
          </div>

          {form.courseScope === 'selected' && (
            <div className="rounded-xl border border-ds-border bg-ds-base/30 p-3 space-y-2">
              <Input
                placeholder="Tìm khóa học…"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              />
              {courses.length === 0 ? (
                <p className="text-sm text-ds-muted py-2">Chưa có khóa học.</p>
              ) : filteredCourses.length === 0 ? (
                <p className="text-sm text-ds-muted py-2">Không tìm thấy khóa phù hợp.</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto rounded-lg border border-ds-border/80 divide-y divide-ds-border/50">
                  {filteredCourses.map((c) => (
                    <li key={c.id}>
                      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.03]">
                        <input
                          type="checkbox"
                          checked={form.selectedCourseIds.includes(c.id)}
                          onChange={() => toggleCourse(c.id)}
                          className="rounded border-ds-border text-cyan-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-ds-text">{c.title}</span>
                          <span className="block text-xs text-ds-muted">
                            {c.requiresPayment && c.price != null
                              ? `${c.price.toLocaleString('vi-VN')}đ`
                              : 'Miễn phí'}
                            {!c.published && ' · Nháp'}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Tùy chọn thêm — collapsed */}
        <div className="border-t border-ds-border/60 pt-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm text-ds-muted hover:text-ds-text"
          >
            <span>Tùy chọn thêm (thời hạn, giới hạn lượt, banner)</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>

          {advancedOpen && (
            <div className="mt-4 space-y-4 pl-0 sm:pl-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasExpiry}
                  onChange={(e) => setForm((f) => ({ ...f, hasExpiry: e.target.checked }))}
                  className="rounded border-ds-border text-cyan-500"
                />
                <span className="text-sm text-ds-text">Có ngày hết hạn</span>
              </label>
              {form.hasExpiry && (
                <label className="block space-y-1">
                  <span className="text-xs text-ds-muted">Hết hạn vào cuối ngày</span>
                  <Input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </label>
              )}

              <label className="block space-y-1">
                <span className="text-sm text-ds-text">Giới hạn tổng lượt dùng</span>
                <span className="text-xs text-ds-muted block">Để trống = không giới hạn.</span>
                <Input
                  type="number"
                  min={1}
                  placeholder="VD: 100"
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showBanner}
                  onChange={(e) => setForm((f) => ({ ...f, showBanner: e.target.checked }))}
                  className="rounded border-ds-border text-cyan-500"
                />
                <span className="text-sm text-ds-text">Hiện banner khuyến mãi trên trang</span>
              </label>
              {form.showBanner && (
                <div className="space-y-3 pl-1">
                  <label className="block space-y-1">
                    <span className="text-xs text-ds-muted">Tiêu đề (để trống sẽ tự đặt theo % giảm)</span>
                    <Input
                      placeholder="VD: Khai giảng — giảm 20%"
                      value={form.bannerTitle}
                      onChange={(e) => setForm((f) => ({ ...f, bannerTitle: e.target.value }))}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-ds-muted">Dòng mô tả ngắn (tùy chọn)</span>
                    <Input
                      placeholder="VD: Nhập mã khi thanh toán khóa học"
                      value={form.bannerBody}
                      onChange={(e) => setForm((f) => ({ ...f, bannerBody: e.target.value }))}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {msg && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              msg.type === 'ok'
                ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/25'
                : 'bg-red-500/10 text-red-200 border border-red-500/25'
            }`}
          >
            {msg.text}
          </p>
        )}

        <Button disabled={submitting} onClick={() => void onCreate()}>
          {submitting ? 'Đang tạo…' : 'Tạo mã giảm giá'}
        </Button>
      </Card>

      <h2 className="text-sm font-semibold text-ds-muted uppercase tracking-wide mb-3">Mã đã tạo</h2>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-ds-muted text-sm">Chưa có mã nào.</Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const status = promoStatus(p)
            const statusCls =
              status.tone === 'ok'
                ? 'bg-emerald-500/15 text-emerald-200'
                : status.tone === 'expired'
                  ? 'bg-slate-500/20 text-slate-400'
                  : 'bg-amber-500/15 text-amber-200'

            return (
              <li key={p.id}>
                <Card className="p-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-ds-text tracking-wide">{p.code}</p>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${statusCls}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-cyan-200/90 mt-1">{formatDiscount(p)}</p>
                    <p className="text-xs text-ds-muted mt-2 space-y-0.5">
                      <span className="block">
                        {p.courseIds.length === 0 ? 'Mọi khóa học' : `${p.courseIds.length} khóa được chọn`}
                      </span>
                      <span className="block">{formatExpiry(p.endsAt)}</span>
                      <span className="block">
                        Đã dùng {p.redemptionCount}
                        {p.maxRedemptions != null ? ` / ${p.maxRedemptions} lượt` : ' lượt'}
                      </span>
                    </p>
                    {p.bannerTitleVi && (
                      <p className="text-xs text-ds-accent mt-2">Banner: {p.bannerTitleVi}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        void patchAdminPromoCode(p.id, { active: !p.active }).then(() => load())
                      }
                    >
                      {p.active ? 'Tắt mã' : 'Bật lại'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(`Xóa mã ${p.code}?`)) return
                        void deleteAdminPromoCode(p.id).then(() => load())
                      }}
                    >
                      Xóa
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
