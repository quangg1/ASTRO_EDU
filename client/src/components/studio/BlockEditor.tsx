'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { LessonSection, SectionType } from '@/features/courses/api/coursesApi'
import type { VideoTranscript } from '@/features/courses/lib/videoTranscript'
import { VideoTranscriptEditor } from '@/components/studio/VideoTranscriptEditor'
import { VideoWithTranscriptPanel } from '@/components/courses/VideoWithTranscriptPanel'
import { uploadMedia, type UploadMediaContext } from '@/features/courses/api/coursesApi'
import { resolveMediaUrl } from '@/lib/apiConfig'
import MathBlock from './blocks/MathBlock'
import ChartBlock from './blocks/ChartBlock'
import SliderBlock from './blocks/SliderBlock'

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false })
const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false })

const LANGUAGES = ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'sql', 'bash', 'java', 'c', 'cpp', 'go', 'rust']
const CALLOUT_VARIANTS = [
  { value: 'info', label: 'Info', color: 'border-ds-accent-strong bg-ds-accent-soft', icon: '\u2139' },
  { value: 'tip', label: 'Tip', color: 'border-emerald-500/40 bg-emerald-500/10', icon: '\u2714' },
  { value: 'warning', label: 'Warning', color: 'border-amber-500/40 bg-amber-500/10', icon: '\u26A0' },
  { value: 'danger', label: 'Danger', color: 'border-red-500/40 bg-red-500/10', icon: '\u2718' },
] as const

function UploadBtn({
  accept,
  onUrl,
  label,
  uploadContext,
}: {
  accept: string
  onUrl: (u: string) => void
  label: string
  uploadContext?: UploadMediaContext
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true)
    const r = await uploadMedia(f, uploadContext)
    setBusy(false)
    if (r.success && r.url) onUrl(r.url)
    if (ref.current) ref.current.value = ''
  }
  return (
    <>
      <input ref={ref} type="file" accept={accept} onChange={handle} className="hidden" />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-ds-border text-gray-300 hover:bg-ds-accent-soft hover:border-ds-accent-strong transition-colors disabled:opacity-50">
        {busy ? '...' : label}
      </button>
    </>
  )
}

function ImageBlockEditor({
  section,
  update,
  uploadContext,
}: {
  section: LessonSection
  update: (p: Partial<LessonSection>) => void
  uploadContext?: UploadMediaContext
}) {
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [urlInput, setUrlInput] = useState(section.imageUrl ?? '')
  const [imgError, setImgError] = useState(false)
  const widthPct = Number.isFinite(section.imageWidthPct) ? Math.min(100, Math.max(20, Number(section.imageWidthPct))) : 100

  const applyUrl = () => {
    const trimmed = urlInput.trim()
    if (trimmed) {
      update({ imageUrl: trimmed })
      setImgError(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 mb-1">
        <button type="button" onClick={() => setMode('url')} className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${mode === 'url' ? 'bg-cyan-600/80 text-white' : 'text-ds-subtle hover:bg-white/5'}`}>Paste URL</button>
        <button type="button" onClick={() => setMode('upload')} className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${mode === 'upload' ? 'bg-cyan-600/80 text-white' : 'text-ds-subtle hover:bg-white/5'}`}>Upload File</button>
      </div>
      {mode === 'url' ? (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={applyUrl}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl() }}
            placeholder="https://example.com/image.png"
            className="studio-field"
          />
          <button type="button" onClick={applyUrl} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-colors">Apply</button>
        </div>
      ) : (
        <UploadBtn
          accept="image/*,.gif,.webp,.svg,.png,.jpg,.jpeg"
          onUrl={(u) => { update({ imageUrl: u }); setUrlInput(u); setImgError(false) }}
          label="Choose file to upload"
          uploadContext={uploadContext}
        />
      )}
      {section.imageUrl && (
        <div className="relative rounded-lg overflow-hidden border border-ds-border bg-black/30">
          {!imgError ? (
            <img
              src={section.imageUrl}
              alt=""
              className="max-h-48 w-auto mx-auto object-contain"
              style={{ maxWidth: `${widthPct}%` }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-red-400 text-xs">Failed to load image</p>
              <p className="text-ds-subtle text-[10px] mt-1 break-all px-4">{section.imageUrl}</p>
            </div>
          )}
        </div>
      )}
      <div className="rounded-lg border border-ds-border bg-white/[0.02] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-slate-300">Kích thước ảnh trong block</label>
          <select
            value={String(widthPct)}
            onChange={(e) => update({ imageWidthPct: Number(e.target.value) })}
            className="min-w-[110px] rounded-md border border-ds-border-strong bg-black/40 px-2 py-1 text-xs text-white focus:border-ds-accent focus:outline-none"
          >
            <option value="25">XS (25%)</option>
            <option value="40">S (40%)</option>
            <option value="60">M (60%)</option>
            <option value="80">L (80%)</option>
            <option value="100">Full (100%)</option>
          </select>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={widthPct}
            onChange={(e) => update({ imageWidthPct: Number(e.target.value) })}
            className="w-full accent-cyan-400"
          />
          <input
            type="number"
            min={20}
            max={100}
            step={5}
            value={widthPct}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (!Number.isFinite(next)) return
              update({ imageWidthPct: Math.min(100, Math.max(20, next)) })
            }}
            className="w-16 rounded-md border border-ds-border-strong bg-black/40 px-2 py-1 text-xs text-white focus:border-ds-accent focus:outline-none"
          />
          <span className="text-xs text-ds-muted">%</span>
        </div>
      </div>
      <input value={section.caption ?? ''} onChange={(e) => update({ caption: e.target.value })} placeholder="Caption (optional)" className="studio-field" />
    </div>
  )
}

