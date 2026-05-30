'use client'

import { useEffect, useState } from 'react'
import {
  fetchMyTeacherProfile,
  updateMyTeacherProfile,
  uploadProfileAvatar,
  type PublicTeacherProfile,
} from '@/features/auth/public'
import { resolveMediaUrl } from '@/lib/apiConfig'

export function TeacherProfileEditor() {
  const [profile, setProfile] = useState<PublicTeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchMyTeacherProfile().then((res) => {
      setLoading(false)
      if (res.success && res.profile) setProfile(res.profile)
    })
  }, [])

  if (loading) return <p className="text-sm text-slate-500">Đang tải hồ sơ giáo viên…</p>
  if (!profile) return null

  const save = async (patch: Partial<PublicTeacherProfile>) => {
    setSaving(true)
    setMessage(null)
    const res = await updateMyTeacherProfile(patch)
    setSaving(false)
    if (res.success && res.profile) {
      setProfile(res.profile)
      setMessage('Đã lưu hồ sơ giáo viên.')
    } else {
      setMessage(res.error || 'Lưu thất bại')
    }
  }

  return (
    <div className="space-y-4 mt-6 pt-6 border-t border-white/10">
      <h3 className="text-sm font-semibold text-cyan-200 uppercase tracking-wide">Hồ sơ giáo viên (công khai trên khóa học)</h3>
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-slate-400 block">
          Họ tên hiển thị
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={profile.fullName}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            onBlur={() => save({ fullName: profile.fullName })}
          />
        </label>
        <label className="text-xs text-slate-400 block">
          Tiêu đề ngắn
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={profile.headline}
            onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
            onBlur={() => save({ headline: profile.headline })}
          />
        </label>
      </div>
      <label className="text-xs text-slate-400 block">
        Tiểu sử (học viên đọc trên trang khóa)
        <textarea
          className="mt-1 w-full min-h-[100px] rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          onBlur={() => save({ bio: profile.bio })}
        />
      </label>
      <label className="text-xs text-slate-400 block">
        Lĩnh vực (phân cách bằng dấu phẩy)
        <input
          className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          value={profile.expertise.join(', ')}
          onChange={(e) =>
            setProfile({
              ...profile,
              expertise: e.target.value.split(/[,;]/).map((x) => x.trim()).filter(Boolean),
            })
          }
          onBlur={() => save({ expertise: profile.expertise })}
        />
      </label>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 bg-black/40">
          {profile.avatarUrl ? (
            <img src={resolveMediaUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <input
          type="file"
          accept="image/*"
          disabled={saving}
          className="text-xs text-slate-400"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const up = await uploadProfileAvatar(f)
            if (up.success && up.url) {
              await save({ avatarUrl: up.url })
            }
          }}
        />
      </div>
      {saving ? <p className="text-[10px] text-slate-600">Đang lưu…</p> : null}
    </div>
  )
}
