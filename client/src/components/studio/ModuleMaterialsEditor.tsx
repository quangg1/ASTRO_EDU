'use client'

import { useCallback, useRef, useState } from 'react'
import type { ModuleMaterial } from '@/features/courses/public'
import { uploadMedia } from '@/features/courses/public'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { cn } from '@/lib/cn'
import { Button } from '@/design-system'

function genId() {
  return `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function labelFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return base || 'Tài liệu PDF'
}

function filenameFromUrl(url: string): string {
  try {
    const path = url.split('?')[0]
    const last = path.split('/').pop() || ''
    return decodeURIComponent(last) || 'tệp'
  } catch {
    return 'tệp'
  }
}

const KIND_META: Record<ModuleMaterial['kind'], { icon: string; label: string }> = {
  pdf: { icon: '📄', label: 'PDF' },
  link: { icon: '🔗', label: 'Liên kết' },
  slides: { icon: '📊', label: 'Slides' },
  video: { icon: '🎬', label: 'Video' },
}

type Props = {
  moduleTitle: string
  moduleSlug: string
  materials: ModuleMaterial[]
  courseSlug: string
  uploadEntityId: string
  onChange: (materials: ModuleMaterial[]) => void
  onError: (message: string) => void
  onClose: () => void
}

export function ModuleMaterialsEditor({
  moduleTitle,
  moduleSlug,
  materials,
  courseSlug,
  uploadEntityId,
  onChange,
  onError,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  const uploadPdf = useCallback(
    async (file: File, replaceIndex?: number) => {
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        onError('Chỉ hỗ trợ tệp PDF')
        return
      }
      if (file.size > 20 * 1024 * 1024) {
        onError('PDF tối đa 20 MB')
        return
      }
      setBusy(true)
      try {
        const variant = `mod-${moduleSlug}-${replaceIndex ?? materials.length}`
        const r = await uploadMedia(file, {
          purpose: 'course-module-material',
          entityId: uploadEntityId,
          slug: courseSlug,
          variant,
        })
        if (!r.success || !r.url) {
          onError(r.error || 'Tải PDF thất bại')
          return
        }
        const label = labelFromFilename(file.name)
        const entry: ModuleMaterial = {
          id: replaceIndex != null ? materials[replaceIndex].id : genId(),
          label: replaceIndex != null ? materials[replaceIndex].label || label : label,
          kind: 'pdf',
          url: r.url,
          uploadedAt: new Date().toISOString(),
        }
        if (replaceIndex != null) {
          const next = [...materials]
          next[replaceIndex] = entry
          onChange(next)
        } else {
          onChange([...materials, entry])
        }
      } catch {
        onError('Tải PDF thất bại — kiểm tra kết nối API')
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [courseSlug, materials, moduleSlug, onChange, onError, uploadEntityId],
  )

  const patchMaterial = (index: number, patch: Partial<ModuleMaterial>) => {
    onChange(materials.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  const removeMaterial = (index: number) => {
    onChange(materials.filter((_, i) => i !== index))
  }

  const addLink = () => {
    const url = linkUrl.trim()
    if (!url) {
      onError('Nhập URL liên kết')
      return
    }
    try {
      new URL(url)
    } catch {
      onError('URL không hợp lệ')
      return
    }
    onChange([
      ...materials,
      {
        id: genId(),
        label: linkLabel.trim() || 'Tài liệu tham khảo',
        kind: 'link',
        url,
        uploadedAt: null,
      },
    ])
    setLinkUrl('')
    setLinkLabel('')
    setShowLinkForm(false)
  }

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) await uploadPdf(f)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) await uploadPdf(f)
  }

  return (
    <div className="rounded-2xl border border-ds-border bg-ds-surface overflow-hidden">
      <div className="flex items-start gap-2 px-3 py-2.5 border-b border-ds-border bg-ds-overlay">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ds-subtle">Tài liệu module</p>
          <p className="text-xs font-medium text-white truncate">{moduleTitle}</p>
          <p className="text-[10px] text-ds-muted mt-0.5">Học viên tải/xem trước khi vào bài trong tuần này</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-ds-subtle hover:text-white text-sm px-1.5 py-0.5 rounded-md hover:bg-white/5"
          aria-label="Đóng"
        >
          ×
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-[min(420px,50vh)] overflow-y-auto">
        {materials.length === 0 && !busy && (
          <p className="text-[11px] text-ds-subtle text-center py-1">Chưa có tài liệu — kéo thả PDF hoặc thêm liên kết bên dưới.</p>
        )}

        {materials.map((mat, mi) => {
          const meta = KIND_META[mat.kind] ?? KIND_META.link
          const resolved = mat.url ? resolveMediaUrl(mat.url) : ''
          const fileHint = mat.kind === 'pdf' && mat.url ? filenameFromUrl(mat.url) : null
          return (
            <div
              key={mat.id}
              className="rounded-xl border border-ds-border bg-ds-overlay p-2.5 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0" aria-hidden>{meta.icon}</span>
                <span className="text-[10px] uppercase tracking-wide text-ds-subtle shrink-0">{meta.label}</span>
                {fileHint && (
                  <span className="text-[10px] text-ds-muted truncate flex-1" title={fileHint}>
                    {fileHint}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeMaterial(mi)}
                  className="ml-auto text-[10px] text-ds-danger hover:text-red-300 shrink-0"
                >
                  Xóa
                </button>
              </div>
              <label className="block text-[10px] text-ds-muted">
                Tên hiển thị
                <input
                  value={mat.label}
                  onChange={(e) => patchMaterial(mi, { label: e.target.value })}
                  className="studio-field text-xs mt-1 w-full"
                  placeholder="VD: Slide tuần 3, Đề ôn tập…"
                />
              </label>
              {mat.kind === 'link' ? (
                <label className="block text-[10px] text-ds-muted">
                  URL
                  <input
                    value={mat.url}
                    onChange={(e) => patchMaterial(mi, { url: e.target.value })}
                    className="studio-field text-xs mt-1 w-full font-mono"
                    placeholder="https://…"
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {resolved ? (
                  <a
                    href={resolved}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 rounded-md border border-ds-border text-ds-accent hover:bg-ds-accent-soft"
                  >
                    Mở thử ↗
                  </a>
                ) : null}
                {mat.kind === 'pdf' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      const el = document.createElement('input')
                      el.type = 'file'
                      el.accept = '.pdf,application/pdf'
                      el.onchange = async () => {
                        const f = el.files?.[0]
                        if (f) await uploadPdf(f, mi)
                      }
                      el.click()
                    }}
                  >
                    Thay PDF
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })}

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          className={cn(
            'rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors',
            dragActive ? 'border-ds-accent-strong bg-ds-accent-soft/40' : 'border-ds-border hover:border-ds-accent-strong/60 hover:bg-white/[0.02]',
            busy && 'opacity-60 pointer-events-none',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={onFileInput}
          />
          <p className="text-2xl mb-1" aria-hidden>📄</p>
          <p className="text-xs font-medium text-white">
            {busy ? 'Đang tải PDF…' : 'Kéo thả PDF vào đây'}
          </p>
          <p className="text-[10px] text-ds-subtle mt-1">hoặc bấm để chọn · tối đa 20 MB</p>
        </div>

        {showLinkForm ? (
          <div className="rounded-xl border border-ds-border p-2.5 space-y-2 bg-ds-overlay">
            <p className="text-[10px] font-medium text-ds-muted">Thêm liên kết (Drive, Canva, video…)</p>
            <input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              className="studio-field text-xs w-full"
              placeholder="Tên hiển thị (tuỳ chọn)"
            />
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="studio-field text-xs w-full font-mono"
              placeholder="https://…"
            />
            <div className="flex gap-2">
              <Button type="button" variant="primary" size="sm" onClick={addLink}>
                Thêm
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowLinkForm(false)}>
                Huỷ
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setShowLinkForm(true)}>
            + Liên kết ngoài
          </Button>
        )}
      </div>
    </div>
  )
}
