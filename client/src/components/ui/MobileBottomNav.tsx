'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ListTree, BookOpen, MessageCircle, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

function active(pathname: string, href: string, rootOnly = false): boolean {
  if (href === '/') return pathname === '/' || pathname === ''
  if (rootOnly) return pathname === href
  if (pathname === href) return true
  return href !== '/' && pathname.startsWith(`${href}/`)
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const accountHref = user ? '/dashboard' : '/login'
  const accountLabel = user ? 'Tài khoản' : 'Đăng nhập'

  const accountActive =
    !!user &&
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/my-courses') ||
      pathname.startsWith('/gem'))

  const items = [
    { href: '/', label: 'Trang chủ', icon: Home, isActive: () => pathname === '/' || pathname === '' },
    { href: '/tutorial', label: 'Lộ trình', icon: ListTree, isActive: () => active(pathname, '/tutorial') },
    { href: '/courses', label: 'Khóa học', icon: BookOpen, isActive: () => active(pathname, '/courses') },
    { href: '/community', label: 'Cộng đồng', icon: MessageCircle, isActive: () => active(pathname, '/community') },
    {
      href: accountHref,
      label: accountLabel,
      icon: UserRound,
      isActive: () => (user ? accountActive : false),
    },
  ]

  return (
    <nav
      data-mobile-bottom-nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[45] border-t border-white/[0.08] bg-[#070a10]/95 backdrop-blur-xl pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
      aria-label="Điều hướng chính"
    >
      <ul className="flex items-stretch justify-around max-w-lg mx-auto px-1">
        {items.map(({ href, label, icon: Icon, isActive }) => {
          const on = isActive()
          return (
            <li key={href + label} className="flex-1 min-w-0">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl min-h-[3rem] transition-colors ${
                  on ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${on ? 'text-cyan-400' : ''}`} strokeWidth={on ? 2.25 : 2} aria-hidden />
                <span className={`text-[10px] font-medium truncate max-w-full ${on ? 'text-cyan-200' : ''}`}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
