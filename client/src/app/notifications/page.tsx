'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { Button, Card } from '@/design-system'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/features/notifications/public'

export default function NotificationsPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const rows = await fetchNotifications({ limit: 50 })
    setItems(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace('/login?redirect=/notifications')
      return
    }
    void load()
  }, [checked, user, router, load])

  useEffect(() => {
    const onLive = (e: Event) => {
      const n = (e as CustomEvent<AppNotification>).detail
      if (!n?.id) return
      setItems((prev) => {
        if (prev.some((x) => x.id === n.id)) return prev
        return [n, ...prev]
      })
    }
    window.addEventListener('galaxies-notification', onLive)
    return () => window.removeEventListener('galaxies-notification', onLive)
  }, [])

  const onRead = async (id: string) => {
    await markNotificationRead(id)
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    )
  }

  if (!checked || !user) {
    return (
      <main className="surface-edu relative z-10 flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-ds-muted">Đang chuyển hướng…</p>
      </main>
    )
  }

  return (
    <main className="surface-edu relative z-10 px-4 pb-16 pt-2">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-ds-text">Thông báo</h1>
          <Button
            variant="ghost"
            onClick={async () => {
              await markAllNotificationsRead()
              void load()
            }}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        </div>

        {loading && <p className="text-sm text-ds-muted">Đang tải…</p>}

        {!loading && items.length === 0 && (
          <Card className="p-8 text-center text-sm text-ds-muted">Chưa có thông báo nào.</Card>
        )}

        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Card
                className={`p-4 ${n.readAt ? 'opacity-80' : 'border-ds-accent-strong/40'}`}
              >
                {n.href ? (
                  <Link
                    href={n.href}
                    className="block"
                    onClick={() => {
                      if (!n.readAt) void onRead(n.id)
                    }}
                  >
                    <NotificationRow n={n} />
                  </Link>
                ) : (
                  <NotificationRow n={n} />
                )}
                {!n.readAt && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-ds-accent hover:text-ds-text"
                    onClick={() => void onRead(n.id)}
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

function NotificationRow({ n }: { n: AppNotification }) {
  return (
    <>
      <p className="text-sm font-medium text-ds-text">{n.titleVi}</p>
      {n.bodyVi ? <p className="text-sm text-ds-muted mt-1">{n.bodyVi}</p> : null}
      <p className="text-[11px] text-ds-subtle mt-2">
        {new Date(n.createdAt).toLocaleString('vi-VN')}
      </p>
    </>
  )
}
