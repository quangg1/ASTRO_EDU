'use client'

import { useState } from 'react'
import {
  submitTeacherApplication,
  uploadAvatarForApplication,
  uploadTeacherApplicationCertificate,
  uploadTeacherApplicationCv,
} from '@/features/auth/public'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { UniversitySearchField } from '@/components/auth/UniversitySearchField'

const BIO_MIN = 30

const TEACHING_LEVELS = [
  'Mầm non',
  'Tiểu học',
  'THCS',
  'THPT',
  'Đại học',
  'Sau đại học',
  'Công chúng / đào tạo ngắn',
] as const

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(126,231,255,0.15)',
  borderRadius: 2,
  color: '#eaf6ff',
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  fontFamily: "'Space Grotesk', sans-serif",
  boxSizing: 'border-box',
}

function phoneDigits(phone: string) {
  return (phone.match(/\d/g) || []).length
}

export function ApplyTeacherForm({
  defaultName,
  defaultEmail,
  onSubmitted,
}: {
  defaultName?: string
  defaultEmail?: string | null
  onSubmitted: () => void
}) {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState(defaultName || '')
  const [phone, setPhone] = useState('')
  const [headline, setHeadline] = useState('')
  const [city, setCity] = useState('')
  const [organization, setOrganization] = useState('')
  const [organizationRole, setOrganizationRole] = useState('')
  const [expertise, setExpertise] = useState('')
  const [education, setEducation] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [teachingLevels, setTeachingLevels] = useState<string[]>([])
  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [cvUrl, setCvUrl] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [certificateUrl, setCertificateUrl] = useState('')
  const [certificateFileName, setCertificateFileName] = useState('')
  const [uploadingCv, setUploadingCv] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleLevel = (level: string) => {
    setTeachingLevels((prev) =>
      prev.includes(level) ? prev.filter((x) => x !== level) : [...prev, level],
    )
  }

  const canStep1 =
    fullName.trim().length >= 2 &&
    phoneDigits(phone) >= 9 &&
    headline.trim().length >= 3 &&
    organization.trim().length >= 2 &&
    expertise.trim().length >= 2 &&
    education.trim().length >= 2

  const canStep2 = bio.trim().length >= BIO_MIN
  const canStep3 = Boolean(cvUrl)

  const handleCv = async (file: File | null) => {
    if (!file) return
    setError('')
    setUploadingCv(true)
    const res = await uploadTeacherApplicationCv(file)
    setUploadingCv(false)
    if (res.success && res.url) {
      setCvUrl(res.url)
      setCvFileName(res.filename || file.name)
    } else {
      setError(res.error || 'Tải CV thất bại')
    }
  }

  const handleCert = async (file: File | null) => {
    if (!file) return
    setError('')
    setUploadingCert(true)
    const res = await uploadTeacherApplicationCertificate(file)
    setUploadingCert(false)
    if (res.success && res.url) {
      setCertificateUrl(res.url)
      setCertificateFileName(res.filename || file.name)
    } else {
      setError(res.error || 'Tải giấy tờ thất bại')
    }
  }

  const handleAvatar = async (file: File | null) => {
    if (!file) return
    setError('')
    setUploadingAvatar(true)
    const res = await uploadAvatarForApplication(file)
    setUploadingAvatar(false)
    if (res.success && res.url) {
      setAvatarUrl(res.url)
    } else {
      setError(res.error || 'Tải ảnh thất bại')
    }
  }

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    const res = await submitTeacherApplication({
      fullName: fullName.trim(),
      phone: phone.trim(),
      headline: headline.trim(),
      city: city.trim(),
      organization: organization.trim(),
      organizationRole: organizationRole.trim(),
      teachingLevels,
      expertise: expertise.trim(),
      education: education.trim(),
      yearsExperience: yearsExperience.trim() ? Number(yearsExperience) : undefined,
      website: website.trim(),
      linkedin: linkedin.trim(),
      avatarUrl: avatarUrl || undefined,
      bio: bio.trim(),
      cvUrl,
      cvFileName,
      certificateUrl: certificateUrl || undefined,
      certificateFileName,
    })
    setSubmitting(false)
    if (res.success) {
      onSubmitted()
    } else {
      setError(res.error || 'Gửi đơn thất bại')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
        {['Liên hệ & nghề', 'Giới thiệu', 'Hồ sơ & CV'].map((label, i) => (
          <span
            key={label}
            className={`px-2 py-1 rounded border ${
              step === i + 1
                ? 'border-cyan-500/50 text-cyan-200 bg-cyan-500/10'
                : step > i + 1
                  ? 'border-emerald-500/30 text-emerald-300'
                  : 'border-white/10'
            }`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {defaultEmail ? (
        <p className="text-xs text-slate-500 font-mono">
          Đăng nhập bằng: <span className="text-slate-300">{defaultEmail}</span> — khi duyệt bạn dùng
          cùng tài khoản này, không cần mật khẩu mới.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-xs text-slate-400">
            Họ tên đầy đủ <span className="text-pink-400">*</span>
            <input className="mt-1 w-full" style={fieldStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="block text-xs text-slate-400">
            Số điện thoại <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 09xxxxxxxx"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Chức danh / mô tả ngắn <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="VD: Giảng viên Vật lý THPT, TS. Thiên văn học"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Thành phố / tỉnh
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="VD: Hồ Chí Minh"
            />
          </label>
          <UniversitySearchField
            value={organization}
            onChange={(sel) => setOrganization(sel.name)}
            defaultCountry="Vietnam"
          />
          <label className="block text-xs text-slate-400">
            Vai trò tại cơ quan / trường
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={organizationRole}
              onChange={(e) => setOrganizationRole(e.target.value)}
              placeholder="VD: Giảng viên chính, Trợ giảng, Nghiên cứu viên"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Lĩnh vực / môn giảng dạy <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="Ví dụ: Thiên văn học, Vật lý THPT (phân cách bằng dấu phẩy)"
            />
          </label>
          <div>
            <p className="text-xs text-slate-400 mb-2">Cấp đang / muốn giảng dạy</p>
            <div className="flex flex-wrap gap-2">
              {TEACHING_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    teachingLevels.includes(level)
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                      : 'border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs text-slate-400">
            Học vấn (bằng cao nhất) <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="VD: Thạc sĩ Vật lý, Tiến sĩ Thiên văn"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Số năm kinh nghiệm giảng dạy
            <input
              type="number"
              min={0}
              max={80}
              className="mt-1 w-full"
              style={fieldStyle}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-slate-400">
              Website
              <input className="mt-1 w-full" style={fieldStyle} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
            <label className="block text-xs text-slate-400">
              LinkedIn
              <input className="mt-1 w-full" style={fieldStyle} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </label>
          </div>
          <label className="block text-xs text-slate-400">
            Ảnh đại diện (khuyến nghị — hiển thị trên khóa học)
            <div className="mt-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg border border-white/10 overflow-hidden bg-black/40 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={resolveMediaUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-600 text-xs">Chưa có</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploadingAvatar}
                onChange={(e) => void handleAvatar(e.target.files?.[0] ?? null)}
                className="text-xs text-slate-400"
              />
            </div>
          </label>
          <button
            type="button"
            disabled={!canStep1}
            onClick={() => setStep(2)}
            className="w-full py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-40"
          >
            Tiếp: Giới thiệu
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block text-xs text-slate-400">
            Giới thiệu &amp; lý do muốn giảng dạy <span className="text-pink-400">*</span>
            <textarea
              className="mt-1 w-full min-h-[180px]"
              style={{ ...fieldStyle, resize: 'vertical' }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={`Tối thiểu ${BIO_MIN} ký tự: kinh nghiệm, phương pháp, khóa học bạn muốn mở…`}
            />
            <span className="text-[10px] text-slate-600">{bio.trim().length} / {BIO_MIN}+ ký tự</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-2 border border-white/10 rounded-lg text-sm text-slate-400">
              Quay lại
            </button>
            <button
              type="button"
              disabled={!canStep2}
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-40"
            >
              Tiếp: CV &amp; giấy tờ
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300 font-medium">
              CV (PDF) <span className="text-pink-400">*</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Ban quản trị xem CV trước khi duyệt.</p>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={uploadingCv}
              onChange={(e) => void handleCv(e.target.files?.[0] ?? null)}
              className="mt-2 text-sm text-slate-300"
            />
            {cvUrl ? (
              <p className="text-xs text-emerald-300 mt-1">Đã tải: {cvFileName || 'cv.pdf'}</p>
            ) : null}
          </div>
          <div>
            <p className="text-sm text-slate-300 font-medium">Giấy tờ xác nhận (tuỳ chọn)</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Quyết định bổ nhiệm, thẻ giảng viên, hợp đồng… — PDF hoặc ảnh.
            </p>
            <input
              type="file"
              accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
              disabled={uploadingCert}
              onChange={(e) => void handleCert(e.target.files?.[0] ?? null)}
              className="mt-2 text-sm text-slate-300"
            />
            {certificateUrl ? (
              <p className="text-xs text-emerald-300 mt-1">Đã tải: {certificateFileName || 'certificate'}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-2 border border-white/10 rounded-lg text-sm text-slate-400">
              Quay lại
            </button>
            <button
              type="button"
              disabled={!canStep3 || submitting}
              onClick={() => void handleSubmit()}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-40"
            >
              {submitting ? 'Đang gửi…' : 'Gửi đơn ứng tuyển'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
