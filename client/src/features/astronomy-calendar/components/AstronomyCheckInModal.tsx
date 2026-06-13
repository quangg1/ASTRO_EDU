'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Download, Gem, Loader2, Sparkles, X } from 'lucide-react'
import type { AstronomyCalendarEvent, AstronomyEventEngagement } from '../types'
import { checkInAstronomyEvent } from '../api/astronomyCalendarApi'
import { uploadObservationPhoto } from '../api/observationPhotoUploadApi'
import {
  exportObservationCertificatePng,
  observationCertificateFilename,
} from '../lib/exportObservationCertificate'
import { ObservationCertificateCard } from './ObservationCertificateCard'

type Props = {
  event: AstronomyCalendarEvent | null
  open: boolean
  observerName: string
  onClose: () => void
  onEngagementUpdate?: (engagement: AstronomyEventEngagement) => void
}

type Step = 'upload' | 'preview' | 'done'

export function AstronomyCheckInModal({
  event,
  open,
  observerName,
  onClose,
  onEngagementUpdate,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const certRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [checkedInAt, setCheckedInAt] = useState<string>(new Date().toISOString())
  const [gemAmount, setGemAmount] = useState(0)
  const [busy, setBusy] = useState<'upload' | 'checkin' | 'export' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const existingPhoto = event?.engagement?.observationPhotoUrl || null
  const alreadyCheckedIn = Boolean(event?.engagement?.checkedIn)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setStep('upload')
      setPhotoPreview(null)
      setPhotoUrl(null)
      setError(null)
      setBusy(null)
      setGemAmount(event?.engagement?.gemAmount || 0)
      return
    }

    if (alreadyCheckedIn && existingPhoto) {
      setPhotoUrl(existingPhoto)
      setPhotoPreview(existingPhoto)
      setStep('done')
      setGemAmount(event?.engagement?.gemAmount || 0)
      setCheckedInAt(event?.engagement?.checkedInAt || new Date().toISOString())
    } else {
      setStep('upload')
      setPhotoPreview(null)
      setPhotoUrl(null)
      setGemAmount(0)
    }
  }, [open, event?.id, alreadyCheckedIn, existingPhoto, event?.engagement?.gemAmount, event?.engagement?.checkedInAt])

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  if (!open || !event || typeof document === 'undefined') return null

  const handlePickPhoto = () => fileRef.current?.click()

  const handleFileChange = async (file: File | null) => {
    if (!file) return
    setError(null)
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(URL.createObjectURL(file))
    setStep('preview')
    setBusy('upload')
    const upload = await uploadObservationPhoto(file)
    setBusy(null)
    if (!upload.success || !upload.url) {
      setError(upload.error || 'Không tải được ảnh')
      setStep('upload')
      setPhotoPreview(null)
      setPhotoUrl(null)
      return
    }
    setPhotoUrl(upload.url)
  }

  const handleCheckIn = async () => {
    if (!photoUrl) {
      setError('Hãy chọn ảnh quan sát trước khi check-in.')
      return
    }
    setBusy('checkin')
    setError(null)
    const res = await checkInAstronomyEvent(event.id, { photoUrl })
    setBusy(null)
    if (!res.success) {
      setError(res.error || 'Check-in thất bại')
      return
    }
    const now = new Date().toISOString()
    setCheckedInAt(now)
    setGemAmount(res.gemAmount || event.engagement?.gemAmount || 0)
    setStep('done')
    onEngagementUpdate?.({
      reminded: event.engagement?.reminded || false,
      checkedIn: true,
      gemAwarded: Boolean(res.gemAmount || event.engagement?.gemAwarded),
      gemAmount: res.gemAmount || event.engagement?.gemAmount || 0,
      observationPhotoUrl: res.observationPhotoUrl || photoUrl,
      checkedInAt: now,
    })
  }

  const handleDownload = async () => {
    if (!certRef.current) return
    setBusy('export')
    setError(null)
    const result = await exportObservationCertificatePng(
      certRef.current,
      observationCertificateFilename(event.titleVi, checkedInAt),
    )
    setBusy(null)
    if (!result.success) setError(result.error || 'Không tải được thành tích')
  }

  const showCertificate = (step === 'preview' || step === 'done') && photoPreview

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-ds-border bg-ds-base shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ds-border px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ds-subtle">Check-in quan sát</p>
            <h3 className="mt-0.5 text-base font-semibold text-ds-text">{event.titleVi}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-ds-border p-2 text-ds-muted transition hover:text-ds-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {step === 'upload' && !alreadyCheckedIn ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ds-muted">
                Tải ảnh bầu trời hoặc khoảnh khắc quan sát — chúng tôi sẽ tạo{' '}
                <span className="font-medium text-ds-text">thành tích đẹp</span> để bạn lưu lại.
              </p>
              <button
                type="button"
                onClick={handlePickPhoto}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ds-accent-strong/40 bg-ds-accent-soft/20 px-6 py-10 transition hover:border-ds-accent-strong/60 hover:bg-ds-accent-soft/30"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ds-accent-soft/40 text-ds-accent">
                  <Camera className="h-7 w-7" />
                </span>
                <span className="text-sm font-medium text-ds-text">Chọn ảnh quan sát</span>
                <span className="text-xs text-ds-subtle">JPG, PNG, WebP · tối đa 12 MB</span>
              </button>
            </div>
          ) : null}

          {showCertificate ? (
            <div className="flex flex-col items-center gap-4">
              <ObservationCertificateCard
                ref={certRef}
                event={event}
                photoUrl={photoPreview}
                observerName={observerName}
                checkedInAt={checkedInAt}
                gemAmount={gemAmount}
              />
              {step === 'preview' && !alreadyCheckedIn ? (
                <p className="text-center text-xs text-ds-subtle">
                  Xem trước thành tích — bấm check-in để nhận gem và lưu lại.
                </p>
              ) : null}
              {step === 'done' ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-amber-100/90">
                  <Sparkles className="h-4 w-4 text-ds-amber" />
                  {gemAmount > 0 ? `+${gemAmount} gem — thành tích đã lưu!` : 'Thành tích đã lưu!'}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="mt-4 text-center text-xs text-red-300/90">{error}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-ds-border px-5 py-4">
          {step === 'preview' && !alreadyCheckedIn ? (
            <>
              <button
                type="button"
                disabled={busy !== null || !photoUrl}
                onClick={() => void handleCheckIn()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-ds-amber/30 bg-ds-amber/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-ds-amber/15 disabled:opacity-45"
              >
                {busy === 'checkin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gem className="h-4 w-4" />}
                {busy === 'checkin' ? 'Đang check-in…' : 'Check-in & lưu thành tích'}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={handlePickPhoto}
                className="rounded-xl border border-ds-border px-4 py-2.5 text-sm text-ds-muted transition hover:text-ds-text"
              >
                Đổi ảnh
              </button>
            </>
          ) : null}

          {step === 'done' || (alreadyCheckedIn && existingPhoto) ? (
            <>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleDownload()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-ds-accent-strong/35 bg-ds-accent-soft/25 px-4 py-2.5 text-sm font-medium text-ds-accent transition hover:bg-ds-accent-soft/40 disabled:opacity-45"
              >
                {busy === 'export' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Tải thành tích
              </button>
              {!alreadyCheckedIn || !existingPhoto ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-ds-border px-4 py-2.5 text-sm text-ds-muted"
                >
                  Đóng
                </button>
              ) : null}
            </>
          ) : null}

          {step === 'upload' && alreadyCheckedIn && !existingPhoto ? (
            <p className="text-sm text-ds-muted">Bạn đã check-in sự kiện này (chưa có ảnh thành tích).</p>
          ) : null}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            void handleFileChange(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
