'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore, updateProfile, changePassword, deactivateMyAccount } from '@/features/auth/public'
import { canAdminContentOverride, canEnterStudio, canManagePlatform, canModerate } from '@/lib/roles'
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor'
import { AvatarDecorationPicker } from '@/components/profile/AvatarDecorationPicker'
import { Button, Input } from '@/design-system'

function isStudentRole(role: string | undefined) {
  return role === 'student'
}

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
    const res = await updateProfile({
      displayName: displayName.trim() || undefined,
      avatar: avatar.trim() || undefined,
    })
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

  const handleDeactivateAccount = async () => {
    const confirmed = window.confirm(
      'Tài khoản sẽ được đánh dấu ngừng hoạt động thay vì xóa hẳn. Bạn có chắc chắn muốn tiếp tục?',
    )
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
        <p className="text-gray-500">Đang tải…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-20 px-4 pb-12 max-w-lg mx-auto">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">
          ← Về trang chủ
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">Hồ sơ</h1>
        <p className="text-sm text-slate-500 mb-2">Tên hiển thị và ảnh đại diện dùng trên header và các khu vực có tài khoản.</p>
        {user?.id && (
          <p className="text-sm mb-6">
            <Link href={`/users/${user.id}`} className="text-cyan-400 hover:text-cyan-300">
              Xem hồ sơ công khai (như người khác thấy) →
            </Link>
          </p>
        )}
        {!user?.id && <div className="mb-6" />}

        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href="/my-courses"
            className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-600/30"
          >
            Học của tôi
          </Link>
          <Link
            href="/gem"
            className="px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/35 text-violet-200 text-sm hover:bg-violet-500/25"
          >
            Ví Gem
          </Link>
          <Link
            href="/gem/tiers"
            className="px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/35 text-violet-200 text-sm hover:bg-violet-500/25"
          >
            Hạng Learner
          </Link>
          {isStudentRole(user.role) && (
            <Link
              href="/apply-teacher"
              className="px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/35 text-violet-200 text-sm hover:bg-violet-500/25"
            >
              Xin quyền giảng viên
            </Link>
          )}
          {canEnterStudio(user) && (
            <Link
              href="/studio"
              className={`px-4 py-2 rounded-lg text-sm hover:bg-white/15 ${
                canAdminContentOverride(user)
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200'
                  : 'bg-white/10 border border-white/20 text-gray-300'
              }`}
            >
              {canAdminContentOverride(user) ? 'Studio (override)' : 'Studio'}
            </Link>
          )}
          {canModerate(user) && (
            <Link
              href="/dashboard/moderate"
              className="px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/35 text-violet-200 text-sm hover:bg-violet-500/25"
            >
              Kiểm duyệt diễn đàn
            </Link>
          )}
          {canManagePlatform(user) && (
            <Link href="/admin" className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm hover:bg-amber-500/30">
              Quản trị hệ thống
            </Link>
          )}
        </div>

        <section className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-cyan-300 mb-4">Ảnh đại diện & tên</h2>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <ProfileAvatarEditor
              avatarUrl={avatar}
              displayName={displayName}
              email={user.email}
              onAvatarChange={setAvatar}
              disabled={loadingProfile}
              onUploadSuccess={async (url) => {
                setProfileMessage(null)
                setProfileError('')
                setLoadingProfile(true)
                const res = await updateProfile({ avatar: url })
                setLoadingProfile(false)
                if (res.success && res.user) {
                  useAuthStore.getState().setUser(res.user)
                  setProfileMessage('success')
                } else {
                  setProfileMessage('error')
                  setProfileError(res.error || 'Ảnh đã tải lên nhưng lưu hồ sơ thất bại.')
                }
              }}
            />
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tên hiển thị</label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tên của bạn"
              />
            </div>
            <p className="text-xs text-gray-500">
              Email: {user.email || '—'} · Đăng nhập qua {user.provider}
            </p>
            {profileMessage === 'success' && <p className="text-sm text-green-400">Đã lưu hồ sơ.</p>}
            {profileMessage === 'error' && <p className="text-sm text-red-400">{profileError}</p>}
            <Button type="submit" disabled={loadingProfile} className="w-full">
              {loadingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
            <p className="text-xs text-slate-500">
              Ảnh tải lên được lưu tự động sau khi CDN trả link. Đổi tên hiển thị thì nhấn «Lưu thay đổi».
            </p>
          </form>
        </section>

        <section className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-violet-300 mb-2">Trang trí avatar</h2>
          <p className="text-sm text-slate-500 mb-4">
            Chọn một trang trí để xem trước trên avatar — sau khi nhận/mua, bấm «Đeo» để hiện trên hồ sơ và header.
            Ảnh đại diện ở mục trên không đổi.
          </p>
          <AvatarDecorationPicker avatarUrl={avatar} displayName={displayName} email={user.email} />
        </section>

        {user.provider === 'local' && (
          <section className="glass rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">Đổi mật khẩu</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu hiện tại</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu mới</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Xác nhận mật khẩu mới</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {passwordMessage === 'success' && <p className="text-sm text-green-400">Đã đổi mật khẩu.</p>}
              {passwordMessage === 'error' && <p className="text-sm text-red-400">{passwordError}</p>}
              <Button type="submit" variant="secondary" disabled={loadingPassword} className="w-full">
                {loadingPassword ? 'Đang xử lý…' : 'Đổi mật khẩu'}
              </Button>
            </form>
          </section>
        )}

        <p className="text-center">
          <Link href="/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300">
            Quên mật khẩu?
          </Link>
        </p>

        <section className="glass rounded-2xl p-6 mt-8 border border-red-500/20">
          <h2 className="text-lg font-semibold text-red-300 mb-2">Ngừng hoạt động tài khoản</h2>
          <p className="text-sm text-gray-400 mb-4">
            Tài khoản sẽ không bị xóa vĩnh viễn. Hệ thống chỉ đánh dấu ngừng hoạt động để có thể khôi phục hoặc kiểm tra khi cần.
          </p>
          {deactivateError ? <p className="text-sm text-red-400 mb-3">{deactivateError}</p> : null}
          <Button
            type="button"
            variant="secondary"
            onClick={handleDeactivateAccount}
            disabled={loadingDeactivate}
            className="w-full border-red-500/30 text-red-200 hover:bg-red-600/20"
          >
            {loadingDeactivate ? 'Đang xử lý…' : 'Ngừng hoạt động tài khoản'}
          </Button>
        </section>
      </main>
    </div>
  )
}
