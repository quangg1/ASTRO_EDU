'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { fetchAdminSystemStatus, triggerAdminNewsCrawl, type AdminSystemStatus } from '@/features/admin/public'
import { formatOrderDateVi } from '@/features/payment/public'
import { AdminGate } from '@/components/admin/AdminShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, Card } from '@/design-system'

export default function AdminSystemPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [status, setStatus] = useState<AdminSystemStatus | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => {
    void fetchAdminSystemStatus().then(setStatus)
  }

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/system')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin/system')) return
    reload()
  }, [user])

  const runCrawl = async () => {
    setBusy(true)
    const ok = await triggerAdminNewsCrawl('Admin kích hoạt thủ công')
    setMsg(ok ? 'Đã chạy crawl (hoặc bỏ qua nếu chưa đến hạn).' : 'Crawl thất bại.')
    reload()
    setBusy(false)
  }

  return (
    <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/system'))}>
      <PageHeader title="Hệ thống" description="Sức khoẻ dịch vụ, SMTP, crawl tin, bảo mật 24h." />

      {!status ? (
        <p className="text-gray-500">Đang tải…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase">API / DB</p>
            <p className="text-emerald-300 mt-1">{status.api.ok ? 'API OK' : 'Lỗi'}</p>
            <p className="text-sm text-gray-400">MongoDB: {status.database.ok ? 'Kết nối' : 'Lỗi'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase">Email SMTP</p>
            <p className={status.smtp.configured ? 'text-emerald-300 mt-1' : 'text-amber-300 mt-1'}>
              {status.smtp.configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
            </p>
          </Card>
          <Card className="p-4 sm:col-span-2">
            <p className="text-xs text-gray-500 uppercase">Crawl tin thiên văn</p>
            <p className="text-sm text-gray-300 mt-1">
              Bật: {status.newsCrawl.enabled ? 'có' : 'không'} · Chu kỳ: {status.newsCrawl.intervalHours}h
            </p>
            <p className="text-sm text-gray-400">Lần chạy: {formatOrderDateVi(status.newsCrawl.lastRunAt)}</p>
            <p className="text-sm text-gray-400">Tiếp theo (~): {formatOrderDateVi(status.newsCrawl.nextDueAt)}</p>
            {status.newsCrawl.lastResult && (
              <pre className="mt-2 text-[10px] text-gray-500 overflow-x-auto">{JSON.stringify(status.newsCrawl.lastResult, null, 2)}</pre>
            )}
            <Button type="button" className="mt-3" disabled={busy} onClick={() => void runCrawl()}>
              Chạy crawl ngay
            </Button>
            {msg && <p className="text-sm text-emerald-300 mt-2">{msg}</p>}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase">Bảo mật 24h</p>
            <p className="text-2xl text-white mt-1 tabular-nums">{status.security.eventsLast24h}</p>
            <p className="text-xs text-gray-500">Sự kiện audit (401/403/429…)</p>
          </Card>
        </div>
      )}
    </AdminGate>
  )
}
