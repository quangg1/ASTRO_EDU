'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { uploadMedia, type UploadMediaContext } from '@/features/courses/public'

type Props = {
  label: string
  description?: string
  value: string
  onChange: (url: string) => void
  accept: string
  /** Key S3: `showcase-entities/{entityId}/{variant}.ext` */
  uploadContext?: UploadMediaContext
}

export function ShowcaseMediaUrlField({
  label,
  description,
  value,
  onChange,
  accept,
  uploadContext,
}: Props) {
  const id = useId()
  const urlInputId = `${id}-url`
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [lastStorageKey, setLastStorageKey] = useState('')
  const [draftValue, setDraftValue] = useState(value)

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setErr('')
    setUploading(true)
    try {
      const r = await uploadMedia(file, uploadContext)
      if (!r.success || !r.url) throw new Error(r.error || 'Upload thất bại')
      setDraftValue(r.url)
      onChange(r.url)
      if (r.storageKey) setLastStorageKey(r.storageKey)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={urlInputId} className="block text-xs text-ds-muted">
          {label}
        </label>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="text-xs text-ds-accent hover:text-ds-accent cursor-pointer shrink-0 disabled:opacity-50"
        >
          {uploading ? 'Đang tải…' : 'Upload → CDN'}
        </button>
      </div>
      {description ? <p className="text-[11px] text-ds-subtle leading-snug">{description}</p> : null}
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => void onPick(e)}
      />
      <input
        id={urlInputId}
        type="text"
        value={draftValue}
        onChange={(e) => {
          setDraftValue(e.target.value)
          onChange(e.target.value)
        }}
        placeholder="https://… hoặc /files/… sau upload"
        className="w-full mt-0.5 rounded-lg bg-black/50 border border-ds-border-strong px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-ds-accent focus:outline-none font-mono text-[12px]"
      />
      {lastStorageKey ? (
        <p className="font-mono text-[11px] text-emerald-300/90 break-all">S3 key: {lastStorageKey}</p>
      ) : null}
      {err ? <p className="text-[11px] text-rose-400">{err}</p> : null}
    </div>
  )
}
