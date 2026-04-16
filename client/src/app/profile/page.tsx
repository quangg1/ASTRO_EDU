'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { updateProfile, changePassword, deactivateMyAccount } from '@/lib/authApi'

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
  const [loadingDeactivate, setLoadingDeactivate] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

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
      setProfileError(res.error || 'Update failed')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match')
      setPasswordMessage('error')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
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
      setPasswordError(res.error || 'Password change failed')
    }
  }

  const handleDeactivateAccount = async () => {
    const confirmed = window.confirm('Tài khoản sẽ được đánh dấu ngừng hoạt động thay vì xóa hẳn. Bạn có chắc chắn muốn tiếp tục?')
    if (!confirmed) return
    setDeactivateError('')
    setLoadingDeactivate(true)
    const res = await deactivateMyAccount('Người dùng tự ngừng hoạt động tài khoản từ trang hồ sơ')
    setLoadingDeactivate(false)
    if (res.success) {
      useAuthStore.getState().setUser(null)
      router.replace('/login')
      return
    }
    setDeactivateError(res.error || 'Không thể ngừng hoạt động tài khoản')
  }

  if (!checked || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-20 px-4 pb-12 max-w-lg mx-auto">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href="/my-courses"
            className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-600/30"
          >
            My Learning
          </Link>
          {(user.role === 'teacher' || user.role === 'admin') && (
            <Link href="/studio" className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-gray-300 text-sm hover:bg-white/15">
              Studio
            </Link>
          )}
          {user.role === 'admin' && (
            <Link href="/admin" className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm hover:bg-amber-500/30">
              Admin
            </Link>
          )}
        </div>

        {/* Basic info */}
        <section className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-cyan-300 mb-4">Details</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                placeholder="Your name"
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
            <p className="text-xs text-gray-500">Email: {user.email || '—'} (signed in with {user.provider})</p>
            {profileMessage === 'success' && (
              <p className="text-sm text-green-400">Profile updated.</p>
            )}
            {profileMessage === 'error' && (
              <p className="text-sm text-red-400">{profileError}</p>
            )}
            <button
              type="submit"
              disabled={loadingProfile}
              className="w-full py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50"
            >
              {loadingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </section>

        {/* Change password (local accounts only) */}
        {user.provider === 'local' && (
          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">Change password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New password</label>
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
                <label className="block text-sm text-gray-400 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {passwordMessage === 'success' && (
                <p className="text-sm text-green-400">Password changed.</p>
              )}
              {passwordMessage === 'error' && (
                <p className="text-sm text-red-400">{passwordError}</p>
              )}
              <button
                type="submit"
                disabled={loadingPassword}
                className="w-full py-2.5 rounded-lg bg-white/15 border border-white/20 text-white font-medium hover:bg-white/25 disabled:opacity-50"
              >
                {loadingPassword ? 'Processing...' : 'Change password'}
              </button>
            </form>
          </section>
        )}

        <p className="mt-6 text-center">
          <Link href="/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300">
            Forgot password?
          </Link>
        </p>
        <section className="glass rounded-2xl p-6 mt-8 border border-red-500/20">
          <h2 className="text-lg font-semibold text-red-300 mb-2">Ngừng hoạt động tài khoản</h2>
          <p className="text-sm text-gray-400 mb-4">
            Tài khoản sẽ không bị xóa vĩnh viễn. Hệ thống chỉ đánh dấu ngừng hoạt động để có thể khôi phục hoặc kiểm tra khi cần.
          </p>
          {deactivateError ? <p className="text-sm text-red-400 mb-3">{deactivateError}</p> : null}
          <button
            type="button"
            onClick={handleDeactivateAccount}
            disabled={loadingDeactivate}
            className="w-full py-2.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-200 font-medium hover:bg-red-600/30 disabled:opacity-50"
          >
            {loadingDeactivate ? 'Đang xử lý...' : 'Ngừng hoạt động tài khoản'}
          </button>
        </section>
      </main>
    </div>
  )
}
