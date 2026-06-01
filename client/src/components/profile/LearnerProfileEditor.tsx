'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, MapPin, Plus, Sparkles, Trash2, X } from 'lucide-react'
import {
  fetchMyLearnerProfile,
  updateMyLearnerProfile,
  type EducationEntry,
  type LearnerProfile,
} from '@/features/users/public'
import { useAuthStore } from '@/features/auth/public'

const EMPTY_EDU: EducationEntry = { school: '', degree: '', field: '', yearEnd: null }

const SUGGESTED_INTERESTS = [
  'Thiên văn',
  'Địa chất',
  'Hóa thạch',
  'Sinh học tiến hóa',
  'Vũ trụ',
  'Lịch sử Trái Đất',
  'STEM',
  'Đọc sách khoa học',
]

export function LearnerProfileEditor() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [interestDraft, setInterestDraft] = useState('')

  useEffect(() => {
    void fetchMyLearnerProfile().then((p) => {
      setProfile(
        p || {
          bio: '',
          location: '',
          education: [],
          interests: [],
          isPublic: true,
        },
      )
      setLoading(false)
    })
  }, [])

  const save = useCallback(async (patch: Partial<LearnerProfile>) => {
    setSaving(true)
    setMessage(null)
    const res = await updateMyLearnerProfile(patch)
    setSaving(false)
    if (res.success && res.data) {
      setProfile(res.data)
      setMessage('Đã lưu hồ sơ học tập.')
    } else {
      setMessage(res.error || 'Lưu thất bại')
    }
  }, [])

  if (loading || !profile) {
    return <p className="text-sm text-slate-500 py-4">Đang tải hồ sơ học tập…</p>
  }

  const addEducation = () => {
    if (profile.education.length >= 6) return
    const next = { ...profile, education: [...profile.education, { ...EMPTY_EDU }] }
    setProfile(next)
  }

  const updateEducation = (index: number, patch: Partial<EducationEntry>) => {
    const education = profile.education.map((e, i) => (i === index ? { ...e, ...patch } : e))
    setProfile({ ...profile, education })
  }

  const removeEducation = (index: number) => {
    setProfile({ ...profile, education: profile.education.filter((_, i) => i !== index) })
  }

  const addInterest = (tag: string) => {
    const t = tag.trim()
    if (!t || profile.interests.includes(t)) return
    if (profile.interests.length >= 16) return
    setProfile({ ...profile, interests: [...profile.interests, t] })
  }

  const previewHref = user?.id ? `/users/${user.id}` : '/profile'

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#060a1a]/95 via-[#0a1028]/90 to-[#120818]/85 p-6 sm:p-8 shadow-[0_0_40px_rgba(56,189,248,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/90 font-mono mb-1">
            Hồ sơ công khai
          </p>
          <h2 className="text-xl font-semibold text-white">Hồ sơ học tập</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Giới thiệu, học vấn và sở thích — người khác sẽ thấy khi xem trang của bạn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={previewHref}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5"
          >
            Xem trước
          </Link>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.isPublic}
              onChange={(e) => {
                const isPublic = e.target.checked
                setProfile({ ...profile, isPublic })
                void save({ isPublic })
              }}
              className="rounded border-white/20"
            />
            Hiển thị công khai
          </label>
        </div>
      </div>

      {message ? (
        <p className="text-xs text-cyan-200/80 mb-4 font-mono">{message}</p>
      ) : null}

      <label className="block text-xs text-slate-400 mb-1.5">Giới thiệu bản thân</label>
      <textarea
        value={profile.bio}
        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        placeholder="Chia sẻ đam mê học thiên văn, mục tiêu học tập, điều bạn đang khám phá…"
        className="w-full min-h-[120px] rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none"
        maxLength={2000}
      />

      <label className="flex items-center gap-2 text-xs text-slate-400 mt-4 mb-1.5">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        Khu vực (tuỳ chọn)
      </label>
      <input
        value={profile.location}
        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
        placeholder="Ví dụ: Hà Nội, Việt Nam"
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-slate-600"
        maxLength={120}
      />

      <div className="mt-6 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-cyan-100 flex items-center gap-2">
          <GraduationCap className="h-4 w-4" aria-hidden />
          Trình độ học vấn
        </h3>
        <button
          type="button"
          onClick={addEducation}
          disabled={profile.education.length >= 6}
          className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {profile.education.length === 0 ? (
          <p className="text-xs text-slate-500 border border-dashed border-white/10 rounded-lg px-4 py-6 text-center">
            Thêm trường, bằng cấp hoặc chuyên ngành để hồ sơ sinh động hơn.
          </p>
        ) : null}
        {profile.education.map((edu, i) => (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-white/8 bg-white/[0.02]"
          >
            <input
              value={edu.school}
              onChange={(e) => updateEducation(i, { school: e.target.value })}
              placeholder="Trường / tổ chức"
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white sm:col-span-2"
            />
            <input
              value={edu.degree}
              onChange={(e) => updateEducation(i, { degree: e.target.value })}
              placeholder="Bằng (VD: Cử nhân)"
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <input
              value={edu.field}
              onChange={(e) => updateEducation(i, { field: e.target.value })}
              placeholder="Chuyên ngành"
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2 sm:col-span-2">
              <input
                type="number"
                value={edu.yearEnd ?? ''}
                onChange={(e) =>
                  updateEducation(i, {
                    yearEnd: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Năm tốt nghiệp"
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                min={1950}
                max={2100}
              />
              <button
                type="button"
                onClick={() => removeEducation(i)}
                className="p-2 rounded-lg border border-white/10 text-slate-500 hover:text-rose-300 hover:border-rose-400/30"
                aria-label="Xóa mục học vấn"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-cyan-100 flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4" aria-hidden />
          Sở thích
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {profile.interests.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/25 text-violet-100"
            >
              {tag}
              <button
                type="button"
                onClick={() =>
                  setProfile({ ...profile, interests: profile.interests.filter((t) => t !== tag) })
                }
                className="opacity-60 hover:opacity-100"
                aria-label={`Xóa ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={interestDraft}
            onChange={(e) => setInterestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addInterest(interestDraft)
                setInterestDraft('')
              }
            }}
            placeholder="Thêm sở thích và Enter"
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => {
              addInterest(interestDraft)
              setInterestDraft('')
            }}
            className="px-3 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm hover:bg-cyan-500/10"
          >
            Thêm
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUGGESTED_INTERESTS.filter((s) => !profile.interests.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addInterest(s)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-500 hover:text-cyan-200 hover:border-cyan-500/30"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(profile)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Đang lưu…' : 'Lưu hồ sơ học tập'}
        </button>
      </div>
    </div>
  )
}
