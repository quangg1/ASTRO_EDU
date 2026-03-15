'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { clearToken } from '@/lib/authApi'

export function AppHeader() {
  const { user, loading, checked } = useAuthStore()

  const handleLogout = () => {
    clearToken()
    useAuthStore.getState().setUser(null)
    window.location.href = '/'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-black/80 backdrop-blur border-b border-white/10">
      <Link href="/" className="text-lg font-semibold text-cyan-400 hover:text-cyan-300">
        🌌 Galaxies Edu
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/search"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Tìm kiếm
        </Link>
        <Link
          href="/explore"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Khám phá
        </Link>
        <Link
          href="/tutorial"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Tutorial
        </Link>
        <Link
          href="/courses"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Khóa học
        </Link>
        <Link
          href="/community"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Cộng đồng
        </Link>
        {user && (user.role === 'teacher' || user.role === 'admin') && (
          <Link href="/studio" className="text-sm text-gray-300 hover:text-white transition-colors">
            Studio
          </Link>
        )}
        {user && user.role === 'admin' && (
          <Link href="/admin" className="text-sm text-gray-300 hover:text-white transition-colors">
            Admin
          </Link>
        )}
        {!checked || loading ? (
          <span className="text-sm text-gray-500">Đang tải...</span>
        ) : user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-sm text-gray-400 hover:text-white truncate max-w-[120px] flex items-center gap-2"
            >
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              {user.displayName || user.email || 'User'}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              Thoát
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm px-3 py-1.5 rounded bg-white/10 text-gray-300 hover:bg-cyan-600 hover:text-white transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="text-sm px-3 py-1.5 rounded bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
            >
              Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
