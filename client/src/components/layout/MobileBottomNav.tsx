'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Home, ListTree, BookOpen, MessageCircle, UserRound, Telescope, CalendarDays } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { viText } from '@/messages/vi'
import { navItemsForSurface, navLabel, navItemIsActive } from '@/lib/navigationConfig'

function active(
  pathname: string,
  item: ReturnType<typeof navItemsForSurface>[number],
  searchParams: ReturnType<typeof useSearchParams>,
  rootOnly = false,
): boolean {
  if (rootOnly && item.href.split('?')[0] === '/') return pathname === '/' || pathname === ''
  return navItemIsActive(pathname, item, searchParams)
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()

  const accountHref = user ? '/dashboard' : '/login'
  const accountLabel = user ? viText.nav.account : viText.nav.signIn

  const accountActive =
    !!user &&
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/my-courses') ||
      pathname.startsWith('/my-orders') ||
      pathname.startsWith('/gem'))

  const itemsFromConfig = navItemsForSurface('mobileBottom')
  const iconById = {
    home: Home,
    learningPath: ListTree,
    courses: BookOpen,
    sky: Telescope,
    calendar: CalendarDays,
    community: MessageCircle,
  } as const
  const items = [
    ...itemsFromConfig
      .filter((item) => item.id in iconById)
      .map((item) => {
      const Icon = iconById[item.id as keyof typeof iconById]
      return {
        href: item.href,
        label: navLabel(item),
        icon: Icon,
        isActive: () => active(pathname, item, searchParams, item.href === '/'),
      }
    }),
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-[45] border-t border-white/[0.08] bg-ds-base/95 backdrop-blur-xl pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
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
                  on ? 'text-ds-accent' : 'text-ds-subtle hover:text-ds-muted'
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
