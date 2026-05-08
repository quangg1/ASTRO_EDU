'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  useNarrativeStore,
  EARTH_HISTORY_PRESET,
  fetchEditorNarrativeSpace,
  saveDraftNarrativeSpace,
  publishNarrativeSpace,
  type NarrativeBeat,
  type NarrativeSpaceDocument,
} from '@/features/content3d/narrative/public'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
      Đang tải scene 3D…
    </div>
  ),
})

const SLUG_PRESETS = [
  { slug: 'earth-history', label: 'Earth History (preset)' },
]

const SEQUENCE_TYPES = ['geologic_ma', 'mission_sols', 'chapters', 'custom_epochs'] as const

const inputCls =
  'mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none'

const labelCls = 'block text-[11px] uppercase tracking-wide text-slate-400'

function nextBeatId(beats: NarrativeBeat[]): number {
  let id = 0
  for (const b of beats) {
    if (typeof b.id === 'number' && b.id >= id) id = b.id + 1
  }
  return id
}

function makeEmptyBeat(beats: NarrativeBeat[]): NarrativeBeat {
  return {
    id: nextBeatId(beats),
    name: 'Beat mới',
    time: 0,
    timeDisplay: '0',
    eon: '',
    era: null,
    period: null,
    o2: 0,
    co2: 0,
    dayLength: 24,
    earthColor: '#3b82f6',
    description: '',
    icon: '🟦',
  }
}

function bootstrapSpace(slug: string): NarrativeSpaceDocument {
  if (slug === 'earth-history') {
    return {
      ...EARTH_HISTORY_PRESET,
      published: false,
    }
  }
  return {
    id: `draft-${slug}`,
    slug,
    version: '0.1.0',
    title: { vi: slug, en: slug },
    templateId: 'deep-time-journey',
    world: {
      bodySlug: 'earth',
      atmospherePreset: 'earth-modern',
      colorGrade: 'earth-neutral',
      effectTags: [],
      lightingPreset: 'solar-default',
    },
    sequence: { type: 'geologic_ma', unit: 'Ma', range: [4600, 0], direction: 'reverse' },
    beats: [makeEmptyBeat([])],
    published: false,
  }
}

