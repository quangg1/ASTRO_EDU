'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, BookMarked, BookOpen, Map, Globe, Receipt,
  MessageCircle, Search, Gem, ShoppingBag, Video, Heart,
  Shield, Newspaper, Settings, UserPlus, Telescope, CalendarDays,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { useEquippedDecoration } from '@/features/rewards/hooks/useEquippedDecoration'
import { AvatarWithDecoration } from '@/components/profile/AvatarWithDecoration'
import { canModerate } from '@/lib/roles'
import { CosmoPageBackdrop } from '@/components/layout/CosmoPageBackdrop'

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = 'var(--color-accent)', s = 12, o = 5 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties) => ({
    position: 'absolute' as const,
    width: s,
    height: s,
    opacity: 0.8,
    pointerEvents: 'none' as const,
    ...ex,
  })
  return (
    <>
      <span style={b({ top: o, left: o, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ top: o, right: o, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, left: o, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, right: o, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
    </>
  )
}

function navIsActive(href: string, pathname: string, searchParams?: ReturnType<typeof useSearchParams>): boolean {
  if (href === '/explore?view=sky') {
    return pathname.startsWith('/explore') && searchParams?.get('view') === 'sky'
  }
  if (href === '/calendar') {
    return pathname === '/calendar' || pathname.startsWith('/calendar/')
  }
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/'
  if (pathname === href) return true
  return href !== '/' && pathname.startsWith(`${href}/`)
}

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string }

function NavSection({
  title,
  items,
  pathname,
  searchParams,
}: {
  title: string
  items: NavItem[]
  pathname: string
  searchParams: ReturnType<typeof useSearchParams>
}) {
  return (
    <div>
      <p className="dash-mono px-3 mb-1.5 text-[10px] uppercase text-ds-subtle" style={{ letterSpacing: '0.22em' }}>
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = navIsActive(item.href, pathname, searchParams)
          const Icon = item.icon
          return (
            <li key={item.href} className="relative">
              {active && (
                <span
                  className="absolute"
                  style={{
                    left: -2, top: '50%', transform: 'translateY(-50%)',
                    width: 4, height: 18,
                    background: 'var(--color-brand-amber)',
                    boxShadow: '0 0 8px var(--color-brand-amber), 0 0 16px rgba(245,165,36,0.4)',
                    borderRadius: 2,
                  }}
                />
              )}
              <Link
                href={item.href}
                className="dash-nav-item flex items-center justify-between gap-2 px-3 py-2 text-[13.5px] transition-all"
                style={{
                  ...(active
                    ? {
                        background: 'linear-gradient(90deg, rgba(245,165,36,0.18) 0%, rgba(245,165,36,0.04) 100%)',
                        border: '1px solid rgba(245,165,36,0.45)',
                        color: '#ffd27a',
                        boxShadow: 'inset 0 0 12px rgba(245,165,36,0.08)',
                        ...chamfer(8),
                      }
                    : { border: '1px solid transparent', color: 'var(--color-text-muted)', ...chamfer(8) }),
                }}
              >
                <span className="flex items-center gap-2">
                  <Icon size={14} strokeWidth={1.6} />
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className="dash-mono text-[9px] px-1.5 py-0.5"
                    style={{
                      color: '#ff5cd4',
                      border: '1px solid rgba(255,92,212,0.5)',
                      background: 'rgba(255,92,212,0.08)',
                      ...chamfer(4),
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const learnItems: NavItem[] = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/dashboard/saved', label: 'Đã lưu', icon: Heart },
  { href: '/my-courses', label: 'Khóa của tôi', icon: BookMarked },
  { href: '/my-orders', label: 'Thanh toán', icon: Receipt },
  { href: '/courses', label: 'Khóa học', icon: BookOpen },
  { href: '/tutorial', label: 'Lộ trình', icon: Map },
  { href: '/explore', label: 'Khám phá 3D', icon: Globe },
  { href: '/explore?view=sky', label: 'La bàn chòm sao', icon: Telescope },
  { href: '/calendar', label: 'Lịch thiên văn', icon: CalendarDays },
]
const communityItems: NavItem[] = [
  { href: '/community', label: 'Diễn đàn', icon: MessageCircle },
  { href: '/search', label: 'Tìm kiếm', icon: Search },
]
const rewardItems: NavItem[] = [
  { href: '/gem', label: 'Gem', icon: Gem },
  { href: '/gem-shop', label: 'Cửa hàng Gem', icon: ShoppingBag, badge: 'SẮP RA MẮT' },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const equippedOverlay = useEquippedDecoration()

  return (
    <>
      <div className="min-h-screen pt-14 flex dash-font" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>

        <CosmoPageBackdrop />

        {/* Sidebar */}
        <aside
          className="hidden md:flex w-[280px] shrink-0 flex-col fixed left-0 top-14 bottom-0 z-30 backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--color-bg-surface) 94%, transparent)',
            borderRight: '1px solid var(--color-border)',
            boxShadow: '4px 0 32px rgba(0,0,0,0.25)',
          }}
        >
          {/* Profile card */}
          <div
            className="relative cosmo-dark-panel rounded-xl mx-3 mt-4 mb-2 p-4"
          >
            <Brackets c="var(--color-accent)" s={10} o={5} />
            <div className="flex items-center gap-3">
              <AvatarWithDecoration
                avatarUrl={user?.avatar}
                displayName={user?.displayName || 'Khách'}
                email={user?.email}
                overlayUrl={equippedOverlay}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-ds-text">
                  {user?.displayName || 'Khách'}
                </p>
                <p className="dash-mono text-[11px] truncate cosmo-dark-panel-muted">
                  {user?.email ?? 'Đăng nhập để đồng bộ'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
            <NavSection title="Học tập" items={learnItems} pathname={pathname} searchParams={searchParams} />
            <NavSection title="Cộng đồng" items={communityItems} pathname={pathname} searchParams={searchParams} />
            <NavSection title="Phần thưởng" items={rewardItems} pathname={pathname} searchParams={searchParams} />

            {user?.role === 'student' && (
              <div>
                <p className="dash-mono px-3 mb-1.5 text-[10px] uppercase text-ds-subtle" style={{ letterSpacing: '0.22em' }}>
                  Trở thành giảng viên
                </p>
                <ul>
                  <li className="relative">
                    {navIsActive('/apply-teacher', pathname) && (
                      <span className="absolute" style={{ left: -2, top: '50%', transform: 'translateY(-50%)', width: 4, height: 18, background: 'var(--color-brand-amber)', boxShadow: '0 0 8px var(--color-brand-amber)', borderRadius: 2 }} />
                    )}
                    <Link
                      href="/apply-teacher"
                      className="dash-nav-item flex items-center gap-2 px-3 py-2 text-[13.5px] transition-all"
                      style={navIsActive('/apply-teacher', pathname)
                        ? { background: 'linear-gradient(90deg,rgba(245,165,36,0.18) 0%,rgba(245,165,36,0.04) 100%)', border: '1px solid rgba(245,165,36,0.45)', color: '#ffd27a', ...chamfer(8) }
                        : { border: '1px solid transparent', color: 'var(--color-text-muted)', ...chamfer(8) }}
                    >
                      <UserPlus size={14} strokeWidth={1.6} />
                      Xin quyền giảng viên
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {user && (user.role === 'teacher' || user.role === 'admin') && (
              <NavSection
                title="Giảng viên"
                items={[{ href: '/studio', label: 'Studio giảng dạy', icon: Video }]}
                pathname={pathname}
                searchParams={searchParams}
              />
            )}

            {user && canModerate(user) && (
              <NavSection
                title="Kiểm duyệt"
                items={[
                  { href: '/dashboard/moderate', label: 'Trung tâm kiểm duyệt', icon: Shield },
                  { href: '/community/tin-thien-van', label: 'Tin thiên văn', icon: Newspaper },
                ]}
                pathname={pathname}
                searchParams={searchParams}
              />
            )}

            {user?.role === 'admin' && (
              <NavSection
                title="Quản trị"
                items={[{ href: '/admin', label: 'Quản trị hệ thống', icon: Settings }]}
                pathname={pathname}
                searchParams={searchParams}
              />
            )}
          </nav>

          {/* Footer */}
          <div
            className="dash-mono p-3 text-[10px] flex items-center gap-2"
            style={{ borderTop: '1px dashed rgba(126,231,255,0.1)', color: 'var(--color-text-subtle)' }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#6dffb0', boxShadow: '0 0 4px #6dffb0' }} />
            Cosmo Learn
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 md:pl-[280px] w-full min-w-0 pb-6" style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
