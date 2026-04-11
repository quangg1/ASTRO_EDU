'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

function navItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/'
  if (pathname === href) return true
  return href !== '/' && pathname.startsWith(`${href}/`)
}

const sections: { title: string; items: { href: string; label: string; badge?: string }[] }[] = [
  {
    title: 'Học tập',
    items: [
      { href: '/dashboard', label: 'Tổng quan' },
      { href: '/my-courses', label: 'Khóa của tôi' },
      { href: '/courses', label: 'Khóa học' },
      { href: '/tutorial', label: 'Lộ trình' },
      { href: '/explore', label: 'Khám phá 3D' },
    ],
  },
  {
    title: 'Cộng đồng',
    items: [
      { href: '/community', label: 'Diễn đàn' },
      { href: '/search', label: 'Tìm kiếm' },
    ],
  },
  {
    title: 'Phần thưởng',
    items: [
      { href: '/gem', label: 'Gem' },
      { href: '/gem-shop', label: 'Gem Shop', badge: 'SOON' },
    ],
  },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen pt-14 flex bg-[#0a0612] text-slate-100">
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col fixed left-0 top-14 bottom-0 z-30 border-r border-violet-500/20 bg-[#0f0b18]/98 backdrop-blur-md">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.displayName || 'Khách'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email ?? 'Đăng nhập để đồng bộ tiến độ'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {sections.map((sec) => (
            <div key={sec.title}>
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">{sec.title}</p>
              <ul className="space-y-0.5">
                {sec.items.map((item) => {
                  const isActive = navItemActive(item.href, pathname)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-violet-600/40 text-white border border-violet-400/30'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">{item.badge}</span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          {user && (user.role === 'teacher' || user.role === 'admin') && (
            <div>
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">Giảng viên</p>
              <ul>
                <li>
                  <Link
                    href="/studio"
                    className={`block rounded-xl px-3 py-2.5 text-sm ${
                      pathname.startsWith('/studio')
                        ? 'bg-violet-600/40 text-white border border-violet-400/30'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    Studio
                  </Link>
                </li>
              </ul>
            </div>
          )}
          {user?.role === 'admin' && (
            <div>
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">Quản trị</p>
              <ul>
                <li>
                  <Link
                    href="/admin"
                    className={`block rounded-xl px-3 py-2.5 text-sm ${
                      pathname.startsWith('/admin')
                        ? 'bg-violet-600/40 text-white border border-violet-400/30'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-white/8 text-[10px] text-slate-600">Cosmo Learn</div>
      </aside>

      {/* Mobile: dùng MobileBottomNav toàn cục (AppShell) — không chồng thanh thứ hai */}

      <main className="flex-1 md:pl-[260px] w-full min-w-0 pb-6 md:pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</div>
      </main>
    </div>
  )
}