export function NarrativeStudioMode() {
  const setDraftSpace = useNarrativeStore((s) => s.setDraftSpace)
  const setEditorMode = useNarrativeStore((s) => s.setEditorMode)
  const resetToPreset = useNarrativeStore((s) => s.resetToPreset)
  const currentBeatIndex = useNarrativeStore((s) => s.currentBeatIndex)
  const setStoreBeat = useNarrativeStore((s) => s.setBeat)

  const [slug, setSlug] = useState<string>('earth-history')
  const [slugInput, setSlugInput] = useState<string>('')
  const [doc, setDoc] = useState<NarrativeSpaceDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0)
  const lastSlugRef = useRef('')

  // Enter editor mode on mount, exit on unmount.
  useEffect(() => {
    setEditorMode(true)
    return () => {
      resetToPreset()
    }
  }, [setEditorMode, resetToPreset])

  const load = useCallback(
    async (targetSlug: string) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
      if (!token) {
        setMessage('Cần đăng nhập teacher/admin để chỉnh narrative space.')
        return
      }
      setLoading(true)
      setMessage('')
      try {
        const remote = await fetchEditorNarrativeSpace(token, targetSlug)
        const next = remote || bootstrapSpace(targetSlug)
        setDoc(next)
        setSelectedBeatIndex(0)
        setDraftSpace(next, { resetBeatIndex: true })
      } finally {
        setLoading(false)
      }
    },
    [setDraftSpace],
  )

  useEffect(() => {
    if (lastSlugRef.current === slug) return
    lastSlugRef.current = slug
    void load(slug)
  }, [slug, load])

  // Keep store beat in sync with editor selection.
  useEffect(() => {
    if (selectedBeatIndex !== currentBeatIndex) setStoreBeat(selectedBeatIndex)
  }, [selectedBeatIndex, currentBeatIndex, setStoreBeat])

  const beats = doc?.beats || []
  const selectedBeat = beats[selectedBeatIndex] || null

  const patchDoc = useCallback(
    (patch: Partial<NarrativeSpaceDocument>) => {
      setDoc((prev) => {
        if (!prev) return prev
        const next: NarrativeSpaceDocument = { ...prev, ...patch }
        setDraftSpace(next)
        return next
      })
    },
    [setDraftSpace],
  )

  const patchBeat = useCallback(
    (index: number, patch: Partial<NarrativeBeat>) => {
      setDoc((prev) => {
        if (!prev) return prev
        const nextBeats = prev.beats.map((b, i) => (i === index ? { ...b, ...patch } : b))
        const next: NarrativeSpaceDocument = { ...prev, beats: nextBeats }
        setDraftSpace(next)
        return next
      })
    },
    [setDraftSpace],
  )

  const addBeat = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev
      const beat = makeEmptyBeat(prev.beats)
      const nextBeats = [...prev.beats, beat]
      const next: NarrativeSpaceDocument = { ...prev, beats: nextBeats }
      setDraftSpace(next)
      setSelectedBeatIndex(nextBeats.length - 1)
      return next
    })
  }, [setDraftSpace])

  const deleteBeat = useCallback(
    (index: number) => {
      setDoc((prev) => {
        if (!prev) return prev
        if (prev.beats.length <= 1) {
          setMessage('Phải giữ ít nhất một beat.')
          return prev
        }
        const nextBeats = prev.beats.filter((_, i) => i !== index)
        const next: NarrativeSpaceDocument = { ...prev, beats: nextBeats }
        setDraftSpace(next)
        setSelectedBeatIndex(Math.min(index, nextBeats.length - 1))
        return next
      })
    },
    [setDraftSpace],
  )

  const moveBeat = useCallback(
    (from: number, to: number) => {
      setDoc((prev) => {
        if (!prev) return prev
        if (to < 0 || to >= prev.beats.length) return prev
        const nextBeats = [...prev.beats]
        const [moved] = nextBeats.splice(from, 1)
        nextBeats.splice(to, 0, moved)
        const next: NarrativeSpaceDocument = { ...prev, beats: nextBeats }
        setDraftSpace(next)
        setSelectedBeatIndex(to)
        return next
      })
    },
    [setDraftSpace],
  )

  const handleSaveDraft = useCallback(async () => {
    if (!doc) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) {
      setMessage('Cần đăng nhập teacher/admin.')
      return
    }
    setSaving(true)
    setMessage('')
    const r = await saveDraftNarrativeSpace(token, doc.slug, doc)
    setSaving(false)
    if (!r.ok || !r.data) {
      setMessage(r.error || 'Lỗi lưu draft')
      return
    }
    setDoc(r.data)
    setDraftSpace(r.data)
    setMessage('Đã lưu draft.')
  }, [doc, setDraftSpace])

  const handlePublishToggle = useCallback(async () => {
    if (!doc) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) return
    setSaving(true)
    setMessage('')
    // Save current draft first to avoid publishing stale state.
    const saveRes = await saveDraftNarrativeSpace(token, doc.slug, doc)
    if (!saveRes.ok) {
      setSaving(false)
      setMessage(saveRes.error || 'Không thể lưu trước khi publish')
      return
    }
    const nextPublished = !doc.published
    const r = await publishNarrativeSpace(token, doc.slug, nextPublished)
    setSaving(false)
    if (!r.ok || !r.data) {
      setMessage(r.error || 'Lỗi đổi trạng thái publish')
      return
    }
    setDoc(r.data)
    setDraftSpace(r.data)
    setMessage(nextPublished ? 'Đã publish.' : 'Đã chuyển về draft.')
  }, [doc, setDraftSpace])

  const handleSlugSubmit = useCallback(() => {
    const v = slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!v) return
    setSlug(v)
    setSlugInput('')
  }, [slugInput])

  const statusBadge = useMemo(() => {
    if (!doc) return null
    const isPublished = !!doc.published
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          isPublished
            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
            : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? 'bg-emerald-300' : 'bg-amber-300'}`} />
        {isPublished ? 'Published' : 'Draft (chỉ teacher thấy)'}
      </span>
    )
  }, [doc])

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[560px] gap-4">
      {/* Editor panel (40%) */}
      <section className="flex w-2/5 min-w-[360px] flex-col rounded-2xl border border-white/10 bg-[#0a0f17] p-4">
        <header className="space-y-3 border-b border-white/10 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Narrative editor</h2>
            {statusBadge}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={`${inputCls} mt-0 flex-1`}
            >
              {SLUG_PRESETS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
              {!SLUG_PRESETS.some((p) => p.slug === slug) ? (
                <option value={slug}>{slug}</option>
              ) : null}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              placeholder="slug-mới (a-z, 0-9, -)"
              className={`${inputCls} mt-0 flex-1`}
            />
            <button
              type="button"
              onClick={handleSlugSubmit}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              Mở slug
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!doc || saving}
              onClick={() => void handleSaveDraft()}
              className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Lưu draft'}
            </button>
            <button
              type="button"
              disabled={!doc || saving}
              onClick={() => void handlePublishToggle()}
              className={`rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                doc?.published ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {doc?.published ? 'Unpublish' : 'Publish'}
            </button>
            {message ? <span className="text-[11px] text-slate-400">{message}</span> : null}
          </div>
        </header>

        {loading || !doc ? (
          <p className="mt-4 text-xs text-slate-500">{loading ? 'Đang tải…' : 'Chưa có space.'}</p>
        ) : (
          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            {/* World / sequence config */}
            <details open className="mb-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-200">
                World & Sequence
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className={labelCls}>
                  Title (VI)
                  <input
                    value={doc.title?.vi || ''}
                    onChange={(e) => patchDoc({ title: { ...(doc.title || {}), vi: e.target.value } })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Title (EN)
                  <input
                    value={doc.title?.en || ''}
                    onChange={(e) => patchDoc({ title: { ...(doc.title || {}), en: e.target.value } })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Body slug
                  <input
                    value={doc.world?.bodySlug || ''}
                    onChange={(e) => patchDoc({ world: { ...doc.world, bodySlug: e.target.value } })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Atmosphere preset
                  <input
                    value={doc.world?.atmospherePreset || ''}
                    onChange={(e) =>
                      patchDoc({ world: { ...doc.world, atmospherePreset: e.target.value } })
                    }
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Sequence type
                  <select
                    value={doc.sequence?.type || 'geologic_ma'}
                    onChange={(e) =>
                      patchDoc({
                        sequence: {
                          ...doc.sequence,
                          type: e.target.value as (typeof SEQUENCE_TYPES)[number],
                        },
                      })
                    }
                    className={inputCls}
                  >
                    {SEQUENCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  Sequence unit
                  <input
                    value={doc.sequence?.unit || ''}
                    onChange={(e) => patchDoc({ sequence: { ...doc.sequence, unit: e.target.value } })}
                    className={inputCls}
                  />
                </label>
              </div>
            </details>

            {/* Beat list */}
            <div className="mb-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-200">Beats ({beats.length})</p>
                <button
                  type="button"
                  onClick={addBeat}
                  className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200 hover:bg-cyan-500/20"
                >
                  + Thêm beat
                </button>
              </div>
              <ol className="mt-2 space-y-1">
                {beats.map((b, i) => {
                  const active = i === selectedBeatIndex
                  return (
                    <li
                      key={`${b.id}-${i}`}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs ${
                        active
                          ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100'
                          : 'border-white/10 bg-black/40 text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedBeatIndex(i)}
                        className="flex-1 truncate text-left"
                        title={b.description || b.name}
                      >
                        <span className="mr-1 text-slate-400">#{i + 1}</span>
                        <span>{b.icon ? `${b.icon} ` : ''}</span>
                        <span>{b.name || '(chưa đặt tên)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBeat(i, i - 1)}
                        disabled={i === 0}
                        className="rounded border border-white/10 px-1 text-[10px] text-slate-300 disabled:opacity-30"
                        title="Lên"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBeat(i, i + 1)}
                        disabled={i === beats.length - 1}
                        className="rounded border border-white/10 px-1 text-[10px] text-slate-300 disabled:opacity-30"
                        title="Xuống"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBeat(i)}
                        className="rounded border border-rose-400/30 px-1 text-[10px] text-rose-300 hover:bg-rose-500/10"
                        title="Xoá"
                      >
                        ✕
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>

            {/* Beat detail */}
            {selectedBeat ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-200">Beat detail</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelCls}>
                    Tên beat
                    <input
                      value={selectedBeat.name}
                      onChange={(e) => patchBeat(selectedBeatIndex, { name: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Icon
                    <input
                      value={selectedBeat.icon || ''}
                      onChange={(e) => patchBeat(selectedBeatIndex, { icon: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Time ({doc.sequence?.unit || ''})
                    <input
                      type="number"
                      value={Number.isFinite(selectedBeat.time) ? selectedBeat.time : 0}
                      onChange={(e) =>
                        patchBeat(selectedBeatIndex, { time: Number(e.target.value) || 0 })
                      }
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Time display
                    <input
                      value={selectedBeat.timeDisplay || ''}
                      onChange={(e) => patchBeat(selectedBeatIndex, { timeDisplay: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Eon
                    <input
                      value={selectedBeat.eon || ''}
                      onChange={(e) => patchBeat(selectedBeatIndex, { eon: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Earth color
                    <input
                      type="color"
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(selectedBeat.earthColor || '')
                          ? selectedBeat.earthColor
                          : '#3b82f6'
                      }
                      onChange={(e) => patchBeat(selectedBeatIndex, { earthColor: e.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-white/10 bg-black/40"
                    />
                  </label>
                </div>
                <label className={`${labelCls} mt-2 block`}>
                  Mô tả (ref / description)
                  <textarea
                    value={selectedBeat.description || ''}
                    onChange={(e) => patchBeat(selectedBeatIndex, { description: e.target.value })}
                    rows={3}
                    className={inputCls}
                  />
                </label>

                {/* Lesson refs */}
                <div className="mt-3 rounded-md border border-white/10 bg-black/40 p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      Lesson refs
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        patchBeat(selectedBeatIndex, {
                          lessonLinks: [...(selectedBeat.lessonLinks || []), { courseSlug: '', lessonSlug: '' }],
                        })
                      }
                      className="rounded border border-cyan-400/30 px-2 py-0.5 text-[10px] text-cyan-200 hover:bg-cyan-500/10"
                    >
                      + Thêm link
                    </button>
                  </div>
                  <div className="mt-1 space-y-1">
                    {(selectedBeat.lessonLinks || []).map((lk, lkIdx) => (
                      <div key={lkIdx} className="grid grid-cols-[1fr_1fr_auto] gap-1">
                        <input
                          value={lk.courseSlug || ''}
                          onChange={(e) => {
                            const next = [...(selectedBeat.lessonLinks || [])]
                            next[lkIdx] = { ...next[lkIdx], courseSlug: e.target.value }
                            patchBeat(selectedBeatIndex, { lessonLinks: next })
                          }}
                          placeholder="courseSlug"
                          className={inputCls}
                        />
                        <input
                          value={lk.lessonSlug || ''}
                          onChange={(e) => {
                            const next = [...(selectedBeat.lessonLinks || [])]
                            next[lkIdx] = { ...next[lkIdx], lessonSlug: e.target.value }
                            patchBeat(selectedBeatIndex, { lessonLinks: next })
                          }}
                          placeholder="lessonSlug"
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (selectedBeat.lessonLinks || []).filter((_, i) => i !== lkIdx)
                            patchBeat(selectedBeatIndex, { lessonLinks: next })
                          }}
                          className="rounded border border-rose-400/30 px-2 text-[10px] text-rose-300"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {(selectedBeat.lessonLinks || []).length === 0 ? (
                      <p className="text-[11px] italic text-slate-500">
                        Chưa có lesson nào gắn với beat này.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Live preview (60%) */}
      <section className="relative flex flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/55 px-2 py-1 text-[11px] text-slate-200 backdrop-blur">
          Preview · beat #{selectedBeatIndex + 1}
          {selectedBeat ? ` — ${selectedBeat.name}` : ''}
        </div>
        <div className="h-full w-full">
          <EarthScene
            key={`narrative-preview-${slug}-${selectedBeatIndex}-${selectedBeat?.id ?? ''}-${selectedBeat?.time ?? ''}`}
          />
        </div>
      </section>
    </div>
  )
}

export default NarrativeStudioMode
