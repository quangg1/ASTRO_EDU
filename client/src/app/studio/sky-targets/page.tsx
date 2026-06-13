'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canEnterStudio } from '@/lib/roles'
import {
  emptySkyTargetEditorRow,
  fetchEditorSkyTargets,
  saveEditorSkyTargets,
  type SkyTargetEditorRow,
} from '@/features/explore/public'
import type { ShowcasePanelBlockDTO } from '@/features/content3d/showcase/public'
import {
  fetchHipCatalogIndex,
  preloadHipCatalogIndex,
} from '@/features/explore/lib/hipBrightCatalogCache'
import { loadWesternExploreTargets } from '@/features/explore/lib/westernSkyCulture'
import type { SkyExploreTarget } from '@/features/explore/public'
import { useLearningPath } from '@/features/learning-path/public'

type PickerRow = {
  targetId: string
  kind: string
  label: string
  subtitle: string
}

function newPanelBlock(type: 'text' | 'image' | 'chart'): ShowcasePanelBlockDTO {
  return {
    id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    title: '',
    body: '',
    imageUrl: '',
    chartKind: type === 'chart' ? 'bar' : '',
    points: type === 'chart' ? [{ label: 'Metric', value: 1 }] : [],
    style: { variant: 'glass', align: 'left' },
  }
}

function ensurePanelConfig(row: SkyTargetEditorRow) {
  return (
    row.panelConfig || {
      stateBadge: '',
      tabs: [],
      tabLabels: {},
      overviewBlocks: [],
      physicalBlocks: [],
      skyBlocks: [],
      conceptTagIds: [],
      lessonIds: [],
    }
  )
}

function targetPickerLabel(t: SkyExploreTarget): PickerRow {
  return {
    targetId: t.id,
    kind: t.kind,
    label: t.nameVi || t.nameEn || t.id,
    subtitle: t.kind === 'constellation' ? t.nameEn || t.iauCode || '' : t.nameEn || t.id,
  }
}

function SkyTargetsStudioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, checked } = useAuthStore()
  const { concepts, modules } = useLearningPath()
  const [rows, setRows] = useState<SkyTargetEditorRow[]>([])
  const [picker, setPicker] = useState<PickerRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [filter, setFilter] = useState('')
  const [conceptFilter, setConceptFilter] = useState('')
  const [lessonFilter, setLessonFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/sky-targets')
    if (checked && user && !canEnterStudio(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user || !canEnterStudio(user)) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      preloadHipCatalogIndex()
      const hip = await fetchHipCatalogIndex()
      const western = hip?.size ? await loadWesternExploreTargets(hip) : []
      const editor = await fetchEditorSkyTargets()
      if (cancelled) return
      const seedCatalog = editor?.catalog || []
      const bodies: PickerRow[] = seedCatalog.map((c) => ({
        targetId: c.targetId,
        kind: c.kind,
        label: c.nameVi || c.nameEn || c.targetId,
        subtitle: c.nameEn || 'Hành tinh / Mặt Trăng',
      }))
      const constellations = western.map(targetPickerLabel)
      const mergedPicker = [...constellations, ...bodies].sort((a, b) =>
        a.label.localeCompare(b.label, 'vi'),
      )
      setPicker(mergedPicker)
      const saved = new Map((editor?.items || []).map((r) => [r.targetId, r]))
      setRows(Array.from(saved.values()))
      const q = String(searchParams.get('target') || '').trim()
      const first = q || mergedPicker[0]?.targetId || ''
      setSelectedId(first)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, searchParams])

  const rowById = useMemo(() => new Map(rows.map((r) => [r.targetId, r])), [rows])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return rowById.get(selectedId) ?? emptySkyTargetEditorRow(selectedId)
  }, [rowById, selectedId])

  const filteredPicker = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return picker
    return picker.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.targetId.toLowerCase().includes(q),
    )
  }, [picker, filter])

  const patchSelected = useCallback(
    (patch: Partial<SkyTargetEditorRow>) => {
      if (!selectedId) return
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.targetId === selectedId)
        const base = idx >= 0 ? prev[idx] : emptySkyTargetEditorRow(selectedId)
        const next = { ...base, ...patch, targetId: selectedId }
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = next
          return copy
        }
        return [...prev, next]
      })
    },
    [selectedId],
  )

  const patchPanelConfig = useCallback(
    (updater: (cfg: NonNullable<SkyTargetEditorRow['panelConfig']>) => SkyTargetEditorRow['panelConfig']) => {
      if (!selected) return
      const cfg = ensurePanelConfig(selected)
      patchSelected({ panelConfig: updater(cfg) })
    },
    [selected, patchSelected],
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    setMessage('')
    const result = await saveEditorSkyTargets(rows)
    setSaving(false)
    if (!result) {
      setMessage('Lưu thất bại.')
      return
    }
    setRows(result.items)
    if (result.invalidTargetIds.length) {
      setMessage(`Đã lưu. Bỏ qua ${result.invalidTargetIds.length} mục không hợp lệ.`)
    } else {
      setMessage('Đã lưu nội dung la bàn chòm sao.')
    }
  }, [rows])

  const pickerMeta = picker.find((p) => p.targetId === selectedId)
  const cfg = selected ? ensurePanelConfig(selected) : null

  const lessonOptions = useMemo(() => {
    const out: Array<{ id: string; title: string; moduleTitle: string }> = []
    for (const mod of modules) {
      for (const node of mod.nodes) {
        for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
          for (const lesson of node.depths[depth] || []) {
            out.push({
              id: lesson.id,
              title: lesson.titleVi || lesson.title || lesson.id,
              moduleTitle: mod.titleVi || mod.title || mod.id,
            })
          }
        }
      }
    }
    return out
  }, [modules])

  const filteredConcepts = useMemo(() => {
    const q = conceptFilter.trim().toLowerCase()
    if (!q) return concepts
    return concepts.filter(
      (c) =>
        (c.title || '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.aliases || []).some((a) => a.toLowerCase().includes(q)),
    )
  }, [concepts, conceptFilter])

  const filteredLessons = useMemo(() => {
    const q = lessonFilter.trim().toLowerCase()
    if (!q) return lessonOptions
    return lessonOptions.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.moduleTitle.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q),
    )
  }, [lessonOptions, lessonFilter])

  if (!checked || loading) {
    return (
      <div className="min-h-screen bg-[#070a12] px-6 pb-10 pt-20 text-slate-300">
        Đang tải Sky Targets Studio…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070a12] pb-10 pt-14 text-slate-100">
      <header className="sticky top-14 z-30 border-b border-white/10 bg-[#070a12]/95 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/80">Studio</p>
            <h1 className="text-xl font-semibold">La bàn chòm sao · Panel học tập</h1>
            <p className="mt-1 text-xs text-slate-400">
              Chỉnh mô tả, block nội dung, concept và bài học cho panel Học tập trên Explore → Sky.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/studio"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Studio hub
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-lg border border-violet-400/40 bg-violet-950/50 px-4 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Lưu tất cả'}
            </button>
          </div>
        </div>
        {message ? (
          <p className="mx-auto mt-3 max-w-6xl text-xs text-emerald-300/90">{message}</p>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <aside className="rounded-xl border border-white/10 bg-black/25 p-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Tìm chòm sao / hành tinh…"
            className="studio-field mb-3 w-full"
          />
          <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {filteredPicker.map((p) => {
              const hasDraft = rowById.has(p.targetId)
              return (
                <button
                  key={p.targetId}
                  type="button"
                  onClick={() => {
                    setSelectedId(p.targetId)
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('target', p.targetId)
                    router.replace(`/studio/sky-targets?${params.toString()}`, { scroll: false })
                  }}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                    selectedId === p.targetId
                      ? 'border-violet-400/50 bg-violet-950/40'
                      : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <p className="text-xs font-medium text-white">{p.label}</p>
                  <p className="text-[10px] text-slate-500">
                    {p.kind === 'constellation' ? 'Chòm sao' : 'Thiên thể'} · {p.subtitle}
                    {hasDraft ? ' · CMS' : ''}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-4">
          {!selected || !pickerMeta ? (
            <p className="text-sm text-slate-400">Chọn một mục tiêu bên trái.</p>
          ) : (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Mã hệ thống (ẩn với người học)</p>
                <p className="font-mono text-xs text-slate-500">{selected.targetId}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {pickerMeta.kind === 'constellation' ? 'Chòm sao IAU' : 'Thiên thể'} ·{' '}
                  {pickerMeta.subtitle}
                </p>
              </div>

              <label className="block text-xs text-slate-400">
                Tên hiển thị (Tiếng Việt, tuỳ chọn)
                <input
                  value={selected.nameVi}
                  onChange={(e) => patchSelected({ nameVi: e.target.value })}
                  placeholder="Để trống = dùng tên mặc định từ catalog"
                  className="studio-field mt-1"
                />
              </label>

              <label className="block text-xs text-slate-400">
                Mô tả museum / đoạn mở đầu (VI)
                <textarea
                  value={selected.museumBlurbVi}
                  onChange={(e) => patchSelected({ museumBlurbVi: e.target.value })}
                  rows={6}
                  placeholder="Hiển thị trong panel Học tập. Để trống = copy mặc định trong code."
                  className="studio-field mt-1"
                />
              </label>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs font-medium text-slate-200">Khái niệm hiển thị trên panel</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Chọn các khái niệm học tập gắn với mục tiêu này — người học thấy tên khái niệm, không phải mã kỹ thuật.
                </p>
                {concepts.length > 8 ? (
                  <input
                    value={conceptFilter}
                    onChange={(e) => setConceptFilter(e.target.value)}
                    placeholder="Tìm khái niệm…"
                    className="studio-field mt-2"
                  />
                ) : null}
                <div className="mt-2 max-h-44 overflow-y-auto grid grid-cols-1 gap-1 md:grid-cols-2">
                  {filteredConcepts.length ? (
                    filteredConcepts.map((c) => {
                      const checked = (cfg?.conceptTagIds || []).includes(c.id)
                      return (
                        <label
                          key={c.id}
                          className="inline-flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5 text-xs text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            className="mt-0.5"
                            onChange={(e) =>
                              patchPanelConfig((panel) => {
                                const cur = new Set(panel.conceptTagIds || [])
                                if (e.target.checked) cur.add(c.id)
                                else cur.delete(c.id)
                                return { ...panel, conceptTagIds: Array.from(cur) }
                              })
                            }
                          />
                          <span>{c.title || c.id}</span>
                        </label>
                      )
                    })
                  ) : (
                    <p className="text-[11px] text-slate-500">Không có khái niệm phù hợp.</p>
                  )}
                </div>
                {(cfg?.conceptTagIds || []).length > 0 ? (
                  <p className="mt-2 text-[10px] text-violet-300/80">
                    Đã chọn {(cfg?.conceptTagIds || []).length} khái niệm
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs font-medium text-slate-200">Bài học 3D liên kết</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Các bài trong lộ trình học sẽ xuất hiện trong panel Học tập khi người dùng chọn mục tiêu này.
                </p>
                {lessonOptions.length > 8 ? (
                  <input
                    value={lessonFilter}
                    onChange={(e) => setLessonFilter(e.target.value)}
                    placeholder="Tìm bài học…"
                    className="studio-field mt-2"
                  />
                ) : null}
                <div className="mt-2 max-h-44 overflow-y-auto grid grid-cols-1 gap-1">
                  {filteredLessons.length ? (
                    filteredLessons.map((l) => {
                      const checked = (cfg?.lessonIds || []).includes(l.id)
                      return (
                        <label
                          key={l.id}
                          className="inline-flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5 text-xs text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            className="mt-0.5"
                            onChange={(e) =>
                              patchPanelConfig((panel) => {
                                const cur = new Set(panel.lessonIds || [])
                                if (e.target.checked) cur.add(l.id)
                                else cur.delete(l.id)
                                return { ...panel, lessonIds: Array.from(cur) }
                              })
                            }
                          />
                          <span>
                            <span className="block text-slate-200">{l.title}</span>
                            <span className="text-[10px] text-slate-500">{l.moduleTitle}</span>
                          </span>
                        </label>
                      )
                    })
                  ) : (
                    <p className="text-[11px] text-slate-500">Chưa có bài học trong lộ trình.</p>
                  )}
                </div>
                {(cfg?.lessonIds || []).length > 0 ? (
                  <p className="mt-2 text-[10px] text-violet-300/80">
                    Đã chọn {(cfg?.lessonIds || []).length} bài học
                  </p>
                ) : null}
              </div>

              <label className="block text-xs text-slate-400">
                Nhãn nổi bật (tuỳ chọn)
                <input
                  value={cfg?.stateBadge || ''}
                  onChange={(e) => patchPanelConfig((c) => ({ ...c, stateBadge: e.target.value }))}
                  placeholder="Nổi bật đêm nay · Dễ quan sát"
                  className="studio-field mt-1"
                />
              </label>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Khối nội dung bổ sung</p>
                  <button
                    type="button"
                    onClick={() =>
                      patchPanelConfig((c) => ({
                        ...c,
                        overviewBlocks: [...(c.overviewBlocks || []), newPanelBlock('text')],
                      }))
                    }
                    className="rounded border border-white/15 px-2 py-1 text-[11px]"
                  >
                    + Text
                  </button>
                </div>
                {(cfg?.overviewBlocks || []).map((b, i) => (
                  <div key={b.id || `ov-${i}`} className="rounded border border-white/10 p-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500">{b.type}</span>
                      <button
                        type="button"
                        onClick={() =>
                          patchPanelConfig((c) => ({
                            ...c,
                            overviewBlocks: (c.overviewBlocks || []).filter((x) => x.id !== b.id),
                          }))
                        }
                        className="text-[10px] text-rose-300"
                      >
                        Xóa
                      </button>
                    </div>
                    <input
                      value={b.title || ''}
                      onChange={(e) =>
                        patchPanelConfig((c) => ({
                          ...c,
                          overviewBlocks: (c.overviewBlocks || []).map((x) =>
                            x.id === b.id ? { ...x, title: e.target.value } : x,
                          ),
                        }))
                      }
                      placeholder="Tiêu đề"
                      className="studio-field"
                    />
                    <textarea
                      value={b.body || ''}
                      onChange={(e) =>
                        patchPanelConfig((c) => ({
                          ...c,
                          overviewBlocks: (c.overviewBlocks || []).map((x) =>
                            x.id === b.id ? { ...x, body: e.target.value } : x,
                          ),
                        }))
                      }
                      rows={4}
                      placeholder="Nội dung"
                      className="studio-field"
                    />
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.published}
                  onChange={(e) => patchSelected({ published: e.target.checked })}
                  className="rounded border-white/20"
                />
                Published (ẩn nội dung CMS khi bỏ chọn)
              </label>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function SkyTargetsStudioPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070a12] px-6 pb-10 pt-20 text-slate-300">Đang tải…</div>}>
      <SkyTargetsStudioPage />
    </Suspense>
  )
}
