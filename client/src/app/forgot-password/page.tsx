'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/authApi'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [resetLink, setResetLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSent(false)
    setResetLink(null)
    const res = await forgotPassword(email.trim())
    setLoading(false)
    if (res.success) {
      setSent(true)
      if (res.resetLink) setResetLink(res.resetLink)
    } else {
      setError(res.error || 'Gửi yêu cầu thất bại')
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-cyan-400 mb-2">Quên mật khẩu</h1>
        <p className="text-sm text-gray-400 mb-6">
          Nhập email tài khoản của bạn. Chúng tôi sẽ gửi link đặt lại mật khẩu (trong môi trường dev, link sẽ hiện bên dưới).
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                placeholder="ban@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-green-400">Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.</p>
            {resetLink && (
              <div className="p-3 rounded-lg bg-white/10 text-sm break-all">
                <p className="text-gray-400 mb-1">Link đặt lại (dev):</p>
                <a href={resetLink} className="text-cyan-400 hover:underline">
                  {resetLink}
                </a>
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
