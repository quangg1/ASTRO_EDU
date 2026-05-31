'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookMarked, BookOpen, Map, Globe, Receipt,
  MessageCircle, Search, Gem, ShoppingBag, Video,
  Shield, Newspaper, Settings, UserPlus,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { useEquippedDecoration } from '@/features/rewards/hooks/useEquippedDecoration'
import { AvatarWithDecoration } from '@/components/profile/AvatarWithDecoration'
import { canModerate } from '@/lib/roles'

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 12, o = 5 }: { c?: string; s?: number; o?: number }) {
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

function navIsActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/'
  if (pathname === href) return true
  return href !== '/' && pathname.startsWith(`${href}/`)
}

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string }

function NavSection({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) {
  return (
    <div>
      <p className="dash-mono px-3 mb-1.5 text-[10px] uppercase" style={{ letterSpacing: '0.22em', color: '#8a9bb8' }}>
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = navIsActive(item.href, pathname)
          const Icon = item.icon
          return (
            <li key={item.href} className="relative">
              {active && (
                <span
                  className="absolute"
                  style={{
                    left: -2, top: '50%', transform: 'translateY(-50%)',
                    width: 4, height: 18,
                    background: '#f5a524',
                    boxShadow: '0 0 8px #f5a524, 0 0 16px rgba(245,165,36,0.4)',
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
                    : { border: '1px solid transparent', color: '#9aa8c4', ...chamfer(8) }),
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
  { href: '/my-courses', label: 'Khóa của tôi', icon: BookMarked },
  { href: '/my-orders', label: 'Thanh toán', icon: Receipt },
  { href: '/courses', label: 'Khóa học', icon: BookOpen },
  { href: '/tutorial', label: 'Lộ trình', icon: Map },
  { href: '/explore', label: 'Khám phá 3D', icon: Globe },
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
  const { user } = useAuthStore()
  const equippedOverlay = useEquippedDecoration()

  return (
    <>
      <div className="min-h-screen pt-14 flex dash-font" style={{ background: '#03060f', color: '#eaf6ff' }}>

        {/* Background layers */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(126,231,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(126,231,255,0.022) 1px,transparent 1px)`,
              backgroundSize: '80px 80px',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)',
            }}
          />
          <div
            className="absolute left-0 right-0 h-[6px] dash-scanline"
            style={{ background: 'linear-gradient(transparent,rgba(126,231,255,0.04),transparent)', top: 0 }}
          />
          <div className="absolute top-0 left-0" style={{ width: '40vw', height: '40vh', background: 'radial-gradient(ellipse,rgba(245,165,36,0.025) 0%,transparent 70%)' }} />
          <div className="absolute bottom-0 right-0" style={{ width: '40vw', height: '40vh', background: 'radial-gradient(ellipse,rgba(126,231,255,0.025) 0%,transparent 70%)' }} />
          <div
            className="dash-mono hidden xl:block absolute select-none"
            style={{ color: '#1a2235', fontSize: 10, left: 6, top: '50%', transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center', whiteSpace: 'nowrap', pointerEvents: 'none' }}
          >
            CosmoLearn · v2.6 · Hanoi observatory link
          </div>
          <div
            className="dash-mono hidden xl:block absolute select-none"
            style={{ color: '#1a2235', fontSize: 10, right: 6, top: '50%', transform: 'rotate(90deg) translateX(50%)', transformOrigin: 'right center', whiteSpace: 'nowrap', pointerEvents: 'none' }}
          >
            Lat 21.0285° N — Lon 105.8542° E — Alt 12m
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className="hidden md:flex w-[280px] shrink-0 flex-col fixed left-0 top-14 bottom-0 z-30 backdrop-blur-md"
          style={{
            background: 'linear-gradient(180deg,rgba(6,9,26,0.98) 0%,rgba(3,6,15,0.98) 100%)',
            borderRight: '1px solid rgba(126,231,255,0.14)',
            boxShadow: '1px 0 24px rgba(126,231,255,0.04)',
          }}
        >
          {/* Profile card */}
          <div
            className="relative mx-3 mt-4 mb-2 p-4"
            style={{
              background: 'rgba(10,16,36,0.8)',
              border: '1px solid rgba(126,231,255,0.18)',
              boxShadow: 'inset 0 0 20px rgba(126,231,255,0.04)',
              ...chamfer(12),
            }}
          >
            <Brackets c="#7ee7ff" s={10} o={5} />
            <div className="flex items-center gap-3">
              <AvatarWithDecoration
                avatarUrl={user?.avatar}
                displayName={user?.displayName || 'Khách'}
                email={user?.email}
                overlayUrl={equippedOverlay}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#eaf6ff' }}>
                  {user?.displayName || 'Khách'}
                </p>
                <p className="dash-mono text-[11px] truncate" style={{ color: '#5c6886' }}>
                  {user?.email ?? 'Đăng nhập để đồng bộ'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
            <NavSection title="Học tập" items={learnItems} pathname={pathname} />
            <NavSection title="Cộng đồng" items={communityItems} pathname={pathname} />
            <NavSection title="Phần thưởng" items={rewardItems} pathname={pathname} />

            {user?.role === 'student' && (
              <div>
                <p className="dash-mono px-3 mb-1.5 text-[10px] uppercase" style={{ letterSpacing: '0.22em', color: '#8a9bb8' }}>
                  Trở thành giảng viên
                </p>
                <ul>
                  <li className="relative">
                    {navIsActive('/apply-teacher', pathname) && (
                      <span className="absolute" style={{ left: -2, top: '50%', transform: 'translateY(-50%)', width: 4, height: 18, background: '#f5a524', boxShadow: '0 0 8px #f5a524', borderRadius: 2 }} />
                    )}
                    <Link
                      href="/apply-teacher"
                      className="dash-nav-item flex items-center gap-2 px-3 py-2 text-[13.5px] transition-all"
                      style={navIsActive('/apply-teacher', pathname)
                        ? { background: 'linear-gradient(90deg,rgba(245,165,36,0.18) 0%,rgba(245,165,36,0.04) 100%)', border: '1px solid rgba(245,165,36,0.45)', color: '#ffd27a', ...chamfer(8) }
                        : { border: '1px solid transparent', color: '#9aa8c4', ...chamfer(8) }}
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
              />
            )}

            {user?.role === 'admin' && (
              <NavSection
                title="Quản trị"
                items={[{ href: '/admin', label: 'Quản trị hệ thống', icon: Settings }]}
                pathname={pathname}
              />
            )}
          </nav>

          {/* Footer */}
          <div
            className="dash-mono p-3 text-[10px] flex items-center gap-2"
            style={{ borderTop: '1px dashed rgba(126,231,255,0.1)', color: '#5c6886' }}
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
