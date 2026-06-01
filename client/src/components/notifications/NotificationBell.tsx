'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/features/notifications/api/notificationsApi'
import { useNotificationRealtime } from '@/features/notifications/hooks/useNotificationRealtime'
import { PromoNotificationsSection } from '@/components/promotions/PromoNotificationsSection'
import { fetchActivePromotions } from '@/features/promotions/api/promoApi'
import { undismissedPromos } from '@/features/promotions/lib/promoDismiss'

export function NotificationBell() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [activePromoCount, setActivePromoCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { connected, onMessage } = useNotificationRealtime(Boolean(user))

  const refreshCount = useCallback(async () => {
    if (!user) {
      setUnread(0)
      return
    }
    const count = await fetchUnreadNotificationCount()
    setUnread(count)
  }, [user])

  const loadPanel = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const rows = await fetchNotifications({ limit: 12 })
    setItems(rows)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refreshCount()
  }, [refreshCount])

  useEffect(() => {
    if (!user) {
      setActivePromoCount(0)
      return
    }
    const loadPromos = () => {
      void fetchActivePromotions(5).then((list) => setActivePromoCount(undismissedPromos(list).length))
    }
    loadPromos()
    window.addEventListener('promo-dismiss-changed', loadPromos)
    return () => window.removeEventListener('promo-dismiss-changed', loadPromos)
  }, [user])

  useEffect(() => {
    onMessage((msg) => {
      if (msg.type !== 'notification' || !msg.notification) return
      const n = msg.notification
      setUnread((c) => c + (msg.unreadDelta ?? (n.readAt ? 0 : 1)))
      setItems((prev) => {
        const withoutDup = prev.filter((x) => x.id !== n.id)
        return [n, ...withoutDup].slice(0, 12)
      })
    })
  }, [onMessage])

  /** Tin nhắn mới — refresh số chưa đọc (thông báo chính vẫn qua type: notification từ server). */
  useEffect(() => {
    if (!user) return
    const onDm = () => {
      void refreshCount()
      if (open) void loadPanel()
    }
    window.addEventListener('galaxies-dm', onDm)
    return () => window.removeEventListener('galaxies-dm', onDm)
  }, [user, open, refreshCount, loadPanel])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      void loadPanel()
      document.addEventListener('mousedown', onDoc)
      return () => document.removeEventListener('mousedown', onDoc)
    }
  }, [open, loadPanel])

  if (!user) return null

  const onOpenItem = async (n: AppNotification) => {
    if (!n.readAt) {
      await markNotificationRead(n.id)
      setUnread((c) => Math.max(0, c - 1))
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      )
    }
    setOpen(false)
  }

  const onReadAll = async () => {
    await markAllNotificationsRead()
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-ds-muted hover:text-white hover:bg-white/5 transition-colors"
        aria-label={unread > 0 ? `${unread} thông báo chưa đọc` : 'Thông báo'}
      >
        <Bell className="h-5 w-5" />
        {connected && (
          <span
            className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400"
            title="Realtime đang bật"
            aria-hidden
          />
        )}
        {unread > 0 ? (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : activePromoCount > 0 ? (
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-400 ring-2 ring-[#070a10]"
            title="Có ưu đãi đang diễn ra"
            aria-hidden
          />
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,360px)] rounded-xl border border-ds-border bg-ds-surface shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-ds-border">
            <span className="text-xs font-semibold text-ds-text">
              Thông báo
              {connected ? (
                <span className="ml-1.5 text-[10px] font-normal text-emerald-400">Live</span>
              ) : null}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void onReadAll()}
                className="text-[11px] text-ds-accent hover:text-cyan-100"
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            <PromoNotificationsSection onNavigate={() => setOpen(false)} />
            {loading && <p className="px-3 py-4 text-xs text-ds-muted">Đang tải…</p>}
            {!loading && items.length === 0 && (
              <p className="px-3 py-6 text-xs text-ds-muted text-center">Chưa có thông báo khác</p>
            )}
            {items.map((n) => {
              const inner = (
                <>
                  <p className={`text-sm ${n.readAt ? 'text-ds-muted' : 'text-ds-text font-medium'}`}>
                    {n.titleVi}
                  </p>
                  {n.bodyVi ? <p className="text-xs text-ds-subtle mt-0.5 line-clamp-2">{n.bodyVi}</p> : null}
                  <p className="text-[10px] text-ds-subtle mt-1">
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </p>
                </>
              )
              const cls = `block px-3 py-2.5 border-b border-ds-border/50 hover:bg-white/5 transition-colors ${
                n.readAt ? '' : 'bg-ds-accent-soft/30'
              }`
              return n.href ? (
                <Link key={n.id} href={n.href} className={cls} onClick={() => void onOpenItem(n)}>
                  {inner}
                </Link>
              ) : (
                <button key={n.id} type="button" className={`${cls} w-full text-left`} onClick={() => void onOpenItem(n)}>
                  {inner}
                </button>
              )
            })}
          </div>
          <Link
            href="/notifications"
            className="block text-center text-xs text-ds-accent py-2.5 border-t border-ds-border hover:bg-white/5"
            onClick={() => setOpen(false)}
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  )
}
