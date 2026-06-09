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
import { useT } from '@/i18n/public'

const BIO_MIN = 30

const TEACHING_LEVEL_KEYS = [
  'levelPreschool',
  'levelPrimary',
  'levelMiddle',
  'levelHigh',
  'levelUniversity',
  'levelPostgrad',
  'levelPublic',
] as const

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid var(--color-accent-soft)',
  borderRadius: 2,
  color: 'var(--color-text-primary)',
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
  const { t } = useT()
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

  const stepLabels = [t('applyTeacher.stepContact'), t('applyTeacher.stepBio'), t('applyTeacher.stepCv')]

  const toggleLevel = (levelKey: string) => {
    setTeachingLevels((prev) =>
      prev.includes(levelKey) ? prev.filter((x) => x !== levelKey) : [...prev, levelKey],
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
      setError(res.error || t('applyTeacher.uploadCvFailed'))
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
      setError(res.error || t('applyTeacher.uploadCertFailed'))
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
      setError(res.error || t('applyTeacher.uploadAvatarFailed'))
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
      teachingLevels: teachingLevels.map((key) => t(`applyTeacher.${key}`)),
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
      setError(res.error || t('applyTeacher.submitFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 text-[10px] font-mono uppercase tracking-wider text-ds-subtle">
        {stepLabels.map((label, i) => (
          <span
            key={label}
            className={`px-2 py-1 rounded border ${
              step === i + 1
                ? 'border-cyan-500/50 text-cyan-200 bg-cyan-500/10'
                : step > i + 1
                  ? 'border-emerald-500/30 text-emerald-300'
                  : 'border-ds-border'
            }`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {defaultEmail ? (
        <p className="text-xs text-ds-subtle font-mono">{t('applyTeacher.signedInAs', { email: defaultEmail })}</p>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.fullName')} <span className="text-pink-400">*</span>
            <input className="mt-1 w-full" style={fieldStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.phone')} <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('applyTeacher.phonePlaceholder')}
            />
          </label>
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.headline')} <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={t('applyTeacher.headlinePlaceholder')}
            />
          </label>
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.city')}
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t('applyTeacher.cityPlaceholder')}
            />
          </label>
          <UniversitySearchField
            value={organization}
            onChange={(sel) => setOrganization(sel.name)}
            defaultCountry="Vietnam"
          />
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.orgRole')}
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={organizationRole}
              onChange={(e) => setOrganizationRole(e.target.value)}
              placeholder={t('applyTeacher.orgRolePlaceholder')}
            />
          </label>
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.expertise')} <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder={t('applyTeacher.expertisePlaceholder')}
            />
          </label>
          <div>
            <p className="text-xs text-ds-muted mb-2">{t('applyTeacher.teachingLevels')}</p>
            <div className="flex flex-wrap gap-2">
              {TEACHING_LEVEL_KEYS.map((levelKey) => (
                <button
                  key={levelKey}
                  type="button"
                  onClick={() => toggleLevel(levelKey)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    teachingLevels.includes(levelKey)
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                      : 'border-ds-border text-ds-subtle hover:border-white/20'
                  }`}
                >
                  {t(`applyTeacher.${levelKey}`)}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.education')} <span className="text-pink-400">*</span>
            <input
              className="mt-1 w-full"
              style={fieldStyle}
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder={t('applyTeacher.educationPlaceholder')}
            />
          </label>
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.yearsExp')}
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
            <label className="block text-xs text-ds-muted">
              {t('applyTeacher.website')}
              <input className="mt-1 w-full" style={fieldStyle} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
            <label className="block text-xs text-ds-muted">
              {t('applyTeacher.linkedin')}
              <input className="mt-1 w-full" style={fieldStyle} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </label>
          </div>
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.avatar')}
            <div className="mt-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg border border-ds-border overflow-hidden bg-ds-elevated/80 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={resolveMediaUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-600 text-xs">{t('applyTeacher.noAvatar')}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploadingAvatar}
                onChange={(e) => void handleAvatar(e.target.files?.[0] ?? null)}
                className="text-xs text-ds-muted"
              />
            </div>
          </label>
          <button
            type="button"
            disabled={!canStep1}
            onClick={() => setStep(2)}
            className="w-full py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {t('applyTeacher.nextBio')}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block text-xs text-ds-muted">
            {t('applyTeacher.bioLabel')} <span className="text-pink-400">*</span>
            <textarea
              className="mt-1 w-full min-h-[180px]"
              style={{ ...fieldStyle, resize: 'vertical' }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('applyTeacher.bioPlaceholder', { min: BIO_MIN })}
            />
            <span className="text-[10px] text-slate-600">
              {t('applyTeacher.charCount', { count: bio.trim().length, min: BIO_MIN })}
            </span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-2 border border-ds-border rounded-lg text-sm text-ds-muted">
              {t('applyTeacher.back')}
            </button>
            <button
              type="button"
              disabled={!canStep2}
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-40"
            >
              {t('applyTeacher.nextCv')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ds-muted font-medium">
              {t('applyTeacher.cvRequired')} <span className="text-pink-400">*</span>
            </p>
            <p className="text-xs text-ds-subtle mt-0.5">{t('applyTeacher.cvHint')}</p>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={uploadingCv}
              onChange={(e) => void handleCv(e.target.files?.[0] ?? null)}
              className="mt-2 text-sm text-ds-muted"
            />
            {cvUrl ? (
              <p className="text-xs text-emerald-300 mt-1">{t('applyTeacher.cvUploaded', { name: cvFileName || 'cv.pdf' })}</p>
            ) : null}
          </div>
          <div>
            <p className="text-sm text-ds-muted font-medium">{t('applyTeacher.certOptional')}</p>
            <p className="text-xs text-ds-subtle mt-0.5">{t('applyTeacher.certHint')}</p>
            <input
              type="file"
              accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
              disabled={uploadingCert}
              onChange={(e) => void handleCert(e.target.files?.[0] ?? null)}
              className="mt-2 text-sm text-ds-muted"
            />
            {certificateUrl ? (
              <p className="text-xs text-emerald-300 mt-1">
                {t('applyTeacher.cvUploaded', { name: certificateFileName || 'certificate' })}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-2 border border-ds-border rounded-lg text-sm text-ds-muted">
              {t('applyTeacher.back')}
            </button>
            <button
              type="button"
              disabled={!canStep3 || submitting}
              onClick={() => void handleSubmit()}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-40"
            >
              {submitting ? t('applyTeacher.submitting') : t('applyTeacher.submit')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
