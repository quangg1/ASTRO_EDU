'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register, getGoogleAuthUrl, getFacebookAuthUrl } from '@/lib/authApi'
import { useAuthStore } from '@/store/useAuthStore'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    setLoading(true)
    try {
      const res = await register(email, password, displayName || undefined)
      if (res.success && res.user) {
        setUser(res.user)
        router.push('/courses')
        return
      }
      setError(res.error || 'Đăng ký thất bại')
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-cyan-400 mb-2">Đăng ký</h1>
        <p className="text-sm text-gray-400 mb-6">Tạo tài khoản để tham gia khóa học</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tên hiển thị (tùy chọn)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              placeholder="Tên của bạn"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mật khẩu (tối thiểu 6 ký tự)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center mb-3">Hoặc đăng ký bằng</p>
          <div className="flex gap-3">
            <a
              href={getGoogleAuthUrl()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
            >
              <span className="text-lg">G</span> Google
            </a>
            <a
              href={getFacebookAuthUrl()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
            >
              <span className="text-lg">f</span> Facebook
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
