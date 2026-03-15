'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { updateProfile, changePassword } from '@/lib/authApi'

export default function ProfilePage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<'success' | 'error' | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<'success' | 'error' | null>(null)
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  useEffect(() => {
    if (checked && !user) {
      router.replace('/login?redirect=/profile')
      return
    }
    if (user) {
      setDisplayName(user.displayName || '')
      setAvatar(user.avatar || '')
    }
  }, [checked, user, router])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    setProfileError('')
    setLoadingProfile(true)
    const res = await updateProfile({ displayName: displayName.trim() || undefined, avatar: avatar.trim() || undefined })
    setLoadingProfile(false)
    if (res.success && res.user) {
      useAuthStore.getState().setUser(res.user)
      setProfileMessage('success')
    } else {
      setProfileMessage('error')
      setProfileError(res.error || 'Cập nhật thất bại')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới và xác nhận không khớp')
      setPasswordMessage('error')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới tối thiểu 6 ký tự')
      setPasswordMessage('error')
      return
    }
    setLoadingPassword(true)
    const res = await changePassword(currentPassword, newPassword)
    setLoadingPassword(false)
    if (res.success) {
      setPasswordMessage('success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPasswordMessage('error')
      setPasswordError(res.error || 'Đổi mật khẩu thất bại')
    }
  }

  if (!checked || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-20 px-4 pb-12 max-w-lg mx-auto">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">
          ← Về trang chủ
        </Link>
        <h1 className="text-2xl font-bold text-white mb-8">Hồ sơ cá nhân</h1>

        {/* Thông tin cơ bản */}
        <section className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-cyan-300 mb-4">Thông tin</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tên hiển thị</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                placeholder="Tên của bạn"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Avatar (URL)</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>
            <p className="text-xs text-gray-500">Email: {user.email || '—'} (đăng nhập bằng {user.provider})</p>
            {profileMessage === 'success' && (
              <p className="text-sm text-green-400">Đã cập nhật thông tin.</p>
            )}
            {profileMessage === 'error' && (
              <p className="text-sm text-red-400">{profileError}</p>
            )}
            <button
              type="submit"
              disabled={loadingProfile}
              className="w-full py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50"
            >
              {loadingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </section>

        {/* Đổi mật khẩu (chỉ tài khoản local) */}
        {user.provider === 'local' && (
          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">Đổi mật khẩu</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  placeholder="••••••••"
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
                />
              </div>
              {passwordMessage === 'success' && (
                <p className="text-sm text-green-400">Đã đổi mật khẩu.</p>
              )}
              {passwordMessage === 'error' && (
                <p className="text-sm text-red-400">{passwordError}</p>
              )}
              <button
                type="submit"
                disabled={loadingPassword}
                className="w-full py-2.5 rounded-lg bg-white/15 border border-white/20 text-white font-medium hover:bg-white/25 disabled:opacity-50"
              >
                {loadingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </form>
          </section>
        )}

        <p className="mt-6 text-center">
          <Link href="/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300">
            Quên mật khẩu?
          </Link>
        </p>
      </main>
    </div>
  )
}