function VideoBlockEditor({
  section,
  update,
  uploadContext,
}: {
  section: LessonSection
  update: (p: Partial<LessonSection>) => void
  uploadContext?: UploadMediaContext
}) {
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [urlInput, setUrlInput] = useState(section.videoUrl ?? '')

  const applyUrl = () => {
    const trimmed = urlInput.trim()
    update({ videoUrl: trimmed || null })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 mb-1">
        <button type="button" onClick={() => setMode('url')} className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${mode === 'url' ? 'bg-cyan-600/80 text-white' : 'text-ds-subtle hover:bg-white/5'}`}>Paste URL</button>
        <button type="button" onClick={() => setMode('upload')} className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${mode === 'upload' ? 'bg-cyan-600/80 text-white' : 'text-ds-subtle hover:bg-white/5'}`}>Upload File</button>
      </div>
      {mode === 'url' ? (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={applyUrl}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl() }}
            placeholder="https://youtube.com/watch?v=... or video URL"
            className="studio-field"
          />
          <button type="button" onClick={applyUrl} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-colors">Apply</button>
        </div>
      ) : (
        <UploadBtn
          accept="video/*,.mp4,.webm"
          onUrl={(u) => { update({ videoUrl: u }); setUrlInput(u) }}
          label="Choose video to upload"
          uploadContext={uploadContext}
        />
      )}
      {section.videoUrl ? (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-ds-subtle">Xem trước · như học viên</p>
          <VideoWithTranscriptPanel
            videoUrl={section.videoUrl}
            title={section.title || 'Video'}
            transcript={(section.videoTranscript as VideoTranscript | null | undefined) ?? null}
          />
        </div>
      ) : null}
      <input value={section.caption ?? ''} onChange={(e) => update({ caption: e.target.value })} placeholder="Caption (optional)" className="studio-field" />
      {section.videoUrl ? (
        <VideoTranscriptEditor
          value={(section.videoTranscript as VideoTranscript | null | undefined) ?? null}
          onChange={(videoTranscript) => update({ videoTranscript: videoTranscript ?? undefined })}
        />
      ) : null}
    </div>
  )
}

interface Props {
  section: LessonSection
  onChange: (updated: LessonSection) => void
  uploadContext?: UploadMediaContext
}

