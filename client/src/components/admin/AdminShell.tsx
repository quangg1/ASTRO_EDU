'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, hasAdminScope } from '@/lib/roles'
import type { AdminScope } from '@/features/admin/lib/adminLabelsVi'

const NAV: ReadonlyArray<{
  href: string
  label: string
  exact?: boolean
  scope: AdminScope
}> = [
  { href: '/admin', label: 'Tổng quan', exact: true, scope: 'analytics' },
  { href: '/admin/users', label: 'Người dùng', scope: 'users' },
  { href: '/admin/orders', label: 'Đơn hàng', scope: 'orders' },
  { href: '/admin/courses', label: 'Khóa học', scope: 'courses' },
  { href: '/admin/moderation', label: 'Kiểm duyệt', scope: 'moderation' },
  { href: '/admin/audit', label: 'Nhật ký', scope: 'audit' },
  { href: '/admin/system', label: 'Hệ thống', scope: 'system' },
  { href: '/admin/gem-economy', label: 'Gem', scope: 'gem' },
  { href: '/admin/promo-codes', label: 'Coupon', scope: 'promo' },
  { href: '/admin/broadcast', label: 'Broadcast', scope: 'broadcast' },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const navItems = NAV.filter((item) => user && hasAdminScope(user, item.scope))

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-52 shrink-0">
          <nav className="rounded-2xl border border-white/10 bg-[#0a0f17] p-2 sticky top-20">
            <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500">Quản trị</p>
            {user && canAccessAdmin(user) && !navItems.length ? (
              <p className="px-3 py-2 text-xs text-amber-300/90">Tài khoản chưa được gán phạm vi quản trị.</p>
            ) : null}
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block rounded-lg px-3 py-2 text-sm transition-colors',
                        active ? 'bg-cyan-500/15 text-cyan-200' : 'text-gray-400 hover:text-white hover:bg-white/5',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link href="/" className="block mt-3 px-3 py-2 text-xs text-gray-500 hover:text-cyan-400">
              ← Trang chủ
            </Link>
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

export function AdminGate({
  checked,
  allowed,
  children,
  deniedMessage = 'Bạn không có quyền truy cập mục quản trị này.',
}: {
  checked: boolean
  allowed: boolean
  children: React.ReactNode
  deniedMessage?: string
}) {
  if (!checked) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra phiên đăng nhập...</div>
  }
  if (!allowed) {
    return (
      <div className="min-h-screen bg-black pt-20 px-4">
        <p className="text-gray-400">{deniedMessage}</p>
        <Link href="/" className="text-sm text-cyan-400 hover:underline mt-3 inline-block">
          ← Về trang chủ
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
