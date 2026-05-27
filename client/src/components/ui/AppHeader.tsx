'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore, clearToken } from '@/features/auth/public'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { viText } from '@/messages/vi'
import { canAccessStudio, canAdminContentOverride, canModerate, canManagePlatform } from '@/lib/roles'
import { AvatarWithDecoration } from '@/components/profile/AvatarWithDecoration'
import { useEquippedDecoration } from '@/features/rewards/hooks/useEquippedDecoration'
import { navItemsForSurface, navLabel } from '@/lib/navigationConfig'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import {
  BookOpen,
  ChevronDown,
  Clapperboard,
  Compass,
  LayoutDashboard,
  ListTree,
  LogOut,
  MessageCircle,
  Search,
  Sparkles,
  Gavel,
  Shield,
  UserRound,
} from 'lucide-react'

function navActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  if (pathname === href) return true
  return href !== '/' && pathname.startsWith(`${href}/`)
}

export function AppHeader() {
  const pathname = usePathname()
  const { user, loading, checked } = useAuthStore()
  const equippedOverlay = useEquippedDecoration()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false)
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', onDoc)
      return () => document.removeEventListener('mousedown', onDoc)
    }
  }, [userMenuOpen])

  const handleLogout = () => {
    clearToken()
    useAuthStore.getState().setUser(null)
    setUserMenuOpen(false)
    window.location.href = '/'
  }

  const showStudio = !!user && canAccessStudio(user)
  const showStudioOverride = !!user && canAdminContentOverride(user)
  const showModerate = !!user && canModerate(user)
  const showAdmin = !!user && canManagePlatform(user)
  const headerDesktopItems = navItemsForSurface('headerDesktop')
  const headerMobileItems = navItemsForSurface('headerMobileMenu')
  const desktopIconById = {
    dashboard: LayoutDashboard,
    community: MessageCircle,
  } as const
  const dropdownIconById = {
    profile: UserRound,
    myLearning: BookOpen,
    courses: Sparkles,
    learningPath: ListTree,
    explore: Compass,
    search: Search,
  } as const
  const mobileTopItemIds = new Set(['dashboard', 'community'])
  const mobileMoreItemIds = new Set(['profile', 'myLearning', 'courses', 'learningPath', 'explore', 'search'])
  const sciFiClip = 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
  const navBtnBase =
    'inline-flex items-center gap-2 px-4 py-[7px] text-[11px] font-bold uppercase tracking-widest border-2 transition-colors'
  const navBtnActive = 'border-[#7ee7ff]/80 bg-[#7ee7ff]/15 text-[#7ee7ff]'
  const navBtnIdle =
    'border-[#7ee7ff]/30 text-slate-300 hover:border-[#7ee7ff]/70 hover:text-[#7ee7ff] hover:bg-[#7ee7ff]/10'

  return (
    <header
      className="app-header fixed top-0 left-0 right-0 z-40 backdrop-blur-[12px]"
      style={{
        background:
          'linear-gradient(180deg, rgba(8,16,38,0.92) 0%, rgba(3,6,15,0.85) 100%)',
        borderBottom: '1px solid rgba(126,231,255,0.5)',
        boxShadow:
          '0 1px 0 rgba(126,231,255,0.2), 0 2px 16px rgba(126,231,255,0.12)',
      }}
    >
      <div className="relative h-[3.25rem] sm:h-14 px-3 sm:px-5 flex items-center justify-between gap-3 max-w-[1600px] mx-auto">
        <div className="flex items-stretch h-full gap-3 shrink-0">
          <SiteLogo className="text-sm sm:text-base shrink-0 self-center" href="/" />
          {/* Sci-fi diagonal stripes — 2 vertical bars full-height + horizontal gradient tail */}
          <div className="hidden md:flex items-stretch gap-1.5 h-full" aria-hidden>
            <span
              className="block w-[6px] h-full"
              style={{
                background: '#7ee7ff',
                transform: 'skewX(-26deg)',
                boxShadow: '0 0 12px rgba(126,231,255,0.75)',
              }}
            />
            <span
              className="block w-[5px] h-full"
              style={{
                background: 'rgba(126,231,255,0.55)',
                transform: 'skewX(-26deg)',
              }}
            />
          </div>
          <div
            className="hidden md:block self-center h-px w-[140px]"
            style={{
              background:
                'linear-gradient(90deg, rgba(126,231,255,0.8) 0%, transparent 100%)',
            }}
            aria-hidden
          />
        </div>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1 min-w-0 flex-1 justify-end">
          {!checked || loading ? (
            <span className="text-xs text-slate-500 tabular-nums">…</span>
          ) : user ? (
            <>
              {headerDesktopItems
                .filter((item) => item.id in desktopIconById)
                .map((item) => {
                  const Icon = desktopIconById[item.id as keyof typeof desktopIconById]
                  return (
                    <Link
                      key={`desktop-${item.id}`}
                      href={item.href}
                      style={{ clipPath: sciFiClip }}
                      className={`${navBtnBase} ${
                        navActive(pathname, item.href) ? navBtnActive : navBtnIdle
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden />
                      {navLabel(item)}
                    </Link>
                  )
                })}

              <NotificationBell />

              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  style={{ clipPath: sciFiClip }}
                  className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-[5px] border-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    userMenuOpen ? navBtnActive : navBtnIdle
                  }`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <AvatarWithDecoration
                    avatarUrl={user.avatar}
                    displayName={user.displayName}
                    email={user.email}
                    overlayUrl={equippedOverlay}
                    size="sm"
                  />
                  <span className="max-w-[120px] truncate hidden lg:inline">{user.displayName || user.email || viText.nav.account}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] w-60 py-2 backdrop-blur-xl z-50"
                    role="menu"
                    style={{
                      clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                      background: 'linear-gradient(180deg, rgba(8,16,38,0.96) 0%, rgba(3,6,15,0.96) 100%)',
                      border: '1px solid rgba(126,231,255,0.35)',
                      boxShadow: '0 0 0 1px rgba(126,231,255,0.08), 0 12px 40px rgba(0,0,0,0.55), 0 0 24px rgba(126,231,255,0.12)',
                    }}
                  >
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-[#7ee7ff]/80">// Tài khoản</p>
                    {headerMobileItems
                      .filter((item) => item.id in dropdownIconById)
                      .map((item) => {
                        const Icon = dropdownIconById[item.id as keyof typeof dropdownIconById]
                        return (
                          <Link
                            key={`dropdown-${item.id}`}
                            href={item.href}
                            role="menuitem"
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-200 hover:bg-[#7ee7ff]/10 hover:text-[#7ee7ff] transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Icon className="w-4 h-4 text-[#7ee7ff]/70" />
                            {navLabel(item)}
                          </Link>
                        )
                      })}
                    {showStudio && (
                      <>
                        <div className="my-1 h-px bg-[#7ee7ff]/15" />
                        <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-[#7ee7ff]/80">// Giảng viên</p>
                        <Link
                          href="/studio"
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-200 hover:bg-[#7ee7ff]/10 hover:text-[#7ee7ff] transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Clapperboard className="w-4 h-4 text-[#7ee7ff]/70" />
                          Studio
                        </Link>
                      </>
                    )}
                    {showStudioOverride && (
                      <Link
                        href="/studio"
                        role="menuitem"
                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-amber-200/80 hover:bg-amber-500/12 hover:text-amber-100 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Clapperboard className="w-4 h-4 text-amber-400/70" />
                        Studio (override)
                      </Link>
                    )}
                    {showModerate && (
                      <Link
                        href="/dashboard/moderate"
                        role="menuitem"
                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-violet-200/95 hover:bg-violet-500/15 hover:text-violet-100 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Gavel className="w-4 h-4 text-violet-400/90" />
                        {viText.nav.moderate}
                      </Link>
                    )}
                    {showAdmin && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#f5a524] hover:bg-[#f5a524]/12 hover:text-[#ffd27a] transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Shield className="w-4 h-4 text-[#f5a524]" />
                        {viText.nav.admin}
                      </Link>
                    )}
                    <div className="my-1 h-px bg-[#7ee7ff]/15" />
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-300 hover:bg-red-500/12 hover:text-red-200 text-left transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      {viText.nav.signOut}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/courses"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                className="inline-flex items-center gap-2 px-4 py-[7px] text-[11px] font-bold uppercase tracking-widest border-2 border-[#7ee7ff]/30 text-slate-300 hover:border-[#7ee7ff]/70 hover:text-[#7ee7ff] hover:bg-[#7ee7ff]/10 transition-colors"
              >
                {viText.nav.courses}
              </Link>
              <Link
                href="/login"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                className="inline-flex items-center gap-2 px-4 py-[7px] text-[11px] font-bold uppercase tracking-widest border-2 border-[#7ee7ff]/30 text-slate-300 hover:border-[#7ee7ff]/70 hover:text-[#7ee7ff] hover:bg-[#7ee7ff]/10 transition-colors"
              >
                {viText.nav.signIn}
              </Link>
              <Link
                href="/register"
                style={{
                  clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                  background: '#f5a524',
                  color: '#1a0e00',
                  boxShadow: '0 0 18px rgba(245,165,36,0.4)',
                }}
                className="inline-flex items-center gap-2 px-5 py-[7px] text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                {viText.nav.signUp}
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden shrink-0">
          {user ? <NotificationBell /> : null}
          <Link
            href="/search"
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl border-2 border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] transition"
            aria-label="Tìm kiếm"
          >
            <Search className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="h-10 min-w-[4.5rem] px-3 rounded-xl border-2 border-white/10 bg-white/[0.04] text-slate-200 text-sm font-medium hover:bg-white/[0.08] active:scale-[0.98] transition"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? viText.common.close : viText.common.menu}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0a0f17]/98 backdrop-blur">
          <nav className="px-3 py-3 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {!checked || loading ? (
              <div className="px-3 py-2 text-sm text-slate-500">{viText.common.loading}</div>
            ) : user ? (
              <>
                {headerMobileItems
                  .filter((item) => mobileTopItemIds.has(item.id))
                  .map((item) => {
                    const Icon = desktopIconById[item.id as keyof typeof desktopIconById]
                    const activeCls =
                      item.id === 'dashboard' ? 'bg-cyan-500/15 text-cyan-100' : 'bg-violet-500/15 text-violet-100'
                    return (
                      <Link
                        key={`mobile-top-${item.id}`}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium ${
                          navActive(pathname, item.href) ? activeCls : 'text-slate-200 hover:bg-white/[0.06]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {navLabel(item)}
                      </Link>
                    )
                  })}
                <div className="my-2 h-px bg-white/[0.06]" />
                <p className="px-3 text-[10px] uppercase tracking-wider text-slate-500">{viText.nav.more}</p>
                {headerMobileItems
                  .filter((item) => mobileMoreItemIds.has(item.id))
                  .map((item) => (
                    <Link
                      key={`mobile-more-${item.id}`}
                      href={item.href}
                      className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]"
                    >
                      {navLabel(item)}
                    </Link>
                  ))}
                {showStudio && (
                  <Link href="/studio" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                    Studio
                  </Link>
                )}
                {showStudioOverride && (
                  <Link href="/studio" className="block rounded-xl px-3 py-2.5 text-sm text-amber-200/80 hover:bg-amber-500/10">
                    Studio (override)
                  </Link>
                )}
                {showModerate && (
                  <Link
                    href="/dashboard/moderate"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-violet-200/95 hover:bg-violet-500/10"
                  >
                    <Gavel className="w-4 h-4 shrink-0 text-violet-400/90" />
                    {viText.nav.moderate}
                  </Link>
                )}
                {showAdmin && (
                  <Link href="/admin" className="block rounded-xl px-3 py-2.5 text-sm text-amber-200/90 hover:bg-amber-500/10">
                    {viText.nav.admin}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full mt-2 rounded-xl px-3 py-3 text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/15"
                >
                  {viText.nav.signOut}
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/courses"
                  className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.06]"
                >
                  {viText.nav.courses}
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/login"
                    className="min-h-11 rounded-xl border border-white/15 text-center text-sm font-medium text-slate-200 inline-flex items-center justify-center hover:bg-white/[0.06]"
                  >
                    {viText.nav.signIn}
                  </Link>
                  <Link
                    href="/register"
                    className="min-h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 text-center text-sm font-semibold text-white inline-flex items-center justify-center"
                  >
                    {viText.nav.signUp}
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