export default function BlockEditor({ section, onChange, uploadContext }: Props) {
  const update = (partial: Partial<LessonSection>) => onChange({ ...section, ...partial })

  const typeLabel: Record<SectionType, string> = {
    richtext: '\u270D Rich Text',
    text: '\u2261 Plain Text',
    image: '\u1F5BC Image',
    gif: '\u2728 GIF / Animation',
    video: '\u25B6 Video',
    code: '\u2328 Code',
    math: '\u2211 Math',
    chart: '\u2237 Chart',
    slider: '\u2194 Slider',
    embed: '\u29C9 Embed',
    observable: '\u29E8 Observable',
    '3d': '\u2B22 3D Model',
    callout: '\u26A0 Callout',
    divider: '\u2500 Divider',
  }

  return (
    <div className="space-y-3">
      {/* Block type badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-cyan-300/70 font-medium">{typeLabel[section.type] || section.type}</span>
      </div>

      {/* Title (for most types) */}
      {section.type !== 'divider' && (
        <div className="space-y-2">
          <input
            value={section.title ?? ''}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Block title (optional)"
            className="studio-field"
          />
          <label className="flex items-center gap-2 rounded-lg border border-ds-accent-strong bg-ds-accent-soft px-3 py-2 text-xs text-cyan-100">
            <span className="shrink-0 text-[11px] text-cyan-200/90">Mục lục:</span>
            <select
              value={section.sectionLevel ?? 'main'}
              onChange={(e) => update({ sectionLevel: e.target.value as LessonSection['sectionLevel'] })}
              className="min-w-[140px] rounded-md border border-ds-border-strong bg-black/40 px-2 py-1 text-xs text-white focus:border-ds-accent focus:outline-none"
              title="TOC level"
            >
              <option value="main">Mục chính</option>
              <option value="sub">Mục con</option>
            </select>
          </label>
        </div>
      )}

      {/* RICHTEXT */}
      {section.type === 'richtext' && (
        <RichTextEditor
          value={section.html || section.content || ''}
          onChange={(html) => update({ html, content: html })}
          placeholder="Write rich content..."
        />
      )}

      {/* PLAIN TEXT */}
      {section.type === 'text' && (
        <>
          <input value={section.summary ?? ''} onChange={(e) => update({ summary: e.target.value })} placeholder="Summary" className="studio-field" />
          <textarea value={section.content ?? ''} onChange={(e) => update({ content: e.target.value })} rows={4} placeholder="Content" className="studio-field" />
        </>
      )}

      {/* IMAGE */}
      {(section.type === 'image' || section.type === 'gif') && (
        <ImageBlockEditor section={section} update={update} uploadContext={uploadContext} />
      )}

      {/* VIDEO */}
      {section.type === 'video' && (
        <VideoBlockEditor section={section} update={update} uploadContext={uploadContext} />
      )}

      {/* MATH */}
      {section.type === 'math' && (
        <div className="space-y-2">
          <textarea
            value={section.latex ?? ''}
            onChange={(e) => update({ latex: e.target.value })}
            rows={4}
            placeholder="LaTeX: E = mc^2, \frac{a}{b}, \int_0^1 x^2 dx"
            className={`studio-field font-mono text-sm`}
            spellCheck={false}
          />
          {(section.latex || 'E = mc^2').trim() && (
            <div className="rounded-lg border border-ds-border bg-black/30 p-4">
              <MathBlock latex={section.latex || 'E = mc^2'} displayMode />
            </div>
          )}
        </div>
      )}

      {/* CHART */}
      {section.type === 'chart' && (
        <ChartBlock section={section} update={update} editMode />
      )}

      {/* SLIDER */}
      {section.type === 'slider' && (
        <SliderBlock section={section} update={update} editMode />
      )}

      {/* OBSERVABLE */}
      {section.type === 'observable' && (
        <div className="space-y-2">
          <input
            value={section.notebookUrl ?? ''}
            onChange={(e) => update({ notebookUrl: e.target.value || null })}
            placeholder="https://observablehq.com/@user/notebook"
            className="studio-field"
          />
          {section.notebookUrl && (
            <div className="rounded-lg overflow-hidden border border-ds-border aspect-video bg-black/30">
              <iframe
                src={section.notebookUrl.replace('observablehq.com/', 'observablehq.com/embed/')}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {/* CODE */}
      {section.type === 'code' && (
        <div className="space-y-2">
          <select value={section.language ?? 'javascript'} onChange={(e) => update({ language: e.target.value })} className={`w-40 studio-field`}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <textarea
            value={section.code ?? ''}
            onChange={(e) => update({ code: e.target.value })}
            rows={8}
            placeholder="Paste your code here..."
            className={`studio-field font-mono text-xs leading-5`}
            spellCheck={false}
          />
        </div>
      )}

      {/* EMBED */}
      {section.type === 'embed' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select value={section.embedType ?? 'iframe'} onChange={(e) => update({ embedType: e.target.value as LessonSection['embedType'] })} className={`w-32 studio-field`}>
              <option value="iframe">iframe</option>
              <option value="canva">Canva</option>
              <option value="gslides">Google Slides</option>
              <option value="figma">Figma</option>
              <option value="other">Other</option>
            </select>
            <input value={section.embedUrl ?? ''} onChange={(e) => update({ embedUrl: e.target.value || null })} placeholder="Embed URL" className={`flex-1 studio-field`} />
          </div>
          {section.embedUrl && (
            <div className="rounded-lg overflow-hidden border border-ds-border aspect-video bg-black/30">
              <iframe src={section.embedUrl} className="w-full h-full" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" />
            </div>
          )}
        </div>
      )}

      {/* 3D MODEL */}
      {section.type === '3d' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={section.modelUrl ?? ''} onChange={(e) => update({ modelUrl: e.target.value || null })} placeholder="GLB/GLTF model URL" className="studio-field" />
            <UploadBtn
              accept=".glb,.gltf"
              onUrl={(u) => update({ modelUrl: u })}
              label="Upload .glb"
              uploadContext={uploadContext}
            />
          </div>
          {section.modelUrl && (
            <div className="h-[280px] rounded-lg border border-ds-accent-strong overflow-hidden bg-black/40">
              <ModelViewer url={resolveMediaUrl(section.modelUrl)} />
            </div>
          )}
          <input value={section.caption ?? ''} onChange={(e) => update({ caption: e.target.value })} placeholder="Caption (optional)" className="studio-field" />
        </div>
      )}

      {/* CALLOUT */}
      {section.type === 'callout' && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {CALLOUT_VARIANTS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => update({ calloutVariant: v.value })}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  section.calloutVariant === v.value ? v.color + ' text-white' : 'border-ds-border text-ds-subtle hover:bg-white/5'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <div className={`rounded-lg border p-3 ${CALLOUT_VARIANTS.find((v) => v.value === section.calloutVariant)?.color || ''}`}>
            <textarea
              value={section.content ?? ''}
              onChange={(e) => update({ content: e.target.value })}
              rows={3}
              placeholder="Callout content..."
              className="w-full bg-transparent text-white text-sm focus:outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* DIVIDER */}
      {section.type === 'divider' && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="text-[10px] text-ds-subtle">DIVIDER</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}
    </div>
  )
}
