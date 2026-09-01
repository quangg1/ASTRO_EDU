'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import {
  fetchAdminUserDetail,
  grantCatalogEnrollment,
  revokeCatalogEnrollment,
  revokeCohortEnrollment,
  sendAdminUserPasswordReset,
  type AdminUserDetail,
} from '@/features/admin/public'
import { formatOrderAmount } from '@/lib/money'
import { formatOrderDateVi, orderKindLabelVi, orderStatusLabelVi } from '@/features/payment/public'
import { AdminGate } from '@/components/admin/AdminShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, Card } from '@/design-system'
import {
  postManualGemAdjust,
  labelAccountStatusVi,
  labelEnrollmentStatusVi,
  labelUserRoleVi,
} from '@/features/admin/public'

function promptRevokeReason(kind: 'catalog' | 'cohort'): string | null {
  const label = kind === 'cohort' ? 'lớp cohort' : 'quyền tự học'
  const reason = window.prompt(`Lý do thu hồi ${label} (tối thiểu 10 ký tự — sẽ gửi thông báo cho người dùng):`) || ''
  const trimmed = reason.trim()
  if (!trimmed) return null
  if (trimmed.length < 10) {
    window.alert('Lý do phải có ít nhất 10 ký tự.')
    return null
  }
  return trimmed
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = String(params.id || '')
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const reload = () => {
    setLoading(true)
    void fetchAdminUserDetail(userId).then((d) => {
      setDetail(d)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (checked && !user) router.replace(`/login?redirect=/admin/users/${userId}`)
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router, userId])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin/users') || !userId) return
    reload()
  }, [user, userId])

  const revokeCatalog = async (courseId: string) => {
    const reason = promptRevokeReason('catalog')
    if (!reason) return
    const ok = await revokeCatalogEnrollment({ userId, courseId, reason })
    setMsg(ok.success ? 'Đã thu hồi quyền tự học và gửi thông báo cho người dùng.' : ok.error || 'Thất bại.')
    if (ok.success) reload()
  }

  const revokeCohort = async (cohortId: string) => {
    const reason = promptRevokeReason('cohort')
    if (!reason) return
    const ok = await revokeCohortEnrollment({ userId, cohortId, reason })
    setMsg(ok.success ? 'Đã thu hồi lớp và gửi thông báo kèm lý do cho người dùng.' : ok.error || 'Thất bại.')
    if (ok.success) reload()
  }

  const grantCatalog = async () => {
    const courseId = window.prompt('Nhập courseId (Mongo _id):')?.trim()
    if (!courseId) return
    const reason = window.prompt('Lý do cấp quyền:') || 'Admin cấp quyền'
    const ok = await grantCatalogEnrollment({ userId, courseId, reason })
    setMsg(ok ? 'Đã cấp quyền tự học.' : 'Thất bại.')
    if (ok) reload()
  }

  const adjustGem = async () => {
    const delta = Number(window.prompt('Delta gem (+/-):'))
    if (!Number.isFinite(delta) || delta === 0) return
    const reason = window.prompt('Lý do:') || 'Admin điều chỉnh'
    try {
      const res = await postManualGemAdjust({ targetUserId: userId, delta, reason })
      setMsg(`Đã điều chỉnh gem. Số dư: ${res.gemBalance}`)
      reload()
    } catch {
      setMsg('Lỗi điều chỉnh gem.')
    }
  }

  const sendPasswordReset = async () => {
    const email = detail?.user.email
    if (!window.confirm(`Gửi email đặt lại mật khẩu tới ${email || 'user này'}?`)) return
    const ok = await sendAdminUserPasswordReset(userId)
    if (ok.success) {
      let text = ok.message || 'Đã gửi link đặt lại mật khẩu.'
      if (ok.resetLink) text += ` (dev: ${ok.resetLink})`
      setMsg(text)
    } else {
      setMsg(ok.error || 'Không gửi được link đặt lại mật khẩu.')
    }
  }

  if (loading || !detail) {
    return (
      <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/users'))}>
        <p className="text-gray-500">{loading ? 'Đang tải…' : 'Không tìm thấy user.'}</p>
      </AdminGate>
    )
  }

  const u = detail.user

  return (
    <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/users'))}>
      <PageHeader
        title={u.displayName || u.email || u.id}
        description={u.email || undefined}
        action={
          <Link href="/admin/users" className="text-sm text-cyan-400 hover:underline">
            ← Danh sách
          </Link>
        }
      />
      {msg && <p className="text-sm text-emerald-300 mb-4">{msg}</p>}

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase">Tài khoản</p>
          <p className="text-white mt-1">Vai trò: {labelUserRoleVi(u.role)}</p>
          <p className="text-gray-400 text-sm">Trạng thái: {labelAccountStatusVi(u.accountStatus)}</p>
          <p className="text-gray-400 text-sm">
            Đăng nhập: {u.provider === 'local' ? 'Email / mật khẩu' : u.provider || '—'}
          </p>
          <p className="text-gray-400 text-sm">Tham gia: {formatOrderDateVi(u.createdAt)}</p>
          {u.provider === 'local' && u.accountStatus === 'active' && (
            <Button type="button" className="mt-3" onClick={() => void sendPasswordReset()}>
              Gửi link đặt lại mật khẩu
            </Button>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase">Gem</p>
          <p className="text-2xl text-emerald-300 tabular-nums">{detail.wallet.balance}</p>
          <p className="text-sm text-gray-400">{detail.wallet.learnerTier?.labelVi || '—'}</p>
          <Button type="button" className="mt-3" onClick={() => void adjustGem()}>
            Điều chỉnh gem
          </Button>
        </Card>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Ghi danh tự học</h2>
          <Button type="button" onClick={() => void grantCatalog()}>Cấp quyền (courseId)</Button>
        </div>
        <div className="space-y-2">
          {detail.catalogEnrollments.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 text-sm">
              <div>
                <p className="text-white">{e.courseTitle || e.courseSlug}</p>
                <p className="text-gray-500 text-xs">{labelEnrollmentStatusVi(e.status)} · {formatOrderDateVi(e.enrolledAt)}</p>
              </div>
              <Button type="button" onClick={() => void revokeCatalog(e.courseId)}>Thu hồi</Button>
            </div>
          ))}
          {detail.catalogEnrollments.length === 0 && <p className="text-gray-500 text-sm">Chưa có.</p>}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-white mb-3">Lớp cohort</h2>
        <div className="space-y-2">
          {detail.cohortEnrollments.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 text-sm">
              <div>
                <p className="text-white">{e.cohortTitle}</p>
                <p className="text-gray-500 text-xs">{e.courseSlug}</p>
              </div>
              <Button type="button" onClick={() => void revokeCohort(e.cohortId)}>Thu hồi lớp</Button>
            </div>
          ))}
          {detail.cohortEnrollments.length === 0 && <p className="text-gray-500 text-sm">Chưa có.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-white mb-3">Đơn hàng gần đây</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-white/10">
                <th className="px-4 py-2 text-left">Mã</th>
                <th className="px-4 py-2 text-left">Khóa</th>
                <th className="px-4 py-2 text-left">Loại</th>
                <th className="px-4 py-2 text-left">Số tiền</th>
                <th className="px-4 py-2 text-left">TT</th>
              </tr>
            </thead>
            <tbody>
              {detail.orders.map((o) => (
                <tr key={o._id} className="border-b border-white/5">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link href={`/admin/orders?txn=${o.txnRef}`} className="text-cyan-400 hover:underline">{o.txnRef}</Link>
                  </td>
                  <td className="px-4 py-2">{o.courseSlug}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{orderKindLabelVi(o.orderKind || 'catalog')}</td>
                  <td className="px-4 py-2">{formatOrderAmount(o.amount, o.currency)}</td>
                  <td className="px-4 py-2 text-xs">{orderStatusLabelVi(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminGate>
  )
}
