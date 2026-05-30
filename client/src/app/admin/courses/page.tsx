'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { fetchAdminCoursesList, patchAdminCoursePublished, type AdminCourseRow } from '@/features/admin/api/adminOpsApi'
import { AdminGate } from '@/components/admin/AdminShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, Select } from '@/design-system'
import { formatOrderAmount } from '@/lib/money'
import Link from 'next/link'

export default function AdminCoursesPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [items, setItems] = useState<AdminCourseRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [published, setPublished] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/courses')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  const reload = () => {
    setLoading(true)
    void fetchAdminCoursesList({ q, published, page })
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
    if (!user || !canAccessAdminPath(user, '/admin/courses')) return
    reload()
  }, [user, q, published, page])

  const togglePublish = async (c: AdminCourseRow) => {
    const next = !c.published
    const reason = window.prompt(next ? 'Lý do xuất bản:' : 'Lý do ẩn khóa:', next ? 'Admin xuất bản' : 'Admin ẩn khóa')
    if (!reason?.trim()) return
    const ok = await patchAdminCoursePublished(c.id, next, reason)
    if (ok) reload()
  }

  return (
    <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/courses'))}>
      <PageHeader title="Khóa học" description="Xuất bản / ẩn khóa — override nhanh ngoài Studio." />
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value) }}
          placeholder="Tìm slug hoặc tên…"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white min-w-[200px]"
        />
        <Select value={published} onChange={(e) => { setPage(1); setPublished(e.target.value) }} className="text-sm w-auto">
          <option value="all">Tất cả</option>
          <option value="true">Đã xuất bản</option>
          <option value="false">Nháp</option>
        </Select>
        <Link href="/studio" className="text-sm text-cyan-400 self-center hover:underline">Mở Studio →</Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải…</p>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-white/10">
                <th className="px-4 py-3 text-left">Khóa học</th>
                <th className="px-4 py-3 text-left">Giá</th>
                <th className="px-4 py-3 text-left">GV</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <p className="text-white">{c.title}</p>
                    <p className="text-xs text-cyan-300">{c.slug}</p>
                  </td>
                  <td className="px-4 py-3">{formatOrderAmount(c.price, c.currency)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{c.ownerName || c.ownerEmail || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={c.published ? 'text-emerald-300' : 'text-amber-300'}>
                      {c.published ? 'Published' : 'Nháp'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button type="button" onClick={() => void togglePublish(c)}>
                      {c.published ? 'Ẩn' : 'Xuất bản'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-3 text-xs text-gray-500">{total} khóa · trang {page}</p>
        </div>
      )}
    </AdminGate>
  )
}
