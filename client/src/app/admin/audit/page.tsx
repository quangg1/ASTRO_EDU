'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { fetchAdminAuditLog, type AdminAuditEntry } from '@/features/admin/public'
import { formatOrderDateVi } from '@/features/payment/public'
import { AdminGate } from '@/components/admin/AdminShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select, Button } from '@/design-system'

export default function AdminAuditPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [source, setSource] = useState('admin')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminAuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/audit')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin/audit')) return
    setLoading(true)
    void fetchAdminAuditLog({ source, page })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch(() => {
        setItems([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [user, source, page])

  return (
    <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/audit'))}>
      <PageHeader title="Nhật ký vận hành" description="Thao tác admin, gem economy và bảo mật." />
      <Select value={source} onChange={(e) => { setPage(1); setSource(e.target.value) }} className="text-sm w-auto mb-4">
        <option value="admin">Admin</option>
        <option value="gem">Gem economy</option>
        <option value="security">Bảo mật</option>
      </Select>

      {loading ? (
        <p className="text-gray-500">Đang tải…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-white/10">
                  <th className="px-4 py-2 text-left">Thời gian</th>
                  <th className="px-4 py-2 text-left">Hành động</th>
                  <th className="px-4 py-2 text-left">Actor</th>
                  <th className="px-4 py-2 text-left">Đích</th>
                  <th className="px-4 py-2 text-left">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">{formatOrderDateVi(row.createdAt)}</td>
                    <td className="px-4 py-2 text-white">{row.actionLabel}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{row.actorUserId || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{row.targetId || '—'}</td>
                    <td className="px-4 py-2 text-gray-300 text-xs max-w-[240px] truncate" title={row.reason}>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-3 text-sm text-gray-400">
            <span>{total} mục</span>
            <div className="flex gap-2">
              <Button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
              <span>Trang {page}</span>
              <Button type="button" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>Sau</Button>
            </div>
          </div>
        </>
      )}
    </AdminGate>
  )
}
