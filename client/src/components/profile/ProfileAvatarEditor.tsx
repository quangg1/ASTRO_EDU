'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadProfileAvatar } from '@/features/auth/api/avatarUploadApi'
import { AvatarWithDecoration } from '@/components/profile/AvatarWithDecoration'
import { Button, Input } from '@/design-system'

type Props = {
  avatarUrl: string
  displayName: string
  email?: string | null
  onAvatarChange: (url: string) => void
  /** Sau khi CDN trả URL — có thể lưu profile ngay. */
  onUploadSuccess?: (url: string) => void | Promise<void>
  disabled?: boolean
}

export function ProfileAvatarEditor({
  avatarUrl,
  displayName,
  email,
  onAvatarChange,
  onUploadSuccess,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return
    setUploadError('')
    if (!file.type.startsWith('image/')) {
      setUploadError('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP).')
      return
    }
    setUploading(true)
    const res = await uploadProfileAvatar(file)
    setUploading(false)
    if (!res.success || !res.url) {
      setUploadError(res.error || 'Tải ảnh thất bại.')
      return
    }
    onAvatarChange(res.url)
    if (onUploadSuccess) {
      await onUploadSuccess(res.url)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="relative shrink-0">
        <AvatarWithDecoration
          avatarUrl={avatarUrl}
          displayName={displayName}
          email={email}
          size="lg"
        />
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-ds-accent animate-spin" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-3 w-full">
        <p className="text-sm text-ds-muted">
          Ảnh đại diện của bạn (không thay bằng gói shop). Tải lên sẽ lưu trên CDN khi máy chủ đã cấu hình S3.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            void handleFile(f)
            e.target.value = ''
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="w-4 h-4 mr-1.5 inline-block" aria-hidden />
            {uploading ? 'Đang tải lên…' : 'Chọn ảnh tải lên'}
          </Button>
        </div>
        {uploadError ? <p className="text-sm text-red-400">{uploadError}</p> : null}

        <details className="text-sm">
          <summary className="text-ds-subtle cursor-pointer hover:text-ds-muted">Hoặc dán URL ảnh (tuỳ chọn)</summary>
          <div className="mt-2">
            <Input
              type="url"
              value={avatarUrl}
              onChange={(e) => onAvatarChange(e.target.value)}
              placeholder="https://… hoặc /files/…"
              disabled={disabled}
            />
          </div>
        </details>
      </div>
    </div>
  )
}
