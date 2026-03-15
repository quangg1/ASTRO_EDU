'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { login, getGoogleAuthUrl, getFacebookAuthUrl } from '@/lib/authApi'
import { useAuthStore } from '@/store/useAuthStore'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(errorParam === 'oauth_failed' ? 'Đăng nhập Google/Facebook thất bại.' : '')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const redirectTo = searchParams.get('redirect') || '/courses'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.success && res.user) {
        setUser(res.user)
        router.push(redirectTo)
        return
      }
      setError(res.error || 'Đăng nhập thất bại')
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-cyan-400 mb-2">Đăng nhập</h1>
        <p className="text-sm text-gray-400 mb-6">Galaxies – Học thiên văn qua mô phỏng 3D</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm text-gray-400 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center mb-3">Hoặc đăng nhập bằng</p>
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
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  )
}
