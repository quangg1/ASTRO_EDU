'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { clearToken } from '@/lib/authApi'
import { SiteLogo } from '@/components/ui/SiteLogo'
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

  /** Phải đứng sau mọi hook — không return sớm trước useEffect (lỗi "Rendered fewer hooks" khi đổi route). */
  if (pathname === '/login' || pathname === '/register') return null

  const handleLogout = () => {
    clearToken()
    useAuthStore.getState().setUser(null)
    setUserMenuOpen(false)
    window.location.href = '/'
  }

  const isTeacher = !!user && (user.role === 'teacher' || user.role === 'admin')
  const isAdmin = !!user && user.role === 'admin'

  return (
    <header className="app-header fixed top-0 left-0 right-0 z-40 border-b border-white/[0.07] bg-[#070a10]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[#070a10]/75 shadow-[0_1px_0_rgba(34,211,238,0.06)]">
      <div className="h-[3.25rem] sm:h-14 px-3 sm:px-5 flex items-center justify-between gap-3 max-w-[1600px] mx-auto">
        <SiteLogo className="text-sm sm:text-base shrink-0" href="/" />

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1 min-w-0 flex-1 justify-end">
          {!checked || loading ? (
            <span className="text-xs text-slate-500 tabular-nums">…</span>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  navActive(pathname, '/dashboard')
                    ? 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/35'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 opacity-90" aria-hidden />
                Dashboard
              </Link>
              <Link
                href="/community"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  navActive(pathname, '/community')
                    ? 'bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <MessageCircle className="w-4 h-4 opacity-90" aria-hidden />
                Community
              </Link>

              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className={`flex items-center gap-2 rounded-full pl-1 pr-2 py-1 border transition-colors ${
                    userMenuOpen
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-cyan-500/25"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-violet-700 flex items-center justify-center text-xs font-semibold text-white">
                      {(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[120px] truncate text-sm hidden lg:inline">{user.displayName || user.email || 'Account'}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+6px)] w-56 py-1.5 rounded-xl border border-white/10 bg-[#0d121c]/95 backdrop-blur-xl shadow-[0_16px_50px_rgba(0,0,0,0.45)] z-50"
                    role="menu"
                  >
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">Tài khoản</p>
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserRound className="w-4 h-4 text-slate-500" />
                      Profile
                    </Link>
                    <div className="my-1 h-px bg-white/[0.06]" />
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">Học tập</p>
                    <Link
                      href="/my-courses"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      My Learning
                    </Link>
                    <Link
                      href="/courses"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Sparkles className="w-4 h-4 text-slate-500" />
                      Courses
                    </Link>
                    <Link
                      href="/tutorial"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <ListTree className="w-4 h-4 text-slate-500" />
                      Learning path
                    </Link>
                    <Link
                      href="/explore"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Compass className="w-4 h-4 text-slate-500" />
                      Explore
                    </Link>
                    <Link
                      href="/search"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Search className="w-4 h-4 text-slate-500" />
                      Search
                    </Link>
                    {isTeacher && (
                      <>
                        <div className="my-1 h-px bg-white/[0.06]" />
                        <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">Giảng viên</p>
                        <Link
                          href="/studio"
                          role="menuitem"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Clapperboard className="w-4 h-4 text-slate-500" />
                          Studio
                        </Link>
                      </>
                    )}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-amber-200/90 hover:bg-amber-500/10"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Shield className="w-4 h-4 text-amber-400/80" />
                        Admin
                      </Link>
                    )}
                    <div className="my-1 h-px bg-white/[0.06]" />
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300/90 hover:bg-red-500/10 text-left"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/courses"
                className="text-sm font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
              >
                Courses
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 px-3 py-1.5 rounded-full border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.04] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-white px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden shrink-0">
          <Link
            href="/search"
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] transition"
            aria-label="Tìm kiếm"
          >
            <Search className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="h-10 min-w-[4.5rem] px-3 rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 text-sm font-medium hover:bg-white/[0.08] active:scale-[0.98] transition"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0a0f17]/98 backdrop-blur">
          <nav className="px-3 py-3 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {!checked || loading ? (
              <div className="px-3 py-2 text-sm text-slate-500">Loading…</div>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium ${
                    navActive(pathname, '/dashboard') ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-200 hover:bg-white/[0.06]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  href="/community"
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium ${
                    navActive(pathname, '/community') ? 'bg-violet-500/15 text-violet-100' : 'text-slate-200 hover:bg-white/[0.06]'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Community
                </Link>
                <div className="my-2 h-px bg-white/[0.06]" />
                <p className="px-3 text-[10px] uppercase tracking-wider text-slate-500">More</p>
                <Link href="/profile" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  Profile
                </Link>
                <Link href="/my-courses" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  My Learning
                </Link>
                <Link href="/courses" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  Courses
                </Link>
                <Link href="/tutorial" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  Learning path
                </Link>
                <Link href="/explore" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  Explore
                </Link>
                <Link href="/search" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  Search
                </Link>
                {isTeacher && (
                  <Link href="/studio" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                    Studio
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin" className="block rounded-xl px-3 py-2.5 text-sm text-amber-200/90 hover:bg-amber-500/10">
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full mt-2 rounded-xl px-3 py-3 text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/15"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/courses"
                  className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.06]"
                >
                  Courses
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/login"
                    className="min-h-11 rounded-xl border border-white/15 text-center text-sm font-medium text-slate-200 inline-flex items-center justify-center hover:bg-white/[0.06]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="min-h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 text-center text-sm font-semibold text-white inline-flex items-center justify-center"
                  >
                    Sign up
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
