'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import {
  cancelAdminOrder,
  fetchAdminOrderDetail,
  fetchAdminOrdersList,
  patchAdminOrderNote,
  refundAdminOrder,
} from '@/features/admin/public'
import type { AdminOrder } from '@/features/payment/public'
import { formatOrderAmount } from '@/lib/money'
import {
  formatOrderDateVi,
  orderKindLabelVi,
  orderStatusLabelVi,
  orderStatusTone,
} from '@/features/payment/lib/orderLabels'
import { AdminGate } from '@/components/admin/AdminShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, Select } from '@/design-system'

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ds-base text-ds-text pt-24 text-center text-slate-500">Đang tải…</div>}>
      <AdminOrdersPageInner />
    </Suspense>
  )
}

function AdminOrdersPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, checked } = useAuthStore()
  const [items, setItems] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState(searchParams.get('txn') || searchParams.get('q') || '')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/orders')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  const reload = () => {
    setLoading(true)
    void fetchAdminOrdersList({ q, status, page, limit: 30 })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch(() => {
        setItems([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin/orders')) return
    reload()
  }, [user, q, status, page])

  useEffect(() => {
    const txn = searchParams.get('txn')
    if (!txn || !user) return
    void fetchAdminOrderDetail(txn).then((o) => {
      if (o) {
        setSelected(o)
        setNote(o.adminNote || '')
      }
    })
  }, [searchParams, user])

  const openDetail = async (txnRef: string) => {
    const o = await fetchAdminOrderDetail(txnRef)
    if (o) {
      setSelected(o)
      setNote(o.adminNote || '')
    }
  }

  const saveNote = async () => {
    if (!selected) return
    const ok = await patchAdminOrderNote(selected.txnRef, note)
    setMsg(ok ? 'Đã lưu ghi chú.' : 'Lỗi lưu ghi chú.')
    if (ok) reload()
  }

  const doRefund = async () => {
    if (!selected) return
    const reason = window.prompt('Lý do hoàn tiền (demo):') || ''
    if (reason.length < 5) return
    const ok = await refundAdminOrder(selected.txnRef, reason, true)
    setMsg(ok ? 'Đã hoàn tiền và thu hồi quyền (nếu có).' : 'Không hoàn được.')
    if (ok) {
      setSelected(null)
      reload()
    }
  }

  const doCancel = async () => {
    if (!selected) return
    const ok = await cancelAdminOrder(selected.txnRef, 'Admin huỷ pending')
    setMsg(ok ? 'Đã huỷ đơn pending.' : 'Không huỷ được.')
    if (ok) {
      setSelected(null)
      reload()
    }
  }

  return (
    <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/orders'))}>
      <PageHeader title="Đơn hàng" description="Tra cứu, ghi chú, hoàn tiền demo, huỷ pending." />

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value) }}
          placeholder="txnRef, email, khóa học…"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white min-w-[220px]"
        />
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }} className="text-sm w-auto">
          <option value="all">Tất cả</option>
          <option value="pending">Chờ thanh toán</option>
          <option value="completed">Đã thanh toán</option>
          <option value="refunded">Đã hoàn tiền</option>
          <option value="inactive">Huỷ / thất bại</option>
        </Select>
      </div>

      {msg && <p className="text-sm text-emerald-300 mb-3">{msg}</p>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-gray-500">Đang tải…</p>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-white/10">
                  <th className="px-3 py-2 text-left">Người mua</th>
                  <th className="px-3 py-2 text-left">Khóa</th>
                  <th className="px-3 py-2 text-left">Mã đơn</th>
                  <th className="px-3 py-2 text-left">TT</th>
                  <th className="px-3 py-2 text-left">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr
                    key={o._id}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => void openDetail(o.txnRef)}
                  >
                    <td className="px-3 py-2 text-xs">
                      <Link href={`/admin/users/${o.userId}`} className="text-cyan-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {o.buyerName || o.buyerEmail || o.userId}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{o.courseSlug}</td>
                    <td className="px-3 py-2 font-mono text-xs">{o.txnRef}</td>
                    <td className="px-3 py-2 text-xs">{orderStatusLabelVi(o.status)}</td>
                    <td className="px-3 py-2">{formatOrderAmount(o.amount, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex justify-between p-3 text-xs text-gray-500">
            <span>{total} đơn</span>
            <div className="flex gap-2">
              <Button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
              <span>Trang {page}</span>
              <Button type="button" disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)}>Sau</Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 p-4 space-y-3 h-fit">
          <h3 className="font-semibold text-white">Chi tiết đơn</h3>
          {!selected ? (
            <p className="text-sm text-gray-500">Chọn một dòng để xem.</p>
          ) : (
            <>
              <p className="font-mono text-xs text-cyan-300">{selected.txnRef}</p>
              <p className="text-sm text-gray-300">{orderKindLabelVi(selected.orderKind || 'catalog')}</p>
              <p className="text-sm">{formatOrderAmount(selected.amount, selected.currency)}</p>
              <p className="text-xs text-gray-400">Tạo: {formatOrderDateVi(selected.createdAt)}</p>
              {selected.transactionId && <p className="text-xs text-gray-400">GD: {selected.transactionId}</p>}
              {selected.status === 'pending' && selected.expiresAt && (
                <p className="text-xs text-amber-300">Hết hạn: {formatOrderDateVi(selected.expiresAt)}</p>
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ghi chú nội bộ…"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <Button type="button" onClick={() => void saveNote()}>Lưu ghi chú</Button>
              {selected.status === 'pending' && (
                <Button type="button" onClick={() => void doCancel()}>Huỷ pending</Button>
              )}
              {selected.status === 'completed' && (
                <Button type="button" onClick={() => void doRefund()}>Hoàn tiền (demo)</Button>
              )}
            </>
          )}
        </div>
      </div>
    </AdminGate>
  )
}
