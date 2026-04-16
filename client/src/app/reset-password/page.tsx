'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/lib/authApi'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp')
      return
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    if (!token) {
      setError('Thiếu token đặt lại mật khẩu. Vui lòng dùng link từ email.')
      return
    }
    setLoading(true)
    const res = await resetPassword(token, newPassword)
    setLoading(false)
    if (res.success) {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } else {
      setError(res.error || 'Đặt lại mật khẩu thất bại')
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-cyan-400 mb-2">Đặt lại mật khẩu</h1>
        <p className="text-sm text-red-300 mb-4">Link không hợp lệ. Vui lòng yêu cầu link mới từ trang Quên mật khẩu.</p>
        <Link href="/forgot-password" className="text-cyan-400 hover:underline">
          Quên mật khẩu
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-cyan-400 mb-2">Đặt lại mật khẩu</h1>
        <p className="text-green-400">Mật khẩu đã được cập nhật. Đang chuyển về trang đăng nhập...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm glass rounded-2xl p-6 shadow-xl">
      <h1 className="text-xl font-bold text-cyan-400 mb-2">Đặt lại mật khẩu</h1>
      <p className="text-sm text-gray-400 mb-6">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Mật khẩu mới (ít nhất 6 ký tự)</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-400">
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
          ← Quay lại đăng nhập
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <Suspense fallback={<p className="text-gray-500">Đang tải...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
