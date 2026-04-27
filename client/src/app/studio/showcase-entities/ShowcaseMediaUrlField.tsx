'use client'

import { useId, useRef, useState } from 'react'
import { uploadMedia } from '@/lib/coursesApi'

type Props = {
  label: string
  description?: string
  value: string
  onChange: (url: string) => void
  accept: string
}

export function ShowcaseMediaUrlField({ label, description, value, onChange, accept }: Props) {
  const id = useId()
  const urlInputId = `${id}-url`
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr('')
    setUploading(true)
    const r = await uploadMedia(file)
    setUploading(false)
    if (r.success && r.url) onChange(r.url)
    else setErr(r.error || 'Upload thất bại')
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={urlInputId} className="block text-xs text-slate-400">
          {label}
        </label>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {uploading ? 'Đang tải…' : 'Upload → CDN'}
        </button>
      </div>
      {description ? <p className="text-[11px] text-slate-500 leading-snug">{description}</p> : null}
      <input ref={fileRef} type="file" accept={accept} className="sr-only" onChange={(e) => void onPick(e)} />
      <input
        id={urlInputId}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… hoặc /files/… sau upload"
        className="w-full mt-0.5 rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none font-mono text-[12px]"
      />
      {err ? <p className="text-[11px] text-rose-400">{err}</p> : null}
    </div>
  )
}
